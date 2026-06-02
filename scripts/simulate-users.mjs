#!/usr/bin/env node

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const [key, inlineValue] = arg.slice(2).split("=");
  const value = inlineValue ?? process.argv[index + 1];
  args.set(key, value);
  if (inlineValue === undefined) index += 1;
}

const baseUrl = String(args.get("base") || process.env.SIM_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const users = Number(args.get("users") || process.env.SIM_USERS || 200);
const concurrency = Number(args.get("concurrency") || process.env.SIM_CONCURRENCY || 25);
const thinkMinMs = Number(args.get("think-min-ms") || 20);
const thinkMaxMs = Number(args.get("think-max-ms") || 120);
const timeoutMs = Number(args.get("timeout-ms") || 10000);

const personas = [
  "recruiter",
  "manager",
  "coordinator",
  "analyst",
  "director",
  "sourcer",
  "scheduler",
  "report-viewer",
];

const userFlows = [
  {
    name: "dashboard-reader",
    steps: [
      ["GET", "/"],
      ["GET", "/health"],
      ["GET", "/api/integrations/catalog"],
      ["GET", "/api/gemini/health"],
      ["GET", "/api/integrations/baileys/status/default"],
    ],
  },
  {
    name: "integration-checker",
    steps: [
      ["GET", "/"],
      ["GET", "/api/integrations/catalog"],
      ["POST", "/api/integrations/test", { provider: "computrabajo", config: {} }],
      ["GET", "/api/groq/health"],
      ["GET", "/api/openrouter/health"],
    ],
  },
  {
    name: "whatsapp-operator",
    steps: [
      ["GET", "/"],
      ["GET", "/api/integrations/baileys/status/default"],
      ["GET", "/api/integrations/catalog"],
      ["GET", "/health"],
    ],
  },
  {
    name: "reports-viewer",
    steps: [
      ["GET", "/"],
      ["GET", "/reports"],
      ["GET", "/health"],
      ["GET", "/api/gemini/health"],
    ],
  },
];

const results = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function virtualIp(userId) {
  const second = Math.floor(userId / 254) % 254;
  const third = userId % 254;
  return `10.200.${second}.${third + 1}`;
}

async function timedFetch(user, method, path, body) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Accept": "application/json,text/html,*/*",
        "Content-Type": "application/json",
        "User-Agent": `rhdreams-sim/${user.id} ${user.persona}`,
        "X-Forwarded-For": user.ip,
        "X-Simulation-User": user.id,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const durationMs = Math.round(performance.now() - startedAt);
    await response.arrayBuffer();
    results.push({
      userId: user.id,
      persona: user.persona,
      flow: user.flow.name,
      method,
      path,
      status: response.status,
      ok: response.ok,
      durationMs,
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    results.push({
      userId: user.id,
      persona: user.persona,
      flow: user.flow.name,
      method,
      path,
      status: "ERR",
      ok: false,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runUser(userId) {
  const user = {
    id: `vu-${String(userId).padStart(3, "0")}`,
    persona: personas[userId % personas.length],
    flow: userFlows[userId % userFlows.length],
    ip: virtualIp(userId),
  };

  for (const [method, path, body] of user.flow.steps) {
    await timedFetch(user, method, path, body);
    await sleep(randomBetween(thinkMinMs, thinkMaxMs));
  }
}

async function runPool() {
  let nextUser = 0;
  const workers = Array.from({ length: Math.min(concurrency, users) }, async () => {
    while (nextUser < users) {
      const userId = nextUser;
      nextUser += 1;
      await runUser(userId);
    }
  });

  await Promise.all(workers);
}

const startedAt = performance.now();
console.log(`Starting simulation: ${users} virtual users, concurrency ${concurrency}, target ${baseUrl}`);
await runPool();
const totalDurationMs = Math.round(performance.now() - startedAt);

const latencies = results.map((item) => item.durationMs);
const failures = results.filter((item) => !item.ok);
const statusCounts = results.reduce((acc, item) => {
  const status = String(item.status);
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});
const pathCounts = results.reduce((acc, item) => {
  const key = `${item.method} ${item.path} ${item.status}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const summary = {
  target: baseUrl,
  virtualUsers: users,
  concurrency,
  totalRequests: results.length,
  failedRequests: failures.length,
  failureRate: Number((failures.length / Math.max(results.length, 1)).toFixed(4)),
  durationMs: totalDurationMs,
  requestsPerSecond: Number((results.length / (totalDurationMs / 1000)).toFixed(2)),
  latencyMs: {
    min: Math.min(...latencies),
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    max: Math.max(...latencies),
  },
  statusCounts,
  slowest: [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10),
  failures: failures.slice(0, 20),
  pathCounts,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
