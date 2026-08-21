/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Proposal {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: 'Ambiente' | 'Minería' | 'Rural' | 'Social' | 'Energía';
  icon: string; // Lucide icon name
  color: string; // Hex or tailwind class name
  problem: string;
  context: string;
  keyPoints: string[];
  statistics: {
    label: string;
    value: string;
    desc: string;
  }[];
  acts: string[]; // Associated laws or draft bills (e.g. PL 244/2024)
}

export interface SimulatorProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  relevance: {
    proposalId: string;
    level: 'MUY ALTA' | 'ALTA' | 'MEDIA';
    impact: 'high' | 'medium';
    explanation: string;
  }[];
}

export type PQRSDType = 'Petición' | 'Queja' | 'Reclamo' | 'Sugerencia' | 'Felicitación';
export type PQRSDStatus = 'Radicado' | 'En Revisión' | 'Asignado' | 'Resuelto';

export type SubmissionDocument = {
  id: number;
  filename: string;
  mime?: string;
  size: number;
};

export interface PQRSDSubmission {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  type: PQRSDType;
  proposalId: string; // References Proposal.id or "general"
  description: string;
  createdAt: string;
  updatedAt: string;
  status: PQRSDStatus;
  aiResponse?: string;
  categoryName?: string;
  emailSent?: boolean;
  despachoNotified?: boolean;
  anonymized?: boolean;
  documents?: SubmissionDocument[];
}

/** Seguimiento ciudadano (sin datos personales). */
export interface PublicTrackResult {
  id: string;
  type: PQRSDType;
  categoryName: string | null;
  status: PQRSDStatus;
  description: string;
  aiResponse: string | null;
  createdAt: string;
  updatedAt: string;
  anonymized: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export type BillStatus = 'Radicado' | 'Primer Debate' | 'Segundo Debate' | 'Tercer Debate' | 'Cuarto Debate' | 'Sanción Presidencial' | 'Ley de la República';

export interface FiledBill {
  id: string | number;
  title: string;
  number: string;
  dateFiled: string;
  status: BillStatus;
  stageDescription: string;
  summary: string;
  proposalIdRelated: string;
  authors: string[];
  initiatives: string[];
  impactScore: 'Alto' | 'Medio';
  hasFile?: boolean;
  filename?: string;
  size?: number;
  supportCount?: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_active: number;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  createdAt: string;
}
