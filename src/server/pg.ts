/**
 * Pool de conexión PostgreSQL.
 * DATABASE_URL debe estar en .env (Render la inyecta automáticamente).
 *
 * SSL sin verificación de cadena de certificado (rejectUnauthorized: false).
 * Esto es común para conexiones externas a Render Postgres con sslmode=require,
 * pero implica que no se valida la autenticidad del certificado del servidor
 * (riesgo teórico de man-in-the-middle si la ruta de red/DNS hacia Render
 * fuera comprometida). Se acepta este trade-off por simplicidad de configuración;
 * si en el futuro se requiere mayor garantía, usar el certificado CA de Render
 * y validar la cadena completa (rejectUnauthorized: true + ca: <cert>).
 */

import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('[pg] Error inesperado en el pool:', err);
});

export default pool;
