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

export interface PredictionRecommendation {
  ticker: string;
  side: "yes" | "no";
  confidence: number;
  reasoning: string;
}

export interface Prediction {
  prediction_id: string;
  user_id: string;
  image_key: string;
  image_url: string;
  context?: string;
  model: string;
  status: string;
  recommendation?: PredictionRecommendation;
  created_at: string;
  completed_at?: string;
}

export interface AgentConfig {
  market: "kalshi" | "polymarket";
  strategy: string;
  active: boolean;
}
