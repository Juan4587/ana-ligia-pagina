/**
 * Exporta PN-001 y PP-001 a backup_seed_ponencias.json y las borra.
 * Uso: node scripts/delete_seed_ponencias.mjs
 */
import fs from 'node:fs';
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

const ids = [7, 8];

const { rows } = await pool.query(
  'SELECT * FROM bills WHERE id = ANY($1::int[]) ORDER BY id',
  [ids]
);

if (rows.length !== 2) {
  console.error(`[abort] Se esperaban 2 filas (id 7 y 8), se encontraron ${rows.length}:`, rows.map((r) => r.id));
  await pool.end();
  process.exit(1);
}

const outPath = path.join(__dirname, 'backup_seed_ponencias.json');
fs.writeFileSync(
  outPath,
  JSON.stringify({ exportedAt: new Date().toISOString(), table: 'bills', rows }, null, 2),
  'utf8'
);
console.log(`[backup] ${rows.length} fila(s) exportadas a ${path.relative(process.cwd(), outPath)}`);
for (const r of rows) console.log(`  - id=${r.id} number=${r.number} title=${r.title}`);

const del = await pool.query('DELETE FROM bills WHERE id = ANY($1::int[]) RETURNING id, number', [ids]);
console.log(`[delete] ${del.rowCount} fila(s) eliminada(s):`, del.rows.map((r) => `${r.id}/${r.number}`).join(', '));

const remaining = await pool.query('SELECT count(*)::int AS n FROM bills');
console.log(`[verify] bills restantes: ${remaining.rows[0].n}`);

await pool.end();
