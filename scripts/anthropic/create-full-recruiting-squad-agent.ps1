param(
  [string]$EnvironmentName = "full-recruiting-squad-env",
  [string]$SessionTitle = "Full Recruiting Squad",
  [switch]$SkipEnvironment,
  [switch]$SkipSession
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ant -ErrorAction SilentlyContinue)) {
  throw "Anthropic CLI 'ant' is not installed or not available in PATH."
}

if (-not $env:ANTHROPIC_API_KEY -and -not $env:ANTHROPIC_AUTH_TOKEN) {
  throw "Missing ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN. Set one before running this script."
}

$SystemPrompt = @'
You are the orchestrator of a multi-agent recruiting pipeline composed of three sub-agents: Sourcer, Screener, and Scheduler. You coordinate their work end-to-end, from a published job description to a scheduled on-site interview. You run headless, triggered by a webhook when a new role is opened in Greenhouse or on a daily cron to advance in-flight pipelines.

## Pipeline

1. **INTAKE**: When triggered, use `greenhouse.get_job` to fetch the full JD, required skills, location, and hiring manager. Parse these into a structured candidate profile spec (title, must-have skills, nice-to-haves, years of experience, location constraints). Log the spec.

2. **SOURCER PHASE**: Use `linkedin.search_people` with the profile spec to find up to 50 candidates per role. For each result, use `clay.enrich_person` to get verified work email, current company, tenure, and social signals. Deduplicate against `greenhouse.list_candidates` for this job to avoid contacting existing applicants. Store enriched candidates by calling `greenhouse.add_candidate` with source="sourcer-agent" and stage="Sourced".

3. **SCREENER PHASE**: For every candidate in the "Sourced" stage, evaluate fit by comparing enriched profile data against the profile spec. Score candidates 1-5 on must-haves and nice-to-haves. Candidates scoring >=4 advance to "Screen Passed"; update via `greenhouse.move_candidate_stage`. Candidates scoring <=2 are rejected with a logged reason. Scores of 3 are flagged for human review - add a note via `greenhouse.add_note` tagging the hiring manager and do NOT auto-advance.

4. **OUTREACH & SCHEDULER PHASE**: For each "Screen Passed" candidate, use `agentmail.send_email` to send a personalized outreach email referencing their background and the role. If a candidate replies positively (detected via `agentmail.list_inbox` on cron), use `greenhouse.get_interviewer_availability` and `greenhouse.create_interview` to propose and book an on-site. Send confirmation via `agentmail.send_email`. If no reply after 3 business days, send one follow-up. After two total emails with no reply, mark candidate "No Response" in Greenhouse.

## Guardrails
- Never fabricate candidate data; all data must originate from LinkedIn or Clay enrichment.
- Deduplicate by email AND LinkedIn URL before adding to Greenhouse.
- Never send more than 2 outreach emails per candidate per role.
- Log every action (source, screen score, email sent, interview booked) as a Greenhouse activity note.
- If the JD is missing must-have skills or the hiring manager is unset, halt the pipeline and notify via `agentmail.send_email` to a configured ops address.
- Rate-limit LinkedIn searches to a max of 5 searches per hour to respect API limits.
- All emails must include an opt-out/unsubscribe line.
'@

function Get-ResponseId {
  param([Parameter(Mandatory = $true)] [object]$Response)

  if ($Response.id) { return $Response.id }
  if ($Response.agent.id) { return $Response.agent.id }
  if ($Response.environment.id) { return $Response.environment.id }
  if ($Response.session.id) { return $Response.session.id }
  if ($Response.data.id) { return $Response.data.id }

  return $null
}

function Invoke-AntJson {
  param([Parameter(Mandatory = $true)] [string[]]$Arguments)

  $output = & ant @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($output | Out-String)
  }

  return ($output | Out-String | ConvertFrom-Json)
}

$modelConfig = '{"id":"claude-sonnet-4-6"}'
$agentToolset = '{"type":"agent_toolset_20260401"}'
$greenhouseToolset = '{"type":"mcp_toolset","mcp_server_name":"greenhouse"}'
$linkedinToolset = '{"type":"mcp_toolset","mcp_server_name":"linkedin"}'
$clayToolset = '{"type":"mcp_toolset","mcp_server_name":"clay"}'
$agentmailToolset = '{"type":"mcp_toolset","mcp_server_name":"agentmail"}'
$greenhouseServer = '{"type":"url","name":"greenhouse","url":"https://mcp.greenhouse.io/mcp"}'
$linkedinServer = '{"type":"url","name":"linkedin","url":"https://mcp.linkedin.com/mcp"}'
$clayServer = '{"type":"url","name":"clay","url":"https://api.clay.com/v3/mcp"}'
$agentmailServer = '{"type":"url","name":"agentmail","url":"https://mcp.agentmail.to/mcp"}'

Write-Host "Creating Anthropic Managed Agent: Full Recruiting Squad (Multi-agent)"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Full Recruiting Squad (Multi-agent)",
  "--description", "Sourcer, screener, and scheduler agents collaborate to fill a role from JD to scheduled on-site.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $greenhouseToolset,
  "--tool", $linkedinToolset,
  "--tool", $clayToolset,
  "--tool", $agentmailToolset,
  "--mcp-server", $greenhouseServer,
  "--mcp-server", $linkedinServer,
  "--mcp-server", $clayServer,
  "--mcp-server", $agentmailServer,
  "--metadata", "domain=recruiting",
  "--metadata", "purpose=multi_agent_pipeline"
)

$agentId = Get-ResponseId $agentResponse
if (-not $agentId) {
  throw "Agent was created but no agent ID could be found in the CLI response: $($agentResponse | ConvertTo-Json -Depth 20)"
}

Write-Host "Agent created: $agentId"

$environmentId = $null
$sessionId = $null

if (-not $SkipEnvironment) {
  Write-Host "Creating cloud environment: $EnvironmentName"
  $environmentConfig = '{"type":"cloud","networking":{"type":"unrestricted"}}'
  $environmentResponse = Invoke-AntJson @(
    "beta:environments", "create",
    "--format", "json",
    "--name", $EnvironmentName,
    "--config", $environmentConfig,
    "--description", "Cloud environment for the Full Recruiting Squad managed agent."
  )

  $environmentId = Get-ResponseId $environmentResponse
  if (-not $environmentId) {
    throw "Environment was created but no environment ID could be found in the CLI response: $($environmentResponse | ConvertTo-Json -Depth 20)"
  }

  Write-Host "Environment created: $environmentId"
}

if (-not $SkipSession -and $environmentId) {
  Write-Host "Starting session: $SessionTitle"
  $sessionResponse = Invoke-AntJson @(
    "beta:sessions", "create",
    "--format", "json",
    "--agent", $agentId,
    "--environment-id", $environmentId,
    "--title", $SessionTitle
  )

  $sessionId = Get-ResponseId $sessionResponse
  if (-not $sessionId) {
    throw "Session was created but no session ID could be found in the CLI response: $($sessionResponse | ConvertTo-Json -Depth 20)"
  }

  Write-Host "Session created: $sessionId"
}

[pscustomobject]@{
  agent_id = $agentId
  environment_id = $environmentId
  session_id = $sessionId
  mcp_servers = @("greenhouse", "linkedin", "clay", "agentmail")
  model = "claude-sonnet-4-6"
  trigger_note = "Invoke from a Greenhouse new-role webhook or a daily cron with job ID and ops email configuration."
} | ConvertTo-Json

