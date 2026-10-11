/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migra campos de texto plano a cifrados (description_enc, ai_response_enc).
 * Funciona con PostgreSQL via DATABASE_URL.
 *
 * Uso: npx tsx scripts/migrate_encrypt_fields.ts
 */

import 'dotenv/config';
import { ensureSchema } from '../src/server/db.js';
import pool from '../src/server/pg.js';
import { encrypt } from '../src/server/crypto.js';

async function main() {
  await ensureSchema();

  const { rows } = await pool.query(
    `SELECT id, description, description_enc, ai_response, ai_response_enc FROM submissions`
  );

  let migratedDesc = 0;
  let migratedAi = 0;

  for (const row of rows) {
    if (!row.description_enc && row.description) {
      await pool.query('UPDATE submissions SET description_enc = $1 WHERE id = $2', [encrypt(row.description), row.id]);
      migratedDesc++;
    }
    if (!row.ai_response_enc && row.ai_response) {
      await pool.query('UPDATE submissions SET ai_response_enc = $1 WHERE id = $2', [encrypt(row.ai_response), row.id]);
      migratedAi++;
    }
  }

  await pool.query('UPDATE submissions SET ai_response = NULL WHERE ai_response_enc IS NOT NULL');
  await pool.query(`UPDATE submissions SET description = '' WHERE description_enc IS NOT NULL`);

  console.log(`Migración de cifrado completada:`);
  console.log(`  descripciones cifradas: ${migratedDesc}`);
  console.log(`  respuestas cifradas: ${migratedAi}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
