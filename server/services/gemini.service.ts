import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger";
import { Candidate, ChatMessage } from "../types";
import {
  ADVANCED_RECRUITER_SYSTEM_PROMPT,
  MASTER_AGENT_SETTINGS,
} from "../config/recruiterAi.config";

type GeminiTier = "free" | "paid";

type GeminiServiceConfig = {
  freeApiKey?: string;
  paidApiKey?: string;
  legacyApiKey?: string;
  defaultTier?: string;
  textModel?: string;
  audioModel?: string;
};

export class GeminiService {
  private clients: Record<GeminiTier, GoogleGenAI | null> = {
    free: null,
    paid: null,
  };
  private activeTier: GeminiTier = "free";
  private textModel = "gemini-3.5-flash";
  private audioModel = "gemini-2.5-flash";

  constructor(config?: GeminiServiceConfig | string) {
    const normalizedConfig =
      typeof config === "string" ? { legacyApiKey: config } : config || {};

    this.activeTier = this.normalizeTier(normalizedConfig.defaultTier);
    this.textModel = normalizedConfig.textModel || this.textModel;
    this.audioModel = normalizedConfig.audioModel || this.audioModel;

    this.clients.free = this.createClient(
      normalizedConfig.freeApiKey || normalizedConfig.legacyApiKey,
      "free"
    );
    this.clients.paid = this.createClient(
      normalizedConfig.paidApiKey || normalizedConfig.legacyApiKey,
      "paid"
    );

    if (!this.clients.free && !this.clients.paid) {
      logger.warn("No Gemini API key provided. Gemini requests will fail until configured.");
    }
  }

  private createClient(apiKey: string | undefined, tier: GeminiTier) {
    if (!apiKey) return null;

    try {
      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "heavenly-dreams-api",
          },
        },
      });
      logger.info("Gemini API initialized successfully", { tier });
      return client;
    } catch (error) {
      logger.error("Failed to initialize Gemini API", { tier, error });
      return null;
    }
  }

  private normalizeTier(tier: string | undefined): GeminiTier {
    return tier === "paid" ? "paid" : "free";
  }

  private getClient(preferredTier?: GeminiTier) {
    const tier = preferredTier || this.activeTier;
    const fallbackTier: GeminiTier = tier === "paid" ? "free" : "paid";
    const client = this.clients[tier] || this.clients[fallbackTier];

    if (!client) {
      throw new Error("Gemini no está configurado. Agrega GEMINI_FREE_API_KEY o GEMINI_PAID_API_KEY.");
    }

    return client;
  }

  updateConfig(config: GeminiServiceConfig) {
    this.activeTier = this.normalizeTier(config.defaultTier || this.activeTier);
    this.textModel = config.textModel || this.textModel;
    this.audioModel = config.audioModel || this.audioModel;

    if (config.freeApiKey) {
      this.clients.free = this.createClient(config.freeApiKey, "free");
    }

    if (config.paidApiKey || config.legacyApiKey) {
      this.clients.paid = this.createClient(config.paidApiKey || config.legacyApiKey, "paid");
    }
  }

  getConfigurationStatus() {
    return {
      configured: this.isConfigured(),
      activeTier: this.activeTier,
      hasFreeKey: Boolean(this.clients.free),
      hasPaidKey: Boolean(this.clients.paid),
      textModel: this.textModel,
      audioModel: this.audioModel,
    };
  }

  /*
  constructor(apiKey?: string) {
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "heavenly-dreams-api",
            },
          },
        });
        logger.info("Gemini API initialized successfully");
      } catch (error) {
        logger.error("Failed to initialize Gemini API", error);
      }
    } else {
      logger.warn("No Gemini API key provided. Gemini requests will fail until configured.");
    }
  }
  */

  /**
   * Generate a recruitment response for a candidate
   */
  async generateCandidateResponse(
    candidate: Candidate | undefined,
    agentPrompt: string | undefined,
    history: ChatMessage[] | undefined,
    customUserPrompt: string | undefined
  ): Promise<{ reply: string }> {
    try {
      // Build system instruction
      const systemInstruction = this.withAdvancedRecruiterLayer(
        this.buildCandidateSystemPrompt(candidate, agentPrompt)
      );

      // Build user message
      const userMsg =
        customUserPrompt ||
        "Saluda cordialmente al candidato para iniciar la conversación.";

      const ai = this.getClient();

      const response = await ai.models.generateContent({
        model: this.textModel,
        contents: userMsg,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText =
        response.text || "Lo siento, no pude procesar la respuesta.";
      logger.info("Gemini response generated successfully", {
        candidate: candidate?.name,
      });

      return { reply: replyText };
    } catch (error) {
      logger.error("Error generating candidate response", error);
      throw error;
    }
  }

  /**
   * Generate an agent response
   */
  async generateAgentResponse(
    agentName: string,
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    userPrompt: string
  ): Promise<{ reply: string }> {
    try {
      const ai = this.getClient("paid");

      const response = await ai.models.generateContent({
        model: this.textModel,
        contents: userPrompt,
        config: {
          systemInstruction: this.withAdvancedRecruiterLayer(systemPrompt),
          temperature: 0.7,
        },
      });

      const replyText =
        response.text || "Lo siento, no pude procesar la respuesta.";
      logger.info("Agent response generated", { agentName });

      return { reply: replyText };
    } catch (error) {
      logger.error("Error generating agent response", error);
      throw error;
    }
  }

  /**
   * Transcribe an inbound candidate audio note.
   */
  async transcribeAudio(
    audioBase64: string,
    mimeType: string,
    language?: string,
    context?: string
  ): Promise<{ transcription: string }> {
    try {
      const ai = this.getClient("paid");

      const response = await ai.models.generateContent({
        model: this.audioModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Transcribe este audio de un candidato de reclutamiento.
Devuelve solo el texto transcrito, sin resumen ni comentarios.
Idioma esperado: ${language || "detectar automáticamente"}.
Contexto: ${context || "Sin contexto adicional"}.`,
              },
              {
                inlineData: {
                  data: audioBase64,
                  mimeType,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
        },
      });

      const transcription = response.text?.trim();
      if (!transcription) {
        throw new Error("La transcripción llegó vacía.");
      }

      return { transcription };
    } catch (error) {
      logger.error("Error transcribing audio", error);
      throw error;
    }
  }

  /**
   * Build system prompt for candidate responses
   */
  private buildCandidateSystemPrompt(
    candidate: Candidate | undefined,
    agentPrompt: string | undefined
  ): string {
    return `
Eres un asistente de reclutamiento altamente calificado de Heavenly Dreams.
Tus reglas e instrucciones de comportamiento principales son:
${agentPrompt || "Hablar de forma muy profesional y empática."}

Información sobre el candidato a atender:
- Nombre: ${candidate?.name || "No especificado"}
- Puesto de interés: ${candidate?.role || "No especificado"}
- Ubicación: ${candidate?.location || "No especificado"}
- Experiencia: ${candidate?.experience || "No especificado"}
- Pretensión salarial: ${candidate?.salaryDemand || "No especificada"}
- Notas/Historial rápido: ${candidate?.notes || "Sin notas anteriores"}
    `;
  }

  private withAdvancedRecruiterLayer(basePrompt: string): string {
    return `
${basePrompt}

${ADVANCED_RECRUITER_SYSTEM_PROMPT}

Panel maestro de configuracion actual:
${JSON.stringify(MASTER_AGENT_SETTINGS, null, 2)}
    `;
  }

  /**
   * Check whether the Gemini client is ready for live requests.
   */
  isConfigured(): boolean {
    return Boolean(this.clients.free || this.clients.paid);
  }
}

// Export singleton instance
let geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService({
      freeApiKey: process.env.GEMINI_FREE_API_KEY,
      paidApiKey: process.env.GEMINI_PAID_API_KEY,
      legacyApiKey: process.env.GEMINI_API_KEY,
      defaultTier: process.env.GEMINI_DEFAULT_TIER,
      textModel: process.env.GEMINI_TEXT_MODEL,
      audioModel: process.env.GEMINI_AUDIO_MODEL,
    });
  }
  return geminiServiceInstance;
}

export function initializeGeminiService(config?: GeminiServiceConfig | string): GeminiService {
  geminiServiceInstance = new GeminiService(config);
  return geminiServiceInstance;
}

