import { logger } from "../utils/logger";

type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChatInput = {
  messages: OpenRouterChatMessage[];
  model?: string;
  temperature?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterService {
  private apiKey = "";
  private defaultModel = "openrouter/auto";

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || "";
    this.defaultModel = defaultModel || this.defaultModel;

    if (this.apiKey) {
      logger.info("OpenRouter API initialized successfully", {
        model: this.defaultModel,
      });
    } else {
      logger.warn("No OpenRouter API key provided. OpenRouter requests will fail until configured.");
    }
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  getConfigurationStatus() {
    return {
      configured: this.isConfigured(),
      baseUrl: OPENROUTER_BASE_URL,
      defaultModel: this.defaultModel,
    };
  }

  async generateChatCompletion(input: OpenRouterChatInput) {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY no esta configurada.");
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Heavenly Dreams RH App",
      },
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        messages: input.messages,
        temperature: input.temperature ?? 0.8,
        presence_penalty: input.presencePenalty ?? 0.7,
        frequency_penalty: input.frequencyPenalty ?? 0.8,
        max_tokens: input.maxTokens ?? 700,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      logger.error("OpenRouter chat completion failed", {
        status: response.status,
        error: payload,
      });
      throw new Error(payload?.error?.message || "OpenRouter no pudo generar respuesta.");
    }

    const reply = payload?.choices?.[0]?.message?.content?.trim();

    return {
      provider: "openrouter",
      ok: true,
      model: payload?.model || input.model || this.defaultModel,
      reply: reply || "OpenRouter respondio sin contenido.",
      usage: payload?.usage || null,
    };
  }
}

let openRouterServiceInstance: OpenRouterService | null = null;

export function getOpenRouterService(): OpenRouterService {
  if (!openRouterServiceInstance) {
    openRouterServiceInstance = new OpenRouterService(
      process.env.OPENROUTER_API_KEY,
      process.env.OPENROUTER_MODEL
    );
  }

  return openRouterServiceInstance;
}

export function initializeOpenRouterService(apiKey?: string, defaultModel?: string): OpenRouterService {
  openRouterServiceInstance = new OpenRouterService(apiKey, defaultModel);
  return openRouterServiceInstance;
}
