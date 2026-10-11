/**
 * Optimización única de imágenes del portal (local, NO corre en Render).
 * Origen: public/  →  Destino: carpeta fuera de public/ (nunca borra ni sobreescribe originales).
 *
 * Reglas aprobadas:
 *  - galeria/recientes/N.jpg → N-thumb.webp (800px, q78) + N.webp (1920px, q78)
 *  - logo-cd-new.png         → logo-cd-new.webp (alto 128, alfa conservado)
 *  - enamorados_antioquia.png→ enamorados_antioquia.webp (alto 128, alfa conservado)
 *  - foto_oficial.jpg        → foto_oficial.jpg (1200px, JPEG q80, mismo nombre y formato)
 *  - blog-1..8 y placeholder : NO se tocan (datos de ejemplo)
 *  - .rotate() antes de quitar metadatos; sin .withMetadata() → sin EXIF/GPS en la salida
 *
 * Al final verifica TODOS los archivos generados con sharp.metadata():
 * si alguno conserva EXIF o GPS, el script termina con código 1.
 *
 * Uso:  cmd /c node scripts\optimize_images.mjs [carpeta-destino]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public');
const OUT = path.resolve(process.argv[2] || 'C:/Users/esteb/OneDrive/Desktop/Ana Ligia/_webp-estabilizacion');

const THUMB_W = 800;
const BIG_W = 1920;
const WEBP_Q = 78;
const HERO_W = 1200;
const HERO_JPEG_Q = 80;
const LOGO_H = 128;
const GALLERY_COUNT = 63;

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

/** ¿El buffer EXIF contiene el tag GPSInfo IFD (0x8825)? */
function exifHasGps(exif) {
  if (!exif || exif.length < 12) return false;
  const off = exif[0] === 0x45 && exif[1] === 0x78 ? 6 : 0; // "Exif\0\0"
  const le = exif[off] === 0x49 && exif[off + 1] === 0x49; // II (little-endian)
  const be = exif[off] === 0x4d && exif[off + 1] === 0x4d; // MM (big-endian)
  if (!le && !be) return false;
  const u16 = (o) => (le ? exif.readUInt16LE(o) : exif.readUInt16BE(o));
  const u32 = (o) => (le ? exif.readUInt32LE(o) : exif.readUInt32BE(o));
  if (u16(off + 2) !== 42) return false; // magia TIFF
  const ifd0 = off + u32(off + 4);
  if (ifd0 + 2 > exif.length) return false;
  const n = u16(ifd0);
  for (let i = 0; i < n; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 2 > exif.length) break;
    if (u16(entry) === 0x8825) return true; // GPSInfo IFD
  }
  return false;
}

async function convert(srcAbs, outAbs, { width, height, format, quality }) {
  const before = fs.statSync(srcAbs).size;
  let pipeline = sharp(srcAbs).rotate();
  if (width || height) {
    pipeline = pipeline.resize({
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      withoutEnlargement: true,
    });
  }
  if (format === 'webp') pipeline = pipeline.webp({ quality });
  else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality });
  else throw new Error(`Formato no soportado: ${format}`);
  await pipeline.toFile(outAbs); // sin .withMetadata() → metadatos (EXIF/GPS) eliminados
  const after = fs.statSync(outAbs).size;
  const m = await sharp(outAbs).metadata();
  console.log(
    `  ${path.relative(OUT, outAbs).padEnd(38)} ${String(m.width + 'x' + m.height).padEnd(12)} ` +
    `${kb(before).padStart(10)} -> ${kb(after).padStart(10)}  (${((1 - after / before) * 100).toFixed(1)}% menos)`
  );
}

// ---------------------------------------------------------------------------
// 1) Generar
// ---------------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'galeria', 'recientes'), { recursive: true });

console.log(`Origen : ${SRC}`);
console.log(`Destino: ${OUT}\n`);
console.log('Galeria (miniatura 800 q78 + grande 1920 q78):');
for (let i = 1; i <= GALLERY_COUNT; i++) {
  const srcAbs = path.join(SRC, 'galeria', 'recientes', `${i}.jpg`);
  if (!fs.existsSync(srcAbs)) throw new Error(`Falta la foto original: ${srcAbs}`);
  await convert(srcAbs, path.join(OUT, 'galeria', 'recientes', `${i}-thumb.webp`),
    { width: THUMB_W, format: 'webp', quality: WEBP_Q });
  await convert(srcAbs, path.join(OUT, 'galeria', 'recientes', `${i}.webp`),
    { width: BIG_W, format: 'webp', quality: WEBP_Q });
}

console.log('\nLogos (WebP, alfa conservado):');
await convert(path.join(SRC, 'logo-cd-new.png'), path.join(OUT, 'logo-cd-new.webp'),
  { height: LOGO_H, format: 'webp', quality: WEBP_Q });
await convert(path.join(SRC, 'enamorados_antioquia.png'), path.join(OUT, 'enamorados_antioquia.webp'),
  { height: LOGO_H, format: 'webp', quality: WEBP_Q });

console.log('\nFoto oficial del Hero (misma nombre y formato .jpg):');
await convert(path.join(SRC, 'foto_oficial.jpg'), path.join(OUT, 'foto_oficial.jpg'),
  { width: HERO_W, format: 'jpeg', quality: HERO_JPEG_Q });

// ---------------------------------------------------------------------------
// 2) Verificar TODOS los generados: EXIF y GPS deben ser 0
// ---------------------------------------------------------------------------
const generated = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else generated.push(p);
  }
})(OUT);

let conExif = 0;
let conGps = 0;
let totalAfter = 0;
for (const f of generated) {
  const m = await sharp(f).metadata();
  totalAfter += fs.statSync(f).size;
  if (m.exif) {
    conExif++;
    if (exifHasGps(m.exif)) conGps++;
    console.log(`  [EXIF] ${path.relative(OUT, f)}`);
  }
}

let totalBefore = 0;
for (let i = 1; i <= GALLERY_COUNT; i++) totalBefore += fs.statSync(path.join(SRC, 'galeria', 'recientes', `${i}.jpg`)).size;
totalBefore += fs.statSync(path.join(SRC, 'logo-cd-new.png')).size;
totalBefore += fs.statSync(path.join(SRC, 'enamorados_antioquia.png')).size;
totalBefore += fs.statSync(path.join(SRC, 'foto_oficial.jpg')).size;

console.log(`\nVerificacion: ${generated.length} archivos generados | con EXIF: ${conExif} | con GPS: ${conGps}`);
console.log(`Peso originales tocados: ${kb(totalBefore)}  ->  generados: ${kb(totalAfter)}  (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% menos)`);
if (conExif > 0 || conGps > 0) {
  console.error('ERROR: hay archivos con EXIF/GPS en la salida.');
  process.exit(1);
}
console.log('OK: 0 archivos con EXIF, 0 con GPS.');
