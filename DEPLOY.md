# Despliegue en Servidor Dedicado (Producción)

Este portal (frontend + API de PQRSD) se despliega en un **servidor dedicado** con PostgreSQL, ideal para proyectos con dominio personalizado y control total sobre el entorno.

## 1. Preparar el Entorno

### Requisitos previos
- Servidor con Ubuntu/Debian o CentOS (recomendado)
- PostgreSQL 14+ con rol de usuario `postgres` y `sudo`
- Node.js 20+ (usar nvm o manager de versiones)
- Docker (opcional pero recomendado para aislamiento)
- Dominio con SSL (o Let's Encrypt)

### Python y Dependencias
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git
cat /etc/os-release

# CentOS/RHEL
sudo yum update
sudo yum install -y python3 python3-pip git
cat /etc/os-release
```

## 2. Configurar el Proyecto

### Clonación del repositorio
```bash
cd /var/www
cgit clone https://github.com/usuario/portal-legislativo-ana-ligia-mora portal-legislativo
```

### Directorio de despliegue
```bash
sudo mkdir -p /var/www/portal-legislativo
sudo chown -R $USER:$USER /var/www/portal-legislativo
cd /var/www/portal-legislativo
```

## 3. Construir el Proyecto

### Variables de entorno (en .env)
```bash
# Variables del servidor
NODE_ENV=production
PORT=3000
APP_URL=https://portal.analigiamora.com
DATA_DIR=/var/lib/portal-legislativo/data

# Base de datos
DATABASE_URL=postgresql://portal_user:portal_pass@localhost:5432/portal_legislativo

# Cifrado (generar con node)
ENCRYPTION_KEY=<generar-con-node>

# Correos (opcional)
RESEND_API_KEY=reyour-key-here
EMAIL_FROM=Departamento Legislativo <no-reply@analigiamora.com>
DESPACHO_EMAIL=ana.mora@camara.gov.co

# Retención
ANONYMIZE_AFTER_DAYS=1460
PERIOD_END_DATE=2030-07-20
```

### Generar clave de cifrado
```bash
cd /var/www/portal-legislativo
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Construcción
```bash
cd /var/www/portal-legislativo
npm install
npm run build
```

## 4. Configurar PostgreSQL

### Crear usuario y base de datos
```sql
-- Conectar como postgres
psql -u postgres

-- Crear usuario
CREATE USER portal_user WITH PASSWORD 'portal_pass';

-- Crear base de datos
CREATE DATABASE portal_legislativo OWNER portal_user;

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE portal_legislativo TO portal_user;
\q
```

### Ejecutar migraciones iniciales
```bash
cd /var/www/portal-legislativo
npx tsx scripts/migrate_to_pg.ts
```

## 5. Configurar el Servicio Systemd

### Archivo de servicio
```bash
sudo nano /etc/systemd/system/portal-legislativo.service
```

```ini
[Unit]
Description=Portal Legislativo Ana Ligia Mora Martínez
After=network.target postgresql.service

[Service]
Type=simple
User=portal
Group=portal
WorkingDirectory=/var/www/portal-legislativo
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://portal_user:portal_pass@localhost:5432/portal_legislativo
ExecStart=/var/www/portal-legislativo/node_modules/.bin/node server-dist/server.cjs
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Permitir al usuario
```bash
sudo useradd -r -s /bin/bash portal
sudo chown -R portal:portal /var/www/portal-legislativo
# Asegurar permisos de escritura en el directorio de datos
sudo mkdir -p /var/lib/portal-legislativo/data
sudo chown -R portal:portal /var/lib/portal-legislativo
sudo chmod -R 755 /var/lib/portal-legislativo
```

### Habilitar e iniciar servicio
```bash
sudo systemctl daemon-reload
sudo systemctl enable portal-legislativo
sudo systemctl start portal-legislativo
sudo systemctl status portal-legislativo
```

## 6. Configurar NGINX

### Configuración de nginx
```bash
sudo nano /etc/nginx/sites-available/portal-legislativo
```

```nginx
server {
    listen 80;
    server_name portal.analigiamora.com;

    # Frontend estático
    location / {
        root /var/www/portal-legislativo/dist;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout largo para upload y websockets
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Documentos subidos
    location /uploads {
        alias /var/lib/portal-legislativo/data/uploads;
        autoindex off;
    }
}
```

### Habilitar sitio
```bash
sudo ln -s /etc/nginx/sites-available/portal-legislativo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS con Let's Encrypt

### Instalar certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d portal.analigiamora.com
sudo systemctl reload nginx
```

## 8. Primer Usuario del Despacho

```bash
cd /var/www/portal-legislativo
npm run seed:admin "Ana Ligia Mora Martínez" ana.mora@camara.gov.co "clave-segura"
```

## 9. Monitoreo y Respaldo

### Systemd watchdog
```bash
sudo apt install -y monitoring-plugins-basic
sudo systemctl enable prometheus-node-exporter
sudo systemctl start prometheus-node-exporter
```

### Script de respaldo automático
```bash
cat > /usr/local/bin/portal-backup.sh << 'EOF'
#!/bin/bash

DATA_DIR="/var/lib/portal-legislativo/data"
BACKUP_DIR="/var/backups/portal-legislativo"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
sudo -u portal cp -r $DATA_DIR $BACKUP_DIR/backup_$DATE

# Rotación de respaldos (mantener últimos 7 días)
find $BACKUP_DIR -name "backup_*" -mtime +7 -exec rm -rf {} \;

# Comprimir respaldos
echo "Respaldo completado: $BACKUP_DIR/backup_$DATE"
EOF

chmod +x /usr/local/bin/portal-backup.sh

# Agregar a crontab diario
sudo crontab -l > /tmp/crontab.tmp || true
echo "0 2 * * * /usr/local/bin/portal-backup.sh" >> /tmp/crontab.tmp
sudo crontab /tmp/crontab.tmp
```

## 10. Verificación Post-Despliegue

### Ver estado del servicio
```bash
sudo systemctl status portal-legislativo
```

### Verificar API
```bash
curl -s http://localhost:3000/api/health
```

### Verificar sitio web
```bash
curl -s https://portal.analigiamora.com
```

### Verificar panel del Despacho
```bash
# Ingresar a https://portal.analigiamora.com
# Usar usuario del Despacho creado previamente
```

## 10b. Render + Cloudflare: IP del visitante y restricción de acceso

### Configuración de IP (rate-limit y lockout)

El servidor resuelve la IP real del visitante con `resolveClientIp()` (`src/server/ip.ts`):

- `TRUST_PROXY_MODE=auto` (default): si la IP resuelta por Express cae en un rango de Cloudflare, usa `CF-Connecting-IP`; si no, usa `req.ip` (correcto para Render-directo).
- `TRUST_PROXY_MODE=direct`: solo para pruebas locales; en producción rompe el rate-limit detrás de cualquier proxy.

La lista de rangos de Cloudflare está embebida en el código (se actualiza cada ~6 meses desde https://www.cloudflare.com/ips-v4 e ips-v6). Para parchear sin redeploy, usar la env var `CF_IP_RANGES_EXTRA` (CIDR comma-separated, acepta IPv4 y IPv6).

### Desactivar el subdominio *.onrender.com

Render termina el TLS en su propio balanceador; la validación de certificado de cliente (mTLS) no aplica en este entorno. La forma nativa de restringir el acceso al origen es desactivar el subdominio que Render asigna automáticamente.

Una vez que el dominio propio (`portal.analigiamora.com`) funcione correctamente detrás de Cloudflare:

1. **Verificar que el dominio propio responde:**
   ```bash
   curl -s https://portal.analigiamora.com/api/health
   # Esperado: {"status":"ok","time":"..."}
   ```

2. **Desactivar el subdominio de Render:** en **Render Dashboard** → tu servicio → **Settings** → **Custom Domains** → **Render Subdomain** → **Disabled**.

3. **Confirmar que el health check sigue en verde:**
   ```bash
   curl -s https://portal.analigiamora.com/api/health
   # Esperado: {"status":"ok","time":"..."}
   ```

4. **Verificar que el bypass directo ya no responde:**
   ```bash
   # Este curl golpea Render directamente (sin pasar por Cloudflare)
   # y envía X-Forwarded-For falso. Con el subdominio desactivado,
   # la conexión directa no debe resolver.
   curl -s -X POST https://TU-SERVICIO.onrender.com/api/admin/auth \
     -H "Content-Type: application/json" \
     -H "X-Forwarded-For: 1.2.3.4" \
     -d '{"email":"test@evil.co","password":"x"}' -v 2>&1 | grep -i "HTTP/"
   ```

5. **Verificar que la IP real se registra en audit_log:**
   ```sql
   -- Después de un intento de login fallido, verificar que la IP en details
   -- es la IP real del cliente, no la falsificada.
   SELECT admin_email, action, details, created_at
   FROM audit_log
   WHERE action IN ('LOGIN_FALLIDO', 'LOGIN_BLOQUEADO', 'LOGIN_EXITOSO')
   ORDER BY id DESC LIMIT 5;
   ```

### Variables de entorno en Render

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `TRUST_PROXY_MODE` | `auto` | Resolución de IP del visitante |
| `CF_IP_RANGES_EXTRA` | vacío | CIDR extra para detección de CF |
| `APP_URL` | `https://portal.analigiamora.com` | Dominio propio (para links en emails) |


## 11. Monitoreo

### Graphana/Prometheus (opcional)
```bash
# Instalar
sudo apt install -y prometheus grafana

# Configurar datasource para node exporter
sudo systemctl enable prometheus
apt start prometheus
```

### Alertas (opcional)
```bash
sudo apt install -y htop iotop
```

## 12. Administración del Sistema

### Ver logs
```bash
sudo journalctl -u portal-legislativo -f
```

### Reiniciar servicio
```bash
sudo systemctl restart portal-legislativo
```

### Actualizar aplicación
```bash
cd /var/www/portal-legislativo
sudo git pull
sudo npm install
sudo npm run build
sudo systemctl restart portal-legislativo
```

## 13. Configuración de Seguridad

### Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### SSH en puerto no estándar
```bash
# Descomentar y editar en /etc/ssh/sshd_config
sudo nano /etc/ssh/sshd_config
# Port 2222
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
sudo systemctl restart sshd
```

## 14. Parámetros Avanzados

### Optimización de node
```bash
# system.conf para systemd
# .conf

[Service]
LimitNOFILE=65536
LimitNPROC=4096
```

### PostgreSQL tuning
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
# Ajustar shared_buffers, work_mem, max_connections
```

## 15. Scripts Útiles

### Script de verificación de salud
```bash
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash

# Verificar servicio
if ! systemctl is-active --quiet portal-legislativo; then
    echo "ERROR: Servicio portal-legislativo no está activo"
    exit 1
fi

# Verificar base de datos
db_status=$(sudo -u postgres psql -c "SELECT 1;" portal_legislativo 2>&1 | grep -c "1 row")
if [ $db_status -eq 0 ]; then
    echo "ERROR: PostgreSQL no responde"
    exit 1
fi

# Verificar disco (mínimo 1GB libre)
if [ $(df /var/lib/portal-legislativo/data | awk 'NR==2 {print $4}') -lt 1073741 ] && [ $(df /var/lib/portal-legislativo/data | awk 'NR==2 {print $4}') -gt 0 ]; then
    echo "WARNING: Espacio en disco bajo"
fi

echo "Health check: OK"
exit 0
EOF

chmod +x /usr/local/bin/health-check.sh
```

### Cronjob diario para respaldos
```bash
# Agregar a crontab (sudo crontab -e)
0 2 * * * /usr/local/bin/portal-backup.sh

# Verificar logs diarios
2 * * * * /usr/local/bin/health-check.sh >> /var/log/portal-health.log 2>&1
```

## Mantenimiento

### Actualizaciones del sistema
```bash
# Actualizar todos los paquetes
sudo apt update && sudo apt upgrade -y

# Mantener npm y node actualizados
sudo nvm install node
sudo npm install -g npm
```

### Seguridad del sistema
```bash
# Ejecutar escáner
apt install -y lynis

# Revisar logs de SELinux (si usa)
audit.log
```

### Actualización de aplicaciones
```bash
# Despliegue continuo (opcional)
# Ejemplo usando git + supervisor
# Considerar usar docker-compose si usan contenedorización
```

El portal ahora está listo para producción con PostgreSQL dedicado y dominio personalizado.