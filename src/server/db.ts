/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Capa de datos SQLite para el módulo PQRSD.
 * Guarda radicados, adjuntos, proyectos de ley, usuarios del Despacho y auditoría.
 * Datos personales y contenido cifrados (AES-256-GCM).
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from './crypto.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const UPLOADS_PQRS = path.join(DATA_DIR, 'uploads', 'pqrs');
const UPLOADS_BILLS = path.join(DATA_DIR, 'uploads', 'bills');

fs.mkdirSync(UPLOADS_PQRS, { recursive: true });
fs.mkdirSync(UPLOADS_BILLS, { recursive: true });

export const uploadsPqrsDir = UPLOADS_PQRS;
export const uploadsBillsDir = UPLOADS_BILLS;

const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,
  firstName_enc TEXT,
  lastName_enc  TEXT,
  email_enc     TEXT,
  phone_enc     TEXT,
  type          TEXT NOT NULL,
  proposalId    TEXT NOT NULL,
  categoryName  TEXT,
  description   TEXT NOT NULL,
  description_enc TEXT,
  status        TEXT NOT NULL DEFAULT 'Radicado',
  ai_response   TEXT,
  ai_response_enc TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  email_sent    INTEGER NOT NULL DEFAULT 0,
  despacho_notified INTEGER NOT NULL DEFAULT 0,
  anonymized    INTEGER NOT NULL DEFAULT 0
);

/* Migración: columnas de contenido cifrado (punto 5) */
CREATE TABLE IF NOT EXISTS _migrations (
  name     TEXT PRIMARY KEY,
  applied  TEXT NOT NULL
);

/* Usuarios del Despacho (auth por email + clave, bcrypt) */
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);

/* Bitácora de auditoría de acciones sensibles del Despacho */
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL
);

/* Metadatos simples (p. ej. cierre de periodo ejecutado) */
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`);

function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

// Columnas de contenido cifrado (punto 5) si no existen ya
if (!hasColumn('submissions', 'description_enc')) {
  db.exec(`ALTER TABLE submissions ADD COLUMN description_enc TEXT`);
}
if (!hasColumn('submissions', 'ai_response_enc')) {
  db.exec(`ALTER TABLE submissions ADD COLUMN ai_response_enc TEXT`);
}
console.log('[db] migraciones de esquema aplicadas (description_enc, ai_response_enc).');

db.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  number          TEXT NOT NULL,
  dateFiled       TEXT,
  status          TEXT NOT NULL DEFAULT 'Radicado',
  stageDescription TEXT,
  summary         TEXT,
  proposalIdRelated TEXT,
  authors         TEXT,
  initiatives     TEXT,
  impactScore     TEXT,
  stored_name     TEXT,
  filename        TEXT,
  mime            TEXT,
  size            INTEGER,
  created_at      TEXT NOT NULL
);
`);

// Migración: convierte los ids históricos de propuestas a los temas generales
// (nuevo sistema de "eje legislativo" del Despacho).
const LEGACY_AXIS_MAP: Record<string, string> = {
  'pagos-servicios-ambientales': 'ambiente',
  'tramites-ambientales-fast-track': 'ambiente',
  'areas-protegidas-incentivos': 'ambiente',
  'desarrollo-rural-jovenes': 'rural',
  'agua-energia': 'agua',
};
{
  const legacyBills = db.prepare("SELECT id, proposalIdRelated FROM bills WHERE proposalIdRelated IN ('pagos-servicios-ambientales','tramites-ambientales-fast-track','areas-protegidas-incentivos','desarrollo-rural-jovenes','agua-energia')").all() as { id: number; proposalIdRelated: string }[];
  const upd = db.prepare('UPDATE bills SET proposalIdRelated = ? WHERE id = ?');
  for (const row of legacyBills) upd.run(LEGACY_AXIS_MAP[row.proposalIdRelated] ?? 'general', row.id);
  if (legacyBills.length) console.log(`[db] ejes legislativos migrados a temas generales (${legacyBills.length}).`);
}

// Tabla de respaldos ciudadanos a los proyectos de ley.
db.exec(`
CREATE TABLE IF NOT EXISTS bill_supports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id    INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (bill_id, email)
);
`);

/* ------------------------------------------------------------------ */
/* Radicados                                                          */
/* ------------------------------------------------------------------ */

export interface SubmissionRow {
  id: string;
  firstName_enc: string | null;
  lastName_enc: string | null;
  email_enc: string | null;
  phone_enc: string | null;
  type: string;
  proposalId: string;
  categoryName: string | null;
  description: string;
  description_enc: string | null;
  status: string;
  ai_response: string | null;
  ai_response_enc: string | null;
  created_at: string;
  updated_at: string;
  email_sent: number;
  despacho_notified: number;
  anonymized: number;
}

/** Lee el contenido del radicado descifrado (prefiere *_enc, respalda en texto plano pre-migración). */
export function submissionDescription(row: SubmissionRow): string {
  if (row.description_enc) {
    const d = decrypt(row.description_enc);
    if (d !== null && d !== undefined) return d;
  }
  return row.description || '';
}

/** Lee la respuesta del despacho descifrada (prefiere *_enc, respalda en texto plano pre-migración). */
export function submissionAiResponse(row: SubmissionRow): string | null {
  if (row.ai_response_enc) {
    const d = decrypt(row.ai_response_enc);
    if (d !== null && d !== undefined) return d;
  }
  return row.ai_response || null;
}

export interface PublicTrack {
  id: string;
  type: string;
  categoryName: string | null;
  status: string;
  description: string;
  aiResponse: string | null;
  createdAt: string;
  updatedAt: string;
  anonymized: boolean;
}

export function insertSubmission(data: {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type: string;
  proposalId: string;
  categoryName?: string;
  description: string;
  status?: string;
  aiResponse?: string;
  createdAt?: string;
}): SubmissionRow {
  const now = data.createdAt || new Date().toISOString();
  db.prepare(
    `INSERT INTO submissions
       (id, firstName_enc, lastName_enc, email_enc, phone_enc, type, proposalId,
        categoryName, description, description_enc, status, ai_response, ai_response_enc, created_at, updated_at)
     VALUES (@id, @fn, @ln, @em, @ph, @type, @proposalId, @categoryName,
        '', @desc_enc, @status, NULL, @ai_enc, @created_at, @updated_at)`
  ).run({
    id: data.id,
    fn: encrypt(data.firstName),
    ln: encrypt(data.lastName),
    em: encrypt(data.email),
    ph: encrypt(data.phone),
    type: data.type,
    proposalId: data.proposalId,
    categoryName: data.categoryName || null,
    desc_enc: encrypt(data.description),
    status: data.status || 'Radicado',
    ai_enc: data.aiResponse ? encrypt(data.aiResponse) : null,
    created_at: now,
    updated_at: now,
  });
  return getSubmissionById(data.id)!;
}

export function markEmailsSent(id: string, citizen = false, despacho = false): void {
  db.prepare(
    `UPDATE submissions SET email_sent = CASE WHEN @c THEN 1 ELSE email_sent END,
       despacho_notified = CASE WHEN @d THEN 1 ELSE despacho_notified END,
       updated_at = @now WHERE id = @id`
  ).run({ id, c: citizen ? 1 : 0, d: despacho ? 1 : 0, now: new Date().toISOString() });
}

export function getSubmissionById(id: string): SubmissionRow | undefined {
  return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as SubmissionRow | undefined;
}

export function listSubmissions(opts: {
  status?: string;
  type?: string;
  proposalId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): SubmissionRow[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.status) { where.push('status = @status'); params.status = opts.status; }
  if (opts.type) { where.push('type = @type'); params.type = opts.type; }
  if (opts.proposalId) { where.push('proposalId = @proposalId'); params.proposalId = opts.proposalId; }
  if (opts.q && opts.q.trim()) {
    where.push('(id LIKE @q OR categoryName LIKE @q OR type LIKE @q OR proposalId LIKE @q)');
    params.q = `%${opts.q.trim()}%`;
  }
  const sql =
    `SELECT * FROM submissions ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY created_at DESC LIMIT @limit OFFSET @offset`;
  params.limit = opts.limit ?? 100;
  params.offset = opts.offset ?? 0;
  return db.prepare(sql).all(params) as SubmissionRow[];
}

export function countSubmissions(opts: { status?: string; type?: string; proposalId?: string; q?: string }): number {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.status) { where.push('status = @status'); params.status = opts.status; }
  if (opts.type) { where.push('type = @type'); params.type = opts.type; }
  if (opts.proposalId) { where.push('proposalId = @proposalId'); params.proposalId = opts.proposalId; }
  if (opts.q && opts.q.trim()) {
    where.push('(id LIKE @q OR categoryName LIKE @q OR type LIKE @q OR proposalId LIKE @q)');
    params.q = `%${opts.q.trim()}%`;
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM submissions ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`)
    .get(params) as { n: number };
  return row.n;
}

export function updateSubmissionStatus(id: string, status: string): void {
  db.prepare('UPDATE submissions SET status = @status, updated_at = @now WHERE id = @id').run({
    id,
    status,
    now: new Date().toISOString(),
  });
}

export function setSubmissionResponse(id: string, response: string): void {
  db.prepare('UPDATE submissions SET ai_response = NULL, ai_response_enc = @r, updated_at = @now WHERE id = @id').run({
    id,
    r: encrypt(response),
    now: new Date().toISOString(),
  });
}

export function anonymizeSubmission(id: string): void {
  db.prepare(
    `UPDATE submissions SET firstName_enc = NULL, lastName_enc = NULL,
       email_enc = NULL, phone_enc = NULL, anonymized = 1, updated_at = @now
     WHERE id = @id`
  ).run({ id, now: new Date().toISOString() });
}

export function deleteSubmission(id: string): void {
  const docs = listDocuments(id);
  for (const doc of docs) {
    fs.rm(path.join(UPLOADS_PQRS, doc.stored_name), { force: true }, () => {});
  }
  db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
}

/* ------------------------------------------------------------------ */
/* Adjuntos                                                           */
/* ------------------------------------------------------------------ */

export interface DocumentRow {
  id: number;
  submission_id: string;
  filename: string;
  stored_name: string;
  mime: string;
  size: number;
  created_at: string;
}

export function insertDocument(doc: Omit<DocumentRow, 'id' | 'created_at'>): void {
  db.prepare(
    `INSERT INTO documents (submission_id, filename, stored_name, mime, size, created_at)
     VALUES (@submission_id, @filename, @stored_name, @mime, @size, @created_at)`
  ).run({ ...doc, created_at: new Date().toISOString() });
}

export function listDocuments(submissionId: string): DocumentRow[] {
  return db.prepare('SELECT * FROM documents WHERE submission_id = ? ORDER BY id').all(submissionId) as DocumentRow[];
}

export function getDocumentById(id: number): DocumentRow | undefined {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined;
}

/* ------------------------------------------------------------------ */
/* Proyectos de ley                                                   */
/* ------------------------------------------------------------------ */

export interface BillRow {
  id: number;
  title: string;
  number: string;
  dateFiled: string | null;
  status: string;
  stageDescription: string | null;
  summary: string | null;
  proposalIdRelated: string | null;
  authors: string | null;
  initiatives: string | null;
  impactScore: string | null;
  stored_name: string | null;
  filename: string | null;
  mime: string | null;
  size: number | null;
  created_at: string;
}

export function insertBill(data: {
  title: string;
  number: string;
  dateFiled?: string;
  status?: string;
  stageDescription?: string;
  summary?: string;
  proposalIdRelated?: string;
  authors?: string[];
  initiatives?: string[];
  impactScore?: string;
  stored_name?: string;
  filename?: string;
  mime?: string;
  size?: number;
}): void {
  db.prepare(
    `INSERT INTO bills
     (title, number, dateFiled, status, stageDescription, summary, proposalIdRelated,
      authors, initiatives, impactScore, stored_name, filename, mime, size, created_at)
     VALUES (@title, @number, @dateFiled, @status, @stageDescription, @summary,
      @proposalIdRelated, @authors, @initiatives, @impactScore, @stored_name, @filename,
      @mime, @size, @created_at)`
  ).run({
    title: data.title,
    number: data.number,
    dateFiled: data.dateFiled || null,
    status: data.status || 'Radicado',
    stageDescription: data.stageDescription || null,
    summary: data.summary || null,
    proposalIdRelated: data.proposalIdRelated || null,
    authors: data.authors ? JSON.stringify(data.authors) : null,
    initiatives: data.initiatives ? JSON.stringify(data.initiatives) : null,
    impactScore: data.impactScore || null,
    stored_name: data.stored_name || null,
    filename: data.filename || null,
    mime: data.mime || null,
    size: data.size || null,
    created_at: new Date().toISOString(),
  });
}

export function listBills(): BillRow[] {
  return db.prepare('SELECT * FROM bills ORDER BY created_at DESC').all() as BillRow[];
}

export function getBillById(id: number): BillRow | undefined {
  return db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as BillRow | undefined;
}

export function updateBill(id: number, data: {
  status?: string;
  stageDescription?: string;
  proposalIdRelated?: string;
  impactScore?: string;
  title?: string;
  number?: string;
  dateFiled?: string;
  summary?: string;
  authors?: string[];
  initiatives?: string[];
}): BillRow | undefined {
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (data.status !== undefined) { sets.push('status = @status'); params.status = data.status; }
  if (data.stageDescription !== undefined) { sets.push('stageDescription = @stageDescription'); params.stageDescription = data.stageDescription; }
  if (data.proposalIdRelated !== undefined) { sets.push('proposalIdRelated = @proposalIdRelated'); params.proposalIdRelated = data.proposalIdRelated; }
  if (data.impactScore !== undefined) { sets.push('impactScore = @impactScore'); params.impactScore = data.impactScore; }
  if (data.title !== undefined) { sets.push('title = @title'); params.title = data.title; }
  if (data.number !== undefined) { sets.push('number = @number'); params.number = data.number; }
  if (data.dateFiled !== undefined) { sets.push('dateFiled = @dateFiled'); params.dateFiled = data.dateFiled; }
  if (data.summary !== undefined) { sets.push('summary = @summary'); params.summary = data.summary; }
  if (data.authors !== undefined) { sets.push('authors = @authors'); params.authors = JSON.stringify(data.authors); }
  if (data.initiatives !== undefined) { sets.push('initiatives = @initiatives'); params.initiatives = JSON.stringify(data.initiatives); }
  if (sets.length === 0) return getBillById(id);
  db.prepare(`UPDATE bills SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getBillById(id);
}

export function deleteBill(id: number): void {
  const bill = getBillById(id);
  if (bill?.stored_name) {
    fs.rm(path.join(UPLOADS_BILLS, bill.stored_name), { force: true }, () => {});
  }
  db.prepare('DELETE FROM bills WHERE id = ?').run(id);
}

/* ------------------------------------------------------------------ */
/* Respaldos ciudadanos a proyectos de ley                            */
/* ------------------------------------------------------------------ */

export interface BillSupportRow {
  id: number;
  bill_id: number;
  name: string;
  email: string;
  created_at: string;
}

/** Registra un respaldo. Devuelve null si el ciudadano ya apoyó ese proyecto (dedupe por email+bill). */
export function insertBillSupport(data: { billId: number; name: string; email: string }): BillSupportRow | null {
  const existing = db.prepare('SELECT id FROM bill_supports WHERE bill_id = ? AND email = ?').get(data.billId, data.email);
  if (existing) return null;
  const res = db
    .prepare('INSERT INTO bill_supports (bill_id, name, email, created_at) VALUES (?, ?, ?, ?)')
    .run(data.billId, data.name, data.email, new Date().toISOString());
  return db.prepare('SELECT * FROM bill_supports WHERE id = ?').get(Number(res.lastInsertRowid)) as BillSupportRow;
}

export function countBillSupports(billId: number): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM bill_supports WHERE bill_id = ?').get(billId) as { n: number };
  return row?.n ?? 0;
}

export function listBillSupports(billId: number): BillSupportRow[] {
  return db.prepare('SELECT * FROM bill_supports WHERE bill_id = ? ORDER BY created_at DESC').all(billId) as BillSupportRow[];
}

export function hasBillSupport(billId: number, email: string): boolean {
  return Boolean(db.prepare('SELECT 1 FROM bill_supports WHERE bill_id = ? AND email = ?').get(billId, email));
}

/** Anonimiza automáticamente radicados sin tocar por más de N días (retención). */
export function autoAnonymizeOlderThan(days: number): number {
  if (days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const pending = db
    .prepare('SELECT id FROM submissions WHERE anonymized = 0 AND updated_at < @cutoff')
    .all({ cutoff }) as { id: string }[];
  for (const row of pending) anonymizeSubmission(row.id);
  return pending.length;
}

/* ------------------------------------------------------------------ */
/* Cierre de periodo legislativo (punto 1)                            */
/* ------------------------------------------------------------------ */

function getMeta(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

function setMeta(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
}

/**
 * Al llegar el fin del periodo legislativo (PERIOD_END_DATE) anonimiza TODO
 * lo radicado (conserva radicado y contenido cifrado) y borra los adjuntos.
 * Retorna cuántos radicados se anonimizaron (0 si ya se aplicó o no corresponde).
 */
export function purgePeriodEnd(periodEnd: string | undefined | null): number {
  if (!periodEnd) return 0;
  const end = new Date(periodEnd);
  if (isNaN(end.getTime()) || Date.now() < end.getTime()) return 0;
  if (getMeta('period_purged') === new Date(periodEnd).toISOString()) return 0;

  const rows = db.prepare('SELECT id FROM submissions WHERE anonymized = 0').all() as { id: string }[];
  for (const row of rows) {
    anonymizeSubmission(row.id);
    for (const doc of listDocuments(row.id)) {
      fs.rm(path.join(UPLOADS_PQRS, doc.stored_name), { force: true }, () => {});
    }
    db.prepare('DELETE FROM documents WHERE submission_id = ?').run(row.id);
  }
  if (rows.length > 0) {
    console.log(`[cierre de periodo] ${rows.length} radicado(s) anonimizado(s) y adjuntos eliminados.`);
  }
  setMeta('period_purged', new Date(periodEnd).toISOString());
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Usuarios del Despacho (auth por email + clave)                     */
/* ------------------------------------------------------------------ */

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  is_active: number;
  created_at: string;
}

export type PublicAdminUser = Omit<AdminUserRow, 'password_hash'>;

const BCRYPT_ROUNDS = 12;

export function createUser(data: { name: string; email: string; password: string }): PublicAdminUser {
  const email = data.email.trim().toLowerCase();
  const hash = bcrypt.hashSync(data.password, BCRYPT_ROUNDS);
  const info = db
    .prepare('INSERT INTO admin_users (name, email, password_hash, is_active, created_at) VALUES (?, ?, ?, 1, ?)')
    .run(data.name.trim(), email, hash, new Date().toISOString());
  const row = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(info.lastInsertRowid) as AdminUserRow;
  return toPublicUser(row);
}

function toPublicUser(row: AdminUserRow): PublicAdminUser {
  return { id: row.id, name: row.name, email: row.email, is_active: row.is_active, created_at: row.created_at };
}

export function getUserByEmail(email: string): AdminUserRow | undefined {
  return db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email.trim().toLowerCase()) as AdminUserRow | undefined;
}

export function getUserById(id: number): AdminUserRow | undefined {
  return db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id) as AdminUserRow | undefined;
}

export function verifyUserCredential(email: string, password: string): AdminUserRow | null {
  const user = getUserByEmail(email);
  if (!user || user.is_active !== 1) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

export function listUsers(): PublicAdminUser[] {
  return (db.prepare('SELECT id, name, email, is_active, created_at FROM admin_users ORDER BY created_at').all() as PublicAdminUser[]);
}

export function setUserActive(id: number, isActive: boolean): void {
  db.prepare('UPDATE admin_users SET is_active = @a WHERE id = @id').run({ id, a: isActive ? 1 : 0 });
}

export function setUserPassword(id: number, password: string): void {
  db.prepare('UPDATE admin_users SET password_hash = @h WHERE id = @id').run({ id, h: bcrypt.hashSync(password, BCRYPT_ROUNDS) });
}

export function deleteUser(id: number): void {
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
}

/* ------------------------------------------------------------------ */
/* Auditoría                                                          */
/* ------------------------------------------------------------------ */

export interface AuditRow {
  id: number;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

export interface PublicAuditEntry {
  id: number;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  createdAt: string;
}

export function audit(
  adminEmail: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown> | string
): void {
  try {
    db.prepare(
      `INSERT INTO audit_log (admin_email, action, target_type, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      adminEmail,
      action,
      targetType || null,
      targetId || null,
      typeof details === 'string' ? details : details ? JSON.stringify(details) : null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('[audit] No se pudo registrar:', err);
  }
}

export function listAuditLog(opts: { limit?: number; offset?: number; q?: string }): PublicAuditEntry[] {
  const params: Record<string, unknown> = {};
  let where = '';
  if (opts.q && opts.q.trim()) {
    where = 'WHERE (admin_email LIKE @q OR action LIKE @q OR target_id LIKE @q)';
    params.q = `%${opts.q.trim()}%`;
  }
  params.limit = Math.min(opts.limit ?? 100, 300);
  params.offset = opts.offset ?? 0;
  const rows = db
    .prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
    .all(params) as AuditRow[];
  return rows.map((r) => ({
    id: r.id,
    adminEmail: r.admin_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    details: r.details,
    createdAt: r.created_at,
  }));
}

export function countAuditLog(opts: { q?: string }): number {
  let where = '';
  const params: Record<string, unknown> = {};
  if (opts.q && opts.q.trim()) {
    where = 'WHERE (admin_email LIKE @q OR action LIKE @q OR target_id LIKE @q)';
    params.q = `%${opts.q.trim()}%`;
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM audit_log ${where}`)
    .get(params) as { n: number };
  return row.n;
}