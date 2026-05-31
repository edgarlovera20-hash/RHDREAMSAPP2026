import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const groqFallbackModels = [
  process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
].filter((model, index, models) => model && models.indexOf(model) === index);

const canTryNextGroqModel = (message: string) =>
  message.includes("blocked at the organization level") ||
  message.includes("decommissioned") ||
  message.includes("no longer supported") ||
  message.includes("model_not_found");

app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      environment: process.env.NODE_ENV || "production",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get(["/api/groq/health", "/groq/health"], (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      groq: {
        configured: Boolean(process.env.GROQ_API_KEY),
        baseUrl: "https://api.groq.com/openai/v1",
        defaultModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      },
    },
  });
});

app.get(
  [
    "/api/integrations/baileys/status",
    "/api/integrations/baileys/status/:sessionId",
    "/integrations/baileys/status",
    "/integrations/baileys/status/:sessionId",
  ],
  (req, res) => {
    res.status(501).json({
      success: false,
      error:
        "Baileys requiere un servidor local o VPS con sesion persistente. Vercel serverless no puede mantener WhatsApp Web conectado.",
      code: 501,
      data: {
        id: req.params.sessionId || "default",
        state: "error",
        qrDataUrl: null,
        lastError:
          "Usa Baileys en localhost o en un servidor persistente; en Vercel solo estan disponibles APIs serverless.",
      },
    });
  }
);

app.post(
  [
    "/api/integrations/baileys/start",
    "/integrations/baileys/start",
    "/api/integrations/baileys/send",
    "/integrations/baileys/send",
    "/api/integrations/baileys/logout",
    "/integrations/baileys/logout",
  ],
  (req, res) => {
    res.status(501).json({
      success: false,
      error:
        "Baileys no esta disponible en Vercel serverless. Para conectar WhatsApp normal abre la app en localhost o mueve Baileys a un VPS/servicio persistente.",
      code: 501,
      data: {
        id: req.body?.sessionId || "default",
        state: "error",
        qrDataUrl: null,
        lastError:
          "Vercel apaga las funciones despues de cada request; Baileys necesita mantener socket y archivos de sesion.",
      },
    });
  }
);

app.post(["/api/groq/chat", "/groq/chat"], async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY no esta configurada.");
    }

    const userPrompt = req.body?.userPrompt || req.body?.prompt;
    if (!userPrompt) {
      return res.status(400).json({
        success: false,
        error: "El prompt del usuario es requerido",
        code: 400,
      });
    }

    const requestedModels = req.body?.model
      ? [req.body.model, ...groqFallbackModels.filter((model) => model !== req.body.model)]
      : groqFallbackModels;
    const errors: string[] = [];

    for (const model of requestedModels) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                req.body?.systemPrompt ||
                "Eres un asistente de reclutamiento para Heavenly Dreams. Responde claro, util y en espanol.",
            },
            { role: "user", content: userPrompt },
          ],
          temperature: req.body?.temperature ?? 0.4,
          max_completion_tokens: req.body?.maxTokens ?? 700,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.error?.message || "Groq no pudo generar respuesta.";
        errors.push(`${model}: ${message}`);
        if (canTryNextGroqModel(message)) continue;
        throw new Error(message);
      }

      return res.json({
        success: true,
        data: {
          provider: "groq",
          ok: true,
          model: payload?.model || model,
          reply: payload?.choices?.[0]?.message?.content?.trim() || "Groq respondio sin contenido.",
          usage: payload?.usage || null,
        },
      });
    }

    throw new Error(`Groq no tiene modelos disponibles. ${errors.join(" | ")}`);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error procesando Groq",
      code: 500,
    });
  }
});

app.get(["/api/openrouter/health", "/openrouter/health"], (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      openrouter: {
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        baseUrl: "https://openrouter.ai/api/v1",
        defaultModel: process.env.OPENROUTER_MODEL || "openrouter/auto",
      },
    },
  });
});

app.post(["/api/openrouter/chat", "/openrouter/chat"], async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY no esta configurada.");
    }

    const userPrompt = req.body?.userPrompt || req.body?.prompt;
    if (!userPrompt) {
      return res.status(400).json({
        success: false,
        error: "El prompt del usuario es requerido",
        code: 400,
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://rhdreamsapp2026.vercel.app",
        "X-Title": "Heavenly Dreams RH App",
      },
      body: JSON.stringify({
        model: req.body?.model || process.env.OPENROUTER_MODEL || "openrouter/auto",
        messages: [
          {
            role: "system",
            content:
              req.body?.systemPrompt ||
              "Eres un asistente de reclutamiento para Heavenly Dreams. Responde claro, util y en espanol.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: req.body?.temperature ?? 0.4,
        max_tokens: req.body?.maxTokens ?? 700,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error?.message || "OpenRouter no pudo generar respuesta.");
    }

    res.json({
      success: true,
      data: {
        provider: "openrouter",
        ok: true,
        model: payload?.model || req.body?.model || process.env.OPENROUTER_MODEL || "openrouter/auto",
        reply:
          payload?.choices?.[0]?.message?.content?.trim() ||
          "OpenRouter respondio sin contenido.",
        usage: payload?.usage || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error procesando OpenRouter",
      code: 500,
    });
  }
});

app.get(["/api/gemini/health", "/gemini/health"], (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(
        process.env.GEMINI_FREE_API_KEY ||
          process.env.GEMINI_PAID_API_KEY ||
          process.env.GEMINI_API_KEY
      ),
      gemini: {
        configured: Boolean(
          process.env.GEMINI_FREE_API_KEY ||
            process.env.GEMINI_PAID_API_KEY ||
            process.env.GEMINI_API_KEY
        ),
        activeTier: process.env.GEMINI_DEFAULT_TIER || "free",
        hasFreeKey: Boolean(process.env.GEMINI_FREE_API_KEY),
        hasPaidKey: Boolean(process.env.GEMINI_PAID_API_KEY),
        textModel: process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash",
        audioModel: process.env.GEMINI_AUDIO_MODEL || "gemini-2.5-flash",
      },
    },
  });
});

app.post(["/api/gemini/agent/reply", "/gemini/agent/reply"], async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(501).json({
        success: false,
        error:
          "Gemini no esta configurado en Vercel y no hay OPENROUTER_API_KEY para fallback.",
        code: 501,
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://rhdreamsapp2026.vercel.app",
        "X-Title": "Heavenly Dreams RH App",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        messages: [
          {
            role: "system",
            content:
              req.body?.systemPrompt ||
              "Eres un agente de reclutamiento para Heavenly Dreams.",
          },
          { role: "user", content: req.body?.userPrompt || "Responde al usuario." },
        ],
        temperature: 0.5,
        max_tokens: 700,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error?.message || "No se pudo generar respuesta.");
    }

    res.json({
      success: true,
      data: {
        reply:
          payload?.choices?.[0]?.message?.content?.trim() ||
          "No pude procesar la respuesta.",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error procesando agente",
      code: 500,
    });
  }
});

app.post(["/api/integrations/canva/designs", "/integrations/canva/designs"], (req, res) => {
  const canvaUrl = req.body?.templateSearchUrl || "https://www.canva.com/templates";

  if (!process.env.CANVA_ACCESS_TOKEN) {
    return res.json({
      success: true,
      data: {
        provider: "canva",
        ok: false,
        status: "needs_canva_token",
        message: "CANVA_ACCESS_TOKEN no esta configurado. No se creo ningun diseno.",
        templatePackId: req.body?.templatePackId || null,
        templateSearchUrl: canvaUrl,
        canvaUrl,
      },
    });
  }

  res.json({
    success: true,
    data: {
      provider: "canva",
      ok: false,
      status: "not_implemented_in_serverless",
      message: "Canva esta configurado, pero esta funcion serverless solo entrega fallback a Canva Templates.",
      canvaUrl,
    },
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint no encontrado",
    code: 404,
  });
});

export default app;
