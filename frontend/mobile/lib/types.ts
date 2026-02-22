// Matches backend Pydantic models

export interface TradeLogCreate {
  user_id: string;
  agent_id?: string;
  ticker: string;
  side: "yes" | "no";
  action: "buy" | "sell";
  quantity: number;
  price: number; // price per contract in cents
  total_cost: number;
  status: string; // "pending" | "filled" | "canceled"
}

export interface TradeLogUpdate {
  agent_id?: string;
  ticker?: string;
  side?: string;
  action?: string;
  quantity?: number;
  price?: number;
  total_cost?: number;
  status?: string;
  filled_at?: string;
}

export interface TradeLog extends TradeLogCreate {
  trade_id: string;
  created_at: string;
  filled_at?: string;
}

// Auth types (client-side, not yet backed by API)

export interface User {
  id: string;
  email: string;
  name?: string;
  kyc_complete: boolean;
  two_factor_enabled: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

// Prediction models

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

export interface Prediction {
  prediction_id: string;
  user_id: string;
  image_key?: string;
  image_url?: string;
  context?: string;
  model: string;
  status: string;
  recommendation?: PredictionRecommendation;
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

export interface IdeaCreate {
  user_id: string;
  ticker: string;
  title?: string;
  side: "yes" | "no";
  confidence: number;
  reasoning: string;
  factors?: Factor[];
  ev_analysis?: EvScenario[];
  bear_case?: string;
  recommended_position?: number;
  no_bet?: boolean;
  no_bet_reason?: string;
  user_notes?: string;
}

export interface ModelInfo {
  name: string;
  display_name: string;
  description: string;
  status: string;
}

export interface AgentConfig {
  market: "kalshi" | "polymarket";
  strategy: string;
  active: boolean;
}

// Snapshot models

export interface Snapshot {
  event_ticker: string;
  category: string;
  snapshot_data: Record<string, any>;
  created_at: string;
}
