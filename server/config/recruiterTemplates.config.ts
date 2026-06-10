/**
 * Plantillas profesionales de reclutamiento — Heavenly Dreams
 * Reclutadora con 10+ años de experiencia
 * Agente: Karla / Sofia (configurable)
 */

export const AGENT_NAME = process.env.RECRUITER_AGENT_NAME || "Karla";
export const COMPANY_NAME = "Heavenly Dreams";
export const LOCATION = "Av. Tláhuac 3632 A301, Col. Culhuacan, Iztapalapa, CDMX";
export const METRO_REF = "Metro Culhuacán dirección Mixcoac, junto a Farmacias Similares";

// ─── SALUDOS INICIALES ────────────────────────────────────────────────────────

export const GREETING_TEMPLATES = {
  /** Primer contacto general */
  firstContact: (agentName = AGENT_NAME) =>
    `¡Hola! Bienvenido/a a *${COMPANY_NAME}* 😊

Soy *${agentName}*, del área de Recursos Humanos. Con gusto te acompaño en tu proceso de postulación.

Actualmente tenemos vacantes disponibles en *Iztapalapa, CDMX*:

1️⃣ *Ayudante General* — $2,000 semanales
2️⃣ *Asesor Comercial* — $2,300 semanales + bonos
3️⃣ *Supervisor de Área* — $2,600 semanales
4️⃣ *Promotor/Volantero* — sueldo por campaña

✅ Todas incluyen prestaciones de ley desde el primer día.

¿Cuál te llama la atención o en qué área tienes experiencia?`,

  /** Cuando ya conocemos su nombre */
  withName: (nombre: string, agentName = AGENT_NAME) =>
    `¡Hola *${nombre}*! 👋 Soy *${agentName}* de RH en *${COMPANY_NAME}*.

¿En qué área estás buscando trabajo? Tenemos varios puestos disponibles en Iztapalapa.`,

  /** Respuesta a "hola" o saludo simple */
  simpleHello: (agentName = AGENT_NAME) =>
    `¡Hola! 😊 Soy *${agentName}* de *${COMPANY_NAME}*, área de Recursos Humanos.

¿Vienes por información de alguna vacante o tienes alguna pregunta?`,
};

// ─── VACANTES DETALLADAS ──────────────────────────────────────────────────────

export const VACANCY_TEMPLATES = {
  ayudanteGeneral: `*AYUDANTE GENERAL* 📋
━━━━━━━━━━━━━━━━━━━━
💰 Sueldo: *$2,000 semanales* (pagos puntuales)
🕐 Horario: Lunes–Viernes 9am–6pm | Sábados 9am–5pm
📍 Zona: Iztapalapa, CDMX
✅ Sin experiencia necesaria

*¿Qué harás?*
• Captura de datos y organización de archivos
• Atención al cliente con apoyo de material visual
• Respaldo de información y funciones operativas

*Ofrecemos:*
✔ Prestaciones de ley desde el día 1
✔ IMSS, INFONAVIT, vacaciones y aguinaldo
✔ Uniformes gratuitos
✔ Excelente ambiente laboral
✔ Oportunidad de crecimiento

¿Te gustaría agendar una entrevista?`,

  asesorComercial: `*ASESOR COMERCIAL* 💼
━━━━━━━━━━━━━━━━━━━━
💰 Sueldo: *$2,300 semanales* + bonos por metas
🕐 Horario: Lunes–Viernes 8am–6pm | Sábados 8am–5pm
📍 Zona: Iztapalapa, CDMX

*¿Qué harás?*
• Prospección de nuevos clientes
• Seguimiento de cartera y cierre de ventas
• Detección de necesidades y cotizaciones
• Servicio post-venta

*Ofrecemos:*
✔ Capacitación pagada desde el primer día
✔ Bonos por cumplimiento de metas
✔ Plan de carrera y crecimiento
✔ Prestaciones de ley completas

*Buscamos:* facilidad de palabra, presentación profesional y ganas de crecer.

¿Te interesa? ¿Tienes experiencia en ventas o atención al cliente?`,

  supervisor: `*SUPERVISOR DE ÁREA* 👔
━━━━━━━━━━━━━━━━━━━━
💰 Sueldo: *$2,600 semanales* + bono de productividad
🕐 Horario: Lunes–Sábado 8am–6pm
📍 Zona: Iztapalapa, CDMX

*¿Qué harás?*
• Coordinación y liderazgo de personal
• Asignación de tareas y supervisión de KPIs
• Resolución de conflictos internos
• Elaboración de reportes de resultados

*Requisitos:*
• Experiencia mínima 1 año liderando equipos
• Bachillerato concluido
• Manejo de indicadores de desempeño

*Ofrecemos:*
✔ Prestaciones superiores a las de ley
✔ Bono mensual por productividad
✔ Estabilidad laboral

¿Cuánto tiempo tienes de experiencia coordinando equipos?`,

  volantero: `*PROMOTOR / VOLANTERO* 🎯
━━━━━━━━━━━━━━━━━━━━
📍 Zona: Iztapalapa, CDMX
💰 Sueldo: según campaña activa (se confirma en entrevista)

*¿Qué harás?*
• Representar la marca con entusiasmo
• Abordar clientes potenciales en puntos estratégicos
• Distribuir material promocional
• Cumplir metas de campo

*Buscamos:*
✔ Persona extrovertida y con energía
✔ Buena actitud y presentación
✔ Disponibilidad de horario

¡No necesitas experiencia! Solo actitud y ganas.

¿Te llama la atención este puesto?`,
};

// ─── FLUJOS POR EDAD ──────────────────────────────────────────────────────────

export const AGE_FLOW_TEMPLATES = {
  /** Menos de 15 años — rechazo con tacto */
  under15: (nombre: string, agentName = AGENT_NAME) =>
    `Hola *${nombre}*, gracias por tu interés en *${COMPANY_NAME}* 😊

Lamentablemente, por cumplimiento legal y nuestras políticas internas de protección laboral, *no podemos continuar el proceso* con candidatos menores de 16 años.

Te agradecemos enormemente tu entusiasmo. Cuando cumplas 16 años, con gusto te atendemos de nuevo — ¡guarda este número! 📱

Te deseamos mucho éxito. ¡Hasta pronto! 🌟`,

  /** 15 años — igual que menor de 15 */
  age15: (nombre: string) =>
    AGE_FLOW_TEMPLATES.under15(nombre),

  /** 16-17 años — requiere permiso del tutor */
  minor1617: (nombre: string, agentName = AGENT_NAME) =>
    `Hola *${nombre}*! 😊 Gracias por tu interés.

Tienes entre 16 y 17 años, y aunque *sí puedes participar* en el proceso, necesitamos que un padre, madre o tutor legal autorice tu participación.

📋 *Documentos requeridos:*
1. *Carta responsiva firmada* por tutor (con nombre completo y firma)
2. *Identificación oficial del tutor* (INE/pasaporte)
3. *Acta de nacimiento* del candidato
4. *Comprobante de domicilio*

Cuando tengas estos documentos, puedes enviarlos por aquí mismo o traerlos directamente a la entrevista.

¿Tienes posibilidad de obtener el permiso de tu tutor?`,

  /** 18+ — flujo normal */
  adult: (nombre: string) =>
    `¡Perfecto *${nombre}*! Con tu edad podemos avanzar sin problema. 😊

¿Ya revisaste las vacantes disponibles? ¿Hay alguna que te interese en particular?`,

  /** Solicitar edad cuando no se conoce */
  askAge: () =>
    `Para continuar con el proceso y asegurarnos de orientarte correctamente, ¿me podrías decir tu edad? 😊`,
};

// ─── FLUJO DE ENTREVISTA ──────────────────────────────────────────────────────

export const INTERVIEW_TEMPLATES = {
  /** Invitación a entrevista */
  invite: (nombre: string, fecha: string, hora: string) =>
    `¡Excelente *${nombre}*! Tu perfil nos interesa 🌟

Te invitamos a una entrevista presencial:

📅 *Fecha:* ${fecha}
🕐 *Hora:* ${hora}
📍 *Lugar:* ${LOCATION}
🚇 *Referencia:* ${METRO_REF}

¿Te funciona ese horario? Confirma con un *SÍ* o dime si necesitas otro día.`,

  /** Confirmación de entrevista */
  confirmed: (nombre: string, fecha: string, hora: string) =>
    `¡Perfecto *${nombre}*! ✅ Tu entrevista está confirmada.

📅 *${fecha}* a las *${hora}*
📍 ${LOCATION}
🚇 ${METRO_REF}

📋 *Recuerda traer copias de:*
• INE o identificación oficial
• CURP
• Comprobante de domicilio
• Comprobante de estudios
• Acta de nacimiento
• NSS (si lo tienes)

Si algo cambia, avísame aquí con anticipación. ¡Te esperamos! 😊`,

  /** Recordatorio 24h */
  reminder24h: (nombre: string, fecha: string, hora: string) =>
    `¡Hola *${nombre}*! 👋 Te recordamos que mañana tienes entrevista:

📅 *${fecha}* a las *${hora}*
📍 ${LOCATION}
🚇 ${METRO_REF}

📋 Recuerda traer tus documentos. ¿Confirmas tu asistencia? Responde *SÍ* o *NO*.`,

  /** Recordatorio mismo día */
  reminderSameDay: (nombre: string, hora: string) =>
    `¡Buenos días *${nombre}*! ☀️ Hoy es tu entrevista a las *${hora}*.

📍 ${LOCATION}

¡Te esperamos! Si tienes algún imprevisto, avísame aquí. 💪`,

  /** No confirmó — reagendar */
  noShow: (nombre: string) =>
    `Hola *${nombre}*, notamos que no pudiste asistir a tu entrevista. 😔

No hay problema, entendemos que pueden surgir imprevistos.

¿Te gustaría reagendar para otro día? Con gusto buscamos un nuevo horario disponible para ti.`,
};

// ─── MANEJO DE OBJECIONES ─────────────────────────────────────────────────────

export const OBJECTION_TEMPLATES = {
  salaryLow: (nombre: string) =>
    `Entiendo *${nombre}*, el salario es un factor importante 💰

El sueldo base es el punto de partida. Adicionalmente contamos con bonos y comisiones según el puesto, más prestaciones completas desde el día 1 (IMSS, INFONAVIT, aguinaldo).

También hay plan de crecimiento interno. ¿Cuál es tu expectativa de ingreso mensual?`,

  tooFar: (nombre: string) =>
    `Entiendo *${nombre}*, la distancia puede ser un factor a considerar 🚇

Estamos a un lado del *Metro Culhuacán* (Línea 8), lo que facilita mucho el acceso desde varias partes de la ciudad.

¿Desde qué zona o colonia te estarías trasladando?`,

  alreadyWorking: (nombre: string) =>
    `Perfecto *${nombre}*, me alegra que tengas trabajo 😊

Si en algún momento buscas un cambio o una mejor oportunidad, aquí estaremos. ¿Me permites guardarte en nuestra base de contactos para avisarte cuando tengamos algo que se ajuste mejor a lo que buscas?`,

  noExperience: (nombre: string) =>
    `¡No te preocupes *${nombre}*! 🌟 Tenemos puestos especialmente diseñados para quienes están empezando.

El puesto de *Ayudante General* no requiere experiencia previa. Nosotros te capacitamos desde cero con todo lo que necesitas saber.

¿Te interesa conocer más detalles?`,
};

// ─── RESPUESTAS A MEDIOS ──────────────────────────────────────────────────────

export const MEDIA_TEMPLATES = {
  audioReceived: (nombre: string) =>
    `🎙️ Recibí tu mensaje de voz *${nombre}*. Déjame escucharlo...`,

  audioProcessing: () =>
    `Un momento, estoy procesando tu mensaje... ⏳`,

  imageReceived: (nombre: string) =>
    `📸 Recibí tu imagen *${nombre}*, déjame revisarla...`,

  pdfReceived: (nombre: string) =>
    `📄 Recibí tu documento *${nombre}*, lo estoy revisando...`,

  cvReceived: (nombre: string) =>
    `¡Gracias *${nombre}*! Recibí tu CV correctamente. 📄

Lo revisaré con el equipo y te aviso si tu perfil aplica para alguna de nuestras vacantes actuales.

¿Tienes alguna vacante en especial que te interese?`,
};

// ─── RECHAZOS CON EMPATÍA ─────────────────────────────────────────────────────

export const REJECTION_TEMPLATES = {
  /** Candidato no cumple perfil */
  doesNotMatch: (nombre: string) =>
    `Hola *${nombre}*, gracias por tu tiempo e interés en *${COMPANY_NAME}* 😊

Después de revisar tu perfil, en esta ocasión estamos avanzando con candidatos que se ajustan más a los requisitos específicos del puesto.

Conservaremos tu información en nuestra base de datos para futuras oportunidades que puedan coincidir mejor con tu experiencia.

¡Te deseamos mucho éxito en tu búsqueda laboral! 🌟`,

  /** No hay vacantes disponibles actualmente */
  noVacancies: (nombre: string) =>
    `Hola *${nombre}*, en este momento no contamos con vacantes disponibles para el perfil que buscas.

Sin embargo, te agrego a nuestra lista de candidatos activos para contactarte en cuanto tengamos una nueva apertura.

¿Me puedes compartir tu correo o número alterno para mantenerte informado/a? 😊`,
};
