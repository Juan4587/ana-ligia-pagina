/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resolución de la IP real del visitante detrás de Cloudflare / Render.
 * Usado por rate-limit y lockout de login en server.ts.
 */
import ipaddr from 'ipaddr.js';

/** Rangos IPv4 de Cloudflare — https://www.cloudflare.com/ips-v4 */
const CF_RANGES_V4: [string, number][] = [
  ['173.245.48.0', 20], ['103.21.244.0', 22], ['103.22.200.0', 22], ['103.31.4.0', 22],
  ['141.101.64.0', 18], ['108.162.192.0', 18], ['190.93.240.0', 20], ['188.114.96.0', 20],
  ['197.234.240.0', 22], ['198.41.128.0', 17], ['162.158.0.0', 15], ['104.16.0.0', 13],
  ['104.24.0.0', 14], ['172.64.0.0', 13], ['131.0.72.0', 22],
];

/** Rangos IPv6 de Cloudflare — https://www.cloudflare.com/ips-v6 */
const CF_RANGES_V6: [string, number][] = [
  ['2400:cb00::', 32], ['2606:4700::', 32], ['2803:f800::', 32], ['2405:b500::', 32],
  ['2405:8100::', 32], ['2a06:98c0::', 29], ['2c0f:f248::', 32],
];

let cfSubnetsV4: [ipaddr.IPv4, number][];
let cfSubnetsV6: [ipaddr.IPv6, number][];

function buildCfSubnets(extra?: string): void {
  cfSubnetsV4 = CF_RANGES_V4.map(([net, bits]) => ipaddr.IPv4.parseCIDR(`${net}/${bits}`));
  cfSubnetsV6 = CF_RANGES_V6.map(([net, bits]) => ipaddr.IPv6.parseCIDR(`${net}/${bits}`));
  for (const entry of (extra || '').split(',')) {
    const cidr = entry.trim();
    if (!cidr) continue;
    try {
      const parsed = ipaddr.parseCIDR(cidr);
      if (parsed[0].kind() === 'ipv4') cfSubnetsV4.push([parsed[0] as ipaddr.IPv4, parsed[1]]);
      else cfSubnetsV6.push([parsed[0] as ipaddr.IPv6, parsed[1]]);
    } catch {
      console.warn(`[conf] CF_IP_RANGES_EXTRA: CIDR inválido ignorado: ${cidr}`);
    }
  }
}

export function isCloudflareIp(addr: string): boolean {
  try {
    let parsed = ipaddr.parse(addr);
    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
      parsed = (parsed as ipaddr.IPv6).toIPv4Address();
    }
    const subnets = parsed.kind() === 'ipv4' ? cfSubnetsV4 : cfSubnetsV6;
    return ipaddr.subnetMatch(parsed, subnets as never, '') !== '';
  } catch {
    return false;
  }
}

export function normalizeIp(addr: string): string {
  try {
    let parsed = ipaddr.parse(addr);
    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
      parsed = (parsed as ipaddr.IPv6).toIPv4Address();
    }
    return parsed.toString();
  } catch {
    return addr;
  }
}

export interface IpReq {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
}

/**
 * Resuelve la IP real del visitante.
 * - mode=direct: peer TCP directo (solo pruebas locales).
 * - mode=auto (default): si req.ip (trust proxy=1) cae en un rango de Cloudflare,
 *   usa CF-Connecting-IP; si no, usa req.ip (correcto para Render-directo).
 */
export function resolveClientIp(req: IpReq, mode?: string): string {
  const effectiveMode = mode || process.env.TRUST_PROXY_MODE || 'auto';
  const socketIp = normalizeIp(req.socket.remoteAddress || 'unknown');
  if (effectiveMode === 'direct') return socketIp;

  const resolved = normalizeIp(req.ip || socketIp);
  if (isCloudflareIp(resolved)) {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf.trim()) return normalizeIp(cf.trim());
  }
  return resolved;
}

// Inicializa con los rangos extra del env (si existe) al cargar el módulo.
buildCfSubnets(process.env.CF_IP_RANGES_EXTRA);
