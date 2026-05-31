export const deriveCandidateTags = (candidate: any): string[] => {
  const savedTags = Array.isArray(candidate?.tags)
    ? candidate.tags.filter((tag: unknown): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];

  if (savedTags.length > 0) return savedTags;

  const derived = new Set<string>();
  const stage = String(candidate?.stage || "").toLowerCase();
  const source = String(candidate?.source || "").toLowerCase();

  if (stage.includes("nuevo") || stage.includes("contactado")) derived.add("Contacto");
  if (stage.includes("cita") || stage.includes("entrevista")) derived.add("Entrevista");
  if (stage.includes("ddo") || stage.includes("observación")) derived.add("DDO");
  if (stage.includes("bienvenida")) derived.add("Bienvenida");
  if (stage.includes("inventario") || stage.includes("material")) derived.add("Materiales");
  if (stage.includes("seguimiento")) derived.add("Seguimiento");
  if (source.includes("messenger")) derived.add("Messenger");
  if (source.includes("facebook")) derived.add("Facebook");
  if (source.includes("instagram")) derived.add("Instagram");
  if (source.includes("tiktok")) derived.add("TikTok");
  if (source.includes("whatsapp")) derived.add("WhatsApp");
  if (candidate?.cvUrl) derived.add("CV");

  return Array.from(derived).slice(0, 5);
};

export const inferVisitReason = (candidate: any): string => {
  if (typeof candidate?.visitReason === "string" && candidate.visitReason.trim()) {
    return candidate.visitReason;
  }

  const stage = String(candidate?.stage || "").toLowerCase();
  const role = candidate?.role || "la vacante";

  if (stage.includes("cita") || stage.includes("entrevista")) {
    return `Viene a entrevista o seguimiento de entrevista para ${role}.`;
  }
  if (stage.includes("ddo") || stage.includes("observación")) {
    return `Viene a día de observación / DDO para ${role}.`;
  }
  if (stage.includes("bienvenida")) {
    return "Viene a bienvenida de primer día.";
  }
  if (stage.includes("inventario") || stage.includes("material")) {
    return "Viene a recibir inventario, material, uniforme o carpeta.";
  }
  if (stage.includes("nuevo") || stage.includes("contactado")) {
    return `Viene a contacto inicial y validación de disponibilidad para ${role}.`;
  }

  return `Viene por seguimiento del proceso para ${role}.`;
};

