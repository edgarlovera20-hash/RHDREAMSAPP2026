import { logger } from "../utils/logger";

type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqChatInput = {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
};

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export class GroqService {
  private apiKey = "";
  private defaultModel = "llama-3.1-8b-instant";
  private fallbackModels = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
  ];

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || "";
    this.defaultModel = defaultModel || this.defaultModel;
    this.fallbackModels = [
      this.defaultModel,
      ...this.fallbackModels.filter((model) => model !== this.defaultModel),
    ];

    if (this.apiKey) {
      logger.info("Groq API initialized successfully", {
        model: this.defaultModel,
      });
    } else {
      logger.warn("No Groq API key provided. Groq requests will fail until configured.");
    }
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  getConfigurationStatus() {
    return {
      configured: this.isConfigured(),
      baseUrl: GROQ_BASE_URL,
      defaultModel: this.defaultModel,
    };
  }

  async generateChatCompletion(input: GroqChatInput) {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY no esta configurada.");
    }

    const requestedModels = input.model
      ? [input.model, ...this.fallbackModels.filter((model) => model !== input.model)]
      : this.fallbackModels;
    const errors: string[] = [];

    for (const model of requestedModels) {
      try {
        return await this.requestChatCompletion(input, model);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        errors.push(`${model}: ${message}`);
        const canTryNextModel =
          message.includes("blocked at the organization level") ||
          message.includes("decommissioned") ||
          message.includes("no longer supported") ||
          message.includes("model_not_found");

        if (!canTryNextModel) {
          throw error;
        }
      }
    }

    throw new Error(`Groq no tiene modelos disponibles para esta organizacion. ${errors.join(" | ")}`);
  }

  private async requestChatCompletion(input: GroqChatInput, model: string) {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.8,
        presence_penalty: input.presencePenalty ?? 0.7,
        frequency_penalty: input.frequencyPenalty ?? 0.8,
        max_completion_tokens: input.maxTokens ?? 700,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      logger.error("Groq chat completion failed", {
        status: response.status,
        error: payload,
      });
      throw new Error(payload?.error?.message || "Groq no pudo generar respuesta.");
    }

    const reply = payload?.choices?.[0]?.message?.content?.trim();

    return {
      provider: "groq",
      ok: true,
      model: payload?.model || model,
      reply: reply || "Groq respondio sin contenido.",
      usage: payload?.usage || null,
    };
  }
}

let groqServiceInstance: GroqService | null = null;

export function getGroqService(): GroqService {
  if (!groqServiceInstance) {
    groqServiceInstance = new GroqService(
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL
    );
  }

  return groqServiceInstance;
}

export function initializeGroqService(apiKey?: string, defaultModel?: string): GroqService {
  groqServiceInstance = new GroqService(apiKey, defaultModel);
  return groqServiceInstance;
}
