import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const dir = 'C:\\Users\\esteb\\OneDrive\\Desktop\\Ana Ligia\\Proyectos de ley';
const outDir = 'C:\\Users\\esteb\\AppData\\Local\\Temp\\opencode\\proyectos_texto';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));

(async () => {
  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    try {
      const parser = new PDFParse({ data: dataBuffer });
      await parser.load();
      const res = await parser.getText();
      const text = res?.text || '';
      const info = await parser.getInfo();
      await parser.destroy();
      const out = path.join(outDir, file.replace('.pdf', '.txt'));
      fs.writeFileSync(out, text, 'utf8');
      console.log(`OK ${file} -> pages=${res.total} chars=${text.length} title=${info?.Title || 'n/a'}`);
    } catch (e) {
      console.log(`ERR ${file}: ${e.message}`);
    }
  }
})();