export type CanvaTemplatePack = {
  id: string;
  title: string;
  category: string;
  format: string;
  canvaSearchUrl: string;
  bestFor: string;
  defaultCampaign: string;
  defaultAudience: string;
  defaultOffer: string;
  hook: string;
  visualDirection: string;
  cta: string;
  autofillData: Record<string, { type: 'text'; text: string }>;
};

export const CANVA_TEMPLATE_CATEGORIES = [
  'Todas',
  'Vacantes',
  'Historias',
  'Videos',
  'Employer Brand',
  'Ferias'
];

export const CANVA_TEMPLATE_PACKS: CanvaTemplatePack[] = [
  {
    id: 'job-post-instagram',
    title: 'Post de vacante Instagram',
    category: 'Vacantes',
    format: 'instagram_post',
    canvaSearchUrl: 'https://www.canva.com/templates/search/job-hiring-instagram-post/',
    bestFor: 'Publicar vacantes con sueldo, zona, horario y CTA claro.',
    defaultCampaign: 'Vacante abierta en Iztapalapa',
    defaultAudience: 'Candidatos de 18 a 45 anos en CDMX con disponibilidad inmediata',
    defaultOffer: 'Sueldo competitivo, capacitacion pagada, crecimiento y entrevista rapida.',
    hook: 'Estamos contratando esta semana',
    visualDirection: 'Titulo grande, rol visible, sueldo destacado, 3 beneficios y boton visual de postulacion.',
    cta: 'Postulate hoy y agenda entrevista',
    autofillData: {
      TITLE: { type: 'text', text: 'Estamos contratando' },
      ROLE: { type: 'text', text: '{{job_title}}' },
      LOCATION: { type: 'text', text: 'Iztapalapa, CDMX' },
      OFFER: { type: 'text', text: '{{salary_and_benefits}}' },
      CTA: { type: 'text', text: 'Agenda entrevista hoy' }
    }
  },
  {
    id: 'story-quick-apply',
    title: 'Story / Reel para postulacion rapida',
    category: 'Historias',
    format: 'instagram_story',
    canvaSearchUrl: 'https://www.canva.com/templates/search/we-are-hiring-instagram-story/',
    bestFor: 'Captar candidatos desde celular con mensaje corto y accion inmediata.',
    defaultCampaign: 'Postulacion rapida por WhatsApp',
    defaultAudience: 'Personas activas en redes sociales buscando empleo inmediato',
    defaultOffer: 'Proceso simple: envia datos, confirma disponibilidad y agenda entrevista.',
    hook: 'Buscas empleo? Tenemos vacantes cerca de ti',
    visualDirection: 'Video vertical con texto de alto contraste, iconos de horario, zona y pago.',
    cta: 'Toca el enlace y envia tu solicitud',
    autofillData: {
      TITLE: { type: 'text', text: 'Vacantes disponibles' },
      HOOK: { type: 'text', text: 'Postulate en minutos' },
      LOCATION: { type: 'text', text: 'CDMX' },
      CTA: { type: 'text', text: 'Enviar solicitud' }
    }
  },
  {
    id: 'tiktok-video-recruitment',
    title: 'Video corto tipo TikTok',
    category: 'Videos',
    format: 'tiktok_video',
    canvaSearchUrl: 'https://www.canva.com/templates/search/recruitment-tiktok-video/',
    bestFor: 'Anuncios dinamicos para vacantes operativas y comerciales.',
    defaultCampaign: 'Video de reclutamiento de alto alcance',
    defaultAudience: 'Candidatos jovenes y perfiles operativos con alta actividad movil',
    defaultOffer: 'Trabajo estable, pagos puntuales, horario claro y crecimiento.',
    hook: 'Tres razones para postularte hoy',
    visualDirection: 'Cortes rapidos, subtitulos grandes, escenas del ambiente laboral y cierre con CTA.',
    cta: 'Manda mensaje y aparta entrevista',
    autofillData: {
      TITLE: { type: 'text', text: 'Unete al equipo' },
      BENEFIT_1: { type: 'text', text: 'Capacitacion' },
      BENEFIT_2: { type: 'text', text: 'Crecimiento' },
      BENEFIT_3: { type: 'text', text: 'Pago puntual' },
      CTA: { type: 'text', text: 'Manda mensaje hoy' }
    }
  },
  {
    id: 'linkedin-professional-job',
    title: 'Post profesional LinkedIn',
    category: 'Vacantes',
    format: 'linkedin_post',
    canvaSearchUrl: 'https://www.canva.com/templates/search/linkedin-hiring-post/',
    bestFor: 'Perfiles administrativos, supervision, ventas B2B y liderazgo.',
    defaultCampaign: 'Busqueda de talento profesional',
    defaultAudience: 'Candidatos con experiencia comprobable y preparacion academica alineada',
    defaultOffer: 'Proyecto serio, responsabilidades claras, estabilidad y plan de desarrollo.',
    hook: 'Nueva oportunidad profesional',
    visualDirection: 'Diseno sobrio, titular ejecutivo, requisitos clave y propuesta de valor.',
    cta: 'Comparte tu CV y agenda una conversacion',
    autofillData: {
      TITLE: { type: 'text', text: 'Nueva oportunidad' },
      ROLE: { type: 'text', text: '{{job_title}}' },
      REQUIREMENTS: { type: 'text', text: '{{requirements}}' },
      CTA: { type: 'text', text: 'Enviar CV' }
    }
  },
  {
    id: 'employer-brand-culture',
    title: 'Employer Brand / Cultura',
    category: 'Employer Brand',
    format: 'facebook_post',
    canvaSearchUrl: 'https://www.canva.com/templates/search/company-culture-social-media/',
    bestFor: 'Mostrar ambiente laboral, valores y razones para unirse.',
    defaultCampaign: 'Marca empleadora Heavenly Dreams',
    defaultAudience: 'Candidatos que comparan empresas antes de postularse',
    defaultOffer: 'Equipo humano, procesos claros, aprendizaje y trato digno.',
    hook: 'Aqui el talento se cuida y se desarrolla',
    visualDirection: 'Fotos reales, testimonios breves, colores de marca y mensaje humano.',
    cta: 'Conoce nuestras vacantes abiertas',
    autofillData: {
      TITLE: { type: 'text', text: 'Trabaja con nosotros' },
      VALUE: { type: 'text', text: 'Crecimiento con trato humano' },
      CTA: { type: 'text', text: 'Ver vacantes' }
    }
  },
  {
    id: 'job-fair-flyer',
    title: 'Flyer feria de empleo',
    category: 'Ferias',
    format: 'instagram_post',
    canvaSearchUrl: 'https://www.canva.com/templates/search/job-fair-flyer/',
    bestFor: 'Convocar entrevistas presenciales o jornadas masivas.',
    defaultCampaign: 'Jornada de entrevistas en Av. Tlahuac',
    defaultAudience: 'Candidatos cercanos a Culhuacan, Iztapalapa y alcaldias vecinas',
    defaultOffer: 'Entrevistas con horario definido, requisitos claros y respuesta rapida.',
    hook: 'Ven a entrevista esta semana',
    visualDirection: 'Mapa o referencia de ubicacion, fecha, horario, documentos y vacantes disponibles.',
    cta: 'Confirma asistencia y trae tu solicitud',
    autofillData: {
      TITLE: { type: 'text', text: 'Feria de empleo' },
      ADDRESS: { type: 'text', text: 'Av. Tlahuac 3632 A301, Culhuacan' },
      DATE: { type: 'text', text: '{{interview_date}}' },
      CTA: { type: 'text', text: 'Confirma asistencia' }
    }
  }
];
