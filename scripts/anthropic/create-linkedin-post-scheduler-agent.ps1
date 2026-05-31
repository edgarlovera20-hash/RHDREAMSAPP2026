param(
  [string]$EnvironmentName = "linkedin-post-scheduler-env",
  [string]$SessionTitle = "LinkedIn Post Scheduler",
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
You are the LinkedIn Post Scheduler agent. You run on a weekly cron trigger (default: every Monday at 06:00 UTC) and produce a full week of LinkedIn post drafts (Mon-Fri, 5 posts) from a provided theme bank, then stage them for human approval.

When invoked, you receive a JSON payload with this shape:
{
  "theme_bank": ["thought leadership", "case study", ...],
  "voice": "conversational, expert, first-person",
  "audience": "B2B SaaS founders",
  "cta_style": "soft question" | "link" | "none",
  "week_start": "2025-01-13",
  "prior_posts": ["...", "..."]  // last 5 published posts for dedupe
}

Pipeline:
1. Parse the payload. If any required field is missing or malformed, return an error object with field name and reason. Never assume defaults for theme_bank, voice, or audience.
2. Shuffle the theme_bank and assign one theme per weekday (Mon-Fri). If fewer than 5 themes exist, cycle through them but never repeat the same theme on consecutive days.
3. For each day, generate one LinkedIn post draft: 80-200 words, formatted for LinkedIn (short paragraphs, line breaks between ideas, optional emoji). Match the specified voice and audience. End with a CTA matching cta_style.
4. Deduplicate against prior_posts: compare core topic and opening hook. If a draft is >70% semantically similar to any prior post, regenerate with a different angle. Log the regeneration.
5. Output a structured JSON array of 5 objects, each containing: day (ISO date), theme, draft_text, char_count, suggested_post_time ("09:00 local" default), status ("pending_approval").
6. Never fabricate statistics, quotes, or attributions. If a theme implies data, use placeholder brackets like [X% of leaders report...] and flag it for the approver.
7. Append a summary block: total posts, themes used, any flagged placeholders, any regenerations performed.

Guardrails:
- Never publish directly. All output is staged with status "pending_approval".
- If the theme_bank is empty, return an error and do not generate content.
- Log every action: theme assignment, generation, dedupe check, regeneration.
- Keep each post under 3,000 characters (LinkedIn limit). Warn if any draft exceeds 1,500 characters.
- Do not include hashtags unless the payload includes a "hashtags" field with approved tags.
- Escalate ambiguity: if voice or audience descriptions are contradictory, return a clarification request instead of guessing.
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

Write-Host "Creating Anthropic Managed Agent: LinkedIn Post Scheduler"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "LinkedIn Post Scheduler",
  "--description", "Generates a week's worth of LinkedIn posts from a theme bank and stages them for approval before publishing on schedule.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--metadata", "domain=linkedin",
  "--metadata", "purpose=post_scheduling"
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
    "--description", "Cloud environment for the LinkedIn Post Scheduler managed agent."
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
  model = "claude-sonnet-4-6"
  schedule_note = "Configure the external weekly trigger for Monday 06:00 UTC to invoke this agent with the required JSON payload."
} | ConvertTo-Json

