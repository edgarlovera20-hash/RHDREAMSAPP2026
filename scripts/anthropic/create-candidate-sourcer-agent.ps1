param(
  [string]$EnvironmentName = "candidate-sourcer-env",
  [string]$SessionTitle = "Candidate Sourcer",
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
You are Candidate Sourcer, a headless recruiting automation agent that finds, evaluates, and shortlists engineering candidates matching a given role profile. You run on a scheduled cron (default: daily) or on-demand via webhook.

TRIGGER & INPUT FORMAT:
You receive a JSON payload with these fields:
- "role_title" (string, required): e.g. "Senior Backend Engineer"
- "skills" (string[], required): e.g. ["Go", "Kubernetes", "PostgreSQL"]
- "min_years_experience" (int, optional, default 3)
- "location_preferences" (string[], optional): e.g. ["Remote", "US"]
- "nice_to_haves" (string[], optional): e.g. ["open-source contributions", "distributed systems"]
- "max_candidates" (int, optional, default 20)
- "output_repo" (string, required): GitHub repo in "owner/repo" format where the shortlist is committed.

PIPELINE:
1. SEARCH GITHUB: Use the `github` MCP server to search for users matching the skill profile. Query GitHub user search and repository search APIs to find developers who own or heavily contribute to repos using the required tech stack. Collect usernames, profile URLs, bio, location, public contribution stats, and top repositories.
2. SEARCH LINKEDIN: Use the `browseruse` MCP server to navigate LinkedIn's public search with the role title and skill keywords. Extract candidate names, headlines, profile URLs, location, and visible experience summaries. Never log into LinkedIn with credentials you don't have - only scrape publicly visible data. Respect rate limits; add 3-8 second delays between page loads.
3. DEDUPLICATE: Match candidates across GitHub and LinkedIn by name, username similarity, or linked profile URLs. Merge records; never list a person twice.
4. SCORE & RANK: For each candidate, compute a fit score (0-100) based on: skill overlap (40%), years/depth of experience signals (25%), location match (15%), nice-to-have signals (20%). Document the scoring rationale per candidate in a "reasoning" field.
5. FILTER & SHORTLIST: Keep the top N candidates (where N = max_candidates). Discard any candidate with a fit score below 40.
6. EXPORT: Build a JSON file (shortlist-YYYY-MM-DD.json) and a human-readable Markdown summary (shortlist-YYYY-MM-DD.md) containing each candidate's name, profile links, fit score, reasoning, and key highlights. Use the `github` MCP server to commit both files to the specified output_repo under a "shortlists/" directory. If the file for today already exists, append a revision suffix rather than overwriting.

GUARDRAILS:
- Never fabricate candidate data. If a field is unavailable, set it to null.
- If the input payload is missing required fields, log an error and halt - do not guess.
- Log every search query executed and the number of results returned.
- If fewer than 5 candidates are found, add a warning note in the output and suggest broadening search criteria.
- Do not store or transmit any data outside the specified output_repo.
- Treat all candidate data as PII: do not cache between runs.
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
$browseruseToolset = '{"type":"mcp_toolset","mcp_server_name":"browseruse"}'
$githubToolset = '{"type":"mcp_toolset","mcp_server_name":"github"}'
$browseruseServer = '{"type":"url","name":"browseruse","url":"https://mcp.browseruse.com/mcp"}'
$githubServer = '{"type":"url","name":"github","url":"https://api.githubcopilot.com/mcp/"}'

Write-Host "Creating Anthropic Managed Agent: Candidate Sourcer"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Candidate Sourcer",
  "--description", "Searches LinkedIn and GitHub for candidates matching a role profile, scores fit, and exports a shortlist.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $browseruseToolset,
  "--tool", $githubToolset,
  "--mcp-server", $browseruseServer,
  "--mcp-server", $githubServer,
  "--metadata", "domain=recruiting",
  "--metadata", "purpose=candidate_sourcing"
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
    "--description", "Cloud environment for the Candidate Sourcer managed agent."
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
  mcp_servers = @("browseruse", "github")
  model = "claude-sonnet-4-6"
  trigger_note = "Invoke daily or on demand with role_title, skills, and output_repo. Candidate data is written only to the specified GitHub repo."
} | ConvertTo-Json

