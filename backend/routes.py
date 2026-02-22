from fastapi import APIRouter, HTTPException, Query

from backend.db import delete_trade, get_trade, get_trades_by_user, put_trade, update_trade
from backend.models import TradeLog, TradeLogCreate, TradeLogUpdate

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
