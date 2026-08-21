/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notificaciones por correo vía Resend.
 * - Confirmación al ciudadano con su certificado de radicado.
 * - Aviso al despacho, clasificado por eje legislativo.
 */

import { Resend } from 'resend';

export interface EmailSubmission {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type: string;
  categoryName?: string;
  description: string;
  status?: string;
  aiResponse?: string;
  createdAt: string;
}

const apiKey = process.env.RESEND_API_KEY || '';
export const resend = apiKey ? new Resend(apiKey) : null;
export const emailConfigured = Boolean(resend);

function from(): string {
  return process.env.EMAIL_FROM || 'Departamento Legislativo <onboarding@resend.dev>';
}

function despachoEmail(): string {
  return process.env.DESPACHO_EMAIL || '';
}

export async function sendCitizenReceipt(sub: EmailSubmission): Promise<boolean> {
  if (!resend || !sub.email) return false;
  const body =
    `Estimado(a) ${sub.firstName || ''} ${sub.lastName || ''},\n\n` +
    `Le confirmamos que su requerimiento tipo "${sub.type}" fue radicado exitosamente con el número:\n\n` +
    `  ${sub.id}\n\n` +
    `Categoría: ${sub.categoryName || 'Consulta Ciudadana General'}\n` +
    `Fecha de radicación: ${new Date(sub.createdAt).toLocaleString()}\n` +
    `Estado: ${sub.status || 'Radicado'}\n\n` +
    (sub.aiResponse ? `${sub.aiResponse}\n\n` : '') +
    `Puede hacer seguimiento de su radicado en el portal ingresando su número de radicado.\n\n` +
    `Atentamente,\nDepartamento Legislativo — Ana Ligia Mora Martínez.\n` +
    `Sus datos personales están protegidos bajo la Ley 1581 de 2012 (Habeas Data) y serán anonimizados automáticamente.`;

  try {
    const { error } = await resend.emails.send({
      from: from(),
      to: [sub.email],
      subject: `Radicado ${sub.id} — ${sub.type} registrado`,
      text: body,
    });
    if (error) {
      console.error('[email] Error confirmación ciudadano:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Error confirmación ciudadano:', err);
    return false;
  }
}

export async function sendDespachoNotification(sub: EmailSubmission): Promise<boolean> {
  if (!resend) return false;
  const to = despachoEmail();
  if (!to) return false;
  const body =
    `Nuevo radicado recibido (clasificado por tema).\n\n` +
    `Radicado: ${sub.id}\n` +
    `Ciudadano: ${sub.firstName || ''} ${sub.lastName || ''}\n` +
    `Contacto: ${sub.email || ''} / ${sub.phone || ''}\n` +
    `Tipo: ${sub.type}\n` +
    `Eje legislativo: ${sub.categoryName || 'General'}\n` +
    `Fecha: ${new Date(sub.createdAt).toLocaleString()}\n\n` +
    `Descripción:\n${sub.description}\n\n` +
    `Ingrese al panel del Despacho para responder, anonimizar o eliminar este radicado.`;

  try {
    const { error } = await resend.emails.send({
      from: from(),
      to: [to],
      subject: `[PQRSD | ${sub.categoryName || 'General'}] ${sub.type} — ${sub.id}`,
      text: body,
    });
    if (error) {
      console.error('[email] Error notificación despacho:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Error notificación despacho:', err);
    return false;
  }
}

export async function sendResponseToCitizen(sub: EmailSubmission): Promise<boolean> {
  if (!resend || !sub.email) return false;
  const body =
    `Estimado(a) ${sub.firstName || ''} ${sub.lastName || ''},\n\n` +
    `Damos respuesta formal a su radicado ${sub.id}:\n\n` +
    `${sub.aiResponse || 'Su requerimiento ha sido atendido por nuestro equipo legislativo.'}\n\n` +
    `Estado actual: ${sub.status || 'Resuelto'}\n\n` +
    `Atentamente,\nDepartamento Legislativo — Ana Ligia Mora Martínez.`;

  try {
    const { error } = await resend.emails.send({
      from: from(),
      to: [sub.email],
      subject: `Respuesta a su radicado ${sub.id}`,
      text: body,
    });
    if (error) {
      console.error('[email] Error respuesta ciudadano:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Error respuesta ciudadano:', err);
    return false;
  }
}

export async function sendBillSupportReceipt(opts: {
  name: string;
  email: string;
  billNumber: string;
  billTitle: string;
}): Promise<boolean> {
  if (!resend || !opts.email) return false;
  const body =
    `Estimado(a) ${opts.name},\n\n` +
    `Recibimos con gusto su apoyo cívico a la iniciativa legislativa:\n\n` +
    `  Proyecto: ${opts.billNumber}\n` +
    `  Título: ${opts.billTitle}\n\n` +
    `Su respaldo quedó registrado y ayuda a visibilizar la importancia territorial de esta iniciativa en el Congreso de la República.\n\n` +
    `Para esta iniciativa legislativa, su registro de apoyo solo cumple fines de acompañamiento ciudadano y no constituye un trámite formal ante el Congreso.\n\n` +
    `Atentamente,\nDepartamento Legislativo — Ana Ligia Mora Martínez.\n` +
    `Sus datos personales están protegidos bajo la Ley 1581 de 2012 (Habeas Data) y se usan únicamente para este acompañamiento.`;

  try {
    const { error } = await resend.emails.send({
      from: from(),
      to: [opts.email],
      subject: `Confirmación de respaldo — ${opts.billNumber}`,
      text: body,
    });
    if (error) {
      console.error('[email] Error confirmación respaldo:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Error confirmación respaldo:', err);
    return false;
  }
}