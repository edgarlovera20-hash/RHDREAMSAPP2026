#!/usr/bin/env node
/**
 * simulate-1000mpm.mjs
 * Simula 1000 mensajes/minuto contra la app RHDreams.
 *
 * Modos:
 *   --mode=live   Dispara peticiones HTTP reales (necesita servidor corriendo)
 *   --mode=dry    Simula el comportamiento del servidor sin red (default)
 *
 * Opciones:
 *   --base=URL          URL base del servidor (default: http://localhost:3000)
 *   --duration=60       Segundos que dura la simulación (default: 60)
 *   --rate=1000         Mensajes por minuto objetivo (default: 1000)
 *   --workers=4         Procesos PM2/cluster simulados (default: 4)
 *   --ai-latency=3000   Latencia media de Gemini en ms (default: 3000)
 *   --sessions=20       Sesiones WhatsApp Baileys disponibles (default: 20)
 *   --token=TOKEN       JWT para autenticación en modo live
 *   --report=path.json  Guardar resultado en JSON (opcional)
 */

import { writeFileSync } from "fs";
import { performance } from "perf_hooks";

// ─── CLI args ──────────────────────────────────────────────────────────────
const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const [k, v] = arg.slice(2).split("=");
  args.set(k, v ?? process.argv[++i]);
}

const MODE         = args.get("mode")        || "dry";
const BASE_URL     = (args.get("base")       || "http://localhost:3000").replace(/\/$/, "");
const DURATION_S   = Number(args.get("duration") || 60);
const TARGET_RATE  = Number(args.get("rate")     || 1000);   // msg/min
const WORKERS      = Number(args.get("workers")  || 4);
const AI_LAT_MS    = Number(args.get("ai-latency") || 3000); // ms media Gemini
const MAX_SESSIONS = Number(args.get("sessions")   || 20);
const AUTH_TOKEN   = args.get("token") || "";
const REPORT_PATH  = args.get("report") || "";

const MSG_PER_SEC  = TARGET_RATE / 60;                      // 16.67 msg/s
const INTERVAL_MS  = 1000 / MSG_PER_SEC;                    // 60 ms entre mensajes
const TOTAL_MSGS   = Math.round(TARGET_RATE * (DURATION_S / 60));

// ─── Conversaciones ficticias ──────────────────────────────────────────────
const CANDIDATE_NAMES = [
  "Ana García","Carlos Pérez","María López","Juan Martínez","Sofía Hernández",
  "Luis Torres","Gabriela Díaz","Roberto Sánchez","Valentina Ramírez","Diego Flores",
  "Paola Reyes","Andrés Morales","Camila Castro","Fernando Ortiz","Daniela Vargas",
];

const MESSAGES = [
  "hola", "informacion", "quiero trabajar", "cuánto pagan", "cuáles son los horarios",
  "qué documentos necesito", "puedo ir mañana", "tengo 17 años", "vivo en iztapalapa",
  "soy bachiller", "tengo experiencia en ventas", "me interesa el puesto de asesor",
  "puedo trabajar fines de semana", "ya fui a entrevista", "cuándo me llaman",
  "me pueden dar horario matutino", "trabajo por la tarde", "tengo hijos",
  "cuándo empieza", "qué incluye el contrato", "hay seguro médico",
  "necesito el empleo urgente", "puedo empezar esta semana", "gracias",
  "no pude ir a la entrevista", "quiero reagendar", "buenas noches",
];

const AGENT_RESPONSES = [
  "¡Hola! Soy tu asistente de reclutamiento de Heavenly Dreams. ¿En qué puedo ayudarte?",
  "Con gusto te doy información. ¿Tienes experiencia en atención al cliente?",
  "El sueldo base es de $8,000 mensuales más comisiones. ¿Te interesa?",
  "Tenemos turnos matutinos de 8am-4pm y vespertinos de 2pm-10pm. ¿Cuál prefieres?",
  "Necesitas INE, CURP, comprobante de domicilio y tu último comprobante de estudios.",
  "Claro, podemos agendar tu entrevista. ¿Cuándo tienes disponibilidad?",
  "Entiendo. Voy a anotar tus datos para que el equipo de RH te contacte.",
  "¿Podrías decirme tu nombre completo y número de teléfono?",
  "Perfecto. Te envío la dirección de la sucursal más cercana a tu zona.",
  "Sí, incluimos IMSS desde el primer día. ¿Tienes alguna otra pregunta?",
];

// ─── Utilidades ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function jitter(base, pct = 0.3) {
  return base + base * (Math.random() * 2 - 1) * pct;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}

function bar(value, max, width = 30, char = "█") {
  const filled = Math.round((value / Math.max(max, 1)) * width);
  return char.repeat(Math.min(filled, width)) + "░".repeat(Math.max(width - filled, 0));
}

function fmt(n) { return n.toLocaleString("es-MX"); }

// ─── Colores ANSI ──────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", white: "\x1b[37m",
  bgRed: "\x1b[41m", bgGreen: "\x1b[42m", bgYellow: "\x1b[43m", bgBlue: "\x1b[44m",
};

// ─── Estado global de métricas ─────────────────────────────────────────────
const metrics = {
  sent: 0,
  ok: 0,
  failed: 0,
  rateLimited: 0,
  aiQueueFull: 0,
  baileysLimitHit: 0,
  timeouts: 0,
  latencies: [],
  aiLatencies: [],
  errorsByType: {},
  timeline: [],           // muestra por segundo
  aiQueueDepth: [],       // profundidad de cola por segundo
};

// ─── Modelo del servidor (modo dry) ───────────────────────────────────────
class ServerModel {
  constructor() {
    this.aiQueueMax    = 500;
    this.aiConcurrency = WORKERS * 4;       // 4 goroutines AI por worker
    this.aiActive      = 0;
    this.aiQueue       = [];
    this.baileySessions = 0;
    this.rateLimitWindows = new Map();       // ip → count en ventana
    this.requestsThisSecond = 0;
    this.maxRps        = WORKERS * 800;      // ~3200 rps teórico
    this._drainLoop();
  }

  // Simula la cola de AI procesando jobs en paralelo
  _drainLoop() {
    setInterval(() => {
      while (this.aiActive < this.aiConcurrency && this.aiQueue.length > 0) {
        const job = this.aiQueue.shift();
        this.aiActive++;
        const lat = Math.round(jitter(AI_LAT_MS, 0.4));
        setTimeout(() => {
          this.aiActive--;
          job.resolve({ latencyMs: lat });
        }, lat);
      }
    }, 10);
  }

  async handleMessage(phoneNumber, text) {
    const start = performance.now();

    // 1. Rate limit: 300 req/15min por IP → ~1.33 req/s sostenido por IP
    const ipKey = phoneNumber.slice(0, 7);
    const now = Date.now();
    const windowStart = now - 15 * 60 * 1000;
    if (!this.rateLimitWindows.has(ipKey)) this.rateLimitWindows.set(ipKey, []);
    const window = this.rateLimitWindows.get(ipKey).filter((t) => t > windowStart);
    if (window.length >= 300) {
      this.rateLimitWindows.set(ipKey, window);
      return { status: 429, error: "rate_limited", durationMs: 5 };
    }
    window.push(now);
    this.rateLimitWindows.set(ipKey, window);

    // 2. Baileys session check
    if (this.baileySessions >= MAX_SESSIONS && Math.random() < 0.05) {
      return { status: 503, error: "baileys_limit", durationMs: 10 };
    }
    this.baileySessions = Math.min(MAX_SESSIONS, this.baileySessions + 1);
    setTimeout(() => this.baileySessions = Math.max(0, this.baileySessions - 1), 2000);

    // 3. Cola de AI
    if (this.aiQueue.length + this.aiActive >= this.aiQueueMax) {
      return { status: 503, error: "ai_queue_full", durationMs: 15 };
    }

    // 4. Encolar y esperar respuesta AI
    const aiResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("ai_timeout"));
      }, 30000);
      this.aiQueue.push({
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });
    }).catch((e) => ({ error: e.message }));

    if (aiResult.error) {
      return { status: 504, error: aiResult.error, durationMs: Math.round(performance.now() - start) };
    }

    const totalDuration = Math.round(performance.now() - start);
    return {
      status: 200,
      durationMs: totalDuration,
      aiLatencyMs: aiResult.latencyMs,
      response: AGENT_RESPONSES[randInt(0, AGENT_RESPONSES.length - 1)],
    };
  }

  getStats() {
    return {
      aiQueueDepth: this.aiQueue.length,
      aiActive: this.aiActive,
      baileySessions: this.baileySessions,
    };
  }
}

// ─── Petición HTTP real (modo live) ────────────────────────────────────────
async function liveRequest(phone, text, msgIndex) {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const payload = {
    agentName: "Agente Principal 1",
    systemPrompt: "Eres reclutador RH de Heavenly Dreams. Pregunta una sola cosa a la vez.",
    conversationHistory: [],
    userPrompt: text,
  };

  try {
    const res = await fetch(`${BASE_URL}/api/gemini/agent/reply`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Forwarded-For": phone,
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    clearTimeout(timeout);
    return {
      status: res.status,
      durationMs: Math.round(performance.now() - start),
      aiLatencyMs: body.data?.latencyMs,
      response: body.data?.text?.slice(0, 80),
      error: res.ok ? undefined : (body.error || `HTTP ${res.status}`),
    };
  } catch (e) {
    clearTimeout(timeout);
    return {
      status: e.name === "AbortError" ? 504 : 0,
      error: e.name === "AbortError" ? "timeout" : e.message,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

// ─── Generador de teléfonos virtuales ──────────────────────────────────────
function virtualPhone(index) {
  const base = 5500000000 + index;
  return `+521${base}`;
}

// ─── Loop de simulación ────────────────────────────────────────────────────
async function runSimulation() {
  const server = MODE === "dry" ? new ServerModel() : null;
  const startTs = performance.now();
  let msgIndex = 0;
  let secondBucket = 0;
  let secondOk = 0, secondFailed = 0;

  console.clear();
  printHeader();

  // Scheduler: dispara mensajes cada INTERVAL_MS
  const schedulerHandle = setInterval(async () => {
    if (msgIndex >= TOTAL_MSGS) return;

    const idx = msgIndex++;
    const phone = virtualPhone(idx % 1000);   // 1000 teléfonos únicos simulados
    const text  = MESSAGES[idx % MESSAGES.length];

    const call = server
      ? server.handleMessage(phone, text)
      : liveRequest(phone, text, idx);

    call.then((result) => {
      metrics.sent++;
      metrics.latencies.push(result.durationMs);
      if (result.aiLatencyMs) metrics.aiLatencies.push(result.aiLatencyMs);

      if (result.status === 200) {
        metrics.ok++;
        secondOk++;
      } else {
        metrics.failed++;
        secondFailed++;
        const errKey = result.error || String(result.status);
        metrics.errorsByType[errKey] = (metrics.errorsByType[errKey] || 0) + 1;
        if (result.status === 429) metrics.rateLimited++;
        else if (result.error === "ai_queue_full") metrics.aiQueueFull++;
        else if (result.error === "baileys_limit") metrics.baileysLimitHit++;
        else if (result.error === "timeout" || result.error === "ai_timeout") metrics.timeouts++;
      }
    });
  }, INTERVAL_MS);

  // Snapshot por segundo + UI
  const uiHandle = setInterval(() => {
    const elapsed = (performance.now() - startTs) / 1000;
    if (elapsed > DURATION_S) return;

    const serverStats = server?.getStats() || { aiQueueDepth: 0, aiActive: 0, baileySessions: 0 };

    metrics.timeline.push({
      t: Math.round(elapsed),
      sent: metrics.sent,
      ok: metrics.ok,
      failed: metrics.failed,
      rps: secondOk + secondFailed,
      queueDepth: serverStats.aiQueueDepth,
      aiActive: serverStats.aiActive,
    });
    metrics.aiQueueDepth.push(serverStats.aiQueueDepth);

    printLiveUI(elapsed, serverStats, secondOk + secondFailed, secondOk, secondFailed);
    secondOk = 0;
    secondFailed = 0;
    secondBucket++;
  }, 1000);

  // Esperar duración + buffer
  await sleep(DURATION_S * 1000 + 5000);
  clearInterval(schedulerHandle);
  clearInterval(uiHandle);

  // Esperar jobs en vuelo
  await sleep(Math.max(AI_LAT_MS * 2, 8000));

  console.clear();
  printFinalReport(server);
}

// ─── UI en tiempo real ────────────────────────────────────────────────────
function printHeader() {
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   🚀  RHDreams — Simulación 1000 msg/min (${DURATION_S}s)             ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  Modo: ${C.bold}${MODE === "live" ? C.green + "LIVE " + BASE_URL : C.yellow + "DRY (modelo interno)"}${C.reset}`);
  console.log(`  Objetivo: ${C.bold}${fmt(TARGET_RATE)} msg/min${C.reset} = ${MSG_PER_SEC.toFixed(2)} msg/s | Workers PM2: ${WORKERS} | AI concurrencia: ${WORKERS * 4}`);
  console.log(`  Baileys max sesiones: ${MAX_SESSIONS} | AI latencia media: ${AI_LAT_MS}ms | Total msgs: ${fmt(TOTAL_MSGS)}`);
  console.log();
}

function printLiveUI(elapsed, serverStats, rps, ok, failed) {
  const progress = elapsed / DURATION_S;
  const pct = Math.min(progress * 100, 100).toFixed(1);
  const remaining = Math.max(DURATION_S - elapsed, 0).toFixed(0);
  const successRate = metrics.sent > 0
    ? ((metrics.ok / metrics.sent) * 100).toFixed(1)
    : "0.0";
  const p50 = percentile(metrics.latencies, 50);
  const p99 = percentile(metrics.latencies, 99);
  const queueDepth = serverStats.aiQueueDepth;
  const queuePct = queueDepth / 500;

  const successColor = parseFloat(successRate) >= 95 ? C.green
    : parseFloat(successRate) >= 80 ? C.yellow : C.red;
  const queueColor = queuePct < 0.5 ? C.green : queuePct < 0.8 ? C.yellow : C.red;

  process.stdout.write("\x1b[6A\x1b[J"); // Sube 6 líneas y limpia

  // Barra de progreso
  const pbFilled = Math.round(progress * 40);
  const pb = "█".repeat(pbFilled) + "░".repeat(40 - pbFilled);
  console.log(`  ${C.cyan}[${pb}]${C.reset} ${pct}% — ${remaining}s restantes`);

  // Métricas en vivo
  console.log(
    `  Mensajes: ${C.bold}${fmt(metrics.sent)}${C.reset} enviados | ` +
    `${C.green}${fmt(metrics.ok)} OK${C.reset} | ` +
    `${C.red}${fmt(metrics.failed)} fallidos${C.reset} | ` +
    `${successColor}${successRate}% éxito${C.reset}`
  );
  console.log(
    `  RPS actual: ${C.bold}${rps}${C.reset}/s (ok:${C.green}${ok}${C.reset} fail:${C.red}${failed}${C.reset}) | ` +
    `p50: ${p50}ms | p99: ${p99}ms`
  );
  console.log(
    `  Cola AI: ${queueColor}${bar(queueDepth, 500, 20)} ${queueDepth}/500${C.reset} | ` +
    `AI activos: ${serverStats.aiActive}/${WORKERS * 4} | ` +
    `Baileys: ${serverStats.baileySessions}/${MAX_SESSIONS}`
  );
  console.log(
    `  Rate-limited: ${C.yellow}${fmt(metrics.rateLimited)}${C.reset} | ` +
    `Cola llena: ${C.red}${fmt(metrics.aiQueueFull)}${C.reset} | ` +
    `Timeouts: ${C.red}${fmt(metrics.timeouts)}${C.reset} | ` +
    `Baileys limit: ${C.red}${fmt(metrics.baileysLimitHit)}${C.reset}`
  );
  console.log();
}

// ─── Reporte final ─────────────────────────────────────────────────────────
function printFinalReport(server) {
  const totalDuration = DURATION_S;
  const successRate = metrics.sent > 0 ? (metrics.ok / metrics.sent) * 100 : 0;
  const p50  = percentile(metrics.latencies, 50);
  const p95  = percentile(metrics.latencies, 95);
  const p99  = percentile(metrics.latencies, 99);
  const pMax = metrics.latencies.length ? Math.max(...metrics.latencies) : 0;
  const aiP50  = percentile(metrics.aiLatencies, 50);
  const aiP95  = percentile(metrics.aiLatencies, 95);
  const maxQueueDepth = metrics.aiQueueDepth.length ? Math.max(...metrics.aiQueueDepth) : 0;
  const avgQueueDepth = metrics.aiQueueDepth.length
    ? (metrics.aiQueueDepth.reduce((a, b) => a + b, 0) / metrics.aiQueueDepth.length).toFixed(1)
    : "0";

  const overallHealth =
    successRate >= 98 ? { label: "EXCELENTE ✅", color: C.green } :
    successRate >= 95 ? { label: "BUENO ✅", color: C.green } :
    successRate >= 85 ? { label: "DEGRADADO ⚠️", color: C.yellow } :
    successRate >= 70 ? { label: "CRÍTICO 🔴", color: C.red } :
    { label: "FALLO MASIVO 💥", color: C.bgRed + C.white };

  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║         📊  REPORTE FINAL — SIMULACIÓN 1000 MSG/MIN               ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log();

  // Estado general
  console.log(`  ${C.bold}Estado general: ${overallHealth.color}${overallHealth.label}${C.reset}`);
  console.log();

  // Volumen
  console.log(`  ${C.bold}${C.white}── VOLUMEN ───────────────────────────────────────────────${C.reset}`);
  console.log(`  Duración simulación   : ${totalDuration}s`);
  console.log(`  Mensajes objetivo     : ${fmt(TOTAL_MSGS)}`);
  console.log(`  Mensajes enviados     : ${fmt(metrics.sent)}`);
  console.log(`  Respondidos OK        : ${C.green}${fmt(metrics.ok)}${C.reset}`);
  console.log(`  Fallidos              : ${C.red}${fmt(metrics.failed)}${C.reset}`);
  console.log(`  Tasa de éxito         : ${overallHealth.color}${successRate.toFixed(2)}%${C.reset}`);
  console.log(`  Throughput real       : ${(metrics.sent / totalDuration).toFixed(2)} msg/s = ${Math.round(metrics.sent / totalDuration * 60)} msg/min`);
  console.log();

  // Latencia
  console.log(`  ${C.bold}${C.white}── LATENCIAS (extremo-a-extremo) ─────────────────────────${C.reset}`);
  console.log(`  p50  : ${p50}ms    ${bar(p50, 10000, 25)}`);
  console.log(`  p95  : ${p95}ms    ${bar(p95, 10000, 25)}`);
  console.log(`  p99  : ${p99}ms    ${bar(p99, 10000, 25)}`);
  console.log(`  max  : ${pMax}ms`);
  if (metrics.aiLatencies.length) {
    console.log(`  AI p50: ${aiP50}ms | AI p95: ${aiP95}ms`);
  }
  console.log();

  // Cola AI
  console.log(`  ${C.bold}${C.white}── COLA DE IA ────────────────────────────────────────────${C.reset}`);
  console.log(`  Profundidad máxima    : ${maxQueueDepth}/500`);
  console.log(`  Profundidad promedio  : ${avgQueueDepth}/500`);
  console.log(`  Rechazos "cola llena" : ${C.red}${fmt(metrics.aiQueueFull)}${C.reset}`);
  console.log(`  Timeouts AI           : ${C.red}${fmt(metrics.timeouts)}${C.reset}`);
  console.log();

  // Errores
  console.log(`  ${C.bold}${C.white}── ERRORES ───────────────────────────────────────────────${C.reset}`);
  console.log(`  Rate-limited (429)    : ${C.yellow}${fmt(metrics.rateLimited)}${C.reset}`);
  console.log(`  Baileys sin sesión    : ${C.yellow}${fmt(metrics.baileysLimitHit)}${C.reset}`);
  console.log(`  Cola AI llena         : ${C.red}${fmt(metrics.aiQueueFull)}${C.reset}`);
  console.log(`  Timeouts              : ${C.red}${fmt(metrics.timeouts)}${C.reset}`);
  if (Object.keys(metrics.errorsByType).length) {
    console.log(`  Desglose:`);
    for (const [type, count] of Object.entries(metrics.errorsByType).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${type.padEnd(25)}: ${fmt(count)}`);
    }
  }
  console.log();

  // Timeline (muestra por segundo)
  console.log(`  ${C.bold}${C.white}── TIMELINE (msg/s por segundo) ──────────────────────────${C.reset}`);
  const timelineSlice = metrics.timeline.slice(0, 60);
  for (let i = 0; i < timelineSlice.length; i += 5) {
    const slice = timelineSlice.slice(i, i + 5);
    let row = `  `;
    for (const snap of slice) {
      const b = bar(snap.rps, Math.ceil(MSG_PER_SEC * 3), 6, "▓");
      const c = snap.failed > 0 ? C.yellow : C.green;
      row += `${C.dim}t=${String(snap.t).padStart(2)}s${C.reset} ${c}${b}${C.reset}${snap.rps.toString().padStart(3)} | `;
    }
    console.log(row);
  }
  console.log();

  // Análisis de cuellos de botella
  console.log(`  ${C.bold}${C.white}── ANÁLISIS DE CUELLOS DE BOTELLA ────────────────────────${C.reset}`);
  const bottlenecks = identifyBottlenecks(successRate, maxQueueDepth, metrics);
  for (const b of bottlenecks) {
    console.log(`  ${b.icon} ${b.color}${C.bold}${b.label}${C.reset}: ${b.desc}`);
  }
  console.log();

  // Recomendaciones
  console.log(`  ${C.bold}${C.white}── RECOMENDACIONES PARA PRODUCCIÓN ───────────────────────${C.reset}`);
  const recs = generateRecommendations(successRate, maxQueueDepth, metrics, p99);
  for (const r of recs) {
    console.log(`  ${r.priority === "P0" ? C.red : r.priority === "P1" ? C.yellow : C.green}[${r.priority}]${C.reset} ${r.text}`);
  }
  console.log();

  // Capacidad proyectada
  console.log(`  ${C.bold}${C.white}── CAPACIDAD PROYECTADA ──────────────────────────────────${C.reset}`);
  const projectedMax = Math.round(MSG_PER_SEC * (metrics.ok / Math.max(metrics.sent, 1)) * 60 * (500 / Math.max(maxQueueDepth, 1)));
  console.log(`  Con la configuración actual el servidor puede manejar sostenidamente:`);
  console.log(`  ${C.bold}≈ ${fmt(Math.min(projectedMax, TARGET_RATE * 5))} mensajes/minuto${C.reset} con <5% de fallos`);
  console.log(`  Para alcanzar 1000 msg/min confiablemente se requiere:`);
  console.log(`    • Redis + PM2 cluster (${WORKERS} workers)`);
  console.log(`    • AI_QUEUE_CONCURRENCY=${WORKERS * 6} (${WORKERS * 6} slots paralelos de Gemini)`);
  console.log(`    • BAILEYS_MAX_SESSIONS=50`);
  console.log(`    • Gemini Paid tier (sin límite de 15 RPM)`);
  console.log();

  // Guardar JSON
  const report = buildJsonReport(successRate, maxQueueDepth, avgQueueDepth, p50, p95, p99, pMax, aiP50, aiP95);
  if (REPORT_PATH) {
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`  ${C.dim}Reporte guardado en: ${REPORT_PATH}${C.reset}`);
  }

  console.log(`${C.bold}${C.cyan}════════════════════════════════════════════════════════════════════${C.reset}`);
}

function identifyBottlenecks(successRate, maxQueueDepth, m) {
  const results = [];

  if (maxQueueDepth > 400) {
    results.push({ icon: "🔴", color: C.red, label: "Cola AI saturada", desc: `Profundidad máx ${maxQueueDepth}/500. Aumentar AI_QUEUE_CONCURRENCY.` });
  } else if (maxQueueDepth > 200) {
    results.push({ icon: "🟡", color: C.yellow, label: "Cola AI presionada", desc: `Profundidad máx ${maxQueueDepth}/500. Monitorear en producción.` });
  } else {
    results.push({ icon: "🟢", color: C.green, label: "Cola AI saludable", desc: `Profundidad máx ${maxQueueDepth}/500. Hay margen.` });
  }

  if (m.rateLimited > m.sent * 0.05) {
    results.push({ icon: "🔴", color: C.red, label: "Rate limiting agresivo", desc: `${((m.rateLimited/m.sent)*100).toFixed(1)}% de requests bloqueados. Revisar API_RATE_LIMIT_MAX.` });
  } else if (m.rateLimited > 0) {
    results.push({ icon: "🟡", color: C.yellow, label: "Rate limiting activo", desc: `${m.rateLimited} requests limitados (${((m.rateLimited/m.sent)*100).toFixed(2)}%). Comportamiento esperado.` });
  }

  if (m.baileysLimitHit > 0) {
    results.push({ icon: "🟡", color: C.yellow, label: "Baileys sesiones al límite", desc: `${m.baileysLimitHit} rechazos. BAILEYS_MAX_SESSIONS=${MAX_SESSIONS} es bajo para 1000 msg/min.` });
  } else {
    results.push({ icon: "🟢", color: C.green, label: "Baileys sesiones OK", desc: `0 rechazos con ${MAX_SESSIONS} sesiones máx.` });
  }

  if (m.timeouts > 0) {
    results.push({ icon: "🔴", color: C.red, label: "Timeouts de AI detectados", desc: `${m.timeouts} mensajes sin respuesta. Gemini tardó más de 30s.` });
  }

  if (successRate >= 98) {
    results.push({ icon: "🟢", color: C.green, label: "Disponibilidad excelente", desc: `${successRate.toFixed(2)}% de mensajes respondidos correctamente.` });
  } else if (successRate >= 95) {
    results.push({ icon: "🟡", color: C.yellow, label: "Disponibilidad aceptable", desc: `${successRate.toFixed(2)}% de éxito. Meta SLA recomendada: ≥99%.` });
  } else {
    results.push({ icon: "🔴", color: C.red, label: "Disponibilidad crítica", desc: `Solo ${successRate.toFixed(2)}% de éxito. La app falla bajo esta carga.` });
  }

  return results;
}

function generateRecommendations(successRate, maxQueueDepth, m, p99) {
  const recs = [];

  if (maxQueueDepth > 300) {
    recs.push({ priority: "P0", text: `Aumentar AI_QUEUE_CONCURRENCY a ${WORKERS * 6} y AI_QUEUE_MAX_SIZE a 1000` });
  }
  if (m.baileysLimitHit > 0) {
    recs.push({ priority: "P0", text: "Configurar BAILEYS_MAX_SESSIONS=50 en .env del servidor" });
  }
  if (m.timeouts > 0) {
    recs.push({ priority: "P0", text: "Activar Gemini Paid tier (GEMINI_DEFAULT_TIER=paid) para mayor cuota" });
  }
  recs.push({ priority: "P0", text: "Configurar Redis: REDIS_URL=redis://127.0.0.1:6379 para habilitar BullMQ + rate limiting compartido" });
  recs.push({ priority: "P1", text: `Usar PM2 cluster: pm2 start ecosystem.config.cjs --env production (${WORKERS} workers = ${WORKERS * 4}x CPU cores)` });
  if (p99 > 8000) {
    recs.push({ priority: "P1", text: `p99 latencia = ${p99}ms. Activar Groq/OpenRouter como fallback para mensajes urgentes` });
  }
  recs.push({ priority: "P1", text: "Configurar nginx con worker_processes auto y keepalive 32 upstream" });
  recs.push({ priority: "P2", text: "Implementar SQLite/PostgreSQL para remplazar persistencia en archivos JSON" });
  recs.push({ priority: "P2", text: "Agregar caché Redis para respuestas frecuentes (mismo candidato, misma pregunta)" });
  recs.push({ priority: "P2", text: "Configurar alertas: si cola AI > 300 o tasa de error > 5%, notificar por WhatsApp/Slack" });

  return recs;
}

function buildJsonReport(successRate, maxQueueDepth, avgQueueDepth, p50, p95, p99, pMax, aiP50, aiP95) {
  return {
    simulatedAt: new Date().toISOString(),
    config: {
      mode: MODE,
      durationS: DURATION_S,
      targetRatePerMin: TARGET_RATE,
      workers: WORKERS,
      aiLatencyMs: AI_LAT_MS,
      maxBaileySessions: MAX_SESSIONS,
    },
    volume: {
      totalMessages: metrics.sent,
      ok: metrics.ok,
      failed: metrics.failed,
      successRate: parseFloat(successRate.toFixed(4)),
      throughputPerSec: parseFloat((metrics.sent / DURATION_S).toFixed(2)),
      throughputPerMin: Math.round(metrics.sent / DURATION_S * 60),
    },
    latencyMs: { p50, p95, p99, max: pMax, aiP50, aiP95 },
    errors: {
      rateLimited: metrics.rateLimited,
      aiQueueFull: metrics.aiQueueFull,
      baileysLimit: metrics.baileysLimitHit,
      timeouts: metrics.timeouts,
      byType: metrics.errorsByType,
    },
    aiQueue: {
      maxDepth: maxQueueDepth,
      avgDepth: parseFloat(avgQueueDepth),
      capacity: 500,
    },
    timeline: metrics.timeline,
  };
}

// ─── Entry point ───────────────────────────────────────────────────────────
console.clear();
printHeader();
console.log(`  Iniciando en ${C.bold}3${C.reset}s...`);
console.log(); console.log(); console.log(); console.log(); console.log();
await sleep(3000);
await runSimulation();
