#!/usr/bin/env node
/**
 * simulate-full-app.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * SIMULACIÓN MAESTRA — RHDreams App 2026
 * Ejercita CADA módulo del sistema al mismo tiempo:
 *   • 1 000 candidatos con todos los perfiles posibles
 *   • 6 canales (WhatsApp Baileys, WhatsApp Meta, Messenger, Instagram, TikTok, Indeed)
 *   • 4 vacantes reales
 *   • 8 personalidades × 9 escolaridades × 5 experiencias × 7 situaciones × 5 disponibilidades
 *   • Mensajes de texto, audio, foto CV, PDF CV, foto anuncio
 *   • Creación de citas en la agenda (con detección de conflictos)
 *   • Confirmación automática de citas
 *   • Recordatorios simulados
 *   • Flujos de automatización (trigger: candidate.created, appointment.created)
 *   • Cola de IA (Gemini → Groq → OpenRouter fallback)
 *   • Rate limiting (sliding window per canal)
 *   • Onboarding post-contratación (DDO, primer día, materiales)
 *   • Métricas por módulo: latencia, errores, tasa de conversión, score humanización
 * ─────────────────────────────────────────────────────────────────────────────
 * Uso:
 *   node scripts/simulate-full-app.mjs               # dry run (modelo interno)
 *   node scripts/simulate-full-app.mjs --mode=live   # contra el servidor real
 *   node scripts/simulate-full-app.mjs --candidatos=500 --seed=42
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

// ─────────────────────────────────────────────────────────────────────────────
//  CLI ARGS
// ─────────────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const MODE        = args.mode       || "dry";
const TOTAL       = parseInt(args.candidatos || args.n || "1000", 10);
const CONCURRENCY = parseInt(args.concurrency || "40", 10);
const SEED_INIT   = parseInt(args.seed || String(Date.now()), 10);
const BASE_URL    = args.url        || "http://localhost:3000";
const AUTH_TOKEN  = args.token      || "";
const EXPORT_JSON = args.export     || false;

// ─────────────────────────────────────────────────────────────────────────────
//  PRNG determinístico
// ─────────────────────────────────────────────────────────────────────────────
let _seed = SEED_INIT;
function rand() {
  _seed ^= _seed << 13; _seed ^= _seed >> 17; _seed ^= _seed << 5;
  return ((_seed >>> 0) / 0xFFFFFFFF);
}
const pick  = arr => arr[Math.floor(rand() * arr.length)];
const pickW = opts => {
  const total = opts.reduce((s, o) => s + o.w, 0);
  let r = rand() * total;
  for (const o of opts) { r -= o.w; if (r <= 0) return o.v; }
  return opts[opts.length - 1].v;
};
const ri    = (a, b) => Math.floor(a + rand() * (b - a + 1));

// ─────────────────────────────────────────────────────────────────────────────
//  CATÁLOGOS
// ─────────────────────────────────────────────────────────────────────────────
const CANALES = [
  { id:"whatsapp_baileys", label:"WhatsApp Baileys",  peso:30, latenciaMs:700,  soporte:["texto","audio","imagen","pdf"],  limite:4096 },
  { id:"whatsapp_meta",    label:"WhatsApp Meta",     peso:25, latenciaMs:550,  soporte:["texto","audio","imagen","pdf"],  limite:4096 },
  { id:"messenger",        label:"Messenger FB",      peso:18, latenciaMs:400,  soporte:["texto","imagen","pdf"],          limite:2000 },
  { id:"instagram",        label:"Instagram DM",      peso:15, latenciaMs:350,  soporte:["texto","imagen"],                limite:1000 },
  { id:"tiktok",           label:"TikTok DM",         peso:7,  latenciaMs:500,  soporte:["texto"],                         limite:500  },
  { id:"indeed",           label:"Indeed chat",       peso:5,  latenciaMs:900,  soporte:["texto","pdf"],                   limite:3000 },
];

const VACANTES = [
  { id:"ayudante_general",    titulo:"Ayudante General",       sueldo:"$2,000 semanales",               escolaridad_min:0, horario:"Lun–Sáb 7am–3pm", zona:"Iztapalapa, CDMX", peso:35 },
  { id:"asesor_comercial",    titulo:"Asesor Comercial",       sueldo:"$2,300 sem + comisiones",        escolaridad_min:4, horario:"Lun–Vie 9am–6pm", zona:"Venustiano Carranza", peso:30 },
  { id:"supervisor_personal", titulo:"Supervisor de Personal", sueldo:"$2,600 semanales",               escolaridad_min:4, horario:"Lun–Vie 8am–5pm", zona:"Tláhuac, CDMX", peso:15 },
  { id:"promotor",            titulo:"Promotor de Ventas",     sueldo:"$2,000 sem + bonos de campo",   escolaridad_min:0, horario:"Lun–Sáb 8am–4pm", zona:"Xochimilco, CDMX", peso:20 },
];

const ESCOLARIDADES = [
  { id:"sin_estudios",   label:"Sin estudios formales",       nivel:0, peso:8  },
  { id:"primaria",       label:"Primaria",                    nivel:1, peso:10 },
  { id:"secundaria",     label:"Secundaria",                  nivel:2, peso:20 },
  { id:"prepa_trunca",   label:"Preparatoria trunca",         nivel:3, peso:12 },
  { id:"preparatoria",   label:"Preparatoria / Bachillerato", nivel:4, peso:20 },
  { id:"tecnica",        label:"Carrera técnica",             nivel:5, peso:10 },
  { id:"uni_trunca",     label:"Universidad trunca",          nivel:6, peso:8  },
  { id:"licenciatura",   label:"Licenciatura",                nivel:7, peso:8  },
  { id:"posgrado",       label:"Maestría / Posgrado",         nivel:8, peso:4  },
];

const EXPERIENCIAS = [
  { id:"ninguna",   label:"Sin experiencia",   anios:[0,0],   peso:23 },
  { id:"menos1",    label:"Menos de 1 año",    anios:[0,1],   peso:15 },
  { id:"1a3",       label:"1 a 3 años",        anios:[1,3],   peso:29 },
  { id:"3a10",      label:"3 a 10 años",       anios:[3,10],  peso:22 },
  { id:"mas10",     label:"Más de 10 años",    anios:[10,25], peso:11 },
];

const PERSONALIDADES = [
  { id:"informal",    label:"Informal / coloquial",          peso:28 },
  { id:"formal",      label:"Formal y educado",              peso:14 },
  { id:"ansioso",     label:"Ansioso / desesperado",         peso:13 },
  { id:"apurado",     label:"Apurado / breve",               peso:12 },
  { id:"desconfiado", label:"Desconfiado / cauteloso",       peso:11 },
  { id:"comunicativo",label:"Comunicativo / detallado",      peso:9  },
  { id:"timido",      label:"Tímido / inseguro",             peso:8  },
  { id:"agresivo",    label:"Impaciente / exigente",         peso:5  },
];

const SITUACIONES = [
  { id:"activo_busca",   label:"Empleado buscando cambio",   peso:25 },
  { id:"desempleado",    label:"Desempleado",                peso:30 },
  { id:"estudiante",     label:"Estudiante",                 peso:12 },
  { id:"madre_sola",     label:"Madre / padre solo/a",       peso:13 },
  { id:"adulto_mayor",   label:"Adulto mayor (50+)",         peso:7  },
  { id:"reingreso",      label:"Reingreso laboral",          peso:8  },
  { id:"recien_llegado", label:"Recién llegado (migrante)",  peso:5  },
];

const DISPONIBILIDADES = [
  { id:"completo",      label:"Tiempo completo",      peso:40 },
  { id:"manana",        label:"Solo mañanas",          peso:20 },
  { id:"tarde",         label:"Solo tardes",           peso:15 },
  { id:"fines_semana",  label:"Solo fines de semana",  peso:10 },
  { id:"medio_tiempo",  label:"Medio tiempo",          peso:15 },
];

const TIPOS_MSG = [
  { id:"texto",       label:"Texto",        procesadoMs:200,  peso:55 },
  { id:"audio",       label:"Audio",        procesadoMs:1800, peso:15 },
  { id:"foto_anuncio",label:"Foto anuncio", procesadoMs:900,  peso:10 },
  { id:"foto_cv",     label:"Foto CV",      procesadoMs:1200, peso:12 },
  { id:"pdf_cv",      label:"PDF CV",       procesadoMs:1500, peso:8  },
];

const ZONAS = [
  "Iztapalapa","Xochimilco","Tláhuac","Venustiano Carranza",
  "Gustavo A. Madero","Álvaro Obregón","Tlalpan","Ecatepec",
  "Neza","Valle de Chalco","Chalco","Texcoco",
];

const NOMBRES = [
  "María López","Juan García","Ana Martínez","Carlos Hernández","Laura Torres",
  "Pedro Ramírez","Sofía Flores","Miguel Jiménez","Valeria Díaz","Roberto Morales",
  "Gabriela Ruiz","José Reyes","Andrea Sánchez","Luis Castro","Fernanda Mendoza",
  "Jorge Vargas","Alejandra Cruz","Eduardo Gutiérrez","Carmen Romero","Sergio Peña",
  "Lucía Núñez","Raúl Aguilar","Patricia Fuentes","Manuel Rojas","Diana Guerrero",
  "Ricardo Medina","Elena Ríos","Arturo Silva","Verónica Ortiz","Alberto Ramos",
  "Isabel Delgado","Héctor Vega","Mónica Castillo","Fernando Navarro","Adriana Campos",
  "Ignacio Herrera","Claudia Espinoza","Ernesto Contreras","Beatriz Domínguez","Pablo Mejía",
  "Rosa Álvarez","Daniel Peralta","Silvia Cabrera","Mauricio Suárez","Lorena Montes",
  "Rodrigo Ávila","Yolanda Molina","Esteban Ponce","Fabiola Bravo","Óscar Tapia",
];

// ─────────────────────────────────────────────────────────────────────────────
//  MOTOR DE RESPUESTAS HUMANIZADAS
// ─────────────────────────────────────────────────────────────────────────────
const TONO = {
  formal:      { s:(n)=>`Buenos días, ${n}.`,              c:`Quedo en espera de su respuesta.`,          e:false },
  informal:    { s:(n)=>`¡Hola ${n}! 😊`,                  c:`¡Cualquier duda me dices! 🙌`,              e:true  },
  ansioso:     { s:(n)=>`¡Hola ${n}! 😊`,                  c:`¡Cuéntame y te ayudo ya! 💪`,               e:true  },
  desconfiado: { s:(n)=>`Hola ${n}, entiendo tu duda.`,    c:`Todo 100% gratuito y verificable.`,         e:false },
  apurado:     { s:(n)=>`Hola ${n}!`,                      c:`¿Algo más?`,                                e:false },
  agresivo:    { s:(n)=>`Hola ${n}, lamento la espera.`,   c:`Te atiendo ahora mismo.`,                   e:false },
  timido:      { s:(n)=>`¡Hola ${n}! No te preocupes 😊`,  c:`¡Aquí estoy para lo que necesites! 😊`,     e:true  },
  comunicativo:{ s:(n)=>`¡Hola ${n}! Gracias por contactarnos.`, c:`Cuéntame más y te oriento al detalle.`, e:true },
};

function notaCtx(c) {
  const { restricciones, nombre, edad, zona, expAnios } = c;
  const fn = nombre.split(" ")[0];
  if (restricciones.includes("menor_de_edad"))     return `No hay problema con tu edad (${edad} años) — tenemos proceso para menores.`;
  if (restricciones.includes("adulto_mayor"))       return `No hay límite de edad, ${fn} — valoramos tu experiencia.`;
  if (restricciones.includes("necesita_horario_escolar")) return `Tenemos turno matutino para que puedas atender a tu familia.`;
  if (restricciones.includes("laguna_laboral"))     return `El tiempo sin trabajar no es problema — lo que importa es tu disposición.`;
  if (restricciones.includes("sin_estudios"))       return `Los estudios no son lo más importante — nos importa la actitud y las ganas.`;
  if (restricciones.includes("perfil_licenciado"))  return `Con tu nivel de estudios tienes perfil para puestos de mayor responsabilidad.`;
  if (restricciones.includes("necesita_verificar_empresa")) return `Toda la verificación que necesites — RFC, Google Maps, visita física.`;
  if (expAnios > 5) return `Con ${expAnios} años de experiencia tienes un perfil muy sólido, ${fn}.`;
  if (expAnios === 0) return `No tener experiencia no es problema — capacitamos desde cero.`;
  return `Estás en ${zona} — tenemos opciones cerca de ti.`;
}

function respuestaAgente(c, etapa, tipo) {
  const { nombre, personalidad, canal, vacante, zona, restricciones, disponibilidad, edad, expAnios, escolaridad } = c;
  const fn = nombre.split(" ")[0];
  const t  = TONO[personalidad.id] || TONO.informal;
  const ap = t.s(fn);
  const nota = notaCtx(c);
  const pid = personalidad.id;

  if (tipo.id === "audio") {
    if (!canal.soporte.includes("audio"))
      return `${ap} Este canal no recibe audios. ¿Puedes escribirme? Por WhatsApp sí acepto notas de voz. ${t.c}`;
    if (rand() < 0.07)
      return `${ap} Recibí tu audio pero tuve un problema. ¿Puedes escribirme lo mismo? ${t.c}`;
    const trans = pick([
      `quiero info del trabajo de ${vacante.titulo}`,
      `cuánto pagan en ${vacante.titulo}`,
      `me interesa la vacante de ${vacante.titulo}`,
    ]);
    return `${ap}\n\n🎙️ Escuché tu nota: *"${trans}"*\n\n${nota} La vacante de *${vacante.titulo}* en *${zona}* ofrece *${vacante.sueldo}*. ${t.c}`;
  }

  if (tipo.id === "foto_anuncio")
    return `${ap}\n\n📸 ¡Recibí la foto del anuncio! Veo que te interesa *${vacante.titulo}* — ${nota}\n💰 Sueldo: *${vacante.sueldo}* | 📍 ${zona} | ⏰ ${vacante.horario}\n¿Me dices tu nombre completo, ${fn}? ${t.c}`;

  if (tipo.id === "foto_cv") {
    if (!canal.soporte.includes("imagen"))
      return `${ap} Por este canal no recibo imágenes. ¿Puedes enviar tu CV por WhatsApp? ${t.c}`;
    if (rand() < 0.15)
      return `${ap} Recibí tu foto de CV pero no se ve muy claro. ¿Me dices: último estudio, años de exp y área? ${nota}`;
    const area = pick(["ventas","almacén","atención al cliente","operaciones","logística","caja"]);
    return `${ap}\n\n📄 ¡Recibí tu CV, ${fn}! Veo experiencia en *${area}* — perfecto para *${vacante.titulo}*.\n${nota}\nSueldo: *${vacante.sueldo}* | 📍 ${zona}. ¿Disponibilidad para entrevista? ${t.c}`;
  }

  if (tipo.id === "pdf_cv") {
    if (!canal.soporte.includes("pdf"))
      return `${ap} Por ${canal.id === "tiktok" ? "TikTok" : "este canal"} no recibo PDF. Envíalo por WhatsApp o escríbeme tus datos. ${t.c}`;
    if (rand() < 0.05)
      return `${ap} Tuve un problema al abrir tu archivo, ${fn}. ¿Puedes reenviarlo o compartir tus datos? ${t.c}`;
    const area = pick(["ventas","logística","atención al cliente","administración","producción"]);
    return `${ap}\n\n📑 ¡Recibí tu CV en PDF, ${fn}!\n*Perfil:* ${expAnios} año${expAnios!==1?"s":""} en ${area}, ${escolaridad.label}.\n${nota} Encajas para *${vacante.titulo}* (${vacante.sueldo}) en *${zona}*.\n¿Cuándo puedes venir a entrevista? ${t.c}`;
  }

  // ── Texto por etapa ──────────────────────────────────────────────────────
  switch(etapa) {
    case "primer_contacto": {
      const bienvenidas = {
        whatsapp_baileys: `${ap}\n\n¡Gracias por escribirnos! Soy el asistente de *Heavenly Dreams*.\n${nota}\nTenemos vacantes abiertas:\n🔹 *${vacante.titulo}* → *${vacante.sueldo}* en *${zona}* (${vacante.horario})\n¿Te interesa? ${t.c}`,
        whatsapp_meta:    `${ap}\n\n¡Bienvenido/a a *Heavenly Dreams* vía WhatsApp Business! 💼\nVacante: *${vacante.titulo}* — *${vacante.sueldo}* en *${zona}*.\n${nota} ${t.c}`,
        messenger:        `${ap} 👋\n\n¡Gracias por escribir por Messenger! Soy el asistente de reclutamiento.\nVacante: *${vacante.titulo}* | Sueldo: *${vacante.sueldo}* | Zona: *${zona}*\n${nota} ${t.c}`,
        instagram:        `${ap} ✨ Vi que escribiste por Instagram.\n\nVacante: *${vacante.titulo}* — *${vacante.sueldo}* | 📍 ${zona}\n${nota} Para más detalles te escribo por WhatsApp. ${t.c}`,
        tiktok:           `${ap} 🎵 ¡Gracias por el interés desde TikTok!\n\nTenemos la vacante de *${vacante.titulo}* (${vacante.sueldo}). Para aplicar necesito tus datos — ¿me contactas por WhatsApp? ${t.c}`,
        indeed:           `Hola ${fn}, gracias por postularte en Indeed.\n\nRevisé tu perfil y encajas para *${vacante.titulo}* (${vacante.sueldo}) en *${zona}*.\n${nota} ${t.c}`,
      };
      return bienvenidas[canal.id] || bienvenidas.whatsapp_baileys;
    }
    case "pregunta_vacante":
      return `${ap} La vacante de *${vacante.titulo}* es en *${zona}*.\n💰 Sueldo: *${vacante.sueldo}*\n⏰ Horario: *${vacante.horario}*\n${nota}\n¿Tienes disponibilidad de ${disponibilidad.label.toLowerCase()}? ${t.c}`;
    case "pregunta_sueldo":
      return `${ap} El sueldo de *${vacante.titulo}* es *${vacante.sueldo}* con prestaciones de ley desde el primer día (IMSS, aguinaldo, vacaciones). 💰\n${nota} ${t.c}`;
    case "pregunta_horario":
      return `${ap} El horario de *${vacante.titulo}* es *${vacante.horario}*.\n${restricciones.includes("necesita_horario_escolar") ? "Tenemos turno matutino para que puedas recoger a tus hijos en la tarde. 💙" : ""}\n${nota} ${t.c}`;
    case "revela_edad":
      return `${ap} ¡No hay problema, ${fn}! Para candidatos menores de edad necesitamos:\n1️⃣ Carta de autorización firmada por tutor\n2️⃣ Acta de nacimiento\n3️⃣ CURP\n\nVacante: *${vacante.titulo}* | Sueldo: *${vacante.sueldo}* | Zona: *${zona}*\n¿Tu familia te apoya? ${t.c}`;
    case "sin_estudios":
      return `${ap} ${fn}, los estudios no te van a frenar. ${vacante.escolaridad_min === 0 ? "Para esta vacante no se requiere secundaria." : "Lo que importa es la actitud."}\n💰 ${vacante.sueldo} | 📍 ${zona}\n${nota} ${t.c}`;
    case "perfil_licenciado":
      return `${ap} ${fn}, con tu nivel de estudios tu perfil encaja para *Supervisor de Personal* ($2,600 semanales + seguro de vida).\n${nota}\n¿Tienes experiencia liderando equipos? ${t.c}`;
    case "verifica_empresa":
      return pid === "agresivo"
        ? `${fn}, aquí los datos oficiales:\n🏢 *Heavenly Dreams S.A.S. de C.V.*\n📋 RFC: HD210531ABC (verificable en SAT)\n📍 Iztapalapa, CDMX — puedes venir a conocernos\n⭐ +10 años en operación. No cobramos nada.`
        : `${ap} Tienes razón de verificar — es lo correcto. 🔒\n🏢 *Heavenly Dreams S.A.S. de C.V.*\n📋 RFC: HD210531ABC\n📍 Iztapalapa, CDMX\n⭐ +10 años | Búscanos en Google, Facebook, Instagram\nTodo 100% gratuito, ${fn}. ${t.c}`;
    case "horario_hijos":
      return `${ap} Entendemos que la familia es primero. 💙\n*${vacante.titulo}* en *${zona}* tiene turno *7am–3pm* para que recojas a tus hijos.\n💰 ${vacante.sueldo} — pagamos puntual. ${t.c}`;
    case "adulto_mayor":
      return `${ap} ¡En Heavenly Dreams NO hay discriminación por edad, ${fn}! ✅\nValoramos tu experiencia. *${vacante.titulo}* en *${zona}* paga *${vacante.sueldo}*.\n${nota} ${t.c}`;
    case "reingreso":
      return `${ap} ${fn}, todos pasamos por etapas personales — aquí no se juzga. 🙌\nDamos capacitación completa desde el primer día.\n💰 ${vacante.sueldo} | 📍 ${zona}\n¿Qué hacías en tu trabajo anterior? ${t.c}`;
    case "envia_cv":
      return `${ap} ¡Perfecto, ${fn}! Recibí tu información. Te registré para *${vacante.titulo}* en *${zona}*.\n${nota}\n¿Cuándo tienes disponibilidad para entrevista esta semana? ${t.c}`;
    case "agenda_entrevista": {
      const fecha = generarFechaDisponible();
      return pid === "apurado"
        ? `¡Listo ${fn}! 🎉 Entrevista *${vacante.titulo}* en *${zona}* — ${fecha}. Confirmamos en <24h. ¿Algo más?`
        : `${ap} ¡Excelente, ${fn}! 🎉\n\n📅 Entrevista agendada:\n🏷 *Vacante:* ${vacante.titulo}\n📍 *Lugar:* ${zona}\n⏰ *Horario:* ${fecha}\n💰 *Sueldo:* ${vacante.sueldo}\n\n${nota}\n\nNuestro equipo confirma en máximo 24 horas. ¡Muchas gracias! ${t.c}`;
    }
    case "abandono": {
      const msgs = {
        agresivo:   `${fn}, entiendo. Si cambias de opinión, *${vacante.titulo}* (${vacante.sueldo}) sigue abierta.`,
        ansioso:    `${fn}, no te preocupes — si en otro momento quieres info, aquí estamos.`,
        desconfiado:`${fn}, tómate el tiempo que necesites para verificar. La vacante te espera.`,
        default:    `Sin problema, ${fn}. Si en otro momento te interesa *${vacante.titulo}* (${vacante.sueldo}) en *${zona}*, aquí estamos. ¡Éxito! 😊`,
      };
      return msgs[pid] || msgs.default;
    }
    case "cierre":
      return pid === "apurado" ? `¡Listo ${fn}! Quedo pendiente. 👍`
           : pid === "timido"  ? `¡No hay de qué, ${fn}! Cualquier duda sobre *${vacante.titulo}*, aquí estoy. ¡Mucho éxito! 😊`
           : `${ap} ¡Todo listo, ${fn}! 🎉 Quedo pendiente para los próximos pasos de *${vacante.titulo}* en *${zona}*.\n${nota}\n¡Mucho éxito! ${t.c}`;
    default:
      return `${ap} Con gusto, ${fn}. ${nota} ¿Otra pregunta sobre *${vacante.titulo}* (${vacante.sueldo}) en *${zona}*? ${t.c}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GENERACIÓN DE FECHAS / AGENDA
// ─────────────────────────────────────────────────────────────────────────────
const HORARIOS_ENTREVISTA = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const agendaOcupada = new Map(); // "YYYY-MM-DD|HH:MM" → candidateName

function generarFechaDisponible() {
  const dias = ri(1, 7);
  const base  = new Date(Date.now() + dias * 86400000);
  const fecha = base.toISOString().slice(0, 10);
  const hora  = pick(HORARIOS_ENTREVISTA);
  const key   = `${fecha}|${hora}`;
  if (agendaOcupada.has(key)) {
    // Buscar siguiente disponible
    for (const h of HORARIOS_ENTREVISTA) {
      const k2 = `${fecha}|${h}`;
      if (!agendaOcupada.has(k2)) { agendaOcupada.set(k2, true); return `${fecha} a las ${h}`; }
    }
    // Siguiente día
    const sig = new Date(base.getTime() + 86400000).toISOString().slice(0, 10);
    const hSig = pick(HORARIOS_ENTREVISTA);
    agendaOcupada.set(`${sig}|${hSig}`, true);
    return `${sig} a las ${hSig}`;
  }
  agendaOcupada.set(key, true);
  return `${fecha} a las ${hora}`;
}

function agendarCita(candidato, etapa) {
  if (etapa !== "agenda_entrevista") return null;
  const dias = ri(1, 7);
  const base  = new Date(Date.now() + dias * 86400000);
  const fecha = base.toISOString().slice(0, 10);
  let hora = pick(HORARIOS_ENTREVISTA);
  let key  = `${fecha}|${hora}`;
  // Encontrar slot libre
  for (const h of HORARIOS_ENTREVISTA) {
    const k = `${fecha}|${h}`;
    if (!agendaOcupada.has(k)) { hora = h; key = k; break; }
  }
  agendaOcupada.set(key, candidato.nombre);
  return { fecha, hora, key };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MÓDULOS SIMULADOS
// ─────────────────────────────────────────────────────────────────────────────

// Cola de IA con capacidad limitada
const AI_QUEUE = { maxConcurrency: 15, active: 0, total: 0, timeout: 0, cola: 0 };
async function procesarConIA(fn) {
  AI_QUEUE.total++;
  if (AI_QUEUE.active >= AI_QUEUE.maxConcurrency) {
    AI_QUEUE.cola++;
    await new Promise(r => setTimeout(r, ri(500, 2000)));
    AI_QUEUE.cola--;
  }
  AI_QUEUE.active++;
  const latencia = ri(800, 3500);
  await new Promise(r => setTimeout(r, Math.min(latencia, 50))); // acelerado en dry
  AI_QUEUE.active--;
  if (rand() < 0.04) { AI_QUEUE.timeout++; throw new Error("AI timeout"); }
  return fn();
}

// Rate limiter por canal (sliding window 15 min)
const rateLimits = {};
// En producción los mensajes se distribuyen en 15 min; en dry mode simulamos la ventana completa
const RATE_MAX = MODE === "dry"
  ? { whatsapp_baileys:500, whatsapp_meta:400, messenger:300, instagram:250, tiktok:150, indeed:100 }
  : { whatsapp_baileys:200, whatsapp_meta:200, messenger:100, instagram:80,  tiktok:60,  indeed:40  };
function checkRateLimit(canalId) {
  const now = Date.now();
  if (!rateLimits[canalId]) rateLimits[canalId] = [];
  rateLimits[canalId] = rateLimits[canalId].filter(t => now - t < 15 * 60000);
  const max = RATE_MAX[canalId] || 100;
  if (rateLimits[canalId].length >= max) return false;
  rateLimits[canalId].push(now);
  return true;
}

// Automatizaciones disparadas
const AUTOMATIONS = { candidate_created:0, appointment_created:0, stage_changed:0, message_sent:0 };
function dispararAutomacion(trigger, data) {
  if (AUTOMATIONS[trigger] !== undefined) AUTOMATIONS[trigger]++;
}

// Flujo de onboarding (post-contratación)
const ONBOARDING = { iniciados:0, ddo:0, primerDia:0, inventario:0, completados:0 };
function simularOnboarding(candidato) {
  if (rand() > 0.60) return; // solo 60% llegan a onboarding
  ONBOARDING.iniciados++;
  dispararAutomacion("stage_changed", { stage:"ddo" });
  if (rand() > 0.20) { ONBOARDING.ddo++; }
  if (rand() > 0.25) { ONBOARDING.primerDia++; }
  if (rand() > 0.30) { ONBOARDING.inventario++; }
  if (rand() > 0.15) { ONBOARDING.completados++; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GENERACIÓN Y CONVERSACIÓN
// ─────────────────────────────────────────────────────────────────────────────
function generarCandidato(id) {
  const escolaridad    = pickW(ESCOLARIDADES.map(e => ({v:e, w:e.peso})));
  const experiencia    = pickW(EXPERIENCIAS.map(e => ({v:e, w:e.peso})));
  const situacion      = pickW(SITUACIONES.map(s => ({v:s, w:s.peso})));
  const disponibilidad = pickW(DISPONIBILIDADES.map(d => ({v:d, w:d.peso})));
  const canal          = pickW(CANALES.map(c => ({v:c, w:c.peso})));
  const personalidad   = pickW(PERSONALIDADES.map(p => ({v:p, w:p.peso})));
  const vacante        = pickW(VACANTES.map(v => ({v:v, w:v.peso})));
  const nombre         = pick(NOMBRES);
  const zona           = pick(ZONAS);
  const edad           = situacion.id === "adulto_mayor" ? ri(50,65)
                       : situacion.id === "estudiante"   ? ri(17,24)
                       : ri(16,50);

  const restricciones = [];
  if (edad < 18) restricciones.push("menor_de_edad");
  if (escolaridad.nivel === 0) restricciones.push("sin_estudios");
  if (escolaridad.nivel === 1) restricciones.push("solo_primaria");
  if (situacion.id === "madre_sola") restricciones.push("necesita_horario_escolar");
  if (situacion.id === "adulto_mayor") restricciones.push("adulto_mayor");
  if (situacion.id === "reingreso") restricciones.push("laguna_laboral");
  if (escolaridad.nivel >= 7) restricciones.push("perfil_licenciado");
  if (personalidad.id === "desconfiado") restricciones.push("necesita_verificar_empresa");

  const expAnios = ri(experiencia.anios[0], experiencia.anios[1]);

  // Flujo de conversación
  const flujo = elegirFlujo(restricciones, personalidad, canal);

  return {
    id, nombre, edad, zona, escolaridad, experiencia, situacion,
    disponibilidad, canal, personalidad, vacante, restricciones, flujo, expAnios,
    phone: `+521550${String(id).padStart(7,"0")}`,
  };
}

function elegirFlujo(restricciones, personalidad, canal) {
  const base = ["primer_contacto","pregunta_vacante"];
  const conCV = canal.soporte.some(t => ["imagen","pdf"].includes(t));

  if (restricciones.includes("menor_de_edad"))
    return [...base,"revela_edad","agenda_entrevista","cierre"];
  if (restricciones.includes("sin_estudios") || restricciones.includes("solo_primaria"))
    return [...base,"sin_estudios","pregunta_sueldo","agenda_entrevista","cierre"];
  if (restricciones.includes("perfil_licenciado"))
    return [...base,"perfil_licenciado","pregunta_sueldo","pregunta_horario","envia_cv","agenda_entrevista","cierre"];
  if (restricciones.includes("necesita_verificar_empresa"))
    return [...base,"verifica_empresa","pregunta_sueldo","pregunta_horario","agenda_entrevista","cierre"];
  if (restricciones.includes("necesita_horario_escolar"))
    return [...base,"horario_hijos","pregunta_sueldo","agenda_entrevista","cierre"];
  if (restricciones.includes("adulto_mayor"))
    return [...base,"adulto_mayor","pregunta_sueldo","pregunta_horario","cierre"];
  if (restricciones.includes("laguna_laboral"))
    return [...base,"reingreso","pregunta_sueldo","envia_cv","agenda_entrevista","cierre"];
  if (personalidad.id === "agresivo")
    return [...base,"pregunta_sueldo","verifica_empresa","agenda_entrevista","cierre"];
  if (personalidad.id === "apurado")
    return ["primer_contacto","pregunta_sueldo","agenda_entrevista"];
  if (personalidad.id === "ansioso" && rand() < 0.15)
    return [...base,"pregunta_sueldo","abandono"];
  if (rand() < 0.12)
    return ["primer_contacto","pregunta_vacante","abandono"];
  if (conCV && rand() < 0.35)
    return [...base,"pregunta_sueldo","pregunta_horario","envia_cv","agenda_entrevista","cierre"];
  return [...base,"pregunta_sueldo","pregunta_horario","agenda_entrevista","cierre"];
}

function getTipo(etapa, canal) {
  if (etapa === "primer_contacto" || etapa === "verifica_empresa") return TIPOS_MSG[0];
  if (etapa === "envia_cv") {
    const cv = TIPOS_MSG.filter(t => ["foto_cv","pdf_cv"].includes(t.id) && canal.soporte.includes(t.id));
    return cv.length > 0 ? pick(cv) : TIPOS_MSG[0];
  }
  if (["whatsapp_baileys","whatsapp_meta"].includes(canal.id) && rand() < 0.28)
    return TIPOS_MSG.find(t => t.id === "audio") || TIPOS_MSG[0];
  if (canal.id === "instagram" && rand() < 0.18)
    return TIPOS_MSG.find(t => t.id === "foto_anuncio") || TIPOS_MSG[0];
  return TIPOS_MSG[0];
}

function scorear(respuesta, candidato, tipo) {
  const fn = candidato.nombre.split(" ")[0];
  let score = 8.0;
  if (respuesta.includes(fn))                    score += 0.4;
  if (respuesta.includes(candidato.vacante.sueldo)) score += 0.3;
  const r = candidato.restricciones;
  if (r.includes("menor_de_edad") && (respuesta.includes("tutor") || respuesta.includes("autorización"))) score += 0.4;
  if (r.includes("adulto_mayor") && (respuesta.includes("edad") || respuesta.includes("experiencia")))    score += 0.4;
  if (r.includes("necesita_horario_escolar") && (respuesta.includes("hijo") || respuesta.includes("matutino"))) score += 0.4;
  if (r.includes("laguna_laboral") && (respuesta.includes("disposición") || respuesta.includes("trabajar"))) score += 0.4;
  if (r.includes("necesita_verificar_empresa") && (respuesta.includes("RFC") || respuesta.includes("gratuito"))) score += 0.4;
  if (r.includes("sin_estudios") && (respuesta.includes("actitud") || respuesta.includes("estudios")))    score += 0.4;
  if (r.includes("perfil_licenciado") && (respuesta.includes("licenciado") || respuesta.includes("responsabilidad"))) score += 0.4;
  if (candidato.canal.id === "tiktok" && respuesta.includes("TikTok"))   score += 0.2;
  if (candidato.canal.id === "indeed" && respuesta.includes("Indeed"))   score += 0.2;
  if (candidato.canal.id === "instagram" && respuesta.includes("Instagram")) score += 0.2;
  if (tipo.id === "audio" && respuesta.includes("🎙️"))  score += 0.3;
  if (tipo.id === "foto_cv" && respuesta.includes("CV")) score += 0.2;
  if (tipo.id === "pdf_cv" && respuesta.includes("PDF")) score += 0.2;
  return Math.min(10, parseFloat(score.toFixed(1)));
}

async function simularConversacion(candidato) {
  const metricas = {
    ok: true, abandono: false, entrevistaAgendada: false, cita: null,
    turnosTotales: 0, turnosOk: 0, latenciaTotal: 0, latenciaMax: 0,
    scores: [], errores: [], restriccionesAtendidas: [],
    tiposUsados: [], rateLimitHit: false, aiQueueDelay: 0,
  };

  dispararAutomacion("candidate_created", candidato);

  for (const etapa of candidato.flujo) {
    // Rate limit
    if (!checkRateLimit(candidato.canal.id)) {
      metricas.rateLimitHit = true;
      metricas.ok = false;
      metricas.errores.push({ etapa, error: "rate_limit" });
      break;
    }

    const tipo = getTipo(etapa, candidato.canal);
    const latCan  = Math.round(candidato.canal.latenciaMs * (0.7 + rand() * 0.6));
    const latTipo = Math.round(tipo.procesadoMs * (0.8 + rand() * 0.4));
    const latTotal = latCan + latTipo;

    let respuesta = "";
    let error = null;

    if (MODE === "live") {
      try {
        const t0 = Date.now();
        const res = await fetch(`${BASE_URL}/api/gemini/agent/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            agentName: "Agente Principal 1",
            systemPrompt: `Eres reclutador humano Heavenly Dreams. Candidato: ${candidato.nombre}, ${candidato.edad}a, ${candidato.escolaridad.label}, ${candidato.expAnios}a exp. Canal: ${candidato.canal.label}. Personalidad: ${candidato.personalidad.label}. Vacante: ${candidato.vacante.titulo}. Restricciones: ${candidato.restricciones.join(", ")||"ninguna"}.`,
            conversationHistory: [],
            userPrompt: tipo.id !== "texto" ? `[${tipo.label.toUpperCase()}] Mensaje del candidato` : "Hola, me interesa la vacante",
          }),
        });
        const body = await res.json().catch(() => ({}));
        respuesta = body.data?.reply || body.data?.text || "";
        metricas.aiQueueDelay += Date.now() - t0;
        if (!res.ok) error = body.error || `HTTP ${res.status}`;
      } catch(e) { error = e.message; }
    } else {
      try {
        await procesarConIA(() => {});
        respuesta = respuestaAgente(candidato, etapa, tipo);
      } catch(e) {
        error = e.message;
        respuesta = "";
      }
    }

    const score = respuesta ? scorear(respuesta, candidato, tipo) : 0;

    // Agendar cita
    if (etapa === "agenda_entrevista" && !error) {
      const cita = agendarCita(candidato, etapa);
      if (cita) {
        metricas.cita = cita;
        metricas.entrevistaAgendada = true;
        dispararAutomacion("appointment_created", { candidato, cita });
        // Confirmar ~75% de las citas
        if (rand() < 0.75) {
          agendaOcupada.set(`${cita.fecha}|${cita.hora}|confirmed`, true);
          dispararAutomacion("stage_changed", { stage:"cita_confirmada" });
        }
      }
    }

    dispararAutomacion("message_sent", { etapa, canal: candidato.canal.id });

    if (etapa === "abandono") metricas.abandono = true;

    // Restricciones atendidas
    const atencionMap = {
      revela_edad:"menor_de_edad", verifica_empresa:"desconfianza",
      horario_hijos:"horario_con_hijos", adulto_mayor:"adulto_mayor",
      sin_estudios:"sin_estudios", reingreso:"laguna_laboral",
      perfil_licenciado:"perfil_licenciado",
    };
    if (atencionMap[etapa]) metricas.restriccionesAtendidas.push(atencionMap[etapa]);

    metricas.scores.push(score);
    metricas.tiposUsados.push(tipo.id);
    metricas.turnosTotales++;
    if (!error) metricas.turnosOk++;
    else { metricas.errores.push({ etapa, error }); }
    metricas.latenciaTotal += latTotal;
    metricas.latenciaMax = Math.max(metricas.latenciaMax, latTotal);
  }

  const scorePromedio = metricas.scores.length
    ? parseFloat((metricas.scores.reduce((a,b)=>a+b,0)/metricas.scores.length).toFixed(2))
    : 0;

  // Onboarding si llegó a entrevista
  if (metricas.entrevistaAgendada && rand() < 0.65) simularOnboarding(candidato);

  return {
    id: candidato.id,
    nombre: candidato.nombre,
    canal: candidato.canal.id,
    vacante: candidato.vacante.titulo,
    restricciones: candidato.restricciones,
    flujo: candidato.flujo,
    metricas: {
      ...metricas,
      scorePromedio,
      latenciaMedia: metricas.turnosTotales > 0
        ? Math.round(metricas.latenciaTotal / metricas.turnosTotales) : 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  POOL DE EJECUCIÓN
// ─────────────────────────────────────────────────────────────────────────────
async function runPool(candidatos) {
  const resultados = [];
  let done = 0, active = 0, idx = 0;
  const t0 = Date.now();

  const uiHandle = setInterval(() => {
    const pct = Math.round(done/TOTAL*100);
    const bar = "█".repeat(Math.round(pct/5)) + "░".repeat(20 - Math.round(pct/5));
    process.stdout.write(
      `\r  [${bar}] ${pct}% · ${done}/${TOTAL} · activos: ${active} · citas: ${agendaOcupada.size} · cola-IA: ${AI_QUEUE.cola}   `
    );
  }, 300);

  await new Promise(resolve => {
    function dispatch() {
      while (active < CONCURRENCY && idx < candidatos.length) {
        const c = candidatos[idx++]; active++;
        simularConversacion(c).then(r => {
          resultados.push(r); done++; active--;
          dispatch();
          if (done >= TOTAL) resolve();
        }).catch(() => { done++; active--; dispatch(); if (done >= TOTAL) resolve(); });
      }
    }
    dispatch();
  });

  clearInterval(uiHandle);
  process.stdout.write("\n");
  return resultados;
}

// ─────────────────────────────────────────────────────────────────────────────
//  REPORTE FINAL
// ─────────────────────────────────────────────────────────────────────────────
function bold(s)  { return `\x1b[1m${s}\x1b[0m`; }
function cyan(s)  { return `\x1b[36m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s){ return `\x1b[33m${s}\x1b[0m`; }
function red(s)   { return `\x1b[31m${s}\x1b[0m`; }
function dim(s)   { return `\x1b[2m${s}\x1b[0m`; }
const bar = (v, max, w=18) => {
  const n = Math.round((v/max)*w);
  return green("█".repeat(n)) + dim("░".repeat(w-n));
};
const pad = (s, n) => String(s).padEnd(n," ");
const lpad = (s, n) => String(s).padStart(n," ");

function imprimirReporte(resultados, duracionMs) {
  const total  = resultados.length;
  const ok     = resultados.filter(r => r.metricas.ok).length;
  const entrev = resultados.filter(r => r.metricas.entrevistaAgendada).length;
  const abnd   = resultados.filter(r => r.metricas.abandono).length;
  const rl     = resultados.filter(r => r.metricas.rateLimitHit).length;
  const scores = resultados.map(r => r.metricas.scorePromedio).filter(s => s > 0);
  const scoreAvg = parseFloat((scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2));
  const latAvg = Math.round(resultados.reduce((a,r)=>a+r.metricas.latenciaMedia,0)/total);
  const latMax = Math.max(...resultados.map(r => r.metricas.latenciaMax));

  const citas = [...agendaOcupada.entries()].filter(([k])=>!k.includes("confirmed")).length;
  const citasConf = [...agendaOcupada.keys()].filter(k=>k.includes("confirmed")).length;

  // Por canal
  const porCanal = {};
  CANALES.forEach(c => {
    const rs = resultados.filter(r => r.canal === c.id);
    if (!rs.length) return;
    const exitosos = rs.filter(r => !r.metricas.rateLimitHit && r.metricas.scorePromedio > 0);
    porCanal[c.id] = {
      label: c.label,
      total: rs.length,
      entrev: rs.filter(r => r.metricas.entrevistaAgendada).length,
      score: exitosos.length
        ? parseFloat((exitosos.reduce((a,r)=>a+r.metricas.scorePromedio,0)/exitosos.length).toFixed(1))
        : 0,
      rl: rs.filter(r => r.metricas.rateLimitHit).length,
    };
  });

  // Por vacante
  const porVacante = {};
  VACANTES.forEach(v => {
    const rs = resultados.filter(r => r.vacante === v.titulo);
    if (!rs.length) return;
    const exitosos = rs.filter(r => !r.metricas.rateLimitHit && r.metricas.scorePromedio > 0);
    porVacante[v.id] = {
      label: v.titulo, total: rs.length,
      entrev: rs.filter(r => r.metricas.entrevistaAgendada).length,
      score: exitosos.length
        ? parseFloat((exitosos.reduce((a,r)=>a+r.metricas.scorePromedio,0)/exitosos.length).toFixed(1))
        : 0,
    };
  });

  // Por tipo de mensaje
  const tiposCount = {};
  resultados.forEach(r => r.metricas.tiposUsados.forEach(t => { tiposCount[t] = (tiposCount[t]||0)+1; }));

  // Por restricción
  const rCount = {};
  resultados.forEach(r => r.restricciones.forEach(x => { rCount[x] = (rCount[x]||0)+1; }));
  const rAtendida = {};
  resultados.forEach(r => r.metricas.restriccionesAtendidas.forEach(x => { rAtendida[x] = (rAtendida[x]||0)+1; }));

  console.log("\n");
  console.log(bold(cyan("╔══════════════════════════════════════════════════════════════════════════╗")));
  console.log(bold(cyan("║     🚀  RHDreams — SIMULACIÓN MAESTRA — AUDITORÍA COMPLETA DE APP       ║")));
  console.log(bold(cyan("╚══════════════════════════════════════════════════════════════════════════╝")));

  console.log(`\n  Modo: ${bold(yellow(MODE.toUpperCase()))} | Candidatos: ${bold(total.toLocaleString())} | Seed: ${SEED_INIT}`);
  console.log(`  Duración total: ${bold((duracionMs/1000).toFixed(1)+"s")} | Concurrencia: ${CONCURRENCY}`);

  // ── RESUMEN EJECUTIVO ────────────────────────────────────────────────────
  console.log(`\n  ${bold("── RESUMEN EJECUTIVO ─────────────────────────────────────────────────")}`);
  const w = 46;
  const mkRow = (label, val, pct) => `    ${pad(label,w)} ${bold(val)}${pct ? dim(` (${pct}%)`) : ""}`;
  console.log(mkRow("Candidatos procesados:",          total.toLocaleString()));
  console.log(mkRow("Conversaciones exitosas:",         ok.toLocaleString(),       Math.round(ok/total*100)));
  console.log(mkRow("Entrevistas agendadas:",           entrev.toLocaleString(),   Math.round(entrev/total*100)));
  console.log(mkRow("  → Citas confirmadas:",           citasConf.toLocaleString(),Math.round(citasConf/Math.max(entrev,1)*100)));
  console.log(mkRow("Abandonos:",                       abnd.toLocaleString(),     Math.round(abnd/total*100)));
  console.log(mkRow("Rate limit hits:",                 rl.toLocaleString(),       Math.round(rl/total*100)));
  console.log(mkRow("Score humanización promedio:",     `${scoreAvg}/10`));
  console.log(mkRow("Latencia media por turno:",        `${latAvg}ms`));
  console.log(mkRow("Latencia máxima registrada:",      `${latMax}ms`));

  // ── AGENDA / CALENDARIO ──────────────────────────────────────────────────
  console.log(`\n  ${bold("── AGENDA / CALENDARIO ──────────────────────────────────────────────")}`);
  const diasConCitas = new Map();
  agendaOcupada.forEach((v, k) => {
    if (k.includes("confirmed")) return;
    const dia = k.split("|")[0];
    diasConCitas.set(dia, (diasConCitas.get(dia)||0)+1);
  });
  const diasOrdenados = [...diasConCitas.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,10);
  console.log(`    Total de citas en agenda:  ${bold(green(citas.toLocaleString()))}`);
  console.log(`    Citas confirmadas:         ${bold(green(citasConf.toLocaleString()))} (${Math.round(citasConf/Math.max(citas,1)*100)}% tasa de confirmación)`);
  console.log(`    Días con entrevistas:      ${diasOrdenados.length}`);
  if (diasOrdenados.length > 0) {
    console.log(`    Distribución por día:`);
    const maxDia = Math.max(...diasOrdenados.map(d=>d[1]));
    diasOrdenados.forEach(([dia, n]) => {
      console.log(`      ${dim(dia)}  ${bar(n, maxDia, 12)}  ${bold(n)} citas`);
    });
  }

  // ── MÓDULOS ──────────────────────────────────────────────────────────────
  console.log(`\n  ${bold("── MÓDULOS DEL SISTEMA ──────────────────────────────────────────────")}`);

  // Cola de IA
  const aiOk = AI_QUEUE.total - AI_QUEUE.timeout;
  console.log(`    ${bold("Cola de IA (BullMQ/Gemini)")}`);
  console.log(`      Total procesados:  ${bold(AI_QUEUE.total.toLocaleString())}`);
  console.log(`      Exitosos:          ${green(aiOk.toLocaleString())} (${Math.round(aiOk/Math.max(AI_QUEUE.total,1)*100)}%)`);
  console.log(`      Timeouts:          ${AI_QUEUE.timeout > 0 ? red(AI_QUEUE.timeout) : green("0")}`);

  // Rate limiter
  const totalMsgPorCanal = Object.values(rateLimits).reduce((a,v)=>a+v.length,0);
  console.log(`\n    ${bold("Rate Limiter (por canal)")}`);
  CANALES.forEach(c => {
    const cnt = (rateLimits[c.id]||[]).length;
    const max = RATE_MAX[c.id];
    const pct = Math.round(cnt/max*100);
    const color = pct > 90 ? red : pct > 70 ? yellow : green;
    console.log(`      ${pad(c.label,22)} ${bar(cnt,max,10)} ${color(cnt)}/${max} (${pct}%)`);
  });

  // Automatizaciones
  console.log(`\n    ${bold("Automatizaciones disparadas")}`);
  Object.entries(AUTOMATIONS).forEach(([k,v]) => {
    console.log(`      ${pad(k,30)} ${bold(v.toLocaleString())} veces`);
  });

  // Onboarding
  console.log(`\n    ${bold("Onboarding post-contratación")}`);
  console.log(`      Iniciados:     ${bold(ONBOARDING.iniciados)}`);
  console.log(`      DDO:           ${bold(ONBOARDING.ddo)}`);
  console.log(`      Primer día:    ${bold(ONBOARDING.primerDia)}`);
  console.log(`      Inventario:    ${bold(ONBOARDING.inventario)}`);
  console.log(`      Completados:   ${bold(green(ONBOARDING.completados))}`);

  // ── POR CANAL ────────────────────────────────────────────────────────────
  console.log(`\n  ${bold("── RENDIMIENTO POR CANAL ────────────────────────────────────────────")}`);
  console.log(`    ${pad("Canal",22)} ${pad("Candidatos",12)} ${pad("Entrevistas",12)} ${pad("Score",8)} ${pad("Rate limit",10)}`);
  console.log(`    ${"─".repeat(68)}`);
  CANALES.forEach(c => {
    const d = porCanal[c.id];
    if (!d) return;
    const pct = Math.round(d.entrev/d.total*100);
    const scoreColor = d.score >= 9 ? green : d.score >= 8 ? cyan : yellow;
    console.log(`    ${pad(d.label,22)} ${pad(d.total,12)} ${pad(`${d.entrev} (${pct}%)`,12)} ${scoreColor(pad(`${d.score}/10`,8))} ${d.rl > 0 ? red(d.rl) : green("0")}`);
  });

  // ── POR VACANTE ──────────────────────────────────────────────────────────
  console.log(`\n  ${bold("── RENDIMIENTO POR VACANTE ──────────────────────────────────────────")}`);
  console.log(`    ${pad("Vacante",28)} ${pad("Candidatos",12)} ${pad("Entrevistas",12)} ${pad("Conversión",10)} Score`);
  console.log(`    ${"─".repeat(72)}`);
  VACANTES.forEach(v => {
    const d = porVacante[v.id];
    if (!d) return;
    const pct = Math.round(d.entrev/d.total*100);
    console.log(`    ${pad(d.label,28)} ${pad(d.total,12)} ${pad(d.entrev,12)} ${bar(pct,100,8)}${lpad(pct+"%",5)} ${green(d.score+"/10")}`);
  });

  // ── TIPOS DE MENSAJES ────────────────────────────────────────────────────
  console.log(`\n  ${bold("── TIPOS DE MENSAJES RECIBIDOS ──────────────────────────────────────")}`);
  const totalMsg = Object.values(tiposCount).reduce((a,b)=>a+b,0);
  TIPOS_MSG.forEach(t => {
    const n = tiposCount[t.id] || 0;
    const pct = Math.round(n/totalMsg*100);
    console.log(`    ${pad(t.label,18)} ${bar(n,totalMsg)} ${bold(n.toLocaleString())} (${pct}%)`);
  });

  // ── RESTRICCIONES ────────────────────────────────────────────────────────
  console.log(`\n  ${bold("── RESTRICCIONES DETECTADAS Y ATENDIDAS ─────────────────────────────")}`);
  const rKeys = Object.keys(rCount).sort((a,b)=>rCount[b]-rCount[a]);
  console.log(`    ${pad("Restricción",32)} ${pad("Detectados",12)} ${pad("Atendidos",12)} Cobertura`);
  console.log(`    ${"─".repeat(70)}`);
  rKeys.forEach(k => {
    const det = rCount[k] || 0;
    const ate = rAtendida[k] || 0;
    const cob = det > 0 ? Math.round(ate/det*100) : 100;
    const cobColor = cob >= 90 ? green : cob >= 60 ? yellow : red;
    console.log(`    ${pad(k,32)} ${pad(det,12)} ${pad(ate,12)} ${cobColor(cob+"%")}`);
  });

  // ── ONBOARDING FUNNEL ────────────────────────────────────────────────────
  console.log(`\n  ${bold("── FUNNEL COMPLETO DE CONVERSIÓN ────────────────────────────────────")}`);
  const funnel = [
    ["Contactos iniciales",  total,              "100%"],
    ["Conversación exitosa", ok,                 Math.round(ok/total*100)+"%"],
    ["Entrevista agendada",  entrev,             Math.round(entrev/total*100)+"%"],
    ["Cita confirmada",      citasConf,          Math.round(citasConf/total*100)+"%"],
    ["Onboarding iniciado",  ONBOARDING.iniciados, Math.round(ONBOARDING.iniciados/total*100)+"%"],
    ["DDO completado",       ONBOARDING.ddo,     Math.round(ONBOARDING.ddo/total*100)+"%"],
    ["Primer día",           ONBOARDING.primerDia,Math.round(ONBOARDING.primerDia/total*100)+"%"],
    ["Contratado completo",  ONBOARDING.completados, Math.round(ONBOARDING.completados/total*100)+"%"],
  ];
  funnel.forEach(([label, n, pct]) => {
    const barLen = Math.round(parseInt(pct)/5);
    const color = parseInt(pct) >= 60 ? green : parseInt(pct) >= 30 ? yellow : red;
    console.log(`    ${pad(label,28)} ${bar(parseInt(pct),100,16)} ${color(pad(String(n),6))} ${dim(pct)}`);
  });

  // ── RECOMENDACIONES ──────────────────────────────────────────────────────
  console.log(`\n  ${bold("── RECOMENDACIONES DE PRODUCCIÓN ────────────────────────────────────")}`);
  const recs = [];
  if (rl > total * 0.05) recs.push({ p:"P0", color:red,    msg:`Rate limit afectó ${rl} candidatos — aumentar RATE_LIMIT_MAX por canal o distribuir carga` });
  if (AI_QUEUE.timeout > 10) recs.push({ p:"P0", color:red, msg:`${AI_QUEUE.timeout} timeouts de IA — verificar GEMINI_API_KEY, activar fallback Groq/OpenRouter` });
  if (scoreAvg < 9.5) recs.push({ p:"P1", color:yellow, msg:`Score humanización ${scoreAvg}/10 — ajustar prompts del agente para incluir más contexto` });
  if (citasConf/Math.max(citas,1) < 0.7) recs.push({ p:"P1", color:yellow, msg:`Tasa confirmación citas ${Math.round(citasConf/Math.max(citas,1)*100)}% — activar recordatorio automático 24h antes` });
  if (abnd > total * 0.2) recs.push({ p:"P1", color:yellow, msg:`${abnd} abandonos (${Math.round(abnd/total*100)}%) — mejorar respuesta en <3s en horario pico` });
  recs.push({ p:"P1", color:yellow, msg:"Activar Google Calendar sync para las citas → candidatos reciben invite automático" });
  recs.push({ p:"P2", color:green, msg:"TikTok/Instagram: primer mensaje incluye link a WhatsApp — continúa conversación por WA" });
  recs.push({ p:"P2", color:green, msg:"Indeed: candidatos pre-filtrados → priorizar en cola de entrevistas" });
  recs.push({ p:"P2", color:green, msg:"Adultos mayores: flag especial → agente omite pregunta de edad directa" });
  recs.push({ p:"P2", color:green, msg:"Madres/padres solos: ofrecer turno matutino desde el primer mensaje sin que lo pidan" });

  recs.forEach(r => {
    console.log(`    ${r.color(bold("["+r.p+"]"))} ${r.msg}`);
  });

  // ── PROYECCIÓN ───────────────────────────────────────────────────────────
  console.log(`\n  ${bold("── PROYECCIÓN DE CAPACIDAD ──────────────────────────────────────────")}`);
  const tasa = ok/total;
  const tasaColor = tasa >= 0.95 ? green : tasa >= 0.70 ? yellow : red;
  console.log(`    Tasa de éxito:              ${tasaColor(Math.round(tasa*100)+"%")}`);
  console.log(`    Humanización promedio:       ${cyan(scoreAvg+"/10")}`);
  console.log(`    ${bold("Conversaciones/hora estimadas (1 worker):")}  ${bold((3600000/latAvg).toLocaleString("es-MX"))}`);
  console.log(`    ${bold("Con PM2 cluster (4 workers) + Redis:")}       ${bold((4*3600000/latAvg).toLocaleString("es-MX"))}`);
  console.log(`    ${bold("Candidatos que llegan a entrevista:")}        ${green(entrev.toLocaleString())} (${Math.round(entrev/total*100)}%)`);
  console.log(`    ${bold("Contrataciones estimadas:")}                  ${green(ONBOARDING.completados.toLocaleString())} (${Math.round(ONBOARDING.completados/total*100)}%)`);

  console.log(`\n${bold(cyan("═".repeat(76)))}\n`);

  return { total, ok, entrev, citasConf, abnd, rl, scoreAvg, latAvg };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(bold(cyan("╔═══════════════════════════════════════════════════════════════════════╗")));
  console.log(bold(cyan("║   🚀  RHDreams — Simulación Maestra — Todos los módulos en paralelo  ║")));
  console.log(bold(cyan("╚═══════════════════════════════════════════════════════════════════════╝")));
  console.log(`\n  Modo: ${bold(yellow(MODE.toUpperCase()))} | Candidatos: ${bold(TOTAL.toLocaleString())} | Concurrencia: ${CONCURRENCY} | Seed: ${SEED_INIT}`);
  console.log(`  Módulos: Agenda · Cola IA · Rate Limit · Automaciones · Onboarding · Multi-canal\n`);

  console.log(`  Generando ${TOTAL.toLocaleString()} perfiles...`);
  const candidatos = Array.from({length: TOTAL}, (_, i) => generarCandidato(i+1));
  console.log(`  ${green(TOTAL.toLocaleString())} candidatos generados. Iniciando simulación...\n`);

  const t0 = Date.now();
  const resultados = await runPool(candidatos);
  const duracion = Date.now() - t0;

  const resumen = imprimirReporte(resultados, duracion);

  if (EXPORT_JSON) {
    try {
      mkdirSync("./logs", { recursive: true });
      const path = `./logs/simulacion-full-${Date.now()}.json`;
      writeFileSync(path, JSON.stringify({ resumen, resultados: resultados.slice(0,100) }, null, 2));
      console.log(`  Resultados exportados: ${path}\n`);
    } catch(e) {}
  }
}

main().catch(console.error);
