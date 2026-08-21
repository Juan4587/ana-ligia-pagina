/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Siembra los 5 proyectos de ley base en la base de datos y copia sus PDF
 * a data/uploads/bills. Idempotente: omite proyectos ya ingresados (por número).
 *
 * Uso: npx tsx scripts/seed_bills.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { insertBill, listBills, uploadsBillsDir } from '../src/server/db.js';

const defaultSourceDir = fs.existsSync(path.resolve(process.cwd(), 'Proyectos de ley'))
  ? path.resolve(process.cwd(), 'Proyectos de ley')
  : path.resolve(process.cwd(), '..', 'Proyectos de ley');

const SOURCE_DIR = process.env.BILLS_SOURCE_DIR || defaultSourceDir;

const authors = ['Ana Ligia Mora Martínez', 'Daruin Castellanos Romero', 'Hernán Darío Cadavid Márquez'];

const BILLS = [
  {
    file: 'P.L.115-2026SC-RENTAS-VERDES-Y-CORREDORES-VERDES.pdf',
    number: 'PL 115/2026 Cámara',
    title: 'Programa Nacional de Rentas Verdes — Incentivo a la Gestión Ambiental y Comunitaria de Corredores Verdes',
    dateFiled: '2026-07-29',
    status: 'Radicado',
    proposalIdRelated: 'ambiente',
    impactScore: 'Alto',
    summary:
      'Crea el Programa Nacional de Rentas Verdes: transferencias económicas condicionadas para que personas naturales y esquemas comunitarios (priorizando mujeres cabeza de familia, población joven y adultos mayores) desarrollen labores de limpieza, jardinería, monitoreo y protección de corredores verdes, parques, arbolado urbano y espacios públicos verdes, contribuyendo a la conectividad ecológica y a la adaptación al cambio climático.',
    stageDescription: 'Radicado ante la Secretaría General de la Cámara de Representantes el 29 de julio de 2026. Pendiente de reparto a Comisión.',
    initiatives: [
      'Renta Verde: transferencia monetaria condicionada a personas naturales o esquemas comunitarios por el cuidado, limpieza, jardinería, monitoreo y protección de espacios públicos verdes.',
      'Actividades de intervención comunitaria: remoción de residuos, siembra y mantenimiento del arbolado, control de especies invasoras y reporte de riesgos fitosanitarios.',
      'Financiación con obligaciones urbanísticas de constructores, presupuesto territorial, donaciones privadas y recursos del Fondo para la Vida y la Biodiversidad.',
      'Focalización con enfoque diferencial (mujeres cabeza de familia, jóvenes y adultos mayores), de acuerdo con el SISBÉN IV.',
    ],
  },
  {
    file: 'P.L.116-2026SC-TRAMITES-AMBIENTALES-PARA-PROYECTOS-DUP.pdf',
    number: 'PL 116/2026 Cámara',
    title: 'Procedimiento de trámites ambientales para proyectos con Declaración de Utilidad Pública e Interés Social (DUP)',
    dateFiled: '2026-07-29',
    status: 'Radicado',
    proposalIdRelated: 'ambiente',
    impactScore: 'Alto',
    summary:
      'Define un procedimiento ágil, estandarizado y soportado en herramientas digitales para la evaluación y decisión de trámites ambientales (licencia ambiental, concesiones de aguas, permisos y autorizaciones) de proyectos con Declaración de Utilidad Pública e Interés Social (DUP), garantizando el rigor técnico, el principio de prevención, la protección del medio ambiente y la seguridad jurídica de las inversiones.',
    stageDescription: 'Radicado ante la Secretaría General de la Cámara de Representantes el 29 de julio de 2026. Pendiente de reparto a Comisión.',
    initiatives: [
      'Trámites sujetos a la ley: licencia ambiental, concesiones de aguas y sus modificaciones, prórrogas y renovaciones para proyectos con DUP.',
      'Radicación digital y parametrizada que cuantifica términos y etapas del proceso.',
      'Términos máximos de decisión (por ejemplo, 40 días hábiles para la licencia ambiental) y efectos legales y sanciones por incumplimiento de la autoridad ambiental.',
      'Decisión de fondo motivada que protege la seguridad jurídica y la transparencia institucional.',
    ],
  },
  {
    file: 'P.L.118-2026SC-GESTION-DE-ANIMALES-ASILVESTRADOS.pdf',
    number: 'PL 118/2026 Cámara',
    title: 'Gestión de animales de especies domésticas con comportamiento silvestre (asilvestrados)',
    dateFiled: '2026-07-29',
    status: 'Radicado',
    proposalIdRelated: 'ambiente',
    impactScore: 'Medio',
    summary:
      'Adiciona un numeral al artículo 31 de la Ley 99 de 1993 para facultar a las Corporaciones Autónomas Regionales (CAR) y de Desarrollo Sostenible a intervenir y gestionar poblaciones de animales de especies domésticas con comportamiento silvestre (asilvestrados) que representen amenazas reales o potenciales para la salud pública ambiental, la biodiversidad y los ecosistemas estratégicos, adoptando medidas preventivas para evitar la generación de nuevas poblaciones que afecten los ecosistemas.',
    stageDescription: 'Radicado ante la Secretaría General de la Cámara de Representantes el 29 de julio de 2026. Pendiente de reparto a Comisión.',
    initiatives: [
      'Faculta a las CAR y Corporaciones de Desarrollo Sostenible para gestionar poblaciones de animales asilvestrados que amenacen la salud pública ambiental y la biodiversidad.',
      'Define el concepto de animales de especies domésticas con comportamiento silvestre.',
      'Medidas preventivas para evitar la generación de nuevas poblaciones asilvestradas.',
      'Corresponsabilidad entre autoridades, sector privado y comunidad, con fuentes de financiación para su implementación.',
    ],
  },
  {
    file: 'P.L.119-2026SC-PAGO-POR-SERVICIOS-AGROECOLOGICOS.pdf',
    number: 'PL 119/2026 Cámara',
    title: 'Pago por Servicios Agroecológicos (PSA-Eco) para el campesinado colombiano',
    dateFiled: '2026-07-29',
    status: 'Radicado',
    proposalIdRelated: 'rural',
    impactScore: 'Alto',
    summary:
      'Crea el mecanismo de Pago por Servicios Agroecológicos (PSA-Eco): un incentivo económico directo, periódico y condicionado que reconoce, capitaliza y fomenta el emprendimiento rural y el cuidado ambiental en las comunidades campesinas que integran la producción de alimentos —sistemas agrícolas, pecuarios (porcícolas, avícolas, ganaderos, capricultura) y de especies menores de base ecológica— con tecnificación, productividad y uso sostenible de los ecosistemas, cuidado del suelo, agrobiodiversidad y gestión del recurso hídrico.',
    stageDescription: 'Radicado ante la Secretaría General de la Cámara de Representantes el 29 de julio de 2026. Pendiente de reparto a Comisión.',
    initiatives: [
      'Incentivo económico directo, periódico y condicionado a comunidades campesinas por servicios agroecológicos.',
      'Criterios de elegibilidad y verificación basados en prácticas sostenibles y regenerativas que protegen el suelo, el agua y la agrobiodiversidad.',
      'Financiación con participación privada, presupuesto público y compensaciones ambientales.',
      'Fomento de la soberanía y seguridad alimentaria y del emprendimiento rural de base ecológica.',
    ],
  },
  {
    file: 'P.L.120-2026SC-TERRITORIOS-SOSTENIBLES-POR-EL-AGUA.pdf',
    number: 'PL 120/2026 Cámara',
    title: 'Territorios Sostenibles por el Agua (TESA)',
    dateFiled: '2026-07-29',
    status: 'Radicado',
    proposalIdRelated: 'agua',
    impactScore: 'Alto',
    summary:
      'Crea la Estrategia de Territorios Sostenibles por el Agua (TESA) para la conservación, restauración y manejo integral de los ecosistemas hídricos del país: ríos, quebradas, humedales y demás fuentes de agua. Modifica el artículo 111 de la Ley 99 de 1993 para permitir destinar saldos no ejecutados de los recursos de protección hídrica a recuperar otros cuerpos de agua y conformar Ecoparques del Agua (EPA). Incluye Custodios del Agua y Guardianes TESO, Ecoparques del Agua y sistemas de alerta temprana.',
    stageDescription: 'Radicado ante la Secretaría General de la Cámara de Representantes el 29 de julio de 2026. Pendiente de reparto a Comisión.',
    initiatives: [
      'Estrategia TESA y Territorios Azules con acciones diferenciadas por tipo de territorio y ecosistema hídrico.',
      'Custodios del Agua y Guardianes TESO: esquema de participación comunitaria en la protección de fuentes hídricas.',
      'Ecoparques del Agua (EPA) y obligatoriedad de sistemas de alerta temprana en cuencas estratégicas.',
      'Modificación del artículo 111 de la Ley 99 de 1993: uso de saldos para recuperar cuerpos de agua y conformar EPAs.',
    ],
  },
];

const existing = new Set(listBills().map((b) => b.number));
let inserted = 0;

for (const b of BILLS) {
  if (existing.has(b.number)) {
    console.log(`skip (ya existe): ${b.number}`);
    continue;
  }
  const src = path.join(SOURCE_DIR, b.file);
  if (!fs.existsSync(src)) {
    console.log(`ERROR: no encontrado ${b.file}`);
    continue;
  }
  const ext = path.extname(b.file).toLowerCase();
  const storedName = `${crypto.randomUUID()}${ext}`;
  fs.copyFileSync(src, path.join(uploadsBillsDir, storedName));

  insertBill({
    title: b.title,
    number: b.number,
    dateFiled: b.dateFiled,
    status: b.status,
    stageDescription: b.stageDescription,
    summary: b.summary,
    proposalIdRelated: b.proposalIdRelated,
    authors,
    initiatives: b.initiatives,
    impactScore: b.impactScore,
    stored_name: storedName,
    filename: b.file,
    mime: 'application/pdf',
    size: fs.statSync(src).size,
  });
  inserted++;
  console.log(`insertado: ${b.number}`);
}

console.log(`\nTotal insertados: ${inserted}. En base de datos ahora: ${listBills().length}`);