const DEFAULT_API_BASE = "http://localhost:5000/api";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE
).replace(/\/+$/, "");

export function buildApiUrl(endpoint: string) {
  return `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}
