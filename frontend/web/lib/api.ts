import axios from "axios";
import { TradeLog, TradeLogCreate } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://cuxaxyzbcm.us-east-1.awsapprunner.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Trade endpoints

export async function createTrade(trade: TradeLogCreate): Promise<TradeLog> {
  const { data } = await api.post<TradeLog>("/trades", trade);
  return data;
}

export async function getTrade(tradeId: string): Promise<TradeLog> {
  const { data } = await api.get<TradeLog>(`/trades/${tradeId}`);
  return data;
}

export async function getTradesByUser(userId: string): Promise<TradeLog[]> {
  const { data } = await api.get<TradeLog[]>("/trades", {
    params: { user_id: userId },
  });
  return data;
}

export async function deleteTrade(tradeId: string): Promise<void> {
  await api.delete(`/trades/${tradeId}`);
}

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get<{ status: string }>("/health");
  return data;
}

export default api;
