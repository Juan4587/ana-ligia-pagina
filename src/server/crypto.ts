/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cifrado de datos personales en reposo (AES-256-GCM).
 * La clave se deriva de ENCRYPTION_KEY (.env). Nunca se guarda en texto plano.
 */

import crypto from 'crypto';

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (!raw || raw === 'cambia-esta-clave-encriptacion') {
    console.warn('[crypto] ENCRYPTION_KEY no está configurada. Usando clave de desarrollo insegura. Configúrala en .env antes de producción.');
  }
  // Deriva 32 bytes estables desde cualquier cadena (AES-256).
  return crypto.createHash('sha256').update(raw).digest();
}

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Formato: iv(12) + authTag(16) + ciphertext
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return plain;
  } catch {
    return null;
  }
}