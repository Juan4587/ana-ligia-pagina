/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BillStatus, BillTipo, GestionStatus } from '../types';

export type LegislativeStatus = BillStatus | GestionStatus;

export const GESTION_STATUS_BUCKETS = ['En trámite', 'Radicado', 'Aprobado', 'En análisis'] as const;

/**
 * Mapea cualquier status de gestión (7 etapas de PL o 4 estados de gestión)
 * a los 4 buckets de GestionStatus para stats y filtros de Ponencias.
 * El badge de cada card sigue mostrando el status real (ej. "Tercer Debate").
 *
 * Cuando se agregue "Archivado" (u otro estado real) a BILL_STATUSES,
 * decidir su bucket explícitamente en ese momento; no asumir uno ahora.
 */
export function mapStatusToBucket(status: LegislativeStatus | string): GestionStatus {
  switch (status) {
    case 'Radicado': return 'Radicado';
    case 'Primer Debate':
    case 'Segundo Debate':
    case 'Tercer Debate':
    case 'Cuarto Debate':
    case 'En trámite': return 'En trámite';
    case 'En análisis': return 'En análisis';
    case 'Sanción Presidencial':
    case 'Ley de la República':
    case 'Aprobado': return 'Aprobado';
    default:
      // Status no catalogado: no inventar bucket permanente; usar En análisis
      // solo para que Total siga cuadrando con la suma de buckets.
      return 'En análisis';
  }
}

/** Badges de tipo unificados (misma paleta en Agenda, Ponencias y Despacho). */
export function getTipoStyles(tipo: string): string {
  switch (tipo) {
    case 'Proyecto de Ley': return 'bg-ant-blue-light text-ant-blue-dark border-ant-blue/20';
    case 'Ponencia': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Proposición': return 'bg-green-100 text-green-800 border-green-200';
    case 'Moción': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/** Badges de estado: 4 estados de gestión + 7 etapas de proyecto de ley. */
export function getStatusStyles(status: LegislativeStatus | string): string {
  switch (status) {
    case 'Radicado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'En trámite': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'En análisis': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Aprobado': return 'bg-green-100 text-green-800 border-green-200';
    case 'Primer Debate': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Segundo Debate': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'Tercer Debate': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Cuarto Debate': return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'Sanción Presidencial': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Ley de la República': return 'bg-ant-blue-light text-ant-blue-dark border-ant-blue/20';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getTypeColor(tipo: BillTipo | string): string {
  return getTipoStyles(tipo);
}
