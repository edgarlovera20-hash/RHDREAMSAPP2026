import { MessageStatus } from "../../types";

export type WhatsAppWebhookEvent = {
  id: string;
  source: string;
  channel: "whatsapp";
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  createdAt: number;
  raw?: unknown;
};

export type WhatsAppIncomingMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  image?: { caption?: string };
  document?: { caption?: string; filename?: string };
};

export type WhatsAppStatusUpdate = {
  id: string;
  recipient_id?: string;
  status?: "sent" | "delivered" | "read" | "failed" | string;
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

export type WhatsAppContact = {
  wa_id?: string;
  profile?: { name?: string };
};

export type WhatsAppMessageBody =
  | {
      messaging_product: "whatsapp";
      recipient_type?: "individual";
      to: string;
      type: "text";
      text: { preview_url?: boolean; body: string };
    }
  | {
      messaging_product: "whatsapp";
      to: string;
      type: "interactive";
      interactive: {
        type: "button";
        body: { text: string };
        action: {
          buttons: Array<{
            type: "reply";
            reply: { id: string; title: string };
          }>;
        };
      };
    }
  | {
      messaging_product: "whatsapp";
      recipient_type?: "individual";
      to: string;
      type: "template";
      template: {
        name: string;
        language: { code: string };
        components?: unknown[];
      };
    };

export type WhatsAppSendResult = {
  ok: boolean;
  providerMessageId?: string;
  payload?: any;
  error?: string;
};

export type WhatsAppReplyPlan = {
  body: string;
  interactiveMenu?: boolean;
  aiGenerated?: boolean;
  intent?: string;
  stage?: string;
};

export function mapWhatsAppStatus(status?: string): MessageStatus {
  if (status === "read") return "read";
  if (status === "delivered") return "delivered";
  if (status === "sent") return "sent";
  if (status === "failed") return "failed";
  return "sent";
}
