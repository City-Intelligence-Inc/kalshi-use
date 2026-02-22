import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from backend.db import (
    append_analysis_log,
    delete_trade,
    get_analysis_log,
    get_prediction,
    get_predictions_by_user,
    get_presigned_url,
    get_snapshots,
    get_snapshots_by_category,
    get_latest_snapshot,
    get_trade,
    get_trades_by_user,
    put_prediction,
    put_snapshot,
    put_trade,
    update_prediction,
    update_trade,
    upload_image,
)
from backend.models import get_model, list_models
from backend.notifications import send_push
from backend.prediction_log import log_prediction
from backend.pydantic_models import (
    InputResponse,
    MarketSnapshot,
    MarketSnapshotCreate,
    ModelInfo,
    OutputRequest,
    Prediction,
    PredictionUpdate,
    TradeLog,
    TradeLogCreate,
    TradeLogUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def root():
    return {"message": "hello"}


# ── Trades ──


@router.post("/trades", response_model=TradeLog)
def create_trade(trade: TradeLogCreate):
    item = put_trade(trade.model_dump())
    return item


@router.get("/trades/{trade_id}", response_model=TradeLog)
def read_trade(trade_id: str):
    item = get_trade(trade_id)
    if not item:
        raise HTTPException(status_code=404, detail="Trade not found")
    return item


@router.get("/trades", response_model=list[TradeLog])
def list_trades(user_id: str = Query(...)):
    return get_trades_by_user(user_id)


@router.patch("/trades/{trade_id}", response_model=TradeLog)
def update_trade_endpoint(trade_id: str, updates: TradeLogUpdate):
    existing = get_trade(trade_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")
    item = update_trade(trade_id, updates.model_dump())
    return item


@router.delete("/trades/{trade_id}")
def delete_trade_endpoint(trade_id: str):
    existing = get_trade(trade_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")
    delete_trade(trade_id)
    return {"detail": "Trade deleted"}


# ── Market Snapshots ──


@router.post("/snapshots", response_model=MarketSnapshot)
def create_snapshot(snapshot: MarketSnapshotCreate):
    item = put_snapshot(snapshot.model_dump())
    return item


@router.get("/snapshots/{event_ticker}/latest", response_model=MarketSnapshot)
def read_latest_snapshot(event_ticker: str):
    item = get_latest_snapshot(event_ticker)
    if not item:
        raise HTTPException(status_code=404, detail="No snapshots found")
    return item


@router.get("/snapshots/{event_ticker}", response_model=list[MarketSnapshot])
def read_snapshots(event_ticker: str, limit: int = Query(50, ge=1, le=500)):
    return get_snapshots(event_ticker, limit=limit)


@router.get("/snapshots", response_model=list[MarketSnapshot])
def list_snapshots_endpoint(category: str = Query(...), limit: int = Query(50, ge=1, le=500)):
    return get_snapshots_by_category(category, limit=limit)


# ── Models ──


@router.get("/models", response_model=list[ModelInfo])
def list_models_endpoint():
    return list_models()


@router.get("/models/{name}", response_model=ModelInfo)
def get_model_endpoint(name: str):
    runner = get_model(name)
    if not runner:
        raise HTTPException(status_code=404, detail=f"Model '{name}' not found")
    return {
        "name": runner.name,
        "display_name": runner.display_name,
        "description": runner.description,
        "status": runner.status,
    }


# ── Predictions: Pipeline ──


async def _run_model_background(
    prediction_id: str,
    model_name: str,
    image_key: str,
    context: str | None,
    expo_push_token: str | None,
):
    """Run model in background, update DB, and optionally send push notification."""
    try:
        runner = get_model(model_name)
        if not runner:
            update_prediction(prediction_id, {
                "status": "failed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
            return

        # Run model (blocking call in thread pool to not block event loop)
        loop = asyncio.get_event_loop()
        recommendation = await loop.run_in_executor(None, runner.run, image_key, context)

        completed_at = datetime.now(timezone.utc).isoformat()
        update_prediction(prediction_id, {
            "recommendation": recommendation,
            "status": "completed",
            "completed_at": completed_at,
        })

        # Log the analysis (S3)
        try:
            append_analysis_log({
                "prediction_id": prediction_id,
                "model": model_name,
                "image_key": image_key,
                "context": context,
                "recommendation": recommendation,
                "completed_at": completed_at,
            })
        except Exception:
            logger.exception("Failed to append analysis log for %s", prediction_id)

        # Log to local JSONL file
        try:
            log_prediction({
                "prediction_id": prediction_id,
                "model": model_name,
                "image_key": image_key,
                "context": context,
                "status": "completed",
                "ticker": recommendation.get("ticker"),
                "side": recommendation.get("side"),
                "confidence": recommendation.get("confidence"),
                "completed_at": completed_at,
            })
        except Exception:
            logger.exception("Failed to write prediction log for %s", prediction_id)

        # Send push notification if token provided
        if expo_push_token:
            ticker = recommendation.get("ticker", "Unknown")
            side = recommendation.get("side", "?").upper()
            confidence = round(recommendation.get("confidence", 0) * 100)
            await send_push(
                expo_push_token,
                "Analysis Ready",
                f"{ticker} — {side} ({confidence}%)",
                data={"prediction_id": prediction_id},
            )
    except Exception:
        logger.exception("Background model run failed for prediction %s", prediction_id)
        failed_at = datetime.now(timezone.utc).isoformat()
        update_prediction(prediction_id, {
            "status": "failed",
            "completed_at": failed_at,
        })
        try:
            log_prediction({
                "prediction_id": prediction_id,
                "model": model_name,
                "image_key": image_key,
                "status": "failed",
                "completed_at": failed_at,
            })
        except Exception:
            logger.exception("Failed to write prediction log for %s", prediction_id)


@router.post("/predict/input", response_model=InputResponse)
async def predict_input(
    image: UploadFile = File(...),
    user_id: str = Form(...),
    context: str = Form(None),
):
    """Step 1: Upload image to S3, create prediction record."""
    prediction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    contents = await image.read()
    ext = image.filename.rsplit(".", 1)[-1] if image.filename else "jpg"
    content_type = "image/png" if ext == "png" else "image/jpeg"
    image_key = f"predictions/{prediction_id}/{image.filename or 'photo.jpg'}"
    upload_image(contents, image_key, content_type)
    image_url = get_presigned_url(image_key)

    prediction = {
        "prediction_id": prediction_id,
        "user_id": user_id,
        "image_key": image_key,
        "image_url": image_url,
        "context": context,
        "model": "",
        "status": "uploaded",
        "created_at": now,
    }
    put_prediction(prediction)

    return {"prediction_id": prediction_id, "image_key": image_key, "image_url": image_url}


@router.post("/predict/output", response_model=Prediction)
async def predict_output(req: OutputRequest):
    """Step 2: Run model on an existing prediction, return result."""
    prediction = get_prediction(req.prediction_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    runner = get_model(req.model)
    if not runner:
        available = [m["name"] for m in list_models()]
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{req.model}'. Available: {available}",
        )

    # Update model name
    update_prediction(req.prediction_id, {"model": req.model, "status": "processing"})

    # Run model
    recommendation = runner.run(prediction["image_key"], prediction.get("context"))
    completed_at = datetime.now(timezone.utc).isoformat()
    result = update_prediction(req.prediction_id, {
        "recommendation": recommendation,
        "status": "completed",
        "completed_at": completed_at,
    })

    # Log the analysis (S3)
    try:
        append_analysis_log({
            "prediction_id": req.prediction_id,
            "model": req.model,
            "image_key": prediction["image_key"],
            "context": prediction.get("context"),
            "recommendation": recommendation,
            "completed_at": completed_at,
        })
    except Exception:
        logger.exception("Failed to append analysis log for %s", req.prediction_id)

    # Log to local JSONL file
    try:
        log_prediction({
            "prediction_id": req.prediction_id,
            "model": req.model,
            "image_key": prediction["image_key"],
            "context": prediction.get("context"),
            "status": "completed",
            "ticker": recommendation.get("ticker"),
            "side": recommendation.get("side"),
            "confidence": recommendation.get("confidence"),
            "completed_at": completed_at,
        })
    except Exception:
        logger.exception("Failed to write prediction log for %s", req.prediction_id)

    return result


@router.post("/predict", response_model=Prediction)
async def create_prediction(
    image: UploadFile = File(...),
    user_id: str = Form(...),
    context: str = Form(None),
    model: str = Form("taruns_model"),
    expo_push_token: str = Form(None),
):
    """Orchestrator: upload image + kick off model in background.
    Returns immediately with status='processing'. Poll GET /predictions/{id} for result."""
    runner = get_model(model)
    if not runner:
        available = [m["name"] for m in list_models()]
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model}'. Available: {available}",
        )

    prediction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Upload image to S3
    contents = await image.read()
    ext = image.filename.rsplit(".", 1)[-1] if image.filename else "jpg"
    content_type = "image/png" if ext == "png" else "image/jpeg"
    image_key = f"predictions/{prediction_id}/{image.filename or 'photo.jpg'}"
    upload_image(contents, image_key, content_type)
    image_url = get_presigned_url(image_key)

    # Create prediction record
    prediction = {
        "prediction_id": prediction_id,
        "user_id": user_id,
        "image_key": image_key,
        "image_url": image_url,
        "context": context,
        "model": model,
        "status": "processing",
        "created_at": now,
    }
    put_prediction(prediction)

    # Log submission to local JSONL
    try:
        log_prediction({
            "prediction_id": prediction_id,
            "user_id": user_id,
            "image_key": image_key,
            "context": context,
            "model": model,
            "status": "processing",
            "image_filename": image.filename,
            "created_at": now,
        })
    except Exception:
        logger.exception("Failed to write prediction log for %s", prediction_id)

    # Run model in background
    asyncio.create_task(
        _run_model_background(prediction_id, model, image_key, context, expo_push_token)
    )

    return prediction


@router.patch("/predictions/{prediction_id}", response_model=Prediction)
def update_prediction_endpoint(prediction_id: str, updates: PredictionUpdate):
    """Edit a prediction's context, user notes, or model idea."""
    existing = get_prediction(prediction_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Prediction not found")

    fields = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not fields:
        return existing

    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = update_prediction(prediction_id, fields)
    return result


@router.get("/predictions/log")
def read_analysis_log():
    """Return the full analysis log (all predictions ever run)."""
    return get_analysis_log()


@router.get("/predictions/{prediction_id}", response_model=Prediction)
def read_prediction(prediction_id: str):
    item = get_prediction(prediction_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return item


@router.get("/predictions", response_model=list[Prediction])
def list_predictions(user_id: str = Query(...)):
    return get_predictions_by_user(user_id)
