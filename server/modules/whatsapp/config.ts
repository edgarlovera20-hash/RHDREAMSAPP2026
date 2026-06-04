import crypto from "crypto";

export type WhatsAppCloudConfig = {
  graphVersion: string;
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecrets: string[];
  agentName: string;
  companyName: string;
};

export function getWhatsAppCloudConfig(): WhatsAppCloudConfig {
  return {
    graphVersion: process.env.META_GRAPH_VERSION || "v24.0",
    accessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
    appSecrets: [
      process.env.META_APP_SECRET,
      process.env.WHATSAPP_APP_SECRET,
    ].filter(Boolean) as string[],
    agentName: process.env.WHATSAPP_AGENT_NAME || process.env.DEFAULT_AGENT_PERSONAL_NAME || "Agente WhatsApp Meta RH",
    companyName: process.env.DEFAULT_COMPANY_NAME || "Heavenly Dreams",
  };
}

export function getMissingWhatsAppCloudConfig(config = getWhatsAppCloudConfig()) {
  const missing: string[] = [];
  if (!config.verifyToken) missing.push("META_WEBHOOK_VERIFY_TOKEN");
  if (!config.appSecrets.length) missing.push("META_APP_SECRET");
  if (!config.accessToken) missing.push("WHATSAPP_CLOUD_ACCESS_TOKEN");
  if (!config.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  return missing;
}

export function createAppSecretProof(accessToken: string, config = getWhatsAppCloudConfig()) {
  const appSecret = config.appSecrets[0];
  if (!accessToken || !appSecret) return "";
  return crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

export function verifyWhatsAppWebhookChallenge(query: Record<string, any>, config = getWhatsAppCloudConfig()) {
  const mode = String(query["hub.mode"] || "");
  const token = String(query["hub.verify_token"] || "");
  const challenge = String(query["hub.challenge"] || "");

  return {
    ok: Boolean(mode === "subscribe" && config.verifyToken && token === config.verifyToken && challenge),
    challenge,
  };
}

export function verifyWhatsAppSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined, config = getWhatsAppCloudConfig()) {
  if (!config.appSecrets.length) return true;
  if (!rawBody || !signatureHeader?.startsWith("sha256=")) return false;

  const received = signatureHeader.trim();
  return config.appSecrets.some((appSecret) => {
    const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  });
}
