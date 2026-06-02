import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger";
import { Candidate, ChatMessage } from "../types";
import {
  ADVANCED_RECRUITER_SYSTEM_PROMPT,
  MASTER_AGENT_SETTINGS,
} from "../config/recruiterAi.config";
import { getGroqService } from "./groq.service";
import { getOpenRouterService } from "./openrouter.service";

type GeminiTier = "free" | "paid";
type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };
type GeminiContent = { role: "user" | "model"; parts: Array<{ text: string }> };

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
  private textModel = "gemini-2.5-flash-preview-05-20";
  private audioModel = "gemini-2.5-flash";
  private ollamaUrl = (process.env.OLLAMA_URL || "").replace(/\/+$/, "");
  private ollamaModel = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL || "gemma4:e4b";

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

  private prefersOllama(): boolean {
    return Boolean(this.ollamaUrl) && (process.env.AI_PROVIDER || "ollama").toLowerCase() !== "gemini";
  }

  private stripVisibleThinking(text: string): string {
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^\/no_think\s*/i, "")
      .trim();
  }

  private async callOllama(messages: OllamaMessage[], temperature = 0.7): Promise<string> {
    if (!this.ollamaUrl) {
      throw new Error("Ollama no esta configurado. Agrega OLLAMA_URL.");
    }

    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.ollamaModel,
        stream: false,
        think: false,
        messages,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || "30m",
        options: {
          temperature,
          num_predict: Number(process.env.OLLAMA_NUM_PREDICT || 80),
          num_ctx: Number(process.env.OLLAMA_NUM_CTX || 1024),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data?.message?.content || data?.response || data?.message?.thinking || "";
    return this.stripVisibleThinking(content) || "Lo siento, no pude procesar la respuesta.";
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

  private async generateFallbackReply(
    systemPrompt: string,
    userPrompt: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    const historyMessages = conversationHistory
      .map((message) => ({
        role: message.sender === "me" ? "assistant" as const : "user" as const,
        content: message.body || message.text || "",
      }))
      .filter((message) => message.content.trim().length > 0);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...historyMessages,
      { role: "user" as const, content: userPrompt },
    ];

    try {
      const groq = getGroqService();
      if (groq.isConfigured()) {
        const result = await groq.generateChatCompletion({
          messages,
          temperature: 0.85,
          maxTokens: 420,
        });
        logger.warn("Gemini unavailable; generated reply with Groq fallback", {
          provider: result.provider,
          model: result.model,
        });
        return result.reply;
      }
    } catch (error) {
      logger.error("Groq fallback failed", error);
    }

    try {
      const openRouter = getOpenRouterService();
      if (openRouter.isConfigured()) {
        const result = await openRouter.generateChatCompletion({
          messages,
          temperature: 0.85,
          maxTokens: 420,
        });
        logger.warn("Gemini unavailable; generated reply with OpenRouter fallback", {
          provider: result.provider,
          model: result.model,
        });
        return result.reply;
      }
    } catch (error) {
      logger.error("OpenRouter fallback failed", error);
    }

    logger.warn("All external AI providers failed; using local recruiter fallback");
    return this.buildLocalRecruiterReply(systemPrompt, userPrompt);
  }

  private buildConversationContext(conversationHistory: ChatMessage[] = []) {
    const historyText = conversationHistory
      .slice(-14)
      .map((message) => {
        const sender = message.sender === "me" ? "Agente" : "Candidato";
        return `${sender}: ${message.body || message.text || ""}`;
      })
      .filter((line) => line.trim().length > 0)
      .join("\n");

    return historyText || "Sin historial previo.";
  }

  private buildOllamaHistory(conversationHistory: ChatMessage[] = []): OllamaMessage[] {
    return conversationHistory
      .slice(-20)
      .map((message) => ({
        role: message.sender === "me" ? ("assistant" as const) : ("user" as const),
        content: message.body || message.text || "",
      }))
      .filter((message) => message.content.trim().length > 0);
  }

  private buildGeminiContents(conversationHistory: ChatMessage[] = [], currentUserPrompt: string): GeminiContent[] {
    const historyContents = conversationHistory
      .slice(-20)
      .map((message) => {
        const text = message.body || message.text || "";
        if (!text.trim()) return null;
        return {
          role: message.sender === "me" ? ("model" as const) : ("user" as const),
          parts: [{ text }],
        };
      })
      .filter((message): message is GeminiContent => Boolean(message));

    return [
      ...historyContents,
      {
        role: "user",
        parts: [{ text: currentUserPrompt }],
      },
    ];
  }

  private buildLocalRecruiterReply(systemPrompt: string, userPrompt: string): string {
    const promptText = `${systemPrompt}\n${userPrompt}`.toLowerCase();
    const userText = userPrompt.toLowerCase();
    const ageMatch = userText.match(/\b(1[0-9]|[2-9][0-9])\b/);
    const age = ageMatch ? Number(ageMatch[1]) : null;
    const asksForRequirements = /requisito|document|dato|postular|aplicar/.test(userText);
    const asksForJob = /vacante|empleo|trabajo|puesto|ayudante|asesor|supervisor/.test(userText);
    const asksForLocation = /ubicacion|direcci[oó]n|donde|zona|ciudad/.test(userText);
    const startsConversation = /\b(hola|buenas|info|inf|informaci[oó]n|quiero trabajar|busco trabajo)\b/.test(userText);
    const asksToReschedule = /reagendar|cambiar.*cita|cambiar.*entrevista|no puedo asistir|otro horario/.test(userText);
    const asksForInterview = /entrevista|cita|agendar|horario/.test(userText);

    if (age !== null && age < 16) {
      return "Gracias por tu interes en Heavenly Dreams.\n\nPor edad no podemos continuar tu proceso por ahora.";
    }

    if (age === 16 || age === 17) {
      return "Podemos revisar tu proceso con permiso de tutor.\n\n¿Cuentas con esa documentacion para avanzar?";
    }

    if (asksToReschedule) {
      return "Claro, te ayudo a reagendar.\n\n¿Que dia y horario te funciona mejor?";
    }

    if (asksForInterview) {
      return "Perfecto, podemos revisar entrevista.\n\n¿Me compartes tu nombre completo?";
    }

    if (startsConversation) {
      return "Hola, buenos dias.\n\nSoy reclutador de Heavenly Dreams.\n\n¿En que puedo servirte hoy?";
    }

    if (asksForLocation) {
      return "Claro, te ayudo con la ubicacion.\n\n¿En que ciudad o zona estas?";
    }

    if (asksForRequirements || asksForJob) {
      return "Tenemos varias vacantes disponibles.\n\n¿Para que area buscas empleo?";
    }

    return "Con gusto te ayudo.\n\n¿Me compartes tu nombre completo?";
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
      ollamaConfigured: Boolean(this.ollamaUrl),
      ollamaPreferred: this.prefersOllama(),
      ollamaModel: this.ollamaModel,
      ollamaUrl: this.ollamaUrl || null,
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

      const historyText = this.buildConversationContext(history || []);

      // Build user message
      const userMsg =
        customUserPrompt ||
        "Saluda cordialmente al candidato para iniciar la conversación.";
      const currentUserPrompt = `
Mensaje o instruccion actual:
${userMsg}

Genera una respuesta autonoma, nueva y natural. No reutilices plantillas, no copies mensajes anteriores y evita empezar siempre igual.
Variacion interna: ${Date.now()}-${Math.random().toString(16).slice(2)}
      `.trim();
      const contextualUserMsg = `
Historial reciente:
${historyText}

Mensaje o instruccion actual:
${userMsg}

Genera una respuesta autonoma, nueva y natural. No reutilices plantillas, no copies mensajes anteriores y evita empezar siempre igual.
Variacion interna: ${Date.now()}-${Math.random().toString(16).slice(2)}
      `.trim();

      if (this.prefersOllama()) {
        const replyText = await this.callOllama(
          [
            { role: "system", content: systemInstruction },
            ...this.buildOllamaHistory(history || []),
            { role: "user", content: `/no_think ${currentUserPrompt}` },
          ],
          0.95
        );
        logger.info("Ollama response generated successfully", {
          candidate: candidate?.name,
          model: this.ollamaModel,
        });

        return { reply: replyText };
      }

      let replyText = "";
      try {
        const ai = this.getClient();

        const response = await ai.models.generateContent({
          model: this.textModel,
          contents: this.buildGeminiContents(history || [], currentUserPrompt),
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.95,
          },
        });

        replyText = response.text || "";
      } catch (error) {
        logger.error("Gemini candidate response failed; trying fallback provider", error);
        replyText = await this.generateFallbackReply(systemInstruction, contextualUserMsg, history || []);
      }

      replyText = replyText || "Lo siento, no pude procesar la respuesta.";
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
      if (this.prefersOllama()) {
        const replyText = await this.callOllama(
          [
            { role: "system", content: this.withAdvancedRecruiterLayer(systemPrompt) },
            ...this.buildOllamaHistory(conversationHistory || []),
            {
              role: "user",
              content: `/no_think Agente: ${agentName}\nUsuario: ${userPrompt}\n\nResponde con un mensaje autonomo, distinto, humano y breve. No uses plantillas ni respuestas preestablecidas. Variacion: ${Date.now()}-${Math.random().toString(16).slice(2)}`,
            },
          ],
          0.95
        );
        logger.info("Ollama agent response generated", {
          agentName,
          model: this.ollamaModel,
        });

        return { reply: replyText };
      }

      const systemInstruction = this.withAdvancedRecruiterLayer(systemPrompt);
      const currentUserPrompt = `
Mensaje o instruccion actual:
${userPrompt}

Genera una respuesta autonoma, nueva y natural para este contacto. No reutilices plantillas, no copies respuestas anteriores y no empieces siempre con el mismo saludo.
Variacion interna: ${Date.now()}-${Math.random().toString(16).slice(2)}
      `.trim();
      const contextualUserPrompt = `
Historial reciente:
${this.buildConversationContext(conversationHistory || [])}

Mensaje o instruccion actual:
${userPrompt}

Genera una respuesta autonoma, nueva y natural para este contacto. No reutilices plantillas, no copies respuestas anteriores y no empieces siempre con el mismo saludo.
Variacion interna: ${Date.now()}-${Math.random().toString(16).slice(2)}
      `.trim();
      let replyText = "";
      try {
        const ai = this.getClient("paid");

        const response = await ai.models.generateContent({
          model: this.textModel,
          contents: this.buildGeminiContents(conversationHistory || [], currentUserPrompt),
          config: {
            systemInstruction,
            temperature: 0.95,
          },
        });

        replyText = response.text || "";
      } catch (error) {
        logger.error("Gemini agent response failed; trying fallback provider", error);
        replyText = await this.generateFallbackReply(systemInstruction, contextualUserPrompt, conversationHistory || []);
      }

      replyText = replyText || "Lo siento, no pude procesar la respuesta.";
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

Modo autonomo creativo:
- Redacta cada mensaje desde cero con base en el historial y la intencion del candidato.
- No uses plantillas, guiones fijos, textos preestablecidos ni respuestas copiadas.
- Varia saludos, longitud, orden de preguntas y cierre para que cada conversacion se sienta humana.
- Mantente breve en WhatsApp: una idea principal y maximo una pregunta clara por mensaje.
- Si falta informacion, pregunta solo el siguiente dato necesario.
- No inventes sueldo, horario, direccion, promesas de contratacion ni requisitos no confirmados.
- Si el mensaje requiere decision humana, escala sin fingir autorizacion.

Panel maestro de configuracion actual:
${JSON.stringify(MASTER_AGENT_SETTINGS, null, 2)}
    `;
  }

  /**
   * Check whether the Gemini client is ready for live requests.
   */
  isConfigured(): boolean {
    return Boolean(this.ollamaUrl || this.clients.free || this.clients.paid);
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

