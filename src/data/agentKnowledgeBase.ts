// Base de conocimiento completa del agente reclutador
// Cubre todas las preguntas frecuentes, objeciones y respuestas del proceso de reclutamiento

export type KnowledgeEntry = {
  id: string;
  category: string;
  questions: string[]; // variantes de la pregunta
  answer: string;
  tags: string[];
};

export const AGENT_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ─── VACANTES Y PUESTOS ───────────────────────────────────────────────────
  {
    id: "kb-vacantes-disponibles",
    category: "vacantes",
    questions: [
      "que vacantes tienen", "hay trabajo", "buscan personal", "tienen empleo",
      "cuales son los puestos", "que puestos hay", "en que puedo trabajar",
      "que plazas tienen disponibles", "tienen contrataciones", "estan contratando",
    ],
    answer: `Contamos con las siguientes vacantes disponibles en Iztapalapa, CDMX:

1. Ayudante General — $2,000 semanales
2. Asesor Comercial — $2,300 semanales
3. Supervisor de Area — $2,600 semanales
4. Volantero / Promotor — sueldo por confirmar segun campana

Todos los puestos incluyen prestaciones de ley desde el primer dia. ¿Te interesa conocer los detalles de alguno?`,
    tags: ["vacantes", "puestos", "trabajo", "empleo"],
  },
  {
    id: "kb-sueldo-general",
    category: "vacantes",
    questions: [
      "cuanto pagan", "cual es el sueldo", "cuanto se gana", "cuanto es el salario",
      "cuanto me van a pagar", "que sueldo ofrecen", "cuanto da de sueldo",
    ],
    answer: `Los sueldos varían según el puesto:

- Ayudante General: $2,000 semanales
- Asesor Comercial: $2,300 semanales + bonos por metas
- Supervisor de Area: $2,600 semanales + bono de productividad
- Volantero: se confirma según la campaña activa

Todos los pagos son puntuales y con prestaciones de ley. ¿Te interesa alguno en especial?`,
    tags: ["sueldo", "salario", "pago", "dinero"],
  },
  {
    id: "kb-horario-general",
    category: "vacantes",
    questions: [
      "cual es el horario", "que horario manejan", "como son los horarios",
      "cuantas horas se trabaja", "es tiempo completo", "hay medio tiempo",
      "se trabaja sabado", "se trabaja domingo", "cuantos dias a la semana",
    ],
    answer: `Los horarios según puesto:

- Ayudante General: Lunes a viernes 9am–6pm, sábados 9am–5pm
- Asesor Comercial: Lunes a viernes 8am–6pm, sábados 8am–5pm
- Supervisor de Area: Lunes a sábado 8am–6pm

No se trabaja domingo. ¿Cuál es tu disponibilidad de horario?`,
    tags: ["horario", "dias", "turno", "tiempo"],
  },
  {
    id: "kb-ubicacion-trabajo",
    category: "ubicacion",
    questions: [
      "donde estan", "donde queda", "cual es la direccion", "donde es la empresa",
      "en que zona trabajan", "como llego", "donde se trabaja", "donde es",
    ],
    answer: `Estamos ubicados en:

📍 Av. Tláhuac 3632 A301, Col. Culhuacan, C.P. 09800, Iztapalapa, CDMX

Referencia: a un costado del Metro Culhuacán dirección Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.

¿Tienes facilidad de trasladarte a esa zona?`,
    tags: ["ubicacion", "direccion", "donde", "lugar", "zona"],
  },

  // ─── REQUISITOS Y PERFIL ─────────────────────────────────────────────────
  {
    id: "kb-requisitos-generales",
    category: "requisitos",
    questions: [
      "que se necesita", "cuales son los requisitos", "que piden", "que necesito para aplicar",
      "que documentos piden", "que papeles necesito", "tengo que llevar algo",
    ],
    answer: `Los requisitos generales son:

✅ Actitud proactiva y ganas de aprender
✅ Disponibilidad de horario completo
✅ Residir o trasladarse a Iztapalapa, CDMX

Para la entrevista, llevar:
- CV o solicitud de empleo
- INE
- CURP
- Comprobante de domicilio
- Comprobante de estudios
- Acta de nacimiento

Si te falta algún documento, puedes entregarlo después. Lo importante es asistir. ¿Tienes disponibilidad esta semana?`,
    tags: ["requisitos", "documentos", "perfil", "necesito"],
  },
  {
    id: "kb-experiencia",
    category: "requisitos",
    questions: [
      "necesito experiencia", "piden experiencia", "sin experiencia puedo aplicar",
      "tengo que tener experiencia", "es para personas sin experiencia",
      "recien egresado puedo", "primera vez trabajando",
    ],
    answer: `¡No necesitas experiencia para varios puestos!

- Ayudante General y Volantero: NO requieren experiencia previa, solo actitud y ganas.
- Asesor Comercial: se valora experiencia en ventas pero también se evalúa el potencial.
- Supervisor: sí requiere mínimo 1 año liderando equipos.

¿Cuánta experiencia laboral tienes?`,
    tags: ["experiencia", "sin experiencia", "primer trabajo"],
  },
  {
    id: "kb-escolaridad",
    category: "requisitos",
    questions: [
      "que estudios piden", "necesito titulo", "necesito carrera", "tengo primaria puedo",
      "nivel de estudios requerido", "necesito bachillerato", "trunca sirve",
    ],
    answer: `El nivel de estudios varía por puesto:

- Ayudante General / Volantero: escolaridad básica o media (primaria, secundaria o más)
- Asesor Comercial: deseable bachillerato
- Supervisor: bachillerato concluido

Lo más importante es la actitud. ¿Cuál es tu último grado de estudios?`,
    tags: ["estudios", "escolaridad", "titulo", "bachillerato"],
  },
  {
    id: "kb-edad",
    category: "requisitos",
    questions: [
      "que edad piden", "hay limite de edad", "soy mayor puedo", "tengo 40 años puedo",
      "soy joven puedo", "cuantos años hay que tener", "acepta mayores de 45",
    ],
    answer: `No hay límite de edad superior. Evaluamos a las personas por sus competencias y actitud, no por la edad.

Para menores de edad:
- Menos de 16 años: no podemos continuar el proceso por cumplimiento laboral.
- 16–17 años: pueden aplicar con permiso firmado del tutor legal.
- 18 años en adelante: proceso normal sin restricciones.

¿Cuántos años tienes?`,
    tags: ["edad", "mayor", "joven", "limite"],
  },

  // ─── PRESTACIONES Y BENEFICIOS ────────────────────────────────────────────
  {
    id: "kb-prestaciones",
    category: "beneficios",
    questions: [
      "que prestaciones tienen", "hay seguro", "tienen imss", "dan infonavit",
      "hay vacaciones pagadas", "dan aguinaldo", "que beneficios ofrecen",
      "tienen seguro social", "que incluye el empleo",
    ],
    answer: `Todos los puestos incluyen prestaciones de ley desde el primer día:

✅ IMSS desde el día 1
✅ INFONAVIT
✅ Vacaciones pagadas
✅ Aguinaldo
✅ Prima vacacional

Adicionalmente según puesto:
- Uniformes gratuitos (Ayudante General)
- Capacitación pagada (Asesor Comercial)
- Bonos por productividad (Supervisor y Comercial)
- Oportunidades de crecimiento interno

¿Hay alguna prestación en particular que te interese confirmar?`,
    tags: ["prestaciones", "imss", "beneficios", "seguro", "infonavit"],
  },
  {
    id: "kb-bonos-comisiones",
    category: "beneficios",
    questions: [
      "hay comisiones", "hay bonos", "cuanto se puede ganar extra", "dan premios",
      "hay incentivos", "como funcionan los bonos", "hay comision por venta",
    ],
    answer: `Sí, hay incentivos adicionales:

- Asesor Comercial: bonos por cumplimiento de metas de venta
- Supervisor: bono de productividad por resultados del equipo

Los bonos se detallan durante la entrevista ya que dependen de los resultados del mes. ¿Te interesa el área comercial o de liderazgo?`,
    tags: ["bonos", "comisiones", "incentivos", "extra"],
  },

  // ─── PROCESO DE RECLUTAMIENTO ─────────────────────────────────────────────
  {
    id: "kb-proceso-reclutamiento",
    category: "proceso",
    questions: [
      "como es el proceso", "como aplico", "como me registro", "que sigue",
      "cuales son los pasos", "como es la contratacion", "como empiezo",
      "que tengo que hacer para entrar", "como puedo postularme",
    ],
    answer: `El proceso es rápido y sencillo:

1️⃣ Conversación inicial por WhatsApp (datos básicos y vacante de interés)
2️⃣ Preselección y asignación de entrevista
3️⃣ Entrevista presencial en nuestras oficinas
4️⃣ Resultado en el mismo día o siguiente hábil
5️⃣ Ingreso y capacitación inicial

Todo el proceso puede completarse en menos de una semana. ¿Empezamos?`,
    tags: ["proceso", "pasos", "como aplico", "contratacion"],
  },
  {
    id: "kb-cuando-ingresan",
    category: "proceso",
    questions: [
      "cuando puedo entrar", "cuando empiezo", "cuando es el ingreso",
      "cuando me llaman", "cuanto tiempo tarda", "hay fecha de entrada",
    ],
    answer: `El ingreso puede ser muy pronto. Una vez que pasas la entrevista, el proceso de contratación tarda entre 2 y 5 días hábiles.

Tenemos necesidad inmediata de personal, así que mientras antes agendes tu entrevista, antes podrías estar incorporándote.

¿Te funciona esta semana para la entrevista?`,
    tags: ["ingreso", "cuando", "fecha", "entrada"],
  },

  // ─── ENTREVISTA ───────────────────────────────────────────────────────────
  {
    id: "kb-entrevista-como-es",
    category: "entrevista",
    questions: [
      "como es la entrevista", "que me preguntan", "es dificil la entrevista",
      "que pasa en la entrevista", "cuanto dura la entrevista", "hay examen",
    ],
    answer: `La entrevista es presencial y muy amigable, dura aproximadamente 20–30 minutos.

Durante la entrevista:
- Te explicamos el puesto con detalle
- Conocemos tu experiencia y expectativas
- Resolvemos todas tus dudas
- No hay examen escrito

Es una conversación normal, no hay nada de qué preocuparse. ¿Tienes alguna duda sobre lo que se revisa?`,
    tags: ["entrevista", "como es", "que pasa", "examen"],
  },
  {
    id: "kb-entrevista-documentos",
    category: "entrevista",
    questions: [
      "que llevo a la entrevista", "que documentos traigo", "que necesito para la entrevista",
      "que papeles llevo", "tengo que llevar cv", "necesito traer algo",
    ],
    answer: `Para la entrevista te pedimos llevar copias de:

📋 CV o solicitud de empleo
🪪 INE
📄 CURP
📄 RFC
🏠 Comprobante de domicilio
🎓 Comprobante de estudios
📜 Acta de nacimiento
💼 NSS (número de seguridad social)

Si no tienes todos los documentos, no te preocupes. Puedes llevar lo que tengas disponible y el resto lo entregas después. Lo importante es asistir.`,
    tags: ["documentos", "entrevista", "llevar", "papeles"],
  },
  {
    id: "kb-entrevista-agendar",
    category: "entrevista",
    questions: [
      "cuando hay entrevistas", "puedo ir hoy", "puedo ir manana", "cuando me citan",
      "que dia hay citas", "como agendo", "cuando puedo ir", "hay lugar esta semana",
    ],
    answer: `Tenemos disponibilidad esta semana. Los horarios de entrevista son de lunes a viernes en horario de oficina.

Para apartar tu lugar, solo necesito confirmarte:
1. ¿Qué día te funciona mejor?
2. ¿Prefieres por la mañana o por la tarde?

Así te asigno el horario exacto y te confirmo todo por aquí.`,
    tags: ["agendar", "cita", "cuando", "entrevista", "disponibilidad"],
  },
  {
    id: "kb-entrevista-reagendar",
    category: "entrevista",
    questions: [
      "no puedo ir", "necesito cambiar mi cita", "puedo cambiar el horario",
      "me surgio algo", "no voy a poder asistir", "puedo mover mi cita",
      "cancele mi entrevista", "quiero reagendar",
    ],
    answer: `Por supuesto, entendemos que pueden surgir imprevistos.

Dime cuándo tienes disponibilidad y con gusto buscamos el siguiente horario disponible para reagendarte sin problema.

¿Qué día y horario te funcionaría mejor?`,
    tags: ["reagendar", "cancelar", "cambiar", "cita", "mover"],
  },
  {
    id: "kb-entrevista-ubicacion",
    category: "entrevista",
    questions: [
      "donde es la entrevista", "donde va a ser", "a donde voy", "donde queda la oficina",
      "como llego a la entrevista", "tienen estacionamiento",
    ],
    answer: `La entrevista es presencial en nuestras oficinas:

📍 Av. Tláhuac 3632 A301, Col. Culhuacan, C.P. 09800, Iztapalapa, CDMX

🚇 Referencia: a un costado del Metro Culhuacán dirección Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.

¿Tienes facilidad para llegar a esa dirección?`,
    tags: ["ubicacion", "entrevista", "donde", "como llego"],
  },

  // ─── SEGUIMIENTO POST-ENTREVISTA ──────────────────────────────────────────
  {
    id: "kb-resultado-entrevista",
    category: "seguimiento",
    questions: [
      "cuando me dan resultado", "cuando me llaman", "cuando saben si quedo",
      "cuanto tardan en contestar", "ya se sabe algo", "que paso con mi entrevista",
    ],
    answer: `Después de tu entrevista, el resultado se da en el mismo día o al siguiente día hábil.

Si no has recibido respuesta, es posible que estemos revisando perfiles. ¿Cuándo fue tu entrevista? Te ayudo a verificar el estatus de tu solicitud con el equipo.`,
    tags: ["resultado", "respuesta", "cuando", "quede", "seguimiento"],
  },
  {
    id: "kb-ya-entre-que-sigue",
    category: "seguimiento",
    questions: [
      "ya quede", "me dijeron que si", "cuando empiezo", "ya me aceptaron que hago",
      "que documentos necesito para entrar", "cuando es mi primer dia",
    ],
    answer: `¡Excelente noticia! Para tu ingreso necesitas tener listos:

📋 Documentos completos (los que mencionamos antes)
👔 Presentación adecuada para el primer día
🕗 Puntualidad en el horario de entrada

El equipo de RH te confirmará la fecha exacta de inicio y los detalles del proceso de inducción. ¿Ya tienes todos los documentos listos?`,
    tags: ["ingreso", "primer dia", "quede", "contratado"],
  },

  // ─── OBJECIONES FRECUENTES ────────────────────────────────────────────────
  {
    id: "kb-objecion-lejos",
    category: "objeciones",
    questions: [
      "me queda lejos", "esta muy lejos", "no quedo cerca", "no puedo llegar",
      "no tengo como llegar", "vivo en otra zona", "es muy lejos del metro",
    ],
    answer: `Entiendo que la distancia puede ser un factor importante.

La oficina está justo al lado del Metro Culhuacán, lo que facilita bastante el traslado desde varias partes de la ciudad.

¿Desde qué zona o colonia te estarías trasladando? Así te puedo indicar la ruta más conveniente.`,
    tags: ["lejos", "distancia", "traslado", "como llego"],
  },
  {
    id: "kb-objecion-sueldo-bajo",
    category: "objeciones",
    questions: [
      "esta bajo el sueldo", "pagan poco", "espero mas", "quiero mas dinero",
      "eso no alcanza", "busco algo mejor pagado", "mi expectativa es mayor",
    ],
    answer: `Entendemos que el salario es importante en tu decisión.

El sueldo base es el punto de partida, pero tenemos incentivos adicionales como bonos y comisiones según el puesto. Además, hay plan de crecimiento interno donde el salario mejora con el tiempo.

¿Cuál es tu expectativa de ingreso? Así te oriento hacia el puesto que mejor se adapte.`,
    tags: ["sueldo", "poco", "bajo", "expectativa", "mas dinero"],
  },
  {
    id: "kb-objecion-ya-trabajo",
    category: "objeciones",
    questions: [
      "ya tengo trabajo", "estoy trabajando", "no busco empleo",
      "solo me llego el mensaje", "no me interesa", "no busco por ahora",
    ],
    answer: `Sin problema, lo entiendo perfectamente.

Si en algún momento buscas un cambio o una mejor oportunidad, aquí estaremos. ¿Me permites guardarte en nuestra base de contactos para cuando se abran vacantes que puedan interesarte?`,
    tags: ["ya trabaja", "no interesa", "ocupado"],
  },
  {
    id: "kb-objecion-edad-mayor",
    category: "objeciones",
    questions: [
      "tengo 50 años contratan", "soy mayor de edad contratan", "discriminan por edad",
      "hay limite por la edad", "con mi edad puedo", "soy grande para el puesto",
    ],
    answer: `¡Claro que sí! No tenemos límite de edad superior. Valoramos la experiencia y madurez que traen los candidatos con trayectoria.

Lo que más nos importa es la actitud, la disponibilidad y las ganas de contribuir. ¿En qué área tienes más experiencia?`,
    tags: ["edad mayor", "discriminacion", "limite edad"],
  },
  {
    id: "kb-objecion-no-experiencia",
    category: "objeciones",
    questions: [
      "no tengo experiencia", "nunca he trabajado", "es mi primer empleo",
      "no se si califico", "tengo poca experiencia",
    ],
    answer: `¡No te preocupes! Tenemos puestos diseñados exactamente para personas que están empezando.

El puesto de Ayudante General es ideal si es tu primer trabajo. No se requiere experiencia previa, solo actitud y ganas de aprender. Te capacitamos desde cero.

¿Te interesa conocer más detalles?`,
    tags: ["sin experiencia", "primer empleo", "nuevo"],
  },

  // ─── PREGUNTAS SOBRE LA EMPRESA ───────────────────────────────────────────
  {
    id: "kb-empresa-info",
    category: "empresa",
    questions: [
      "a que se dedica la empresa", "que hace la empresa", "que tipo de empresa es",
      "de que es heavenly dreams", "cuanto tiempo tiene la empresa",
      "es empresa seria", "en que sector trabajan",
    ],
    answer: `Heavenly Dreams es una empresa dedicada al reclutamiento y colocación de talento humano en el área metropolitana de la CDMX.

Contamos con varios años de operación, procesos formales de contratación y un equipo comprometido con el desarrollo de nuestros colaboradores. Todas las contrataciones son con alta al IMSS desde el primer día.

¿Tienes alguna duda específica sobre la empresa?`,
    tags: ["empresa", "que hacen", "info", "heavenly dreams"],
  },
  {
    id: "kb-empresa-confiable",
    category: "empresa",
    questions: [
      "es confiable", "es fraude", "es real", "como se que no es estafa",
      "piden dinero", "cobran por la entrevista", "tienen redes sociales",
    ],
    answer: `Heavenly Dreams es una empresa 100% formal y confiable.

✅ No cobramos nada por el proceso de reclutamiento
✅ Todas las contrataciones incluyen alta al IMSS desde el primer día
✅ Contrato de trabajo firmado
✅ Pagos puntuales semanales

Nunca pedimos dinero en ninguna etapa del proceso. Si alguien te solicita pago en nuestro nombre, repórtalo inmediatamente.

¿Tienes alguna otra duda?`,
    tags: ["confiable", "fraude", "estafa", "dinero", "real"],
  },

  // ─── CANAL Y COMUNICACION ─────────────────────────────────────────────────
  {
    id: "kb-hablar-humano",
    category: "atencion",
    questions: [
      "quiero hablar con alguien", "con una persona", "hay humano",
      "no es robot", "quiero un asesor", "me pueden llamar",
      "puedo hablar con rh", "tienen telefono",
    ],
    answer: `Claro, si prefieres hablar directamente con alguien del equipo de RH, puedo canalizarte con un asesor humano.

En este momento atiendo yo de forma automática para darte información rápida, pero si necesitas algo específico que no puedo resolver aquí, te conecto con el equipo.

¿Qué necesitas que revisen?`,
    tags: ["humano", "persona", "hablar", "asesor", "telefono"],
  },
];

// Índice por categoría para búsqueda rápida
export const KB_BY_CATEGORY = AGENT_KNOWLEDGE_BASE.reduce(
  (acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  },
  {} as Record<string, KnowledgeEntry[]>
);

// Todas las categorías disponibles
export const KB_CATEGORIES = [
  "vacantes",
  "requisitos",
  "beneficios",
  "proceso",
  "entrevista",
  "seguimiento",
  "objeciones",
  "empresa",
  "ubicacion",
  "atencion",
] as const;

// Texto plano para inyectar en el prompt del agente
export function buildKnowledgeBasePrompt(): string {
  const sections = KB_CATEGORIES.map((cat) => {
    const entries = KB_BY_CATEGORY[cat];
    if (!entries?.length) return "";

    const catLabel: Record<string, string> = {
      vacantes: "VACANTES Y PUESTOS",
      requisitos: "REQUISITOS Y PERFIL",
      beneficios: "PRESTACIONES Y BENEFICIOS",
      proceso: "PROCESO DE RECLUTAMIENTO",
      entrevista: "ENTREVISTAS",
      seguimiento: "SEGUIMIENTO POST-ENTREVISTA",
      objeciones: "MANEJO DE OBJECIONES",
      empresa: "INFORMACION DE LA EMPRESA",
      ubicacion: "UBICACION",
      atencion: "ATENCION AL CANDIDATO",
    };

    const items = entries
      .map((e) => `P: ${e.questions[0]}\nR: ${e.answer}`)
      .join("\n\n");

    return `## ${catLabel[cat] || cat.toUpperCase()}\n\n${items}`;
  });

  return `BASE DE CONOCIMIENTO DEL AGENTE RECLUTADOR:\n\n${sections.filter(Boolean).join("\n\n---\n\n")}`;
}
