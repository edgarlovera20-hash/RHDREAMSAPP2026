# Events — HD-RH

## Overview

This document catalogs all domain events produced and consumed by HD-RH. All shared event names must originate from HD-CORE `packages/contracts/src/events.ts`.

## Produced Events

| Event | Producer | Consumers | Payload Summary | Sensitivity |
|---|---|---|---|---|
| `rh.vacancy.published` | HD-RH | HD-WEB, HD-BRAIN | vacancyId, title, department, createdAt, correlationId | internal |
| `rh.candidate.applied` | HD-RH | HD-BRAIN | candidateId, vacancyId, source, createdAt, correlationId | confidential |
| `rh.candidate.status_changed` | HD-RH | HD-BRAIN | candidateId, previousStatus, newStatus, changedBy, correlationId | confidential |
| `rh.interview.scheduled` | HD-RH | HD-OPERATIONS, HD-BRAIN | interviewId, candidateId, vacancyId, scheduledAt, correlationId | internal |
| `rh.interview.completed` | HD-RH | HD-BRAIN | interviewId, candidateId, result, correlationId | confidential |
| `rh.candidate.hired` | HD-RH | HD-ADMIN, HD-BRAIN, HD-OPERATIONS | candidateId, vacancyId, startDate, correlationId | confidential |

## Consumed Events

| Event | Consumer | Source | Action Taken |
|---|---|---|---|
| `brain.risk.alert_generated` | HD-RH | HD-BRAIN | Flag recruiter for human review if risk related to candidate |
| `admin.user.role_changed` | HD-RH | HD-ADMIN | Refresh RBAC context |
| `operations.task.assigned` | HD-RH | HD-OPERATIONS | Link onboarding tasks to new hire |

## Rules

1. All shared event names must come from `HD-CORE/packages/contracts/src/events.ts`.
2. Every event payload must include `correlationId` and `createdAt`.
3. Candidate data in events must use IDs only, never include full PII in payloads.
4. Events must be processed idempotently by all consumers.
