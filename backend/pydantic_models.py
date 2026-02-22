from pydantic import BaseModel
from typing import Optional


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
    market_status: Optional[str] = None
    result: Optional[str] = None
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
    volume: Optional[int] = None
    volume_24h: Optional[int] = None
    open_interest: Optional[int] = None
    yes_depth: Optional[int] = None
    no_depth: Optional[int] = None
    orderbook_yes: Optional[list] = None
    orderbook_no: Optional[list] = None
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
    status: str  # "processing", "completed", "failed"
    recommendation: Optional[PredictionRecommendation] = None
    market_data: Optional[MarketData] = None
    error_message: Optional[str] = None
    user_notes: Optional[str] = None
    model_idea: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    updated_at: Optional[str] = None


class PredictionUpdate(BaseModel):
    context: Optional[str] = None
    user_notes: Optional[str] = None
    model_idea: Optional[str] = None


# ── Model info ──


class ModelInfo(BaseModel):
    name: str
    display_name: str
    description: str
    status: str  # "available", "coming_soon"
    input_type: str  # "image", "text", "image+text"
    output_type: str  # "text", "prediction", "structured"
    custom: Optional[bool] = None


# ── Pipeline request/response models ──


class InputResponse(BaseModel):
    prediction_id: str
    image_key: str
    image_url: str


class OutputRequest(BaseModel):
    prediction_id: str
    model: str = "taruns_model"


# ── Integrations & Portfolio ──


class IntegrationConnect(BaseModel):
    user_id: str
    platform: str = "kalshi"
    account_type: str = "personal"  # "personal" or "agent"
    api_key_id: str
    private_key_pem: str


class Integration(BaseModel):
    user_id: str
    platform: str
    account_type: str
    api_key_id: str
    status: str  # "active", "error"
    connected_at: str
    platform_account: Optional[str] = None  # composite key: "kalshi#personal"


class PortfolioBalance(BaseModel):
    available_balance: float
    payout: float
    total_value: float


class AggregatedPortfolio(BaseModel):
    total_value: float
    available_balance: float
    total_payout: float
    platforms: list[PortfolioBalance]


class KalshiPosition(BaseModel):
    ticker: str
    market_title: str
    yes_count: int
    no_count: int
    market_exposure: float
    realized_pnl: float
    resting_orders_count: int


class KalshiFill(BaseModel):
    trade_id: str
    ticker: str
    side: str
    action: str
    type: str
    count: int
    yes_price: int
    no_price: int
    created_time: str
