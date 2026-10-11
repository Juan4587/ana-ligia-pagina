import fs from 'node:fs';
import path from 'node:path';

function dim(p: string): { w: number | null; h: number | null } {
  const b = fs.readFileSync(p);
  const e = path.extname(p).toLowerCase();
  if (e === '.png') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (e === '.jpg' || e === '.jpeg') {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (e === '.svg') {
    const s = b.toString('utf8', 0, 700);
    const w = /width="([\d.]+)/.exec(s);
    const h = /height="([\d.]+)/.exec(s);
    const vb = /viewBox="[\s]*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)"/.exec(s);
    return { w: w ? parseFloat(w[1]) : (vb ? parseFloat(vb[1]) : null), h: h ? parseFloat(h[1]) : (vb ? parseFloat(vb[2]) : null) };
  }
  return { w: null, h: null };
}

const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico']);
const out: { f: string; bytes: number; w: number | null; h: number | null }[] = [];
function walk(d: string) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name).toLowerCase())) {
      const s = fs.statSync(p);
      let dd = { w: null, h: null };
      try { dd = dim(p); } catch { /* ignore */ }
      out.push({ f: p.replace(/\\/g, '/'), bytes: s.size, w: dd.w, h: dd.h });
    }
  }
}
walk('public');
walk('src');
out.sort((a, b) => b.bytes - a.bytes);
for (const o of out) console.log(`${o.f} | ${o.bytes} | ${o.w}x${o.h}`);
const total = out.reduce((a, b) => a + b.bytes, 0);
console.log(`TOTAL files=${out.length} bytes=${total}`);
