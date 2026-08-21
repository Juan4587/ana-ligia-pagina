/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Proposal, SimulatorProfile, FiledBill } from './types';

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

export const SIMULATOR_PROFILES: SimulatorProfile[] = [
  {
    id: 'agricultor',
    name: 'Agricultor / Productor Rural',
    icon: 'Tractor',
    description: 'Campesinos, caficultores, ganaderos y productores agrícolas de pequeña y mediana escala que buscan rentabilidad y sostenibilidad en el campo.',
    relevance: [
      {
        proposalId: 'desarrollo-rural-jovenes',
        level: 'MUY ALTA',
        impact: 'high',
        explanation: 'Incentivo económico directo, periódico y condicionado. Si estás registrado como sujeto campesino (RUSC), tu predio no supera la Unidad Agrícola Familiar (UAF) y firmas un Plan de Negocio y Gestión Ambiental, recibirás pagos periódicos por el cuidado del suelo, la agrobiodiversidad, las fuentes de agua y la transición a insumos limpios. El pago llega directo a tu cuenta del Banco Agrario, sin intermediarios, y se premia vender en circuitos cortos (mercados locales sin intermediarios).'
      },
      {
        proposalId: 'pagos-servicios-ambientales',
        level: 'ALTA',
        impact: 'high',
        explanation: 'Transferencia monetaria condicionada por cuidar y limpiar parques, corredores verdes, arbolado y espacios públicos. Se enfoca en hogares en condición de vulnerabilidad (Sisbén IV) y prioriza madres cabeza de familia, jóvenes y adultos mayores. Si vives en zona de ladera o periurbana, tus brigadas de mantenimiento ambiental pueden ser retribuidas por el municipio.'
      },
      {
        proposalId: 'areas-protegidas-incentivos',
        level: 'ALTA',
        impact: 'high',
        explanation: 'Las CAR podrán intervenir animales domésticos que se volvieron silvestres (perros y gatos asilvestrados) y amenazan tus cultivos, la fauna nativa y los ecosistemas. Las intervenciones exigen diagnóstico técnico previo y protocolos de bienestar animal; además, los municipios deben frenar el abandono que origina las jaurías.'
      },
      {
        proposalId: 'agua-energia',
        level: 'MEDIA',
        impact: 'medium',
        explanation: 'Los saldos no ejecutados del artículo 111 de la Ley 99 podrán recuperar ríos, quebradas y humedales de tu vereda, con acuerdos de conservación activa y prácticas agrícolas sin deforestación. Podrás vincularte como "Custodio del Agua" y participar en los sistemas de alerta temprana.'
      }
    ]
  },
  {
    id: 'minero',
    name: 'Minero Tradicional o Informal',
    icon: 'Pickaxe',
    description: 'Mineros tradicionales, barequeros y pequeños productores de oro de las regiones del Bajo Cauca, Nordeste y Occidente Antioqueño.',
    relevance: [
      {
        proposalId: 'tramites-ambientales-fast-track',
        level: 'MUY ALTA',
        impact: 'high',
        explanation: 'La ley reconoce la minería estratégica entre los proyectos de Utilidad Pública e Interés Social (DUP). Si formalizas tu operación, tus trámites ambientales tendrán tiempos perentorios: licencia ambiental en 35 días hábiles (o 40 con reunión de requerimientos) y concesiones de agua, vertimientos y aprovechamiento forestal en 25 días hábiles, con radicación digital. Si la autoridad se vence, el expediente va a Control Interno Disciplinario: la inoperancia del Estado no recae sobre ti.'
      },
      {
        proposalId: 'agua-energia',
        level: 'ALTA',
        impact: 'high',
        explanation: 'La gestión integral del agua y del suelo ordena el territorio y protege las cuencas donde operas, dándote un marco claro y estable para tu relación con las fuentes hídricas.'
      },
      {
        proposalId: 'pagos-servicios-ambientales',
        level: 'MEDIA',
        impact: 'medium',
        explanation: 'Las comunidades cercanas a tu zona reciben incentivos por cuidar los espacios verdes, lo que mejora el entorno y el relacionamiento con tu operación.'
      }
    ]
  },
  {
    id: 'joven',
    name: 'Joven (15 a 28 años)',
    icon: 'GraduationCap',
    description: 'Estudiantes, jóvenes rurales y urbanos en búsqueda de empleo verde, tecnificación agrícola y oportunidades de emprendimiento ambiental.',
    relevance: [
      {
        proposalId: 'pagos-servicios-ambientales',
        level: 'MUY ALTA',
        impact: 'high',
        explanation: 'La ley obliga a los municipios a adoptar enfoques diferenciales garantizando la participación de la población joven. Puedes vincularte a las brigadas de jardinería, limpieza, siembra y pedagogía ambiental en los corredores verdes de tu ciudad como beneficiario directo de la transferencia.'
      },
      {
        proposalId: 'desarrollo-rural-jovenes',
        level: 'ALTA',
        impact: 'high',
        explanation: 'El pago se amplía (factor de retorno social) si en el predio o como titular se vincula formalmente a jóvenes rurales entre 18 y 28 años. Es una puerta de entrada al emprendimiento agroecológico con venta en circuitos cortos.'
      },
      {
        proposalId: 'tramites-ambientales-fast-track',
        level: 'MEDIA',
        impact: 'medium',
        explanation: 'Al destrabar licencias ambientales con tiempos definidos, se agiliza la inversión en infraestructura y transición energética, generando empleos verdes para tu generación.'
      }
    ]
  },
  {
    id: 'empresario',
    name: 'Empresario / Industrial',
    icon: 'Briefcase',
    description: 'Emprendedores, desarrolladores de infraestructura, ingenieros y generadores de energía que necesitan seguridad jurídica y agilidad estatal.',
    relevance: [
      {
        proposalId: 'tramites-ambientales-fast-track',
        level: 'MUY ALTA',
        impact: 'high',
        explanation: 'Aplica a infraestructura de transporte, energía, abastecimiento de agua, hidrocarburos, minería estratégica, férrea, portuaria, gestión del riesgo y transición energética. Radicación digital con admisibilidad automática, licencia ambiental en 35/40 días hábiles, demás trámites en 25 días, y decisiones con Formato Único de Justificación Técnica. El incumplimiento de términos afecta los indicadores de desempeño de la autoridad y se remite a Control Interno. Seguridad jurídica para tus inversiones.'
      },
      {
        proposalId: 'agua-energia',
        level: 'ALTA',
        impact: 'high',
        explanation: 'Sello "Aliado TESA" como criterio de desempate en licitaciones públicas, bonos de mayor edificabilidad si construyes un Ecoparque del Agua (EPA), y obras ambientales por impuestos en municipios PDET/ZOMAC. También una Ventanilla de Articulación TESA para tus proyectos de Soluciones Basadas en la Naturaleza.'
      },
      {
        proposalId: 'desarrollo-rural-jovenes',
        level: 'MEDIA',
        impact: 'medium',
        explanation: 'Puedes cumplir obligaciones de compensación ambiental cofinanciando predios PSA-Eco (incluido en el Manual de Compensaciones del Componente Biótico), y obtener el sello "Aliado del Campesinado y la Agroecología" comprando directamente a productores.'
      }
    ]
  },
  {
    id: 'madre-cabeza',
    name: 'Madre Cabeza de Hogar',
    icon: 'HeartHandshake',
    description: 'Mujeres líderes de hogar que asumen la responsabilidad única de sus familias y buscan autonomía económica y oportunidades comunitarias.',
    relevance: [
      {
        proposalId: 'pagos-servicios-ambientales',
        level: 'MUY ALTA',
        impact: 'high',
        explanation: 'Eres población prioritaria: la ley ordena enfoque diferencial con participación garantizada de mujeres cabeza de familia. Recibirás la transferencia por liderar brigadas de limpieza, jardinería, monitoreo y educación ambiental de los espacios verdes de tu barrio, priorizada por Sisbén IV.'
      },
      {
        proposalId: 'desarrollo-rural-jovenes',
        level: 'ALTA',
        impact: 'high',
        explanation: 'Si eres mujer rural cabeza de hogar, el pago se amplifica (factor de retorno social). Puedes migrar voluntariamente desde el PSA tradicional y recibir el incentivo directo, sin intermediarios, a través del Banco Agrario.'
      },
      {
        proposalId: 'agua-energia',
        level: 'MEDIA',
        impact: 'medium',
        explanation: 'Programas como "Guardianes TESOS" forman a tus hijos en ciencia ciudadana y los Ecoparques del Agua funcionan como aulas vivas cerca de tu comunidad.'
      }
    ]
  },
  {
    id: 'ciudadano-comun',
    name: 'Ciudadano Común / Habitante Urbano',
    icon: 'UserCheck',
    description: 'Residentes de las ciudades y municipios que buscan una mejor calidad de vida, seguridad democrática y cuidado de su entorno natural.',
    relevance: [
      {
        proposalId: 'pagos-servicios-ambientales',
        level: 'MUY ALTA',
        impact: 'high',
        explanation: 'Los barrios de menores ingresos tienen la menor cantidad de zonas verdes por habitante. La ley descentraliza su cuidado: más corredores verdes limpios, arbolado y pedagogía ambiental en tu comuna, con monitoreo comunitario y alertas ante el deterioro.'
      },
      {
        proposalId: 'agua-energia',
        level: 'ALTA',
        impact: 'high',
        explanation: 'Ecoparques del Agua como espacio público efectivo, Sistemas de Drenaje Urbano Sostenible (SUDS) y "ciudades esponja" reducen las inundaciones; los Sistemas de Alerta Temprana (SATA) avisan antes de los eventos extremos y se renaturalizan canales y quebradas urbanas.'
      },
      {
        proposalId: 'areas-protegidas-incentivos',
        level: 'MEDIA',
        impact: 'medium',
        explanation: 'La ley atiende las jaurías de perros y gatos asilvestrados que depredan la fauna nativa de tus parques y cerros, reduciendo también riesgos de zoonosis (rabia, toxoplasmosis), siempre con diagnóstico técnico y bienestar animal (Ley 1774 de 2016, sin sacrificio indiscriminado).'
      }
    ]
  }
];

export const FILED_BILLS: FiledBill[] = [];

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