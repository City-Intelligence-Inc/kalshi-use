import AsyncStorage from "@react-native-async-storage/async-storage";
import { ModelInfo, Prediction, TradeLog, TradeLogCreate } from "./types";

const API_BASE_URL = __DEV__
  ? "http://192.168.7.179:8000"
  : "https://cuxaxyzbcm.us-east-1.awsapprunner.com";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
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

// Trade endpoints

export async function createTrade(trade: TradeLogCreate): Promise<TradeLog> {
  return request<TradeLog>("/trades", {
    method: "POST",
    body: JSON.stringify(trade),
  });
}

export async function getTrade(tradeId: string): Promise<TradeLog> {
  return request<TradeLog>(`/trades/${tradeId}`);
}

export async function getTradesByUser(userId: string): Promise<TradeLog[]> {
  return request<TradeLog[]>(`/trades?user_id=${encodeURIComponent(userId)}`);
}

export async function deleteTrade(tradeId: string): Promise<void> {
  return request(`/trades/${tradeId}`, { method: "DELETE" });
}

export async function healthCheck(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}

// Model endpoints

export async function getModels(): Promise<ModelInfo[]> {
  return request<ModelInfo[]>("/models");
}

export async function getModelInfo(name: string): Promise<ModelInfo> {
  return request<ModelInfo>(`/models/${encodeURIComponent(name)}`);
}

// Prediction endpoints

export async function submitPrediction(
  imageUri: string,
  userId: string,
  context?: string,
  model: string = "taruns_model",
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

  const res = await fetch(`${API_BASE_URL}/predict`, {
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

export async function getPredictions(userId: string): Promise<Prediction[]> {
  return request<Prediction[]>(
    `/predictions?user_id=${encodeURIComponent(userId)}`
  );
}

/**
 * Poll for a prediction until it reaches a terminal status.
 * Returns the completed prediction.
 */
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
