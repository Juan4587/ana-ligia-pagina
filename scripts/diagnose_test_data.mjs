/**
 * Diagnóstico de datos de prueba/seed en la BD activa. Solo lectura.
 * Uso: node scripts/diagnose_test_data.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const q = async (label, sql, params = []) => {
  const { rows } = await pool.query(sql, params);
  console.log(`\n=== ${label} ===`);
  console.table(rows);
  return rows;
};

// ---- 1. blog_posts ----
await q('blog_posts: total por autor', `
  SELECT author, count(*)::int AS n,
         min(created_at)::date AS min_date, max(created_at)::date AS max_date
  FROM blog_posts GROUP BY author ORDER BY n DESC
`);
await q('blog_posts: filas completas (id, title, author, date, tags)', `
  SELECT id, title, author, date, tags FROM blog_posts ORDER BY id
`);

// ---- 2. newsletter_subscribers ----
await q('newsletter_subscribers: total', `
  SELECT count(*)::int AS n FROM newsletter_subscribers
`);
await q('newsletter_subscribers: columnas', `
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'newsletter_subscribers' ORDER BY ordinal_position
`);
await q('newsletter_subscribers: filas completas', `
  SELECT * FROM newsletter_subscribers ORDER BY id
`);

// ---- 3. admin_users ----
await q('admin_users: columnas', `
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'admin_users' ORDER BY ordinal_position
`);
await q('admin_users: filas (sin hash)', `
  SELECT id, email, name, is_active, created_at FROM admin_users ORDER BY id
`);

// ---- 4. audit_log ----
await q('audit_log: columnas', `
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'audit_log' ORDER BY ordinal_position
`);
await q('audit_log: volumen total', `
  SELECT count(*)::int AS n, min(created_at)::date AS min_date, max(created_at)::date AS max_date
  FROM audit_log
`);
await q('audit_log: por acción', `
  SELECT action, count(*)::int AS n FROM audit_log GROUP BY action ORDER BY n DESC
`);
await q('audit_log: por actor (admin_email)', `
  SELECT admin_email, count(*)::int AS n FROM audit_log GROUP BY admin_email ORDER BY n DESC
`);
await q('audit_log: últimas 10 filas', `
  SELECT id, action, admin_email, target_type, target_id, created_at FROM audit_log ORDER BY id DESC LIMIT 10
`);

// ---- 5. submissions (por completitud) ----
await q('submissions: columnas', `
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'submissions' ORDER BY ordinal_position
`);
await q('submissions: total', `
  SELECT count(*)::int AS n FROM submissions
`);

// ---- 6. bill_supports ----
await q('bill_supports: total', `
  SELECT count(*)::int AS n FROM bill_supports
`);

// ---- 7. sessions ----
await q('sessions: total y rango', `
  SELECT count(*)::int AS total, min(created_at) AS min_ts, max(created_at) AS max_ts FROM sessions
`);

await pool.end();
console.log('\n[done] diagnóstico completo.');
