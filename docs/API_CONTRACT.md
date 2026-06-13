# API Contract — HD-RH

## Overview

This document defines the expected API surface for HD-RH (Human Resources platform).

## Base URL

```
https://api.hd-rh.internal/v1
```

## Authentication

- All endpoints require a valid JWT issued by HD-CORE identity service.
- RBAC permissions defined in `HD-CORE/packages/contracts/src/rbac.ts`.

## Resources

### Vacancies

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | /vacancies | `rh:vacancy:read` | List vacancies |
| POST | /vacancies | `rh:vacancy:create` | Publish a new vacancy |
| PATCH | /vacancies/:id | `rh:vacancy:update` | Update vacancy |
| DELETE | /vacancies/:id | `rh:vacancy:delete` | Close vacancy |

### Candidates

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | /candidates | `rh:candidate:read` | List candidates |
| GET | /candidates/:id | `rh:candidate:read` | Get candidate detail |
| POST | /candidates | `rh:candidate:create` | Register a candidate |
| PATCH | /candidates/:id/status | `rh:candidate:update` | Change candidate status (human only) |

### Interviews

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | /interviews | `rh:interview:read` | List interviews |
| POST | /interviews | `rh:interview:create` | Schedule an interview |
| PATCH | /interviews/:id/result | `rh:interview:update` | Record interview result |

### Reports

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | /reports/pipeline | `rh:report:read` | Recruitment pipeline summary |
| GET | /reports/time-to-hire | `rh:report:read` | Time-to-hire analytics |

## Events Emitted

See `docs/EVENTS.md`.

## Audit Rules

- All candidate status changes must produce an `AuditEntry` with `severity: critical`.
- All hire events must produce an `AuditEntry` with `severity: critical`.
- RH_AGENT actions must use `actorType: agent` in AuditEntry.

## Error Contract

| Code | Meaning |
|---|---|
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict |
| 429 | Rate limit |
| 500 | Internal error |

## Prohibited

- No direct database access from other platforms.
- No API endpoint that allows agent-only hire/reject without human confirmation step.
