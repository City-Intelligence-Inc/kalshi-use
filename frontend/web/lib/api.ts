import {
  AggregatedPortfolio,
  Integration,
  KalshiFill,
  KalshiMarket,
  KalshiPosition,
  ModelInfo,
  Prediction,
  PredictionUpdate,
  TrackedPosition,
} from "./types";

const ENDPOINTS = {
  production: "https://cuxaxyzbcm.us-east-1.awsapprunner.com",
  local: "http://192.168.7.179:8000",
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

const ENDPOINT_STORAGE_KEY = "api_endpoint";

let _cachedEndpoint: EndpointKey | null = null;

export function getEndpoint(): EndpointKey {
  if (_cachedEndpoint) return _cachedEndpoint;
  if (typeof window === "undefined") return "production";
  const stored = localStorage.getItem(ENDPOINT_STORAGE_KEY);
  if (stored === "local" || stored === "production") {
    _cachedEndpoint = stored;
    return stored;
  }
  _cachedEndpoint = "production";
  return "production";
}

export function setEndpoint(key: EndpointKey): void {
  _cachedEndpoint = key;
  if (typeof window !== "undefined") {
    localStorage.setItem(ENDPOINT_STORAGE_KEY, key);
  }
}

function getBaseUrl(): string {
  const key = getEndpoint();
  return ENDPOINTS[key];
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Health ──

export async function healthCheck(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}

// ── Models ──

export async function getModels(): Promise<ModelInfo[]> {
  return request<ModelInfo[]>("/models");
}

// ── Markets ──

export async function getMarkets(
  limit: number = 200
): Promise<KalshiMarket[]> {
  return request<KalshiMarket[]>(`/markets?status=open&limit=${limit}`);
}

// ── Predictions ──

export async function submitPrediction(
  file: File,
  userId: string,
  context?: string,
  model: string = "gemini"
): Promise<Prediction> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const formData = new FormData();
  formData.append("image", file);
  formData.append("user_id", userId);
  formData.append("model", model);
  if (context) {
    formData.append("context", context);
  }

  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/predict`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function getPrediction(
  predictionId: string
): Promise<Prediction> {
  return request<Prediction>(`/predictions/${predictionId}`);
}

export async function updatePrediction(
  predictionId: string,
  updates: PredictionUpdate
): Promise<Prediction> {
  return request<Prediction>(`/predictions/${predictionId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function getPredictions(userId: string): Promise<Prediction[]> {
  return request<Prediction[]>(
    `/predictions?user_id=${encodeURIComponent(userId)}`
  );
}

export async function pollPrediction(
  predictionId: string,
  intervalMs: number = 2000,
  maxAttempts: number = 60
): Promise<Prediction> {
  for (let i = 0; i < maxAttempts; i++) {
    const prediction = await getPrediction(predictionId);
    if (prediction.status === "completed" || prediction.status === "failed") {
      return prediction;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Prediction timed out");
}

// ── Debug / Data Explorer ──

export interface TableSummary {
  count: number;
  recent: Record<string, unknown>[];
}

export interface TablesResponse {
  predictions: TableSummary;
  trading_logs: TableSummary;
  market_snapshots: TableSummary;
}

export async function getDebugTables(): Promise<TablesResponse> {
  return request<TablesResponse>("/debug/tables");
}

export async function getSystemPrompt(): Promise<{ prompt: string }> {
  return request<{ prompt: string }>("/system-prompt");
}

// ── Integrations ──

export async function connectPlatform(
  userId: string,
  apiKeyId: string,
  privateKeyPem: string,
  platform: string = "kalshi",
  accountType: string = "personal"
): Promise<Integration> {
  return request<Integration>("/integrations/connect", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      platform,
      account_type: accountType,
      api_key_id: apiKeyId,
      private_key_pem: privateKeyPem,
    }),
  });
}

export async function getIntegrations(
  userId: string
): Promise<Integration[]> {
  return request<Integration[]>(
    `/integrations/${encodeURIComponent(userId)}`
  );
}

export async function disconnectPlatform(
  userId: string,
  platform: string,
  accountType: string
): Promise<void> {
  return request(
    `/integrations/${encodeURIComponent(userId)}/${encodeURIComponent(platform)}/${encodeURIComponent(accountType)}`,
    { method: "DELETE" }
  );
}

// ── Portfolio ──

export async function getPortfolioBalance(
  userId: string
): Promise<AggregatedPortfolio> {
  return request<AggregatedPortfolio>(
    `/portfolio/${encodeURIComponent(userId)}/balance`
  );
}

export async function getPositions(
  userId: string
): Promise<KalshiPosition[]> {
  return request<KalshiPosition[]>(
    `/portfolio/${encodeURIComponent(userId)}/positions`
  );
}

export async function getFills(
  userId: string,
  limit: number = 50
): Promise<KalshiFill[]> {
  return request<KalshiFill[]>(
    `/portfolio/${encodeURIComponent(userId)}/fills?limit=${limit}`
  );
}

// ── Tracked Positions ──

export async function acceptTrade(params: {
  user_id: string;
  prediction_id: string;
  ticker: string;
  side: string;
  entry_price: number;
  title?: string;
  model?: string;
  confidence?: number;
  image_key?: string;
}): Promise<TrackedPosition> {
  return request<TrackedPosition>("/tracked-positions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getTrackedPositions(
  userId: string
): Promise<TrackedPosition[]> {
  return request<TrackedPosition[]>(
    `/tracked-positions?user_id=${encodeURIComponent(userId)}`
  );
}

export async function closeTrackedPosition(
  positionId: string
): Promise<void> {
  return request(`/tracked-positions/${encodeURIComponent(positionId)}`, {
    method: "DELETE",
  });
}
