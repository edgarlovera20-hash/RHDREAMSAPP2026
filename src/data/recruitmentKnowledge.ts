export type RecruitmentJobTemplate = {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  targetProfile: string;
  ageRange: string;
  experience: string;
  education: string;
  responsibilities: string;
  offer: string;
  schedule: string;
  salaryRange: string;
  benefits: string;
  agentInstructions: string;
  platforms: string[];
};

export type WhatsAppRecruitmentTemplate = {
  id: string;
  title: string;
  stage: "saludo" | "precalificacion" | "vacante" | "entrevista" | "ubicacion";
  body: string;
};

export const INTERVIEW_LOCATION = {
  address: "Av. Tlahuac 3632 A301, Col. Culhuacan, C.P. 09800, Iztapalapa, CDMX",
  reference:
    "A un costado del Metro Culhuacan direccion Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.",
  documents: [
    "CV o solicitud de empleo",
    "INE",
    "CURP",
    "RFC",
    "Comprobante de domicilio",
    "Comprobante de estudios",
    "Acta de nacimiento",
    "NSS",
  ],
};

export const RECRUITMENT_JOB_TEMPLATES: RecruitmentJobTemplate[] = [
  {
    id: "job-ayudante-general-operativo",
    title: "Ayudante General",
    department: "Operativo",
    location: "Iztapalapa, CDMX",
    description:
      "Puesto operativo multifuncional para captura de datos, organizacion de archivos, respaldo de informacion y apoyo en atencion al cliente.",
    targetProfile:
      "Persona proactiva, responsable, con ganas de aprender, buena organizacion y disposicion para apoyar en diferentes funciones operativas.",
    ageRange:
      "Validar mayoria de edad y requisitos legales aplicables. Evitar descartar por edad salvo requerimiento legal documentado.",
    experience: "No requiere experiencia previa. Se valora actitud proactiva y disposicion para aprender.",
    education: "Escolaridad basica o media. Confirmar ultimo grado de estudios durante el primer contacto.",
    responsibilities:
      "Captura de datos, organizacion de archivos, respaldo de informacion, atencion al cliente con material visual y funciones multifuncionales.",
    offer:
      "Sueldo competitivo de $2,000 semanales, pagos puntuales, prestaciones de ley desde el primer dia y uniformes gratuitos.",
    schedule: "Lunes a viernes de 9:00 am a 6:00 pm. Sabados de 9:00 am a 5:00 pm.",
    salaryRange: "$2,000 semanales",
    benefits: "Prestaciones de ley, uniformes gratuitos, excelente ambiente laboral y oportunidad de crecimiento.",
    platforms: ["WhatsApp", "Facebook", "Computrabajo"],
    agentInstructions:
      "Ofrecer esta vacante a candidatos sin experiencia previa o con perfil operativo. Confirmar nombre, edad, estudios, experiencia, disponibilidad de horario y cercania a Iztapalapa antes de agendar entrevista.",
  },
  {
    id: "job-asesor-comercial",
    title: "Asesor Comercial",
    department: "Ventas",
    location: "Iztapalapa, CDMX",
    description:
      "Puesto comercial enfocado en prospeccion, seguimiento de cartera, deteccion de necesidades, cotizaciones, cierre de ventas y servicio post-venta.",
    targetProfile:
      "Persona con facilidad de palabra, excelente presentacion, gusto por ventas, trato con clientes y orientacion a metas.",
    ageRange:
      "Validar mayoria de edad y requisitos legales aplicables. Mantener evaluacion objetiva por competencias.",
    experience: "Deseable experiencia en ventas, atencion a clientes o prospeccion. Puede evaluarse potencial comercial.",
    education: "Bachillerato deseable. Confirmar ultimo grado de estudios.",
    responsibilities:
      "Prospeccion de nuevos clientes, seguimiento de cartera, deteccion de necesidades, cotizaciones, cierre de ventas y servicio post-venta.",
    offer:
      "Sueldo de $2,300 semanales, capacitacion pagada, bonos por cumplimiento de metas y plan de carrera.",
    schedule: "Lunes a viernes de 8:00 am a 6:00 pm. Sabados de 8:00 am a 5:00 pm.",
    salaryRange: "$2,300 semanales",
    benefits: "Capacitacion pagada, bonos por cumplimiento de metas y plan de carrera.",
    platforms: ["WhatsApp", "Facebook", "Instagram"],
    agentInstructions:
      "Ofrecer esta vacante a perfiles con comunicacion clara, presentacion profesional y experiencia o interes en ventas. Preguntar experiencia comercial, disponibilidad, facilidad de traslado y expectativa de ingresos.",
  },
  {
    id: "job-supervisor-area",
    title: "Supervisor de Area",
    department: "Liderazgo",
    location: "Iztapalapa, CDMX",
    description:
      "Puesto de liderazgo para coordinacion de personal, asignacion de tareas, supervision de KPIs, control de calidad, resolucion de conflictos y reportes.",
    targetProfile:
      "Persona con liderazgo, organizacion, comunicacion firme, criterio para resolver conflictos y experiencia coordinando equipos.",
    ageRange:
      "Validar mayoria de edad y requisitos legales aplicables. Priorizar experiencia comprobable liderando equipos.",
    experience: "Experiencia minima de 1 ano liderando equipos.",
    education: "Bachillerato concluido.",
    responsibilities:
      "Coordinacion de personal, asignacion de tareas diarias, supervision de KPIs y calidad de procesos, resolucion de conflictos y elaboracion de reportes.",
    offer:
      "Sueldo de $2,600 semanales, prestaciones superiores a las de ley, bono de productividad y estabilidad laboral.",
    schedule: "Lunes a sabado de 8:00 am a 6:00 pm.",
    salaryRange: "$2,600 semanales",
    benefits: "Prestaciones superiores a las de ley, bono de productividad y estabilidad laboral.",
    platforms: ["WhatsApp", "Facebook", "Indeed"],
    agentInstructions:
      "Ofrecer esta vacante a candidatos con experiencia liderando personal. Confirmar anos de liderazgo, bachillerato concluido, manejo de KPIs, resolucion de conflictos y disponibilidad para horario completo.",
  },
  {
    id: "job-volantero",
    title: "Volantero",
    department: "Promocion",
    location: "Iztapalapa, CDMX",
    description:
      "Puesto de promocion para representar la marca, abordar clientes potenciales en puntos estrategicos y brindar informacion rapida sobre promociones.",
    targetProfile:
      "Persona extrovertida, energetica, con gusto por el trato con gente, actitud positiva, resiliencia e imagen impecable.",
    ageRange:
      "Validar mayoria de edad y requisitos legales aplicables. Evaluar actitud, comunicacion y disponibilidad.",
    experience: "No indispensable. Deseable experiencia en promocion, ventas, atencion al cliente o actividades de campo.",
    education: "Escolaridad basica o media. Confirmar ultimo grado de estudios.",
    responsibilities:
      "Abordar amablemente a clientes potenciales, representar la marca con entusiasmo, brindar informacion de promociones y cumplir metas de distribucion en zonas asignadas.",
    offer:
      "Oportunidad para desarrollar habilidades comerciales, trato con clientes y crecimiento en areas de ventas o promocion.",
    schedule: "Confirmar horario disponible segun zona y campana activa.",
    salaryRange: "Por confirmar segun campana",
    benefits: "Capacitacion inicial, aprendizaje en campo y opcion de crecimiento segun desempeno.",
    platforms: ["WhatsApp", "Facebook", "TikTok"],
    agentInstructions:
      "Ofrecer esta vacante a candidatos extrovertidos y con energia. Preguntar disponibilidad, facilidad para abordar personas, experiencia en campo, zona de residencia y tolerancia al trabajo en calle.",
  },
];

export const WHATSAPP_RECRUITMENT_TEMPLATES: WhatsAppRecruitmentTemplate[] = [
  {
    id: "wa-saludo-precalificacion",
    title: "Saludo y datos iniciales",
    stage: "saludo",
    body:
      "Hola! Gracias por contactarnos. Mi nombre es {{agent_name}}, formo parte del equipo de Recursos Humanos y sera un gusto acompanarte en este proceso.\n\nPara identificar que vacante se ajusta mejor a tu perfil, podrias apoyarme con estos datos?\n\nNombre completo:\nEdad:\nUltimo grado de estudios:\nBreve resumen de tu experiencia laboral:\n\nQuedo atenta a tu respuesta para continuar con el proceso. Muchas gracias.",
  },
  {
    id: "wa-opciones-basicas",
    title: "Opciones recomendadas basicas",
    stage: "precalificacion",
    body:
      "Muchas gracias. Hemos analizado tu informacion y tu perfil se adapta para postularte en estas areas:\n\n- Ayudante General ($2,000 semanales)\n- Asesor Comercial ($2,300 semanales)\n\nTe gustaria recibir los detalles de alguna de ellas?",
  },
  {
    id: "wa-opciones-con-supervisor",
    title: "Opciones recomendadas con supervisor",
    stage: "precalificacion",
    body:
      "Hemos analizado tu informacion y tu perfil se adapta para postularte en estas areas:\n\n- Ayudante General ($2,000 semanales)\n- Asesor Comercial ($2,300 semanales)\n- Supervisor de Personal ($2,600 semanales)\n\nTe gustaria recibir los detalles de alguna de ellas?",
  },
  {
    id: "wa-ayudante-general",
    title: "Detalle Ayudante General",
    stage: "vacante",
    body:
      "AYUDANTE GENERAL\n\nQue haras con nosotros?\n- Captura de datos y organizacion de archivos.\n- Respaldo de informacion para asegurar nuestros procesos.\n- Atencion al cliente apoyandote con material visual.\n- Funciones multifuncionales.\n\nQue ofrecemos?\n- Sueldo: $2,000 semanales.\n- Pagos puntuales.\n- Prestaciones de ley desde el primer dia.\n- Uniformes gratuitos.\n- Excelente ambiente laboral y oportunidad de crecimiento.\n\nSolo necesitas actitud proactiva y ganas de aprender. No necesitas experiencia previa.\n\nHorario: Lunes a viernes 9:00 am a 6:00 pm. Sabados 9:00 am a 5:00 pm.",
  },
  {
    id: "wa-asesor-comercial",
    title: "Detalle Asesor Comercial",
    stage: "vacante",
    body:
      "ASESOR COMERCIAL\n\nFunciones:\n- Prospeccion de nuevos clientes y seguimiento de cartera.\n- Deteccion de necesidades, cotizaciones y cierre de ventas.\n- Servicio post-venta para garantizar fidelizacion.\n\nOfrecemos:\n- Sueldo: $2,300 semanales.\n- Capacitacion pagada.\n- Bonos por cumplimiento de metas.\n- Plan de carrera.\n\nRequisitos: facilidad de palabra y excelente presentacion.\nHorario: Lunes a viernes 8:00 am a 6:00 pm. Sabados 8:00 am a 5:00 pm.",
  },
  {
    id: "wa-supervisor-area",
    title: "Detalle Supervisor de Area",
    stage: "vacante",
    body:
      "SUPERVISOR DE AREA\n\nFunciones:\n- Coordinacion de personal y asignacion de tareas diarias.\n- Supervision de KPIs y calidad de procesos.\n- Resolucion de conflictos.\n- Elaboracion de reportes de resultados.\n\nOfrecemos:\n- Sueldo: $2,600 semanales.\n- Prestaciones superiores a las de ley.\n- Bono de productividad.\n- Estabilidad laboral.\n\nRequisitos: experiencia minima de 1 ano liderando equipos y bachillerato concluido.\nHorario: Lunes a sabado 8:00 am a 6:00 pm.",
  },
  {
    id: "wa-volantero",
    title: "Detalle Volantero",
    stage: "vacante",
    body:
      "VOLANTERO\n\nEres extrovertido, tienes energia y te encanta el trato con la gente? Buscamos tu talento para ser embajador de nuestra marca.\n\nQue haras?\n- Abordar amablemente a clientes potenciales en puntos estrategicos.\n- Representar la marca con entusiasmo e imagen impecable.\n- Brindar informacion rapida sobre promociones.\n- Cumplir metas de distribucion en zonas asignadas.\n\nBuscamos habilidad para romper el hielo, actitud positiva y resiliencia.",
  },
  {
    id: "wa-agendar-entrevista",
    title: "Agendar entrevista",
    stage: "entrevista",
    body:
      "Muy bien, podemos agendar una entrevista para conocer mas de tu trayectoria profesional, explicarte la propuesta en persona y resolver cualquier duda.\n\nTe funcionaria asistir el dia {{interview_date}} a las {{interview_time}}?\n\nEstamos ubicados en {{interview_address}}.\n\nSolo podrias confirmarme si esta bien ese dia y horario.",
  },
  {
    id: "wa-ubicacion",
    title: "Ubicacion y referencia",
    stage: "ubicacion",
    body:
      "Nos encontramos ubicados en Av. Tlahuac 3632 A301, Col. Culhuacan, C.P. 09800, Iztapalapa, CDMX.\n\nReferencia: a un costado del Metro Culhuacan direccion Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.",
  },
  {
    id: "wa-confirmacion-entrevista",
    title: "Confirmacion de entrevista",
    stage: "entrevista",
    body:
      "Listo! Te esperamos para tu entrevista:\n\nDia: {{interview_date}}\nHora: {{interview_time}}\n\nFavor de traer copias de:\n- CV o solicitud de empleo\n- INE, CURP y RFC\n- Comprobante de domicilio y estudios\n- Acta de nacimiento y NSS\n\nSi te falta alguno, puedes entregarlo despues.\n\nDireccion: Av. Tlahuac 3632 A301, Col. Culhuacan, C.P. 09800, Iztapalapa, CDMX.\nReferencia: a un costado del Metro Culhuacan direccion Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.\n\nCualquier duda estoy aqui para ayudarte.",
  },
];
