import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AggregatedPortfolio,
  BotSignal,
  BotStrategy,
  Integration,
  KalshiFill,
  KalshiMarket,
  KalshiPosition,
  ModelInfo,
  Prediction,
  PredictionUpdate,
  TrackedPosition,
  UserProgress,
} from "./types";

const ENDPOINTS = {
  production: "https://cuxaxyzbcm.us-east-1.awsapprunner.com",
  local: "http://192.168.7.179:8000",
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

const ENDPOINT_STORAGE_KEY = "api_endpoint";

let _cachedEndpoint: EndpointKey | null = null;

export async function getEndpoint(): Promise<EndpointKey> {
  if (_cachedEndpoint) return _cachedEndpoint;
  const stored = await AsyncStorage.getItem(ENDPOINT_STORAGE_KEY);
  if (stored === "local" || stored === "production") {
    _cachedEndpoint = stored;
    return stored;
  }
  const defaultEndpoint: EndpointKey = "production";
  _cachedEndpoint = defaultEndpoint;
  return defaultEndpoint;
}

export async function setEndpoint(key: EndpointKey): Promise<void> {
  _cachedEndpoint = key;
  await AsyncStorage.setItem(ENDPOINT_STORAGE_KEY, key);
}

async function getBaseUrl(): Promise<string> {
  const key = await getEndpoint();
  return ENDPOINTS[key];
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await AsyncStorage.getItem("auth_token");
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

// ── Public Markets ──

export async function getMarkets(limit: number = 200): Promise<KalshiMarket[]> {
  return request<KalshiMarket[]>(`/markets?status=open&limit=${limit}`);
}

export interface MarketAnalysis {
  ticker: string;
  title: string;
  strategy: string;
  side: string;
  confidence: number;
  entry_price?: number;
  thinking: string;
  market_data?: Record<string, unknown>;
}

export async function analyzeMarket(ticker: string, model: string = "gemini"): Promise<MarketAnalysis> {
  return request<MarketAnalysis>(`/markets/${ticker}/analyze?model=${model}`, {
    method: "POST",
  });
}

// ── Predictions ──

export async function submitPrediction(
  imageUri: string,
  userId: string,
  context?: string,
  model: string = "gemini",
  expoPushToken?: string
): Promise<Prediction> {
  const token = await AsyncStorage.getItem("auth_token");

  const formData = new FormData();
  const filename = imageUri.split("/").pop() ?? "photo.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);
  formData.append("user_id", userId);
  formData.append("model", model);
  if (context) {
    formData.append("context", context);
  }
  if (expoPushToken) {
    formData.append("expo_push_token", expoPushToken);
  }

  const baseUrl = await getBaseUrl();
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

export async function getPrediction(predictionId: string): Promise<Prediction> {
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
  recent: Record<string, any>[];
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
  accountType: string = "personal",
  email?: string
): Promise<Integration> {
  return request<Integration>("/integrations/connect", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      platform,
      account_type: accountType,
      api_key_id: apiKeyId,
      private_key_pem: privateKeyPem,
      ...(email ? { email } : {}),
    }),
  });
}

export async function getIntegrations(userId: string): Promise<Integration[]> {
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
  prediction_id?: string;
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

// ── Push Tokens ──

export async function registerPushToken(
  userId: string,
  expoPushToken: string
): Promise<void> {
  return request("/push-token", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      expo_push_token: expoPushToken,
    }),
  });
}

// ── Bot Builder ──

export async function getBotProgress(userId: string): Promise<UserProgress> {
  return request<UserProgress>(
    `/bot/${encodeURIComponent(userId)}/progress`
  );
}

export async function recordCheckIn(userId: string): Promise<UserProgress> {
  return request<UserProgress>(
    `/bot/${encodeURIComponent(userId)}/check-in`,
    { method: "POST" }
  );
}

export async function getBotStrategy(userId: string): Promise<BotStrategy> {
  return request<BotStrategy>(
    `/bot/${encodeURIComponent(userId)}/strategy`
  );
}

export async function getBotSignals(
  userId: string,
  limit: number = 5
): Promise<BotSignal[]> {
  return request<BotSignal[]>(
    `/bot/${encodeURIComponent(userId)}/signals?limit=${limit}`
  );
}
