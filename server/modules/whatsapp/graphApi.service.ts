import { logger } from "../../utils/logger";
import { createAppSecretProof, getWhatsAppCloudConfig } from "./config";
import {
  WhatsAppMessageBody,
  WhatsAppSendResult,
} from "./types";
import {
  WELCOME_MENU_TEXT,
  WHATSAPP_RECRUITMENT_BUTTONS,
} from "./templates";

async function postToWhatsAppGraph(path: string[], body: Record<string, any>): Promise<WhatsAppSendResult> {
  const config = getWhatsAppCloudConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return {
      ok: false,
      error: "WHATSAPP_CLOUD_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID son obligatorios.",
    };
  }

  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${path.join("/")}`);
  const appSecretProof = createAppSecretProof(config.accessToken, config);
  if (appSecretProof) url.searchParams.set("appsecret_proof", appSecretProof);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    logger.warn("WhatsApp Cloud API call failed", { status: response.status, payload });
    return {
      ok: false,
      payload,
      error: payload?.error?.message || `WhatsApp Cloud API respondio ${response.status}`,
    };
  }

  return {
    ok: true,
    payload,
    providerMessageId: payload?.messages?.[0]?.id,
  };
}

export async function markWhatsAppMessageAsRead(messageId: string, phoneNumberId?: string) {
  if (!messageId) return null;
  const config = getWhatsAppCloudConfig();
  const senderPhoneNumberId = phoneNumberId || config.phoneNumberId;

  return postToWhatsAppGraph([senderPhoneNumberId, "messages"], {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: {
      type: "text",
    },
  });
}

export async function sendWhatsAppMessage(body: WhatsAppMessageBody, phoneNumberId?: string) {
  const config = getWhatsAppCloudConfig();
  return postToWhatsAppGraph([phoneNumberId || config.phoneNumberId, "messages"], body);
}

export async function sendWhatsAppText(to: string, text: string, phoneNumberId?: string) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  }, phoneNumberId);
}

export async function sendRecruitmentMenu(to: string, phoneNumberId?: string) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: WELCOME_MENU_TEXT,
      },
      action: {
        buttons: WHATSAPP_RECRUITMENT_BUTTONS.map((button) => ({
          type: "reply",
          reply: button,
        })),
      },
    },
  }, phoneNumberId);
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  locale?: string;
  components?: unknown[];
  phoneNumberId?: string;
}) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: {
        code: input.locale || "es_MX",
      },
      components: input.components,
    },
  }, input.phoneNumberId);
}
