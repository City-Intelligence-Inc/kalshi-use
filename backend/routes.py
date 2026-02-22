import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from backend.db import (
    delete_trade,
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
    update_trade,
    upload_image,
)
from backend.models import (
    MarketSnapshot,
    MarketSnapshotCreate,
    Prediction,
    TradeLog,
    TradeLogCreate,
    TradeLogUpdate,
)

router = APIRouter()


@router.get("/")
def root():
    return {"message": "hello"}


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
def list_snapshots(category: str = Query(...), limit: int = Query(50, ge=1, le=500)):
    return get_snapshots_by_category(category, limit=limit)


# ── Predictions ──

AVAILABLE_MODELS = ["taruns_model"]

STUB_TICKERS = [
    "kxnbagame-26feb21hounyknicks",
    "kxpolitics-trumpapproval50",
    "kxfed-ratecut-mar26",
    "kxcrypto-btc100k-apr26",
    "kxufc312-mainevent",
]

STUB_REASONINGS = [
    "Strong momentum detected in recent price action. Historical patterns suggest a favorable entry point.",
    "Market sentiment appears mispriced based on current polling data and news flow.",
    "Volume spike indicates informed trading. The odds haven't caught up to the fundamentals yet.",
    "Chart pattern shows a clear breakout forming. Risk/reward is asymmetric here.",
    "Recent news catalyst hasn't been fully priced in. Early movers have an edge.",
]


def _run_taruns_model(image_key: str, context: str | None) -> dict:
    """Stub for Tarun's Model — returns random recommendation.
    Will be replaced with real LLM vision analysis later."""
    return {
        "ticker": random.choice(STUB_TICKERS),
        "side": random.choice(["yes", "no"]),
        "confidence": round(random.uniform(0.55, 0.95), 2),
        "reasoning": random.choice(STUB_REASONINGS),
    }


MODEL_RUNNERS = {
    "taruns_model": _run_taruns_model,
}


@router.post("/predict", response_model=Prediction)
async def create_prediction(
    image: UploadFile = File(...),
    user_id: str = Form(...),
    context: str = Form(None),
    model: str = Form("taruns_model"),
):
    if model not in MODEL_RUNNERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model}'. Available: {AVAILABLE_MODELS}",
        )

    prediction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # 1. Upload image to S3
    contents = await image.read()
    ext = image.filename.rsplit(".", 1)[-1] if image.filename else "jpg"
    content_type = "image/png" if ext == "png" else "image/jpeg"
    image_key = f"predictions/{prediction_id}/{image.filename or 'photo.jpg'}"
    upload_image(contents, image_key, content_type)
    image_url = get_presigned_url(image_key)

    # 2. Create prediction record
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

    # 3. Run model (stub for now — will be async later)
    recommendation = MODEL_RUNNERS[model](image_key, context)
    prediction["recommendation"] = recommendation
    prediction["status"] = "completed"
    prediction["completed_at"] = datetime.now(timezone.utc).isoformat()
    put_prediction(prediction)

    return prediction


@router.get("/predictions/{prediction_id}", response_model=Prediction)
def read_prediction(prediction_id: str):
    item = get_prediction(prediction_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return item


@router.get("/predictions", response_model=list[Prediction])
def list_predictions(user_id: str = Query(...)):
    return get_predictions_by_user(user_id)
