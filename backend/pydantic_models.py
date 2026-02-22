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


class MarketData(BaseModel):
    status: str  # "found", "not_found", "error"
    ticker: Optional[str] = None
    reason: Optional[str] = None
    # Market status
    market_status: Optional[str] = None
    result: Optional[str] = None
    # Pricing (cents)
    yes_bid: Optional[float] = None
    yes_ask: Optional[float] = None
    no_bid: Optional[float] = None
    no_ask: Optional[float] = None
    last_price: Optional[float] = None
    previous_price: Optional[float] = None
    previous_yes_bid: Optional[float] = None
    spread: Optional[float] = None
    midpoint: Optional[float] = None
    price_delta: Optional[float] = None
    # Volume
    volume: Optional[int] = None
    volume_24h: Optional[int] = None
    open_interest: Optional[int] = None
    # Orderbook
    yes_depth: Optional[int] = None
    no_depth: Optional[int] = None
    orderbook_yes: Optional[list] = None
    orderbook_no: Optional[list] = None
    # Event context
    event_ticker: Optional[str] = None
    event_title: Optional[str] = None
    event_category: Optional[str] = None
    mutually_exclusive: Optional[bool] = None
    related_market_count: Optional[int] = None


class Prediction(BaseModel):
    prediction_id: str
    user_id: str
    image_key: Optional[str] = None
    image_url: Optional[str] = None
    context: Optional[str] = None
    model: str
    status: str  # "processing", "completed"
    recommendation: Optional[PredictionRecommendation] = None
    market_data: Optional[MarketData] = None
    user_notes: Optional[str] = None    # user-editable notes after analysis
    model_idea: Optional[str] = None    # user-submitted model/analysis idea
    created_at: str
    completed_at: Optional[str] = None
    updated_at: Optional[str] = None


class PredictionUpdate(BaseModel):
    context: Optional[str] = None
    user_notes: Optional[str] = None
    model_idea: Optional[str] = None


class IdeaCreate(BaseModel):
    """A manually submitted trade idea — like a quant researcher's thesis."""
    user_id: str
    ticker: str
    title: Optional[str] = None
    side: str  # "yes" or "no"
    confidence: float  # 0-1
    reasoning: str
    factors: Optional[list[Factor]] = None
    ev_analysis: Optional[list[EvScenario]] = None
    bear_case: Optional[str] = None
    recommended_position: Optional[float] = None
    no_bet: Optional[bool] = False
    no_bet_reason: Optional[str] = None
    user_notes: Optional[str] = None


# ── Model info ──


class ModelInfo(BaseModel):
    name: str
    display_name: str
    description: str
    status: str  # "available", "coming_soon"
    input_type: str  # "image", "text", "image+text"
    output_type: str  # "text", "prediction", "structured"


# ── Pipeline request/response models ──


class InputResponse(BaseModel):
    prediction_id: str
    image_key: str
    image_url: str


class OutputRequest(BaseModel):
    prediction_id: str
    model: str = "taruns_model"
