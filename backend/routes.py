import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from backend.db import (
    append_analysis_log,
    delete_integration,
    delete_tracked_position,
    get_integrations_by_user,
    get_prediction,
    get_predictions_by_user,
    get_presigned_url,
    get_tracked_position,
    get_tracked_positions_by_user,
    put_integration,
    put_prediction,
    put_tracked_position,
    update_prediction,
    update_tracked_position,
    upload_image,
)
from backend.kalshi_api import enrich_prediction, fetch_market, match_market
from backend.models import get_model, list_models
from backend.notifications import send_push
from backend.prediction_log import log_prediction
from backend.pydantic_models import (
    AggregatedPortfolio,
    InputResponse,
    Integration,
    IntegrationConnect,
    KalshiFill,
    KalshiPosition,
    ModelInfo,
    OutputRequest,
    Prediction,
    PredictionUpdate,
    TrackedPosition,
    TrackedPositionCreate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def root():
    return {"message": "hello"}


# ── Integrations & Portfolio ──


def _get_fernet():
    """Get Fernet cipher for encrypting/decrypting credentials."""
    import os
    from cryptography.fernet import Fernet

    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="Encryption key not configured")
    return Fernet(key.encode())


def _get_all_kalshi_clients(user_id: str):
    """Return all Kalshi clients for a user."""
    from backend.platforms.kalshi import KalshiClient

    integrations = get_integrations_by_user(user_id)
    kalshi_integrations = [i for i in integrations if i.get("platform") == "kalshi"]
    if not kalshi_integrations:
        return []

    fernet = _get_fernet()
    clients = []
    for integration in kalshi_integrations:
        try:
            private_key_pem = fernet.decrypt(integration["encrypted_private_key"].encode()).decode()
            client = KalshiClient(integration["api_key_id"], private_key_pem)
            clients.append((integration, client))
        except Exception:
            logger.exception("Failed to build client for %s", integration.get("platform_account"))
    return clients


@router.post("/integrations/connect", response_model=Integration)
def connect_integration(req: IntegrationConnect):
    """Store encrypted credentials and validate with Kalshi."""
    from backend.platforms.kalshi import KalshiClient

    # Validate credentials first
    try:
        client = KalshiClient(req.api_key_id, req.private_key_pem)
        valid = client.validate_credentials()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid credentials: {exc}")

    if not valid:
        raise HTTPException(status_code=400, detail="Credentials failed validation")

    # Encrypt the private key
    fernet = _get_fernet()
    encrypted_pem = fernet.encrypt(req.private_key_pem.encode()).decode()

    platform_account = f"{req.platform}#{req.account_type}"
    now = datetime.now(timezone.utc).isoformat()

    integration = {
        "user_id": req.user_id,
        "platform_account": platform_account,
        "platform": req.platform,
        "account_type": req.account_type,
        "api_key_id": req.api_key_id,
        "encrypted_private_key": encrypted_pem,
        "status": "active",
        "connected_at": now,
    }
    put_integration(integration)

    return {
        "user_id": req.user_id,
        "platform": req.platform,
        "account_type": req.account_type,
        "api_key_id": req.api_key_id,
        "status": "active",
        "connected_at": now,
        "platform_account": platform_account,
    }


@router.get("/integrations/{user_id}", response_model=list[Integration])
def list_integrations(user_id: str):
    """List connected platforms for a user (credentials excluded)."""
    integrations = get_integrations_by_user(user_id)
    return [
        {
            "user_id": i["user_id"],
            "platform": i["platform"],
            "account_type": i["account_type"],
            "api_key_id": i["api_key_id"],
            "status": i.get("status", "active"),
            "connected_at": i["connected_at"],
            "platform_account": i.get("platform_account"),
        }
        for i in integrations
    ]


@router.delete("/integrations/{user_id}/{platform}/{account_type}")
def disconnect_integration(user_id: str, platform: str, account_type: str):
    """Disconnect a platform integration."""
    platform_account = f"{platform}#{account_type}"
    delete_integration(user_id, platform_account)
    return {"detail": "Integration disconnected"}


@router.get("/portfolio/{user_id}/balance", response_model=AggregatedPortfolio)
def get_portfolio_balance(user_id: str):
    """Aggregate live balance from all connected Kalshi accounts."""
    clients = _get_all_kalshi_clients(user_id)
    if not clients:
        return {
            "total_value": 0,
            "available_balance": 0,
            "total_payout": 0,
            "platforms": [],
        }

    platform_balances = []
    total_value = 0
    total_available = 0
    total_payout = 0

    for integration, client in clients:
        try:
            balance = client.get_balance()
            platform_balances.append(balance)
            total_value += balance["total_value"]
            total_available += balance["available_balance"]
            total_payout += balance["payout"]
        except Exception:
            logger.exception("Failed to fetch balance for %s", integration.get("platform_account"))

    return {
        "total_value": total_value,
        "available_balance": total_available,
        "total_payout": total_payout,
        "platforms": platform_balances,
    }


@router.get("/portfolio/{user_id}/positions", response_model=list[KalshiPosition])
def get_portfolio_positions(user_id: str):
    """Live positions from all connected Kalshi accounts."""
    clients = _get_all_kalshi_clients(user_id)
    positions = []
    for integration, client in clients:
        try:
            positions.extend(client.get_positions())
        except Exception:
            logger.exception("Failed to fetch positions for %s", integration.get("platform_account"))
    return positions


@router.get("/portfolio/{user_id}/fills", response_model=list[KalshiFill])
def get_portfolio_fills(user_id: str, limit: int = Query(50, ge=1, le=200)):
    """Recent fills from all connected Kalshi accounts."""
    clients = _get_all_kalshi_clients(user_id)
    fills = []
    for integration, client in clients:
        try:
            fills.extend(client.get_fills(limit=limit))
        except Exception:
            logger.exception("Failed to fetch fills for %s", integration.get("platform_account"))
    # Sort by time descending
    fills.sort(key=lambda f: f.get("created_time", ""), reverse=True)
    return fills[:limit]


# ── Models ──


@router.get("/models", response_model=list[ModelInfo])
def list_models_endpoint():
    return list_models()


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


@router.get("/predictions/{prediction_id}", response_model=Prediction)
def read_prediction(prediction_id: str):
    item = get_prediction(prediction_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return item


@router.get("/predictions", response_model=list[Prediction])
def list_predictions(user_id: str = Query(...)):
    return get_predictions_by_user(user_id)


# ── Tracked Positions ──


# In-memory cache for market data (ticker -> (timestamp, data))
_market_cache: dict[str, tuple[float, dict]] = {}
_CACHE_TTL = 30.0  # seconds


def _fetch_market_cached(ticker: str) -> dict | None:
    import time

    now = time.time()
    cached = _market_cache.get(ticker)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]
    data = fetch_market(ticker)
    if data is not None:
        _market_cache[ticker] = (now, data)
    return data


def _enrich_tracked_position(pos: dict) -> dict:
    """Enrich an active tracked position with live market data."""
    if pos.get("status") != "active":
        return pos

    ticker = pos.get("ticker")
    if not ticker:
        return pos

    market = _fetch_market_cached(ticker)
    if not market:
        return pos

    pos["market_status"] = market.get("status")
    pos["market_result"] = market.get("result")

    # Current price (yes_ask for display)
    yes_price = market.get("yes_ask") or market.get("last_price")
    if yes_price is not None:
        if pos["side"] == "yes":
            pos["current_price"] = yes_price
            pos["unrealized_pnl"] = round(yes_price - pos["entry_price"], 2)
        else:
            no_price = 100 - yes_price
            pos["current_price"] = no_price
            pos["unrealized_pnl"] = round(no_price - pos["entry_price"], 2)

    # Auto-detect settlement
    result = market.get("result")
    if result in ("yes", "no"):
        now = datetime.now(timezone.utc).isoformat()
        if pos["side"] == result:
            settlement_price = 100
            realized_pnl = round(settlement_price - pos["entry_price"], 2)
            status = "settled_win"
        else:
            settlement_price = 0
            realized_pnl = round(-pos["entry_price"], 2)
            status = "settled_loss"

        pos["status"] = status
        pos["settlement_price"] = settlement_price
        pos["realized_pnl"] = realized_pnl
        pos["settled_at"] = now
        pos["current_price"] = settlement_price
        pos["unrealized_pnl"] = None

        # Persist settlement to DB
        update_tracked_position(pos["position_id"], {
            "status": status,
            "settlement_price": settlement_price,
            "realized_pnl": realized_pnl,
            "settled_at": now,
            "updated_at": now,
        })

    return pos


@router.post("/tracked-positions", response_model=TrackedPosition)
def create_tracked_position(req: TrackedPositionCreate):
    """Accept a prediction — create a tracked position."""
    now = datetime.now(timezone.utc).isoformat()
    position = {
        "position_id": str(uuid.uuid4()),
        "user_id": req.user_id,
        "prediction_id": req.prediction_id,
        "ticker": req.ticker,
        "side": req.side,
        "entry_price": req.entry_price,
        "title": req.title,
        "model": req.model,
        "confidence": req.confidence,
        "image_key": req.image_key,
        "status": "active",
        "created_at": now,
    }
    put_tracked_position(position)
    return position


@router.get("/tracked-positions", response_model=list[TrackedPosition])
def list_tracked_positions(user_id: str = Query(...)):
    """List tracked positions with live price enrichment."""
    positions = get_tracked_positions_by_user(user_id)

    # Enrich active positions with live data
    for pos in positions:
        _enrich_tracked_position(pos)

    # Sort: active first (newest), then settled (newest)
    def sort_key(p):
        is_active = 0 if p.get("status") == "active" else 1
        return (is_active, -(datetime.fromisoformat(p.get("created_at", "2000-01-01")).timestamp()))

    positions.sort(key=sort_key)
    return positions


@router.delete("/tracked-positions/{position_id}")
def close_tracked_position(position_id: str):
    """Close/untrack a position."""
    pos = get_tracked_position(position_id)
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")

    if pos.get("status") == "active":
        now = datetime.now(timezone.utc).isoformat()
        update_tracked_position(position_id, {
            "status": "closed",
            "updated_at": now,
        })

    delete_tracked_position(position_id)
    return {"detail": "Position closed"}


# ── Debug / Data Explorer ──


@router.get("/debug/tables")
def debug_tables():
    """Return item counts and recent samples from each DynamoDB table."""
    from backend.db import (
        table as trading_table,
        snapshots_table,
        predictions_table,
    )

    def _scan_summary(tbl, sort_key: str | None = None, limit: int = 5):
        from backend.db import _decimals_to_floats
        # Get count
        count_resp = tbl.scan(Select="COUNT")
        count = count_resp.get("Count", 0)
        # Get recent items
        scan_resp = tbl.scan(Limit=limit)
        items = _decimals_to_floats(scan_resp.get("Items", []))
        if sort_key:
            items.sort(key=lambda x: x.get(sort_key, ""), reverse=True)
        return {"count": count, "recent": items[:limit]}

    return {
        "predictions": _scan_summary(predictions_table, "created_at"),
        "trading_logs": _scan_summary(trading_table, "created_at"),
        "market_snapshots": _scan_summary(snapshots_table, "scraped_at"),
    }


@router.get("/system-prompt")
def get_system_prompt():
    """Return the current extraction system prompt used by vision models."""
    from backend.models.vision_common import EXTRACTION_SYSTEM_PROMPT
    return {"prompt": EXTRACTION_SYSTEM_PROMPT}
