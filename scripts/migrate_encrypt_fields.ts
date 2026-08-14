/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migración del punto 5: cifra description y ai_response de los radicados
 * existentes que aún estén en texto plano (columnas description/ai_response)
 * hacia las nuevas columnas cifradas (description_enc/ai_response_enc),
 * y luego vacía las columnas en texto plano.
 *
 * Uso: npx tsx scripts/migrate_encrypt_fields.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { encrypt } from '../src/server/crypto.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const db = new Database(path.join(DATA_DIR, 'app.db'));

function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

if (!hasColumn('submissions', 'description_enc')) {
  db.exec(`ALTER TABLE submissions ADD COLUMN description_enc TEXT`);
}
if (!hasColumn('submissions', 'ai_response_enc')) {
  db.exec(`ALTER TABLE submissions ADD COLUMN ai_response_enc TEXT`);
}

const rows = db
  .prepare(`SELECT id, description, description_enc, ai_response, ai_response_enc FROM submissions`)
  .all() as {
  id: string;
  description: string | null;
  description_enc: string | null;
  ai_response: string | null;
  ai_response_enc: string | null;
}[];

let migratedDesc = 0;
let migratedAi = 0;

for (const row of rows) {
  if (!row.description_enc && row.description) {
    db.prepare('UPDATE submissions SET description_enc = ? WHERE id = ?').run(encrypt(row.description), row.id);
    migratedDesc++;
  }
  if (!row.ai_response_enc && row.ai_response) {
    db.prepare('UPDATE submissions SET ai_response_enc = ? WHERE id = ?').run(encrypt(row.ai_response), row.id);
    migratedAi++;
  }
}

// Vacía el contenido en texto plano (ya migrado a las columnas cifradas)
db.prepare('UPDATE submissions SET ai_response = NULL WHERE ai_response_enc IS NOT NULL').run();
// NOTA: description es NOT NULL y se usa para búsqueda LIKE; se deja vacío tras cifrar
// los registros que ya tienen description_enc.
db.prepare(`UPDATE submissions SET description = '' WHERE description_enc IS NOT NULL`).run();

console.log(`Migración de cifrado completada:`);
console.log(`  descripciones cifradas: ${migratedDesc}`);
console.log(`  respuestas cifradas: ${migratedAi}`);
db.close();