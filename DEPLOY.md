# Despliegue en Railway (HTTPS automático)

Este portal (frontend + API de PQRSD) se despliega en **Railway**, que provee
**HTTPS automático** en la URL asignada (`https://<proyecto>.up.railway.app`)
o en un dominio propio. No se usa `localhost:3000` en producción: Railway
asigna el puerto por la variable `PORT` y la URL pública se usa en `APP_URL`.

## 1. Preparar el repositorio

Asegúrate de que `.env`, `data/` y los archivos subidos **no** se suban
(ya están en `.gitignore`). Lo que se sube es código; los datos de producción
viven en Railway (ver persistencia más abajo).

## 2. Crear el proyecto en Railway

1. Ve a https://railway.app → **New Project** → **Deploy from GitHub**.
2. Conecta el repositorio que contiene este portal.
3. Railway detecta el proyecto. Configura el **build** y el **start**:

   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Root directory:** la carpeta del proyecto (si el repo solo tiene este portal, dejarla vacía).

   > El script `build` compila el frontend (Vite) y genera `dist/server.cjs`.
   > El script `start` (`node dist/server.cjs`) sirve el sitio + API y exige
   > `NODE_ENV=production` (se define abajo).

## 3. Variables de entorno

En la pestaña **Variables** de Railway define (nunca en el repositorio):

| Variable | Valor | Notas |
|---|---|---|
| `NODE_ENV` | `production` | Obligatoria: sirve el build estático y no arranca Vite. |
| `PORT` | (la deja Railway) | Railway la asigna automáticamente; no la fijes. |
| `APP_URL` | `https://TU-PROYECTO.up.railway.app` | Se usa en enlaces de correos. Opcional. |
| `DATA_DIR` | `/data` | **Importante:** carpetas que no están en un volumen aparecen como `/app/data`; usa un volumen persistente (punto 4). |
| `ENCRYPTION_KEY` | (generar) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. No perderla. |
| `RESEND_API_KEY` | (de resend.com) | Vacía = el portal funciona sin correos (aviso visible al arrancar). |
| `EMAIL_FROM` | `Departamento Legislativo <no-reply@tudominio.co>` | Remitente **verificado** en Resend. |
| `DESPACHO_EMAIL` | `ana.mora@camara.gov.co` | Buzón del despacho. |
| `ANONYMIZE_AFTER_DAYS` | `1460` | Política de retención (4 años). |
| `PERIOD_END_DATE` | `2030-07-20` | Cierre del periodo: anonimiza todo y borra adjuntos. |

Genera la clave de cifrado en una terminal local y pégala en Railway. No la compartas.

## 4. Persistencia de datos (SQLite + adjuntos)

La base de datos SQLite y los archivos subidos viven en `DATA_DIR` (`data/`).
En Railway la carpeta del contenedor es **efímera**: se pierde en cada
despliegue. Para conservar datos:

1. En Railway, crea un **Volume** montado en una ruta, por ejemplo `/data`.
2. Define `DATA_DIR=/data` en las variables.
3. Los radicados y los PDF de proyectos se guardan ahí y sobreviven a los deploys.

> Si ya radicaste datos en el contenedor (sin volumen), cópialos a mano
> antes del primer cambio: descarga `data/app.db` y las subcarpetas
> `uploads/bills` y `uploads/pqrs` al volumen.

## 5. Primer usuario del Despacho

Después de desplegar, crea el usuario admin ejecutando una vez en Railway
(terminal del servicio):

```
npx tsx scripts/seed_admin_user.ts "Nombre Completo" correo@despacho.co "clave-segura"
```

También puedes crearlo desde el panel web: pestaña **Usuarios → Nuevo usuario**.

## 6. HTTPS y dominio propio

- Railway asigna HTTPS automáticamente en `https://<proyecto>.up.railway.app`.
- Para un dominio propio: **Settings → Networking → Generate Domain** con el
  dominio (p. ej. `portal.analigiamora.com`). Railway emite y gestiona el
  certificado SSL/TLS automáticamente. Luego actualiza `APP_URL` con ese dominio.

## 7. Verificación

- Visita `https://TU-DOMINIO/api/health` → debe responder `{"status":"ok"...}`.
- Radica una PQRSD de prueba y haz seguimiento por el número de radicado.
- Ingresa al panel "Despacho" con el usuario creado.

## Respaldos

El `data/` de producción (volumen) se respalda igual que en local:
`npm run backup` — pero preferible hacerlo con la copia del volumen de Railway
o un cron que baje `data/app.db` y `uploads/` a un almacenamiento seguro.