# RHDreams App 2026

CRM de reclutamiento para candidatos, vacantes, mensajes, agentes IA, reportes e integraciones.

## Desarrollo local

1. Instala dependencias:
   `npm install`
2. Copia `.env.example` a `.env.local` y configura las credenciales necesarias.
3. Ejecuta:
   `npm run dev`

## Validacion de produccion

- `npm run lint`
- `npm run build`
- `npm run build:cloudflare`
- `npm run simulate:users -- --base http://127.0.0.1:3000 --users 200 --concurrency 25`

## Despliegue

### DigitalOcean App Platform

- Build command: `npm run build`
- Start command: `npm run start`
- Output principal: `dist/server.cjs`
- HTTP port: `3000`
- Health check: `/health`
- Runtime recomendado: Node.js 22
- Configura `NODE_ENV=production`, `PORT=3000`, `APP_URL=https://TU_DOMINIO` y los secretos del `.env.example` en el panel de DigitalOcean.

### DigitalOcean Droplet / VPS

1. Instala Node.js 22.
2. Ejecuta `npm ci`.
3. Configura variables de entorno reales.
4. Ejecuta `npm run build`.
5. Levanta la app con `npm run start` usando PM2, systemd o Docker.
6. Publica el puerto interno `3000` detras de Nginx/Caddy con HTTPS.

### Render Blueprint

- Archivo: `render.yaml`
- Runtime: Node 22
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check: `/health`
- Los secretos con `sync: false` se capturan en el dashboard de Render al crear el Blueprint.
- `JWT_SECRET` se genera automaticamente con `generateValue: true`.

### Cloudflare Pages

- Build command: `npm run build:cloudflare`
- Output directory: `dist`
- Configuracion: `wrangler.toml`, `public/_headers`, `public/_redirects`
- Las rutas `/api/*` deben vivir en Pages Functions, Workers o un backend externo.

## Seguridad antes de publicar

- Configura secretos reales en el proveedor de hosting, no en el cliente.
- No expongas tokens sin prefijo seguro como variables `VITE_*`.
- Publica `firestore.rules` para bloquear escritura anonima.
- Activa Firebase Auth y dominios autorizados.
- Usa `VITE_API_BASE_URL` si frontend y backend viven en dominios separados.
