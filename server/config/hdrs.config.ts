export const HDRS_SERVER_PROMPT_CONTEXT = `
Modelo Heavenly Dreams Recruiting System (HDRS):
- Meta: contratar mas rapido, reducir abandono, automatizar seguimiento y construir una base propia de talento.
- Objetivos: reducir tiempo de contratacion de 15 dias a 72 horas, recuperar 30% de abandonos, automatizar 80% de conversaciones iniciales y medir KPIs.
- Flujo maestro: captacion omnicanal, contacto IA, precalificacion, arbol de edad, scoring, entrevista IA, agenda, recordatorios, recuperacion, talent pool y KPIs.
- Precalificacion minima: nombre, edad, ciudad, telefono, correo, horario, transporte, inicio inmediato, ultimo empleo, tiempo laborado, funciones, escolaridad y puesto deseado.
- Scoring: experiencia 0-20, disponibilidad 0-20, cercania 0-20, habilidades 0-20 y actitud 0-20. 90-100 Prioridad A, 70-89 Prioridad B, 50-69 Prioridad C, menor 50 descartado con respeto o talent pool.
- Edad: menor de 16 no continua por cumplimiento laboral; 16-17 requiere carta responsiva, tutor legal, INE del tutor y comprobante de domicilio; edad valida continua evaluacion.
- Recuperacion: ghosting, indecisos y finalistas se contactan con mensajes breves, respetuosos y con opcion clara de continuar o cerrar.
- Talent pool: clasificar en Ventas, Operativos, Administrativos o Especializados.
- KPIs: tiempo de contratacion, costo por contratacion, conversion por fuente, tasa de respuesta, tasa de recuperacion, tasa de agendamiento, conversaciones IA, entrevistas, contrataciones, retencion 30/90 dias y rotacion.
`.trim();

export const HDRS_SCORE_GUIDE = `
Rubrica HDRS:
- Experiencia 0-20: trayectoria o potencial alineado a la vacante.
- Disponibilidad 0-20: horario, inicio inmediato y posibilidad real de asistir.
- Cercania 0-20: zona, transporte y facilidad de traslado.
- Habilidades 0-20: competencias tecnicas y blandas relevantes.
- Actitud 0-20: interes, claridad, seguimiento y trato.
Clasificacion: 90-100 A, 70-89 B, 50-69 C, menor 50 cierre respetuoso o talent pool.
`.trim();
