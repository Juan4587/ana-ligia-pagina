/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { PROPOSALS } from './src/data.js';
import * as db from './src/server/db.js';
import { decrypt } from './src/server/crypto.js';
import * as mail from './src/server/email.js';
import * as ai from './src/server/ai.js';

const APP_URL = process.env.APP_URL || '';

/** Sesiones activas del Despacho. Persisten solo en memoria (UUID por sesión). */
const sessions = new Map<string, { email: string; name: string; createdAt: number }>();

/* ------------------------------------------------------------------ */
/* Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeRadicadoId(): string {
  const year = new Date().getFullYear();
  let id = '';
  do {
    id = `RAD-ALM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (db.getSubmissionById(id));
  return id;
}

function serializeSubmission(row: db.SubmissionRow) {
  return {
    id: row.id,
    firstName: decrypt(row.firstName_enc),
    lastName: decrypt(row.lastName_enc),
    email: decrypt(row.email_enc),
    phone: decrypt(row.phone_enc),
    type: row.type,
    proposalId: row.proposalId,
    categoryName: row.categoryName,
    description: db.submissionDescription(row),
    status: row.status,
    aiResponse: db.submissionAiResponse(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emailSent: row.email_sent === 1,
    despachoNotified: row.despacho_notified === 1,
    anonymized: row.anonymized === 1,
  };
}

function serializeBill(row: db.BillRow) {
  let authors: string[] = [];
  let initiatives: string[] = [];
  try { authors = row.authors ? JSON.parse(row.authors) : []; } catch { authors = []; }
  try { initiatives = row.initiatives ? JSON.parse(row.initiatives) : []; } catch { initiatives = []; }
  return {
    id: row.id,
    title: row.title,
    number: row.number,
    dateFiled: row.dateFiled,
    status: row.status,
    stageDescription: row.stageDescription,
    summary: row.summary,
    proposalIdRelated: row.proposalIdRelated,
    authors,
    initiatives,
    impactScore: row.impactScore,
    hasFile: Boolean(row.stored_name),
    filename: row.filename,
    size: row.size,
    supportCount: db.countBillSupports(row.id),
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* Seguridad: sesiones admin (auth por email+clave) + tasa de radicados */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function createSession(user: db.AdminUserRow): string {
  const token = crypto.randomUUID();
  sessions.set(token, { email: user.email, name: user.name, createdAt: Date.now() });
  return token;
}

function destroySession(token: string): void {
  sessions.delete(token);
}

function getSession(token: string): { email: string; name: string; createdAt: number } | undefined {
  const s = sessions.get(token);
  if (!s) return undefined;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return undefined;
  }
  return s;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token ? getSession(token) : undefined;
  if (!session) {
    res.status(401).json({ error: 'Sesión no válida o expirada. Ingrese con su correo y clave del Despacho.' });
    return;
  }
  (req as express.Request & { session?: { email: string; name: string } }).session = {
    email: session.email,
    name: session.name,
  };
  next();
}

// Tasa límite simple: máx. 8 radicados por hora por IP
const rateBuckets = new Map<string, number[]>();
function rateLimitIp(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  if (rateBuckets.size > 1000) {
    for (const [key, timestamps] of rateBuckets.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) rateBuckets.delete(key);
      else rateBuckets.set(key, active);
    }
  }
  const hits = (rateBuckets.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 8) {
    rateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return true;
}

/* ------------------------------------------------------------------ */
/* Subida de archivos                                                */
/* ------------------------------------------------------------------ */

const pqrsStorage = multer.diskStorage({
  destination: db.uploadsPqrsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const billStorage = multer.diskStorage({
  destination: db.uploadsBillsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_PQRS = /\.(pdf|png|jpe?g|webp|gif|docx?|txt|xlsx?)$/i;
const ALLOWED_BILL = /\.(pdf|docx?|txt)$/i;

const uploadPqrs = multer({
  storage: pqrsStorage,
  limits: { files: 4, fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PQRS.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Use PDF, JPG, PNG, DOC, XLS, TXT.'));
  },
});

const uploadBill = multer({
  storage: billStorage,
  limits: { files: 1, fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_BILL.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido para un proyecto de ley. Use PDF, DOC o TXT.'));
  },
});

function multerErrorWrapper(fn: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => {
    fn(req, res, (err?: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          res.status(413).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo permitido.' : err.message });
        } else {
          res.status(400).json({ error: err.message || 'Error al procesar el archivo.' });
        }
        return;
      }
      next();
    });
  };
}

async function startServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Política de retención: anonimiza automáticamente radicados inactivos,
  // y al cierre del periodo legislativo anonimiza todo y borra adjuntos.
  const retentionDays = Number(process.env.ANONYMIZE_AFTER_DAYS || 1460);
  const periodEnd = process.env.PERIOD_END_DATE || '';
  const runRetention = () => {
    try {
      const n = db.autoAnonymizeOlderThan(retentionDays);
      if (n > 0) console.log(`[retención] ${n} radicado(s) anonimizado(s) automáticamente.`);
      const purged = db.purgePeriodEnd(periodEnd);
      if (purged > 0) console.log(`[retención] Cierre de periodo ejecutado: ${purged} radicado(s) procesado(s).`);
    } catch (err) {
      console.error('[retención] Error:', err);
    }
  };
  runRetention();
  setInterval(runRetention, 6 * 60 * 60 * 1000).unref();

  /* ---------- API pública ---------- */

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/proposals', (_req, res) => {
    res.json(PROPOSALS);
  });

  // Radicar un requerimiento ciudadano (multipart: campos + adjuntos opcionales)
  app.post('/api/pqrsd/submit', multerErrorWrapper(uploadPqrs.array('files', 4)), async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      if (!rateLimitIp(ip)) {
        res.status(429).json({ error: 'Demasiados radicados desde esta conexión. Intente más tarde.' });
        return;
      }

      const { firstName, lastName, email, phone, type, proposalId, description } = req.body as Record<string, string>;
      if (!firstName || !lastName || !email || !phone || !type || !proposalId || !description) {
        res.status(400).json({ error: 'Todos los campos solicitados son obligatorios para el radicado.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'El correo electrónico no es válido.' });
        return;
      }
      if (typeof description !== 'string' || description.trim().length < 10) {
        res.status(400).json({ error: 'La descripción debe tener al menos 10 caracteres.' });
        return;
      }

      const id = makeRadicadoId();
      const matchedProposal = PROPOSALS.find((p) => p.id === proposalId);
      const categoryName = matchedProposal ? matchedProposal.title : 'Consulta Ciudadana General';

      const triage = await ai.generateTriageAndResponse({
        id,
        firstName,
        lastName,
        email,
        phone,
        type,
        categoryName,
        description,
      });
      const aiResponse = triage.aiResponse;

      const row = db.insertSubmission({
        id,
        firstName,
        lastName,
        email,
        phone,
        type,
        proposalId,
        categoryName,
        description,
        aiResponse,
      });

      // Guardar adjuntos
      const files = (req as express.Request & { files?: Express.Multer.File[] }).files || [];
      for (const f of files) {
        db.insertDocument({
          submission_id: id,
          filename: f.originalname.slice(0, 200),
          stored_name: path.basename(f.path),
          mime: f.mimetype || 'application/octet-stream',
          size: f.size,
        });
      }

      const forEmail = { ...serializeSubmission(row), description };
      // Notificaciones (no bloquean la respuesta; fallan silenciosamente si no hay email configurado)
      mail.sendCitizenReceipt(forEmail).then((ok) => ok && db.markEmailsSent(id, true, false));
      mail.sendDespachoNotification(forEmail).then((ok) => ok && db.markEmailsSent(id, false, true));

      const created = db.getSubmissionById(id)!;
      res.status(201).json({
        ...serializeSubmission(created),
        documents: db.listDocuments(id).map((d) => ({ id: d.id, filename: d.filename, size: d.size })),
      });
    } catch (err: any) {
      console.error('Error al procesar radicado:', err);
      res.status(500).json({ error: err.message || 'Error al guardar y radicar el requerimiento.' });
    }
  });

  // Seguimiento ciudadano: solo con el número de radicado, sin datos personales
  app.post('/api/pqrsd/track', (req, res) => {
    const { id } = (req.body || {}) as { id?: string };
    if (!id) {
      res.status(400).json({ error: 'Ingrese el número de radicado.' });
      return;
    }
    const row = db.getSubmissionById(id.trim().toUpperCase());
    if (!row) {
      res.status(404).json({ error: 'No se encontró ningún radicado con ese número.' });
      return;
    }
    res.json({
      id: row.id,
      type: row.type,
      categoryName: row.categoryName,
      status: row.status,
      description: db.submissionDescription(row),
      aiResponse: db.submissionAiResponse(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      anonymized: row.anonymized === 1,
    });
  });

  // Proyectos de ley (información pública)
  app.get('/api/bills', (_req, res) => {
    res.json(db.listBills().map(serializeBill));
  });

  app.get('/api/bills/:id/file', (req, res) => {
    const bill = db.getBillById(Number(req.params.id));
    if (!bill?.stored_name) {
      res.status(404).json({ error: 'El proyecto de ley no tiene archivo adjunto.' });
      return;
    }
    const filePath = path.join(db.uploadsBillsDir, bill.stored_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Archivo no disponible.' });
      return;
    }
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(bill.filename || 'documento.pdf')}"`);
    res.sendFile(filePath);
  });

  // Respaldo cívico ciudadano a un proyecto de ley (sin token: lo firma el ciudadano)
  app.post('/api/bills/:id/support', async (req, res) => {
    const bill = db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'El proyecto de ley no existe.' });
      return;
    }
    const { name, email } = (req.body || {}) as { name?: string; email?: string };
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      res.status(400).json({ error: 'Ingrese su nombre y su correo electrónico.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'El correo electrónico no es válido.' });
      return;
    }
    const created = db.insertBillSupport({ billId: bill.id, name: cleanName, email: cleanEmail });
    if (!created) {
      res.status(409).json({ error: 'Ya registraste tu respaldo a este proyecto de ley.', supportCount: db.countBillSupports(bill.id) });
      return;
    }
    const emailed = await mail.sendBillSupportReceipt({
      name: created.name,
      email: created.email,
      billNumber: bill.number,
      billTitle: bill.title,
    });
    res.status(201).json({
      ok: true,
      emailed,
      supportCount: db.countBillSupports(bill.id),
      bill: { id: bill.id, number: bill.number, title: bill.title },
    });
  });

  /* ---------- API del Despacho (admin) ---------- */

  // Inicio de sesión por email + clave. Devuelve un token de sesión (UUID).
  app.post('/api/admin/auth', (req, res) => {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Ingrese correo y clave del Despacho.' });
      return;
    }
    const user = db.verifyUserCredential(email, password);
    if (!user) {
      db.audit(email.trim().toLowerCase(), 'LOGIN_FALLIDO');
      res.status(401).json({ error: 'Correo o clave incorrectos.' });
      return;
    }
    if (user.is_active !== 1) {
      res.status(403).json({ error: 'Su usuario del Despacho está desactivado. Contacte al administrador.' });
      return;
    }
    const token = createSession(user);
    db.audit(user.email, 'LOGIN_EXITOSO', 'user', String(user.id));
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = getSession(token);
    if (session) {
      destroySession(token);
      db.audit(session.email, 'LOGOUT', 'user');
    }
    res.json({ ok: true });
  });

  // Información de la sesión activa (para validar token al cargar el panel)
  app.get('/api/admin/me', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    res.json({ email: s.email, name: s.name });
  });

  // Usuarios del Despacho
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    res.json({ items: db.listUsers() });
  });

  app.post('/api/admin/users', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const { name, email, password } = (req.body || {}) as { name?: string; email?: string; password?: string };
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, correo y clave son obligatorios.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'El correo no es válido.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'La clave debe tener al menos 8 caracteres.' });
      return;
    }
    if (db.getUserByEmail(email)) {
      res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
      return;
    }
    const user = db.createUser({ name, email, password });
    db.audit(s.email, 'USUARIO_CREADO', 'user', String(user.id), { email: user.email, name: user.name });
    res.status(201).json(user);
  });

  app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const id = Number(req.params.id);
    const user = db.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    const { isActive, password } = (req.body || {}) as { isActive?: boolean; password?: string };
    if (typeof isActive === 'boolean') {
      db.setUserActive(id, isActive);
      db.audit(s.email, 'USUARIO_ACTIVADO', 'user', String(id), { isActive });
    }
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'La clave debe tener al menos 8 caracteres.' });
        return;
      }
      db.setUserPassword(id, password);
      db.audit(s.email, 'USUARIO_CLAVE', 'user', String(id));
    }
    res.json(db.getUserById(id) && { id });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const id = Number(req.params.id);
    const user = db.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (user.email === s.email) {
      res.status(400).json({ error: 'No puede eliminarse a sí mismo.' });
      return;
    }
    db.deleteUser(id);
    db.audit(s.email, 'USUARIO_ELIMINADO', 'user', String(id), { email: user.email });
    res.json({ ok: true });
  });

  // Auditoría de acciones sensibles
  app.get('/api/admin/audit', requireAdmin, (req, res) => {
    const q = String(req.query.q || '');
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json({
      total: db.countAuditLog({ q }),
      items: db.listAuditLog({ q, limit, offset }),
    });
  });

  app.get('/api/admin/submissions', requireAdmin, (req, res) => {
    const s = String(req.query.status || '');
    const t = String(req.query.type || '');
    const p = String(req.query.proposalId || '');
    const q = String(req.query.q || '');
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = db.listSubmissions({ status: s, type: t, proposalId: p, q, limit, offset });
    res.json({
      total: db.countSubmissions({ status: s, type: t, proposalId: p, q }),
      items: rows.map(serializeSubmission),
    });
  });

  app.get('/api/admin/submissions/:id', requireAdmin, (req, res) => {
    const row = db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    res.json({
      ...serializeSubmission(row),
      documents: db.listDocuments(row.id).map((d) => ({ id: d.id, filename: d.filename, mime: d.mime, size: d.size })),
    });
  });

  app.patch('/api/admin/submissions/:id', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    const { status } = (req.body || {}) as { status?: string };
    if (status) {
      const from = row.status;
      db.updateSubmissionStatus(row.id, status);
      db.audit(s.email, 'ESTADO_CAMBIADO', 'submission', row.id, { from, to: status });
    }
    res.json(serializeSubmission(db.getSubmissionById(row.id)!));
  });

  app.post('/api/admin/submissions/:id/respond', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    const { response, sendEmail } = (req.body || {}) as { response?: string; sendEmail?: boolean };
    if (!response || response.trim().length < 10) {
      res.status(400).json({ error: 'La respuesta debe tener al menos 10 caracteres.' });
      return;
    }
    const sub = serializeSubmission(db.getSubmissionById(row.id)!);
    db.setSubmissionResponse(row.id, response.trim());
    db.updateSubmissionStatus(row.id, 'Resuelto');

    let emailed = false;
    if (sendEmail && sub.email && mail.emailConfigured) {
      emailed = await mail.sendResponseToCitizen({ ...sub, aiResponse: response.trim(), status: 'Resuelto' });
      if (emailed) db.markEmailsSent(row.id, true, false);
    }
    db.audit(s.email, 'RESPUESTA', 'submission', row.id, { sendEmail, emailed });
    res.json({ ...serializeSubmission(db.getSubmissionById(row.id)!), emailed });
  });

  app.post('/api/admin/submissions/:id/anonymize', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    db.anonymizeSubmission(row.id);
    db.audit(s.email, 'ANONIMIZADO', 'submission', row.id);
    res.json({ ok: true, message: 'Radicado anonimizado. Los datos personales han sido eliminados.' });
  });

  app.delete('/api/admin/submissions/:id', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    db.deleteSubmission(row.id);
    db.audit(s.email, 'ELIMINADO', 'submission', row.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/submissions/:id/documents/:docId/file', requireAdmin, (req, res) => {
    const doc = db.getDocumentById(Number(req.params.docId));
    if (!doc || doc.submission_id !== req.params.id) {
      res.status(404).json({ error: 'Documento no encontrado.' });
      return;
    }
    const filePath = path.join(db.uploadsPqrsDir, doc.stored_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Archivo no disponible.' });
      return;
    }
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`);
    res.sendFile(filePath);
  });

  // Extraer información de un proyecto de ley desde un PDF (Gemini analiza el PDF directamente)
  app.post('/api/admin/bills/extract', requireAdmin, multerErrorWrapper(uploadBill.single('file')), async (req, res) => {
    try {
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ error: 'Adjunte el PDF del proyecto de ley.' });
        return;
      }
      const buffer = fs.readFileSync(file.path);
      const extracted = await ai.extractBillFieldsFromPdf(buffer);
      fs.unlink(file.path, () => {});
      res.json(extracted);
    } catch (err: any) {
      console.error('Error extrayendo datos del PDF:', err);
      res.status(500).json({ error: err.message || 'Error al procesar el PDF.' });
    }
  });

  // Proyectos de ley: administración
  app.post('/api/admin/bills', requireAdmin, multerErrorWrapper(uploadBill.single('file')), (req, res) => {
    try {
      const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
      const { title, number, dateFiled, status, stageDescription, summary, proposalIdRelated, impactScore, authors, initiatives } =
        req.body as Record<string, string>;
      if (!title || !number) {
        res.status(400).json({ error: 'Título y número del proyecto son obligatorios.' });
        return;
      }
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      db.insertBill({
        title: title.trim(),
        number: number.trim(),
        dateFiled,
        status,
        stageDescription,
        summary,
        proposalIdRelated,
        impactScore,
        authors: authors ? authors.split(',').map((s) => s.trim()).filter(Boolean) : [],
        initiatives: initiatives ? initiatives.split(';').map((s) => s.trim()).filter(Boolean) : [],
        stored_name: file ? path.basename(file.path) : undefined,
        filename: file ? file.originalname.slice(0, 200) : undefined,
        mime: file ? file.mimetype : undefined,
        size: file ? file.size : undefined,
      });
      const created = db.listBills()[0];
      db.audit(s.email, 'LEY_REGISTRADA', 'bill', String(created.id), { number: created.number, title: created.title });
      res.status(201).json(serializeBill(created));
    } catch (err: any) {
      console.error('Error al registrar proyecto de ley:', err);
      res.status(500).json({ error: err.message || 'Error al registrar el proyecto de ley.' });
    }
  });

  app.patch('/api/admin/bills/:id', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const bill = db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'Proyecto de ley no encontrado.' });
      return;
    }
    const b = (req.body || {}) as Record<string, string>;
    const updated = db.updateBill(Number(req.params.id), {
      status: b.status,
      stageDescription: b.stageDescription,
      proposalIdRelated: b.proposalIdRelated,
      impactScore: b.impactScore,
      title: b.title,
      number: b.number,
      dateFiled: b.dateFiled,
      summary: b.summary,
      authors: b.authors !== undefined ? b.authors.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
      initiatives: b.initiatives !== undefined ? b.initiatives.split(';').map((x) => x.trim()).filter(Boolean) : undefined,
    });
    if (b.status && b.status !== bill.status) {
      db.audit(s.email, 'LEY_ESTADO_ACTUALIZADO', 'bill', String(bill.id), {
        number: bill.number,
        desde: bill.status,
        hacia: b.status,
      });
    } else {
      db.audit(s.email, 'LEY_ACTUALIZADA', 'bill', String(bill.id), { number: bill.number });
    }
    res.json(serializeBill(updated!));
  });

  app.delete('/api/admin/bills/:id', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const bill = db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'Proyecto de ley no encontrado.' });
      return;
    }
    db.deleteBill(Number(req.params.id));
    db.audit(s.email, 'LEY_ELIMINADA', 'bill', String(bill.id), { number: bill.number, title: bill.title });
    res.json({ ok: true });
  });

  app.get('/api/admin/bills/:id/supports', requireAdmin, (req, res) => {
    const bill = db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'Proyecto de ley no encontrado.' });
      return;
    }
    res.json({
      bill: { id: bill.id, number: bill.number, title: bill.title },
      supports: db.listBillSupports(bill.id).map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        createdAt: r.created_at,
      })),
    });
  });

  /* ---------- Frontend ---------- */

  // Cualquier ruta /api no registrada responde JSON 404 (no cae al SPA)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado.' });
  });

  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Portal Legislativo Ana Ligia Mora listo en el puerto ${PORT}`);
    console.log(`[Conf] Email ${mail.emailConfigured ? 'configurado (Resend)' : 'NO configurado'}`);
    console.log(`[Conf] IA Triage ${process.env.GEMINI_API_KEY ? 'configurada (Google Gemini Flash)' : 'modo plantilla institucional'}`);
    if (!mail.emailConfigured) {
      console.log('  ┌──────────────────────────────────────────────────────────────────────┐');
      console.log('  │  ⚠  CORREOS NO CONFIGURADOS                                            │');
      console.log('  │  La API key de Resend (RESEND_API_KEY) está vacía o no se cargó.        │');
      console.log('  │  Los radicados se guardan igual, pero NO se enviará:                    │');
      console.log('  │    • confirmación al ciudadano                                         │');
      console.log('  │    • aviso al despacho                                                 │');
      console.log('  │    • respuesta oficial por correo                                      │');
      console.log('  │  Configúrala en .env → https://resend.com                               │');
      console.log('  └──────────────────────────────────────────────────────────────────────┘');
    }
    if (db.listUsers().length === 0) {
      const adminName  = process.env.ADMIN_NAME;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPass  = process.env.ADMIN_PASSWORD;
      if (adminName && adminEmail && adminPass) {
        try {
          db.createUser({ name: adminName, email: adminEmail, password: adminPass });
          console.log(`[Conf] Usuario del Despacho creado automáticamente: ${adminEmail}`);
        } catch (e) {
          console.error('[Conf] Error al crear usuario inicial:', e);
        }
      } else {
        console.warn('[Conf] No hay usuarios del Despacho. Defina ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en Railway para crearlos automáticamente.');
      }
    }
    const periodEnd = process.env.PERIOD_END_DATE || '';
    console.log(`[Conf] Retención: anonimiza radicados inactivos tras ${retentionDays} días. Cierre de periodo: ${periodEnd || 'no definido'}.`);
    if (APP_URL) console.log(`[Conf] APP_URL ${APP_URL}`);
  });
}

startServer();