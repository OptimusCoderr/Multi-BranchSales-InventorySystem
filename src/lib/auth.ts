/**
 * Client-side auth helpers backed by MongoDB.
 *
 * All password hashing happens server-side (Atlas App Services).
 * JWT is stored in sessionStorage (cleared on tab close) for XSS safety.
 */

import { setAuthToken, getAuthToken } from './api';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'admin' | 'staff';
  branchId: string | null;
}

function decodeToken(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function getCurrentUser(): AuthUser | null {
  const token = getAuthToken();
  if (!token || isTokenExpired(token)) {
    setAuthToken(null);
    return null;
  }
  const payload = decodeToken(token);
  return payload ? (payload as AuthUser) : null;
}

const SESSION_KEY = 'bt_session';

export function persistSession(token: string) {
  try { sessionStorage.setItem(SESSION_KEY, token); } catch {}
  setAuthToken(token);
}

export function loadSession(): string | null {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token && !isTokenExpired(token)) {
      setAuthToken(token);
      return token;
    }
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  return null;
}

export function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  setAuthToken(null);
}

// ─── Auth API (login only — users created by admin) ────────────────────────────

const AUTH_ENDPOINT = import.meta.env.VITE_MONGO_AUTH_ENDPOINT;

async function authFetch(path: string, body: object): Promise<any> {
  const res = await fetch(`${AUTH_ENDPOINT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': import.meta.env.VITE_MONGO_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await authFetch('/login', { email: email.trim().toLowerCase(), password });
  persistSession(data.token);
  return data;
}

export function logoutUser() {
  clearSession();
}
