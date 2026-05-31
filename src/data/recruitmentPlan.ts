export const OFFICE_LOCATION = {
  name: "Oficina de entrevistas Culhuacan",
  address: "Av. Tlahuac 3632 A301, Col. Culhuacan, C.P. 09800, Iztapalapa, CDMX",
  reference:
    "A un costado del Metro Culhuacan direccion Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.",
};

export const CDMX_RECRUITMENT_PLAN = {
  title: "Plan de reclutamiento CDMX desde oficina Culhuacan",
  summary:
    "Plan operativo para captar candidatos cerca de Av. Tlahuac 3632 A301, priorizando Iztapalapa, Tlahuac, Xochimilco, Coyoacan e Iztacalco por cercania, volumen laboral y conectividad por Metro/avenidas.",
  objectives: [
    "Cubrir Ayudante General, Asesor Comercial, Supervisor de Area y Volantero con candidatos cercanos a la oficina.",
    "Generar al menos 200 conversaciones calificadas por mes desde WhatsApp, Facebook, Instagram, TikTok y referidos.",
    "Convertir minimo 30% de conversaciones calificadas en entrevistas agendadas.",
    "Reducir ausentismo a entrevista confirmando ubicacion, referencia, documentos y recordatorio 24 horas antes.",
  ],
  demographicInsights: [
    "Iztapalapa concentra cerca de 1.8 M de habitantes, PEA aproximada de 70.5%, sectores fuertes en manufactura y comercio, escolaridad media cercana a 10.2 anos.",
    "Tlahuac tiene PEA aproximada de 70.9%, sectores de manufactura y comercio, escolaridad media cercana a 10.15 anos; es zona natural por cercania a la oficina.",
    "Las zonas oriente/sur presentan mas trabajadores informales y perfiles operativos; responden mejor a mensajes claros con sueldo, horario, ubicacion y beneficios.",
    "CDMX tiene alta penetracion de redes sociales; Facebook lidera alcance masivo, Instagram/TikTok funcionan bien con video corto y WhatsApp cierra la conversion.",
    "Horarios recomendados: transporte 7:00-9:00 y 18:00-20:00; redes martes a viernes 10:00-15:00; pruebas de alto engagement miercoles 22:00.",
  ],
  priorityZones: [
    {
      zone: "Primaria",
      areas: "Iztapalapa, Tlahuac, Culhuacan, Taxquena, Ermita, Iztacalco",
      reason: "Cercania a oficina, volumen poblacional, perfiles operativos/comerciales y facilidad de traslado.",
    },
    {
      zone: "Secundaria",
      areas: "Xochimilco, Coyoacan, Venustiano Carranza, G.A. Madero",
      reason: "Bolsa amplia de candidatos, conectividad razonable y posibilidad de captar ventas/supervision.",
    },
    {
      zone: "Expansion",
      areas: "Benito Juarez, Cuauhtemoc, Miguel Hidalgo",
      reason: "Mejor para perfiles administrativos, comerciales formales o campanas de marca empleadora.",
    },
  ],
  candidatePersonas: [
    {
      role: "Ayudante General",
      persona: "Perfil operativo inicial",
      message:
        "No necesitas experiencia previa. Ofrecemos $2,000 semanales, prestaciones de ley, uniformes y crecimiento. Oficina cerca del Metro Culhuacan.",
      channels: "Facebook grupos locales, WhatsApp, volantes en zonas de transporte, referidos.",
    },
    {
      role: "Asesor Comercial",
      persona: "Perfil con facilidad de palabra y gusto por ventas",
      message:
        "Sueldo $2,300 semanales, capacitacion pagada, bonos y plan de carrera. Ideal si te gusta tratar con clientes y cerrar ventas.",
      channels: "Facebook/Instagram Ads, Reels, historias, WhatsApp y publicaciones en grupos de empleo CDMX.",
    },
    {
      role: "Supervisor de Area",
      persona: "Perfil con liderazgo y experiencia coordinando equipos",
      message:
        "Sueldo $2,600 semanales, prestaciones superiores, bono de productividad y estabilidad. Requiere 1 ano liderando equipos y bachillerato.",
      channels: "Facebook, LinkedIn, Indeed, referidos internos y busqueda directa por WhatsApp.",
    },
    {
      role: "Volantero",
      persona: "Perfil extrovertido, energetico y de campo",
      message:
        "Buscamos personas con energia, buena actitud y gusto por hablar con gente. Ideal para iniciar en promocion y ventas.",
      channels: "TikTok, Instagram Reels, Facebook local, activaciones cerca de Metro y zonas comerciales.",
    },
  ],
  channelStrategy: [
    {
      channel: "WhatsApp Baileys",
      use: "Atencion inmediata, precalificacion, envio de vacantes, ubicacion, documentos y confirmacion de entrevista.",
      kpi: "Tiempo de primera respuesta menor a 5 min y 30% de conversion a entrevista.",
    },
    {
      channel: "Facebook e Instagram",
      use: "Campanas geolocalizadas a 5-10 km de Culhuacan/Iztapalapa con posts, reels y carruseles por vacante.",
      kpi: "CTR minimo 2%, costo por conversacion controlado y 200 leads mensuales.",
    },
    {
      channel: "TikTok",
      use: "Videos cortos para Volantero, Ayudante General y Asesor Comercial mostrando sueldo, horario y ambiente.",
      kpi: "Retencion de video, mensajes recibidos y formularios iniciados.",
    },
    {
      channel: "Difusion local",
      use: "Volantes, carteles y referidos cerca de Metro Culhuacan, mercados, zonas comerciales y rutas de transporte.",
      kpi: "Candidatos por zona y asistencia real a entrevista.",
    },
    {
      channel: "Portales/LinkedIn",
      use: "Complemento para Supervisor de Area y perfiles con bachillerato/experiencia comprobable.",
      kpi: "CVs calificados y entrevistas efectivas.",
    },
  ],
  weeklyCadence: [
    "Lunes: publicar vacantes activas y revisar mensajes pendientes.",
    "Martes a jueves 10:00-15:00: activar anuncios y responder leads en caliente.",
    "Miercoles 22:00: prueba de copy/video para medir engagement nocturno.",
    "Viernes: confirmar entrevistas del sabado/lunes y enviar documentos requeridos.",
    "Sabado: entrevistas matutinas, volanteo local y seguimiento de no asistieron.",
  ],
  funnel: [
    "Impresion o volante visto",
    "Mensaje a WhatsApp",
    "Precalificacion: nombre, edad legal, estudios, experiencia, zona y horario",
    "Vacante recomendada",
    "Entrevista agendada",
    "Confirmacion con ubicacion y documentos",
    "Entrevista realizada",
    "Contratacion o seguimiento",
  ],
  metrics: [
    "Conversaciones nuevas por canal",
    "Candidatos calificados por vacante",
    "Entrevistas agendadas y confirmadas",
    "Asistencia a entrevista",
    "Contrataciones por canal",
    "Costo por candidato y costo por contratado",
    "Retencion a 30, 90 y 180 dias",
  ],
  complianceNotes: [
    "Evitar publicar limites de edad o genero salvo justificacion legal documentada.",
    "Usar criterios objetivos: experiencia, disponibilidad, escolaridad requerida y cercania/traslado.",
    "No prometer sueldos o beneficios no confirmados.",
    "Pedir datos personales solo para el proceso y tratarlos como informacion confidencial.",
  ],
};
