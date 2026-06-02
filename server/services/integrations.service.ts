import {
  INTEGRATION_CATALOG,
  IntegrationProvider,
} from "../config/integrations.config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

type IntegrationTestInput = {
  provider: IntegrationProvider;
  config?: Record<string, string>;
};

type FacebookAdsAnalyzeInput = {
  datePreset: string;
  dailyBudget: number;
  targetLeads: number;
  targetHires: number;
  leadToInterviewRate: number;
  interviewToHireRate: number;
  config?: Record<string, string>;
};

type CanvaDesignInput = {
  title?: string;
  format?: string;
  brief?: string;
  brandTemplateId?: string;
  templatePackId?: string;
  templateSearchUrl?: string;
  autofillData?: Record<string, unknown>;
  config?: Record<string, string>;
};

type GeminiImageInput = {
  prompt?: string;
  brief?: string;
  format?: string;
  aspectRatio?: string;
  config?: Record<string, string>;
};

type CanvaPendingAuth = {
  state: string;
  codeVerifier: string;
  createdAt: number;
};

type CanvaStoredToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
};

const CANVA_DESIGN_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  instagram_post: { width: 1080, height: 1080, label: "Instagram Post" },
  instagram_story: { width: 1080, height: 1920, label: "Instagram Story/Reel" },
  facebook_post: { width: 1200, height: 630, label: "Facebook Post" },
  linkedin_post: { width: 1200, height: 627, label: "LinkedIn Post" },
  tiktok_video: { width: 1080, height: 1920, label: "TikTok/Short Video" },
};

const FORMAT_ASPECT_RATIOS: Record<string, string> = {
  instagram_post: "1:1",
  instagram_story: "9:16",
  facebook_post: "16:9",
  linkedin_post: "16:9",
  tiktok_video: "9:16",
};

const envOrConfig = (
  key: string,
  config: Record<string, string> | undefined
) => config?.[key] || process.env[key] || "";

const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_TOKEN_PATH = path.join(process.cwd(), ".canva-token.json");
const CANVA_PENDING_AUTH_PATH = path.join(process.cwd(), ".canva-oauth-state.json");
const DEFAULT_CANVA_SCOPES = [
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
].join(" ");

const base64Url = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getCanvaClientId = () => process.env.CANVA_CLIENT_ID || "";
const getCanvaClientSecret = () => process.env.CANVA_CLIENT_SECRET || "";
const getCanvaRedirectUri = () =>
  process.env.CANVA_REDIRECT_URI ||
  "https://rh.heavenlydreams.com.mx/rh-api/integrations/canva/callback";

const readCanvaToken = async (): Promise<CanvaStoredToken | null> => {
  try {
    const raw = await fs.readFile(CANVA_TOKEN_PATH, "utf8");
    return JSON.parse(raw) as CanvaStoredToken;
  } catch (_error) {
    return null;
  }
};

const saveCanvaToken = async (payload: any) => {
  const token: CanvaStoredToken = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + Number(payload.expires_in || 14400) * 1000 - 60_000,
    scope: payload.scope,
    token_type: payload.token_type,
  };

  await fs.writeFile(CANVA_TOKEN_PATH, JSON.stringify(token, null, 2), { mode: 0o600 });
  return token;
};

const readPendingCanvaAuth = async (): Promise<Record<string, CanvaPendingAuth>> => {
  try {
    const raw = await fs.readFile(CANVA_PENDING_AUTH_PATH, "utf8");
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
};

const savePendingCanvaAuth = async (pending: Record<string, CanvaPendingAuth>) => {
  await fs.writeFile(CANVA_PENDING_AUTH_PATH, JSON.stringify(pending, null, 2), { mode: 0o600 });
};

const exchangeCanvaToken = async (body: URLSearchParams) => {
  const clientId = getCanvaClientId();
  const clientSecret = getCanvaClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Faltan CANVA_CLIENT_ID y CANVA_CLIENT_SECRET en el servidor.");
  }

  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Canva no devolvio token.");
  }

  return saveCanvaToken(payload);
};

export async function createCanvaAuthorizationUrl() {
  const clientId = getCanvaClientId();
  if (!clientId || !getCanvaClientSecret()) {
    throw new Error("Faltan CANVA_CLIENT_ID y CANVA_CLIENT_SECRET en el servidor.");
  }

  const codeVerifier = base64Url(crypto.randomBytes(64));
  const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = base64Url(crypto.randomBytes(32));
  const pending = await readPendingCanvaAuth();

  pending[state] = {
    state,
    codeVerifier,
    createdAt: Date.now(),
  };

  await savePendingCanvaAuth(pending);

  const url = new URL(CANVA_AUTH_URL);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("scope", process.env.CANVA_SCOPES || DEFAULT_CANVA_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", getCanvaRedirectUri());

  return url.toString();
}

export async function completeCanvaAuthorization(code: string, state: string) {
  const pending = await readPendingCanvaAuth();
  const auth = pending[state];

  if (!auth || Date.now() - auth.createdAt > 10 * 60 * 1000) {
    throw new Error("La autorizacion de Canva expiro. Inicia la conexion de nuevo.");
  }

  delete pending[state];
  await savePendingCanvaAuth(pending);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: auth.codeVerifier,
    redirect_uri: getCanvaRedirectUri(),
  });

  return exchangeCanvaToken(body);
}

async function getValidCanvaAccessToken(config?: Record<string, string>) {
  const manualToken = envOrConfig("CANVA_ACCESS_TOKEN", config);
  if (manualToken && !manualToken.startsWith("MY_")) {
    return manualToken;
  }

  const stored = await readCanvaToken();
  if (!stored?.access_token) {
    return "";
  }

  if (stored.expires_at > Date.now()) {
    return stored.access_token;
  }

  if (!stored.refresh_token) {
    return "";
  }

  const refreshed = await exchangeCanvaToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refresh_token,
    })
  );

  return refreshed.access_token;
}

export function getIntegrationCatalog() {
  return INTEGRATION_CATALOG;
}

export function testIntegrationConfig(input: IntegrationTestInput) {
  const connector = INTEGRATION_CATALOG[input.provider];

  if (!connector) {
    return {
      ok: false,
      provider: input.provider,
      message: "Integracion desconocida",
      missing: [],
    };
  }

  const missing = connector.requiredConfig.filter(
    (key) => !envOrConfig(key, input.config)
  );

  return {
    ok: missing.length === 0,
    provider: connector.id,
    name: connector.name,
    mode: connector.mode,
    missing,
    message:
      missing.length === 0
        ? "Configuracion minima presente. Lista para prueba real."
        : "Faltan credenciales o parametros para conexion real.",
    capabilities: connector.capabilities,
    notes: connector.notes,
  };
}

export function normalizeJobBoardCandidate(provider: IntegrationProvider, body: any) {
  const candidate = body?.candidate || body?.applicant || body;

  return {
    provider,
    source:
      provider === "indeed"
        ? "Indeed"
        : provider === "computrabajo"
          ? "Computrabajo"
          : provider,
    externalId: candidate.id || candidate.externalId || body?.id || null,
    name:
      candidate.name ||
      [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
      "Candidato sin nombre",
    email: candidate.email || candidate.emailAddress || "",
    phone: candidate.phone || candidate.phoneNumber || "",
    role: body?.job?.title || candidate.role || candidate.jobTitle || "",
    raw: body,
  };
}

export async function createCanvaDesign(input: CanvaDesignInput) {
  const accessToken = await getValidCanvaAccessToken(input.config);
  const format = input.format || "instagram_post";
  const preset = CANVA_DESIGN_PRESETS[format] || CANVA_DESIGN_PRESETS.instagram_post;
  const title = input.title || `Recruiting creative - ${preset.label}`;
  const brief = input.brief || "";

  if (!accessToken) {
    return {
      provider: "canva",
      ok: false,
      status: "needs_canva_token",
      message:
        "CANVA_ACCESS_TOKEN no esta configurado. No se creo ningun diseno.",
      templatePackId: input.templatePackId || null,
      templateSearchUrl: input.templateSearchUrl || "https://www.canva.com/templates",
      canvaUrl: input.templateSearchUrl || "https://www.canva.com/templates",
    };
  }

  if (input.brandTemplateId) {
    const response = await fetch("https://api.canva.com/rest/v1/autofills", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brand_template_id: input.brandTemplateId,
        data:
          input.autofillData || {
            TITLE: { type: "text", text: title },
            BRIEF: { type: "text", text: brief },
          },
      }),
    });

    const payload = await response.json();
    return {
      provider: "canva",
      ok: response.ok,
      status: response.status,
      mode: "autofill",
      templatePackId: input.templatePackId || null,
      templateSearchUrl: input.templateSearchUrl || null,
      response: payload,
    };
  }

  const response = await fetch("https://api.canva.com/rest/v1/designs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "type_and_asset",
      design_type: {
        type: "custom",
        width: preset.width,
        height: preset.height,
      },
      title,
    }),
  });

  const payload = await response.json();
  return {
    provider: "canva",
    ok: response.ok,
    status: response.status,
    mode: "create_design",
    brief,
    templatePackId: input.templatePackId || null,
    templateSearchUrl: input.templateSearchUrl || null,
    response: payload,
  };
}

const getGeminiImageKey = (config?: Record<string, string>) =>
  envOrConfig("GEMINI_IMAGE_API_KEY", config) ||
  envOrConfig("GEMINI_API_KEY", config) ||
  envOrConfig("GEMINI_FREE_API_KEY", config);

const getReplicateToken = (config?: Record<string, string>) =>
  envOrConfig("REPLICATE_API_TOKEN", config) ||
  envOrConfig("REPLICATE_TOKEN", config);

const buildRecruitmentImagePrompt = (input: GeminiImageInput) => {
  const source = input.prompt || input.brief || "";
  return `
Create a polished recruitment marketing image for Heavenly Dreams.
Use a modern professional style suitable for social media hiring campaigns.
No fake logos, no unreadable text, no distorted hands, no minors.
Visual concept:
${source}

If text is included, keep it very short and readable in Spanish:
"Nueva oportunidad profesional"
"Postulate hoy"

Use clean composition, premium HR agency look, strict grayscale only, monochrome black-white-neutral palette, realistic diverse adult professionals, optimistic office atmosphere. No blue, cyan, purple, neon, saturated colors, warm tint, colored logos, or colored lighting.
  `.trim();
};

const readImageAsDataUrl = async (imageUrl: string) => {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`No se pudo descargar la imagen generada (${imageResponse.status}).`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/webp";
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
};

export async function generateReplicateRecruitmentImage(input: GeminiImageInput) {
  const token = getReplicateToken(input.config);
  if (!token) {
    return {
      provider: "replicate",
      ok: false,
      status: "missing_config",
      error: "Falta REPLICATE_API_TOKEN en el servidor.",
    };
  }

  const model = process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell";
  const aspectRatio = input.aspectRatio || FORMAT_ASPECT_RATIOS[input.format || "instagram_post"] || "1:1";
  const prompt = buildRecruitmentImagePrompt(input);

  const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        num_outputs: 1,
        output_format: "webp",
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    return {
      provider: "replicate",
      ok: false,
      status: response.status,
      model,
      error: payload?.detail || payload?.error || "Replicate no pudo generar la imagen.",
      response: payload,
    };
  }

  const output = Array.isArray(payload.output) ? payload.output[0] : payload.output;
  const imageUrl = typeof output === "string" ? output : output?.url;

  if (!imageUrl) {
    return {
      provider: "replicate",
      ok: false,
      status: payload.status || "no_image",
      model,
      error: payload.error || "Replicate respondio sin imagen.",
      response: payload,
    };
  }

  const dataUrl = await readImageAsDataUrl(imageUrl);

  return {
    provider: "replicate",
    ok: true,
    status: 200,
    model,
    aspectRatio,
    prompt,
    imageUrl,
    image: {
      mimeType: dataUrl.slice(5, dataUrl.indexOf(";")),
      dataUrl,
    },
  };
}

export async function generateGeminiRecruitmentImage(input: GeminiImageInput) {
  const apiKey = getGeminiImageKey(input.config);
  if (!apiKey) {
    if (getReplicateToken(input.config)) {
      return generateReplicateRecruitmentImage(input);
    }

    return {
      provider: "gemini",
      ok: false,
      status: "missing_config",
      error: "Falta GEMINI_IMAGE_API_KEY o GEMINI_API_KEY en el servidor.",
    };
  }

  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const aspectRatio = input.aspectRatio || FORMAT_ASPECT_RATIOS[input.format || "instagram_post"] || "1:1";
  const prompt = buildRecruitmentImagePrompt(input);

  if (model.startsWith("gemini-")) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${prompt}\n\nAspect ratio target: ${aspectRatio}.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    const payload = await response.json();
    if (!response.ok) {
      return {
        provider: "gemini",
        ok: false,
        status: response.status,
        model,
        error: payload?.error?.message || payload?.error || "Gemini no pudo generar la imagen.",
        response: payload,
      };
    }

    const parts = payload?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data);
    const inlineData = imagePart?.inlineData || imagePart?.inline_data;

    if (!inlineData?.data) {
      return {
        provider: "gemini",
        ok: false,
        status: "no_image",
        model,
        error: "Gemini respondio sin imagen.",
        response: payload,
      };
    }

    return {
      provider: "gemini",
      ok: true,
      status: 200,
      model,
      aspectRatio,
      prompt,
      image: {
        mimeType: inlineData.mimeType || inlineData.mime_type || "image/png",
        dataUrl: `data:${inlineData.mimeType || inlineData.mime_type || "image/png"};base64,${inlineData.data}`,
      },
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
          personGeneration: "allow_adult",
        },
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    return {
      provider: "gemini",
      ok: false,
      status: response.status,
      model,
      error: payload?.error?.message || payload?.error || "Gemini no pudo generar la imagen.",
      response: payload,
    };
  }

  const prediction = payload?.predictions?.[0];
  const bytesBase64 =
    prediction?.bytesBase64Encoded ||
    prediction?.image?.bytesBase64Encoded ||
    prediction?.image?.imageBytes;

  if (!bytesBase64) {
    return {
      provider: "gemini",
      ok: false,
      status: "no_image",
      model,
      error: "Gemini respondio sin imagen.",
      response: payload,
    };
  }

  return {
    provider: "gemini",
    ok: true,
    status: 200,
    model,
    aspectRatio,
    prompt,
    image: {
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${bytesBase64}`,
    },
  };
}

const roundMoney = (value: number) => Number(value.toFixed(2));
const pct = (value: number) => Number((value * 100).toFixed(2));

const readLeadCount = (row: any) => {
  const actions = Array.isArray(row.actions) ? row.actions : [];
  const leadAction = actions.find((action: any) =>
    ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(
      action.action_type
    )
  );

  return Number(leadAction?.value || row.leads || 0);
};

const normalizeInsightRow = (row: any) => ({
  campaign: row.campaign_name || row.campaign || "Campana Meta Ads",
  hour:
    row.hourly_stats_aggregated_by_advertiser_time_zone ||
    row.hour ||
    "Sin desglose horario",
  spend: Number(row.spend || 0),
  leads: readLeadCount(row),
  clicks: Number(row.clicks || 0),
  impressions: Number(row.impressions || 0),
});

const summarizeFacebookAds = (
  input: FacebookAdsAnalyzeInput,
  hourlyRows: ReturnType<typeof normalizeInsightRow>[],
  campaignRows: ReturnType<typeof normalizeInsightRow>[]
) => {
  const rowsForTotals = campaignRows.length ? campaignRows : hourlyRows;
  const totalSpend = rowsForTotals.reduce((sum, row) => sum + row.spend, 0);
  const totalLeads = rowsForTotals.reduce((sum, row) => sum + row.leads, 0);
  const totalClicks = rowsForTotals.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = rowsForTotals.reduce((sum, row) => sum + row.impressions, 0);
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const estimatedInterviews = Math.round(totalLeads * input.leadToInterviewRate);
  const estimatedHires = Math.round(estimatedInterviews * input.interviewToHireRate);
  const costPerEstimatedHire = estimatedHires > 0 ? totalSpend / estimatedHires : 0;
  const recommendedBudget = input.targetLeads * (cpl || 8);

  const hourly = hourlyRows
    .map((row) => ({
      ...row,
      cpl: row.leads > 0 ? roundMoney(row.spend / row.leads) : null,
      ctr: row.impressions > 0 ? pct(row.clicks / row.impressions) : 0,
    }))
    .sort((a, b) => {
      const aScore = (a.leads * 2) - (a.cpl || 99);
      const bScore = (b.leads * 2) - (b.cpl || 99);
      return bScore - aScore;
    });

  const bestHours = hourly.slice(0, 3);
  const worstHours = [...hourly].reverse().slice(0, 2);
  const pacing = input.dailyBudget > 0 ? totalSpend / input.dailyBudget : 0;

  return {
    provider: "facebook_ads",
    datePreset: input.datePreset,
    summary: {
      totalSpend: roundMoney(totalSpend),
      totalLeads,
      totalClicks,
      totalImpressions,
      cpl: roundMoney(cpl || 0),
      cpc: roundMoney(cpc || 0),
      ctr: pct(ctr),
      estimatedInterviews,
      estimatedHires,
      costPerEstimatedHire: roundMoney(costPerEstimatedHire || 0),
      recommendedBudget: roundMoney(recommendedBudget),
      dailyBudget: input.dailyBudget,
      budgetPacing: pct(pacing),
    },
    bestHours,
    worstHours,
    campaigns: campaignRows.map((row) => ({
      ...row,
      cpl: row.leads > 0 ? roundMoney(row.spend / row.leads) : null,
      ctr: row.impressions > 0 ? pct(row.clicks / row.impressions) : 0,
    })),
    recommendation: {
      bestTime:
        bestHours.length > 0
          ? `Concentra presupuesto entre ${bestHours.map((hour) => hour.hour).join(", ")}.`
          : "Faltan datos horarios para recomendar una franja.",
      budget:
        recommendedBudget > input.dailyBudget
          ? `Para llegar a ${input.targetLeads} leads, estima un presupuesto de $${roundMoney(recommendedBudget)}.`
          : `El presupuesto actual puede cubrir la meta de ${input.targetLeads} leads si se mantiene el CPL.`,
      agentAction:
        "El agente debe revisar comentarios cada 2-3 horas en las franjas ganadoras, responder dudas frecuentes, pedir datos minimos y escalar objeciones salariales o legales.",
    },
  };
};

export async function analyzeFacebookRecruitmentAds(input: FacebookAdsAnalyzeInput) {
  const accessToken = envOrConfig("META_ADS_ACCESS_TOKEN", input.config);
  const adAccountId = envOrConfig("META_AD_ACCOUNT_ID", input.config).replace(/^act_/, "");
  const graphVersion = envOrConfig("META_GRAPH_VERSION", input.config) || "v24.0";

  if (!accessToken || !adAccountId) {
    return {
      provider: "facebook_ads",
      ok: false,
      status: "missing_config",
      error: "META_ADS_ACCESS_TOKEN y META_AD_ACCOUNT_ID son obligatorios para analizar datos reales.",
    };
  }

  const baseUrl = `https://graph.facebook.com/${graphVersion}/act_${adAccountId}/insights`;
  const commonFields = "campaign_name,impressions,clicks,spend,actions";

  const campaignUrl = new URL(baseUrl);
  campaignUrl.searchParams.set("access_token", accessToken);
  campaignUrl.searchParams.set("date_preset", input.datePreset);
  campaignUrl.searchParams.set("level", "campaign");
  campaignUrl.searchParams.set("fields", commonFields);
  campaignUrl.searchParams.set("action_breakdowns", "action_type");

  const hourlyUrl = new URL(baseUrl);
  hourlyUrl.searchParams.set("access_token", accessToken);
  hourlyUrl.searchParams.set("date_preset", input.datePreset);
  hourlyUrl.searchParams.set("level", "campaign");
  hourlyUrl.searchParams.set("fields", commonFields);
  hourlyUrl.searchParams.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");
  hourlyUrl.searchParams.set("action_breakdowns", "action_type");

  const [campaignResponse, hourlyResponse] = await Promise.all([
    fetch(campaignUrl),
    fetch(hourlyUrl),
  ]);

  const [campaignPayload, hourlyPayload] = await Promise.all([
    campaignResponse.json(),
    hourlyResponse.json(),
  ]);

  if (!campaignResponse.ok || !hourlyResponse.ok) {
    return {
      provider: "facebook_ads",
      ok: false,
      status: campaignResponse.ok ? hourlyResponse.status : campaignResponse.status,
      error: campaignResponse.ok ? hourlyPayload : campaignPayload,
    };
  }

  return summarizeFacebookAds(
    input,
    (hourlyPayload.data || []).map(normalizeInsightRow),
    (campaignPayload.data || []).map(normalizeInsightRow)
  );
}
