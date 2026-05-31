const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });

const readJsonBody = async (request: Request) => {
  try {
    return await request.json();
  } catch (_error) {
    return {};
  }
};

const getPath = (context: any) => {
  const raw = context.params?.path;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return `/${parts.join("/")}`;
};

const openRouterReply = async (env: any, body: any) => {
  if (!env.OPENROUTER_API_KEY) {
    return json(
      {
        success: false,
        error: "OPENROUTER_API_KEY no esta configurada en Cloudflare Pages.",
        code: 501,
      },
      { status: 501 }
    );
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.APP_URL || "https://rhdreamsapp2026.pages.dev",
      "X-Title": "Heavenly Dreams RH App",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || "openrouter/auto",
      messages: [
        {
          role: "system",
          content:
            body?.systemPrompt ||
            body?.agentPrompt ||
            "Eres un agente de reclutamiento para Heavenly Dreams. Responde claro, util y en espanol.",
        },
        {
          role: "user",
          content: body?.userPrompt || body?.customUserPrompt || "Responde al usuario.",
        },
      ],
      temperature: 0.5,
      max_tokens: 700,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(
      {
        success: false,
        error: payload?.error?.message || "OpenRouter no pudo generar respuesta.",
        code: response.status,
      },
      { status: response.status }
    );
  }

  return json({
    success: true,
    data: {
      reply:
        payload?.choices?.[0]?.message?.content?.trim() ||
        "No pude procesar la respuesta.",
    },
  });
};

export const onRequest = async (context: any) => {
  const { request, env } = context;
  const path = getPath(context);

  if (request.method === "OPTIONS") {
    return json({ success: true });
  }

  if (request.method === "GET" && (path === "/health" || path === "/api/health")) {
    return json({
      success: true,
      data: {
        status: "ok",
        environment: "cloudflare-pages",
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (request.method === "POST" && path === "/gemini/agent/reply") {
    return openRouterReply(env, await readJsonBody(request));
  }

  if (request.method === "POST" && path === "/gemini/reply") {
    const body = await readJsonBody(request);
    const response = await openRouterReply(env, body);
    const payload = await response.clone().json().catch(() => ({}));
    if (!response.ok) return response;
    return json({
      success: true,
      data: {
        reply:
          payload?.data?.reply ||
          `Hola ${body?.candidate?.name || "Candidato"}. Gracias por tu interes. Para avanzar, confirmame tu zona, disponibilidad y experiencia relacionada.`,
      },
    });
  }

  if (request.method === "POST" && path === "/gemini/audio/transcribe") {
    return json(
      {
        success: false,
        error: "La transcripcion de audio requiere el servidor Node local o un servicio externo configurado.",
        code: 501,
      },
      { status: 501 }
    );
  }

  if (request.method === "POST" && path === "/integrations/canva/designs") {
    const body = await readJsonBody(request);
    const canvaUrl = body?.templateSearchUrl || "https://www.canva.com/templates";
    return json({
      success: true,
      data: {
        provider: "canva",
        ok: false,
        status: env.CANVA_ACCESS_TOKEN ? "not_implemented_in_cloudflare" : "needs_canva_token",
        message: env.CANVA_ACCESS_TOKEN
          ? "Canva esta configurado, pero esta funcion Cloudflare entrega fallback a Canva Templates."
          : "CANVA_ACCESS_TOKEN no esta configurado. No se creo ningun diseno.",
        templatePackId: body?.templatePackId || null,
        templateSearchUrl: canvaUrl,
        canvaUrl,
      },
    });
  }

  return json(
    {
      success: false,
      error: "API endpoint no encontrado",
      code: 404,
      path,
    },
    { status: 404 }
  );
};
