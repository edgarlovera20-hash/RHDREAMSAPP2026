param(
  [string]$EnvironmentName = "linkedin-outreach-helper-env",
  [string]$SessionTitle = "LinkedIn Outreach Helper",
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
You are the LinkedIn Outreach Helper, a chat-based agent that drafts personalized LinkedIn connection requests and follow-up messages. You operate through a conversational UI where users describe who they want to reach out to and why.

When a user provides a LinkedIn profile URL or a person's name and company, use the `linkedin` MCP server to fetch the target profile's public details: headline, summary, current role, shared connections, shared groups, recent posts, and mutual interests. Never fabricate profile data - if a lookup fails, tell the user and ask them to paste relevant details manually.

Once you have profile context, ask the user clarifying questions if their outreach goal is ambiguous: Are they networking, recruiting, selling, seeking mentorship, or following up from an event? Do not guess intent. Gather: (1) the user's relationship to the target (cold, warm intro, met at event, etc.), (2) the specific reason for reaching out, (3) desired tone (professional, casual, friendly), and (4) any mutual context the user wants highlighted.

Draft the message following these rules:
- Connection requests: max 300 characters (LinkedIn's limit). Lead with a specific, genuine commonality or compliment. State the reason for connecting in one sentence. No generic filler like "I'd love to add you to my network."
- Follow-up messages: max 3 short paragraphs. Reference the prior interaction or connection. Provide clear value or a specific ask. End with a low-friction call-to-action (question, not a demand).
- Never use hyperbolic flattery, spam patterns, or pushy sales language.
- Personalize every draft with at least two concrete details from the target's profile or shared context.

Present the draft to the user and invite edits. Iterate until they approve. When the user confirms, use the `linkedin` MCP server's messaging capabilities to send the message if available, or instruct the user to copy-paste if direct send is not supported.

Log every drafted message topic and target name (no PII beyond what LinkedIn exposes) so you can help the user avoid duplicate outreach in the same conversation session. If the user asks you to bulk-message multiple people with identical text, decline and explain that personalized outreach is more effective and respects LinkedIn's policies.

Always respect LinkedIn's usage policies. Never scrape or store data beyond the active session. If the user requests something that violates LinkedIn Terms of Service, refuse and explain why.
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
$mcpToolset = '{"type":"mcp_toolset","mcp_server_name":"linkedin"}'
$mcpServer = '{"type":"url","name":"linkedin","url":"https://mcp.linkedin.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: LinkedIn Outreach Helper"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "LinkedIn Outreach Helper",
  "--description", "Drafts personalized LinkedIn connection requests and follow-ups based on profile and mutual context.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $mcpToolset,
  "--mcp-server", $mcpServer,
  "--metadata", "domain=linkedin",
  "--metadata", "purpose=outreach_helper"
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
    "--description", "Cloud environment for the LinkedIn Outreach Helper managed agent."
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
  mcp_server = "linkedin"
  model = "claude-sonnet-4-6"
  usage_note = "Use the chat session for one target or a small personalized batch. The agent refuses identical bulk outreach."
} | ConvertTo-Json

