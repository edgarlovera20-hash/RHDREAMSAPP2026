import { fetchLead } from "./graph";
import { readRuntimeCollection, writeRuntimeCollection } from "../../services/runtimeStore.service";
import { logger } from "../../utils/logger";

export interface MetaLead {
  leadgenId:  string;
  formId?:    string;
  adId?:      string;
  adName?:    string;
  name:       string;
  phone:      string;
  email:      string;
  position?:  string;
  message?:   string;
  source:     "facebook" | "instagram";
  pageId:     string;
  createdAt:  number;
  raw?:       unknown;
}

// ─── Field name aliases ───────────────────────────────────────────────────────
const FIELD_MAP: Record<keyof Pick<MetaLead, "name" | "phone" | "email" | "position" | "message">, string[]> = {
  name:     ["full_name", "nombre_completo", "nombre", "name", "first_name", "apellido"],
  phone:    ["phone_number", "telefono", "teléfono", "phone", "celular"],
  email:    ["email", "correo", "correo_electronico"],
  position: ["job_title", "puesto", "vacante", "position", "cargo"],
  message:  ["message", "mensaje", "comments", "comentarios"],
};

function pickField(fieldData: any[], aliases: string[]): string {
  const item = fieldData.find((f) => aliases.includes(String(f?.name || "").toLowerCase().trim()));
  const val  = item?.values?.[0] ?? item?.value ?? "";
  return typeof val === "string" ? val.trim() : String(val ?? "").trim();
}

// ─── Process a leadgen webhook change ────────────────────────────────────────
export async function processLead(change: any, pageId: string, source: "facebook" | "instagram" = "facebook"): Promise<MetaLead | null> {
  const leadgenId = String(change.value?.leadgen_id || "");
  if (!leadgenId) return null;

  logger.info("[Meta Leads] fetching lead", { leadgenId });
  const details   = await fetchLead(leadgenId);
  const fieldData = details?.field_data || [];

  const lead: MetaLead = {
    leadgenId,
    formId:   details?.form_id,
    adId:     details?.ad_id,
    adName:   details?.ad_name,
    name:     pickField(fieldData, FIELD_MAP.name),
    phone:    pickField(fieldData, FIELD_MAP.phone),
    email:    pickField(fieldData, FIELD_MAP.email),
    position: pickField(fieldData, FIELD_MAP.position),
    message:  pickField(fieldData, FIELD_MAP.message),
    source,
    pageId,
    createdAt: Date.now(),
    raw: details,
  };

  // Persist to JSON store
  try {
    const leads = await readRuntimeCollection<MetaLead>("meta-leads.json");
    // Deduplication by leadgenId
    const exists = leads.some((l) => l.leadgenId === leadgenId);
    if (!exists) {
      leads.unshift(lead);
      leads.splice(1000); // keep last 1000
      await writeRuntimeCollection("meta-leads.json", leads);
      logger.info("[Meta Leads] saved", { leadgenId, name: lead.name, phone: lead.phone });
    }
  } catch (err) {
    logger.error("[Meta Leads] persistence error", { err });
  }

  return lead;
}

// ─── Format lead as readable message ─────────────────────────────────────────
export function leadToMessage(lead: MetaLead): string {
  const parts = [`📋 Nuevo lead de ${lead.source === "instagram" ? "Instagram" : "Facebook"}`];
  if (lead.adName)   parts.push(`📣 Anuncio: ${lead.adName}`);
  if (lead.name)     parts.push(`👤 Nombre: ${lead.name}`);
  if (lead.phone)    parts.push(`📱 Teléfono: ${lead.phone}`);
  if (lead.email)    parts.push(`✉️ Email: ${lead.email}`);
  if (lead.position) parts.push(`💼 Vacante: ${lead.position}`);
  if (lead.message)  parts.push(`💬 Mensaje: ${lead.message}`);
  return parts.join("\n");
}
