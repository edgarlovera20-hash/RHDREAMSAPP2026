import { getGeminiService } from "../../services/gemini.service";
import {
  prepareRecruitmentConversationTurn,
  recordRecruitmentAssistantReply,
} from "../../services/conversationSession.service";
import { logger } from "../../utils/logger";
import { getWhatsAppCloudConfig } from "./config";
import {
  normalizeRecruitmentOption,
  recruitmentOptionReply,
  WELCOME_MENU_TEXT,
} from "./templates";
import { WhatsAppIncomingMessage, WhatsAppReplyPlan } from "./types";

export function readWhatsAppMessageText(message: WhatsAppIncomingMessage) {
  return (
    message.text?.body ||
    message.button?.payload ||
    message.button?.text ||
    message.interactive?.button_reply?.id ||
    message.interactive?.button_reply?.title ||
    message.interactive?.list_reply?.id ||
    message.interactive?.list_reply?.title ||
    message.image?.caption ||
    message.document?.caption ||
    ""
  ).trim();
}

export function shouldShowRecruitmentMenu(message: WhatsAppIncomingMessage, text: string) {
  const option = normalizeRecruitmentOption(text);
  return option === "menu" || (message.type === "text" && /^(hola|inicio|menu)$/i.test(text.trim()));
}

export async function createRecruitmentReplyPlan(input: {
  phoneNumberId: string;
  from: string;
  body: string;
  message: WhatsAppIncomingMessage;
}): Promise<WhatsAppReplyPlan | null> {
  const option = normalizeRecruitmentOption(input.body);
  const deterministicReply = recruitmentOptionReply(option);

  if (deterministicReply) {
    return {
      body: deterministicReply,
      interactiveMenu: option === "menu",
      aiGenerated: false,
      intent: option || "menu",
    };
  }

  if (shouldShowRecruitmentMenu(input.message, input.body)) {
    return {
      body: WELCOME_MENU_TEXT,
      interactiveMenu: true,
      aiGenerated: false,
      intent: "menu",
    };
  }

  const config = getWhatsAppCloudConfig();
  const sessionId = `whatsapp-meta-${input.phoneNumberId || config.phoneNumberId || "cloud"}`;
  const turn = await prepareRecruitmentConversationTurn({
    sessionId,
    contactId: input.from,
    inboundBody: input.body,
    agentName: config.agentName,
    companyName: config.companyName,
  });

  try {
    const result = await getGeminiService().generateAgentResponse(
      config.agentName,
      `
Eres ${config.agentName}, agente de reclutamiento de ${config.companyName}.
Respondes por WhatsApp Business Cloud API.

${turn.systemContext}

Reglas:
- Usa tono humano, claro y breve.
- Pide un solo dato por turno.
- Si el candidato escribe "menu", muestra opciones.
- No inventes vacantes, sueldos ni horarios fuera del contexto.
- No mezcles WhatsApp Meta Cloud API con sesiones Baileys.
      `.trim(),
      turn.history,
      turn.userPrompt
    );

    const reply = result.reply?.trim();
    if (!reply) return null;

    await recordRecruitmentAssistantReply({
      sessionId,
      contactId: input.from,
      reply,
      responseType: turn.conversation.stage,
    });

    return {
      body: reply,
      aiGenerated: true,
      intent: turn.intent,
      stage: turn.conversation.stage,
    };
  } catch (error) {
    logger.warn("WhatsApp recruitment AI reply fell back to menu", {
      error: error instanceof Error ? error.message : error,
    });
    return {
      body: WELCOME_MENU_TEXT,
      interactiveMenu: true,
      aiGenerated: false,
      intent: "fallback_menu",
      stage: turn.conversation.stage,
    };
  }
}
