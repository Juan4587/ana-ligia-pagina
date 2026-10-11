/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Proposal, FiledBill, Ponencia, BlogPost } from './types';

export const PROPOSALS: Proposal[] = [
  {
    id: 'tramites-ambientales-fast-track',
    title: 'Declaratoria de Utilidad Pública e Interés Social (DUP) ambiental',
    shortDescription: 'Define un procedimiento digital y con tiempos perentorios (licencia en 35–40 días hábiles) para los trámites ambientales de proyectos con Declaración de Utilidad Pública e Interés Social (DUP).',
    fullDescription: 'Establecer un procedimiento ágil, estandarizado y digital para evaluar y decidir los trámites ambientales de los proyectos con Declaración de Utilidad Pública e Interés Social (DUP): licencia ambiental, concesiones de aguas, vertimientos, emisiones atmosféricas, aprovechamiento forestal y ocupación de cauces. Fija términos perentorios —35 días hábiles en ruta directa y 40 con reunión de requerimientos para la licencia ambiental; 25 días para los demás—, radicación digital parametrizada con Acto Automatizado de Admisibilidad, decisiones con Formato Único de Justificación Técnica y remisión a Control Interno Disciplinario ante el vencimiento de plazos.',
    category: 'Ambiente',
    icon: 'Zap',
    color: '#E59C00', // Yellow Accent
    problem: 'Los trámites ambientales pueden tardar años por la formulación sucesiva de requerimientos y la ausencia de tiempos perentorios, paralizando proyectos estratégicos con DUP y generando sobrecostos.',
    context: 'Aplica exclusivamente a proyectos con Declaración de Utilidad Pública e Interés Social (DUP), sin modificar estándares ambientales ni la participación ciudadana (Acuerdo de Escazú - Ley 2273 de 2022).',
    keyPoints: [
      'Aplica a licencias, concesiones de aguas, vertimientos, emisiones, aprovechamiento forestal y ocupación de cauces de proyectos DUP.',
      'Licencia ambiental en 35 días hábiles (ruta directa) o 40 (con reunión de requerimientos); los demás trámites en 25.',
      'Radicación digital parametrizada con acto automatizado de admisibilidad.',
      'Decisiones con Formato Único de Justificación Técnica; el vencimiento de plazos se remite a Control Interno Disciplinario.'
    ],
    statistics: [
      { label: 'Licencia', value: '35–40 Días', desc: 'Días hábiles según escenario para la licencia ambiental (directa o con requerimientos).' },
      { label: 'Resto de Trámites', value: '25 Días', desc: 'Concesiones de aguas, vertimientos, emisiones, forestal y ocupación de cauces.' },
      { label: 'Alcance', value: 'DUP', desc: 'Aplica solo a proyectos de Utilidad Pública e Interés Social.' }
    ],
    acts: ['Proyecto de Ley 116 de 2026 Cámara']
  },
  {
    id: 'pagos-servicios-ambientales',
    title: 'Rentas Verdes: Focalización del Pago por Servicios Ambientales (PSA)',
    shortDescription: 'Crea el Programa Nacional de Rentas Verdes: transferencia económica a personas naturales por la gestión comunitaria de parques, corredores verdes, arbolado y espacios públicos, focalizada en hogares vulnerables (Sisbén IV).',
    fullDescription: 'Crear el Programa Nacional de Rentas Verdes, un mecanismo de transferencia económica e incentivo socioambiental a personas naturales por la gestión comunitaria de espacios verdes: corredores verdes, parques, arbolado urbano y espacios públicos. Prioriza a personas en condición de vulnerabilidad socioeconómica (Sisbén IV) y dispone enfoques diferenciales que garantizan la participación de mujeres cabeza de familia, población joven y adultos mayores. Se financia con obligaciones urbanísticas, presupuesto territorial, donaciones y recursos del Fondo para la Vida y la Biodiversidad.',
    category: 'Ambiente',
    icon: 'Leaf',
    color: '#639922', // Environmental Green
    problem: 'Los barrios de menores ingresos concentran la menor cantidad de zonas verdes por habitante, y el cuidado de los espacios públicos depende de esquemas centralizados que excluyen a la comunidad y a las poblaciones más vulnerables.',
    context: 'Descentraliza la gestión del espacio público verde, conectando la adaptación al cambio climático con la formalidad y el empleo de personas en situación de vulnerabilidad.',
    keyPoints: [
      'Transferencia monetaria condicionada por labores de cuidado, limpieza, jardinería, monitoreo y pedagogía ambiental de espacios públicos verdes.',
      'Consolidación de corredores verdes: parques, arbolado urbano y conectividad ecológica.',
      'Focalización en personas en vulnerabilidad socioeconómica (Sisbén IV) con enfoque diferencial.',
      'Financiación con obligaciones urbanísticas, presupuesto territorial, donaciones y el Fondo para la Vida y la Biodiversidad.'
    ],
    statistics: [
      { label: 'Focalización', value: 'Sisbén IV', desc: 'Priorización de personas en condiciones de vulnerabilidad socioeconómica.' },
      { label: 'Corredores', value: 'Verdes', desc: 'Parques, arbolado urbano y espacios públicos verdes.' },
      { label: 'Enfoque', value: 'Diferencial', desc: 'Mujeres cabeza de familia, jóvenes y adultos mayores priorizados.' }
    ],
    acts: ['Proyecto de Ley 115 de 2026 Cámara']
  },
  {
    id: 'areas-protegidas-incentivos',
    title: 'Gestión de Fauna Asilvestrada para Proteger los Ecosistemas',
    shortDescription: 'Faculta a las CAR para intervenir, gestionar y controlar las poblaciones de animales domésticos con comportamiento silvestre (asilvestrados) que amenazan la biodiversidad y los ecosistemas.',
    fullDescription: 'Adicionar el numeral 35 al artículo 31 de la Ley 99 de 1993 para facultar a las Corporaciones Autónomas Regionales (CAR) y de Desarrollo Sostenible a intervenir, gestionar y controlar las poblaciones de animales de especies domésticas con comportamiento silvestre (asilvestrados) que amenacen la salud pública ambiental, la biodiversidad y los ecosistemas. La condición de asilvestramiento no se presume: requiere lineamientos técnicos del Ministerio de Ambiente y estrictos protocolos éticos y de bienestar animal (Ley 1774 de 2016). Los municipios mantienen el control del abandono y la reproducción descontrolada.',
    category: 'Ambiente',
    icon: 'PawPrint',
    color: '#2E7D32', // Deep Green
    problem: 'Los perros y gatos asilvestrados conforman jaurías que depredan la fauna nativa y compiten con los felinos, sin que ninguna entidad actúe por el conflicto de competencias entre las CAR y las alcaldías.',
    context: 'Subsana el vacío normativo que hoy paraliza al Estado frente a la sobrepoblación de animales domésticos asilvestrados, con protocolos éticos y de bienestar animal.',
    keyPoints: [
      'Faculta a las CAR para intervenir, gestionar y controlar poblaciones de fauna asilvestrada.',
      'Diagnósticos poblacionales y planes de manejo bajo protocolos éticos y de bienestar animal.',
      'Medidas preventivas de retiro o traslado ante afectación comprobada de fauna silvestre.',
      'Articulación con los municipios para prevenir el abandono y la reproducción descontrolada.'
    ],
    statistics: [
      { label: 'Norma', value: 'Ley 99/93', desc: 'Adición del numeral 35 al artículo 31.' },
      { label: 'Autoridades', value: 'CAR', desc: 'Corporaciones Autónomas Regionales y de Desarrollo Sostenible.' },
      { label: 'Garantía', value: 'Bienestar', desc: 'Diagnóstico técnico previo y protocolos éticos (Ley 1774 de 2016).' }
    ],
    acts: ['Proyecto de Ley 118 de 2026 Cámara']
  },
  {
    id: 'agua-energia',
    title: 'Territorios Sostenibles por el Agua (TESA)',
    shortDescription: 'Crea la estrategia TESA para proteger y recuperar ríos, quebradas y humedales, permitiendo que los saldos del artículo 111 de la Ley 99 de 1993 financien los Ecoparques del Agua (EPA).',
    fullDescription: 'Adicionar un parágrafo al artículo 111 de la Ley 99 de 1993 para que, cuando la entidad territorial justifique haber cubierto la adquisición o el mantenimiento de las áreas abastecedoras de los acueductos, o existan saldos no ejecutados de esos recursos, puedan destinarse a proteger, recuperar y mantener otros cuerpos de agua y conformar Ecoparques del Agua (EPA). La estrategia TESA integra corredores azules, la gestión del agua y el suelo (PEGATE), los Sistemas de Alerta Temprana (SATA), los Custodios del Agua y el programa "Guardianes TESOS", y exige soluciones basadas en la naturaleza (SUDS) en las nuevas construcciones.',
    category: 'Ambiente',
    icon: 'Droplet',
    color: '#0288D1', // Blue
    problem: 'Las inversiones del artículo 111 de la Ley 99 suelen quedar sin ejecutar, mientras los ecosistemas hídricos se deterioran por la fragmentación, la deforestación y la ocupación de las rondas hídricas.',
    context: 'Crea la estrategia TESA como instrumento de articulación institucional y territorial —sin nuevas estructuras administrativas—, con el agua como eje de planificación.',
    keyPoints: [
      'Saldos no ejecutados del artículo 111 de la Ley 99 podrán proteger y recuperar otros cuerpos de agua y crear EPA.',
      'Estrategia PEGATE incorporada al componente ambiental de POT/PBOT/EOT y Planes de Desarrollo.',
      'Custodios del Agua y programa "Guardianes TESOS" para el monitoreo comunitario.',
      'Sistemas de Alerta Temprana (SATA), SUDS obligatorios en nuevas construcciones y renaturalización de cauces.'
    ],
    statistics: [
      { label: 'Recursos', value: 'Art. 111', desc: 'Saldos no ejecutados y áreas cubiertas para recuperar cuerpos de agua.' },
      { label: 'Territorios', value: 'TESA', desc: 'Estrategia PEGATE articulada a POT/PBOT/EOT.' },
      { label: 'Creación', value: 'EPA', desc: 'Ecoparques del Agua con infraestructura verde-azul.' }
    ],
    acts: ['Proyecto de Ley 120 de 2026 Cámara']
  },
  {
    id: 'desarrollo-rural-jovenes',
    title: 'Pago por Servicios Agroecológicos al Campesinado (PSA-Eco)',
    shortDescription: 'Crea un incentivo agroecológico directo, periódico y condicionado para el campesinado que cuida el suelo, la agrobiodiversidad y el agua.',
    fullDescription: 'Crear e implementar el mecanismo de Pago por Servicios Agroecológicos (PSA-Eco): un incentivo económico directo, periódico y condicionado para el campesinado que integra la producción de alimentos con la tecnificación, el uso sostenible de los ecosistemas, el cuidado del suelo, la agrobiodiversidad y la gestión del agua. Acceden productores acreditados en el Registro Único de Sujetos Campesinos (RUSC), con predios que no superen la Unidad Agrícola Familiar (UAF) y un Plan de Negocio y Gestión Ambiental. El pago se entrega sin intermediarios (Banco Agrario), con un tope de tres SMMLV bimestrales por núcleo familiar.',
    category: 'Rural',
    icon: 'Sprout',
    color: '#33691E', // Earth Green
    problem: 'El PSA tradicional priorizó la preservación estricta y dejó por fuera a los pequeños productores de la frontera agrícola que no pueden abandonar su producción para conservar.',
    context: 'Desarrolla el artículo 64 de la Constitución (Acto Legislativo 01 de 2023, campesinado como sujeto de especial protección), complementando el PSA del Decreto Ley 870 de 2017.',
    keyPoints: [
      'Incentivo directo, periódico y condicionado a un Plan de Negocio y Gestión Ambiental.',
      'Acceso con registro campesino (RUSC) y predios que no superen la UAF.',
      'Se premia la agrobiodiversidad, la resiliencia hídrica, los circuitos cortos y el enfoque diferencial.',
      'Incompatible con el PSA tradicional; se podrá migrar voluntariamente entre ambos mecanismos.'
    ],
    statistics: [
      { label: 'Acceso', value: 'RUSC+UAF', desc: 'Sujetos del campesinado con predio hasta la Unidad Agrícola Familiar.' },
      { label: 'Límite', value: '3 SMMLV', desc: 'Tope de reconocimiento bimestral por núcleo familiar.' },
      { label: 'Pago', value: 'Directo', desc: 'Entrega sin intermediarios vía Banco Agrario.' }
    ],
    acts: ['Proyecto de Ley 119 de 2026 Cámara']
  }
];

export const FILED_BILLS: FiledBill[] = [];

export const PONENCIAS: Ponencia[] = [
  {
    id: 'ponencia-1',
    title: 'Ponencia sobre Gestión Integral del Agua',
    type: 'Ponencia',
    category: 'Agua',
    date: '2026-01-15',
    status: 'En trámite',
    description: 'Ponencia presentada ante la Comisión Quinta sobre la gestión integral de recursos hídricos...',
    shortDescription: 'Gestión integral del agua como eje de desarrollo territorial.',
    author: 'Ana Ligia Mora Martínez',
    acts: ['PL 120 de 2026'],
  },
  {
    id: 'ponencia-2',
    title: 'Proposición para el Fomento de Energías Renovables',
    type: 'Proposición',
    category: 'Energía',
    date: '2026-02-20',
    status: 'En análisis',
    description: 'Proposición para incentivar la adopción de energías renovables en Antioquia...',
    shortDescription: 'Fomento de energías limpias para el departamento.',
    author: 'Equipo Técnico',
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: 'Avances en la Ley de Servicios Ambientales: Lo que debes saber',
    excerpt: 'La Comisión Quinta aprobó en primera vuelta el proyecto de ley que busca establecer un marco normativo claro para la gestión de servicios ambientales en todo el territorio nacional.',
    content: 'Contenido completo del artículo sobre los avances legislativos en servicios ambientales.',
    category: 'Legislación',
    date: '2026-09-15',
    image: '/blog-1.jpg',
    author: 'Ana Ligia Mora Martínez',
    tags: ['Legislación', 'Medio Ambiente', 'Comisión Quinta'],
  },
  {
    id: 'post-2',
    title: 'Rindiendo cuentas: Informe de gestión 2026',
    excerpt: 'Un balance detallado de los primeros nueve meses de gestión legislativa, con cifras, logros y metas pendientes para el cierre del año.',
    content: 'Contenido completo del informe de gestión.',
    category: 'Comunidad',
    date: '2026-09-10',
    image: '/blog-2.jpg',
    author: 'Ana Ligia Mora Martínez',
    tags: ['Gestión', 'Comunidad', 'Rendición de cuentas'],
  },
  {
    id: 'post-3',
    title: 'El futuro del agua en Antioquia: la estrategia TESA',
    excerpt: 'La estrategia Territorios Sostenibles por el Agua busca proteger y recuperar ríos, quebradas y humedales con participación ciudadana activa.',
    content: 'Contenido completo sobre la estrategia TESA.',
    category: 'Medio Ambiente',
    date: '2026-09-05',
    image: '/blog-3.jpg',
    author: 'Ana Ligia Mora Martínez',
    tags: ['Agua', 'Antioquia', 'Sostenibilidad'],
  },
  {
    id: 'post-4',
    title: 'Trabajo legislativo en la Comisión Quinta: avances del mes',
    excerpt: 'Resumen de las sesiones más importantes de la Comisión Quinta del Senado, donde se discutieron proyectos clave para el desarrollo regional.',
    content: 'Contenido completo sobre la Comisión Quinta.',
    category: 'Legislación',
    date: '2026-08-28',
    image: '/blog-4.jpg',
    author: 'Equipo Legislativo',
    tags: ['Comisión Quinta', 'Legislación', 'Avances'],
  },
  {
    id: 'post-5',
    title: 'Participación ciudadana en proyectos de ley ambientales',
    excerpt: 'Cómo los ciudadanos pueden involucrarse activamente en el proceso de discusión de proyectos de ley relacionados con el medio ambiente.',
    content: 'Contenido completo sobre participación ciudadana.',
    category: 'Comunidad',
    date: '2026-08-20',
    image: '/blog-5.jpg',
    author: 'Ana Ligia Mora Martínez',
    tags: ['Participación', 'Ciudadanía', 'Ambiente'],
  },
  {
    id: 'post-6',
    title: 'Conservación de bosques: una prioridad para Antioquia',
    excerpt: 'Ante la deforestación creciente, presentamos nuevas propuestas legislativas para la protección de los bosques naturales del departamento.',
    content: 'Contenido completo sobre conservación de bosques.',
    category: 'Medio Ambiente',
    date: '2026-08-12',
    image: '/blog-6.jpg',
    author: 'Equipo Legislativo',
    tags: ['Bosques', 'Deforestación', 'Protección'],
  },
  {
    id: 'post-7',
    title: 'La importancia del Pago por Servicios Ambientales',
    excerpt: 'El PSA-Eco representa una innovación en la forma de compensar económicamente a quienes cuidan nuestros ecosistemas naturales.',
    content: 'Contenido completo sobre el PSA-Eco.',
    category: 'Medio Ambiente',
    date: '2026-08-05',
    image: '/blog-7.jpg',
    author: 'Ana Ligia Mora Martínez',
    tags: ['PSA', 'Ecosistemas', 'Incentivos'],
  },
  {
    id: 'post-8',
    title: 'Diálogo con la ciudadanía: gira por municipios de Antioquia',
    excerpt: 'Recorrido por los municipios para escuchar de primera mano las necesidades y preocupaciones de la comunidad antioqueña.',
    content: 'Contenido completo sobre la gira municipal.',
    category: 'Comunidad',
    date: '2026-07-28',
    image: '/blog-8.jpg',
    author: 'Ana Ligia Mora Martínez',
    tags: ['Gira', 'Municipios', 'Diálogo'],
  },
];

/** Temas generales del eje legislativo para los proyectos de ley del Despacho. */
export const BILL_TOPICS: { id: string; label: string }[] = [
  { id: 'ambiente', label: 'Ambiente' },
  { id: 'mineria', label: 'Minería' },
  { id: 'rural', label: 'Rural y Agropecuario' },
  { id: 'energia', label: 'Energía' },
  { id: 'agua', label: 'Agua y Saneamiento' },
  { id: 'social', label: 'Social' },
  { id: 'control-politico', label: 'Control Político' },
  { id: 'general', label: 'General' },
];

/** Resuelve la etiqueta de un eje legislativo (tema general) desde su id.
 *  Soporta tanto los temas nuevos como los ids históricos de las 5 propuestas. */
export function billAxisLabel(id: string | null | undefined): string {
  if (!id || id === 'general') return 'General';
  const topic = BILL_TOPICS.find((t) => t.id === id);
  if (topic) return topic.label;
  const proposal = PROPOSALS.find((p) => p.id === id);
  if (!proposal) return 'General';
  // Compatibilidad: categoría histórica de las propuestas → tema general
  if (proposal.category === 'Rural') return 'Rural y Agropecuario';
  return proposal.category;
}
