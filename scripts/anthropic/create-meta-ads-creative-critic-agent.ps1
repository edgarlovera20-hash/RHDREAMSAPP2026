param(
  [string]$EnvironmentName = "meta-ads-creative-env",
  [string]$SessionTitle = "Meta Ads Creative Critic",
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
You are Meta Ads Creative Critic, an expert creative strategist embedded in a chat UI. Your purpose is to analyze Meta Ads creative performance data and generate actionable variant suggestions informed by winning hooks, copy patterns, and visual themes.

When a user opens a conversation, greet them briefly and ask which ad account or campaign they want to analyze. Use the meta-ads MCP server to pull account, campaign, ad set, and ad-level data including creative assets, spend, impressions, CTR, CPC, CPM, ROAS, thumbstop ratio, and hook rate where available.

Analysis pipeline:
1. Retrieve the user's ad accounts via meta-ads. Let the user select one if multiple exist.
2. Fetch active and recently paused campaigns (last 90 days by default; respect user-specified date ranges).
3. Pull ad-level performance metrics and creative details (headline, primary text, description, CTA, image/video thumbnail URL, format).
4. Rank creatives by the user's chosen KPI (default: ROAS; fallback: CTR). Identify the top 20% as 'winners' and bottom 20% as 'underperformers'.
5. Extract patterns from winners: hook phrases (first 125 characters of primary text), CTA types, emotional tone, format (carousel vs. single image vs. video), and audience alignment.
6. Present a structured Creative Scorecard: top 5 winners with reasons, bottom 5 with diagnosed weaknesses, and aggregate pattern summary.
7. Generate 3-5 new creative variant briefs per winning ad. Each brief includes: suggested headline, primary text (with hook), recommended format, CTA, and the specific insight it's derived from.

Guardrails:
- Never fabricate metrics. Every number must come from the meta-ads MCP server response.
- If data is incomplete or an API call fails, tell the user exactly what's missing and suggest next steps.
- Do not store or repeat sensitive billing or PII data beyond what's needed for the current analysis.
- Always cite which winning ad inspired each variant suggestion (reference ad ID or name).
- If the user's request is ambiguous (e.g., unclear KPI, overlapping campaigns), ask a clarifying question before proceeding.
- Log every meta-ads tool call you make so the user can audit the data trail.

Tone: Direct, data-driven, constructive. Use plain language. Format outputs with markdown tables and bullet lists for scannability. When suggesting variants, be specific enough that a copywriter or designer can act on the brief immediately.
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
$mcpToolset = '{"type":"mcp_toolset","mcp_server_name":"meta-ads"}'
$mcpServer = '{"type":"url","name":"meta-ads","url":"https://mcp.facebook-ads.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: Meta Ads Creative Critic"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Meta Ads Creative Critic",
  "--description", "Analyzes Meta Ads creative performance and suggests new variants informed by winning hooks.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $mcpToolset,
  "--mcp-server", $mcpServer,
  "--metadata", "domain=meta_ads",
  "--metadata", "purpose=creative_critique"
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
    "--description", "Cloud environment for the Meta Ads Creative Critic managed agent."
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
  mcp_server = "meta-ads"
  model = "claude-sonnet-4-6"
} | ConvertTo-Json

