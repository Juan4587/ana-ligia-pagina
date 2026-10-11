/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crea el primer usuario del Despacho (login por correo + clave).
 * Idempotente: si el correo ya existe, no lo duplica.
 *
 * Uso:
 *   npx tsx scripts/seed_admin_user.ts "Nombre Apellido" correo@despacho.co "clave-segura"
 */

import 'dotenv/config';
import readline from 'readline';
import { ensureSchema, createUser, getUserByEmail, listUsers } from '../src/server/db.js';

const [nameArg, emailArg, passwordArg] = process.argv.slice(2);

function promptPassword(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Clave del nuevo usuario (mínimo 8 caracteres): ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  await ensureSchema();
  const name = (nameArg || '').trim();
  const email = (emailArg || '').trim().toLowerCase();
  if (!name || !email) {
    console.error('Uso: npx tsx scripts/seed_admin_user.ts "Nombre" correo@despacho.co [clave]');
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`El correo "${email}" no es válido.`);
    process.exit(1);
  }
  const password = (passwordArg || '').trim() || (await promptPassword());
  if (password.length < 8) {
    console.error('La clave debe tener al menos 8 caracteres.');
    process.exit(1);
  }
  if (await getUserByEmail(email)) {
    console.error(`Ya existe un usuario con el correo ${email}.`);
    process.exit(1);
  }
  const user = await createUser({ name, email, password });
  console.log(`✔ Usuario del Despacho creado:`);
  console.log(`   Nombre : ${user.name}`);
  console.log(`   Correo : ${user.email}`);
  console.log(`\nUsuarios del Despacho:`);
  const users = await listUsers();
  for (const u of users) {
    console.log(`  • ${u.name} <${u.email}> ${u.is_active ? '' : '(desactivado)'}`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
