# Portal Legislativo — Ana Ligia Mora Martínez

Portal de difusión de la agenda legislativa con **módulo completo de PQRSD**:
radicados ciudadanos con seguimiento, panel del Despacho, adjuntos, cifrado,
anonimización por política de retención, notificaciones por correo,
administración de proyectos de ley radicados con su documento oficial,
**usuarios del Despacho por correo + clave** y **bitácora de auditoría**.

## Arquitectura del módulo PQRSD

- **Persistencia:** SQLite en `data/app.db` (archivo único; respáldalo).
  Tablas: `submissions` (radicados), `documents` (adjuntos), `bills` (proyectos de ley),
  `admin_users` (usuarios del Despacho), `audit_log` (auditoría) y `meta`.
- **Cifrado en reposo:** nombre, correo, teléfono y el **contenido** de cada radicado
  (descripción y respuesta) se guardan cifrados (AES-256-GCM) con `ENCRYPTION_KEY`.
  El panel del Despacho los descifra para atender el caso.
- **Seguimiento ciudadano:** se hace **solo con el número de radicado** (`POST /api/pqrsd/track`).
  No existe listado público de radicados (se eliminó el antiguo `/api/pqrsd/list`).
- **Panel del Despacho (admin):** acceso con **correo + clave por usuario** (bcrypt; sin clave
  compartida). Cada usuario tiene un nombre y correo institucional. Permite: filtrar/ver radicados,
  cambiar estado, responder y enviar por correo, **anonimizar** (borra datos personales) y
  **eliminar**, administrar **proyectos de ley** con su PDF, **gestionar usuarios** y revisar la
  **auditoría** (login, respuestas, anonimizaciones, eliminaciones, usuarios y leyes quedan registrados).
- **Correos (Resend):** al radicar se envía la confirmación al ciudadano y un **aviso al
  despacho clasificado por eje legislativo**. Al responder, se puede enviar la respuesta oficial.
  Si `RESEND_API_KEY` está vacía, el portal funciona igual pero **muestra un aviso visible** al arrancar.
- **Retención:** los radicados inactivos se **anonimizan automáticamente** tras
  `ANONYMIZE_AFTER_DAYS` (por defecto 1460 = 4 años). Poner `0` desactiva esto.
- **Cierre de periodo:** al llegar `PERIOD_END_DATE` se **anonimizan todos** los radicados
  (se conserva el número y el contenido cifrado, se borran datos personales y adjuntos).
- **Seguridad adicional:** límite de 8 radicados/hora por IP, validaciones de email,
  filtro de tipos de archivo (máx. 6 MB por adjunto, 4 por radicado), claves cifradas con bcrypt
  y sesiones por token; todos los endpoints admin exigen sesión activa.

## Puesta en marcha

1. Instalar dependencias:
   ```
   npm install
   ```
2. Crear el archivo de configuración (nunca subirlo al repositorio):
   ```
   copy .env.example .env
   ```
3. Editar `.env`:
   - `ENCRYPTION_KEY` — clave de cifrado (no perderla; no permite leer datos viejos):
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `RESEND_API_KEY` y `EMAIL_FROM` (remitente verificado en resend.com) y
     `DESPACHO_EMAIL` (buzón donde llegan los avisos de nuevos radicados).
   - `APP_URL` — URL pública del portal (para enlaces en correos).
   - `ANONYMIZE_AFTER_DAYS` y `PERIOD_END_DATE` — política de retención.
4. Crear el primer usuario del Despacho:
   ```
   npm run seed:admin -- "Ana Ligia Mora Martínez" ana.mora@camara.gov.co "clave-segura"
   ```
5. Ejecutar en desarrollo:
   ```
   npm run dev
   ```
   El portal queda en `http://localhost:3000` y el panel del Despacho en
   "Despacho" del menú superior.

## Producción

```
npm run build     # compila el frontend y bundlea server.cjs
npm start         # sirve el sitio + API (exige NODE_ENV=production en el host)
```

### Despliegue en Railway

Ver `DEPLOY.md` para los pasos, variables de entorno y persistencia de `data/`.

### Respaldos

Todo el contenido está en la carpeta **`data/`** (base de datos + archivos subidos).

```
npm run backup    # copia data/ a backups/pqrsd-<fecha-hora>/
```

Respaldar esa carpeta con regularidad. Restaurar es reemplazar `data/` desde un respaldo.

## Notas de privacidad (Colombia)

- Se recogen únicamente nombre, correo, teléfono y el contenido del requerimiento.
  No se solicitan documentos de identidad ni datos sensibles.
- Protección de datos: Ley 1581 de 2012 (Habeas Data) y derecho de petición Ley 1755 de 2015.
- La anonimización elimina de forma permanente los datos personales conservando el contenido
  cifrado y el número de radicado; desde el panel también se puede eliminar totalmente un radicado.
- El contenido (descripción y respuesta) queda cifrado en reposo (AES-256-GCM).

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite + API) |
| `npm run build` | Compilación de producción |
| `npm start` | Arranque del bundle de producción |
| `npm run lint` | Verificación de tipos (tsc) |
| `npm run backup` | Respaldo de la base de datos y archivos |
| `npm run seed:admin` | Crea un usuario del Despacho (correo + clave) |
| `npm run migrate:encrypt` | Cifra descripciones/respuestas de radicados pre-existentes |
| `npm run smoke` | Pruebas de humo del API (requiere el servidor local; usa `APP_URL` si cambias el puerto) |