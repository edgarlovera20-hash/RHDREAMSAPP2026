import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

type WorkflowRunStatus = {
  runId: string;
  workflowId: string;
  status: "started" | "blocked";
  createdAt: string;
  missingVariables?: string[];
};

const workflowRuns = new Map<string, WorkflowRunStatus>();

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

const integrationCatalog = {
  indeed: {
    id: "indeed",
    name: "Indeed",
    mode: "partner_api",
    requiredConfig: [
      "INDEED_CLIENT_ID",
      "INDEED_CLIENT_SECRET",
      "INDEED_EMPLOYER_ID",
      "INDEED_WEBHOOK_SECRET",
    ],
    capabilities: [
      "Publicar y sincronizar vacantes",
      "Recibir candidatos desde Indeed Apply",
      "Sincronizar estados del proceso",
    ],
    notes: "Requiere acceso de partner/provisionamiento en Indeed Partner Console.",
  },
  computrabajo: {
    id: "computrabajo",
    name: "Computrabajo",
    mode: "managed_import",
    requiredConfig: [
      "COMPUTRABAJO_COUNTRY_PORTAL",
      "COMPUTRABAJO_COMPANY_ACCOUNT",
      "COMPUTRABAJO_IMPORT_SECRET",
    ],
    capabilities: [
      "Registrar fuente de candidatos Computrabajo",
      "Importar candidatos por CSV, email parser o webhook intermedio",
      "Mapear vacante, etapa y documentos",
    ],
    notes: "Usa feed autorizado, CSV, email parser o proveedor empresarial.",
  },
  whatsapp_personal: {
    id: "whatsapp_personal",
    name: "WhatsApp Normal",
    mode: "baileys_local_socket",
    requiredConfig: [],
    capabilities: [
      "Generar QR real con Baileys en servidor persistente",
      "Mantener sesion local multi-file auth",
      "Enviar y recibir mensajes desde el dispositivo vinculado",
    ],
    notes:
      "En Vercel serverless no se puede mantener WhatsApp Web conectado; usa localhost o VPS para QR real.",
  },
} as const;

const testIntegrationConfig = (provider: string, config: Record<string, string> = {}) => {
  const connector = integrationCatalog[provider as keyof typeof integrationCatalog];
  if (!connector) {
    return {
      ok: false,
      provider,
      message: "Integracion desconocida",
      missing: [],
    };
  }

  if (provider === "whatsapp_personal") {
    return {
      ok: false,
      provider: connector.id,
      name: connector.name,
      mode: connector.mode,
      missing: [],
      message:
        "Endpoint disponible. WhatsApp Normal necesita localhost o un VPS persistente para generar QR real; Vercel no mantiene la sesion Baileys activa.",
      capabilities: connector.capabilities,
      notes: connector.notes,
      deployment: "vercel_serverless",
    };
  }

  const missing = connector.requiredConfig.filter((key) => !config[key] && !process.env[key]);
  return {
    ok: missing.length === 0,
    provider: connector.id,
    name: connector.name,
    mode: connector.mode,
    missing,
    message:
      missing.length === 0
        ? "Configuracion minima presente. Lista para prueba real."
        : `Faltan credenciales o parametros: ${missing.join(", ")}.`,
    capabilities: connector.capabilities,
    notes: connector.notes,
  };
};

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

app.get(["/api/integrations/catalog", "/integrations/catalog"], (_req, res) => {
  res.json({
    success: true,
    data: integrationCatalog,
  });
});

app.post(["/api/integrations/test", "/integrations/test"], (req, res) => {
  const provider = req.body?.provider;
  if (!provider) {
    return res.status(400).json({
      success: false,
      error: "provider es requerido",
      code: 400,
    });
  }

  res.json({
    success: true,
    data: testIntegrationConfig(provider, req.body?.config || {}),
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

app.post(["/api/workflows/start", "/workflows/start"], async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.workflowId || !Array.isArray(payload?.steps)) {
      return res.status(400).json({
        success: false,
        error: "workflowId y steps son requeridos para iniciar la automatizacion.",
        code: 400,
      });
    }

    const missingVariables = Object.entries(payload.variables || {})
      .filter(([, value]: [string, any]) => value?.required && !String(value?.value || "").trim())
      .map(([key]) => key);

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status: WorkflowRunStatus = {
      runId,
      workflowId: payload.workflowId,
      status: missingVariables.length ? "blocked" : "started",
      createdAt: new Date().toISOString(),
      missingVariables: missingVariables.length ? missingVariables : undefined,
    };
    workflowRuns.set(runId, status);

    res.json({
      success: true,
      data: {
        runId,
        workflowId: payload.workflowId,
        status: status.status,
        missingVariables: status.missingVariables || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "No se pudo iniciar el workflow.",
      code: 500,
    });
  }
});

app.get(["/api/workflows/status/:runId", "/workflows/status/:runId"], async (req, res) => {
  try {
    const run = workflowRuns.get(req.params.runId);
    res.json({
      success: true,
      data: {
        runId: req.params.runId,
        status: run?.status || "unknown",
        workflowId: run?.workflowId || null,
        createdAt: run?.createdAt || null,
        missingVariables: run?.missingVariables || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "No se pudo consultar el workflow.",
      code: 500,
    });
  }
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
