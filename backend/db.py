import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = "kalshi-use-trading-logs"

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def put_trade(trade: dict) -> dict:
    trade["trade_id"] = str(uuid.uuid4())
    trade["created_at"] = datetime.now(timezone.utc).isoformat()
    table.put_item(Item=trade)
    return trade


def get_trade(trade_id: str) -> dict | None:
    resp = table.get_item(Key={"trade_id": trade_id})
    return resp.get("Item")


def get_trades_by_user(user_id: str) -> list[dict]:
    resp = table.query(
        IndexName="user_id-index",
        KeyConditionExpression=Key("user_id").eq(user_id),
    )
    return resp.get("Items", [])
