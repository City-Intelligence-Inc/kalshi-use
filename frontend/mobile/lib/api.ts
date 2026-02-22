import AsyncStorage from "@react-native-async-storage/async-storage";
import { Prediction, TradeLog, TradeLogCreate } from "./types";

const API_BASE_URL = __DEV__
  ? "http://localhost:8000"
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

// Prediction endpoints

export async function submitPrediction(
  imageUri: string,
  userId: string,
  context?: string,
  model: string = "taruns_model"
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
