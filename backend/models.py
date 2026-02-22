from pydantic import BaseModel
from typing import Optional


class TradeLogCreate(BaseModel):
    user_id: str
    agent_id: Optional[str] = None
    ticker: str
    side: str  # "yes" or "no"
    action: str  # "buy" or "sell"
    quantity: int
    price: float  # price per contract in cents
    total_cost: float
    status: str = "pending"  # "pending", "filled", "canceled"


class TradeLog(TradeLogCreate):
    trade_id: str
    created_at: str
    filled_at: Optional[str] = None
