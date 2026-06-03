const configuredApiBase = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "").replace(/\/$/, "");
const inferredApiBase = (() => {
  if (typeof window === "undefined") return "";
  if (window.location.hostname === "rh.heavenlydreams.com.mx") return "/api";
  if (window.location.pathname.startsWith("/rhdreams2026")) return "/rhdreams2026-api";
  return "";
})();

const API_BASE_URL = inferredApiBase || configuredApiBase;
export const API_TOKEN_STORAGE_KEY = "rhdreams_api_token";
export const API_AUTH_EXPIRED_MESSAGE = "Tu sesion expiro. Inicia sesion de nuevo para continuar.";

export function isApiAuthExpiredErrorMessage(message = "") {
  return /token expirado|token invalido|no autenticado|sesion expiro|unauthorized/i.test(message);
}

export function clearApiAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_TOKEN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("rhdreams:api-auth-expired"));
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL && normalizedPath.startsWith("/api/")) {
    return `${API_BASE_URL}${normalizedPath.slice(4)}`;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getApiAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem(API_TOKEN_STORAGE_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const authHeaders = getApiAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
  return fetch(apiUrl(input), {
    ...init,
    headers,
  });
}

export async function readApiJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();
  const trimmedBody = bodyText.trim();

  if (!trimmedBody) {
    if (!response.ok) {
      throw new Error(`La API respondio ${response.status} ${response.statusText || ""}`.trim());
    }
    return {} as T;
  }

  if (!contentType.includes("application/json")) {
    const preview = trimmedBody.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(
      `La API no devolvio JSON (${response.status}). Revisa que el endpoint exista y que VITE_API_BASE_URL apunte al backend correcto. Respuesta: ${preview}`
    );
  }

  let data: any;
  try {
    data = JSON.parse(trimmedBody);
  } catch (_error) {
    throw new Error("La API devolvio JSON invalido.");
  }

  if (!response.ok) {
    const payload = data?.data || data;
    const errorMessage = payload?.error || data?.error || `La API respondio ${response.status}`;
    if (response.status === 401 && isApiAuthExpiredErrorMessage(errorMessage)) {
      clearApiAuthToken();
      throw new Error(API_AUTH_EXPIRED_MESSAGE);
    }
    throw new Error(errorMessage);
  }

  return data as T;
}
