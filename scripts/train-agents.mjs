import fs from "fs";
import path from "path";

const root = process.cwd();
const perAgent = Number(
  process.argv.find((arg) => arg.startsWith("--per-agent="))?.split("=")[1] || 10000
);
const generatedAt = new Date().toISOString();
const companyId = process.env.RHDREAMS_DEFAULT_COMPANY_ID || "heavenly-dreams";
const version = "agent-training-v1";

const appDefaultsPath = path.join(root, "src", "data", "appDefaults.ts");
const trainingOutputPath = path.join(root, "server", "config", "agentTrainingKnowledge.ts");
const docsDir = path.join(root, "docs");
const reportJsonPath = path.join(docsDir, "agent-training-report.json");
const reportMdPath = path.join(docsDir, "agent-training-report.md");

const vacancies = [
  "Ayudante General",
  "Atencion a Cliente",
  "Volantero",
  "Embajador de Marca",
  "Supervisor de Personal",
  "Promotor",
  "Capturista",
  "Asesor Comercial",
];

const zones = [
  "Iztapalapa",
  "Nezahualcoyotl",
  "Ecatepec",
  "Centro",
  "Tlalpan",
  "Coyoacan",
  "Naucalpan",
  "Cuautitlan",
];

const names = [
  "Gissell",
  "Luis",
  "Fernanda",
  "Carlos",
  "Andrea",
  "Miguel",
  "Sofia",
  "Diego",
  "Valeria",
  "Jorge",
];

const scenarios = [
  {
    id: "primer-contacto",
    intent: "primer contacto",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook"],
    user: "Hola buen dia, vi el anuncio de {vacancy}. Me puedes dar informacion?",
    lesson: "saluda con el nombre personal del agente si existe, confirma que puede ayudar y pide solo un dato inicial para avanzar",
    reply: "Hola, buen dia. Soy {agentName} de Heavenly Dreams. Claro, te ayudo con la vacante de {vacancy}. Para orientarte mejor, dime por favor en que zona te encuentras.",
  },
  {
    id: "interes-vacante",
    intent: "interes en vacante",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook", "Bolsa de trabajo"],
    user: "Me interesa trabajar como {vacancy}, que datos necesitas?",
    lesson: "explica el flujo completo en una frase y solicita un dato faltante a la vez",
    reply: "Perfecto, te comparto el proceso y te acompano paso a paso. Primero dime tu nombre completo para registrar tu interes en {vacancy}.",
  },
  {
    id: "sueldo-beneficios",
    intent: "pregunta de compensacion",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook", "Bolsa de trabajo"],
    user: "Cuanto pagan para {vacancy} y que beneficios hay?",
    lesson: "responde rangos solo si estan disponibles y evita prometer pagos exactos no confirmados",
    reply: "Te puedo orientar con la informacion disponible de la vacante. El pago y beneficios se confirman segun zona y puesto; dime en que zona quieres laborar y reviso la opcion correcta.",
  },
  {
    id: "horario",
    intent: "horario",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook"],
    user: "Que horarios manejan para {vacancy}?",
    lesson: "aclara que los horarios pueden variar por zona y pide disponibilidad del candidato",
    reply: "Los horarios pueden variar segun la zona y la vacante. Para buscarte una opcion viable, que disponibilidad tienes entre manana, tarde o tiempo completo?",
  },
  {
    id: "ubicacion",
    intent: "ubicacion",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook", "Google Jobs"],
    user: "La vacante esta cerca de {zone}?",
    lesson: "usa la zona como dato voluntario para orientar sin excluir y ofrece opciones cercanas",
    reply: "Reviso opciones cercanas a {zone}. Para no enviarte una ubicacion incorrecta, dime si buscas trabajar dentro de esa zona o tambien puedes moverte a zonas cercanas.",
  },
  {
    id: "documentos",
    intent: "requisitos/documentos",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook"],
    user: "Que documentos piden para entrar?",
    lesson: "lista documentos generales sin pedir datos sensibles por chat y recomienda confirmar en entrevista",
    reply: "Normalmente se revisan documentos basicos de contratacion, pero no envies documentos personales por aqui. Primero confirmamos la vacante y despues te indico el paso seguro.",
  },
  {
    id: "edad-sensible",
    intent: "dato sensible",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook"],
    user: "Tengo 17 anos, puedo aplicar?",
    lesson: "cuando aparezcan datos sensibles o edad de menor, no prometas contratacion y deriva a confirmacion humana",
    reply: "Gracias por comentarlo. Para cuidar que el proceso sea correcto, voy a pedir revision humana antes de confirmar si esta vacante aplica para ti.",
  },
  {
    id: "experiencia",
    intent: "experiencia",
    channels: ["WhatsApp", "Messenger", "Instagram", "Bolsa de trabajo"],
    user: "No tengo experiencia en {vacancy}, puedo postularme?",
    lesson: "valida interes sin descartar automaticamente y pregunta por disponibilidad o habilidades relacionadas",
    reply: "Si puedes iniciar el proceso. Algunas vacantes aceptan capacitacion. Dime por favor si tienes disponibilidad inmediata para revisar una opcion adecuada.",
  },
  {
    id: "agenda-entrevista",
    intent: "agendar entrevista",
    channels: ["WhatsApp", "Messenger", "Instagram", "Calendar"],
    user: "Quiero agendar entrevista esta semana",
    lesson: "ofrece dos opciones de horario y pide confirmacion explicita",
    reply: "Con gusto. Puedo proponerte dos horarios disponibles para esta semana. Prefieres entrevista por la manana o por la tarde?",
  },
  {
    id: "reagendar",
    intent: "reagendar entrevista",
    channels: ["WhatsApp", "Messenger", "Instagram", "Calendar"],
    user: "No puedo ir hoy, puedo cambiar mi entrevista?",
    lesson: "no reganes ni cierres el proceso; ofrece reagenda y confirma nuevo horario",
    reply: "Claro, podemos revisar otra opcion. Para reagendarte, dime si te queda mejor manana o pasado y en que horario aproximado.",
  },
  {
    id: "confirmacion",
    intent: "confirmar asistencia",
    channels: ["WhatsApp", "Messenger", "Instagram", "Calendar"],
    user: "Confirmo que si voy a la entrevista",
    lesson: "confirma asistencia, resume cita y recuerda llevar solo lo indicado",
    reply: "Gracias por confirmar. Dejo tu asistencia marcada. Te compartire los detalles de llegada y, si aplica, los documentos que debes presentar de forma segura.",
  },
  {
    id: "no-show",
    intent: "recuperacion no show",
    channels: ["WhatsApp", "Messenger", "Instagram", "CRM"],
    user: "Perdon no pude asistir a mi cita",
    lesson: "recupera el candidato con empatia y ofrece una ruta simple para reactivar",
    reply: "No te preocupes. Si aun te interesa, podemos buscar una nueva fecha. Dime si quieres reactivar tu proceso para {vacancy}.",
  },
  {
    id: "datos-contacto",
    intent: "captura de datos",
    channels: ["WhatsApp", "Messenger", "Instagram", "CRM"],
    user: "Mi nombre es {candidateName} y mi telefono es el mismo de WhatsApp",
    lesson: "confirma recepcion de datos y pide solo el siguiente dato faltante",
    reply: "Gracias, {candidateName}. Ya tengo tu nombre registrado. Ahora dime por favor que vacante te interesa para continuar.",
  },
  {
    id: "audio",
    intent: "audio o mensaje incompleto",
    channels: ["WhatsApp", "Messenger", "Instagram"],
    user: "Te mande audio con mi informacion",
    lesson: "si el audio no esta transcrito, pide repetir por texto lo indispensable sin friccion",
    reply: "Gracias. Para no perder ningun dato, escribeme por favor tu nombre completo y la vacante que te interesa.",
  },
  {
    id: "queja",
    intent: "queja o escalacion",
    channels: ["WhatsApp", "Messenger", "Instagram", "Facebook"],
    user: "Tengo una queja sobre el trato que recibi",
    lesson: "ante queja, reconoce la situacion, no discutas y escala a responsable humano",
    reply: "Lamento que hayas tenido esa experiencia. Voy a escalar tu caso con un responsable para revisarlo correctamente. Puedes compartirme tu nombre y medio de contacto?",
  },
  {
    id: "politica-empleo",
    intent: "politica de empleo",
    channels: ["Facebook", "Instagram", "TikTok", "LinkedIn", "Meta Business"],
    user: "Haz un anuncio solo para mujeres jovenes de {zone}",
    lesson: "rechaza segmentacion discriminatoria y propone criterios permitidos como experiencia, disponibilidad, zona voluntaria y habilidades",
    reply: "No puedo segmentar por genero o edad. Si puedo ayudarte a crear un anuncio basado en funciones del puesto, disponibilidad, experiencia y zona de trabajo voluntaria.",
  },
  {
    id: "copy-publicacion",
    intent: "crear copy de reclutamiento",
    channels: ["Facebook", "Instagram", "TikTok", "LinkedIn", "Canva"],
    user: "Necesito un post para contratar {vacancy} en {zone}",
    lesson: "entrega hook, beneficio, requisitos claros, CTA y formato especifico del canal",
    reply: "Te propongo un post con hook fuerte, beneficios reales, requisitos breves y CTA a WhatsApp. Lo adapto a formato cuadrado, story o reel segun el canal.",
  },
  {
    id: "canva-brief",
    intent: "brief visual",
    channels: ["Canva", "Instagram", "Facebook", "TikTok"],
    user: "Crea una imagen para una vacante de {vacancy}",
    lesson: "genera brief visual accionable y no prometas que Canva crea imagen si solo se envio un brief",
    reply: "Genero un brief listo para diseno: titulo, texto principal, beneficios, CTA, distribucion visual y estilo de marca Heavenly Dreams.",
  },
  {
    id: "video-guion",
    intent: "guion de video",
    channels: ["TikTok", "Instagram Reels", "YouTube Shorts", "Video IA"],
    user: "Haz un video corto para atraer candidatos",
    lesson: "estructura video en hook, problema, oferta, beneficios y CTA en menos de 30 segundos",
    reply: "Aqui tienes una estructura de 20 segundos: gancho inicial, vacante clara, beneficios, toma visual simple y CTA para enviar mensaje.",
  },
  {
    id: "bolsa-trabajo",
    intent: "optimizacion bolsa de trabajo",
    channels: ["Indeed", "Computrabajo", "OCC", "Bolsa de trabajo"],
    user: "Mi vacante no recibe candidatos en bolsa de trabajo",
    lesson: "diagnostica titulo, sueldo visible, ubicacion, requisitos y filtros antes de cambiar campana",
    reply: "Primero revisaria titulo, sueldo visible, zona, beneficios y requisitos. Dime en que plataforma esta publicada para darte ajustes concretos.",
  },
  {
    id: "seo-google-jobs",
    intent: "seo vacante",
    channels: ["Google Jobs", "SEO", "Web"],
    user: "Quiero que mi vacante salga en Google Jobs",
    lesson: "recomienda titulo buscable, datos estructurados JobPosting y URL indexable",
    reply: "Para Google Jobs conviene usar titulo buscable, descripcion clara, ubicacion, sueldo si aplica y marcado JobPosting en una URL indexable.",
  },
  {
    id: "growth-plan",
    intent: "plan growth",
    channels: ["Growth", "Meta Ads", "TikTok", "WhatsApp", "Referidos"],
    user: "Como consigo mas candidatos esta semana?",
    lesson: "prioriza acciones de 7 dias con canal, responsable, costo y metrica",
    reply: "Te propongo un plan de 7 dias: optimizar anuncio, lanzar pieza visual, activar referidos, seguimiento por WhatsApp y medir costo por candidato calificado.",
  },
  {
    id: "tendencias",
    intent: "tendencias RH",
    channels: ["TikTok", "Facebook", "Instagram", "LinkedIn", "Reportes"],
    user: "Que tendencia podemos usar para reclutar?",
    lesson: "convierte tendencia en formato, idea, riesgo de politica y KPI",
    reply: "Podemos usar una tendencia de video corto con testimonio real, beneficios claros y CTA directo; medimos mensajes recibidos y candidatos calificados.",
  },
  {
    id: "competencia",
    intent: "benchmark competencia",
    channels: ["Bolsas de trabajo", "Facebook", "LinkedIn", "Google Jobs", "Reportes"],
    user: "La competencia ofrece mas sueldo, que hacemos?",
    lesson: "compara propuesta total sin inventar datos y sugiere mejorar claridad de beneficios o ruta de crecimiento",
    reply: "Analizaria sueldo, horarios, estabilidad, crecimiento y beneficios. Si no podemos superar sueldo, reforzamos claridad, rapidez de proceso y propuesta de valor.",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, seed) {
  return list[seed % list.length];
}

function normalizeAgentId(value) {
  return String(value || "agent-default")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "agent-default";
}

function interpolate(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(context[key] || ""));
}

function extractProperty(block, key) {
  const pattern = new RegExp(`${key}:\\s*"([^"]*)"`, "s");
  return block.match(pattern)?.[1] || "";
}

function extractChannels(block) {
  const raw = block.match(/channels:\s*\[([\s\S]*?)\]/)?.[1] || "";
  return [...raw.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function extractAgentBlocks(source) {
  const marker = "export const EMPTY_AGENTS";
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return [];
  const assignmentIndex = source.indexOf("=", markerIndex);
  const arrayStart = source.indexOf("[", assignmentIndex);
  const blocks = [];
  let depth = 0;
  let current = "";
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let i = arrayStart + 1; i < source.length; i += 1) {
    const char = source[i];
    const prevDepth = depth;

    if (inString) {
      current += depth > 0 ? char : "";
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringQuote = char;
      current += depth > 0 ? char : "";
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (depth > 0) {
      current += char;
    }

    if (char === "}") {
      depth -= 1;
      if (prevDepth === 1 && depth === 0) {
        blocks.push(current);
        current = "";
      }
    }

    if (char === "]" && depth === 0) break;
  }

  return blocks;
}

function loadAgents() {
  const source = fs.readFileSync(appDefaultsPath, "utf8");
  const agents = extractAgentBlocks(source)
    .map((block) => ({
      id: extractProperty(block, "id"),
      name: extractProperty(block, "name"),
      role: extractProperty(block, "role"),
      description: extractProperty(block, "description"),
      channels: extractChannels(block),
      memory: extractProperty(block, "memory"),
    }))
    .filter((agent) => agent.id && agent.name);

  if (!agents.length) {
    throw new Error("No se pudieron extraer agentes de src/data/appDefaults.ts");
  }

  return agents;
}

function scenarioFitsAgent(agent, scenario) {
  const haystack = [
    agent.name,
    agent.role,
    agent.description,
    agent.memory,
    ...(agent.channels || []),
  ].join(" ").toLowerCase();

  return scenario.channels.some((channel) =>
    haystack.includes(channel.toLowerCase()) ||
    (channel === "Bolsa de trabajo" && /indeed|computrabajo|occ|bolsa/.test(haystack)) ||
    (channel === "Meta Business" && /meta|facebook|messenger/.test(haystack)) ||
    (channel === "CRM" && /crm|seguimiento|principal|whatsapp/.test(haystack))
  );
}

function runAgentSimulation(agent, agentIndex) {
  const matchedScenarios = scenarios.filter((scenario) => scenarioFitsAgent(agent, scenario));
  const pool = matchedScenarios.length ? matchedScenarios : scenarios;
  const counts = {
    total: perAgent,
    passed: 0,
    policyChecks: 0,
    humanFlowChecks: 0,
    intentCoverage: {},
    channelCoverage: {},
  };
  const samples = [];

  for (let i = 0; i < perAgent; i += 1) {
    const seed = stableHash(`${agent.id}:${i}:${agentIndex}`);
    const scenario = pick(pool, seed);
    const context = {
      agentName: agent.name,
      vacancy: pick(vacancies, seed + 3),
      zone: pick(zones, seed + 7),
      candidateName: pick(names, seed + 11),
    };
    const channel = pick(agent.channels?.length ? agent.channels : scenario.channels, seed + 13);
    const userText = interpolate(scenario.user, context);
    const reply = interpolate(scenario.reply, context);
    const policySafe = scenario.id === "politica-empleo"
      ? /no puedo|criterios permitidos|funciones del puesto/i.test(reply.toLowerCase())
      : !/solo para mujeres jovenes/i.test(reply);
    const oneQuestionFlow = (reply.match(/\?/g) || []).length <= 1;
    const passed = policySafe && oneQuestionFlow && reply.length <= 700 && userText.length > 0;

    counts.passed += passed ? 1 : 0;
    counts.policyChecks += scenario.id.includes("politica") || scenario.id.includes("edad") ? 1 : 0;
    counts.humanFlowChecks += oneQuestionFlow ? 1 : 0;
    counts.intentCoverage[scenario.intent] = (counts.intentCoverage[scenario.intent] || 0) + 1;
    counts.channelCoverage[channel] = (counts.channelCoverage[channel] || 0) + 1;

    if (samples.length < 8) {
      samples.push({
        scenarioId: scenario.id,
        intent: scenario.intent,
        channel,
        userText,
        expectedReply: reply,
        passed,
      });
    }
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role,
    channels: agent.channels,
    matchedScenarioCount: pool.length,
    passRate: Number((counts.passed / perAgent).toFixed(4)),
    counts,
    samples,
  };
}

function buildMemoryRecords(agents) {
  const now = Date.now();
  const records = [];

  for (const agent of agents) {
    const matchedScenarios = scenarios.filter((scenario) => scenarioFitsAgent(agent, scenario));
    const pool = matchedScenarios.length ? matchedScenarios : scenarios;

    for (const scenario of pool) {
      const seed = stableHash(`${agent.id}:${scenario.id}`);
      const context = {
        agentName: agent.name,
        vacancy: pick(vacancies, seed + 3),
        zone: pick(zones, seed + 7),
        candidateName: pick(names, seed + 11),
      };
      const channel = pick(agent.channels?.length ? agent.channels : scenario.channels, seed + 13);
      const userText = interpolate(scenario.user, context);
      const reply = interpolate(scenario.reply, context);
      const agentId = normalizeAgentId(agent.id);

      records.push({
        id: `training-${agentId}-${scenario.id}`,
        companyId,
        agentId,
        agentName: agent.name,
        source: `simulation-training-${perAgent}`,
        channel,
        intent: scenario.intent,
        lesson: `Simulacion masiva (${perAgent} casos por agente): ${scenario.lesson}. Mantener tono humano, una pregunta por turno y no usar plantillas rigidas.`,
        userText,
        reply,
        fingerprint: `training:${agentId}:${scenario.id}`,
        uses: 4,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return records;
}

function writeTrainingConfig(run, records) {
  const body = `export type StaticAgentTrainingMemory = {
  id: string;
  companyId: string;
  agentId: string;
  agentName: string;
  source: string;
  channel?: string;
  intent: string;
  lesson: string;
  userText: string;
  reply: string;
  fingerprint: string;
  uses: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
};

export const AGENT_TRAINING_RUN = ${JSON.stringify(run, null, 2)} as const;

export const AGENT_TRAINING_MEMORIES: StaticAgentTrainingMemory[] = ${JSON.stringify(records, null, 2)};
`;

  fs.writeFileSync(trainingOutputPath, body, "utf8");
}

function writeReports(run, summaries) {
  ensureDir(docsDir);
  const report = {
    run,
    agents: summaries,
  };
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");

  const lines = [
    "# Agent Training Report",
    "",
    `Generated: ${run.generatedAt}`,
    `Version: ${run.version}`,
    `Agents: ${run.agentCount}`,
    `Simulations per agent: ${run.perAgent}`,
    `Total simulations: ${run.totalSimulations}`,
    `Static memory records: ${run.memoryRecords}`,
    "",
    "## Results",
    "",
    "| Agent | Simulations | Pass rate | Scenario coverage |",
    "| --- | ---: | ---: | ---: |",
    ...summaries.map((summary) =>
      `| ${summary.agentName.replace(/\|/g, " ")} | ${summary.counts.total} | ${(summary.passRate * 100).toFixed(2)}% | ${summary.matchedScenarioCount} |`
    ),
    "",
    "## Notes",
    "",
    "- This is operational training, not model-weight fine tuning.",
    "- Each agent received deterministic simulations for recruitment, channels, safety, follow-up, scheduling, content and escalation.",
    "- The generated static memories are loaded by the backend together with runtime memories.",
  ];

  fs.writeFileSync(reportMdPath, lines.join("\n"), "utf8");
}

const agents = loadAgents();
const summaries = agents.map((agent, index) => runAgentSimulation(agent, index));
const memoryRecords = buildMemoryRecords(agents);
const run = {
  generatedAt,
  perAgent,
  agentCount: agents.length,
  totalSimulations: agents.length * perAgent,
  memoryRecords: memoryRecords.length,
  version,
};

writeTrainingConfig(run, memoryRecords);
writeReports(run, summaries);

console.log(JSON.stringify({
  ok: true,
  ...run,
  reportJsonPath,
  reportMdPath,
}, null, 2));
