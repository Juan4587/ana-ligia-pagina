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
import { PROPOSALS, PONENCIAS, BLOG_POSTS } from './src/data.js';
import * as db from './src/server/db.js';
import { decrypt } from './src/server/crypto.js';
import * as mail from './src/server/email.js';
import { resolveClientIp } from './src/server/ip.js';

const APP_URL = process.env.APP_URL || '';

/* ------------------------------------------------------------------ */
/* Helpers                                                           */
/* ------------------------------------------------------------------ */

interface AcuseInput {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  categoryName: string;
}

/**
 * Acuse institucional del radicado PQRSD.
 * Triage manual: no hay IA — plantilla determinista local.
 */
function buildAcuse(input: AcuseInput): string {
  return (
    `Estimado(a) ${input.firstName} ${input.lastName}, su radicado número ${input.id} ha sido registrado exitosamente en nuestro sistema ` +
    `bajo la categoría "${input.categoryName}". Nuestro equipo legislativo revisará los detalles del asunto descrito en un lapso ` +
    `no mayor a 10 días hábiles. Nos comunicaremos con usted al correo ${input.email || 'registrado'} o al teléfono ${input.phone || 'registrado'}. ` +
    `Atentamente, Despacho de la Congresista Ana Ligia Mora Martínez.`
  );
}

async function makeRadicadoId(): Promise<string> {
  const year = new Date().getFullYear();
  let id = '';
  do {
    id = `RAD-ALM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (await db.getSubmissionById(id));
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
    emailSent: row.email_sent,
    despachoNotified: row.despacho_notified,
    anonymized: row.anonymized,
  };
}

async function serializeBill(row: db.BillRow) {
  let authors: string[] = [];
  let initiatives: string[] = [];
  try { authors = row.authors ? JSON.parse(row.authors) : []; } catch { authors = []; }
  try { initiatives = row.initiatives ? JSON.parse(row.initiatives) : []; } catch { initiatives = []; }
  return {
    id: row.id,
    title: row.title,
    number: row.number,
    dateFiled: row.datefiled,
    status: row.status,
    tipo: row.tipogestion || 'Proyecto de Ley',
    stageDescription: row.stagedescription,
    summary: row.summary,
    proposalIdRelated: row.proposalidrelated,
    authors,
    initiatives,
    impactScore: row.impactscore,
    hasFile: Boolean(row.stored_name),
    filename: row.filename,
    size: row.size,
    supportCount: await db.countBillSupports(row.id),
    createdAt: row.created_at,
  };
}

function serializePost(row: db.BlogPostRow) {
  let tags: string[] = [];
  try { tags = row.tags ? JSON.parse(row.tags) : []; } catch { tags = []; }
  return { ...row, tags };
}

function serializePonenciaFromBill(row: db.BillRow) {
  let authors: string[] = [];
  let initiatives: string[] = [];
  try { authors = row.authors ? JSON.parse(row.authors) : []; } catch { authors = []; }
  try { initiatives = row.initiatives ? JSON.parse(row.initiatives) : []; } catch { initiatives = []; }
  return {
    id: String(row.id),
    title: row.title,
    type: row.tipogestion || 'Proyecto de Ley',
    category: row.proposalidrelated || 'general',
    date: row.datefiled || row.created_at,
    status: row.status,
    description: row.summary || row.stagedescription || '',
    shortDescription: row.stagedescription || row.summary || '',
    author: authors[0] || 'Ana Ligia Mora Martínez',
    acts: initiatives,
  };
}

/* ------------------------------------------------------------------ */
/* Seguridad: sesiones admin (DB) + tasa de radicados                 */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

async function createSession(user: db.AdminUserRow): Promise<string> {
  const token = crypto.randomUUID();
  await db.createSessionRow(token, user.email, user.name);
  return token;
}

async function destroySession(token: string): Promise<void> {
  await db.destroySessionRow(token);
}

async function getSession(token: string): Promise<{ email: string; name: string } | undefined> {
  const row = await db.getSessionRow(token);
  if (!row) return undefined;
  if (Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) {
    await db.destroySessionRow(token);
    return undefined;
  }
  return { email: row.email, name: row.name };
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token ? await getSession(token) : undefined;
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

// Tasa límite simple: por defecto 8 radicados por hora por IP
const rateBuckets = new Map<string, number[]>();
function rateLimitIp(ip: string, max = 8, windowMs = 60 * 60 * 1000, scope = 'default'): boolean {
  const now = Date.now();
  const key = `${scope}|${ip}`;
  if (rateBuckets.size > 1000) {
    for (const [k, timestamps] of rateBuckets.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, active);
    }
  }
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    rateBuckets.set(key, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return true;
}

/* Bloqueo progresivo de intentos de sesión (por IP y por correo intentado) */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;      // ventana para contar fallos
const LOGIN_MAX_FAILS = 5;                    // fallos antes de bloquear
const LOGIN_FAIL_TTL_MS = 4 * 60 * 60 * 1000; // retención máxima en memoria
const loginFails = new Map<string, number[]>();

function recordLoginFail(key: string): void {
  const now = Date.now();
  if (loginFails.size > 1000) {
    for (const [k, ts] of loginFails.entries()) {
      const alive = ts.filter((t) => now - t < LOGIN_FAIL_TTL_MS);
      if (alive.length === 0) loginFails.delete(k); else loginFails.set(k, alive);
    }
  }
  const arr = (loginFails.get(key) || []).filter((t) => now - t < LOGIN_FAIL_TTL_MS);
  arr.push(now);
  loginFails.set(key, arr);
}

function loginLockState(key: string): { locked: boolean; retrySec: number } {
  const now = Date.now();
  const arr = (loginFails.get(key) || []).filter((t) => now - t < LOGIN_FAIL_TTL_MS);
  if (arr.length) loginFails.set(key, arr); else loginFails.delete(key);
  const recent = arr.filter((t) => now - t < LOGIN_WINDOW_MS);
  if (recent.length < LOGIN_MAX_FAILS) return { locked: false, retrySec: 0 };
  const last = recent[recent.length - 1];
  const tier = Math.min(recent.length - LOGIN_MAX_FAILS, 3);       // 0..3
  const until = last + LOGIN_WINDOW_MS * Math.pow(2, tier);        // 15m, 30m, 1h, 2h
  if (now >= until) return { locked: false, retrySec: 0 };
  return { locked: true, retrySec: Math.ceil((until - now) / 1000) };
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

const blogCoverStorage = multer.diskStorage({
  destination: db.uploadsBlogDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_PQRS = /\.(pdf|png|jpe?g|webp|gif|docx?|txt|xlsx?)$/i;
const ALLOWED_BILL = /\.(pdf|docx?|txt)$/i;
const ALLOWED_BLOG_COVER = /\.(png|jpe?g|webp|gif)$/i;

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

const uploadBlogCover = multer({
  storage: blogCoverStorage,
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_BLOG_COVER.test(file.originalname)) cb(null, true);
    else cb(new Error('La portada debe ser PNG, JPG, WEBP o GIF.'));
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
  const isProd = process.env.NODE_ENV === 'production';
  const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (isProd && !fs.existsSync(distIndexPath)) {
    console.error('[FATAL] dist/index.html no encontrado — corre "npm run build" antes de iniciar en producción.');
    process.exit(1);
  }

  // Inicializar esquema PostgreSQL antes de configurar rutas
  await db.ensureSchema();

  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Política de retención
  const retentionDays = Number(process.env.ANONYMIZE_AFTER_DAYS || 1460);
  const periodEnd = process.env.PERIOD_END_DATE || '';
  const runRetention = async () => {
    try {
      const n = await db.autoAnonymizeOlderThan(retentionDays);
      if (n > 0) console.log(`[retención] ${n} radicado(s) anonimizado(s) automáticamente.`);
      const purged = await db.purgePeriodEnd(periodEnd);
      if (purged > 0) console.log(`[retención] Cierre de periodo ejecutado: ${purged} radicado(s) procesado(s).`);
    } catch (err) {
      console.error('[retención] Error:', err);
    }
  };
  await runRetention();
  setInterval(() => { runRetention().catch(() => {}); }, 6 * 60 * 60 * 1000).unref();

  /* ---------- API pública ---------- */

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/proposals', (_req, res) => {
    res.json(PROPOSALS);
  });

  // Gestión legislativa: ponencias, proposiciones y proyectos (unificados en bills)
  app.get('/api/ponencias', async (_req, res) => {
    try {
      const bills = await db.listBills();
      const items = bills.map(serializePonenciaFromBill);
      if (items.length === 0) {
        // Seed from data.ts if DB is empty
        for (const p of PONENCIAS) {
          await db.insertBill({
            title: p.title,
            number: String(p.id),
            dateFiled: p.date,
            status: p.status,
            stageDescription: p.shortDescription,
            summary: p.description,
            authors: [p.author],
            initiatives: p.acts || [],
            tipoGestion: p.type,
          });
        }
        const seeded = await db.listBills();
        return res.json(seeded.map(serializePonenciaFromBill));
      }
      res.json(items);
    } catch {
      res.json(PONENCIAS);
    }
  });

  // Blog Posts
  app.get('/api/posts', async (_req, res) => {
    try {
      const posts = await db.listBlogPosts();
      if (posts.length === 0) {
        for (const p of BLOG_POSTS) {
          await db.insertBlogPost(p);
        }
        const seeded = await db.listBlogPosts();
        return res.json(seeded.map(serializePost));
      }
      res.json(posts.map(serializePost));
    } catch {
      res.json(BLOG_POSTS);
    }
  });

  // Suscripción al boletín informativo
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const ip = resolveClientIp(req);
      if (!rateLimitIp(ip, 10, 60 * 60 * 1000, 'newsletter')) {
        res.status(429).json({ error: 'Demasiadas solicitudes desde esta conexión. Intente más tarde.' });
        return;
      }
      const { email, source } = (req.body || {}) as { email?: string; source?: string };
      const clean = (email || '').trim().toLowerCase();
      if (!clean) {
        res.status(400).json({ error: 'Ingrese su correo electrónico.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        res.status(400).json({ error: 'El correo electrónico no es válido.' });
        return;
      }
      const result = await db.insertNewsletterSubscriber(clean, source || 'blog-sidebar');
      let emailed = false;
      if (!result.already && mail.emailConfigured) {
        // No bloquear la suscripción si Resend falla: el registro ya quedó en DB.
        emailed = await mail.sendNewsletterWelcome(clean);
      }
      const count = await db.countNewsletterSubscribers();
      res.status(result.already ? 200 : 201).json({
        ok: true,
        already: result.already,
        emailed,
        subscriberCount: count,
        message: result.already
          ? 'Este correo ya está suscrito al boletín.'
          : '¡Gracias por suscribirte!',
      });
    } catch (err) {
      console.error('[newsletter] Error suscripción:', err);
      res.status(500).json({ error: 'No fue posible registrar la suscripción. Intente más tarde.' });
    }
  });

  // Radicar un requerimiento ciudadano
  app.post('/api/pqrsd/submit', multerErrorWrapper(uploadPqrs.array('files', 4)), async (req, res) => {
    try {
      const ip = resolveClientIp(req);
      if (!rateLimitIp(ip, 8, 60 * 60 * 1000, 'pqrsd')) {
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

      const id = await makeRadicadoId();
      const matchedProposal = PROPOSALS.find((p) => p.id === proposalId);
      const categoryName = matchedProposal ? matchedProposal.title : 'Consulta Ciudadana General';

      const aiResponse = buildAcuse({ id, firstName, lastName, email, phone, categoryName });

      const row = await db.insertSubmission({
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
        await db.insertDocument({
          submission_id: id,
          filename: f.originalname.slice(0, 200),
          stored_name: path.basename(f.path),
          mime: f.mimetype || 'application/octet-stream',
          size: f.size,
        });
      }

      const forEmail = { ...serializeSubmission(row), description };
      // Notificaciones (no bloquean la respuesta)
      mail.sendCitizenReceipt(forEmail).then((ok) => ok && db.markEmailsSent(id, true, false));
      mail.sendDespachoNotification(forEmail).then((ok) => ok && db.markEmailsSent(id, false, true));

      const created = (await db.getSubmissionById(id))!;
      const docs = await db.listDocuments(id);
      res.status(201).json({
        ...serializeSubmission(created),
        documents: docs.map((d) => ({ id: d.id, filename: d.filename, size: d.size })),
      });
    } catch (err: any) {
      console.error('Error al procesar radicado:', err);
      res.status(500).json({ error: err.message || 'Error al guardar y radicar el requerimiento.' });
    }
  });

  // Seguimiento ciudadano
  app.post('/api/pqrsd/track', async (req, res) => {
    const ip = resolveClientIp(req);
    if (!rateLimitIp(ip, 20, 60 * 60 * 1000, 'track')) {
      res.status(429).json({ error: 'Demasiadas consultas desde esta conexión. Intente más tarde.' });
      return;
    }
    const { id } = (req.body || {}) as { id?: string };
    if (!id) {
      res.status(400).json({ error: 'Ingrese el número de radicado.' });
      return;
    }
    const row = await db.getSubmissionById(id.trim().toUpperCase());
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
      anonymized: row.anonymized,
    });
  });

  // Proyectos de ley (información pública)
  app.get('/api/bills', async (_req, res) => {
    const bills = await db.listBills();
    const serialized = await Promise.all(bills.map(serializeBill));
    res.json(serialized);
  });

  app.get('/api/bills/:id/file', async (req, res) => {
    const bill = await db.getBillById(Number(req.params.id));
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

  // Respaldo cívico ciudadano (solo Proyectos de Ley)
  app.post('/api/bills/:id/support', async (req, res) => {
    const ip = resolveClientIp(req);
    if (!rateLimitIp(ip, 10, 60 * 60 * 1000, 'support')) {
      res.status(429).json({ error: 'Demasiadas solicitudes desde esta conexión. Intente más tarde.' });
      return;
    }
    const bill = await db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'El proyecto de ley no existe.' });
      return;
    }
    if ((bill.tipogestion || 'Proyecto de Ley') !== 'Proyecto de Ley') {
      res.status(400).json({ error: 'Los respaldos ciudadanos aplican solo a Proyectos de Ley.' });
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
    const created = await db.insertBillSupport({ billId: bill.id, name: cleanName, email: cleanEmail });
    if (!created) {
      const count = await db.countBillSupports(bill.id);
      res.status(409).json({ error: 'Ya registraste tu respaldo a este proyecto de ley.', supportCount: count });
      return;
    }
    const emailed = await mail.sendBillSupportReceipt({
      name: created.name,
      email: created.email,
      billNumber: bill.number,
      billTitle: bill.title,
    });
    const count = await db.countBillSupports(bill.id);
    res.status(201).json({
      ok: true,
      emailed,
      supportCount: count,
      bill: { id: bill.id, number: bill.number, title: bill.title },
    });
  });

  /* ---------- API del Despacho (admin) ---------- */

  // Inicio de sesión por email + clave
  app.post('/api/admin/auth', async (req, res) => {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Ingrese correo y clave del Despacho.' });
      return;
    }
    const ip = resolveClientIp(req);
    const ipKey = `ip:${ip}`;
    const emailKey = `email:${email.trim().toLowerCase()}`;
    const preIp = loginLockState(ipKey);
    const preMail = loginLockState(emailKey);
    if (preIp.locked || preMail.locked) {
      const retrySec = Math.max(preIp.retrySec, preMail.retrySec);
      res.setHeader('Retry-After', String(retrySec));
      res.status(429).json({ error: `Demasiados intentos fallidos. Vuelva a intentarlo en ${Math.max(1, Math.ceil(retrySec / 60))} minuto(s).` });
      return;
    }
    const user = await db.verifyUserCredential(email, password);
    if (!user) {
      recordLoginFail(ipKey);
      recordLoginFail(emailKey);
      await db.audit(email.trim().toLowerCase(), 'LOGIN_FALLIDO', undefined, undefined, { ip });
      const postIp = loginLockState(ipKey);
      const postMail = loginLockState(emailKey);
      if (postIp.locked || postMail.locked) {
        const retrySec = Math.max(postIp.retrySec, postMail.retrySec);
        await db.audit(email.trim().toLowerCase(), 'LOGIN_BLOQUEADO', undefined, undefined, { ip, retrySec });
        res.setHeader('Retry-After', String(retrySec));
        res.status(429).json({ error: `Demasiados intentos fallidos. Vuelva a intentarlo en ${Math.max(1, Math.ceil(retrySec / 60))} minuto(s).` });
        return;
      }
      res.status(401).json({ error: 'Correo o clave incorrectos.' });
      return;
    }
    if (!user.is_active) {
      res.status(403).json({ error: 'Su usuario del Despacho está desactivado. Contacte al administrador.' });
      return;
    }
    loginFails.delete(ipKey);
    loginFails.delete(emailKey);
    const token = await createSession(user);
    await db.audit(user.email, 'LOGIN_EXITOSO', 'user', String(user.id), { ip });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post('/api/admin/logout', requireAdmin, async (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = await getSession(token);
    if (session) {
      await destroySession(token);
      await db.audit(session.email, 'LOGOUT', 'user');
    }
    res.json({ ok: true });
  });

  // Información de la sesión activa
  app.get('/api/admin/me', requireAdmin, (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    res.json({ email: s.email, name: s.name });
  });

  // Usuarios del Despacho
  app.get('/api/admin/users', requireAdmin, async (_req, res) => {
    res.json({ items: await db.listUsers() });
  });

  app.post('/api/admin/users', requireAdmin, async (req, res) => {
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
    if (await db.getUserByEmail(email)) {
      res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
      return;
    }
    const user = await db.createUser({ name, email, password });
    await db.audit(s.email, 'USUARIO_CREADO', 'user', String(user.id), { email: user.email, name: user.name });
    res.status(201).json(user);
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const id = Number(req.params.id);
    const user = await db.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    const { isActive, password } = (req.body || {}) as { isActive?: boolean; password?: string };
    if (typeof isActive === 'boolean') {
      await db.setUserActive(id, isActive);
      await db.audit(s.email, 'USUARIO_ACTIVADO', 'user', String(id), { isActive });
    }
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'La clave debe tener al menos 8 caracteres.' });
        return;
      }
      await db.setUserPassword(id, password);
      await db.audit(s.email, 'USUARIO_CLAVE', 'user', String(id));
    }
    const updated = await db.getUserById(id);
    res.json(updated && { id });
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const id = Number(req.params.id);
    const user = await db.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (user.email === s.email) {
      res.status(400).json({ error: 'No puede eliminarse a sí mismo.' });
      return;
    }
    await db.deleteUser(id);
    await db.audit(s.email, 'USUARIO_ELIMINADO', 'user', String(id), { email: user.email });
    res.json({ ok: true });
  });

  // Auditoría de acciones sensibles
  app.get('/api/admin/audit', requireAdmin, async (req, res) => {
    const q = String(req.query.q || '');
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json({
      total: await db.countAuditLog({ q }),
      items: await db.listAuditLog({ q, limit, offset }),
    });
  });

  app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
    const s = String(req.query.status || '');
    const t = String(req.query.type || '');
    const p = String(req.query.proposalId || '');
    const q = String(req.query.q || '');
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = await db.listSubmissions({ status: s, type: t, proposalId: p, q, limit, offset });
    res.json({
      total: await db.countSubmissions({ status: s, type: t, proposalId: p, q }),
      items: rows.map(serializeSubmission),
    });
  });

  app.get('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
    const row = await db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    const docs = await db.listDocuments(row.id);
    res.json({
      ...serializeSubmission(row),
      documents: docs.map((d) => ({ id: d.id, filename: d.filename, mime: d.mime, size: d.size })),
    });
  });

  app.patch('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = await db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    const { status } = (req.body || {}) as { status?: string };
    if (status) {
      const from = row.status;
      await db.updateSubmissionStatus(row.id, status);
      await db.audit(s.email, 'ESTADO_CAMBIADO', 'submission', row.id, { from, to: status });
    }
    const updated = (await db.getSubmissionById(row.id))!;
    res.json(serializeSubmission(updated));
  });

  app.post('/api/admin/submissions/:id/respond', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = await db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    const { response, sendEmail } = (req.body || {}) as { response?: string; sendEmail?: boolean };
    if (!response || response.trim().length < 10) {
      res.status(400).json({ error: 'La respuesta debe tener al menos 10 caracteres.' });
      return;
    }
    const sub = serializeSubmission((await db.getSubmissionById(row.id))!);
    await db.setSubmissionResponse(row.id, response.trim());
    await db.updateSubmissionStatus(row.id, 'Resuelto');

    let emailed = false;
    if (sendEmail && sub.email && mail.emailConfigured) {
      emailed = await mail.sendResponseToCitizen({ ...sub, aiResponse: response.trim(), status: 'Resuelto' });
      if (emailed) await db.markEmailsSent(row.id, true, false);
    }
    await db.audit(s.email, 'RESPUESTA', 'submission', row.id, { sendEmail, emailed });
    const final = (await db.getSubmissionById(row.id))!;
    res.json({ ...serializeSubmission(final), emailed });
  });

  app.post('/api/admin/submissions/:id/anonymize', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = await db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    await db.anonymizeSubmission(row.id);
    await db.audit(s.email, 'ANONIMIZADO', 'submission', row.id);
    res.json({ ok: true, message: 'Radicado anonimizado. Los datos personales han sido eliminados.' });
  });

  app.delete('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const row = await db.getSubmissionById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Radicado no encontrado.' });
      return;
    }
    await db.deleteSubmission(row.id);
    await db.audit(s.email, 'ELIMINADO', 'submission', row.id);
    res.json({ ok: true });
  });

  app.get('/api/admin/submissions/:id/documents/:docId/file', requireAdmin, async (req, res) => {
    const doc = await db.getDocumentById(Number(req.params.docId));
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

  // Proyectos de ley: administración
  app.post('/api/admin/bills', requireAdmin, multerErrorWrapper(uploadBill.single('file')), async (req, res) => {
    try {
      const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
      const { title, number, dateFiled, status, tipo, stageDescription, summary, proposalIdRelated, impactScore, authors, initiatives } =
        req.body as Record<string, string>;
      if (!title || !number) {
        res.status(400).json({ error: 'Título y número del proyecto son obligatorios.' });
        return;
      }
      const tipogestion = tipo && ['Proyecto de Ley', 'Ponencia', 'Proposición', 'Moción', 'Otro'].includes(tipo)
        ? tipo
        : 'Proyecto de Ley';
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      await db.insertBill({
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
        tipoGestion: tipogestion,
        stored_name: file ? path.basename(file.path) : undefined,
        filename: file ? file.originalname.slice(0, 200) : undefined,
        mime: file ? file.mimetype : undefined,
        size: file ? file.size : undefined,
      });
      const allBills = await db.listBills();
      const created = allBills[0];
      await db.audit(s.email, 'LEY_REGISTRADA', 'bill', String(created.id), { number: created.number, title: created.title });
      res.status(201).json(await serializeBill(created));
    } catch (err: any) {
      console.error('Error al registrar proyecto de ley:', err);
      res.status(500).json({ error: err.message || 'Error al registrar el proyecto de ley.' });
    }
  });

  app.patch('/api/admin/bills/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const bill = await db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'Proyecto de ley no encontrado.' });
      return;
    }
    const b = (req.body || {}) as Record<string, string>;
    const updated = await db.updateBill(Number(req.params.id), {
      status: b.status,
      stageDescription: b.stageDescription,
      proposalIdRelated: b.proposalIdRelated,
      impactScore: b.impactScore,
      title: b.title,
      number: b.number,
      dateFiled: b.dateFiled,
      summary: b.summary,
      tipoGestion: b.tipo && ['Proyecto de Ley', 'Ponencia', 'Proposición', 'Moción', 'Otro'].includes(b.tipo) ? b.tipo : undefined,
      authors: b.authors !== undefined ? b.authors.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
      initiatives: b.initiatives !== undefined ? b.initiatives.split(';').map((x) => x.trim()).filter(Boolean) : undefined,
    });
    if (b.status && b.status !== bill.status) {
      await db.audit(s.email, 'LEY_ESTADO_ACTUALIZADO', 'bill', String(bill.id), {
        number: bill.number,
        desde: bill.status,
        hacia: b.status,
      });
    } else {
      await db.audit(s.email, 'LEY_ACTUALIZADA', 'bill', String(bill.id), { number: bill.number });
    }
    res.json(await serializeBill(updated!));
  });

  app.delete('/api/admin/bills/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const bill = await db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'Proyecto de ley no encontrado.' });
      return;
    }
    await db.deleteBill(Number(req.params.id));
    await db.audit(s.email, 'LEY_ELIMINADA', 'bill', String(bill.id), { number: bill.number, title: bill.title });
    res.json({ ok: true });
  });

  // Newsletter: listado admin
  app.get('/api/admin/newsletter', requireAdmin, async (_req, res) => {
    try {
      const items = await db.listNewsletterSubscribers();
      const count = await db.countNewsletterSubscribers();
      res.json({
        total: count,
        items: items.map((s) => ({
          id: s.id,
          email: s.email,
          source: s.source,
          active: s.active,
          createdAt: s.created_at,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al listar suscriptores.' });
    }
  });

  // Blog: administración
  app.get('/api/admin/posts', requireAdmin, async (_req, res) => {
    try {
      const posts = await db.listBlogPosts();
      res.json(posts.map(serializePost));
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al listar publicaciones.' });
    }
  });

  app.post('/api/admin/posts', requireAdmin, multerErrorWrapper(uploadBlogCover.single('image')), async (req, res) => {
    try {
      const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
      const { title, excerpt, content, category, date, author, tags } = req.body as Record<string, string>;
      if (!title?.trim() || !excerpt?.trim() || !content?.trim() || !category?.trim()) {
        res.status(400).json({ error: 'Título, extracto, contenido y categoría son obligatorios.' });
        return;
      }
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      const id = `post-${crypto.randomUUID().slice(0, 8)}`;
      const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      await db.insertBlogPost({
        id,
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        category: category.trim(),
        date: date || new Date().toISOString().slice(0, 10),
        image: file ? `/blog-covers/${path.basename(file.path)}` : undefined,
        author: (author || 'Ana Ligia Mora Martínez').trim(),
        tags: tagList,
      });
      const created = await db.getBlogPostById(id);
      await db.audit(s.email, 'BLOG_PUBLICADO', 'post', id, { title: title.trim() });
      res.status(201).json(serializePost(created!));
    } catch (err: any) {
      console.error('Error al crear publicación:', err);
      res.status(500).json({ error: err.message || 'Error al crear la publicación.' });
    }
  });

  app.patch('/api/admin/posts/:id', requireAdmin, multerErrorWrapper(uploadBlogCover.single('image')), async (req, res) => {
    try {
      const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
      const id = req.params.id;
      const existing = await db.getBlogPostById(id);
      if (!existing) {
        res.status(404).json({ error: 'Publicación no encontrada.' });
        return;
      }
      const b = (req.body || {}) as Record<string, string>;
      const file = (req as express.Request & { file?: Express.Multer.File }).file;
      const data: Parameters<typeof db.updateBlogPost>[1] = {};
      if (b.title !== undefined) data.title = b.title.trim();
      if (b.excerpt !== undefined) data.excerpt = b.excerpt.trim();
      if (b.content !== undefined) data.content = b.content.trim();
      if (b.category !== undefined) data.category = b.category.trim();
      if (b.date !== undefined && b.date) data.date = b.date;
      if (b.author !== undefined && b.author.trim()) data.author = b.author.trim();
      if (b.tags !== undefined) data.tags = b.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (file) {
        if (existing.image && existing.image.startsWith('/blog-covers/')) {
          fs.rm(path.join(db.uploadsBlogDir, path.basename(existing.image)), { force: true }, () => {});
        }
        data.image = `/blog-covers/${path.basename(file.path)}`;
      }
      const updated = await db.updateBlogPost(id, data);
      await db.audit(s.email, 'BLOG_ACTUALIZADO', 'post', id, { title: updated!.title });
      res.json(serializePost(updated!));
    } catch (err: any) {
      console.error('Error al actualizar publicación:', err);
      res.status(500).json({ error: err.message || 'Error al actualizar la publicación.' });
    }
  });

  app.delete('/api/admin/posts/:id', requireAdmin, async (req, res) => {
    const s = (req as express.Request & { session?: { email: string; name: string } }).session!;
    const post = await db.getBlogPostById(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicación no encontrada.' });
      return;
    }
    await db.deleteBlogPost(post.id);
    await db.audit(s.email, 'BLOG_ELIMINADO', 'post', post.id, { title: post.title });
    res.json({ ok: true });
  });

  app.get('/api/admin/bills/:id/supports', requireAdmin, async (req, res) => {
    const bill = await db.getBillById(Number(req.params.id));
    if (!bill) {
      res.status(404).json({ error: 'Proyecto de ley no encontrado.' });
      return;
    }
    const supports = await db.listBillSupports(bill.id);
    res.json({
      bill: { id: bill.id, number: bill.number, title: bill.title },
      supports: supports.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        createdAt: r.created_at,
      })),
    });
  });

  /* ---------- Frontend ---------- */

  app.use('/blog-covers', express.static(db.uploadsBlogDir));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado.' });
  });

  // El bundle del servidor y los source maps nunca deben servirse
  app.use((req, res, next) => {
    const p = req.path;
    if (p === '/server.cjs' || p === '/server.js' || p.endsWith('.map')) {
      res.status(404).end();
      return;
    }
    next();
  });

  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  const distPath = path.join(process.cwd(), 'dist');

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndexPath);
    });
    console.log('[Conf] Frontend: dist/ (producción)');
  } else {
    console.log('[Conf] Frontend: Vite middleware (desarrollo)');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Server] Portal Legislativo Ana Ligia Mora listo en el puerto ${PORT}`);
    console.log(`[Conf] Email ${mail.emailConfigured ? 'configurado (Resend)' : 'NO configurado'}`);
    console.log('[Conf] Triage PQRSD: plantilla institucional (gestión manual del despacho — sin IA)');
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
    const users = await db.listUsers();
    if (users.length === 0) {
      const adminName  = process.env.ADMIN_NAME;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPass  = process.env.ADMIN_PASSWORD;
      if (adminName && adminEmail && adminPass) {
        try {
          await db.createUser({ name: adminName, email: adminEmail, password: adminPass });
          console.log(`[Conf] Usuario del Despacho creado automáticamente: ${adminEmail}`);
        } catch (e) {
          console.error('[Conf] Error al crear usuario inicial:', e);
        }
      } else {
        console.warn('[Conf] No hay usuarios del Despacho. Defina ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en .env para crearlos automáticamente.');
      }
    }
    const periodEnd = process.env.PERIOD_END_DATE || '';
    console.log(`[Conf] Retención: anonimiza radicados inactivos tras ${retentionDays} días. Cierre de periodo: ${periodEnd || 'no definido'}.`);
    if (APP_URL) console.log(`[Conf] APP_URL ${APP_URL}`);
  });
}

process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
});

startServer().catch((err) => {
  console.error('[FATAL] El servidor no pudo iniciar:', err);
  process.exit(1);
});
