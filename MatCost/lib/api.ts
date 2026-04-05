const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/+$/, "");

function buildUrl(endpoint: string) {
  return `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

async function parseResponse<T>(res: Response, method: string, endpoint: string): Promise<T> {
  if (!res.ok) {
    let text = await res.text();
    try {
      const errJson = JSON.parse(text);
      if (errJson.errors && typeof errJson.errors === "object") {
        const msgs = Object.values(errJson.errors).flat();
        if (msgs.length > 0) text = msgs.join("\n");
      } else if (errJson.title) {
        text = errJson.title;
      } else if (errJson.message) {
        text = errJson.message;
      }
    } catch {
      // ignores parse errors
    }
    throw new Error(text || `${method} ${endpoint} failed`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }

  return {} as T;
}

export async function apiGet<T>(endpoint: string, token?: string): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  return parseResponse<T>(res, "GET", endpoint);
}

export async function apiPost<T>(endpoint: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(res, "POST", endpoint);
}

export async function apiPut<T>(endpoint: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(res, "PUT", endpoint);
}

export async function apiPatch<T>(endpoint: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(res, "PATCH", endpoint);
}

export async function apiDelete<T = any>(endpoint: string, token?: string): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return parseResponse<T>(res, "DELETE", endpoint);
}
