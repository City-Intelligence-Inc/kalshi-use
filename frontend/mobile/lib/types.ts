// Matches backend Pydantic models

// ── Prediction models ──

export interface EvScenario {
  probability: number;
  ev_per_contract: number;
  kelly_fraction: number;
}

export interface Factor {
  stat: string;
  source: string;
  direction: "favors_yes" | "favors_no";
  magnitude: "low" | "medium" | "high";
  detail: string;
}

export interface PredictionRecommendation {
  ticker: string;
  title: string;
  side: "yes" | "no";
  confidence: number;
  reasoning: string;
  factors: Factor[];
  ev_analysis: EvScenario[];
  bear_case: string;
  recommended_position: number;
  no_bet: boolean;
  no_bet_reason?: string;
}

export interface MarketData {
  status: "found" | "not_found" | "error";
  ticker?: string;
  reason?: string;
  market_status?: string;
  result?: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  previous_price?: number;
  previous_yes_bid?: number;
  spread?: number;
  midpoint?: number;
  price_delta?: number;
  volume?: number;
  volume_24h?: number;
  open_interest?: number;
  yes_depth?: number;
  no_depth?: number;
  orderbook_yes?: number[][];
  orderbook_no?: number[][];
  event_ticker?: string;
  event_title?: string;
  event_category?: string;
  mutually_exclusive?: boolean;
  related_market_count?: number;
}

export interface Prediction {
  prediction_id: string;
  user_id: string;
  image_key?: string;
  image_url?: string;
  context?: string;
  model: string;
  status: string;
  recommendation?: PredictionRecommendation;
  market_data?: MarketData;
  error_message?: string;
  user_notes?: string;
  model_idea?: string;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
}

export interface PredictionUpdate {
  context?: string;
  user_notes?: string;
  model_idea?: string;
}

export interface ModelInfo {
  name: string;
  display_name: string;
  description: string;
  status: string;
  input_type: string;
  output_type: string;
  custom?: boolean;
}

// ── Public Markets ──

export interface KalshiMarket {
  ticker: string;
  title: string;
  event_ticker?: string;
  status?: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  previous_price?: number;
  volume?: number;
  volume_24h?: number;
  open_interest?: number;
  close_time?: string;
  category?: string;
}

// ── Integrations & Portfolio ──

export interface Integration {
  user_id: string;
  platform: string;
  account_type: string; // "personal" | "agent"
  api_key_id: string;
  status: string; // "active" | "error"
  connected_at: string;
  platform_account?: string;
}

export interface PlatformBalance {
  available_balance: number;
  payout: number;
  total_value: number;
}

export interface AggregatedPortfolio {
  total_value: number;
  available_balance: number;
  total_payout: number;
  platforms: PlatformBalance[];
}

export interface KalshiPosition {
  ticker: string;
  market_title: string;
  yes_count: number;
  no_count: number;
  market_exposure: number;
  realized_pnl: number;
  resting_orders_count: number;
}

export interface KalshiFill {
  trade_id: string;
  ticker: string;
  side: string;
  action: string;
  type: string;
  count: number;
  yes_price: number;
  no_price: number;
  created_time: string;
}

// ── Tracked Positions ──

export interface TrackedPosition {
  position_id: string;
  user_id: string;
  prediction_id: string;
  ticker: string;
  side: string;
  entry_price: number;
  title?: string;
  model?: string;
  confidence?: number;
  image_key?: string;
  status: "active" | "settled_win" | "settled_loss" | "closed";
  current_price?: number;
  unrealized_pnl?: number;
  market_status?: string;
  market_result?: string;
  settlement_price?: number;
  realized_pnl?: number;
  settled_at?: string;
  created_at: string;
  updated_at?: string;
}
