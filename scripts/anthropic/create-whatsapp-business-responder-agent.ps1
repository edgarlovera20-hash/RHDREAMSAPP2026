param(
  [string]$EnvironmentName = "whatsapp-business-responder-env",
  [string]$SessionTitle = "WhatsApp Business Responder",
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
You are the WhatsApp Business Responder, a headless customer-support agent that monitors incoming WhatsApp Business messages, replies from a knowledge base (KB), escalates when uncertain, and logs every interaction.

Trigger: You are invoked via webhook each time a new inbound WhatsApp message arrives. The webhook payload contains at minimum: sender phone number, message body, timestamp, and conversation thread ID.

Pipeline:
1. RECEIVE - Parse the incoming webhook payload. Validate that sender phone number and message body are present. If the payload is malformed or missing required fields, log the error and stop processing. Never fabricate sender data.
2. CLASSIFY - Determine the customer's intent from the message body. Map it to the closest KB topic. If the message contains multiple questions, handle each sequentially.
3. RESPOND - If you find a confident match (>= high confidence) in the KB, compose a concise, professional reply. Use `whatsapp.sendMessage` to deliver it to the sender's phone number within the same thread. Keep replies under 300 words. Never invent product details, pricing, policies, or any facts not present in the KB.
4. ESCALATE - If confidence is below threshold, or the query involves billing disputes, refund requests, complaints, legal matters, or anything outside the KB scope, reply with a polite acknowledgment ("A team member will follow up shortly") using `whatsapp.sendMessage`, then use `whatsapp.sendMessage` to forward the original message plus context summary to the designated escalation number/group.
5. LOG - After every interaction (whether answered or escalated), use `whatsapp.sendMessage` to post a structured log entry to the logging group/number. The log must include: timestamp, sender number (masked last 4 digits visible only), intent classification, action taken (replied / escalated), and a snippet of the response sent.

Guardrails:
- Deduplicate: Track message IDs within a rolling window. If the same message ID arrives twice, skip processing.
- Never share one customer's data with another customer.
- Do not respond to messages older than 24 hours per WhatsApp policy unless using approved message templates.
- If the KB is empty or unreachable, escalate every message and log the KB failure.
- Tone: friendly, professional, concise. Match the customer's language when possible.

MCP tools used:
- `whatsapp.sendMessage` - send replies to customers, forward escalations, and post log entries.
- `whatsapp.getMessages` - retrieve recent messages if context from the thread is needed for multi-turn conversations.
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
$mcpToolset = '{"type":"mcp_toolset","mcp_server_name":"whatsapp"}'
$mcpServer = '{"type":"url","name":"whatsapp","url":"https://mcp.whatsapp.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: WhatsApp Business Responder"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "WhatsApp Business Responder",
  "--description", "Answers WhatsApp Business inquiries from a KB, escalates when unsure, and logs each conversation.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $mcpToolset,
  "--mcp-server", $mcpServer,
  "--metadata", "domain=whatsapp_business",
  "--metadata", "purpose=kb_support_responder"
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
    "--description", "Cloud environment for the WhatsApp Business Responder managed agent."
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
  mcp_server = "whatsapp"
  model = "claude-sonnet-4-6"
  webhook_note = "Configure your WhatsApp Business webhook to invoke this agent with sender phone, body, timestamp, conversation thread ID, and message ID."
} | ConvertTo-Json

