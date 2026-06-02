export type IntegrationProvider =
  | "indeed"
  | "computrabajo"
  | "whatsapp_personal"
  | "whatsapp_meta"
  | "facebook"
  | "messenger"
  | "instagram"
  | "tiktok"
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
    name: "WhatsApp Baileys QR",
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
  whatsapp_meta: {
    id: "whatsapp_meta",
    name: "WhatsApp Meta Cloud API",
    category: "messaging",
    mode: "meta_whatsapp_cloud_api",
    capabilities: [
      "Recibir mensajes entrantes por webhook oficial de Meta",
      "Responder con el agente IA por WhatsApp Cloud API",
      "Mantener conversaciones separadas de Baileys",
      "Usar Phone Number ID y token oficial de WhatsApp Business",
    ],
    requiredConfig: [
      "META_WEBHOOK_VERIFY_TOKEN",
      "META_APP_SECRET",
      "WHATSAPP_CLOUD_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
    ],
    notes:
      "Modulo oficial de Meta. No usa QR ni sesiones Baileys. Para iniciar conversaciones fuera de la ventana activa requiere plantillas aprobadas por Meta.",
  },
  facebook: {
    id: "facebook",
    name: "Facebook Lead Ads",
    category: "social_leads",
    mode: "meta_webhooks",
    capabilities: [
      "Verificar webhook oficial de Meta",
      "Recibir eventos leadgen de formularios de Facebook",
      "Consultar datos del lead con Page Access Token",
      "Enviar el candidato al inbox de RH Dreams",
    ],
    requiredConfig: [
      "META_WEBHOOK_VERIFY_TOKEN",
      "META_PAGE_ACCESS_TOKEN",
      "META_APP_SECRET",
      "META_PAGE_ID",
    ],
    notes:
      "Requiere una Meta App con Webhooks para Page y permisos pages_manage_metadata, pages_read_engagement y leads_retrieval aprobados cuando se use en produccion.",
  },
  messenger: {
    id: "messenger",
    name: "Messenger",
    category: "messaging",
    mode: "meta_messenger_api",
    capabilities: [
      "Recibir mensajes entrantes por webhook de Meta",
      "Registrar conversaciones en el inbox",
      "Responder con el agente IA por Messenger Send API",
      "Mantener memoria conversacional por PSID",
    ],
    requiredConfig: [
      "META_WEBHOOK_VERIFY_TOKEN",
      "META_PAGE_ACCESS_TOKEN",
      "META_APP_SECRET",
      "META_PAGE_ID",
    ],
    notes:
      "Para responder mensajes se necesita Page Access Token y permisos pages_messaging/pages_manage_metadata segun revision de Meta.",
  },
  instagram: {
    id: "instagram",
    name: "Instagram DM",
    category: "messaging",
    mode: "meta_instagram_messaging_api",
    capabilities: [
      "Recibir mensajes entrantes por webhook de Meta/Instagram",
      "Registrar conversaciones en el inbox",
      "Responder con el agente IA por Instagram Messaging API",
      "Mantener memoria conversacional por usuario de Instagram",
    ],
    requiredConfig: [
      "META_WEBHOOK_VERIFY_TOKEN",
      "META_PAGE_ACCESS_TOKEN",
      "META_APP_SECRET",
      "INSTAGRAM_APP_ID",
      "INSTAGRAM_APP_SECRET",
    ],
    notes:
      "Requiere cuenta profesional de Instagram conectada a la pagina de Facebook y permisos de Instagram Messaging aprobados cuando se use en produccion.",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok Leads",
    category: "social_leads",
    mode: "managed_import",
    capabilities: [
      "Registrar fuente de candidatos TikTok",
      "Importar leads por CSV, webhook intermedio o proveedor autorizado",
      "Mapear campana, vacante, ciudad y contacto",
      "Enviar candidatos al inbox unificado",
    ],
    requiredConfig: [
      "TIKTOK_IMPORT_SECRET",
    ],
    notes:
      "Usa integracion autorizada o importacion administrada. No se asume scraping ni acceso no oficial.",
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
