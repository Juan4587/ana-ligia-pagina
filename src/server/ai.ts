/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Módulo de Inteligencia Artificial (Google Gemini API).
 * Genera triage técnico y borradores de respuesta institucional para los radicados ciudadanos.
 * Si no hay GEMINI_API_KEY configurada o falla la conexión, aplica plantilla de respaldo sin error.
 */

export interface TriageInput {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type: string;
  categoryName: string;
  description: string;
}

export interface TriageResult {
  aiResponse: string;
  usedAi: boolean;
}

function getDefaultTemplate(input: TriageInput): string {
  return (
    `Estimado(a) ${input.firstName} ${input.lastName}, su radicado número ${input.id} ha sido registrado exitosamente en nuestro sistema ` +
    `bajo la categoría "${input.categoryName}". Nuestro equipo legislativo revisará los detalles del asunto descrito en un lapso ` +
    `no mayor a 10 días hábiles. Nos comunicaremos con usted al correo ${input.email || 'registrado'} o al teléfono ${input.phone || 'registrado'}. ` +
    `Atentamente, Despacho de la Congresista Ana Ligia Mora Martínez.`
  );
}

export interface BillExtractionResult {
  title: string;
  number: string;
  dateFiled: string;
  summary: string;
  authors: string[];
  initiatives: string[];
  proposalIdRelated: string;
  stageDescription: string;
}

const BILL_TOPICS_KEYWORDS: Record<string, string[]> = {
  ambiente: ['ambiental', 'medio ambiente', 'biodiversidad', 'bosque', 'deforestación', 'contaminación', 'emisiones', 'cambio climático', 'ecosistema', 'fauna', 'flora'],
  mineria: ['minero', 'minería', 'exploración minera', 'explotación minera', 'recursos minerales', ' minersa'],
  rural: ['rural', 'agropecuario', 'agricultura', 'campesino', 'finca', 'agro', 'producción agrícola'],
  energia: ['energía', 'eléctrica', 'eléctrico', 'renovable', 'solar', 'eólica', 'hidroeléctrica', 'generación eléctrica'],
  agua: ['agua', 'acueducto', 'aguas residuales', 'saneamiento', 'hídrico', 'hídrica', 'riego'],
  social: ['social', 'comunidad', 'comunidades', 'protección social', 'bienestar', 'salud', 'educación'],
  'control-politico': ['control', 'fiscalización', 'rendición de cuentas', 'contraloría', 'corrupción', 'transparencia'],
};

function classifyTopic(text: string): string {
  const lower = text.toLowerCase();
  let bestTopic = 'general';
  let bestScore = 0;
  for (const [topic, keywords] of Object.entries(BILL_TOPICS_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestTopic = topic; }
  }
  return bestTopic;
}

export async function extractBillFields(pdfText: string): Promise<BillExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY || '';

  const fallback = (): BillExtractionResult => ({
    title: '',
    number: '',
    dateFiled: new Date().toISOString().slice(0, 10),
    summary: pdfText.slice(0, 500),
    authors: [],
    initiatives: [],
    proposalIdRelated: classifyTopic(pdfText),
    stageDescription: '',
  });

  if (!apiKey) return fallback();

  const systemInstruction =
    'Eres un asistente técnico que extrae información estructurada de proyectos de ley colombianos. ' +
    'Debes devolver ÚNICAMENTE un JSON válido, sin texto adicional, sin markdown, sin ```.';
  const userPrompt =
    `Extrae la siguiente información del texto del proyecto de ley:\n\n${pdfText.slice(0, 6000)}\n\n` +
    `Responde con un JSON con esta estructura exacta (sin texto adicional):\n` +
    `{\n` +
    `  "title": "título del proyecto o vacío si no se encuentra",\n` +
    `  "number": "número del proyecto (ej: PL 098/2026) o vacío",\n` +
    `  "dateFiled": "fecha de radicación en formato YYYY-MM-DD o vacío",\n` +
    `  "summary": "resumen ejecutivo del proyecto en máximo 2 oraciones",\n` +
    `  "authors": ["nombre1", "nombre2"],\n` +
    `  "initiatives": ["iniciativa1", "iniciativa2"],\n` +
    `  "proposalIdRelated": "uno de: ambiente, mineria, rural, energia, agua, social, control-politico, general",\n` +
    `  "stageDescription": "etapa actual del trámite legislativo o vacío"\n` +
    `}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return fallback();
    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return fallback();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback();
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      number: typeof parsed.number === 'string' ? parsed.number : '',
      dateFiled: typeof parsed.dateFiled === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateFiled) ? parsed.dateFiled : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      authors: Array.isArray(parsed.authors) ? parsed.authors.filter((a: any) => typeof a === 'string') : [],
      initiatives: Array.isArray(parsed.initiatives) ? parsed.initiatives.filter((i: any) => typeof i === 'string') : [],
      proposalIdRelated: typeof parsed.proposalIdRelated === 'string' ? classifyTopic(parsed.proposalIdRelated) : classifyTopic(pdfText),
      stageDescription: typeof parsed.stageDescription === 'string' ? parsed.stageDescription : '',
    };
  } catch {
    return fallback();
  }
}

export async function generateTriageAndResponse(input: TriageInput): Promise<TriageResult> {
  const apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return {
      aiResponse: getDefaultTemplate(input),
      usedAi: false,
    };
  }

  const systemInstruction =
    'Eres el Asistente Técnico y Legislativo del Despacho de la Representante a la Cámara por Antioquia, ' +
    'Ana Ligia Mora Martínez (Ingeniera Ambiental, especialista en Alta Gerencia y Legislación Ambiental, Comisión Quinta). ' +
    'Tu función es redactar una respuesta institucional, cálida, de alto rigor técnico y basada en evidencia para los requerimientos ciudadanos (PQRSD).';

  const userPrompt =
    `Requerimiento ciudadano recibido:\n` +
    `- Número de Radicado: ${input.id}\n` +
    `- Ciudadano: ${input.firstName} ${input.lastName}\n` +
    `- Tipo de solicitud: ${input.type}\n` +
    `- Eje temático: ${input.categoryName}\n` +
    `- Descripción del ciudadano:\n"${input.description}"\n\n` +
    `Instrucciones para la respuesta:\n` +
    `1. Saluda formalmente al ciudadano mencionando su nombre y confirmando el registro de su radicado ${input.id}.\n` +
    `2. Haz un breve análisis técnico del tema planteado y relaciónalo con el compromiso legislativo del Despacho ` +
    `(agenda de sostenibilidad, agua, biodiversidad, trámites ambientales o apoyo comunitario según aplique).\n` +
    `3. Indica que el equipo técnico revisará el asunto dentro de los 10 días hábiles correspondientes.\n` +
    `4. Cierra formalmente con: "Atentamente,\nDespacho de la Congresista Ana Ligia Mora Martínez\nCámara de Representantes · Antioquia".\n` +
    `5. Mantén un tono respetuoso, sobrio, empático y estructurado en máximo 3 párrafos breves.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      }),
      signal: AbortSignal.timeout(7000), // Timeout seguro de 7 segundos
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.warn(`[ai] Gemini API devolvió error ${res.status}:`, errorText);
      return {
        aiResponse: getDefaultTemplate(input),
        usedAi: false,
      };
    }

    const data = (await res.json()) as any;
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (candidateText) {
      return {
        aiResponse: candidateText,
        usedAi: true,
      };
    }

    return {
      aiResponse: getDefaultTemplate(input),
      usedAi: false,
    };
  } catch (err: any) {
    console.warn('[ai] No se pudo conectar con Gemini API (usando plantilla de respaldo):', err.message || err);
    return {
      aiResponse: getDefaultTemplate(input),
      usedAi: false,
    };
  }
}
