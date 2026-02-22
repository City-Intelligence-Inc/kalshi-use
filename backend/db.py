import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key


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

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
snapshots_table = dynamodb.Table(SNAPSHOTS_TABLE_NAME)
predictions_table = dynamodb.Table(PREDICTIONS_TABLE_NAME)
s3_client = boto3.client("s3")


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
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )


# ── Predictions ──


def put_prediction(prediction: dict) -> dict:
    predictions_table.put_item(Item=_floats_to_decimals(prediction))
    return prediction


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
