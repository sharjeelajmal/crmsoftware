/**
 * Browser-side API client. Every page talks to /api through this so that
 * JSON encoding, error handling and session expiry live in one place.
 *
 *   import { api } from "@/lib/api-client";
 *   const products = await api.get("/api/products");
 *   await api.post("/api/products", product);
 */

export class ApiClientError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(url, { method = "GET", body, headers, ...init } = {}) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (response.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
    window.location.assign("/login");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    throw new ApiClientError(message, response.status, data);
  }
  return data;
}

export const api = {
  get: (url, init) => request(url, init),
  post: (url, body, init) => request(url, { ...init, method: "POST", body }),
  put: (url, body, init) => request(url, { ...init, method: "PUT", body }),
  delete: (url, init) => request(url, { ...init, method: "DELETE" }),
};

/** Human-readable message for a caught error (ApiClientError or anything else). */
export const errorMessage = (err, fallback = "Something went wrong") =>
  err instanceof ApiClientError ? err.message : err?.message || fallback;
