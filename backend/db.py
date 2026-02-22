import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger(__name__)


def _floats_to_decimals(obj):
    return json.loads(json.dumps(obj), parse_float=Decimal)


def _decimals_to_floats(obj):
    if isinstance(obj, list):
        return [_decimals_to_floats(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _decimals_to_floats(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    return obj

TABLE_NAME = os.environ.get("TABLE_NAME", "kalshi-use-trading-logs")
SNAPSHOTS_TABLE_NAME = os.environ.get("SNAPSHOTS_TABLE_NAME", "kalshi-use-market-snapshots")
PREDICTIONS_TABLE_NAME = os.environ.get("PREDICTIONS_TABLE_NAME", "kalshi-use-predictions")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "kalshi-use-images")
LOCAL_IMAGE_DIR = Path("/tmp/kalshi-images")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
snapshots_table = dynamodb.Table(SNAPSHOTS_TABLE_NAME)
predictions_table = dynamodb.Table(PREDICTIONS_TABLE_NAME)

# S3 client — always attempt S3 in production (App Runner provides IAM role).
# Fall back to local only when no AWS credentials are configured at all.
s3_client = boto3.client("s3")
try:
    _creds = boto3.Session().get_credentials()
    _s3_available = _creds is not None and _creds.access_key is not None
except Exception:
    _s3_available = False

if _s3_available:
    logger.info("S3 enabled — bucket: %s", S3_BUCKET_NAME)
else:
    logger.warning("No AWS credentials — falling back to local storage at %s", LOCAL_IMAGE_DIR)


def put_trade(trade: dict) -> dict:
    trade["trade_id"] = str(uuid.uuid4())
    trade["created_at"] = datetime.now(timezone.utc).isoformat()
    table.put_item(Item=_floats_to_decimals(trade))
    return trade


def get_trade(trade_id: str) -> dict | None:
    resp = table.get_item(Key={"trade_id": trade_id})
    item = resp.get("Item")
    return _decimals_to_floats(item) if item else None


def get_trades_by_user(user_id: str) -> list[dict]:
    resp = table.query(
        IndexName="user_id-index",
        KeyConditionExpression=Key("user_id").eq(user_id),
    )
    return _decimals_to_floats(resp.get("Items", []))


def update_trade(trade_id: str, updates: dict) -> dict | None:
    fields = {k: v for k, v in updates.items() if v is not None}
    if not fields:
        return get_trade(trade_id)
    expr_parts = []
    expr_names = {}
    expr_values = {}
    for i, (key, val) in enumerate(fields.items()):
        expr_parts.append(f"#{key} = :val{i}")
        expr_names[f"#{key}"] = key
        expr_values[f":val{i}"] = Decimal(str(val)) if isinstance(val, float) else val
    resp = table.update_item(
        Key={"trade_id": trade_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
        ReturnValues="ALL_NEW",
    )
    return _decimals_to_floats(resp.get("Attributes"))


def delete_trade(trade_id: str) -> bool:
    table.delete_item(Key={"trade_id": trade_id})
    return True


# ── Market Snapshots ──


def put_snapshot(snapshot: dict) -> dict:
    snapshot["scraped_at"] = datetime.now(timezone.utc).isoformat()
    snapshots_table.put_item(Item=_floats_to_decimals(snapshot))
    return snapshot


def get_snapshots(event_ticker: str, limit: int = 50) -> list[dict]:
    resp = snapshots_table.query(
        KeyConditionExpression=Key("event_ticker").eq(event_ticker),
        ScanIndexForward=False,
        Limit=limit,
    )
    return _decimals_to_floats(resp.get("Items", []))


def get_latest_snapshot(event_ticker: str) -> dict | None:
    resp = snapshots_table.query(
        KeyConditionExpression=Key("event_ticker").eq(event_ticker),
        ScanIndexForward=False,
        Limit=1,
    )
    items = resp.get("Items", [])
    return _decimals_to_floats(items[0]) if items else None


def get_snapshots_by_category(category: str, limit: int = 50) -> list[dict]:
    resp = snapshots_table.query(
        IndexName="category-index",
        KeyConditionExpression=Key("category").eq(category),
        ScanIndexForward=False,
        Limit=limit,
    )
    return _decimals_to_floats(resp.get("Items", []))


# ── S3 ──


def upload_image(file_bytes: bytes, key: str, content_type: str = "image/jpeg") -> str:
    if _s3_available:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    else:
        local_path = LOCAL_IMAGE_DIR / key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(file_bytes)
        logger.info("Saved image locally: %s", local_path)
    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    if _s3_available:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=expires_in,
        )
    return f"file://{LOCAL_IMAGE_DIR / key}"


# ── Analysis Log (S3) ──

ANALYSIS_LOG_KEY = "logs/analysis_log.jsonl"


def append_analysis_log(entry: dict) -> None:
    """Append a JSON line to the analysis log in S3 (or local fallback)."""
    line = json.dumps(entry, default=str)

    if not _s3_available:
        local_log = LOCAL_IMAGE_DIR / "analysis_log.jsonl"
        local_log.parent.mkdir(parents=True, exist_ok=True)
        with open(local_log, "a") as f:
            f.write(line + "\n")
        return

    # Read existing log from S3
    try:
        resp = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=ANALYSIS_LOG_KEY)
        existing = resp["Body"].read().decode("utf-8")
    except s3_client.exceptions.NoSuchKey:
        existing = ""

    updated = existing + line + "\n"
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=ANALYSIS_LOG_KEY,
        Body=updated.encode("utf-8"),
        ContentType="application/x-ndjson",
    )


def get_analysis_log() -> list[dict]:
    """Read the full analysis log from S3 (or local fallback)."""
    if not _s3_available:
        local_log = LOCAL_IMAGE_DIR / "analysis_log.jsonl"
        if not local_log.exists():
            return []
        entries = []
        for raw_line in local_log.read_text().strip().split("\n"):
            if raw_line:
                entries.append(json.loads(raw_line))
        return entries

    try:
        resp = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=ANALYSIS_LOG_KEY)
        content = resp["Body"].read().decode("utf-8")
        entries = []
        for raw_line in content.strip().split("\n"):
            if raw_line:
                entries.append(json.loads(raw_line))
        return entries
    except s3_client.exceptions.NoSuchKey:
        return []


def get_image_bytes(image_key: str) -> bytes:
    """Fetch raw image bytes from S3 (or local fallback)."""
    if _s3_available:
        resp = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=image_key)
        return resp["Body"].read()
    local_path = LOCAL_IMAGE_DIR / image_key
    return local_path.read_bytes()


# ── Predictions ──


def put_prediction(prediction: dict) -> dict:
    predictions_table.put_item(Item=_floats_to_decimals(prediction))
    return prediction


def update_prediction(prediction_id: str, updates: dict) -> dict | None:
    fields = {k: v for k, v in updates.items() if v is not None}
    if not fields:
        return get_prediction(prediction_id)
    expr_parts = []
    expr_names = {}
    expr_values = {}
    for i, (key, val) in enumerate(fields.items()):
        expr_parts.append(f"#{key} = :val{i}")
        expr_names[f"#{key}"] = key
        expr_values[f":val{i}"] = _floats_to_decimals(val)
    resp = predictions_table.update_item(
        Key={"prediction_id": prediction_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
        ReturnValues="ALL_NEW",
    )
    item = resp.get("Attributes")
    if not item:
        return None
    item = _decimals_to_floats(item)
    if item.get("image_key"):
        item["image_url"] = get_presigned_url(item["image_key"])
    return item


def get_prediction(prediction_id: str) -> dict | None:
    resp = predictions_table.get_item(Key={"prediction_id": prediction_id})
    item = resp.get("Item")
    if not item:
        return None
    item = _decimals_to_floats(item)
    # Refresh presigned URL
    if item.get("image_key"):
        item["image_url"] = get_presigned_url(item["image_key"])
    return item


def get_predictions_by_user(user_id: str) -> list[dict]:
    resp = predictions_table.query(
        IndexName="user_id-index",
        KeyConditionExpression=Key("user_id").eq(user_id),
    )
    items = _decimals_to_floats(resp.get("Items", []))
    for item in items:
        if item.get("image_key"):
            item["image_url"] = get_presigned_url(item["image_key"])
    return items
