const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "").replace(/\/$/, "");

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
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
    throw new Error(payload?.error || data?.error || `La API respondio ${response.status}`);
  }

  return data as T;
}
