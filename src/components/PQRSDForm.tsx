/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckSquare, FileText, User, Mail, Phone, CheckCircle2,
  ArrowRight, Loader2, Award, ChevronDown, Check, Paperclip, Search, ShieldCheck
} from 'lucide-react';
import { PROPOSALS } from '../data';
import { PQRSDSubmission, PublicTrackResult, PQRSDType } from '../types';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  type: 'Petición' as PQRSDType,
  proposalId: 'general',
  description: '',
};

export default function PQRSDForm() {
  const [formData, setFormData] = React.useState(emptyForm);
  const [files, setFiles] = React.useState<File[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [activeSubmission, setActiveSubmission] = React.useState<PQRSDSubmission | null>(null);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Seguimiento ciudadano por número de radicado
  const [trackId, setTrackId] = React.useState('');
  const [tracking, setTracking] = React.useState(false);
  const [trackResult, setTrackResult] = React.useState<PublicTrackResult | null>(null);
  const [trackError, setTrackError] = React.useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files).slice(0, 4));
    else setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.description) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const body = new FormData();
      body.append('firstName', formData.firstName);
      body.append('lastName', formData.lastName);
      body.append('email', formData.email);
      body.append('phone', formData.phone);
      body.append('type', formData.type);
      body.append('proposalId', formData.proposalId);
      body.append('description', formData.description);
      files.forEach((f) => body.append('files', f));

      const response = await fetch('/api/pqrsd/submit', {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al procesar el radicado.');
      }

      const newSubmission: PQRSDSubmission = await response.json();
      setActiveSubmission(newSubmission);
      setFormSuccess(true);
      setFormData(emptyForm);
      setFiles([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo radicar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    setTracking(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const response = await fetch('/api/pqrsd/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trackId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar el radicado.');
      setTrackResult(data);
    } catch (err: any) {
      setTrackError(err.message);
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">

      {/* Title Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-block bg-ant-blue-light text-ant-blue-dark text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          Contacto Directo & Atención Ciudadana
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Buzón de Requerimientos Ciudadanos (PQRSD)
        </h2>
        <p className="text-slate-600 mt-4 text-base">
          Radica de manera oficial tus peticiones, quejas, reclamos, sugerencias o felicitaciones ante el despacho de la Congresista Ana Ligia Mora Martínez. Tu radicado recibirá un código de seguimiento y respuesta legislativa inmediata respaldada por Inteligencia Artificial de su equipo técnico.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 items-start">

        {/* Left Side: Form Container */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          {formSuccess && activeSubmission ? (
            /* Success Radicado Screen */
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ant-blue-light text-ant-blue">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">¡Radicado Exitoso!</h3>
                <p className="text-slate-500 text-sm mt-1">Tu requerimiento ha sido registrado formalmente en nuestro sistema legislativo.</p>
              </div>

              {/* Radicado Receipt Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left relative overflow-hidden">
                <div className="absolute right-0 top-0 h-16 w-16 bg-ant-blue/5 rounded-bl-full flex items-center justify-center text-ant-blue">
                  <Award className="h-6 w-6" />
                </div>

                <span className="block text-[10px] font-black uppercase tracking-widest text-ant-blue">CERTIFICADO DE RADICADO</span>
                <span className="block text-xl font-mono font-black text-slate-800 mt-1">{activeSubmission.id}</span>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-200/80 my-4 py-4 text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">CIUDADANO</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{activeSubmission.firstName} {activeSubmission.lastName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">TIPO SOLICITUD</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{activeSubmission.type}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">CATEGORÍA</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{activeSubmission.categoryName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">FECHA RADICACIÓN</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{new Date(activeSubmission.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {activeSubmission.documents && activeSubmission.documents.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs bg-white border border-slate-200/60 p-3 rounded-xl">
                    <Paperclip className="h-3.5 w-3.5 text-ant-blue" />
                    <span className="text-slate-600">{activeSubmission.documents.length} archivo(s) adjunto(s) recibido(s).</span>
                  </div>
                )}

                {/* AI team analysis response */}
                <div className="space-y-2 mt-4 bg-white border border-slate-200/60 p-4 rounded-xl">
                  <span className="inline-flex items-center space-x-1 text-[9px] font-black tracking-widest uppercase text-ant-blue bg-ant-blue-light px-2 py-0.5 rounded">
                    <span>RESPUESTA PREVENTIVA DEL DESPACHO</span>
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {activeSubmission.aiResponse}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => setFormSuccess(false)}
                  className="rounded-xl bg-ant-blue text-white px-5 py-3 font-bold text-sm hover:bg-ant-blue transition-colors shadow shadow-ant-blue-dark/10"
                >
                  Radicar nuevo requerimiento
                </button>
              </div>
            </div>
          ) : (
            /* Standard PQRSD Input Form */
            <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Field: First Name */}
                <div className="space-y-1.5">
                  <label htmlFor="firstName" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Primer Nombre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text" id="firstName" name="firstName" required
                      value={formData.firstName} onChange={handleInputChange}
                      placeholder="Ej. Juan"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Field: Last Name */}
                <div className="space-y-1.5">
                  <label htmlFor="lastName" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Primer Apellido <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text" id="lastName" name="lastName" required
                      value={formData.lastName} onChange={handleInputChange}
                      placeholder="Ej. Pérez"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Field: Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email" id="email" name="email" required
                      value={formData.email} onChange={handleInputChange}
                      placeholder="juan@ejemplo.com"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Field: Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Teléfono de Contacto <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel" id="phone" name="phone" required
                      value={formData.phone} onChange={handleInputChange}
                      placeholder="300 123 4567"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Field: Type of request dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="type" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tipo de Requerimiento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select id="type" name="type" value={formData.type} onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all appearance-none cursor-pointer">
                      <option value="Petición">Petición (Peticiones de información / Propuestas)</option>
                      <option value="Queja">Queja (Inconformidad con entidad del Estado)</option>
                      <option value="Reclamo">Reclamo (Falta de atención / Garantía)</option>
                      <option value="Sugerencia">Sugerencia (Recomendación constructiva)</option>
                      <option value="Felicitación">Felicitación (Reconocimiento al trabajo)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Field: Related Legislative Agenda Proposal */}
                <div className="space-y-1.5">
                  <label htmlFor="proposalId" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Eje Legislativo Relacionado <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select id="proposalId" name="proposalId" value={formData.proposalId} onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all appearance-none cursor-pointer">
                      <option value="general">Consulta o Petición General</option>
                      {PROPOSALS.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Field: Description */}
              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Descripción del Asunto a Tratar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3.5 pointer-events-none text-slate-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <textarea
                    id="description" name="description" required rows={4}
                    value={formData.description} onChange={handleInputChange}
                    placeholder="Describe de manera detallada el asunto o propuesta que deseas radicar ante la Congresista. Por ejemplo, problemáticas en acueductos veredales, necesidades de formalización de tu comunidad minera..."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Field: Attachments */}
              <div className="space-y-1.5">
                <label htmlFor="files" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Adjuntar Documentos de Soporte <span className="text-slate-300 font-normal normal-case">(opcional, hasta 4 archivos · máx 6 MB c/u)</span>
                </label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="files"
                    className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 hover:border-ant-blue hover:bg-ant-blue-light/20 px-4 py-3 text-sm text-slate-600 cursor-pointer bg-slate-50 transition-all w-full"
                  >
                    <Paperclip className="h-4 w-4 text-ant-blue" />
                    <span>{files.length ? `${files.map(f => f.name).join(', ')}` : 'Seleccionar archivos (PDF, JPG, PNG, DOC, XLS, TXT)'}</span>
                  </label>
                  {files.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="shrink-0 text-xs text-red-600 font-bold hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <input
                  id="files" name="files" type="file" multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.xls,.xlsx"
                  onChange={handleFiles} className="hidden"
                />
              </div>

              {/* Error messages box */}
              {error && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </p>
              )}

              {/* Submit Trigger */}
              <button
                type="submit" disabled={submitting}
                className="w-full flex justify-center items-center space-x-2 rounded-xl bg-slate-900 text-white py-4 font-bold text-sm hover:bg-slate-800 transition-all shadow hover:scale-[1.01] cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando y analizando radicado...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>Radicar Requerimiento Oficial</span>
                  </>
                )}
              </button>

              {/* Privacy note */}
              <p className="text-[10px] text-slate-400 leading-relaxed flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-ant-blue shrink-0 mt-0.5" />
                <span>
                  Tus datos de contacto se almacenan cifrados y se protegen bajo la Ley 1581 de 2012 (Habeas Data). Se anonimizan automáticamente una vez atendido el requerimiento y nunca se publican públicamente.
                </span>
              </p>

            </form>
          )}
        </div>

        {/* Right Side: Guarantees & Tracking by radicado */}
        <div className="lg:col-span-5 space-y-6">
          {/* Informational Guidelines Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-y-1/4 translate-x-1/4">
              <CheckSquare className="h-48 w-48" />
            </div>

            <h4 className="text-base font-black uppercase tracking-wider text-ant-gold mb-4 flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Garantías Ciudadanas</span>
            </h4>
            <ul className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <li className="flex gap-2">
                <span className="font-bold text-ant-gold">1.</span>
                <span><strong>Seguimiento de Ley:</strong> Todas las solicitudes ingresadas reciben el trámite formal acorde a la Ley 1755 de 2015 que regula el Derecho de Petición.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-ant-gold">2.</span>
                <span><strong>Rigor de Análisis:</strong> Los radicados son clasificados automáticamente según las Comisiones Constitucionales del Congreso (Comisión Quinta para Medio Ambiente, Minería y Agro).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-ant-gold">3.</span>
                <span><strong>Privacidad:</strong> Tus datos de contacto están cifrados y amparados por la Ley Habeas Data 1581 de 2012. No se publican ni se divulgan bajo ninguna circunstancia.</span>
              </li>
            </ul>
          </div>

          {/* Tracking by Radicado number (private) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-ant-blue" />
              <span>Consulta tu radicado</span>
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">
              Ingresa tu número de radicado (ej. RAD-ALM-2026-XXXX) para conocer su estado y respuesta.
            </p>

            <form onSubmit={handleTrack} className="flex gap-2">
              <input
                type="text"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder="RAD-ALM-2026-0000"
                className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue rounded-xl px-3 py-2.5 text-xs text-slate-800 uppercase placeholder:normal-case focus:outline-none focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!trackId.trim() || tracking}
                className="rounded-xl bg-ant-blue text-white px-4 py-2.5 text-xs font-bold hover:bg-ant-blue-dark disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center gap-1.5"
              >
                {tracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                <span>Consultar</span>
              </button>
            </form>

            {trackError && (
              <p className="mt-3 text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100">
                {trackError}
              </p>
            )}

            {trackResult && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black text-slate-800">{trackResult.id}</span>
                  <span className="inline-block rounded-full bg-ant-blue-light text-ant-blue-dark text-[9px] font-bold px-2.5 py-0.5 uppercase tracking-wide border border-ant-blue-light">
                    {trackResult.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="font-bold">Tipo:</span> {trackResult.type} · <span className="font-bold">Categoría:</span> {trackResult.categoryName}</p>
                  <p className="text-[11px] text-slate-500">Radicado el {new Date(trackResult.createdAt).toLocaleString()}</p>
                </div>
                {trackResult.aiResponse && (
                  <div className="bg-white border border-slate-200/70 p-3 rounded-xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-ant-blue block mb-1">
                      {trackResult.status === 'Resuelto' ? 'RESPUESTA DEL DESPACHO' : 'RESPUESTA PREVENTIVA'}
                    </span>
                    <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">{trackResult.aiResponse}</p>
                  </div>
                )}
                {trackResult.anonymized && (
                  <p className="text-[10px] text-slate-400">* Este radicado fue anonimizado por política de privacidad.</p>
                )}
              </div>
            )}
          </div>

          {/* Contact helper */}
          <div className="bg-ant-blue-light border border-ant-blue-light rounded-3xl p-5 text-center">
            <p className="text-xs text-ant-blue-dark font-medium">
              ¿Necesitas ayuda? Escríbenos a <strong>ana.mora@camara.gov.co</strong>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}