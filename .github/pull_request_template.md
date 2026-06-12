# Pull Request Checklist

## Arquitectura

- [ ] Respeta la frontera de la plataforma.
- [ ] No duplica contratos de HD-CORE.
- [ ] No introduce permisos locales si deben vivir en HD-CORE.
- [ ] No introduce eventos locales si deben vivir en HD-CORE.
- [ ] No mezcla responsabilidades entre WEB, RH, CRM, OPERATIONS, ADMIN, BRAIN o CORE.

## Seguridad

- [ ] Respeta RBAC.
- [ ] No expone secretos.
- [ ] No introduce claves locales inseguras.
- [ ] No permite bypass de autenticación.
- [ ] No permite acciones sensibles sin auditoría.

## Agentes IA y n8n

- [ ] El agente opera solo dentro de su dominio.
- [ ] Toda acción sensible requiere auditoría.
- [ ] Toda acción crítica requiere revisión humana.
- [ ] n8n usa service principal, correlationId e idempotencia.
- [ ] No hay acceso directo a bases de datos desde automatizaciones.

## Calidad

- [ ] npm install funciona.
- [ ] npm run typecheck funciona.
- [ ] npm test funciona.
- [ ] CI puede resolver HD-CORE.
