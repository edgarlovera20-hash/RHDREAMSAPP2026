export type RhPromptTemplate = {
  id: string;
  title: string;
  category: string;
  useCase: string;
  prompt: string;
  variables: string[];
};

export const RH_PROMPT_LIBRARY_META = {
  source: "Ebook 500 prompts de ChatGPT para profesionales de Recursos Humanos",
  usage:
    "Elige una plantilla, personaliza las variables y agregala a un paso del flujo IA. Los prompts son guias operativas para reclutamiento, onboarding, desempeno y gestion de personas.",
};

export const RH_PROMPT_CATEGORIES = [
  "Reclutamiento y seleccion",
  "Incorporacion e integracion",
  "Gestion del desempeno",
  "Capacitacion y desarrollo",
  "Comunicacion interna",
  "Bienestar y salud laboral",
  "Diversidad e inclusion",
  "Gestion de conflictos",
  "Politicas y cumplimiento",
  "Compromiso y retencion",
] as const;

export const RH_PROMPT_LIBRARY: RhPromptTemplate[] = [
  {
    id: "hdrs-master-recruitment-flow",
    category: "Reclutamiento y seleccion",
    title: "HDRS flujo maestro 72 horas",
    useCase: "Crear un flujo completo de captacion, precalificacion, scoring, agenda y seguimiento.",
    variables: ["job_name", "job_target_profile", "offer_details", "work_schedule", "candidate_location"],
    prompt:
      "Disena un flujo HDRS para contratar {{job_name}} en 72 horas. Incluye captacion omnicanal, saludo IA humano, captura de datos, arbol de edad, scoring 0-100, entrevista IA, agenda, recordatorios, recuperacion de abandonos, talent pool y KPIs. Usa solo una pregunta por mensaje y no copies plantillas fijas.",
  },
  {
    id: "hdrs-prequalification-score",
    category: "Reclutamiento y seleccion",
    title: "HDRS precalificacion y scoring",
    useCase: "Evaluar candidatos con rubrica trazable y no discriminatoria.",
    variables: ["candidate_name", "job_name", "required_experience", "education_level", "work_schedule"],
    prompt:
      "Precalifica a {{candidate_name}} para {{job_name}} con HDRS. Captura nombre, edad, ciudad, telefono, correo, horario, transporte, inicio inmediato, ultimo empleo, tiempo laborado, funciones, escolaridad y puesto deseado. Calcula experiencia, disponibilidad, cercania, habilidades y actitud de 0 a 20. Clasifica prioridad A, B, C o talent pool, sin mostrar puntaje al candidato.",
  },
  {
    id: "hdrs-recovery-ghosting",
    category: "Reclutamiento y seleccion",
    title: "HDRS recuperacion de candidatos",
    useCase: "Reactivar ghosting, indecisos y finalistas sin presionar.",
    variables: ["candidate_name", "job_name", "offer_details"],
    prompt:
      "Crea una secuencia HDRS para recuperar a {{candidate_name}} en la vacante {{job_name}}. Genera mensajes breves, naturales y diferentes para ghosting, indecision y finalistas. Cada mensaje debe ofrecer una opcion clara para continuar o cerrar, respetando consentimiento y sin insistencia invasiva.",
  },
  {
    id: "hdrs-talent-pool",
    category: "Reclutamiento y seleccion",
    title: "HDRS talent pool",
    useCase: "Clasificar candidatos para futuras vacantes y reactivarlos.",
    variables: ["candidate_name", "job_name", "candidate_location"],
    prompt:
      "Clasifica a {{candidate_name}} dentro del talent pool HDRS despues de evaluar {{job_name}}. Usa categorias Ventas, Operativos, Administrativos o Especializados. Propone motivo interno, proxima accion, fecha de reactivacion y mensaje humano para mantener contacto sin prometer contratacion.",
  },
  {
    id: "recruiting-time-to-hire",
    category: "Reclutamiento y seleccion",
    title: "Reducir tiempo de contratacion",
    useCase: "Plan de accion para acelerar una vacante sin perder calidad.",
    variables: ["job_name", "job_target_profile", "required_experience", "education_level"],
    prompt:
      "Desarrolla una estrategia integral para reducir el tiempo de contratacion de {{job_name}}. Incluye pasos, responsables, metricas de exito, riesgos y acciones para mantener calidad en la evaluacion del perfil {{job_target_profile}}.",
  },
  {
    id: "recruiting-interview-script",
    category: "Reclutamiento y seleccion",
    title: "Guion de entrevista tecnica y conductual",
    useCase: "Preguntas estructuradas y criterios para evaluar candidatos.",
    variables: ["job_name", "job_target_profile", "required_experience"],
    prompt:
      "Crea un guion de entrevista tecnica y conductual para {{job_name}}. Incluye preguntas por competencia, criterios de evaluacion, senales de alerta y una rubrica de puntuacion de 1 a 5 alineada a {{job_target_profile}} y {{required_experience}}.",
  },
  {
    id: "recruiting-market-salary",
    category: "Reclutamiento y seleccion",
    title: "Analisis de salario y beneficios",
    useCase: "Comparar oferta contra mercado y ajustar la propuesta.",
    variables: ["job_name", "offer_details", "candidate_location"],
    prompt:
      "Prepara un plan para analizar el mercado salarial de {{job_name}} en {{candidate_location}}. Define fuentes, criterios de comparacion, beneficios clave, riesgos de competitividad y recomendaciones para ajustar {{offer_details}}.",
  },
  {
    id: "recruiting-social-sourcing",
    category: "Reclutamiento y seleccion",
    title: "Estrategia de redes sociales",
    useCase: "Atraer candidatos desde redes y comunidades.",
    variables: ["job_name", "job_target_profile", "offer_details"],
    prompt:
      "Disena una estrategia para usar redes sociales en la contratacion de {{job_name}}. Incluye mensajes por canal, tipos de contenido, segmentacion del perfil {{job_target_profile}}, calendario de publicaciones y CTA con {{offer_details}}.",
  },
  {
    id: "recruiting-candidate-experience",
    category: "Reclutamiento y seleccion",
    title: "Experiencia positiva del candidato",
    useCase: "Mejorar comunicacion, seguimiento y percepcion de marca.",
    variables: ["candidate_name", "job_name", "work_schedule"],
    prompt:
      "Crea una experiencia de contratacion clara y memorable para candidatos de {{job_name}}. Incluye puntos de contacto, tiempos de respuesta, mensajes por etapa, feedback y acciones para respetar disponibilidad como {{work_schedule}}.",
  },
  {
    id: "onboarding-90-days",
    category: "Incorporacion e integracion",
    title: "Onboarding de 90 dias",
    useCase: "Plan completo para nuevas contrataciones.",
    variables: ["candidate_name", "job_name", "education_level"],
    prompt:
      "Desarrolla un programa de incorporacion de 90 dias para {{candidate_name}} en {{job_name}}. Incluye objetivos de 30, 60 y 90 dias, capacitaciones, responsables, checkpoints y metricas de productividad.",
  },
  {
    id: "onboarding-remote",
    category: "Incorporacion e integracion",
    title: "Incorporacion remota o hibrida",
    useCase: "Integrar personal distribuido sin perder conexion con el equipo.",
    variables: ["job_name", "work_schedule"],
    prompt:
      "Crea un plan de incorporacion remota o hibrida para {{job_name}} con horario {{work_schedule}}. Incluye bienvenida, herramientas, reuniones, acompanamiento, seguimiento emocional y senales de desconexion temprana.",
  },
  {
    id: "onboarding-buddy-system",
    category: "Incorporacion e integracion",
    title: "Sistema de companero guia",
    useCase: "Asignar buddy/mentor para acelerar adaptacion.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Disena un sistema de companero guia para {{candidate_name}} en {{job_name}}. Define rol del buddy, agenda de acompanamiento, entregables, limites, indicadores de exito y forma de recopilar retroalimentacion.",
  },
  {
    id: "onboarding-culture-kit",
    category: "Incorporacion e integracion",
    title: "Kit digital de bienvenida",
    useCase: "Crear recursos iniciales para cultura, procesos y herramientas.",
    variables: ["job_name", "offer_details"],
    prompt:
      "Crea un kit digital de bienvenida para {{job_name}}. Incluye recursos clave, explicacion de cultura, procesos, herramientas, beneficios de {{offer_details}} y una ruta de aprendizaje inicial.",
  },
  {
    id: "onboarding-feedback",
    category: "Incorporacion e integracion",
    title: "Evaluaciones 30/60/90",
    useCase: "Medir adaptacion y corregir a tiempo.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Genera una plantilla de evaluacion de incorporacion para {{candidate_name}} en {{job_name}} en los dias 30, 60 y 90. Incluye preguntas, escala, evidencias, acciones correctivas y responsables.",
  },
  {
    id: "performance-quarterly-review",
    category: "Gestion del desempeno",
    title: "Revision trimestral",
    useCase: "Evaluar resultados con criterios claros.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Crea un plan de revision trimestral de desempeno para {{candidate_name}} en {{job_name}}. Incluye metas, KPIs, evidencias, retroalimentacion constructiva y acuerdos de seguimiento.",
  },
  {
    id: "performance-360",
    category: "Gestion del desempeno",
    title: "Feedback 360",
    useCase: "Recolectar retroalimentacion equilibrada.",
    variables: ["job_name"],
    prompt:
      "Disena una estrategia de feedback 360 para {{job_name}}. Define fuentes de retroalimentacion, preguntas, escala, confidencialidad, analisis de resultados y plan de desarrollo posterior.",
  },
  {
    id: "performance-smart-goals",
    category: "Gestion del desempeno",
    title: "Objetivos SMART",
    useCase: "Alinear metas individuales y del negocio.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Convierte las responsabilidades de {{job_name}} en objetivos SMART para {{candidate_name}}. Incluye indicadores, plazos, nivel esperado, evidencias y reuniones de seguimiento.",
  },
  {
    id: "performance-low-performance",
    category: "Gestion del desempeno",
    title: "Plan de mejora",
    useCase: "Gestionar bajo desempeno con trazabilidad.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Crea un plan de mejora de desempeno para {{candidate_name}} en {{job_name}}. Incluye brechas observables, expectativas, recursos, fechas de revision, consecuencias y tono respetuoso.",
  },
  {
    id: "performance-report",
    category: "Gestion del desempeno",
    title: "Informe de desempeno",
    useCase: "Generar reporte para lideres y RH.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Redacta un informe de desempeno para {{candidate_name}} en {{job_name}}. Resume resultados, fortalezas, areas de mejora, riesgos, acciones recomendadas y proximos pasos.",
  },
  {
    id: "training-skills-gap",
    category: "Capacitacion y desarrollo",
    title: "Brechas de habilidades",
    useCase: "Detectar necesidades de capacitacion.",
    variables: ["job_name", "job_target_profile"],
    prompt:
      "Identifica brechas de habilidades para {{job_name}} comparando el perfil actual con {{job_target_profile}}. Propone capacitaciones, prioridad, formato, duracion y medicion de impacto.",
  },
  {
    id: "training-learning-plan",
    category: "Capacitacion y desarrollo",
    title: "Plan de capacitacion",
    useCase: "Ruta de aprendizaje por puesto.",
    variables: ["job_name", "education_level"],
    prompt:
      "Desarrolla un plan de capacitacion para {{job_name}} considerando {{education_level}}. Incluye objetivos, contenidos, ejercicios, evaluaciones y recursos para aprendizaje continuo.",
  },
  {
    id: "training-leadership",
    category: "Capacitacion y desarrollo",
    title: "Capacitacion en liderazgo",
    useCase: "Formar lideres y mandos medios.",
    variables: ["job_name"],
    prompt:
      "Crea un programa de capacitacion en liderazgo para {{job_name}}. Incluye modulos, casos practicos, habilidades blandas, evaluacion y seguimiento posterior.",
  },
  {
    id: "training-mentoring",
    category: "Capacitacion y desarrollo",
    title: "Programa de mentoria",
    useCase: "Desarrollo interno y transferencia de conocimiento.",
    variables: ["job_name"],
    prompt:
      "Disena un programa de mentoria para colaboradores de {{job_name}}. Define seleccion de mentores, objetivos, agenda, compromisos, indicadores y reglas de confidencialidad.",
  },
  {
    id: "training-library",
    category: "Capacitacion y desarrollo",
    title: "Biblioteca de recursos",
    useCase: "Organizar materiales de aprendizaje.",
    variables: ["job_name"],
    prompt:
      "Crea una biblioteca de recursos de capacitacion para {{job_name}}. Organiza temas, formatos, niveles, criterios de actualizacion y forma de medir uso y aprendizaje.",
  },
  {
    id: "internal-comms-plan",
    category: "Comunicacion interna",
    title: "Plan de comunicacion interna",
    useCase: "Alinear mensajes, canales y audiencias.",
    variables: ["job_name"],
    prompt:
      "Desarrolla un plan de comunicacion interna para mejorar transparencia y compromiso en equipos relacionados con {{job_name}}. Incluye audiencias, mensajes, canales, frecuencia y KPIs.",
  },
  {
    id: "internal-comms-newsletter",
    category: "Comunicacion interna",
    title: "Boletin interno",
    useCase: "Mantener informados a colaboradores.",
    variables: ["job_name"],
    prompt:
      "Crea una plantilla de boletin interno para comunicar novedades, reconocimientos, cambios y recordatorios vinculados a {{job_name}}. Incluye secciones y tono recomendado.",
  },
  {
    id: "internal-comms-crisis",
    category: "Comunicacion interna",
    title: "Comunicacion de crisis",
    useCase: "Preparar mensajes ante incidentes o cambios sensibles.",
    variables: ["job_name"],
    prompt:
      "Disena un protocolo de comunicacion de crisis para situaciones que impacten a equipos de {{job_name}}. Incluye voceros, mensajes, aprobaciones, canales y seguimiento.",
  },
  {
    id: "internal-comms-change",
    category: "Comunicacion interna",
    title: "Gestion del cambio",
    useCase: "Comunicar cambios organizacionales.",
    variables: ["job_name"],
    prompt:
      "Crea una estrategia de comunicacion para un cambio organizacional que afecte a {{job_name}}. Incluye narrativa, preguntas frecuentes, resistencias esperadas y plan de adopcion.",
  },
  {
    id: "internal-comms-feedback",
    category: "Comunicacion interna",
    title: "Canal de feedback",
    useCase: "Recibir comentarios de empleados en tiempo real.",
    variables: ["job_name"],
    prompt:
      "Propone un sistema de retroalimentacion interna para colaboradores de {{job_name}}. Define canales, anonimato, tiempos de respuesta, responsables y metricas de confianza.",
  },
  {
    id: "wellness-program",
    category: "Bienestar y salud laboral",
    title: "Programa de bienestar",
    useCase: "Mejorar salud fisica, mental y financiera.",
    variables: ["job_name", "work_schedule"],
    prompt:
      "Desarrolla un programa de bienestar para colaboradores de {{job_name}} con horario {{work_schedule}}. Incluye salud fisica, mental, financiera, ergonomia, comunicacion y KPIs.",
  },
  {
    id: "wellness-burnout",
    category: "Bienestar y salud laboral",
    title: "Prevencion de agotamiento",
    useCase: "Detectar y reducir burnout.",
    variables: ["job_name", "work_schedule"],
    prompt:
      "Crea un plan para prevenir agotamiento en {{job_name}}. Incluye factores de riesgo por {{work_schedule}}, senales tempranas, acciones de lideres y ruta de apoyo.",
  },
  {
    id: "wellness-return-to-work",
    category: "Bienestar y salud laboral",
    title: "Regreso al trabajo",
    useCase: "Acompanamiento tras ausencia medica o personal.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Disena un plan de regreso al trabajo para {{candidate_name}} en {{job_name}}. Incluye ajustes razonables, comunicacion, seguimiento, confidencialidad y medicion de reintegracion.",
  },
  {
    id: "wellness-mental-health",
    category: "Bienestar y salud laboral",
    title: "Apoyo a salud mental",
    useCase: "Crear ruta de apoyo y recursos.",
    variables: ["job_name"],
    prompt:
      "Crea un programa de apoyo a salud mental para colaboradores de {{job_name}}. Incluye recursos, canales de ayuda, capacitacion a lideres, confidencialidad y metricas.",
  },
  {
    id: "wellness-occupational-health",
    category: "Bienestar y salud laboral",
    title: "Salud ocupacional",
    useCase: "Gestionar seguridad y bienestar operativo.",
    variables: ["job_name"],
    prompt:
      "Desarrolla un plan de salud ocupacional para {{job_name}}. Incluye evaluacion de riesgos, prevencion, capacitacion, reportes, indicadores y mejora continua.",
  },
  {
    id: "dei-action-plan",
    category: "Diversidad e inclusion",
    title: "Plan DEI",
    useCase: "Promover diversidad, equidad e inclusion.",
    variables: ["job_name"],
    prompt:
      "Desarrolla un plan de accion para promover diversidad e inclusion en procesos relacionados con {{job_name}}. Incluye diagnostico, objetivos, iniciativas, responsables y metricas.",
  },
  {
    id: "dei-inclusive-recruiting",
    category: "Diversidad e inclusion",
    title: "Reclutamiento inclusivo",
    useCase: "Reducir sesgos en atraccion y seleccion.",
    variables: ["job_name", "job_target_profile"],
    prompt:
      "Crea una estrategia de reclutamiento inclusivo para {{job_name}}. Revisa lenguaje de vacante, canales, criterios de seleccion, sesgos potenciales y evaluacion objetiva de {{job_target_profile}}.",
  },
  {
    id: "dei-accessibility",
    category: "Diversidad e inclusion",
    title: "Accesibilidad y ajustes razonables",
    useCase: "Incluir personas con discapacidad.",
    variables: ["job_name", "work_schedule"],
    prompt:
      "Disena un plan para promover inclusion de personas con discapacidad en {{job_name}}. Incluye ajustes razonables, accesibilidad, comunicacion, entrevista y seguimiento en {{work_schedule}}.",
  },
  {
    id: "dei-audit",
    category: "Diversidad e inclusion",
    title: "Auditoria DEI",
    useCase: "Medir brechas e iniciativas.",
    variables: ["job_name"],
    prompt:
      "Crea una auditoria de diversidad e inclusion para equipos de {{job_name}}. Define datos a revisar, preguntas, indicadores, riesgos, hallazgos esperados y plan de mejora.",
  },
  {
    id: "dei-culture",
    category: "Diversidad e inclusion",
    title: "Cultura de respeto",
    useCase: "Mejorar reuniones, lenguaje y convivencia.",
    variables: ["job_name"],
    prompt:
      "Desarrolla una estrategia para crear cultura de respeto e inclusion en equipos de {{job_name}}. Incluye normas de reunion, canales de reporte, capacitacion y medicion.",
  },
  {
    id: "conflict-resolution-script",
    category: "Gestion de conflictos",
    title: "Guion de mediacion",
    useCase: "Conducir reuniones de resolucion.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Crea un guion para una reunion de resolucion de conflictos relacionada con {{candidate_name}} en {{job_name}}. Incluye apertura, reglas, preguntas, acuerdos y seguimiento.",
  },
  {
    id: "conflict-early-warning",
    category: "Gestion de conflictos",
    title: "Deteccion temprana",
    useCase: "Identificar conflictos emergentes.",
    variables: ["job_name"],
    prompt:
      "Desarrolla un plan para identificar conflictos emergentes en equipos de {{job_name}}. Incluye senales tempranas, canales, responsables, protocolo de intervencion y metricas.",
  },
  {
    id: "conflict-virtual-teams",
    category: "Gestion de conflictos",
    title: "Conflictos en equipos virtuales",
    useCase: "Gestionar tensiones remotas o hibridas.",
    variables: ["job_name", "work_schedule"],
    prompt:
      "Disena un enfoque para resolver conflictos en equipos virtuales de {{job_name}} con horario {{work_schedule}}. Incluye comunicacion asincrona, acuerdos, escalamiento y seguimiento.",
  },
  {
    id: "conflict-leadership",
    category: "Gestion de conflictos",
    title: "Conflictos de liderazgo",
    useCase: "Abordar tensiones con mandos o supervisores.",
    variables: ["job_name"],
    prompt:
      "Crea un plan para resolver conflictos relacionados con liderazgo en {{job_name}}. Incluye diagnostico, entrevista a partes, acuerdos, coaching y medicion de avance.",
  },
  {
    id: "conflict-policy",
    category: "Gestion de conflictos",
    title: "Politica de resolucion",
    useCase: "Formalizar reglas y canales.",
    variables: ["job_name"],
    prompt:
      "Desarrolla una politica de resolucion constructiva de conflictos para equipos de {{job_name}}. Incluye principios, proceso, confidencialidad, tiempos y responsables.",
  },
  {
    id: "policy-framework",
    category: "Politicas y cumplimiento",
    title: "Politica integral",
    useCase: "Crear o actualizar una politica de RH.",
    variables: ["job_name"],
    prompt:
      "Desarrolla una politica integral de RH relacionada con {{job_name}}. Incluye objetivo, alcance, lineamientos, roles, cumplimiento, comunicacion y revision periodica.",
  },
  {
    id: "policy-audit",
    category: "Politicas y cumplimiento",
    title: "Auditoria de cumplimiento",
    useCase: "Revisar adopcion de politicas.",
    variables: ["job_name"],
    prompt:
      "Crea un sistema para auditar cumplimiento de politicas aplicables a {{job_name}}. Incluye evidencias, frecuencia, responsables, matriz de riesgo y acciones correctivas.",
  },
  {
    id: "policy-training",
    category: "Politicas y cumplimiento",
    title: "Capacitacion en politicas",
    useCase: "Formar equipos en reglas internas.",
    variables: ["job_name"],
    prompt:
      "Disena un plan de capacitacion sobre politicas para colaboradores de {{job_name}}. Incluye modulos, evaluacion, comunicacion, registro de asistencia y refuerzos.",
  },
  {
    id: "policy-change",
    category: "Politicas y cumplimiento",
    title: "Cambio de politica",
    useCase: "Comunicar cambios sensibles.",
    variables: ["job_name"],
    prompt:
      "Crea un plan para comunicar y gestionar cambios en politicas que afectan a {{job_name}}. Incluye impactos, mensajes, FAQ, aprobaciones, calendario y canal de dudas.",
  },
  {
    id: "policy-new-hire",
    category: "Politicas y cumplimiento",
    title: "Politicas para nuevos ingresos",
    useCase: "Incluir cumplimiento en onboarding.",
    variables: ["candidate_name", "job_name"],
    prompt:
      "Prepara una guia para explicar politicas clave a {{candidate_name}} durante su ingreso a {{job_name}}. Incluye resumen, ejemplos, confirmacion de lectura y dudas frecuentes.",
  },
  {
    id: "engagement-strategy",
    category: "Compromiso y retencion",
    title: "Estrategia de compromiso",
    useCase: "Aumentar motivacion y pertenencia.",
    variables: ["job_name"],
    prompt:
      "Desarrolla una estrategia para aumentar compromiso de colaboradores de {{job_name}}. Incluye diagnostico, acciones, comunicacion, reconocimiento, seguimiento y KPIs.",
  },
  {
    id: "engagement-recognition",
    category: "Compromiso y retencion",
    title: "Reconocimiento",
    useCase: "Premiar logros individuales y de equipo.",
    variables: ["job_name"],
    prompt:
      "Crea un modelo de reconocimiento para equipos de {{job_name}}. Incluye criterios, tipos de reconocimiento, frecuencia, comunicacion, equidad y medicion del impacto.",
  },
  {
    id: "engagement-critical-roles",
    category: "Compromiso y retencion",
    title: "Retencion de roles criticos",
    useCase: "Reducir rotacion de puestos clave.",
    variables: ["job_name", "offer_details"],
    prompt:
      "Disena una estrategia para retener colaboradores en roles criticos de {{job_name}}. Incluye riesgos de salida, entrevistas de permanencia, desarrollo, compensacion y {{offer_details}}.",
  },
  {
    id: "engagement-remote-teams",
    category: "Compromiso y retencion",
    title: "Motivacion en equipos remotos",
    useCase: "Mantener conexion y seguimiento.",
    variables: ["job_name", "work_schedule"],
    prompt:
      "Crea una estrategia para involucrar y motivar equipos remotos de {{job_name}} con horario {{work_schedule}}. Incluye rituales, comunicacion, bienestar, objetivos y alertas tempranas.",
  },
  {
    id: "engagement-continuous-feedback",
    category: "Compromiso y retencion",
    title: "Feedback continuo",
    useCase: "Crear bucles de mejora permanente.",
    variables: ["job_name"],
    prompt:
      "Desarrolla un programa de retroalimentacion continua para equipos de {{job_name}}. Incluye frecuencia, canales, preguntas, responsables, acciones y forma de cerrar el ciclo.",
  },
];
