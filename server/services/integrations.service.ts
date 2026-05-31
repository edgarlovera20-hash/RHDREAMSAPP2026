import {
  INTEGRATION_CATALOG,
  IntegrationProvider,
} from "../config/integrations.config";

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

const CANVA_DESIGN_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  instagram_post: { width: 1080, height: 1080, label: "Instagram Post" },
  instagram_story: { width: 1080, height: 1920, label: "Instagram Story/Reel" },
  facebook_post: { width: 1200, height: 630, label: "Facebook Post" },
  linkedin_post: { width: 1200, height: 627, label: "LinkedIn Post" },
  tiktok_video: { width: 1080, height: 1920, label: "TikTok/Short Video" },
};

const envOrConfig = (
  key: string,
  config: Record<string, string> | undefined
) => config?.[key] || process.env[key] || "";

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
  const accessToken = envOrConfig("CANVA_ACCESS_TOKEN", input.config);
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
