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


class TradeLogUpdate(BaseModel):
    agent_id: Optional[str] = None
    ticker: Optional[str] = None
    side: Optional[str] = None
    action: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    total_cost: Optional[float] = None
    status: Optional[str] = None
    filled_at: Optional[str] = None


class TradeLog(TradeLogCreate):
    trade_id: str
    created_at: str
    filled_at: Optional[str] = None


class MarketOutcome(BaseModel):
    name: str
    yes_price: int
    no_price: int


class MarketSnapshotCreate(BaseModel):
    event_ticker: str
    title: str
    category: str
    status: str  # "live", "scheduled", "closed"
    volume: int
    markets: list[MarketOutcome]
    num_markets: int
    url: str


class MarketSnapshot(MarketSnapshotCreate):
    scraped_at: str


class PredictionRecommendation(BaseModel):
    ticker: str
    side: str  # "yes" or "no"
    confidence: float  # 0-1
    reasoning: str


class Prediction(BaseModel):
    prediction_id: str
    user_id: str
    image_key: str
    image_url: str
    context: Optional[str] = None
    model: str
    status: str  # "processing", "completed"
    recommendation: Optional[PredictionRecommendation] = None
    created_at: str
    completed_at: Optional[str] = None
