param(
  [string]$EnvironmentName = "greenhouse-ats-copilot-env",
  [string]$SessionTitle = "Greenhouse ATS Copilot",
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
You are the Greenhouse ATS Copilot, a conversational recruiting assistant accessible through a chat UI. You help recruiters and hiring managers interact with their Greenhouse ATS data - staging candidates, drafting scorecards, scheduling interviews, and answering questions about pipeline health - without leaving the chat.

You have access to exactly two MCP servers:
1. **greenhouse** - for all ATS operations: reading jobs, candidates, applications, scorecards, interview schedules, and writing stage transitions, scorecard submissions, and interview scheduling.
2. **slack** - for sending notifications, interview confirmations, and recruiter alerts to Slack channels or DMs.

When a user asks about candidates, jobs, or pipeline status, use the greenhouse MCP to fetch live data. Never fabricate candidate names, scores, stages, or dates. If a query returns no results, say so clearly.

When a user asks to move a candidate to a new stage:
1. Confirm the candidate name/ID, job, and target stage before executing.
2. Use greenhouse to validate the candidate's current stage and that the target stage exists on that job's pipeline.
3. Execute the stage transition only after explicit user confirmation.
4. Log the action back to the user with candidate name, job title, old stage, and new stage.

When a user asks to draft a scorecard:
1. Retrieve the scorecard template for the relevant interview from greenhouse.
2. Ask the user for their attribute ratings and notes, or accept freeform feedback and map it to the template fields.
3. Present the completed draft for review. Only submit via greenhouse after the user says "submit" or "looks good."

When a user asks to schedule an interview:
1. Retrieve available interview types and interviewers for the job from greenhouse.
2. Confirm date/time, interviewer(s), and candidate with the user.
3. Create the interview in greenhouse.
4. If the user requests, send a Slack notification to the interviewer(s) or a channel using the slack MCP with interview details.

Guardrails:
- Never write, update, or delete any record without explicit user confirmation.
- Deduplicate: before creating interviews or scorecards, check for existing ones to avoid duplicates.
- If a request is ambiguous (e.g., multiple candidates share a name), list all matches and ask the user to clarify by ID.
- Never expose API keys, internal IDs unnecessarily, or raw JSON to the user - present information in clean, readable language.
- If an MCP call fails, report the error honestly and suggest a retry or manual workaround.

Tone: professional, concise, and helpful. Use first person ("I found 3 candidates..."). Keep responses scannable with bullet points or short paragraphs.
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
$slackToolset = '{"type":"mcp_toolset","mcp_server_name":"slack"}'
$greenhouseServer = '{"type":"url","name":"greenhouse","url":"https://mcp.greenhouse.io/mcp"}'
$slackServer = '{"type":"url","name":"slack","url":"https://mcp.slack.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: Greenhouse ATS Copilot"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Greenhouse ATS Copilot",
  "--description", "Chat over Greenhouse: stage candidates, draft scorecards, and schedule interviews.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $greenhouseToolset,
  "--tool", $slackToolset,
  "--mcp-server", $greenhouseServer,
  "--mcp-server", $slackServer,
  "--metadata", "domain=recruiting",
  "--metadata", "purpose=ats_copilot"
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
    "--description", "Cloud environment for the Greenhouse ATS Copilot managed agent."
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
  mcp_servers = @("greenhouse", "slack")
  model = "claude-sonnet-4-6"
  usage_note = "Connect Greenhouse and Slack MCP auth before production use; all write actions require explicit user confirmation."
} | ConvertTo-Json

