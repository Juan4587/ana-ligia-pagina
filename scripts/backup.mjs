/**
 * Respaldo portatil del módulo PQRSD.
 * Copia la carpeta de datos (base de datos SQLite + archivos subidos)
 * a una carpeta con marca de tiempo dentro de ./backups.
 *
 * Uso: npm run backup
 */

import fs from 'fs';
import path from 'path';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  console.error(`No existe la carpeta de datos: ${dataDir}`);
  process.exit(1);
}

const backupRoot = path.join(process.cwd(), 'backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = path.join(backupRoot, `pqrsd-${stamp}`);

fs.mkdirSync(target, { recursive: true });
fs.cpSync(dataDir, target, { recursive: true });

console.log(`Respaldo creado en: ${target}`);
console.log('Conserva estas carpetas con marca de tiempo para restaurar la información.');