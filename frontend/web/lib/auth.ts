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
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// User persistence
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const json = localStorage.getItem(USER_KEY);
  return json ? JSON.parse(json) : null;
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

// Logout
export function logout(): void {
  clearToken();
  clearStoredUser();
}

// Stub auth functions — replace with real API calls when backend auth is ready

export function login(
  email: string,
  _password: string
): { user: User; token: string } {
  const user: User = {
    id: "demo-user-1",
    email,
    name: email.split("@")[0],
    kyc_complete: true,
    two_factor_enabled: false,
  };
  const token = "demo-token";
  setToken(token);
  setStoredUser(user);
  return { user, token };
}

export function signup(
  email: string,
  _password: string
): { user: User; token: string } {
  const user: User = {
    id: "demo-user-1",
    email,
    name: email.split("@")[0],
    kyc_complete: false,
    two_factor_enabled: false,
  };
  const token = "demo-token";
  setToken(token);
  setStoredUser(user);
  return { user, token };
}

export function verifyEmail(_code: string): boolean {
  return true;
}

export function submitKyc(_data: {
  fullName: string;
  dob: string;
  ssnLast4: string;
  address: string;
}): boolean {
  return true;
}

export function setup2FA(
  _method: "totp" | "sms"
): { secret?: string } {
  return { secret: "DEMO2FASECRET" };
}
