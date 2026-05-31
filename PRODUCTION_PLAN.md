# Plan de Producción RHDreams en Cloudflare

## Estado Actual

- La app ya no siembra candidatos, agentes, mensajes, notificaciones ni cuentas conectadas de ejemplo.
- El frontend queda preparado para Cloudflare Pages con `npm run build:cloudflare`, `wrangler.toml`, `_headers` y `_redirects`.
- Gemini, Canva, Meta Ads y Google Workspace fallan de forma explícita cuando faltan credenciales; no generan resultados inventados.
- Firebase sigue siendo la fuente real de candidatos, vacantes, mensajes, agentes, citas y automatizaciones.
- Las rutas `/api/*` siguen dependiendo del servidor Express actual. Para Cloudflare Pages estático deben moverse a Cloudflare Workers/Pages Functions o desplegarse como API separada.

## Despliegue Cloudflare Pages

1. Crear proyecto en Cloudflare Pages conectado al repositorio.
2. Build command: `npm run build:cloudflare`.
3. Build output directory: `dist`.
4. Node version recomendada: `22`.
5. Variables públicas de Vite en Pages:
   - Config de Firebase si se migra desde `firebase-applet-config.json` a variables `VITE_*`.
6. Deploy manual opcional:
   - `npm run build:cloudflare`
   - `npx wrangler pages deploy dist --project-name rhdreamsapp2026`

## API Y Funciones

1. Migrar `/api/gemini/*` a Cloudflare Workers o Pages Functions.
2. Migrar `/api/integrations/*` a Workers con secretos de Cloudflare.
3. Mantener claves sensibles solo como secretos del backend:
   - `GEMINI_API_KEY`
   - `CANVA_ACCESS_TOKEN`
   - `META_ADS_ACCESS_TOKEN`
   - `META_AD_ACCOUNT_ID`
   - `WHATSAPP_BUSINESS_ACCESS_TOKEN`
   - `INDEED_CLIENT_SECRET`
4. Configurar CORS solo para el dominio final.
5. Validar Firebase ID token en cada escritura o acción sensible.

## Firebase

1. Activar Google Auth y, solo si realmente se necesita, Auth anónimo.
2. Revisar `firestore.rules` por usuario, rol y empresa.
3. Crear índices para consultas de candidatos, citas, mensajes y agentes.
4. Cargar datos iniciales reales desde consola o script administrativo, nunca desde el cliente.
5. Configurar backups/export programados de Firestore.

## Google Workspace

1. Configurar pantalla OAuth y dominio autorizado de Cloudflare.
2. Habilitar APIs: Calendar, Drive, Photos Library, Gmail, Sheets, Forms y Keep si aplica.
3. Revisar scopes sensibles/restringidos y solicitar verificación OAuth si Google lo exige.
4. Probar con datos reales:
   - Exportar candidatos a Sheets.
   - Importar candidatos desde Sheets.
   - Agendar entrevista en Calendar.
   - Enviar correo con Gmail.
   - Leer PDFs, imágenes y CVs desde Drive.
   - Leer fotos autorizadas desde Photos.

## Seguridad

1. No exponer `GEMINI_API_KEY` ni tokens de integraciones en Vite.
2. Usar secretos de Cloudflare para credenciales del backend.
3. Agregar rate limit por usuario/IP en Workers.
4. Evitar logs con teléfono, email completo, CVs o datos sensibles.
5. Revisar permisos de OAuth y tokens de Meta/Google cada trimestre.

## Validación Antes De Producción

1. `npm run lint`
2. `npm run build:cloudflare`
3. Smoke test del sitio publicado:
   - Login
   - Dashboard vacío
   - Candidatos sin datos inventados
   - Workspace Google sin modo local falso
   - Reportes calculados desde Firestore
4. Revisar que `/api/*` esté resuelto por Workers o API externa antes de activar agentes automáticos.
