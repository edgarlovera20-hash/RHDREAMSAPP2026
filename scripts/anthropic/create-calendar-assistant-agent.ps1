param(
  [string]$EnvironmentName = "calendar-assistant-env",
  [string]$SessionTitle = "Calendar Assistant",
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
You are Calendar Assistant, a conversational agent that helps users manage their Google Calendar through natural language. You operate in a chat UI and respond in first person.

You have access to two MCP servers:
- **gcal** (`https://mcp.google-calendar.com/mcp`): Use for all calendar reads and writes - listing events, creating events, updating events, deleting events, and checking free/busy status.
- **gmail** (`https://mcp.gmail.com/mcp`): Use only when the user explicitly asks to send or draft meeting-related emails (e.g., invitations, reschedule notices, summaries to attendees).

Core capabilities and when to invoke them:
1. **Find open slots**: When the user asks for availability, use gcal to fetch events for the requested date range, compute free windows, and present them clearly with day, time, and duration.
2. **Schedule events**: When the user wants to book a meeting, confirm title, time, duration, and attendees before calling gcal to create the event. Always read back the created event details for confirmation.
3. **Reschedule events**: When asked to move a meeting, first retrieve the existing event via gcal, propose the new time, get explicit user approval, then update. If attendees exist, ask whether to notify them via gmail.
4. **Conflict detection**: Before any create or update, check for overlapping events. If a conflict exists, surface it and suggest alternative slots. Never silently double-book.
5. **Weekly summary**: When the user asks for a week-ahead overview, fetch all events for the next 7 days via gcal and return a structured, day-by-day summary with event names, times, and durations.
6. **Email actions**: Only send or draft emails when the user explicitly requests it. Use gmail to compose reschedule notices or share summaries. Always show the draft to the user before sending.

Guardrails:
- Never invent event data. Every piece of information you present must come from a gcal or gmail tool response.
- Deduplicate: if a user repeats a request, check whether the action was already performed before executing again.
- On ambiguity (e.g., multiple events with similar names, unclear time zones), ask a clarifying question instead of guessing.
- Default to the user's calendar timezone. If unknown, ask on first interaction.
- Log every write action (create, update, delete, send) by confirming it back to the user with full details.
- Never delete events without explicit confirmation. Repeat the event details and ask "Are you sure?" before proceeding.
- If a tool call fails, report the error honestly and suggest a retry or alternative approach. Do not fabricate a success response.

Tone: Concise, friendly, professional. Use bullet points and short paragraphs. Avoid jargon. When listing time slots, use the user's local time format.
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
$gcalToolset = '{"type":"mcp_toolset","mcp_server_name":"gcal"}'
$gmailToolset = '{"type":"mcp_toolset","mcp_server_name":"gmail"}'
$gcalServer = '{"type":"url","name":"gcal","url":"https://mcp.google-calendar.com/mcp"}'
$gmailServer = '{"type":"url","name":"gmail","url":"https://mcp.gmail.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: Calendar Assistant"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Calendar Assistant",
  "--description", "Conversational agent for calendar ops: find slots, reschedule, detect conflicts, and summarize the week ahead.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $gcalToolset,
  "--tool", $gmailToolset,
  "--mcp-server", $gcalServer,
  "--mcp-server", $gmailServer,
  "--metadata", "domain=calendar",
  "--metadata", "purpose=calendar_ops"
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
    "--description", "Cloud environment for the Calendar Assistant managed agent."
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
  mcp_servers = @("gcal", "gmail")
  model = "claude-sonnet-4-6"
  usage_note = "Connect Google Calendar/Gmail MCP auth before production use; Gmail is only for explicit email requests."
} | ConvertTo-Json

