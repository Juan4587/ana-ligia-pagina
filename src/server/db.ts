/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Capa de datos PostgreSQL para el módulo PQRSD.
 * Guarda radicados, adjuntos, proyectos de ley, usuarios del Despacho y auditoría.
 * Datos personales y contenido cifrados (AES-256-GCM).
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pool from './pg.js';
import { encrypt, decrypt } from './crypto.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const UPLOADS_PQRS = path.join(DATA_DIR, 'uploads', 'pqrs');
const UPLOADS_BILLS = path.join(DATA_DIR, 'uploads', 'bills');
const UPLOADS_BLOG = path.join(DATA_DIR, 'uploads', 'blog');

fs.mkdirSync(UPLOADS_PQRS, { recursive: true });
fs.mkdirSync(UPLOADS_BILLS, { recursive: true });
fs.mkdirSync(UPLOADS_BLOG, { recursive: true });

export const uploadsPqrsDir = UPLOADS_PQRS;
export const uploadsBillsDir = UPLOADS_BILLS;
export const uploadsBlogDir = UPLOADS_BLOG;

/* ------------------------------------------------------------------ */
/* Schema PostgreSQL                                                   */
/* ------------------------------------------------------------------ */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS submissions (
  id              TEXT PRIMARY KEY,
  firstName_enc   TEXT,
  lastName_enc    TEXT,
  email_enc       TEXT,
  phone_enc       TEXT,
  type            TEXT NOT NULL,
  proposalId      TEXT NOT NULL,
  categoryName    TEXT,
  description     TEXT NOT NULL,
  description_enc TEXT,
  status          TEXT NOT NULL DEFAULT 'Radicado',
  ai_response     TEXT,
  ai_response_enc TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  email_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  despacho_notified BOOLEAN NOT NULL DEFAULT FALSE,
  anonymized      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS _migrations (
  name    TEXT PRIMARY KEY,
  applied TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id                SERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  number            TEXT NOT NULL,
  dateFiled         TEXT,
  status            TEXT NOT NULL DEFAULT 'Radicado',
  stageDescription  TEXT,
  summary           TEXT,
  proposalIdRelated TEXT,
  authors           TEXT,
  initiatives       TEXT,
  impactScore       TEXT,
  stored_name       TEXT,
  filename          TEXT,
  mime              TEXT,
  size              INTEGER,
  tipoGestion       TEXT NOT NULL DEFAULT 'Proyecto de Ley',
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_supports (
  id         SERIAL PRIMARY KEY,
  bill_id    INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (bill_id, email)
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  excerpt     TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL,
  date        TEXT NOT NULL,
  image       TEXT,
  author      TEXT NOT NULL,
  tags        TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'blog-sidebar',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL
);
`;

async function initSchema() {
  await pool.query(SCHEMA);

  // Migración puntual: columna tipoGestion en bases creadas antes del cambio.
  const hasTipo = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'tipogestion'`
  );
  if (!hasTipo.rows[0]) {
    await pool.query(`ALTER TABLE bills ADD COLUMN tipogestion TEXT NOT NULL DEFAULT 'Proyecto de Ley'`);
    console.log('[db] Columna bills.tipogestion agregada.');
  }

  // Migración puntual: columna active en newsletter_subscribers si la tabla ya existía sin ella.
  const hasNlActive = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'newsletter_subscribers' AND column_name = 'active'`
  );
  if (!hasNlActive.rows[0]) {
    await pool.query(`ALTER TABLE newsletter_subscribers ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE`);
    console.log('[db] Columna newsletter_subscribers.active agregada.');
  }

  // Migración puntual: unificar ponencias en bills (enfoque b) y dropear tabla duplicada.
  const hasPonencias = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'ponencias'`
  );
  if (hasPonencias.rows[0]) {
    const { rowCount } = await pool.query(`
      INSERT INTO bills (title, number, datefiled, status, stagedescription, summary,
                         authors, initiatives, tipogestion, created_at)
      SELECT
        t.title,
        t.pref || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY t.pref ORDER BY t.date))::text, 3, '0'),
        t.date,
        t.status,
        t.shortdescription,
        t.description,
        t.authors_json,
        t.acts,
        t.type,
        t.created_at
      FROM (
        SELECT p.*,
          CASE p.type
            WHEN 'Ponencia' THEN 'PN'
            WHEN 'Proposición' THEN 'PP'
            WHEN 'Proyecto de Ley' THEN 'PL'
            WHEN 'Moción' THEN 'MO'
            ELSE 'OT'
          END AS pref,
          CASE WHEN btrim(COALESCE(p.author, '')) <> ''
               THEN JSON_BUILD_ARRAY(p.author)::text
          END AS authors_json
        FROM ponencias p
      ) t
    `);
    await pool.query(`DROP TABLE ponencias`);
    console.log(`[db] Migración ponencias → bills: ${rowCount ?? 0} fila(s); tabla ponencias eliminada.`);
  }

  // Migrar columnas boolean de INTEGER a BOOLEAN nativo si es necesario.
  // Se dropea el DEFAULT antiguo (0/1) antes de cambiar el tipo, luego se restaura el DEFAULT boolean.
  const boolCols = [
    { table: 'submissions', col: 'email_sent', oldDefault: '0', newDefault: 'FALSE' },
    { table: 'submissions', col: 'despacho_notified', oldDefault: '0', newDefault: 'FALSE' },
    { table: 'submissions', col: 'anonymized', oldDefault: '0', newDefault: 'FALSE' },
    { table: 'admin_users', col: 'is_active', oldDefault: '1', newDefault: 'TRUE' },
  ];
  for (const { table, col, newDefault } of boolCols) {
    const { rows } = await pool.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, col]
    );
    if (rows[0]?.data_type === 'integer') {
      await pool.query(`ALTER TABLE ${table} ALTER COLUMN ${col} DROP DEFAULT`);
      await pool.query(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE BOOLEAN USING ${col}::boolean`);
      await pool.query(`ALTER TABLE ${table} ALTER COLUMN ${col} SET DEFAULT ${newDefault}`);
      console.log(`[db] Migrado ${table}.${col} de INTEGER a BOOLEAN.`);
    }
  }

  console.log('[db] Esquema PostgreSQL inicializado.');
}

/* ------------------------------------------------------------------ */
/* Ejecutar schema al importar                                         */
/* ------------------------------------------------------------------ */

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      console.error('[db] Error al inicializar esquema:', err);
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

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
  email_sent: boolean;
  despacho_notified: boolean;
  anonymized: boolean;
}

export function submissionDescription(row: SubmissionRow): string {
  if (row.description_enc) {
    const d = decrypt(row.description_enc);
    if (d !== null && d !== undefined) return d;
  }
  return row.description || '';
}

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

export async function insertSubmission(data: {
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
}): Promise<SubmissionRow> {
  const now = data.createdAt || new Date().toISOString();
  await pool.query(
    `INSERT INTO submissions
       (id, firstName_enc, lastName_enc, email_enc, phone_enc, type, proposalId,
        categoryName, description, description_enc, status, ai_response, ai_response_enc, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      data.id,
      encrypt(data.firstName),
      encrypt(data.lastName),
      encrypt(data.email),
      encrypt(data.phone),
      data.type,
      data.proposalId,
      data.categoryName || null,
      '',
      encrypt(data.description),
      data.status || 'Radicado',
      null,
      data.aiResponse ? encrypt(data.aiResponse) : null,
      now,
      now,
    ]
  );
  return (await getSubmissionById(data.id))!;
}

export async function markEmailsSent(id: string, citizen = false, despacho = false): Promise<void> {
  await pool.query(
    `UPDATE submissions SET
       email_sent = CASE WHEN $2 THEN TRUE ELSE email_sent END,
       despacho_notified = CASE WHEN $3 THEN TRUE ELSE despacho_notified END,
       updated_at = $4
     WHERE id = $1`,
    [id, citizen, despacho, new Date().toISOString()]
  );
}

export async function getSubmissionById(id: string): Promise<SubmissionRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
  return rows[0] as SubmissionRow | undefined;
}

export async function listSubmissions(opts: {
  status?: string;
  type?: string;
  proposalId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<SubmissionRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (opts.status) { where.push(`status = $${idx++}`); params.push(opts.status); }
  if (opts.type) { where.push(`type = $${idx++}`); params.push(opts.type); }
  if (opts.proposalId) { where.push(`proposalId = $${idx++}`); params.push(opts.proposalId); }
  if (opts.q && opts.q.trim()) {
    where.push(`(id LIKE $${idx} OR categoryName LIKE $${idx} OR type LIKE $${idx} OR proposalId LIKE $${idx})`);
    params.push(`%${opts.q.trim()}%`);
    idx++;
  }
  params.push(opts.limit ?? 100);
  params.push(opts.offset ?? 0);
  const sql = `SELECT * FROM submissions ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  const { rows } = await pool.query(sql, params);
  return rows as SubmissionRow[];
}

export async function countSubmissions(opts: { status?: string; type?: string; proposalId?: string; q?: string }): Promise<number> {
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (opts.status) { where.push(`status = $${idx++}`); params.push(opts.status); }
  if (opts.type) { where.push(`type = $${idx++}`); params.push(opts.type); }
  if (opts.proposalId) { where.push(`proposalId = $${idx++}`); params.push(opts.proposalId); }
  if (opts.q && opts.q.trim()) {
    where.push(`(id LIKE $${idx} OR categoryName LIKE $${idx} OR type LIKE $${idx} OR proposalId LIKE $${idx})`);
    params.push(`%${opts.q.trim()}%`);
    idx++;
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS n FROM submissions ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
    params
  );
  return Number(rows[0].n);
}

export async function updateSubmissionStatus(id: string, status: string): Promise<void> {
  await pool.query(
    'UPDATE submissions SET status = $2, updated_at = $3 WHERE id = $1',
    [id, status, new Date().toISOString()]
  );
}

export async function setSubmissionResponse(id: string, response: string): Promise<void> {
  await pool.query(
    'UPDATE submissions SET ai_response = NULL, ai_response_enc = $2, updated_at = $3 WHERE id = $1',
    [id, encrypt(response), new Date().toISOString()]
  );
}

export async function anonymizeSubmission(id: string): Promise<void> {
  await pool.query(
    `UPDATE submissions SET firstName_enc = NULL, lastName_enc = NULL,
       email_enc = NULL, phone_enc = NULL, anonymized = TRUE, updated_at = $2
     WHERE id = $1`,
    [id, new Date().toISOString()]
  );
}

export async function deleteSubmission(id: string): Promise<void> {
  const docs = await listDocuments(id);
  for (const doc of docs) {
    fs.rm(path.join(UPLOADS_PQRS, doc.stored_name), { force: true }, () => {});
  }
  await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
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

export async function insertDocument(doc: Omit<DocumentRow, 'id' | 'created_at'>): Promise<void> {
  await pool.query(
    `INSERT INTO documents (submission_id, filename, stored_name, mime, size, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [doc.submission_id, doc.filename, doc.stored_name, doc.mime, doc.size, new Date().toISOString()]
  );
}

export async function listDocuments(submissionId: string): Promise<DocumentRow[]> {
  const { rows } = await pool.query('SELECT * FROM documents WHERE submission_id = $1 ORDER BY id', [submissionId]);
  return rows as DocumentRow[];
}

export async function getDocumentById(id: number): Promise<DocumentRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
  return rows[0] as DocumentRow | undefined;
}

/* ------------------------------------------------------------------ */
/* Proyectos de ley                                                   */
/* ------------------------------------------------------------------ */

export interface BillRow {
  id: number;
  title: string;
  number: string;
  datefiled: string | null;
  status: string;
  stagedescription: string | null;
  summary: string | null;
  proposalidrelated: string | null;
  authors: string | null;
  initiatives: string | null;
  impactscore: string | null;
  stored_name: string | null;
  filename: string | null;
  mime: string | null;
  size: number | null;
  tipogestion: string;
  created_at: string;
}

export async function insertBill(data: {
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
  tipoGestion?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO bills
     (title, number, datefiled, status, stagedescription, summary, proposalidrelated,
      authors, initiatives, impactscore, stored_name, filename, mime, size, tipogestion, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      data.title,
      data.number,
      data.dateFiled || null,
      data.status || 'Radicado',
      data.stageDescription || null,
      data.summary || null,
      data.proposalIdRelated || null,
      data.authors ? JSON.stringify(data.authors) : null,
      data.initiatives ? JSON.stringify(data.initiatives) : null,
      data.impactScore || null,
      data.stored_name || null,
      data.filename || null,
      data.mime || null,
      data.size || null,
      data.tipoGestion || 'Proyecto de Ley',
      new Date().toISOString(),
    ]
  );
}

export async function listBills(): Promise<BillRow[]> {
  const { rows } = await pool.query('SELECT * FROM bills ORDER BY created_at DESC, id DESC');
  return rows as BillRow[];
}

export async function getBillById(id: number): Promise<BillRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM bills WHERE id = $1', [id]);
  return rows[0] as BillRow | undefined;
}

export async function updateBill(id: number, data: {
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
  tipoGestion?: string;
}): Promise<BillRow | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.status !== undefined) { sets.push(`status = $${idx++}`); params.push(data.status); }
  if (data.stageDescription !== undefined) { sets.push(`stagedescription = $${idx++}`); params.push(data.stageDescription); }
  if (data.proposalIdRelated !== undefined) { sets.push(`proposalidrelated = $${idx++}`); params.push(data.proposalIdRelated); }
  if (data.impactScore !== undefined) { sets.push(`impactscore = $${idx++}`); params.push(data.impactScore); }
  if (data.title !== undefined) { sets.push(`title = $${idx++}`); params.push(data.title); }
  if (data.number !== undefined) { sets.push(`number = $${idx++}`); params.push(data.number); }
  if (data.dateFiled !== undefined) { sets.push(`datefiled = $${idx++}`); params.push(data.dateFiled); }
  if (data.summary !== undefined) { sets.push(`summary = $${idx++}`); params.push(data.summary); }
  if (data.authors !== undefined) { sets.push(`authors = $${idx++}`); params.push(JSON.stringify(data.authors)); }
  if (data.initiatives !== undefined) { sets.push(`initiatives = $${idx++}`); params.push(JSON.stringify(data.initiatives)); }
  if (data.tipoGestion !== undefined) { sets.push(`tipogestion = $${idx++}`); params.push(data.tipoGestion); }
  if (sets.length === 0) return getBillById(id);
  params.push(id);
  await pool.query(`UPDATE bills SET ${sets.join(', ')} WHERE id = $${idx}`, params);
  return getBillById(id);
}

export async function deleteBill(id: number): Promise<void> {
  const bill = await getBillById(id);
  if (bill?.stored_name) {
    fs.rm(path.join(UPLOADS_BILLS, bill.stored_name), { force: true }, () => {});
  }
  await pool.query('DELETE FROM bills WHERE id = $1', [id]);
}

/* ------------------------------------------------------------------ */
/* Cierre de periodo legislativo                                      */
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

export async function insertBillSupport(data: { billId: number; name: string; email: string }): Promise<BillSupportRow | null> {
  const existing = await pool.query('SELECT id FROM bill_supports WHERE bill_id = $1 AND email = $2', [data.billId, data.email]);
  if (existing.rows[0]) return null;
  const { rows } = await pool.query(
    'INSERT INTO bill_supports (bill_id, name, email, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.billId, data.name, data.email, new Date().toISOString()]
  );
  return rows[0] as BillSupportRow;
}

export async function countBillSupports(billId: number): Promise<number> {
  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM bill_supports WHERE bill_id = $1', [billId]);
  return Number(rows[0]?.n ?? 0);
}

export async function listBillSupports(billId: number): Promise<BillSupportRow[]> {
  const { rows } = await pool.query('SELECT * FROM bill_supports WHERE bill_id = $1 ORDER BY created_at DESC', [billId]);
  return rows as BillSupportRow[];
}

export async function hasBillSupport(billId: number, email: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM bill_supports WHERE bill_id = $1 AND email = $2', [billId, email]);
  return rows.length > 0;
}

/* ------------------------------------------------------------------ */
/* Newsletter                                                          */
/* ------------------------------------------------------------------ */

export interface NewsletterSubscriberRow {
  id: number;
  email: string;
  source: string;
  active: boolean;
  created_at: string;
}

export interface InsertNewsletterResult {
  row: NewsletterSubscriberRow;
  already: boolean;
}

export async function insertNewsletterSubscriber(
  email: string,
  source = 'blog-sidebar'
): Promise<InsertNewsletterResult> {
  const clean = email.trim().toLowerCase();
  const existing = await pool.query(
    'SELECT * FROM newsletter_subscribers WHERE email = $1',
    [clean]
  );
  if (existing.rows[0]) {
    const row = existing.rows[0] as NewsletterSubscriberRow;
    if (!row.active) {
      const updated = await pool.query(
        'UPDATE newsletter_subscribers SET active = TRUE WHERE email = $1 RETURNING *',
        [clean]
      );
      return { row: updated.rows[0] as NewsletterSubscriberRow, already: false };
    }
    return { row, already: true };
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO newsletter_subscribers (email, source, active, created_at) VALUES ($1, $2, TRUE, $3) RETURNING *',
      [clean, source, new Date().toISOString()]
    );
    return { row: rows[0] as NewsletterSubscriberRow, already: false };
  } catch (err: unknown) {
    // Carrera con UNIQUE: otro insert paralelo ganó — éxito idempotente.
    if ((err as { code?: string })?.code === '23505') {
      const again = await pool.query('SELECT * FROM newsletter_subscribers WHERE email = $1', [clean]);
      return { row: again.rows[0] as NewsletterSubscriberRow, already: true };
    }
    throw err;
  }
}

export async function countNewsletterSubscribers(): Promise<number> {
  const { rows } = await pool.query(
    'SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE active = TRUE'
  );
  return Number(rows[0]?.n ?? 0);
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriberRow[]> {
  const { rows } = await pool.query(
    'SELECT * FROM newsletter_subscribers ORDER BY created_at DESC'
  );
  return rows as NewsletterSubscriberRow[];
}

export async function autoAnonymizeOlderThan(days: number): Promise<number> {
  if (days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { rows } = await pool.query(
    'SELECT id FROM submissions WHERE anonymized = FALSE AND updated_at < $1',
    [cutoff]
  );
  for (const row of rows) await anonymizeSubmission(row.id);
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Cierre de periodo legislativo                                      */
/* ------------------------------------------------------------------ */

async function getMeta(key: string): Promise<string | undefined> {
  const { rows } = await pool.query('SELECT value FROM meta WHERE key = $1', [key]);
  return rows[0]?.value as string | undefined;
}

async function setMeta(key: string, value: string): Promise<void> {
  await pool.query(
    'INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
}

export async function purgePeriodEnd(periodEnd: string | undefined | null): Promise<number> {
  if (!periodEnd) return 0;
  const end = new Date(periodEnd);
  if (isNaN(end.getTime()) || Date.now() < end.getTime()) return 0;
  if ((await getMeta('period_purged')) === new Date(periodEnd).toISOString()) return 0;

  const { rows } = await pool.query('SELECT id FROM submissions WHERE anonymized = FALSE');
  for (const row of rows) {
    await anonymizeSubmission(row.id);
    const docs = await listDocuments(row.id);
    for (const doc of docs) {
      fs.rm(path.join(UPLOADS_PQRS, doc.stored_name), { force: true }, () => {});
    }
    await pool.query('DELETE FROM documents WHERE submission_id = $1', [row.id]);
  }
  if (rows.length > 0) {
    console.log(`[cierre de periodo] ${rows.length} radicado(s) anonimizado(s) y adjuntos eliminados.`);
  }
  await setMeta('period_purged', new Date(periodEnd).toISOString());
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Usuarios del Despacho                                              */
/* ------------------------------------------------------------------ */

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
}

export type PublicAdminUser = Omit<AdminUserRow, 'password_hash'>;

const BCRYPT_ROUNDS = 12;

function toPublicUser(row: AdminUserRow): PublicAdminUser {
  return { id: row.id, name: row.name, email: row.email, is_active: row.is_active, created_at: row.created_at };
}

export async function createUser(data: { name: string; email: string; password: string }): Promise<PublicAdminUser> {
  const email = data.email.trim().toLowerCase();
  const hash = bcrypt.hashSync(data.password, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    'INSERT INTO admin_users (name, email, password_hash, is_active, created_at) VALUES ($1, $2, $3, TRUE, $4) RETURNING *',
    [data.name.trim(), email, hash, new Date().toISOString()]
  );
  return toPublicUser(rows[0] as AdminUserRow);
}

export async function getUserByEmail(email: string): Promise<AdminUserRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email.trim().toLowerCase()]);
  return rows[0] as AdminUserRow | undefined;
}

export async function getUserById(id: number): Promise<AdminUserRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM admin_users WHERE id = $1', [id]);
  return rows[0] as AdminUserRow | undefined;
}

export async function verifyUserCredential(email: string, password: string): Promise<AdminUserRow | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

export async function listUsers(): Promise<PublicAdminUser[]> {
  const { rows } = await pool.query('SELECT id, name, email, is_active, created_at FROM admin_users ORDER BY created_at');
  return rows as PublicAdminUser[];
}

export async function setUserActive(id: number, isActive: boolean): Promise<void> {
  await pool.query('UPDATE admin_users SET is_active = $2 WHERE id = $1', [id, isActive]);
}

export async function setUserPassword(id: number, password: string): Promise<void> {
  await pool.query('UPDATE admin_users SET password_hash = $2 WHERE id = $1', [id, bcrypt.hashSync(password, BCRYPT_ROUNDS)]);
}

export async function deleteUser(id: number): Promise<void> {
  await pool.query('DELETE FROM admin_users WHERE id = $1', [id]);
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

export async function audit(
  adminEmail: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown> | string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (admin_email, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminEmail,
        action,
        targetType || null,
        targetId || null,
        typeof details === 'string' ? details : details ? JSON.stringify(details) : null,
        new Date().toISOString(),
      ]
    );
  } catch (err) {
    console.error('[audit] No se pudo registrar:', err);
  }
}

export async function listAuditLog(opts: { limit?: number; offset?: number; q?: string }): Promise<PublicAuditEntry[]> {
  const params: unknown[] = [];
  let where = '';
  let idx = 1;
  if (opts.q && opts.q.trim()) {
    where = `WHERE (admin_email LIKE $${idx} OR action LIKE $${idx} OR target_id LIKE $${idx})`;
    params.push(`%${opts.q.trim()}%`);
    idx++;
  }
  params.push(Math.min(opts.limit ?? 100, 300));
  params.push(opts.offset ?? 0);
  const { rows } = await pool.query(
    `SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return (rows as AuditRow[]).map((r) => ({
    id: r.id,
    adminEmail: r.admin_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    details: r.details,
    createdAt: r.created_at,
  }));
}

export async function countAuditLog(opts: { q?: string }): Promise<number> {
  const params: unknown[] = [];
  let where = '';
  let idx = 1;
  if (opts.q && opts.q.trim()) {
    where = `WHERE (admin_email LIKE $${idx} OR action LIKE $${idx} OR target_id LIKE $${idx})`;
    params.push(`%${opts.q.trim()}%`);
    idx++;
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS n FROM audit_log ${where}`,
    params
  );
  return Number(rows[0].n);
}

/* ------------------------------------------------------------------ */
/* Sesiones (DB, persisten reinicios)                                  */
/* ------------------------------------------------------------------ */

export interface SessionRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export async function createSessionRow(id: string, email: string, name: string): Promise<void> {
  await pool.query(
    'INSERT INTO sessions (id, email, name, created_at) VALUES ($1, $2, $3, $4)',
    [id, email, name, new Date().toISOString()]
  );
}

export async function getSessionRow(id: string): Promise<SessionRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
  return rows[0] as SessionRow | undefined;
}

export async function destroySessionRow(id: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
}

/* ------------------------------------------------------------------ */
/* Blog Posts                                                       */
/* ------------------------------------------------------------------ */

export interface BlogPostRow {
  id: string; title: string; excerpt: string; content: string;
  category: string; date: string; image: string | null;
  author: string; tags: string | null; created_at: string;
}

export async function insertBlogPost(data: {
  id: string; title: string; excerpt: string; content: string;
  category: string; date: string; image?: string; author: string; tags?: string[];
}): Promise<void> {
  await pool.query(
    `INSERT INTO blog_posts (id, title, excerpt, content, category, date, image, author, tags, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [data.id, data.title, data.excerpt, data.content, data.category, data.date, data.image || null, data.author, data.tags ? JSON.stringify(data.tags) : null, new Date().toISOString()]
  );
}

export async function listBlogPosts(): Promise<BlogPostRow[]> {
  const { rows } = await pool.query('SELECT * FROM blog_posts ORDER BY date DESC');
  return rows as BlogPostRow[];
}

export async function getBlogPostById(id: string): Promise<BlogPostRow | undefined> {
  const { rows } = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
  return rows[0] as BlogPostRow | undefined;
}

export async function updateBlogPost(id: string, data: {
  title?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  date?: string;
  image?: string | null;
  author?: string;
  tags?: string[];
}): Promise<BlogPostRow | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.title !== undefined) { sets.push(`title = $${idx++}`); params.push(data.title); }
  if (data.excerpt !== undefined) { sets.push(`excerpt = $${idx++}`); params.push(data.excerpt); }
  if (data.content !== undefined) { sets.push(`content = $${idx++}`); params.push(data.content); }
  if (data.category !== undefined) { sets.push(`category = $${idx++}`); params.push(data.category); }
  if (data.date !== undefined) { sets.push(`date = $${idx++}`); params.push(data.date); }
  if (data.image !== undefined) { sets.push(`image = $${idx++}`); params.push(data.image); }
  if (data.author !== undefined) { sets.push(`author = $${idx++}`); params.push(data.author); }
  if (data.tags !== undefined) { sets.push(`tags = $${idx++}`); params.push(JSON.stringify(data.tags)); }
  if (sets.length === 0) return getBlogPostById(id);
  params.push(id);
  await pool.query(`UPDATE blog_posts SET ${sets.join(', ')} WHERE id = $${idx}`, params);
  return getBlogPostById(id);
}

export async function deleteBlogPost(id: string): Promise<void> {
  const post = await getBlogPostById(id);
  if (post?.image && post.image.startsWith('/blog-covers/')) {
    const name = path.basename(post.image);
    fs.rm(path.join(UPLOADS_BLOG, name), { force: true }, () => {});
  }
  await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
}

