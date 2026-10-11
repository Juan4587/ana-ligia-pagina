/**
 * Migra datos desde SQLite (data/app.db) hacia PostgreSQL (DATABASE_URL).
 * Ejecutar: npx tsx scripts/migrate_to_pg.ts
 */

import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDb } from 'sql.js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const SQLITE_PATH = path.join(process.cwd(), 'data', 'app.db');
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no está configurada en .env');
    process.exit(1);
  }
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('No se encontró data/app.db. Nada que migrar.');
    process.exit(0);
  }

  console.log('[migrate] Abriendo SQLite:', SQLITE_PATH);
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(SQLITE_PATH);
  const sqlite = new SQL.Database(fileBuffer);

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Migrar submissions
    const subs = sqlite.exec('SELECT * FROM submissions');
    if (subs.length > 0 && subs[0].values.length > 0) {
      const cols = subs[0].columns;
      let migrated = 0;
      for (const row of subs[0].values) {
        const values = row.map((v, i) => {
          if (cols[i] === 'email_sent' || cols[i] === 'despacho_notified' || cols[i] === 'anonymized') return v ?? false;
          if (cols[i] === 'is_active') return v ?? true;
          return v;
        });
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO submissions (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          values
        );
        migrated++;
      }
      console.log(`[migrate] submissions: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] submissions: vacía');
    }

    // Migrar admin_users
    const admins = sqlite.exec('SELECT * FROM admin_users');
    if (admins.length > 0 && admins[0].values.length > 0) {
      const cols = admins[0].columns;
      let migrated = 0;
      for (const row of admins[0].values) {
        const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO admin_users (${colNames}) VALUES (${placeholders}) ON CONFLICT (email) DO NOTHING`,
          row
        );
        migrated++;
      }
      console.log(`[migrate] admin_users: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] admin_users: vacía');
    }

    // Migrar bills
    const bills = sqlite.exec('SELECT * FROM bills');
    if (bills.length > 0 && bills[0].values.length > 0) {
      const cols = bills[0].columns;
      let migrated = 0;
      for (const row of bills[0].values) {
        const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO bills (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          row
        );
        migrated++;
      }
      console.log(`[migrate] bills: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] bills: vacía');
    }

    // Migrar bill_supports
    const supports = sqlite.exec('SELECT * FROM bill_supports');
    if (supports.length > 0 && supports[0].values.length > 0) {
      const cols = supports[0].columns;
      let migrated = 0;
      for (const row of supports[0].values) {
        const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO bill_supports (${colNames}) VALUES (${placeholders}) ON CONFLICT (bill_id, email) DO NOTHING`,
          row
        );
        migrated++;
      }
      console.log(`[migrate] bill_supports: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] bill_supports: vacía');
    }

    // Migrar documents
    const docs = sqlite.exec('SELECT * FROM documents');
    if (docs.length > 0 && docs[0].values.length > 0) {
      const cols = docs[0].columns;
      let migrated = 0;
      for (const row of docs[0].values) {
        const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO documents (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          row
        );
        migrated++;
      }
      console.log(`[migrate] documents: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] documents: vacía');
    }

    // Migrar audit_log
    const audit = sqlite.exec('SELECT * FROM audit_log');
    if (audit.length > 0 && audit[0].values.length > 0) {
      const cols = audit[0].columns;
      let migrated = 0;
      for (const row of audit[0].values) {
        const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO audit_log (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          row
        );
        migrated++;
      }
      console.log(`[migrate] audit_log: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] audit_log: vacía');
    }

    // Migrar meta
    const meta = sqlite.exec('SELECT * FROM meta');
    if (meta.length > 0 && meta[0].values.length > 0) {
      const cols = meta[0].columns;
      let migrated = 0;
      for (const row of meta[0].values) {
        const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.join(', ');
        await pool.query(
          `INSERT INTO meta (${colNames}) VALUES (${placeholders}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          row
        );
        migrated++;
      }
      console.log(`[migrate] meta: ${migrated} fila(s) migrada(s)`);
    } else {
      console.log('[migrate] meta: vacía');
    }

    // Resetear secuencias SERIAL (importante después de INSERT manual)
    await pool.query(`SELECT setval('admin_users_id_seq', COALESCE((SELECT MAX(id) FROM admin_users), 1))`);
    await pool.query(`SELECT setval('bills_id_seq', COALESCE((SELECT MAX(id) FROM bills), 1))`);
    await pool.query(`SELECT setval('bill_supports_id_seq', COALESCE((SELECT MAX(id) FROM bill_supports), 1))`);
    await pool.query(`SELECT setval('documents_id_seq', COALESCE((SELECT MAX(id) FROM documents), 1))`);
    await pool.query(`SELECT setval('audit_log_id_seq', COALESCE((SELECT MAX(id) FROM audit_log), 1))`);
    console.log('[migrate] Secuencias SERIAL actualizadas.');

    console.log('[migrate] ¡Migración completada exitosamente!');
  } catch (err: any) {
    console.error('[migrate] Error:', err.message);
    process.exit(1);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main();
