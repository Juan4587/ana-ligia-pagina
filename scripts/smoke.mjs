/**
 * Pruebas de humo del API del portal PQRSD.
 *
 * Requiere que el servidor esté corriendo. El URL se toma de la variable
 * APP_URL o de http://localhost:3000 por defecto.
 *
 * PREREQUISITO: Ejecutar antes npm run seed:admin para crear el usuario
 * de prueba (test-admin@despacho.co). Este script ya no crea usuarios
 * automáticamente.
 *
 * Uso:
 *   npm run seed:admin   (una vez, o si el usuario fue eliminado)
 *   npm run dev          (en otra terminal)
 *   npm run smoke
 */

import dotenv from 'dotenv';

dotenv.config();

// Protección: no ejecutar smoke contra base de datos de Render ni contra sitios remotos.
const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl) {
  try {
    const dbHost = new URL(dbUrl).hostname.toLowerCase();
    if (dbHost === 'render.com' || dbHost.endsWith('.render.com')) {
      console.error('Abortando smoke: DATABASE_URL apunta a un host de Render.');
      process.exit(1);
    }
  } catch {
    console.error('Abortando smoke: DATABASE_URL inválido.');
    process.exit(1);
  }
}

const baseUrl = process.env.APP_URL || 'http://localhost:3000';
try {
  const parsed = new URL(baseUrl);
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }
  const localHosts = ['localhost', '127.0.0.1', '::1'];
  if (!localHosts.includes(host)) {
    console.error('Abortando smoke: APP_URL no apunta a localhost.');
    process.exit(1);
  }
} catch {
  console.error('Abortando smoke: APP_URL inválido.');
  process.exit(1);
}

const BASE = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TEST_EMAIL = 'test-admin@despacho.co';
const TEST_PASS = 'test-admin-clave-segura';

let passed = 0, failed = 0;

function ok(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${extra}`); }
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.json) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, {
    ...opts,
    headers,
    body: opts.json ? JSON.stringify(opts.json) : opts.body,
  });
  return res;
}

async function main() {
  // Auth por usuario (email + clave)
  console.log('\n[1] Auth admin (usuarios)');
  let r = await req('/api/admin/auth', { method: 'POST', json: { email: TEST_EMAIL, password: 'incorrecta' } });
  ok('auth rechaza clave incorrecta (401)', r.status === 401, `got ${r.status}`);
  r = await req('/api/admin/auth', { method: 'POST', json: { email: TEST_EMAIL, password: TEST_PASS } });
  const auth = r.status === 200 ? await r.json() : null;
  ok('auth acepta correo+clave correctos (200)', r.status === 200, `got ${r.status}`);
  ok('auth devuelve token de sesión', !!auth?.token, 'sin token');
  const TOKEN = auth?.token;
  ok('auth devuelve datos del usuario', auth?.user?.email === TEST_EMAIL);

  r = await req('/api/admin/me', { token: TOKEN });
  ok('me devuelve la sesión activa', r.status === 200 && (await r.json()).email === TEST_EMAIL);

  // Auth: usuario desactivado no puede entrar aunque la clave sea correcta
  console.log('\n[1.1] Auth: usuario desactivado');
  const inactiveEmail = `test-inactive-${Date.now()}@despacho.co`;
  const inactivePass = 'test-inactive-clave-segura';
  r = await req('/api/admin/users', { method: 'POST', token: TOKEN, json: { name: 'Inactivo', email: inactiveEmail, password: inactivePass } });
  const inactiveUser = r.status === 201 ? await r.json() : null;
  ok('crear usuario temporal para prueba de desactivación', !!inactiveUser, `got ${r.status}`);
  if (inactiveUser) {
    try {
      r = await req(`/api/admin/users/${inactiveUser.id}`, { method: 'PATCH', token: TOKEN, json: { isActive: false } });
      ok('desactivar usuario temporal', r.status === 200, `got ${r.status}`);
      r = await req('/api/admin/auth', { method: 'POST', json: { email: inactiveEmail, password: inactivePass } });
      ok('auth rechaza usuario desactivado aunque la clave sea correcta (403)', r.status === 403, `got ${r.status}`);
    } finally {
      await req(`/api/admin/users/${inactiveUser.id}`, { method: 'PATCH', token: TOKEN, json: { isActive: true } });
      await req(`/api/admin/users/${inactiveUser.id}`, { method: 'DELETE', token: TOKEN });
    }
  }

  // El endpoint público inseguro ya no debe existir
  r = await req('/api/pqrsd/list');
  ok('endpoint /api/pqrsd/list eliminado (404/int 500/401)', r.status === 404 || r.status >= 400, `got ${r.status}`);

  // Submit (sin archivos)
  console.log('\n[2] Radicar PQRSD');
  r = await req('/api/pqrsd/submit', {
    method: 'POST',
    json: { firstName: 'María', lastName: 'Gómez', email: 'maria@test.co', phone: '3001112233', type: 'Petición', proposalId: 'general', description: 'Solicito información sobre los trámites de acueducto veredal en mi municipio.' },
  });
  const sub = r.status === 201 ? await r.json() : null;
  ok('submit devuelve 201', r.status === 201, `got ${r.status}`);
  ok('radicado tiene id RAD-ALM', sub && /^RAD-ALM-\d{4}-\d{4}$/.test(sub.id), sub?.id);
  ok('submit devuelve aiResponse', !!sub?.aiResponse);
  const radicadoId = sub?.id;

  // Validaciones
  r = await req('/api/pqrsd/submit', { method: 'POST', json: { firstName: 'X' } });
  ok('submit rechaza campos incompletos (400)', r.status === 400, `got ${r.status}`);
  r = await req('/api/pqrsd/submit', { method: 'POST', json: { firstName: 'A', lastName: 'B', email: 'no-email', phone: '1', type: 'Petición', proposalId: 'general', description: 'descripción mínima válida' } });
  ok('submit rechaza correo inválido (400)', r.status === 400, `got ${r.status}`);

  // Track público (sin PII)
  console.log('\n[3] Seguimiento ciudadano');
  r = await req('/api/pqrsd/track', { method: 'POST', json: { id: radicadoId } });
  const track = r.status === 200 ? await r.json() : null;
  ok('track devuelve el radicado', r.status === 200 && track?.id === radicadoId);
  ok('track NO expone correo ni nombre', track && !('email' in track) && !('firstName' in track));
  r = await req('/api/pqrsd/track', { method: 'POST', json: { id: 'NO-EXISTE' } });
  ok('track 404 para radicado inexistente', r.status === 404);

  // Admin lista y detalle
  console.log('\n[4] Panel admin: listar + detalle');
  r = await req('/api/admin/submissions', { token: TOKEN });
  const list = await r.json();
  ok('listar radicados con token (200)', r.status === 200);
  const mine = list.items.find((s) => s.id === radicadoId);
  ok('listado muestra el correo descifrado para admin', mine && mine.email === 'maria@test.co');
  ok('listado muestra la descripción descifrada', mine && mine.description.includes('acueducto veredal'));
  r = await req('/api/admin/submissions', {});
  ok('listar sin token es rechazado (401)', r.status === 401, `got ${r.status}`);
  r = await req(`/api/admin/submissions/${radicadoId}`, { token: TOKEN });
  ok('detalle devuelve documento + contacto', r.status === 200 && (await r.json()).phone === '3001112233');

  // Cambio de estado
  console.log('\n[5] Estado y respuesta');
  r = await req(`/api/admin/submissions/${radicadoId}`, { method: 'PATCH', token: TOKEN, json: { status: 'En Revisión' } });
  ok('cambiar estado a En Revisión', r.status === 200 && (await r.json()).status === 'En Revisión');

  r = await req(`/api/admin/submissions/${radicadoId}/respond`, { method: 'POST', token: TOKEN, json: { response: 'Su solicitud fue revisada y será respondida por la unidad territorial correspondiente.', sendEmail: true } });
  const resp = await r.json();
  ok('responder guarda y pasa a Resuelto', r.status === 200 && resp.status === 'Resuelto');
  ok('respuesta contiene flag emailed (boolean)', typeof resp.emailed === 'boolean');

  // Auditoría registra acciones sensibles
  console.log('\n[6] Auditoría');
  r = await req('/api/admin/audit', { token: TOKEN });
  const audit = await r.json();
  ok('auditoría accesible con sesión', r.status === 200);
  ok('auditoría registra RESPUESTA del radicado', audit.items.some((a) => a.action === 'RESPUESTA' && a.targetId === radicadoId));
  ok('auditoría registra LOGIN_EXITOSO', audit.items.some((a) => a.action === 'LOGIN_EXITOSO'));

  // Anonimización
  console.log('\n[7] Anonimización');
  r = await req(`/api/admin/submissions/${radicadoId}/anonymize`, { method: 'POST', token: TOKEN });
  ok('anonimizar responde ok', r.status === 200);
  r = await req(`/api/admin/submissions/${radicadoId}`, { token: TOKEN });
  const anon = await r.json();
  ok('datos personales borrados tras anonimizar', anon.firstName === null && anon.email === null && anon.phone === null && anon.anonymized === true);
  r = await req('/api/pqrsd/track', { method: 'POST', json: { id: radicadoId } });
  ok('track reporta radicado como anonimizado', (await r.json()).anonymized === true);

  // Eliminación
  console.log('\n[8] Eliminación');
  r = await req(`/api/admin/submissions/${radicadoId}`, { method: 'DELETE', token: TOKEN });
  ok('eliminar radicado', r.status === 200);
  r = await req('/api/pqrsd/track', { method: 'POST', json: { id: radicadoId } });
  ok('radicado ya no existe tras eliminar (404)', r.status === 404);

  // Proyectos de ley
  console.log('\n[9] Proyectos de ley');
  const fd = new FormData();
  fd.append('title', 'Proyecto de prueba Formalización Minera');
  fd.append('number', 'PL-999-2026');
  fd.append('dateFiled', '2026-01-15');
  fd.append('status', 'Primer Debate');
  fd.append('summary', 'Proyecto de ejemplo para verificar el flujo de subida.');
  fd.append('proposalIdRelated', 'formalizacion-minera');
  fd.append('impactScore', 'Alto');
  fd.append('authors', 'Ana Ligia Mora Martínez, Otro Autor');
  fd.append('initiatives', 'Iniciativa A; Iniciativa B');
  fd.append('file', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'proyecto.pdf');
  r = await req('/api/admin/bills', { method: 'POST', token: TOKEN, body: fd });
  ok('subir proyecto de ley (201)', r.status === 201, `got ${r.status}`);
  const bill = await r.json();
  ok('proyecto tiene file', bill.hasFile === true && bill.filename === 'proyecto.pdf');

  r = await req('/api/bills');
  const bills = await r.json();
  ok('GET /api/bills público lista el proyecto', r.status === 200 && bills.some((b) => b.id === bill.id));

  r = await req(`/api/bills/${bill.id}/file`);
  ok('descarga pública del documento del proyecto', r.status === 200);

  // Respaldo cívico ciudadano
  console.log('\n[9.1] Respaldo cívico a proyectos de ley');
  r = await req(`/api/bills/${bill.id}/support`, {
    method: 'POST',
    json: { name: 'Ciudadano Apoyo', email: 'ciudadano.apoyo@test.co' },
  });
  ok('respaldo cívico registrado (201)', r.status === 201);
  const supData = await r.json();
  ok('respaldo devuelve supportCount >= 1', supData.supportCount >= 1);

  // Intento de respaldo duplicado
  r = await req(`/api/bills/${bill.id}/support`, {
    method: 'POST',
    json: { name: 'Ciudadano Apoyo', email: 'ciudadano.apoyo@test.co' },
  });
  ok('respaldo duplicado es rechazado (409)', r.status === 409);

  // Admin revisa respaldos
  r = await req(`/api/admin/bills/${bill.id}/supports`, { token: TOKEN });
  const adminSups = await r.json();
  ok('admin puede consultar respaldos del proyecto', r.status === 200 && adminSups.supports.some((s) => s.email === 'ciudadano.apoyo@test.co'));

  r = await req('/api/admin/bills', { method: 'POST', body: fd });
  ok('subir ley sin token es rechazado (401)', r.status === 401, `got ${r.status}`);

  r = await req(`/api/admin/bills/${bill.id}`, { method: 'DELETE', token: TOKEN });
  ok('eliminar proyecto de ley', r.status === 200);

  // Newsletter
  console.log('\n[9.2] Suscripción al boletín');
  const nlEmail = `boletin-${Date.now()}@test.co`;
  r = await req('/api/newsletter/subscribe', {
    method: 'POST',
    json: { email: nlEmail, source: 'blog-sidebar' },
  });
  const nlData = await r.json();
  ok('suscripción registrada (201)', r.status === 201, `got ${r.status}`);
  ok('suscripción devuelve subscriberCount >= 1', nlData.subscriberCount >= 1);
  ok('suscripción incluye flag emailed (boolean)', typeof nlData.emailed === 'boolean');

  r = await req('/api/newsletter/subscribe', {
    method: 'POST',
    json: { email: nlEmail, source: 'blog-sidebar' },
  });
  const nlDup = await r.json();
  ok('suscripción duplicada es idempotente (200, already=true)', r.status === 200 && nlDup.already === true, `got ${r.status}`);
  ok('duplicada no envía correo de nuevo', nlDup.emailed === false);

  r = await req('/api/newsletter/subscribe', {
    method: 'POST',
    json: { email: 'no-es-correo' },
  });
  ok('suscripción rechaza correo inválido (400)', r.status === 400, `got ${r.status}`);

  r = await req('/api/newsletter/subscribe', { method: 'POST', json: {} });
  ok('suscripción rechaza correo vacío (400)', r.status === 400, `got ${r.status}`);

  r = await req('/api/admin/newsletter', { token: TOKEN });
  const nlList = await r.json();
  ok('admin lista suscriptores (200)', r.status === 200, `got ${r.status}`);
  ok('listado incluye total y el email registrado', nlList.total >= 1 && nlList.items?.some((s) => s.email === nlEmail));

  r = await req('/api/admin/newsletter');
  ok('listado newsletter exige sesión (401)', r.status === 401, `got ${r.status}`);

  // Logout
  console.log('\n[10] Cierre de sesión');
  r = await req('/api/admin/logout', { method: 'POST', token: TOKEN });
  ok('logout responde ok', r.status === 200);
  r = await req('/api/admin/submissions', { token: TOKEN });
  ok('token invalidado tras logout (401)', r.status === 401, `got ${r.status}`);

  console.log(`\nResultado: ${passed} ok, ${failed} fallos`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });