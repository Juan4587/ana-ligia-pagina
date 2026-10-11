/**
 * Pruebas unitarias de resolveClientIp — src/server/ip.ts
 * Simula las topologías: Render-directo, Cloudflare→Render, spoofing.
 * Uso: node --import tsx scripts/test_ip.mts
 */
import { resolveClientIp, isCloudflareIp, normalizeIp, IpReq } from '../src/server/ip.js';

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok  ${label}`); }
  else { failed++; console.error(` FAIL ${label}`); }
}

function makeReq(ip: string | undefined, remoteAddress: string, cfConnectingIp?: string): IpReq {
  return {
    ip,
    headers: cfConnectingIp ? { 'cf-connecting-ip': cfConnectingIp } : {},
    socket: { remoteAddress },
  };
}

console.log('--- resolveClientIp: topologías ---');

// Caso (a) Render-directo: socket = LB privado, req.ip = cliente real (trust proxy=1)
// Sin cabeceras CF. req.ip se usa directamente.
ok('Render-directo: usa req.ip (cliente real)',
  resolveClientIp(makeReq('203.0.113.50', '10.0.0.5'), 'auto') === '203.0.113.50');

// Caso (b) Cloudflare→Render: req.ip = IP de CF (trust proxy=1 toma la última de XFF).
// CF-Connecting-IP tiene la IP real del cliente.
ok('Cloudflare→Render: usa CF-Connecting-IP cuando req.ip es rango CF',
  resolveClientIp(makeReq('173.245.48.5', '10.0.0.5', '198.51.100.7'), 'auto') === '198.51.100.7');

// Caso (b-v6) Cloudflare IPv6 → usa CF-Connecting-IP
ok('Cloudflare IPv6: detecta rango CF v6 y usa CF-Connecting-IP',
  resolveClientIp(makeReq('2400:cb00::1', '10.0.0.5', '2001:db8::1'), 'auto') === '2001:db8::1');

// Caso (b-mapped) Cloudflare IPv4-mapped en socket (::ffff:173.245.48.5)
ok('Cloudflare IPv4-mapped: normaliza y detecta rango CF',
  resolveClientIp(makeReq('::ffff:173.245.48.5', '::ffff:173.245.48.5', '198.51.100.9'), 'auto') === '198.51.100.9');

// Caso spoofing directo: atacante envía X-Forwarded-For falso pero llega sin pasar por CF.
// req.ip NO es rango CF → se ignora CF-Connecting-IP (spoofed) y se usa req.ip.
ok('Spoof directo: CF-Connecting-IP falsa se ignora si req.ip no es rango CF',
  resolveClientIp(makeReq('203.0.113.99', '203.0.113.99', '1.2.3.4'), 'auto') === '203.0.113.99');

// Caso mode=direct: siempre devuelve el peer TCP, ignora cabeceras.
ok('mode=direct: devuelve socket.remoteAddress sin importar cabeceras',
  resolveClientIp(makeReq('173.245.48.5', '10.0.0.5', '1.2.3.4'), 'direct') === '10.0.0.5');

// Caso sin CF-Connecting-IP pero req.ip en rango CF: devuelve req.ip (fallback).
ok('Rango CF sin cabecera CF: devuelve req.ip como fallback',
  resolveClientIp(makeReq('104.16.1.1', '10.0.0.5'), 'auto') === '104.16.1.1');

console.log('--- isCloudflareIp ---');

ok('IPv4 en rango CF v4', isCloudflareIp('173.245.48.1'));
ok('IPv4 en rango 104.16.0.0/13', isCloudflareIp('104.16.0.1'));
ok('IPv4 NO en rango CF', !isCloudflareIp('8.8.8.8'));
ok('IPv4 privada NO en rango CF', !isCloudflareIp('192.168.1.1'));
ok('IPv6 en rango CF v6', isCloudflareIp('2400:cb00::1'));
ok('IPv6 NO en rango CF', !isCloudflareIp('2001:db8::1'));
ok('IPv4-mapped en rango CF', isCloudflareIp('::ffff:173.245.48.1'));
ok('IP inválida → false', !isCloudflareIp('not-an-ip'));

console.log('--- normalizeIp ---');

ok('IPv4-mapped se normaliza a IPv4', normalizeIp('::ffff:173.245.48.1') === '173.245.48.1');
ok('IPv4 queda igual', normalizeIp('8.8.8.8') === '8.8.8.8');
ok('IPv6 válida se conserva', normalizeIp('2400:cb00::1') === '2400:cb00::1');
ok('Inválida se devuelve tal cual', normalizeIp('garbage') === 'garbage');

console.log(`\n${passed} ok, ${failed} fallo(s)`);
process.exit(failed > 0 ? 1 : 0);
