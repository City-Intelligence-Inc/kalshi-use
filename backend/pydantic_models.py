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
    email: Optional[str] = None  # notification email


class Integration(BaseModel):
    user_id: str
    platform: str
    account_type: str
    api_key_id: str
    status: str  # "active", "error"
    connected_at: str
    platform_account: Optional[str] = None  # composite key: "kalshi#personal"
    email: Optional[str] = None


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


# ── Tracked Positions ──


class PushTokenRegister(BaseModel):
    user_id: str
    expo_push_token: str


class TrackedPositionCreate(BaseModel):
    user_id: str
    prediction_id: Optional[str] = None
    ticker: str
    side: str  # "yes" or "no"
    entry_price: float  # cents
    title: Optional[str] = None
    model: Optional[str] = None
    confidence: Optional[float] = None
    image_key: Optional[str] = None


class MarketSnapshotAtEntry(BaseModel):
    captured_at: Optional[str] = None
    yes_bid: Optional[float] = None
    yes_ask: Optional[float] = None
    no_bid: Optional[float] = None
    no_ask: Optional[float] = None
    last_price: Optional[float] = None
    previous_price: Optional[float] = None
    spread: Optional[float] = None
    volume: Optional[int] = None
    volume_24h: Optional[int] = None
    open_interest: Optional[int] = None
    category: Optional[str] = None
    event_title: Optional[str] = None
    market_status: Optional[str] = None


class TrackedPosition(BaseModel):
    position_id: str
    user_id: str
    prediction_id: Optional[str] = None
    ticker: str
    side: str
    entry_price: float
    title: Optional[str] = None
    model: Optional[str] = None
    confidence: Optional[float] = None
    image_key: Optional[str] = None
    status: str  # "active", "settled_win", "settled_loss", "closed"
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    market_status: Optional[str] = None
    market_result: Optional[str] = None
    settlement_price: Optional[float] = None
    realized_pnl: Optional[float] = None
    settled_at: Optional[str] = None
    market_snapshot_at_entry: Optional[MarketSnapshotAtEntry] = None
    created_at: str
    updated_at: Optional[str] = None


# ── Bot Builder ──


class MilestoneStatus(BaseModel):
    id: str
    name: str
    description: str
    target: int
    current: int
    completed: bool
    completed_at: Optional[str] = None


class UserProgress(BaseModel):
    user_id: str
    milestones: list[MilestoneStatus]
    current_streak: int
    longest_streak: int
    last_check_in: Optional[str] = None
    total_check_ins: int
    bot_ready: bool
    total_positions: int
    settled_positions: int
    paper_balance: float  # cents, starts at 10000 ($100)
    created_at: str
    updated_at: Optional[str] = None


class BotStrategy(BaseModel):
    user_id: str
    total_trades: int
    win_rate: float
    preferred_categories: list[dict]
    preferred_side: str
    preferred_entry_band: str
    avg_entry_price: float
    yes_win_rate: Optional[float] = None
    no_win_rate: Optional[float] = None
    generated_at: str
    insufficient_data: Optional[bool] = None


class BotSignal(BaseModel):
    ticker: str
    title: str
    side: str
    confidence: float
    reasoning: str
    match_score: float
    category: Optional[str] = None
    current_price: Optional[float] = None
    entry_price_suggestion: Optional[float] = None
