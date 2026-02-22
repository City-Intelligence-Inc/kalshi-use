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


# ── Prediction models ──


class EvScenario(BaseModel):
    probability: float       # e.g. 0.65
    ev_per_contract: float   # e.g. +0.12
    kelly_fraction: float    # e.g. 0.08


class Factor(BaseModel):
    stat: str                # "Power punch connect rate"
    source: str              # "CompuBox"
    direction: str           # "favors_yes" or "favors_no"
    magnitude: str           # "low", "medium", "high"
    detail: str              # "Garcia connects at 48% vs Barrios' 31%"


class PredictionRecommendation(BaseModel):
    ticker: str
    title: Optional[str] = None
    side: str                                          # "yes" or "no"
    confidence: float                                  # 0-1
    reasoning: str                                     # main thesis
    factors: Optional[list[Factor]] = None             # 3-5 key factors
    ev_analysis: Optional[list[EvScenario]] = None     # EV at multiple probability points
    bear_case: Optional[str] = None                    # argument against this side
    recommended_position: Optional[float] = None       # Kelly-optimal bet size (fraction of bankroll)
    no_bet: Optional[bool] = None                      # true if market is fairly priced
    no_bet_reason: Optional[str] = None                # why not to bet


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


# ── Model info ──


class ModelInfo(BaseModel):
    name: str
    display_name: str
    description: str
    status: str  # "available", "coming_soon"


# ── Pipeline request/response models ──


class InputResponse(BaseModel):
    prediction_id: str
    image_key: str
    image_url: str


class OutputRequest(BaseModel):
    prediction_id: str
    model: str = "taruns_model"
