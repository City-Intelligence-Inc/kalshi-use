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
from backend.kalshi_api import enrich_prediction, match_market
from backend.models import get_model, list_models
from backend.models.custom import create_custom_model, delete_custom_model
from backend.notifications import send_push
from backend.prediction_log import log_prediction
from backend.pydantic_models import (
    IdeaCreate,
    InputResponse,
    MarketSnapshot,
    MarketSnapshotCreate,
    ModelCreate,
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
        "input_type": runner.input_type,
        "output_type": runner.output_type,
    }


@router.post("/models", response_model=ModelInfo)
def create_model_endpoint(model: ModelCreate):
    """Create a custom model backed by an existing runner."""
    from backend.models.base import MODEL_REGISTRY

    # Don't allow overwriting hardcoded models
    if model.name in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot overwrite built-in model '{model.name}'",
        )

    valid_runners = ["openrouter", "gemini", "random"]
    if model.backing_runner not in valid_runners:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid backing_runner. Choose from: {valid_runners}",
        )

    config = model.model_dump()
    config["status"] = "available"
    create_custom_model(config)

    return {
        "name": config["name"],
        "display_name": config["display_name"],
        "description": config.get("description", ""),
        "status": "available",
        "input_type": config["input_type"],
        "output_type": config["output_type"],
        "custom": True,
    }


@router.delete("/models/{name}")
def delete_model_endpoint(name: str):
    """Delete a custom model. Cannot delete built-in models."""
    from backend.models.base import MODEL_REGISTRY

    if name in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete built-in model '{name}'",
        )

    if not delete_custom_model(name):
        raise HTTPException(status_code=404, detail=f"Model '{name}' not found")

    return {"detail": f"Model '{name}' deleted"}


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

        # Match extracted ticker to a real Kalshi market
        ticker = recommendation.get("ticker")
        title = recommendation.get("title")
        search_kw = recommendation.get("search_keywords")
        try:
            matched = await loop.run_in_executor(
                None, match_market, ticker, title, search_kw,
            )
            if matched:
                real_ticker = matched.get("ticker")
                if real_ticker and real_ticker != ticker:
                    recommendation["original_ticker"] = ticker
                    recommendation["ticker"] = real_ticker
                if matched.get("title") and not recommendation.get("title"):
                    recommendation["title"] = matched.get("title")
                ticker = recommendation["ticker"]
        except Exception:
            logger.exception("Market matching failed for %s", prediction_id)

        # Enrich with live Kalshi market data
        market_data = None
        if ticker and ticker.upper() != "UNKNOWN":
            try:
                market_data = await loop.run_in_executor(None, enrich_prediction, ticker)
            except Exception:
                logger.exception("Market enrichment failed for %s", prediction_id)

        completed_at = datetime.now(timezone.utc).isoformat()
        updates = {
            "recommendation": recommendation,
            "status": "completed",
            "completed_at": completed_at,
        }
        if market_data:
            updates["market_data"] = market_data
        update_prediction(prediction_id, updates)

        # Log the analysis (S3)
        try:
            append_analysis_log({
                "prediction_id": prediction_id,
                "model": model_name,
                "image_key": image_key,
                "context": context,
                "recommendation": recommendation,
                "market_data": market_data,
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
    except Exception as exc:
        logger.exception("Background model run failed for prediction %s: %s", prediction_id, exc)
        failed_at = datetime.now(timezone.utc).isoformat()
        update_prediction(prediction_id, {
            "status": "failed",
            "error_message": str(exc)[:500],
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

    # Match extracted ticker to a real Kalshi market
    ticker = recommendation.get("ticker")
    title = recommendation.get("title")
    search_kw = recommendation.get("search_keywords")
    try:
        matched = match_market(ticker, title, search_kw)
        if matched:
            real_ticker = matched.get("ticker")
            if real_ticker and real_ticker != ticker:
                recommendation["original_ticker"] = ticker
                recommendation["ticker"] = real_ticker
            if matched.get("title") and not recommendation.get("title"):
                recommendation["title"] = matched.get("title")
            ticker = recommendation["ticker"]
    except Exception:
        logger.exception("Market matching failed for %s", req.prediction_id)

    # Enrich with live Kalshi market data
    market_data = None
    if ticker and ticker.upper() != "UNKNOWN":
        try:
            market_data = enrich_prediction(ticker)
        except Exception:
            logger.exception("Market enrichment failed for %s", req.prediction_id)

    completed_at = datetime.now(timezone.utc).isoformat()
    updates = {
        "recommendation": recommendation,
        "status": "completed",
        "completed_at": completed_at,
    }
    if market_data:
        updates["market_data"] = market_data
    result = update_prediction(req.prediction_id, updates)

    # Log the analysis (S3)
    try:
        append_analysis_log({
            "prediction_id": req.prediction_id,
            "model": req.model,
            "image_key": prediction["image_key"],
            "context": prediction.get("context"),
            "recommendation": recommendation,
            "market_data": market_data,
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


@router.post("/predictions/idea", response_model=Prediction)
def create_idea(idea: IdeaCreate):
    """Create a manual trade idea — a quant researcher's thesis, no image needed."""
    prediction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    recommendation = {
        "ticker": idea.ticker,
        "title": idea.title,
        "side": idea.side,
        "confidence": idea.confidence,
        "reasoning": idea.reasoning,
        "factors": [f.model_dump() for f in idea.factors] if idea.factors else [],
        "ev_analysis": [e.model_dump() for e in idea.ev_analysis] if idea.ev_analysis else [],
        "bear_case": idea.bear_case,
        "recommended_position": idea.recommended_position,
        "no_bet": idea.no_bet or False,
        "no_bet_reason": idea.no_bet_reason,
    }

    # Enrich with live Kalshi market data
    market_data = None
    if idea.ticker and idea.ticker.upper() != "UNKNOWN":
        try:
            market_data = enrich_prediction(idea.ticker)
        except Exception:
            logger.exception("Market enrichment failed for idea %s", prediction_id)

    prediction = {
        "prediction_id": prediction_id,
        "user_id": idea.user_id,
        "image_key": "",
        "image_url": "",
        "model": "manual",
        "status": "completed",
        "recommendation": recommendation,
        "user_notes": idea.user_notes,
        "created_at": now,
        "completed_at": now,
    }
    if market_data:
        prediction["market_data"] = market_data
    put_prediction(prediction)

    # Log to local JSONL
    try:
        log_prediction({
            "prediction_id": prediction_id,
            "model": "manual",
            "user_id": idea.user_id,
            "status": "completed",
            "ticker": idea.ticker,
            "side": idea.side,
            "confidence": idea.confidence,
            "completed_at": now,
        })
    except Exception:
        logger.exception("Failed to write prediction log for idea %s", prediction_id)

    return prediction


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
