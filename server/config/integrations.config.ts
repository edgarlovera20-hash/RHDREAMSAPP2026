export type IntegrationProvider =
  | "indeed"
  | "computrabajo"
  | "whatsapp_personal"
  | "facebook_ads"
  | "canva";

export const INTEGRATION_CATALOG = {
  indeed: {
    id: "indeed",
    name: "Indeed",
    category: "job_board",
    mode: "partner_api",
    capabilities: [
      "Publicar y sincronizar vacantes",
      "Recibir candidatos desde Indeed Apply",
      "Sincronizar candidatos con Candidate Sync",
      "Enviar estados del proceso con Disposition Sync",
    ],
    requiredConfig: [
      "INDEED_CLIENT_ID",
      "INDEED_CLIENT_SECRET",
      "INDEED_EMPLOYER_ID",
      "INDEED_WEBHOOK_SECRET",
    ],
    notes:
      "Las APIs de Indeed requieren acceso de partner/provisionamiento en Partner Console.",
  },
  computrabajo: {
    id: "computrabajo",
    name: "Computrabajo",
    category: "job_board",
    mode: "managed_import",
    capabilities: [
      "Registrar fuente de candidatos Computrabajo",
      "Importar candidatos por CSV, email parser o webhook intermedio",
      "Mapear vacante, etapa y documentos",
      "Preparar integracion empresarial/Pandape si existe contrato",
    ],
    requiredConfig: [
      "COMPUTRABAJO_COUNTRY_PORTAL",
      "COMPUTRABAJO_COMPANY_ACCOUNT",
      "COMPUTRABAJO_IMPORT_SECRET",
    ],
    notes:
      "No se asume scraping ni API publica directa. Usa feed autorizado, CSV, email parser o proveedor empresarial.",
  },
  whatsapp_personal: {
    id: "whatsapp_personal",
    name: "WhatsApp Normal",
    category: "messaging",
    mode: "baileys_local_socket",
    capabilities: [
      "Generar QR real con Baileys",
      "Mantener sesion local multi-file auth",
      "Enviar mensajes desde el dispositivo vinculado",
      "Recibir mensajes entrantes para el agente IA",
    ],
    requiredConfig: [],
    notes:
      "Baileys es un conector no oficial de WhatsApp Web. Usar solo con consentimiento, sin spam y respetando limites/ToS.",
  },
  facebook_ads: {
    id: "facebook_ads",
    name: "Facebook Recruitment Ads",
    category: "paid_social",
    mode: "meta_marketing_api",
    capabilities: [
      "Leer gasto, impresiones, clicks, leads y CPL desde Ads Insights",
      "Detectar mejores horas por costo por lead y volumen",
      "Calcular gasto diario, CPL, CPC, CTR y presupuesto recomendado",
      "Entregar recomendaciones al agente de reclutamiento de Meta",
    ],
    requiredConfig: [
      "META_ADS_ACCESS_TOKEN",
      "META_AD_ACCOUNT_ID",
    ],
    notes:
      "Requiere Meta Marketing API, un Ad Account con permisos ads_read/ads_management segun alcance y campanas de empleo configuradas como categoria especial cuando aplique.",
  },
  canva: {
    id: "canva",
    name: "Canva Content Studio",
    category: "creative",
    mode: "canva_connect_api",
    capabilities: [
      "Crear lienzos Canva para posts y videos verticales",
      "Preparar briefs creativos generados por agentes AI",
      "Abrir enlaces de edicion para el equipo de marketing",
      "Usar Brand Template Autofill cuando exista acceso Canva Enterprise",
    ],
    requiredConfig: ["CANVA_ACCESS_TOKEN"],
    notes:
      "La creacion basica usa Canva Connect API con scope design:content:write. Autofill con Brand Templates requiere permisos adicionales y acceso Canva Enterprise.",
  },
} as const;
