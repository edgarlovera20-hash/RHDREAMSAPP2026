# Enterprise Quality Gate

## Diagnóstico

Este repositorio forma parte del ecosistema Heavenly Dreams y debe cumplir reglas mínimas de arquitectura, seguridad, CI/CD y gobernanza de agentes IA.

## Reglas obligatorias

1. Toda plataforma debe consumir contratos compartidos desde HD-CORE.
2. Ninguna plataforma debe asumir responsabilidades de otra.
3. Ninguna PR debe duplicar permisos, eventos, roles o tipos compartidos.
4. Toda acción sensible debe ser auditable.
5. Todo agente IA debe operar con permisos mínimos.
6. Toda automatización n8n debe usar service principal, correlationId e idempotencia.
7. HD-BRAIN no puede modificar datos transaccionales directamente.
8. HD-CRM es dueño de clientes, seguimiento y morosos.
9. HD-RH es dueño de candidatos y contratación.
10. HD-ADMIN es dueño de usuarios, roles, permisos, finanzas y auditoría.

## Criterio de bloqueo

Una PR debe bloquearse si:

- Mezcla dominios.
- Duplica contratos de HD-CORE.
- Evade RBAC.
- Expone secretos.
- Permite acciones críticas sin auditoría.
- Permite a un agente modificar datos fuera de su dominio.
