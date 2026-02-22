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

export interface User {
  id: string;
  email: string;
  name?: string;
  kyc_complete: boolean;
  two_factor_enabled: boolean;
}

export interface AgentConfig {
  market: "kalshi" | "polymarket";
  strategy: string;
  active: boolean;
}
