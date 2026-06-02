const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AutomationStep = {
  order: number;
  type: string;
  agent: string;
  channel: string;
  waitMinutes: number;
  requiresApproval: boolean;
  output: string;
  prompt: string;
  successCriteria: string;
};

type AutomationPayload = {
  workflowId: string;
  name: string;
  channel: string;
  trigger: {
    event: string;
    source: string;
    schedule: string;
    debounceMinutes: number;
    runWindow: string;
  };
  autonomous: boolean;
  approvalMode: string;
  variables: Record<string, { value: string; type: string; source: string; required: boolean }>;
  steps: AutomationStep[];
};

type StepResult = {
  order: number;
  type: string;
  channel: string;
  output: string;
  status: "completed" | "approval_required" | "skipped";
  summary: string;
};

async function validateRequiredVariables(payload: AutomationPayload) {
  "use step";
  console.log(`[workflow] Validating variables for ${payload.workflowId}`);

  const missing = Object.entries(payload.variables)
    .filter(([, variable]) => variable.required && !String(variable.value || "").trim())
    .map(([key]) => key);

  return {
    ok: missing.length === 0,
    missing,
  };
}

async function executeAutomationStep(step: AutomationStep, payload: AutomationPayload): Promise<StepResult> {
  "use step";
  console.log(`[workflow] Running step ${step.order}: ${step.type} via ${step.channel}`);

  const needsHumanApproval =
    step.requiresApproval ||
    payload.approvalMode === "Aprobar antes de enviar" ||
    (payload.approvalMode === "Solo escalar excepciones" && step.type === "handoff");

  return {
    order: step.order,
    type: step.type,
    channel: step.channel,
    output: step.output,
    status: needsHumanApproval ? "approval_required" : "completed",
    summary: needsHumanApproval
      ? `Paso preparado para aprobacion: ${step.prompt.slice(0, 180)}`
      : `Paso ejecutado: ${step.prompt.slice(0, 180)}`,
  };
}

export async function recruitmentAutomationWorkflow(payload: AutomationPayload) {
  "use workflow";
  console.log(`[workflow] Starting ${payload.name}`);

  const validation = await validateRequiredVariables(payload);
  if (!validation.ok) {
    return {
      workflowId: payload.workflowId,
      status: "blocked",
      missingVariables: validation.missing,
      results: [],
    };
  }

  if (payload.trigger.debounceMinutes > 0) {
    await sleep(payload.trigger.debounceMinutes * 60 * 1000);
  }

  const results: StepResult[] = [];
  for (const step of payload.steps) {
    if (step.waitMinutes > 0) {
      await sleep(step.waitMinutes * 60 * 1000);
    }
    results.push(await executeAutomationStep(step, payload));
  }

  return {
    workflowId: payload.workflowId,
    status: "completed",
    results,
  };
}
