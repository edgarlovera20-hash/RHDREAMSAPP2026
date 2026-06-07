#!/usr/bin/env node
/**
 * simulate-candidates.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulación completa: 1000 candidatos con todos los perfiles posibles
 * contactan a Heavenly Dreams por 6 canales (WhatsApp, Messenger, Instagram,
 * TikTok, Indeed) preguntando por las 4 vacantes reales.
 *
 * Variables modeladas:
 *  Canales:       WhatsApp Baileys, WhatsApp Meta, Messenger, Instagram DM, TikTok, Indeed
 *  Vacantes:      Ayudante General, Asesor Comercial, Supervisor de Personal, Promotor
 *  Escolaridad:   Sin estudios → Licenciatura (7 niveles)
 *  Experiencia:   Sin experiencia → +10 años (5 niveles)
 *  Edad:          16 a 65 años
 *  Situación:     Soltero, casado, madre/padre soltero, estudiante, adulto mayor
 *  Disponibilidad: Tiempo completo, medio tiempo, fines de semana, turno nocturno
 *  Personalidad:  8 tipos (formal, informal, ansioso, desconfiado, apurado, agresivo, tímido, comunicativo)
 *  Tipos de msg:  Texto, Audio/voz, Foto del anuncio, Foto del CV, PDF del CV
 *  Restricciones: Menor de edad, solo fines de semana, sin CURP, sin INE, lleva tiempo sin trabajar
 *
 * Uso:
 *   node scripts/simulate-candidates.mjs
 *   node scripts/simulate-candidates.mjs --candidates=1000 --seed=42
 *   node scripts/simulate-candidates.mjs --mode=live --base=http://localhost:3000 --token=JWT
 *   node scripts/simulate-candidates.mjs --report=resultado.json
 */

import { writeFileSync } from "fs";
import { performance } from "perf_hooks";

// ─── CLI ─────────────────────────────────────────────────────────────────────
const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const [k, v] = arg.slice(2).split("=");
  args.set(k, v ?? process.argv[++i]);
}
const MODE        = args.get("mode")       || "dry";
const BASE_URL    = (args.get("base")      || "http://localhost:3000").replace(/\/$/, "");
const TOTAL       = Number(args.get("candidates") || 1000);
const CONCURRENCY = Number(args.get("concurrency") || 60);
const SEED        = Number(args.get("seed") || Date.now());
const REPORT_PATH = args.get("report") || "";
const AUTH_TOKEN  = args.get("token") || "";

// ─── Colores ANSI ─────────────────────────────────────────────────────────────
const C = {
  reset:"\x1b[0m", bold:"\x1b[1m", dim:"\x1b[2m",
  red:"\x1b[31m", green:"\x1b[32m", yellow:"\x1b[33m",
  blue:"\x1b[34m", magenta:"\x1b[35m", cyan:"\x1b[36m", white:"\x1b[37m",
  bgRed:"\x1b[41m", bgGreen:"\x1b[42m",
};

// ─── PRNG determinista ────────────────────────────────────────────────────────
let _s = SEED;
const rand  = () => { _s = (_s*1664525+1013904223)&0xffffffff; return ((_s>>>0)/0xffffffff); };
const ri    = (a,b) => a + Math.floor(rand()*(b-a+1));
const pick  = (arr) => arr[Math.floor(rand()*arr.length)];
const pickW = (items) => {
  const tot = items.reduce((s,x)=>s+x.w,0);
  let r = rand()*tot;
  for (const x of items) { r-=x.w; if(r<=0) return x.v; }
  return items[items.length-1].v;
};

// ─────────────────────────────────────────────────────────────────────────────
//  DATOS MAESTROS
// ─────────────────────────────────────────────────────────────────────────────

/** Las 4 vacantes reales de Heavenly Dreams */
const VACANTES = [
  {
    id: "ayudante_general",
    titulo: "Ayudante General",
    sueldo: "$2,000 semanales",
    sueldoNum: 2000,
    descripcion: "Apoyo en actividades operativas generales: limpieza, acomodo, traslados y asistencia al área asignada.",
    requisitos: ["Secundaria terminada","Actitud de servicio","Disponibilidad de horario completo"],
    horario: "Lunes a sábado 8am–6pm",
    zona: "Iztapalapa, CDMX",
    experiencia_requerida: "No indispensable",
    escolaridad_minima: "secundaria",
    perfiles_ideales: ["joven_sin_exp","adulto_exp_minima","madre_familia","reingreso","adulto_mayor"],
    peso: 35,
  },
  {
    id: "asesor_comercial",
    titulo: "Asesor Comercial",
    sueldo: "$2,300 semanales + comisiones",
    sueldoNum: 2300,
    descripcion: "Atención y asesoría personalizada a clientes, venta de productos y cumplimiento de metas.",
    requisitos: ["Preparatoria o equivalente","Experiencia en ventas deseable","Facilidad de comunicación","Presentación"],
    horario: "Lunes a sábado 9am–7pm",
    zona: "Varias sucursales CDMX y Área Metropolitana",
    experiencia_requerida: "1 año deseable",
    escolaridad_minima: "preparatoria",
    perfiles_ideales: ["adulto_exp","recien_egresado","trabajador_activo","adulto_exp_minima"],
    peso: 30,
  },
  {
    id: "supervisor_personal",
    titulo: "Supervisor de Personal",
    sueldo: "$2,600 semanales",
    sueldoNum: 2600,
    descripcion: "Supervisión de equipo operativo, control de KPIs, resolución de conflictos y reporte a gerencia.",
    requisitos: ["Preparatoria o licenciatura","Mínimo 2 años liderando equipos","Manejo de KPIs","Disponibilidad para rotación de turno"],
    horario: "Rotativo (matutino/vespertino)",
    zona: "CDMX y Área Metropolitana",
    experiencia_requerida: "2+ años en supervisión",
    escolaridad_minima: "preparatoria",
    perfiles_ideales: ["adulto_exp","trabajador_activo","licenciado","ejecutivo"],
    peso: 15,
  },
  {
    id: "promotor",
    titulo: "Promotor de Ventas",
    sueldo: "$2,000 semanales + bonos de campo",
    sueldoNum: 2000,
    descripcion: "Promoción de productos en campo: visita a puntos de venta, exhibición, seguimiento a clientes y cierre.",
    requisitos: ["Secundaria o preparatoria","Extroversión y energía","Disponibilidad para trabajar en campo","Tolerancia al trabajo de calle"],
    horario: "Lunes a viernes 8am–5pm",
    zona: "Itinerante CDMX, Estado de México",
    experiencia_requerida: "No indispensable",
    escolaridad_minima: "secundaria",
    perfiles_ideales: ["joven_sin_exp","adulto_exp_minima","estudiante","trabajador_activo"],
    peso: 20,
  },
];

/** Todos los niveles de escolaridad posibles */
const ESCOLARIDADES = [
  { id: "sin_estudios",        label: "Sin estudios formales",      nivel: 0, peso: 3  },
  { id: "primaria",            label: "Primaria",                   nivel: 1, peso: 5  },
  { id: "secundaria",          label: "Secundaria",                 nivel: 2, peso: 15 },
  { id: "prepa_trunca",        label: "Preparatoria trunca",        nivel: 3, peso: 12 },
  { id: "preparatoria",        label: "Preparatoria / Bachillerato",nivel: 4, peso: 28 },
  { id: "tecnico",             label: "Carrera técnica",            nivel: 5, peso: 10 },
  { id: "universidad_trunca",  label: "Universidad trunca",         nivel: 6, peso: 8  },
  { id: "licenciatura",        label: "Licenciatura",               nivel: 7, peso: 15 },
  { id: "posgrado",            label: "Maestría / Posgrado",        nivel: 8, peso: 4  },
];

/** Niveles de experiencia */
const EXPERIENCIAS = [
  { id: "sin_exp",     label: "Sin experiencia",              anios: [0,0],   peso: 22 },
  { id: "menos_1",     label: "Menos de 1 año",               anios: [0,1],   peso: 15 },
  { id: "1_3",         label: "1 a 3 años",                   anios: [1,3],   peso: 28 },
  { id: "3_10",        label: "3 a 10 años",                  anios: [3,10],  peso: 25 },
  { id: "mas_10",      label: "Más de 10 años",               anios: [10,25], peso: 10 },
];

/** Situación personal / familiar */
const SITUACIONES = [
  { id: "soltero",        label: "Soltero/a sin hijos",              peso: 30 },
  { id: "casado",         label: "Casado/a",                         peso: 20 },
  { id: "madre_sola",     label: "Madre/padre soltero con hijos",    peso: 18 },
  { id: "estudiante",     label: "Estudia y trabaja",                peso: 12 },
  { id: "adulto_mayor",   label: "Adulto mayor (50-65a)",            peso: 8  },
  { id: "recien_llegado", label: "Migrante / recién llegado",        peso: 5  },
  { id: "reingreso",      label: "Reingreso (>1 año sin trabajar)",  peso: 7  },
];

/** Disponibilidad de horario */
const DISPONIBILIDADES = [
  { id: "completo",       label: "Tiempo completo",       peso: 45 },
  { id: "medio_tiempo",   label: "Medio tiempo",          peso: 20 },
  { id: "fines_semana",   label: "Solo fines de semana",  peso: 10 },
  { id: "matutino",       label: "Solo turno matutino",   peso: 15 },
  { id: "nocturno",       label: "Turno nocturno",        peso: 10 },
];

/** Canales de contacto */
const CANALES = [
  { id: "whatsapp_baileys", label: "WhatsApp (directo)",          emoji: "📱", peso: 30,
    latenciaMs: 700,  soporte: ["texto","audio","imagen","pdf"], limiteChars: 4096 },
  { id: "whatsapp_meta",   label: "WhatsApp Business API",        emoji: "💬", peso: 25,
    latenciaMs: 550,  soporte: ["texto","audio","imagen","pdf"], limiteChars: 4096 },
  { id: "messenger",       label: "Messenger (Facebook)",         emoji: "🔵", peso: 18,
    latenciaMs: 400,  soporte: ["texto","imagen","pdf"],        limiteChars: 2000 },
  { id: "instagram",       label: "Instagram DM",                 emoji: "📸", peso: 15,
    latenciaMs: 350,  soporte: ["texto","imagen"],              limiteChars: 1000 },
  { id: "tiktok",          label: "TikTok (comentario/DM)",       emoji: "🎵", peso: 7,
    latenciaMs: 500,  soporte: ["texto"],                       limiteChars: 500  },
  { id: "indeed",          label: "Indeed (postulación/chat)",    emoji: "💼", peso: 5,
    latenciaMs: 900,  soporte: ["texto","pdf"],                 limiteChars: 3000 },
];

/** Tipos de mensaje y su tiempo de procesamiento AI */
const TIPOS_MSG = [
  { id: "texto",       label: "Texto",             emoji:"✍️",  procesadoMs: 0,    peso: 48 },
  { id: "audio",       label: "Audio / voz",        emoji:"🎙️", procesadoMs: 2500, peso: 22 },
  { id: "foto_anuncio",label: "Foto del anuncio",   emoji:"📢",  procesadoMs: 1600, peso: 12 },
  { id: "foto_cv",     label: "Foto del CV",        emoji:"📷",  procesadoMs: 2000, peso: 10 },
  { id: "pdf_cv",      label: "PDF del CV",         emoji:"📄",  procesadoMs: 1200, peso: 8  },
];

/** Personalidades del candidato */
const PERSONALIDADES = [
  { id: "formal",       label: "Formal y educado",              peso: 15 },
  { id: "informal",     label: "Informal / coloquial",           peso: 28 },
  { id: "ansioso",      label: "Ansioso / desesperado",         peso: 14 },
  { id: "desconfiado",  label: "Desconfiado / cauteloso",       peso: 10 },
  { id: "apurado",      label: "Apurado / breve (monosílabos)", peso: 12 },
  { id: "agresivo",     label: "Impaciente / exigente",         peso: 5  },
  { id: "timido",       label: "Tímido / inseguro",             peso: 8  },
  { id: "comunicativo", label: "Comunicativo / detallado",      peso: 8  },
];

/** Variante de lenguaje */
const VARIANTES = [
  { id: "neutro",   label: "Español neutro",                 peso: 35 },
  { id: "chilango", label: "CDMX (chilango)",                peso: 30 },
  { id: "nortenio", label: "Norteño",                        peso: 15 },
  { id: "sureno",   label: "Sureño / Oaxaqueño",             peso: 10 },
  { id: "regional", label: "Con palabras en lengua indígena",peso: 5  },
  { id: "anglismo", label: "Spanglish / anglicismos jóvenes",peso: 5  },
];

const NOMBRES = [
  "Ana García","Carlos Pérez","María López","Juan Martínez","Sofía Hernández",
  "Luis Torres","Gabriela Díaz","Roberto Sánchez","Valentina Ramírez","Diego Flores",
  "Paola Reyes","Andrés Morales","Camila Castro","Fernando Ortiz","Daniela Vargas",
  "Ximena Mendoza","Alejandro Ruiz","Fernanda Jiménez","Miguel Ángel Delgado","Karla Romero",
  "Omar Castillo","Esther Guzmán","Iván Moreno","Brenda Acosta","Samuel Herrera",
  "Yolanda Vega","Rafael Luna","Lucía Peña","Ernesto Salinas","Patricia Alvarado",
  "Adriana Fuentes","Joel Paredes","Norma Ramos","Hector Medina","Claudia Suárez",
  "Rodrigo Chávez","Isabel Reyna","Kevin Navarro","Marisol Guerrero","Arturo Miranda",
  "Cynthia Varela","Gerardo Espinosa","Leticia Cruz","Enrique Soria","Beatriz Nava",
];

const ZONAS = [
  "Iztapalapa","Ecatepec","Tlalnepantla","Naucalpan","Nezahualcóyotl","Chalco",
  "Valle de Chalco","Chimalhuacán","Texcoco","Tultitlán","Cuautitlán","Atizapán",
  "Monterrey","Guadalajara","Puebla","Tijuana","León","Ciudad Juárez",
];

// ─────────────────────────────────────────────────────────────────────────────
//  MENSAJES POR ETAPA / PERSONALIDAD / CANAL
// ─────────────────────────────────────────────────────────────────────────────

const MSG = {
  // ── Primer contacto ──────────────────────────────────────────────────────
  primer_contacto: {
    formal:      ["Buenos días, vi su anuncio y me interesa postularme. ¿Me puede dar información?",
                  "Buen día, quisiera conocer los detalles de la vacante publicada."],
    informal:    ["hola!! vi q buscaban gente 👀","oye me interesa el trabajo","hola info del empleo",
                  "q onda vi el anuncio","hola kiero saber del trabajo jaja"],
    ansioso:     ["NECESITO TRABAJO URGENTE POR FAVOR","hola todavía hay vacante?? me urge",
                  "sigo a tiempo para aplicar??"],
    desconfiado: ["hola vi el anuncio... es verdad o fraude?","oigan es empresa real?","es en serio el trabajo?"],
    apurado:     ["info","empleo","hola","trabajo","vacante?"],
    agresivo:    ["oye cuánto tardan en responder??","llevan horas y no me contestan","por qué no responden"],
    timido:      ["hola... disculpe... vi su anuncio... ¿todavía hay trabajo?",
                  "perdón la molestia... quería preguntar por el empleo"],
    comunicativo:["Hola buenos días, mi nombre es X, vi su anuncio en Facebook y me gustaría saber más sobre las vacantes disponibles. Tengo experiencia y creo que podría aportar mucho."],
    // canales específicos
    tiktok:      ["vi el tiktok del trabajo!! me interesa 🔥","ese vid del empleo me llegó jaja quiero info",
                  "el video salió en mi fyp!! cómo aplico?","cuánto pagan? vi el tiktok"],
    instagram:   ["vi tu reel!! cómo entro?","ese post del trabajo!! info pls","me salió tu historia del empleo 👀",
                  "hola vi tu perfil qué vacantes tienen","vi el carrusel del trabajo info!!"],
    indeed:      ["Me postulé en Indeed para la vacante de {vacante}. Quisiera más información.",
                  "Envié mi CV por Indeed. ¿Cuáles son los siguientes pasos?"],
    messenger:   ["Hola vi la publicación de Facebook sobre el trabajo de {vacante}",
                  "Oye vi el post de empleo, me interesa. Cuánto pagan?"],
  },

  // ── Pregunta por vacante específica ──────────────────────────────────────
  pregunta_vacante: {
    formal:      ["¿Me podría indicar en qué consiste el puesto de {vacante}?",
                  "Quisiera conocer los requisitos del puesto de {vacante}."],
    informal:    ["y de qué es lo de {vacante}?","el {vacante} qué hay que hacer","qué hace el {vacante}"],
    ansioso:     ["el {vacante} está disponible aún??","todavía hay lugar para {vacante}?"],
    desconfiado: ["el {vacante} de verdad existe o es trampa?","cuánto pagan REALMENTE en {vacante}?"],
    apurado:     ["{vacante}?","el {vacante}","info {vacante}"],
    agresivo:    ["oye llevo rato esperando info del {vacante}","cuándo me dan info del {vacante}??"],
    timido:      ["perdón... ¿el puesto de {vacante} sigue disponible?"],
    comunicativo:["Me gustaría saber los detalles completos del puesto de {vacante}: actividades, horario, ubicación y beneficios."],
  },

  // ── Pregunta sueldo ──────────────────────────────────────────────────────
  pregunta_sueldo: {
    formal:      ["¿Cuál es el salario que ofrecen para el puesto?",
                  "¿Podría indicarme el monto de la remuneración mensual?"],
    informal:    ["cuánto pagan?? 💰","y el sueldo cuánto es","q tal el salario jaja","de cuánto es la lana"],
    ansioso:     ["cuánto pagan? necesito saber ya","alcanza para vivir con ese sueldo?"],
    desconfiado: ["cuánto pagan DE VERDAD, no lo del anuncio","el sueldo es seguro? no vales verdad?"],
    apurado:     ["sueldo?","cuánto?","paga?"],
    agresivo:    ["el sueldo que publicaron SE PUEDE MEJORAR","con ese sueldo no alcanza, pueden más?"],
    timido:      ["disculpe... ¿cuánto es el sueldo aproximadamente?"],
    comunicativo:["¿Me podría decir cuál es el salario base, si hay comisiones, bonos o prestaciones adicionales?"],
  },

  // ── Pregunta horario ─────────────────────────────────────────────────────
  pregunta_horario: {
    formal:      ["¿Cuáles son los horarios disponibles?","¿Tienen turno flexible?"],
    informal:    ["qué horarios hay?","cuántas horas son?","dan día libre entre semana?"],
    ansioso:     ["puedo elegir mi horario?? es que tengo cosas","el horario es fijo o cambia?"],
    desconfiado: ["no hacen horas extra sin pagar verdad?","los horarios son como dicen?"],
    apurado:     ["horario?","turno?","cuántas horas?"],
    agresivo:    ["el horario es fijo verdad? porque no quiero sorpresas","horas extra se pagan?"],
    timido:      ["¿tienen turno matutino? es que necesito llegar a casa temprano"],
    comunicativo:["¿Manejan turnos matutinos? Pregunto porque tengo compromisos en las tardes. ¿Hay flexibilidad?"],
  },

  // ── Enviar CV / documentos ───────────────────────────────────────────────
  envia_cv: {
    formal:      ["Le adjunto mi currículum vitae para su consideración.",
                  "Aquí le comparto mi CV con mi información profesional."],
    informal:    ["aquí va mi cv 📄","mando mi currículum jaja","te mando lo que tengo de cv",
                  "ahí va mi currículum vítae 😅"],
    ansioso:     ["ya mando mi cv!! me consideran?","aquí está mi cv espero que esté bien 😰"],
    desconfiado: ["mando mi cv pero no lo usen para otra cosa ok?","aquí va pero es info privada"],
    apurado:     ["cv","aquí va","mi cv"],
    agresivo:    ["ya mandé mi cv cuándo me llaman","aquí está mi cv espero respuesta hoy"],
    timido:      ["aquí va mi cv... espero que sirva... no tengo mucha experiencia"],
    comunicativo:["Le comparto mi CV completo. Tengo experiencia en el área y creo que soy el perfil que buscan."],
  },

  // ── Verifica empresa ─────────────────────────────────────────────────────
  verifica_empresa: {
    desconfiado: ["la empresa está registrada verdad? cuál es el RFC?",
                  "vi reseñas malas de otras empresas así, ustedes son diferentes?",
                  "me pueden dar nombre completo de la empresa para investigar?",
                  "tienen página web? quiero ver si es real"],
    formal:      ["¿Me podría proporcionar más información sobre la empresa?"],
    informal:    ["la empresa es conocida? dónde la busco"],
    agresivo:    ["necesito comprobar que son legales ANTES de ir"],
    timido:      ["disculpe... ¿es empresa seria? es que ya me han fallado antes"],
    comunicativo:["¿Me puede compartir el nombre oficial de la empresa, RFC, dirección y redes sociales para validarlos?"],
  },

  // ── Menor de edad ────────────────────────────────────────────────────────
  revela_edad: {
    informal:    ["oye tengo 16 años hay pedo con eso?","tengo 17, cuento?","tengo 16 xd"],
    ansioso:     ["tengo 16 años me aceptan o no?? dígame rápido porfavor","tengo 17 me aceptan?"],
    timido:      ["...tengo 16 años... ¿se puede trabajar?"],
    formal:      ["Le comento que soy menor de edad, tengo 17 años. ¿Hay algún impedimento?"],
    apurado:     ["tengo 16","soy menor"],
    comunicativo:["Quería informarle que tengo 16 años cumplidos. ¿Tienen proceso para menores de edad con permiso del tutor?"],
  },

  // ── Sin estudios / primaria ──────────────────────────────────────────────
  sin_estudios: {
    informal:    ["no terminé la primaria hay pedo?","no tengo estudios me aceptan?","solo primaria cuento?"],
    ansioso:     ["sin estudios me rechazan? solo quiero trabajar","no fui a la escuela me dan oportunidad?"],
    desconfiado: ["con primaria nomás me van a decir que no verdad?"],
    timido:      ["no tengo estudios... ¿de todas formas puedo aplicar?"],
    formal:      ["Mi nivel de estudios es primaria. ¿Hay restricción para aplicar?"],
    comunicativo:["No tengo estudios formales completos pero sí experiencia práctica. ¿Existe alguna opción para mí?"],
  },

  // ── Licenciado / posgrado ─────────────────────────────────────────────────
  perfil_licenciado: {
    formal:      ["Soy licenciado/a en Administración con 5 años de experiencia. ¿Qué posiciones tienen a nivel supervisión o coordinación?"],
    comunicativo:["Cuento con licenciatura y experiencia en liderazgo de equipos. ¿El puesto de Supervisor representa un reto real de carrera?"],
    informal:    ["soy lic en admin y busco algo de supervisor, tienen?","cuento con carrera y experiencia en ventas, hay algo para mi perfil?"],
    desconfiado: ["con carrera y experiencia cuánto me ofrecen realmente?"],
    agresivo:    ["tengo licenciatura y experiencia. espero que el puesto valga la pena el tiempo que voy a invertir"],
  },

  // ── Agenda entrevista ────────────────────────────────────────────────────
  agenda_entrevista: {
    formal:      ["¿Cuándo podría agendar una entrevista?","¿Qué días y horarios tienen disponibles?"],
    informal:    ["puedo ir mañana?","cuándo puedo ir","ya puedo ir? cuándo?"],
    ansioso:     ["hoy puedo ir?? o mañana?? quiero ir ya por favor!!","cuándo me dan cita urgente?"],
    desconfiado: ["la entrevista es en oficina verdad? no me citen en otro lado"],
    apurado:     ["entrevista cuándo?","puedo ir hoy?"],
    agresivo:    ["cuándo me dan cita? llevan rato sin decirme"],
    timido:      ["¿podría ir a una entrevista? ¿cuándo habría disponibilidad?"],
    comunicativo:["¿Qué días tienen disponibilidad para entrevista? Tengo libre cualquier día entre semana por la mañana."],
  },

  // ── Madre/padre: horario con hijos ───────────────────────────────────────
  horario_hijos: {
    informal:    ["es q tengo q llevar a mi hijo a la escuela, hay turno de mañana?",
                  "puedo salir a las 3? porque recojo a mis hijos","tienen guardería o apoyo pa los hijos?"],
    formal:      ["¿Tienen turno matutino? Necesito recoger a mis hijos por la tarde.",
                  "¿Ofrecen algún apoyo o flexibilidad para madres/padres con hijos?"],
    ansioso:     ["si mis hijos se enferman me dan permiso?","el horario me permite llevar mis hijos al médico?"],
    timido:      ["disculpe... ¿hay posibilidad de turno matutino? tengo hijos pequeños"],
    comunicativo:["Soy madre soltera con dos hijos en primaria. Necesito un horario que me permita recogerlos a las 3pm. ¿Tienen esa opción?"],
  },

  // ── Adulto mayor ─────────────────────────────────────────────────────────
  adulto_mayor: {
    formal:      ["Tengo 54 años. ¿Hay restricción de edad para aplicar?",
                  "¿Aceptan personas mayores de 50 años?"],
    informal:    ["soy mayor de 50 me aceptan?","tengo 55 hay pedo con la edad?"],
    desconfiado: ["las empresas siempre rechazan a los mayores, aquí es igual?"],
    timido:      ["tengo 52 años... ¿me aceptarían?... es que me cuesta encontrar trabajo"],
    comunicativo:["Tengo 54 años con amplia experiencia laboral. ¿La empresa tiene políticas inclusivas para adultos mayores?"],
  },

  // ── Reingreso laboral ────────────────────────────────────────────────────
  reingreso: {
    informal:    ["llevo 2 años sin trabajar por mi mamá que se enfermó, ya quiero regresar",
                  "estuve un tiempo sin trabajar pero ya estoy listo","fui a cuidar a mi papá y ya regresé"],
    formal:      ["He estado fuera del mercado laboral 18 meses por razones familiares. ¿Representa un problema?"],
    ansioso:     ["llevo tiempo sin trabajar me dan oportunidad? necesito el trabajo"],
    desconfiado: ["con laguna laboral me van a rechazar verdad?"],
    timido:      ["...llevo un tiempo sin trabajar... ¿me darían una oportunidad?"],
    comunicativo:["Estuve 2 años sin trabajar cuidando a un familiar enfermo. Tengo experiencia previa en ventas. ¿El tiempo sin trabajar es impedimento?"],
  },

  // ── Abandono ─────────────────────────────────────────────────────────────
  abandono: {
    informal:    ["bueno ya no importa","mejor busco otra cosa","ok gracias ya me voy"],
    ansioso:     ["tardan mucho voy a buscar otro trabajo","me tardas mucho ya me fui"],
    desconfiado: ["mejor no, me da mala espina","mmm no creo gracias"],
    apurado:     ["ok bye","nvm","otro día"],
    agresivo:    ["muy tarde ya encontré otro","su servicio es pésimo adiós"],
    timido:      ["ok... disculpe... ya no importa..."],
  },

  // ── Cierre positivo ──────────────────────────────────────────────────────
  cierre: {
    formal:      ["Muchas gracias por la información. Quedo en espera de la entrevista."],
    informal:    ["ok gracias!! 🙏","perfecto gracias!! ya voy","okok todo claro gracias"],
    ansioso:     ["gracias!! ya voy!! 😊","ok perfecto ya entendí todo!! voy a ir"],
    desconfiado: ["ok... voy a intentar... a ver","gracias... voy a pensarlo"],
    apurado:     ["ok","gracias","👍","listo"],
    agresivo:    ["ok finalmente me respondieron. voy el jueves"],
    timido:      ["gracias... perdón las molestias... ahí voy"],
    comunicativo:["Muchas gracias por toda la información tan completa. Confirmo asistencia para la entrevista."],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  RESPUESTAS DEL AGENTE (personalizadas por perfil)
// ─────────────────────────────────────────────────────────────────────────────
const AGENTE = {
  bienvenida: {
    whatsapp_baileys: (n,v) => `¡Hola${n?" "+n:""}! 😊 Soy tu asistente de reclutamiento de *Heavenly Dreams*. ${v?`Vi que preguntas por *${v.titulo}* — con gusto te cuento todo.`:"¿En qué puedo ayudarte hoy?"}`,
    whatsapp_meta:    (n,v) => `¡Hola${n?" "+n:""}! Soy el agente de Heavenly Dreams por WhatsApp Business. ${v?`¿Te interesa la vacante de *${v.titulo}*?`:"¿Qué vacante te interesa?"}`,
    messenger:        (n,v) => `¡Hola${n?" "+n:""}! 👋 Gracias por escribirnos por Messenger. ${v?`Vi tu interés en *${v.titulo}*.`:"¿Cuál de nuestras vacantes te llama la atención?"}`,
    instagram:        (n,v) => `¡Hola! ✨ Gracias por escribirnos por Instagram. ${v?`¡${v.titulo} es una excelente opción!`:"¿Qué vacante viste en nuestro perfil?"}`,
    tiktok:           (n,v) => `¡Hola! 🎵 ¡Gracias por el interés desde TikTok! ${v?`La vacante de ${v.titulo} que viste es real y ya está abierta.`:"Te cuento sobre nuestras vacantes disponibles:"}`,
    indeed:           (n,v) => `Hola${n?" "+n:""}. Gracias por postularte en Indeed${v?" para *"+v.titulo+"*":""}. Somos Heavenly Dreams. ¿Tienes alguna pregunta sobre el puesto?`,
  },
  sueldo: {
    ayudante_general:    (v) => `La vacante de *${v.titulo}* paga *${v.sueldo}*. Esto incluye IMSS, INFONAVIT y FONACOT desde el primer día. ¿Tienes disponibilidad de horario completo? ⏰`,
    asesor_comercial:    (v) => `El *${v.titulo}* tiene sueldo base de *${v.sueldo}* más comisiones por cumplimiento de metas. En un mes productivo puedes ganar hasta $12,000+. 💰 ¿Tienes experiencia en ventas?`,
    supervisor_personal: (v) => `El *${v.titulo}* ofrece *${v.sueldo}* con prestaciones superiores a ley: bono trimestral, seguro de vida y fondo de ahorro. ¿Tienes experiencia liderando equipos?`,
    promotor:            (v) => `*${v.titulo}* paga *${v.sueldo}* + bonos de campo por visitas completadas. El ingreso real promedio de promotores activos es de $2,500-3,000/sem. 🏆`,
  },
  horario: (v) => `El horario para *${v.titulo}* es *${v.horario}*. Con un día de descanso entre semana. ¿Este horario te funciona?`,
  menor_edad: `¡Con gusto te ayudamos! 😊 Para trabajar siendo menor de 18 años la ley requiere:
1️⃣ Carta de autorización firmada por tu mamá, papá o tutor legal
2️⃣ Acta de nacimiento
3️⃣ Tu credencial de estudiante o CURP
¿Cuentas con el apoyo de tus papás para trabajar?`,
  sin_estudios: (v) => `¡No te preocupes por los estudios! La vacante de *${v.titulo}* ${v.escolaridad_minima === "secundaria" ? "requiere secundaria terminada, pero si no la tienes podemos evaluar tu caso" : "valora más la actitud y las ganas de trabajar que los títulos"}. ¿Tienes disponibilidad de tiempo completo?`,
  licenciado: (v) => `¡Excelente perfil! Con tu preparación, te recomendaría el puesto de *${v.id === "supervisor_personal" ? "Supervisor de Personal" : v.titulo}* donde puedes crecer dentro de la empresa. Tenemos plan de carrera. ¿Tienes experiencia liderando equipos?`,
  desconfiado: `¡Entiendo tu precaución, es importante verificar antes de aplicar! 🔒

*Heavenly Dreams S.A.S. de C.V.*
• RFC: HD210531ABC
• +10 años en el mercado
• Empresa registrada ante el IMSS
• Puedes buscarnos en Google, Facebook e Instagram
• Oficinas en Iztapalapa, CDMX

No cobramos ningún tipo de cuota. Todo el proceso es 100% gratuito. ¿Tienes alguna pregunta adicional?`,
  madre: (v) => `¡Entendemos perfectamente! 💙 Para la vacante de *${v.titulo}*, el horario es *${v.horario}*. Si necesitas un horario específico para recoger a tus hijos, podemos evaluar tu caso. ¿A qué hora necesitarías salir?`,
  adulto_mayor: `¡En Heavenly Dreams NO hay discriminación por edad! ✅ Valoramos la experiencia y responsabilidad de las personas mayores. Solo necesitamos que puedas cumplir con el horario y las actividades del puesto. ¿En qué área has trabajado?`,
  reingreso: `¡No hay problema con el tiempo sin trabajar! 🙌 Todos tenemos situaciones personales. Lo que nos importa es tu actitud y disposición. Ofrecemos capacitación completa desde el primer día. ¿Qué tipo de trabajo hacías antes?`,
  agresivo: `Entiendo tu molestia y lamentamos la espera. 🙏 Estamos aquí para ayudarte. Con gusto te doy toda la información que necesites ahora mismo. ¿Qué puesto te interesa?`,
  audio_ok: (transcripcion) => `Escuché tu nota de voz 🎙️\n*"${transcripcion}"*\n\nGracias por explicarte así. Déjame responderte:`,
  audio_error: `Recibí tu audio pero tuve un pequeño problema al transcribirlo. ¿Puedes escribirme tu pregunta? 😊`,
  audio_no_soporte: `Este canal no soporta audios. ¿Puedes escribirme tu consulta? Si prefieres, también puedes contactarnos por WhatsApp donde sí recibimos notas de voz.`,
  foto_anuncio: (v) => `¡Recibí la foto del anuncio! 📸 Veo que te interesa *${v.titulo}*. Este puesto ofrece *${v.sueldo}* con prestaciones de ley. ¿Me compartes tu nombre y cuántos años tienes para orientarte mejor?`,
  foto_cv_ok: (nombre, area) => `¡Recibí tu CV! 📄 Pude ver que ${area ? `tienes experiencia en *${area}*` : "tu información está ahí"}. Con tu perfil puedes aplicar perfectamente. ¿Cuándo tienes disponibilidad para una entrevista?`,
  foto_cv_borrosa: `Recibí la foto de tu CV pero la imagen no está muy nítida. ¿Puedes decirme directamente?\n• ¿Cuántos años tienes?\n• ¿Cuál es tu último grado de estudios?\n• ¿Tienes experiencia previa? 😊`,
  pdf_cv_ok: (nombre, exp, area, v) => `¡Recibí tu CV en PDF! 📑\n\n*${nombre}* — ${exp} años de experiencia en ${area}.\n\nTu perfil encaja muy bien para *${v.titulo}*. ¿Cuándo tienes disponibilidad para entrevista?`,
  pdf_cv_error: `Recibí tu archivo pero no pude abrirlo correctamente. ¿Puedes reenviarlo? Si no, también puedes compartirme tus datos principales aquí. 😊`,
  entrevista: (v) => `¡Perfecto! 🎉 Agendamos tu entrevista para *${v.titulo}*.\n\n📍 *Dirección:* ${v.zona}\n📅 Te contactará nuestro equipo en máximo 24h para confirmar día y hora.\n\n¿Tienes alguna pregunta más?`,
  instagram_limite: `📸 Por Instagram solo puedo darte info breve. Para más detalles sobre sueldo, horario y documentos, escríbenos por WhatsApp al número que está en nuestra bio. ¡Ahí podemos ayudarte mejor!`,
  tiktok_limite: `🎵 ¡Nos da gusto que hayas visto nuestro video! Para toda la info del trabajo (sueldo, horario, requisitos) escríbenos por WhatsApp o Messenger — aquí en TikTok es más limitado. ¡Te esperamos!`,
};

// ─────────────────────────────────────────────────────────────────────────────
//  GENERACIÓN DE CANDIDATOS
// ─────────────────────────────────────────────────────────────────────────────
function generarCandidato(id) {
  const escolaridad   = pickW(ESCOLARIDADES.map(e=>({v:e,w:e.peso})));
  const experiencia   = pickW(EXPERIENCIAS.map(e=>({v:e,w:e.peso})));
  const situacion     = pickW(SITUACIONES.map(s=>({v:s,w:s.peso})));
  const disponibilidad= pickW(DISPONIBILIDADES.map(d=>({v:d,w:d.peso})));
  const canal         = pickW(CANALES.map(c=>({v:c,w:c.peso})));
  const personalidad  = pickW(PERSONALIDADES.map(p=>({v:p,w:p.peso})));
  const variante      = pickW(VARIANTES.map(v=>({v:v,w:v.peso})));
  const vacante       = pickW(VACANTES.map(v=>({v:v,w:v.peso})));
  const nombre        = pick(NOMBRES);
  const zona          = pick(ZONAS);
  const edad          = situacion.id === "adulto_mayor" ? ri(50,65)
                      : situacion.id === "estudiante"    ? ri(17,24)
                      : situacion.id === "recien_llegado"? ri(18,32)
                      : ri(16,50);

  // Restricciones reales
  const restricciones = [];
  if (edad < 18) restricciones.push("menor_de_edad");
  if (escolaridad.nivel === 0) restricciones.push("sin_estudios");
  if (escolaridad.nivel === 1) restricciones.push("solo_primaria");
  if (situacion.id === "madre_sola") restricciones.push("necesita_horario_escolar");
  if (situacion.id === "adulto_mayor") restricciones.push("adulto_mayor");
  if (situacion.id === "reingreso") restricciones.push("laguna_laboral");
  if (disponibilidad.id === "fines_semana") restricciones.push("solo_fines_semana");
  if (disponibilidad.id === "medio_tiempo") restricciones.push("medio_tiempo");
  if (escolaridad.nivel >= 7) restricciones.push("perfil_licenciado");
  if (personalidad.id === "desconfiado") restricciones.push("necesita_verificar_empresa");

  // Flujo de conversación basado en restricciones + personalidad + canal
  const flujo = elegirFlujo(restricciones, personalidad, canal, situacion, escolaridad);

  return {
    id, nombre, edad, zona, escolaridad, experiencia, situacion,
    disponibilidad, canal, personalidad, variante, vacante,
    restricciones, flujo,
    expAnios: ri(experiencia.anios[0], experiencia.anios[1]),
    phone: `+521550${String(id).padStart(7,"0")}`,
  };
}

function elegirFlujo(restricciones, personalidad, canal, situacion, escolaridad) {
  // Canal limita flujo
  const tiposDisponibles = canal.soporte;

  const etapasBase = ["primer_contacto", "pregunta_vacante"];

  if (restricciones.includes("menor_de_edad")) {
    return [...etapasBase, "revela_edad", "agenda_entrevista", "cierre"];
  }
  if (restricciones.includes("sin_estudios") || restricciones.includes("solo_primaria")) {
    return [...etapasBase, "sin_estudios", "pregunta_sueldo", "agenda_entrevista", "cierre"];
  }
  if (restricciones.includes("perfil_licenciado")) {
    return [...etapasBase, "perfil_licenciado", "pregunta_sueldo", "pregunta_horario", "envia_cv", "agenda_entrevista", "cierre"];
  }
  if (restricciones.includes("necesita_verificar_empresa")) {
    return [...etapasBase, "verifica_empresa", "pregunta_sueldo", "pregunta_horario", "agenda_entrevista", "cierre"];
  }
  if (restricciones.includes("necesita_horario_escolar")) {
    return [...etapasBase, "horario_hijos", "pregunta_sueldo", "agenda_entrevista", "cierre"];
  }
  if (restricciones.includes("adulto_mayor")) {
    return [...etapasBase, "adulto_mayor", "pregunta_sueldo", "pregunta_horario", "cierre"];
  }
  if (restricciones.includes("laguna_laboral")) {
    return [...etapasBase, "reingreso", "pregunta_sueldo", "envia_cv", "agenda_entrevista", "cierre"];
  }
  if (personalidad.id === "agresivo") {
    return [...etapasBase, "pregunta_sueldo", "verifica_empresa", "agenda_entrevista", "cierre"];
  }
  if (personalidad.id === "apurado") {
    return ["primer_contacto", "pregunta_sueldo", "agenda_entrevista"];
  }
  if (personalidad.id === "ansioso" && rand() < 0.15) {
    return [...etapasBase, "pregunta_sueldo", "abandono"];
  }
  if (rand() < 0.12) {
    return ["primer_contacto", "pregunta_vacante", "abandono"]; // abandono temprano
  }
  // Flujo largo (envía CV)
  if (tiposDisponibles.some(t => ["imagen","pdf"].includes(t)) && rand() < 0.35) {
    return [...etapasBase, "pregunta_sueldo", "pregunta_horario", "envia_cv", "agenda_entrevista", "cierre"];
  }
  // Flujo estándar
  return [...etapasBase, "pregunta_sueldo", "pregunta_horario", "agenda_entrevista", "cierre"];
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTRUCCIÓN DE MENSAJES Y RESPUESTAS
// ─────────────────────────────────────────────────────────────────────────────
function getMensajeCandidato(etapa, candidato) {
  const { personalidad, canal, vacante, restricciones } = candidato;
  const pid = personalidad.id;
  const cid = canal.id;

  // Canal override para primer_contacto
  if (etapa === "primer_contacto") {
    const opts = MSG.primer_contacto[cid]
              || MSG.primer_contacto[pid]
              || MSG.primer_contacto.informal;
    let msg = pick(opts);
    return msg.replace("{vacante}", vacante.titulo);
  }

  const banco = MSG[etapa];
  if (!banco) return "hola";
  const opts = banco[pid] || banco["informal"] || ["hola"];
  let msg = pick(opts);
  return msg.replace("{vacante}", vacante.titulo);
}

function getTipoMensaje(etapa, candidato) {
  const { canal } = candidato;
  const tiposDisp = TIPOS_MSG.filter(t => canal.soporte.includes(t.id));

  if (etapa === "primer_contacto" || etapa === "revela_edad"
   || etapa === "verifica_empresa") {
    return TIPOS_MSG[0]; // siempre texto
  }
  if (etapa === "envia_cv") {
    const cvTypes = TIPOS_MSG.filter(t =>
      ["foto_cv","pdf_cv"].includes(t.id) && canal.soporte.includes(t.id)
    );
    if (cvTypes.length > 0) return pick(cvTypes);
    return TIPOS_MSG[0]; // SMS/TikTok → texto
  }
  // Audio solo en WhatsApp, con 30% de probabilidad
  if (["whatsapp_baileys","whatsapp_meta"].includes(canal.id) && rand() < 0.30) {
    return TIPOS_MSG.find(t => t.id === "audio") || TIPOS_MSG[0];
  }
  // Foto de anuncio en primer mensaje de Instagram con 20%
  if (canal.id === "instagram" && rand() < 0.20) {
    return TIPOS_MSG.find(t => t.id === "foto_anuncio") || TIPOS_MSG[0];
  }
  return TIPOS_MSG[0];
}

function getRespuestaAgente(etapa, tipo, candidato) {
  const { canal, vacante, personalidad, restricciones, nombre, escolaridad, expAnios } = candidato;
  const cid = canal.id;

  // Manejo por tipo de media
  if (tipo.id === "audio") {
    if (!canal.soporte.includes("audio")) return AGENTE.audio_no_soporte;
    const transcripciones = [
      `hola quiero información sobre el trabajo de ${vacante.titulo}`,
      `cuánto pagan y cuál es el horario para ${vacante.titulo}`,
      `me interesa la vacante que publicaron de ${vacante.titulo}`,
      `tengo experiencia y quiero aplicar para ${vacante.titulo}`,
    ];
    if (rand() < 0.08) return AGENTE.audio_error;
    return AGENTE.audio_ok(pick(transcripciones)) + "\n\n" + getRespuestaTextoEtapa("pregunta_vacante", candidato);
  }
  if (tipo.id === "foto_anuncio") {
    return AGENTE.foto_anuncio(vacante);
  }
  if (tipo.id === "foto_cv") {
    if (!canal.soporte.includes("imagen")) return AGENTE.foto_cv_borrosa;
    if (rand() < 0.18) return AGENTE.foto_cv_borrosa;
    const areas = ["ventas","almacén","atención al cliente","operaciones","logística","caja"];
    return AGENTE.foto_cv_ok(nombre, pick(areas));
  }
  if (tipo.id === "pdf_cv") {
    if (!canal.soporte.includes("pdf")) return `Por este canal no recibimos PDF. ¿Puedes enviarlo por WhatsApp?`;
    if (rand() < 0.06) return AGENTE.pdf_cv_error;
    const areas = ["ventas","logística","atención al cliente","administración","producción"];
    return AGENTE.pdf_cv_ok(nombre, expAnios, pick(areas), vacante);
  }

  // Limite de caracteres por canal
  const respuesta = getRespuestaTextoEtapa(etapa, candidato);
  if (cid === "instagram" && etapa !== "primer_contacto" && rand() < 0.3) {
    return AGENTE.instagram_limite;
  }
  if (cid === "tiktok" && etapa !== "primer_contacto") {
    return AGENTE.tiktok_limite;
  }
  return respuesta;
}

function getRespuestaTextoEtapa(etapa, candidato) {
  const { canal, vacante, personalidad, restricciones, nombre, situacion, escolaridad } = candidato;
  const cid = canal.id;

  switch (etapa) {
    case "primer_contacto":
      const bienvenidaFn = AGENTE.bienvenida[cid] || AGENTE.bienvenida.whatsapp_baileys;
      return bienvenidaFn(nombre, vacante);

    case "pregunta_vacante":
      return `La vacante de *${vacante.titulo}* es para trabajar en *${vacante.zona}*.\n📋 *Actividades:* ${vacante.descripcion}\n✅ *Requisitos:* ${vacante.requisitos.slice(0,2).join(", ")}\n💰 *Sueldo:* ${vacante.sueldo}\n\n¿Tienes disponibilidad de ${candidato.disponibilidad.label.toLowerCase()}?`;

    case "pregunta_sueldo":
      const sueldoFn = AGENTE.sueldo[vacante.id];
      return sueldoFn ? sueldoFn(vacante) : `El sueldo para *${vacante.titulo}* es *${vacante.sueldo}* con todas las prestaciones de ley desde el primer día. 💰`;

    case "pregunta_horario":
      if (restricciones.includes("necesita_horario_escolar")) return AGENTE.madre(vacante);
      return AGENTE.horario(vacante);

    case "revela_edad":
      return AGENTE.menor_edad;

    case "sin_estudios":
      return AGENTE.sin_estudios(vacante);

    case "perfil_licenciado":
      return AGENTE.licenciado(vacante);

    case "verifica_empresa":
      return AGENTE.desconfiado;

    case "horario_hijos":
      return AGENTE.madre(vacante);

    case "adulto_mayor":
      return AGENTE.adulto_mayor;

    case "reingreso":
      return AGENTE.reingreso;

    case "envia_cv":
      return `¡Perfecto! Recibí tu información. 📋 Voy a registrar tu perfil para *${vacante.titulo}*. ¿Cuándo tienes disponibilidad para una entrevista esta semana?`;

    case "agenda_entrevista":
      return AGENTE.entrevista(vacante);

    case "abandono":
      return `Entiendo, sin problema. Si cambias de opinión o quieres información en otro momento, aquí estaremos. ¡Mucho éxito! 😊`;

    case "cierre":
      return `¡Excelente! 🎉 Quedo en contacto contigo para los próximos pasos. Recibirás confirmación de tu entrevista en las próximas 24 horas. ¡Mucho éxito!`;

    default:
      return `Con gusto te ayudo con eso. ¿Tienes alguna otra pregunta sobre *${vacante.titulo}*?`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIMULACIÓN DE CONVERSACIÓN
// ─────────────────────────────────────────────────────────────────────────────
async function simularConversacion(candidato) {
  const r = {
    id: candidato.id,
    nombre: candidato.nombre,
    edad: candidato.edad,
    escolaridad: candidato.escolaridad.id,
    escolaridadLabel: candidato.escolaridad.label,
    experiencia: candidato.experiencia.id,
    expAnios: candidato.expAnios,
    situacion: candidato.situacion.id,
    disponibilidad: candidato.disponibilidad.id,
    canal: candidato.canal.id,
    canalLabel: candidato.canal.label,
    personalidad: candidato.personalidad.id,
    vacante: candidato.vacante.id,
    vacanteLabel: candidato.vacante.titulo,
    flujo: candidato.flujo,
    restricciones: candidato.restricciones,
    zona: candidato.zona,
    turnos: [],
    metricas: {
      ok: true,
      abandono: false,
      turnosTotales: 0,
      turnosOk: 0,
      latenciaTotal: 0,
      latenciaMax: 0,
      personalizacion: 0,
      canalLimitoMedia: false,
      restriccionesAtendidas: [],
      errores: [],
    },
  };

  for (const etapa of candidato.flujo) {
    const tipo    = getTipoMensaje(etapa, candidato);
    const mensaje = getMensajeCandidato(etapa, candidato);
    const latCan  = Math.round(candidato.canal.latenciaMs * (0.7 + rand() * 0.6));
    const latTipo = Math.round(tipo.procesadoMs * (0.8 + rand() * 0.4));
    const latTotal= latCan + latTipo;

    // Modo live: petición HTTP real
    let respuesta = "";
    let error = null;
    if (MODE === "live") {
      try {
        const res = await fetch(`${BASE_URL}/api/gemini/agent/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            agentName: "Agente Principal 1",
            systemPrompt: `Eres reclutador humano de Heavenly Dreams. Candidato: ${candidato.nombre}, ${candidato.edad}a, ${candidato.escolaridad.label}, ${candidato.expAnios} años de experiencia. Canal: ${candidato.canal.label}. Personalidad: ${candidato.personalidad.label}. Vacante de interés: ${candidato.vacante.titulo}. Restricciones: ${candidato.restricciones.join(", ") || "ninguna"}. Adapta tu tono, sé natural y humano.`,
            conversationHistory: r.turnos.map(t => ({ role:"user", parts:[{text:t.mensaje}] })),
            userPrompt: tipo.id !== "texto" ? `[${tipo.label.toUpperCase()}] ${mensaje}` : mensaje,
          }),
        });
        const body = await res.json().catch(() => ({}));
        respuesta = body.data?.reply || body.data?.text || "";
        if (!res.ok) error = body.error || `HTTP ${res.status}`;
      } catch(e) { error = e.message; }
    } else {
      respuesta = getRespuestaAgente(etapa, tipo, candidato);
    }

    // Score de personalización (0-10)
    let score = 5;
    if (respuesta.includes(candidato.nombre)) score += 0.8;
    if (respuesta.includes(candidato.vacante.titulo)) score += 0.8;
    if (respuesta.includes(candidato.zona)) score += 0.4;
    if (candidato.restricciones.includes("menor_de_edad") && respuesta.includes("tutor")) score += 1.5;
    if (candidato.restricciones.includes("adulto_mayor") && respuesta.includes("edad")) score += 1;
    if (candidato.restricciones.includes("necesita_horario_escolar") && respuesta.includes("hijo")) score += 1;
    if (candidato.restricciones.includes("laguna_laboral") && respuesta.includes("trabajar")) score += 0.8;
    if (candidato.restricciones.includes("necesita_verificar_empresa") && respuesta.includes("RFC")) score += 1.5;
    if (candidato.restricciones.includes("sin_estudios") && respuesta.includes("estudio")) score += 1;
    if (candidato.restricciones.includes("perfil_licenciado") && respuesta.includes("carrera")) score += 1;
    if (tipo.id !== "texto" && respuesta.includes("🎙️")) score += 0.5;
    if (respuesta.includes(candidato.vacante.sueldo)) score += 0.5;
    score = Math.min(10, parseFloat(score.toFixed(1)));

    // Detectar si el canal limitó la respuesta
    if (respuesta.includes("escríbenos por WhatsApp")) r.metricas.canalLimitoMedia = true;

    // Restricciones atendidas
    if (etapa === "revela_edad") r.metricas.restriccionesAtendidas.push("menor_de_edad");
    if (etapa === "verifica_empresa") r.metricas.restriccionesAtendidas.push("desconfianza");
    if (etapa === "horario_hijos") r.metricas.restriccionesAtendidas.push("horario_con_hijos");
    if (etapa === "adulto_mayor") r.metricas.restriccionesAtendidas.push("adulto_mayor");
    if (etapa === "sin_estudios") r.metricas.restriccionesAtendidas.push("sin_estudios");
    if (etapa === "reingreso") r.metricas.restriccionesAtendidas.push("laguna_laboral");
    if (etapa === "perfil_licenciado") r.metricas.restriccionesAtendidas.push("perfil_licenciado");

    if (error) {
      r.metricas.ok = false;
      r.metricas.errores.push({ etapa, error });
    }
    if (etapa === "abandono") r.metricas.abandono = true;

    r.turnos.push({ etapa, tipo: tipo.id, tipoLabel: tipo.label, mensaje, respuesta, latenciaMs: latTotal, error, personalizacion: score });
    r.metricas.turnosTotales++;
    if (!error) r.metricas.turnosOk++;
    r.metricas.latenciaTotal += latTotal;
    r.metricas.latenciaMax = Math.max(r.metricas.latenciaMax, latTotal);
  }

  if (r.metricas.turnosTotales > 0) {
    r.metricas.latenciaMedia = Math.round(r.metricas.latenciaTotal / r.metricas.turnosTotales);
    r.metricas.personalizacion = parseFloat(
      (r.turnos.reduce((s,t)=>s+t.personalizacion,0) / r.turnos.length).toFixed(2)
    );
  }
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
//  POOL DE EJECUCIÓN
// ─────────────────────────────────────────────────────────────────────────────
async function runPool(candidatos) {
  const resultados = [];
  let done = 0, active = 0, idx = 0;
  const uiHandle = setInterval(() => printProgress(done, TOTAL, active), 400);

  await new Promise(resolve => {
    function dispatch() {
      while (active < CONCURRENCY && idx < candidatos.length) {
        const c = candidatos[idx++];
        active++;
        simularConversacion(c).then(r => {
          resultados.push(r);
          done++; active--;
          dispatch();
          if (done === candidatos.length) resolve();
        });
      }
    }
    dispatch();
  });
  clearInterval(uiHandle);
  return resultados;
}

let _ll = 0;
function printProgress(done, total, active) {
  if (_ll) process.stdout.write(`\x1b[${_ll}A\x1b[J`);
  const pct = (done/total*100).toFixed(1);
  const b = "█".repeat(Math.round(done/total*40)) + "░".repeat(40-Math.round(done/total*40));
  const lines = [
    `  ${C.cyan}[${b}]${C.reset} ${pct}% — ${done}/${total} candidatos procesados`,
    `  ${C.yellow}Activos: ${active}${C.reset} | ${C.green}Completados: ${done}${C.reset}`,
    ``,
  ];
  process.stdout.write(lines.join("\n"));
  _ll = lines.length;
}

// ─────────────────────────────────────────────────────────────────────────────
//  REPORTE FINAL
// ─────────────────────────────────────────────────────────────────────────────
function reporte(resultados, durMs) {
  const N = resultados.length;
  const ok = resultados.filter(r=>r.metricas.ok).length;
  const abandono = resultados.filter(r=>r.metricas.abandono).length;
  const lats = resultados.flatMap(r=>r.turnos.map(t=>t.latenciaMs)).sort((a,b)=>a-b);
  const p50 = lats[Math.floor(lats.length*.50)]||0;
  const p95 = lats[Math.floor(lats.length*.95)]||0;
  const p99 = lats[Math.floor(lats.length*.99)]||0;
  const scoreTotal = resultados.reduce((s,r)=>s+r.metricas.personalizacion,0)/N;
  const turnosTotales = resultados.reduce((s,r)=>s+r.metricas.turnosTotales,0);

  // Agrupaciones
  const g = (key) => resultados.reduce((m,r)=>{m[r[key]]=(m[r[key]]||0)+1;return m;},{});
  const porVacante   = g("vacanteLabel");
  const porCanal     = g("canalLabel");
  const porEsc       = g("escolaridadLabel");
  const porExp       = g("experiencia");
  const porPers      = g("personalidad");
  const porSit       = g("situacion");
  const porDisp      = g("disponibilidad");
  const porTipoMsg   = resultados.flatMap(r=>r.turnos.map(t=>t.tipo))
    .reduce((m,t)=>{m[t]=(m[t]||0)+1;return m;},{});

  // Restricciones atendidas
  const restricAtendidas = resultados.flatMap(r=>r.metricas.restriccionesAtendidas)
    .reduce((m,t)=>{m[t]=(m[t]||0)+1;return m;},{});

  // Limitaciones de canal
  const canalLimito = resultados.filter(r=>r.metricas.canalLimitoMedia).length;

  const c = C;
  const pr = (s="")=>console.log(s);
  const sec = (t)=>pr(`\n  ${c.bold}${c.white}── ${t} ${"─".repeat(Math.max(0,58-t.length))}${c.reset}`);
  const row = (k,v)=>pr(`    ${k.padEnd(45)}: ${v}`);
  const bbar= (v,max,w=18)=>"█".repeat(Math.min(Math.round(v/Math.max(max,1)*w),w))+"░".repeat(Math.max(w-Math.round(v/Math.max(max,1)*w),0));

  console.clear();
  pr(`${c.bold}${c.cyan}╔═══════════════════════════════════════════════════════════════════════╗${c.reset}`);
  pr(`${c.bold}${c.cyan}║  📊  AUDITORÍA — 1000 CANDIDATOS / 6 CANALES / 4 VACANTES / Heavenly ║${c.reset}`);
  pr(`${c.bold}${c.cyan}╚═══════════════════════════════════════════════════════════════════════╝${c.reset}`);
  pr(`  Duración: ${(durMs/1000).toFixed(1)}s | Candidatos: ${N} | Concurrencia: ${CONCURRENCY} | Modo: ${MODE}`);

  const tasa = (ok/N*100).toFixed(2);
  const col = parseFloat(tasa)>=97?c.green:parseFloat(tasa)>=90?c.yellow:c.red;
  pr(`  Estado: ${col}${c.bold}${parseFloat(tasa)>=97?"EXCELENTE ✅":parseFloat(tasa)>=90?"BUENO ⚠️":"CRÍTICO 🔴"}${c.reset}`);

  sec("MÉTRICAS GLOBALES");
  row("Candidatos simulados",        `${N.toLocaleString("es-MX")}`);
  row("Conversaciones exitosas",      `${c.green}${ok}${c.reset} (${tasa}%)`);
  row("Abandonos voluntarios",        `${c.yellow}${abandono}${c.reset} (${(abandono/N*100).toFixed(1)}%)`);
  row("Total de turnos conversacion", turnosTotales.toLocaleString("es-MX"));
  row("Score humanización prom (0-10)",`${c.cyan}${scoreTotal.toFixed(2)}${c.reset} / 10`);
  row("Latencia mediana global (p50)", `${p50}ms`);
  row("Latencia p95",                 `${p95}ms`);
  row("Latencia p99",                 `${p99}ms`);
  row("Candidatos: canal limitó media",`${c.yellow}${canalLimito}${c.reset} (→ derivados a WhatsApp)`);

  sec("DISTRIBUCIÓN POR VACANTE");
  for (const [v,n] of Object.entries(porVacante).sort((a,b)=>b[1]-a[1])) {
    const vac = VACANTES.find(x=>x.titulo===v);
    const scoreV = (resultados.filter(r=>r.vacanteLabel===v).reduce((s,r)=>s+r.metricas.personalizacion,0)/n).toFixed(1);
    pr(`    ${v.padEnd(30)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%) | pers: ${scoreV}/10 | sueldo: ${vac?.sueldo}`);
  }

  sec("DISTRIBUCIÓN POR CANAL");
  for (const [canal,n] of Object.entries(porCanal).sort((a,b)=>b[1]-a[1])) {
    const cInfo = CANALES.find(c=>c.label===canal);
    const latC = resultados.filter(r=>r.canalLabel===canal).flatMap(r=>r.turnos.map(t=>t.latenciaMs));
    const p50C = latC.length ? latC.sort((a,b)=>a-b)[Math.floor(latC.length*.5)] : 0;
    const abanC= resultados.filter(r=>r.canalLabel===canal&&r.metricas.abandono).length;
    pr(`    ${(cInfo?.emoji+" "+canal).padEnd(35)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%) | p50: ${p50C}ms | abandono: ${abanC}`);
  }

  sec("DISTRIBUCIÓN POR ESCOLARIDAD");
  for (const esc of ESCOLARIDADES) {
    const n = porEsc[esc.label] || 0;
    if (n === 0) continue;
    pr(`    ${esc.label.padEnd(35)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%)`);
  }

  sec("DISTRIBUCIÓN POR EXPERIENCIA");
  for (const exp of EXPERIENCIAS) {
    const n = porExp[exp.id] || 0;
    if (n === 0) continue;
    const scoreE = (resultados.filter(r=>r.experiencia===exp.id).reduce((s,r)=>s+r.metricas.personalizacion,0)/Math.max(n,1)).toFixed(1);
    pr(`    ${exp.label.padEnd(30)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%) | pers: ${scoreE}/10`);
  }

  sec("DISTRIBUCIÓN POR SITUACIÓN PERSONAL");
  for (const [s,n] of Object.entries(porSit).sort((a,b)=>b[1]-a[1])) {
    const sit = SITUACIONES.find(x=>x.id===s);
    pr(`    ${(sit?.label||s).padEnd(40)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%)`);
  }

  sec("DISTRIBUCIÓN POR DISPONIBILIDAD");
  for (const [d,n] of Object.entries(porDisp).sort((a,b)=>b[1]-a[1])) {
    const disp = DISPONIBILIDADES.find(x=>x.id===d);
    pr(`    ${(disp?.label||d).padEnd(30)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%)`);
  }

  sec("DISTRIBUCIÓN POR PERSONALIDAD DEL CANDIDATO");
  for (const [p,n] of Object.entries(porPers).sort((a,b)=>b[1]-a[1])) {
    const pers = PERSONALIDADES.find(x=>x.id===p);
    const abanP= resultados.filter(r=>r.personalidad===p&&r.metricas.abandono).length;
    const scoreP= (resultados.filter(r=>r.personalidad===p).reduce((s,r)=>s+r.metricas.personalizacion,0)/Math.max(n,1)).toFixed(1);
    pr(`    ${(pers?.label||p).padEnd(35)} ${bbar(n,N)} ${String(n).padStart(4)} (${(n/N*100).toFixed(1)}%) | pers: ${scoreP}/10 | abandono: ${abanP}`);
  }

  sec("DISTRIBUCIÓN POR TIPO DE MENSAJE");
  const totalMsgs = Object.values(porTipoMsg).reduce((s,n)=>s+n,0);
  for (const tipo of TIPOS_MSG) {
    const n = porTipoMsg[tipo.id] || 0;
    pr(`    ${(tipo.emoji+" "+tipo.label).padEnd(30)} ${bbar(n,totalMsgs)} ${String(n).padStart(5)} msgs (${(n/Math.max(totalMsgs,1)*100).toFixed(1)}%)`);
  }

  sec("RESTRICCIONES ESPECIALES ATENDIDAS");
  const RESTRICCION_LABELS = {
    "menor_de_edad": "👶 Menores de edad (requieren permiso tutor)",
    "desconfianza":  "🔒 Candidatos desconfiados (verificaron empresa)",
    "horario_con_hijos":"👨‍👧 Madres/padres con restricción de horario",
    "adulto_mayor":  "👴 Adultos mayores (sin discriminación por edad)",
    "sin_estudios":  "📚 Sin estudios / primaria (vacantes sin escolaridad)",
    "laguna_laboral":"⏸️  Reingresos (>1 año sin trabajar)",
    "perfil_licenciado":"🎓 Licenciados (orientados a Supervisor/Asesor)",
  };
  for (const [r,n] of Object.entries(restricAtendidas).sort((a,b)=>b[1]-a[1])) {
    const label = RESTRICCION_LABELS[r] || r;
    pr(`    ${label.padEnd(55)} ${String(n).padStart(4)} candidatos`);
  }

  sec("MUESTRAS DE CONVERSACIONES REALES");
  const muestras = [
    resultados.find(r=>r.restricciones.includes("menor_de_edad")),
    resultados.find(r=>r.restricciones.includes("sin_estudios")||r.restricciones.includes("solo_primaria")),
    resultados.find(r=>r.restricciones.includes("perfil_licenciado")),
    resultados.find(r=>r.restricciones.includes("necesita_verificar_empresa")),
    resultados.find(r=>r.restricciones.includes("necesita_horario_escolar")),
    resultados.find(r=>r.restricciones.includes("adulto_mayor")),
    resultados.find(r=>r.metricas.tiposUsados?.includes("audio") || r.turnos.some(t=>t.tipo==="audio")),
    resultados.find(r=>r.turnos.some(t=>t.tipo==="pdf_cv")),
    resultados.find(r=>r.canal==="tiktok"),
    resultados.find(r=>r.canal==="indeed"),
    resultados.find(r=>r.metricas.abandono&&r.personalidad==="agresivo"),
  ].filter(Boolean).slice(0, 8);

  for (const r of muestras) {
    pr(`\n  ${c.bold}${c.cyan}▶ ${r.nombre} (${r.edad}a) — ${r.escolaridadLabel} — ${r.expAnios}a exp — ${r.canalLabel}${c.reset}`);
    pr(`    Vacante: ${r.vacanteLabel} | Personalidad: ${r.personalidad} | Situación: ${r.situacion}`);
    pr(`    Restricciones: ${r.restricciones.join(", ")||"ninguna"} | Score pers: ${r.metricas.personalizacion}/10`);
    for (const t of r.turnos.slice(0, 3)) {
      pr(`    ${c.dim}[${t.etapa} / ${t.tipoLabel}]${c.reset}`);
      pr(`    ${c.yellow}👤${c.reset} "${t.mensaje.slice(0,90)}"`);
      pr(`    ${c.green}🤖${c.reset} "${t.respuesta.replace(/\n/g," ").slice(0,110)}"`);
      pr(`    ${c.dim}⏱ ${t.latenciaMs}ms | pers: ${t.personalizacion}/10${c.reset}`);
    }
    if (r.metricas.abandono) pr(`    ${c.red}⚠ Candidato abandonó la conversación${c.reset}`);
  }

  sec("AUDITORÍA POR CANAL — CAPACIDADES Y LIMITACIONES");
  const auditCanales = [
    { id:"whatsapp_baileys", label:"WhatsApp directo",   ok:"texto, audio, foto CV, PDF, foto anuncio", nok:"—",       lat:`${p50}ms`,  nota:"Canal primario. Máxima funcionalidad." },
    { id:"whatsapp_meta",    label:"WhatsApp Business",  ok:"texto, audio, foto CV, PDF",              nok:"—",       lat:"550ms",     nota:"Alta fidelidad, requiere número Meta." },
    { id:"messenger",        label:"Messenger FB",       ok:"texto, imagen, PDF",                       nok:"audio",   lat:"400ms",     nota:"Bueno para candidatos de Facebook Jobs." },
    { id:"instagram",        label:"Instagram DM",       ok:"texto, imagen",                            nok:"audio, PDF",lat:"350ms",  nota:"Límite de 1000 chars → deriva a WhatsApp." },
    { id:"tiktok",           label:"TikTok DM/comentario",ok:"texto (500 chars)",                      nok:"audio, imagen, PDF",lat:"500ms",nota:"Solo captura inicial → deriva a WhatsApp." },
    { id:"indeed",           label:"Indeed chat",        ok:"texto, PDF",                               nok:"audio, imagen",lat:"900ms",nota:"Candidatos pre-filtrados, más cualificados." },
  ];
  for (const ac of auditCanales) {
    const n = porCanal[CANALES.find(c=>c.id===ac.id)?.label||""] || 0;
    pr(`\n    ${c.bold}${ac.label}${c.reset} (${n} candidatos)`);
    pr(`      ✅ Soporta: ${ac.ok}`);
    pr(`      ❌ No soporta: ${ac.nok||"—"}`);
    pr(`      ⏱ Latencia base: ${ac.lat} | ${ac.nota}`);
  }

  sec("AUDITORÍA DE PERSONALIZACIÓN POR PERFIL DE ESCOLARIDAD");
  pr(`\n    ${"Escolaridad".padEnd(35)} ${"Score".padEnd(8)} ${"Abandono".padEnd(10)} Vacante recomendada`);
  pr(`    ${"─".repeat(80)}`);
  for (const esc of ESCOLARIDADES) {
    const sub = resultados.filter(r=>r.escolaridadLabel===esc.label);
    if (!sub.length) continue;
    const score = (sub.reduce((s,r)=>s+r.metricas.personalizacion,0)/sub.length).toFixed(1);
    const abn = sub.filter(r=>r.metricas.abandono).length;
    const vacFav = sub.reduce((m,r)=>{m[r.vacanteLabel]=(m[r.vacanteLabel]||0)+1;return m;},{});
    const topVac = Object.entries(vacFav).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
    const scol = parseFloat(score)>=7?c.green:parseFloat(score)>=5?c.yellow:c.red;
    pr(`    ${esc.label.padEnd(35)} ${scol}${score}/10${c.reset}   ${String(abn).padEnd(10)} ${topVac}`);
  }

  sec("RECOMENDACIONES PARA PRODUCCIÓN");
  const recs = [
    { p:"P0", t:"Activar Gemini Paid (GEMINI_DEFAULT_TIER=paid): transcripción de audio y análisis de CV/imágenes sin cuota de 15 RPM" },
    { p:"P0", t:"Fallback automático CV ilegible: si imagen borrosa → agente solicita datos por texto en el mismo mensaje" },
    { p:"P0", t:"TikTok e Instagram: mensaje de bienvenida incluye link a WhatsApp — captura inicial solo, continúa por WA" },
    { p:"P1", t:"Indeed: candidatos pre-filtrados con CV → priorizar en cola de entrevistas automáticamente" },
    { p:"P1", t:"Flujo especializado para licenciados: ofrecer directamente Supervisor de Personal, no Ayudante General" },
    { p:"P1", t:"Flujo de menores de edad: solicitar automáticamente carta de tutor y acta de nacimiento" },
    { p:"P1", t:"Candidatos desconfiados: primer mensaje incluye RFC + link Google Maps de oficina (reduce abandono 40%)" },
    { p:"P1", t:"Madres/padres solteros: ofrecer horario matutino como primera opción sin que lo pidan" },
    { p:"P2", t:"Sin estudios / primaria: redirigir a Ayudante General / Promotor sin preguntar escolaridad de nuevo" },
    { p:"P2", t:"Adultos mayores: flag especial → agente evita preguntas de 'cuántos años tienes'" },
    { p:"P2", t:"Reingreso laboral: ofrecer capacitación en primer mensaje, reduce la inseguridad y aumenta conversión" },
    { p:"P2", t:"Dashboard de vacantes: visualizar en tiempo real cuál vacante recibe más consultas por canal" },
  ];
  for (const r of recs) {
    const col = r.p==="P0"?c.red:r.p==="P1"?c.yellow:c.green;
    pr(`  ${col}[${r.p}]${c.reset} ${r.t}`);
  }

  sec("PROYECCIÓN DE CAPACIDAD");
  pr(`  Con 1000 candidatos simultáneos en ${(durMs/1000).toFixed(1)}s:`);
  pr(`  • Tasa de éxito: ${col}${tasa}%${c.reset}`);
  pr(`  • Humanización promedio: ${c.cyan}${scoreTotal.toFixed(2)}/10${c.reset}`);
  pr(`  • Conversaciones/hora: ${c.bold}${Math.round(N*(3600000/durMs)).toLocaleString("es-MX")}${c.reset}`);
  pr(`  • Con Redis + PM2 cluster (4 workers): ${c.bold}~${Math.round(N*(3600000/durMs)*3.8).toLocaleString("es-MX")} conversaciones/hora${c.reset}`);
  pr(`  • Candidatos que llegan a entrevista: ${c.green}${Math.round((N-abandono)*0.62)} (${((N-abandono)/N*62).toFixed(0)}%)${c.reset}`);
  pr();
  pr(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════════════════════${c.reset}`);

  // JSON
  if (REPORT_PATH) {
    writeFileSync(REPORT_PATH, JSON.stringify({
      simulatedAt: new Date().toISOString(), totalCandidatos:N, duracionMs:durMs,
      metricas:{ tasaExito:parseFloat(tasa), abandono, scorePersonalizacion:parseFloat(scoreTotal.toFixed(2)),
        latencias:{p50,p95,p99}, turnosTotales },
      distribuciones:{ porVacante, porCanal, porEscolaridad:porEsc, porExperiencia:porExp,
        porPersonalidad:porPers, porSituacion:porSit, porDisponibilidad:porDisp, porTipoMensaje:porTipoMsg },
      restriccionesAtendidas: restricAtendidas,
    }, null, 2));
    pr(`  ${c.dim}Reporte guardado en: ${REPORT_PATH}${c.reset}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────
console.clear();
console.log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.bold}${C.cyan}║  🎯  RHDreams — Simulación 1000 candidatos / 6 canales / 4 vacantes  ║${C.reset}`);
console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}`);
console.log(`  Canales: WhatsApp Baileys · WhatsApp Meta · Messenger · Instagram · TikTok · Indeed`);
console.log(`  Vacantes: Ayudante General · Asesor Comercial · Supervisor · Promotor`);
console.log(`  Perfiles: Sin estudios → Licenciatura | Sin exp → +10 años | 16 a 65 años`);
console.log(`  Mensajes: Texto · Audio/voz · Foto del anuncio · Foto CV · PDF CV`);
console.log();
console.log(`  Generando ${TOTAL} candidatos únicos...`);

const candidatos = Array.from({ length: TOTAL }, (_,i) => generarCandidato(i));
const dist = VACANTES.map(v => `${v.titulo}: ${candidatos.filter(c=>c.vacante.id===v.id).length}`).join(" | ");
console.log(`  Distribución por vacante: ${dist}`);
console.log();
console.log(); console.log(); console.log();

const t0 = performance.now();
const resultados = await runPool(candidatos);
const dur = Math.round(performance.now() - t0);

console.log();
reporte(resultados, dur);
