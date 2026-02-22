from fastapi import APIRouter, HTTPException, Query

from backend.db import get_trade, get_trades_by_user, put_trade
from backend.models import TradeLog, TradeLogCreate

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
