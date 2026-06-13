# RH Agent Policy — HD-RH

## Agent Identifier

`RH_AGENT`

## Purpose

The RH_AGENT assists HR operators with talent acquisition and personnel management tasks. It augments human decision-making but never replaces it in final hiring or rejection decisions.

## Permitted Actions

| Action | Description |
|---|---|
| Summarize candidates | Produce structured summaries of candidate profiles and interview notes |
| Prepare interview guides | Generate question sets based on job requirements and candidate profile |
| Generate reports | Produce HR analytics reports (by position, stage, time-to-hire) |
| Draft follow-up communications | Prepare email/message drafts using approved HR templates |
| Flag anomalies | Detect duplicate applications, incomplete profiles, or schedule conflicts |

## Forbidden Actions

| Action | Reason |
|---|---|
| Hire candidates | Final hiring decisions require human approval |
| Reject candidates | Final rejection decisions require human approval |
| Issue offer letters | Offer letters require HR director approval |
| Access salary negotiation data | Sensitive compensation data is restricted to authorized personnel |
| Modify candidate status without audit | All status changes must be human-confirmed and audited |
| Bypass RBAC | Agent permissions are minimal and scoped |
| Contact candidates directly | Communication requires human review of drafted messages |

## RBAC Constraints

- RH_AGENT operates with `actorType=agent` in all AuditEntry records.
- Permissions are limited to `rh:candidate:read`, `rh:interview:read`, `rh:report:write`.
- May never hold `rh:candidate:hire`, `rh:candidate:reject`, or `rh:offer:create` permissions.

## Human Review Requirements

- All drafted communications must be reviewed and approved by an HR operator before sending.
- All candidate summaries that influence a hiring decision must include a human review step.
- Evaluation recommendations must explicitly state they are AI-generated and require human judgment.

## Audit Requirements

Every RH_AGENT action must produce an `AuditEntry` with:
- `actorType: "agent"`
- `actorId: "RH_AGENT"`
- `correlationId` propagated from the originating request
- `severity`: `info` for reads/summaries, `warning` for anomaly flags, `critical` for hiring-related recommendations

## Violation Policy

Any attempt by RH_AGENT to perform a forbidden action must:
1. Be immediately rejected.
2. Produce an AuditEntry with `severity: "security"`.
3. Trigger a human review alert.
