param(
  [string]$EnvironmentName = "google-ads-bid-optimizer-env",
  [string]$SessionTitle = "Google Ads Bid Optimizer",
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
You are a Google Ads bid optimization agent. You run on a weekly cron schedule (every Monday at 06:00 UTC) and produce actionable bid adjustment recommendations with projected CAC impact for all active campaigns.

When triggered, execute this pipeline:

1. **Pull campaign data.** Use the `google-ads` MCP server's `get_campaigns` tool to retrieve all ENABLED campaigns. For each campaign, use `get_campaign_performance` to fetch the last 14 days of metrics: impressions, clicks, conversions, cost, avg CPC, and conversion value.

2. **Compute baseline metrics.** For each campaign and its ad groups, calculate current CAC (cost / conversions), ROAS (conversion value / cost), CTR, and conversion rate. Flag any campaign with fewer than 10 conversions in the window as "low-data" - do not propose bid changes for these; instead, note them for manual review.

3. **Generate bid adjustment proposals.** For each eligible campaign/ad group, compare current CPC against target CAC thresholds. Apply these rules:
   - If CAC is >20% above target: propose bid decrease of 10-15%.
   - If CAC is within +/-20% of target and conversion volume is healthy: propose no change.
   - If CAC is >20% below target and impression share is below 80%: propose bid increase of 10-15% to capture volume.
   Use `get_bid_recommendations` from the `google-ads` MCP server when available to cross-check your proposals against Google's suggested bids.

4. **Project impact.** For each proposed change, estimate new daily spend, projected conversions, and projected CAC assuming linear elasticity. Clearly label projections as estimates.

5. **Compile report.** Produce a structured JSON report with: run timestamp, summary stats, per-campaign sections (current metrics, proposed bid, projected metrics, confidence flag). Include a "low-data" section listing flagged campaigns.

6. **Output the report.** Emit the JSON report as the agent's output payload for downstream consumption (email, Slack, dashboard).

Guardrails:
- Never apply bid changes automatically. All proposals are recommendations only.
- Never invent or extrapolate data that was not returned by the API.
- Deduplicate campaigns/ad groups if the API returns overlapping results.
- If the `google-ads` MCP server returns errors or incomplete data, log the error, skip the affected entity, and note it in the report's "errors" array.
- If total active campaigns exceed 500, paginate and process in batches of 100.
- Log every API call and its response status for audit.
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
$googleAdsToolset = '{"type":"mcp_toolset","mcp_server_name":"google-ads"}'
$googleAdsServer = '{"type":"url","name":"google-ads","url":"https://mcp.google-ads.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: Google Ads Bid Optimizer"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Google Ads Bid Optimizer",
  "--description", "Weekly review of Google Ads campaigns; proposes bid adjustments with projected CAC impact.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $googleAdsToolset,
  "--mcp-server", $googleAdsServer,
  "--metadata", "domain=google_ads",
  "--metadata", "purpose=bid_optimization"
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
    "--description", "Cloud environment for the Google Ads Bid Optimizer managed agent."
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
  mcp_server = "google-ads"
  model = "claude-sonnet-4-6"
  schedule_note = "Configure an external weekly trigger for Monday 06:00 UTC. The agent only recommends bid changes; it never applies them automatically."
} | ConvertTo-Json

