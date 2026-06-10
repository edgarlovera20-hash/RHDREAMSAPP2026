import crypto from "crypto";

// ─── Meta App Configuration ──────────────────────────────────────────────────

export const META_GRAPH_VERSION = () => process.env.META_GRAPH_VERSION || "v22.0";
export const META_APP_ID        = () => process.env.META_APP_ID        || "1754954535487311";
export const META_APP_SECRET    = () => process.env.META_APP_SECRET    || "";
export const META_VERIFY_TOKEN  = () => process.env.META_WEBHOOK_VERIFY_TOKEN || "rhdreams2026";

// ─── Page / Instagram tokens ─────────────────────────────────────────────────
export const PAGE_ACCESS_TOKEN   = () => process.env.META_PAGE_ACCESS_TOKEN || "";
export const INSTAGRAM_TOKEN     = () => process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || PAGE_ACCESS_TOKEN();
export const META_PAGE_ID        = () => process.env.META_PAGE_ID || "";
export const META_IG_USER_ID     = () => process.env.META_IG_USER_ID || "";

// ─── WhatsApp Cloud ───────────────────────────────────────────────────────────
export const WA_ACCESS_TOKEN    = () => process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || "";
export const WA_PHONE_NUMBER_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID   || "";
export const WA_BUSINESS_ID     = () => process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

// ─── Graph API base URL ───────────────────────────────────────────────────────
export const graphUrl = (path: string) =>
  `https://graph.facebook.com/${META_GRAPH_VERSION()}/${path}`;

// ─── appsecret_proof helper ───────────────────────────────────────────────────
export function appSecretProof(token: string): string {
  const secret = META_APP_SECRET();
  if (!secret || !token) return "";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

// ─── Signature verification ───────────────────────────────────────────────────
export function verifySignature(rawBody: Buffer, header: string | undefined): boolean {
  const secret = META_APP_SECRET();
  if (!secret) return true; // skip if no secret configured
  if (!header?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const expBuf  = Buffer.from(expected);
  const recvBuf = Buffer.from(header.trim());
  return expBuf.length === recvBuf.length && crypto.timingSafeEqual(expBuf, recvBuf);
}

// ─── Webhook challenge verification ──────────────────────────────────────────
export function verifyChallenge(query: Record<string, string>) {
  return (
    query["hub.mode"]         === "subscribe"     &&
    query["hub.verify_token"] === META_VERIFY_TOKEN() &&
    query["hub.challenge"]    !== undefined
  );
}
