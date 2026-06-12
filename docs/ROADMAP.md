# Roadmap — HD-RH

## Phase 1: Technical Foundation

- [ ] TypeScript + Vite/Node project setup consolidated
- [ ] Shared contracts from HD-CORE integrated (replacing local types)
- [ ] tsconfig.json strict mode review
- [ ] ESLint + Prettier enforcement
- [ ] CI/CD pipeline (typecheck + lint + test)
- [ ] .env.example documented

## Phase 2: Domain Model

- [ ] Vacancy entity (id, title, department, status, requirements[])
- [ ] Candidate entity (id, vacancyId, status, source, interviewIds[])
- [ ] Interview entity (id, candidateId, scheduledAt, interviewerId, result)
- [ ] Evaluation entity (id, interviewId, scores, notes, recommendation)
- [ ] PersonnelFile entity (id, employeeId, documents[], onboardingStatus)
- [ ] AuditEntry integration from HD-CORE

## Phase 3: API Layer

- [ ] REST API following docs/API_CONTRACT.md
- [ ] JWT authentication middleware
- [ ] RBAC middleware using HD-CORE permissions
- [ ] Human-confirmation step for candidate status changes
- [ ] Input validation

## Phase 4: UI

- [ ] Vacancy management board
- [ ] Candidate pipeline view (Kanban by stage)
- [ ] Interview scheduling calendar
- [ ] Evaluation form with structured scoring
- [ ] Personnel file viewer
- [ ] HR reports dashboard

## Phase 5: Integrations

- [ ] n8n: RH_CANDIDATE_FOLLOWUP_DRAFT workflow integration
- [ ] Event bus: publish rh.candidate.* events to HD-BRAIN
- [ ] Event bus: publish rh.interview.* events to HD-OPERATIONS
- [ ] HD-WEB: vacancy listings feed

## Phase 6: AI Agents

- [ ] RH_AGENT integration following docs/RH_AGENT_POLICY.md
- [ ] Candidate summarization engine
- [ ] Interview question generator
- [ ] Human-in-the-loop for all agent outputs
- [ ] Anomaly detection (duplicate applications, schedule conflicts)

## Phase 7: Observability

- [ ] AuditEntry persistence for all candidate status changes
- [ ] Recruitment funnel metrics
- [ ] Time-to-hire reporting
- [ ] Alerting: SLA breaches in recruitment pipeline

## Phase 8: Production Readiness

- [ ] GDPR / candidate data privacy review
- [ ] Data retention policy for candidate records
- [ ] Penetration testing checklist
- [ ] Disaster recovery plan
