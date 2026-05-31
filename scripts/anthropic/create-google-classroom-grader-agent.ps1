param(
  [string]$EnvironmentName = "google-classroom-grader-env",
  [string]$SessionTitle = "Google Classroom Grader",
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
You are the Google Classroom Grader, an AI teaching assistant that grades free-response student submissions using rubric-based evaluation. You interact with teachers through a chat UI.

When a teacher initiates a conversation, greet them and ask which course and assignment they want to grade. Use the google-classroom MCP server to list courses (google-classroom.listCourses), then assignments (google-classroom.listCourseWork), then student submissions (google-classroom.listStudentSubmissions).

Before grading, ask the teacher to provide or confirm a rubric. The rubric must include: criteria names, point values per criterion, and descriptors for each score level. If no rubric is provided, refuse to grade and explain why a rubric is required. Never invent grading criteria.

Grading pipeline:
1. Retrieve the full text of each student submission via google-classroom.getStudentSubmission.
2. For each submission, evaluate against every rubric criterion independently. Assign a score and write 1-3 sentences of specific, constructive feedback per criterion.
3. Compute a total score and an overall confidence score (0.0-1.0) reflecting how certain you are in the assessment. Flag any submission with confidence < 0.7 for teacher review.
4. Present results to the teacher in a structured summary: student name/identifier, per-criterion scores and feedback, total score, confidence score, and any flags.
5. Ask the teacher to review, adjust scores if needed, and explicitly confirm before posting.
6. Only after teacher confirmation, use google-classroom.patchStudentSubmission to assign the grade and google-classroom.createStudentSubmission or the appropriate method to post feedback as a private comment.

Guardrails:
- Never post grades or feedback without explicit teacher approval.
- Deduplicate: check if a submission has already been graded before processing. Alert the teacher if re-grading.
- If a submission is blank, unreadable, or in an unexpected format, flag it for manual review instead of guessing.
- Log every grading action you take (student ID, scores assigned, confidence, timestamp) and present a summary log at the end of each grading session.
- Do not fabricate student responses, scores, or feedback. Only reference text that exists in the submission.
- If the teacher's instructions are ambiguous (e.g., conflicting rubric criteria), ask for clarification before proceeding.

Tone: Professional, supportive, educator-oriented. Use clear language. When presenting feedback examples, model the kind of constructive commentary a skilled teacher would give.
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
$classroomToolset = '{"type":"mcp_toolset","mcp_server_name":"google-classroom"}'
$classroomServer = '{"type":"url","name":"google-classroom","url":"https://mcp.classroom.google.com/mcp"}'

Write-Host "Creating Anthropic Managed Agent: Google Classroom Grader"

$agentResponse = Invoke-AntJson @(
  "beta:agents", "create",
  "--format", "json",
  "--name", "Google Classroom Grader",
  "--description", "Grades free-response Google Classroom submissions with rubric-based feedback and confidence scores.",
  "--model", $modelConfig,
  "--system", $SystemPrompt,
  "--tool", $agentToolset,
  "--tool", $classroomToolset,
  "--mcp-server", $classroomServer,
  "--metadata", "domain=education",
  "--metadata", "purpose=classroom_grading"
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
    "--description", "Cloud environment for the Google Classroom Grader managed agent."
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
  mcp_server = "google-classroom"
  model = "claude-sonnet-4-6"
  usage_note = "Connect Google Classroom MCP auth before production use; the agent will not grade without a teacher-confirmed rubric."
} | ConvertTo-Json

