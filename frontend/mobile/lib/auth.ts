import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "./types";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// Password validation — Kalshi-compliant strong password
export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("One special character");
  return errors;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Token persistence
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// User persistence
export async function getStoredUser(): Promise<User | null> {
  const json = await AsyncStorage.getItem(USER_KEY);
  return json ? JSON.parse(json) : null;
}

export async function setStoredUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

// Logout — clear all auth state
export async function logout(): Promise<void> {
  await Promise.all([clearToken(), clearStoredUser()]);
}

// Stub auth functions — replace with real API calls when backend auth is ready

export async function login(
  email: string,
  _password: string
): Promise<{ user: User; token: string }> {
  // TODO: call backend /auth/login
  const user: User = {
    id: "demo-user-1",
    email,
    name: email.split("@")[0],
    kyc_complete: true,
    two_factor_enabled: false,
  };
  const token = "demo-token";
  await setToken(token);
  await setStoredUser(user);
  return { user, token };
}

export async function signup(
  email: string,
  _password: string
): Promise<{ user: User; token: string }> {
  // TODO: call backend /auth/signup
  const user: User = {
    id: "demo-user-1",
    email,
    name: email.split("@")[0],
    kyc_complete: false,
    two_factor_enabled: false,
  };
  const token = "demo-token";
  await setToken(token);
  await setStoredUser(user);
  return { user, token };
}

export async function verifyEmail(_code: string): Promise<boolean> {
  // TODO: call backend /auth/verify-email
  return true;
}

export async function submitKyc(_data: {
  fullName: string;
  dob: string;
  ssnLast4: string;
  address: string;
}): Promise<boolean> {
  // TODO: call backend /auth/kyc
  return true;
}

export async function setup2FA(
  _method: "totp" | "sms"
): Promise<{ secret?: string }> {
  // TODO: call backend /auth/2fa/setup
  return { secret: "DEMO2FASECRET" };
}
