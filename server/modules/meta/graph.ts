import { graphUrl, PAGE_ACCESS_TOKEN, INSTAGRAM_TOKEN, WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, appSecretProof } from "./config";
import { logger } from "../../utils/logger";

// ─── Generic Graph API fetch ──────────────────────────────────────────────────
async function graphFetch(path: string, token: string, options: RequestInit = {}) {
  const proof = appSecretProof(token);
  const sep   = path.includes("?") ? "&" : "?";
  const url   = `${graphUrl(path)}${sep}access_token=${token}${proof ? `&appsecret_proof=${proof}` : ""}`;

  const res  = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    logger.warn("[Meta Graph] request failed", { path, status: res.status, data });
    return null;
  }
  return data;
}

// ─── Send Messenger / Instagram DM ───────────────────────────────────────────
export async function sendMessage(channel: "messenger" | "instagram", recipientId: string, text: string) {
  const token = channel === "instagram" ? INSTAGRAM_TOKEN() : PAGE_ACCESS_TOKEN();
  if (!token) {
    logger.warn(`[Meta] send skipped — no token for ${channel}`);
    return null;
  }

  return graphFetch("me/messages", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient:      { id: recipientId },
      message:        { text },
      messaging_type: "RESPONSE",
    }),
  });
}

// ─── Send WhatsApp Cloud text ─────────────────────────────────────────────────
export async function sendWhatsApp(to: string, text: string) {
  const token   = WA_ACCESS_TOKEN();
  const phoneId = WA_PHONE_NUMBER_ID();
  if (!token || !phoneId) {
    logger.warn("[Meta] WhatsApp send skipped — missing token or phone number id");
    return null;
  }

  const proof = appSecretProof(token);
  const url   = `${graphUrl(`${phoneId}/messages`)}${proof ? `?appsecret_proof=${proof}` : ""}`;

  const res  = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type:    "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  const data = await res.json();
  if (!res.ok) { logger.warn("[Meta] WhatsApp send failed", { status: res.status, data }); return null; }
  return data;
}

// ─── Fetch Facebook Lead details ──────────────────────────────────────────────
export async function fetchLead(leadgenId: string) {
  const token = PAGE_ACCESS_TOKEN();
  if (!token || !leadgenId) return null;
  return graphFetch(`${leadgenId}?fields=id,created_time,ad_id,ad_name,form_id,field_data`, token);
}

// ─── Get Page info ────────────────────────────────────────────────────────────
export async function getPageInfo() {
  const token = PAGE_ACCESS_TOKEN();
  if (!token) return null;
  return graphFetch("me?fields=id,name,fan_count", token);
}
