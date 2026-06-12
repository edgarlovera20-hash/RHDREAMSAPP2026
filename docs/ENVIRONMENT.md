# Environment Configuration — HD-RH

## Overview

HD-RH uses environment variables for all configuration. No secrets are hardcoded.

## Required Variables

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `APP_NAME` | Application identifier | `HD-RH` |
| `APP_PORT` | HTTP server port | `3002` |
| `API_BASE_URL` | Base URL for this API | `http://localhost:3002` |
| `HD_CORE_MODE` | HD-CORE resolution mode | `local` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/hdrh` |
| `AUDIT_DB_URL` | Audit database URL | `postgresql://user:password@localhost:5432/hdaudit` |
| `JWT_SECRET` | JWT signing secret | (never hardcode) |
| `JWT_EXPIRY` | Token expiry | `1h` |
| `N8N_WEBHOOK_BASE_URL` | n8n webhook base URL | `http://localhost:5678` |
| `LOG_LEVEL` | Logging level | `info` |

## Security Rules

1. Never commit a `.env` file with real values.
2. Candidate PII must never appear in log output.
3. All secrets must be injected via CI/CD secret management.
