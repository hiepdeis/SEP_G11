// const DEFAULT_API_BASE = "http://localhost:5000/api";
// https://backend-mascost-production.up.railway.app
const DEFAULT_API_BASE = "https://backend-mascost-production.up.railway.app/api";
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE
).replace(/\/+$/, "");

export function buildApiUrl(endpoint: string) {
  return `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}
