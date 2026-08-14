/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel del Despacho. Acceso por CORREO + CLAVE por usuario (bcrypt en servidor).
 * Permite: ver/filtrar/responder/anonimizar/eliminar radicados, administrar
 * proyectos de ley con su documento, gestionar usuarios y revisar la auditoría.
 */

import React from 'react';
import {
  Lock, LogOut, Inbox, FileSpreadsheet, Search, Loader2, Eye, ShieldCheck,
  Trash2, Send, Check, Upload, Download, RefreshCw, Filter, Paperclip,
  UserPlus, Users, ScrollText, KeyRound
} from 'lucide-react';
import { PROPOSALS } from '../data';
import { PQRSDSubmission, PQRSDStatus, PQRSDType, FiledBill, BillStatus, AdminUser, AuditEntry } from '../types';

const STORAGE_TOKEN = 'alm-admin-token';
const STORAGE_USER = 'alm-admin-user';

const PQRSD_STATUSES: PQRSDStatus[] = ['Radicado', 'En Revisión', 'Asignado', 'Resuelto'];
const PQRSD_TYPES: PQRSDType[] = ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'];
const BILL_STATUSES: BillStatus[] = [
  'Radicado', 'Primer Debate', 'Segundo Debate', 'Tercer Debate', 'Cuarto Debate', 'Sanción Presidencial', 'Ley de la República',
];

async function api(path: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem(STORAGE_TOKEN) || '';
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    throw new Error('Sesión expirada. Ingrese nuevamente con su correo y clave.');
  }
  if (!response.ok) throw new Error(data.error || 'Error en la solicitud.');
  return data;
}

function statusStyle(status: string) {
  switch (status) {
    case 'Radicado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'En Revisión': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Asignado': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Resuelto': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

const emptyBillForm = {
  title: '',
  number: '',
  dateFiled: '',
  status: 'Radicado' as BillStatus,
  stageDescription: '',
  summary: '',
  proposalIdRelated: 'general',
  impactScore: 'Alto' as 'Alto' | 'Medio',
  authors: '',
  initiatives: '',
};

export default function AdminPanel() {
  const [authed, setAuthed] = React.useState<boolean>(!!sessionStorage.getItem(STORAGE_TOKEN));
  const [sessionUser, setSessionUser] = React.useState<{ name: string; email: string } | null>(
    () => {
      try { return JSON.parse(sessionStorage.getItem(STORAGE_USER) || 'null'); } catch { return null; }
    }
  );
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [loggingIn, setLoggingIn] = React.useState(false);

  const [tab, setTab] = React.useState<'radicados' | 'leyes' | 'usuarios' | 'auditoria'>('radicados');

  // Radicados
  const [filters, setFilters] = React.useState({ status: '', type: '', proposalId: '', q: '' });
  const [submissions, setSubmissions] = React.useState<PQRSDSubmission[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loadingList, setLoadingList] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<PQRSDSubmission | null>(null);

  // Respuesta / acciones del detalle
  const [responseText, setResponseText] = React.useState('');
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Proyectos de ley
  const [bills, setBills] = React.useState<FiledBill[]>([]);
  const [billForm, setBillForm] = React.useState(emptyBillForm);
  const [billFile, setBillFile] = React.useState<File | null>(null);
  const [billsLoading, setBillsLoading] = React.useState(false);
  const [uploadingBill, setUploadingBill] = React.useState(false);

  // Usuarios del Despacho
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [newUser, setNewUser] = React.useState({ name: '', email: '', password: '' });
  const [creatingUser, setCreatingUser] = React.useState(false);

  // Auditoría
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [auditQ, setAuditQ] = React.useState('');
  const [auditTotal, setAuditTotal] = React.useState(0);
  const [auditLoading, setAuditLoading] = React.useState(false);

  const loadSubmissions = async (f = filters) => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (f.status) params.set('status', f.status);
      if (f.type) params.set('type', f.type);
      if (f.proposalId) params.set('proposalId', f.proposalId);
      if (f.q) params.set('q', f.q);
      const data = await api(`/api/admin/submissions?${params.toString()}`);
      setSubmissions(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setNotice(null);
    try {
      const data = await api(`/api/admin/submissions/${id}`);
      setDetail(data);
      setResponseText(data.aiResponse || '');
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const loadBills = async () => {
    setBillsLoading(true);
    try {
      const data = await api('/api/bills');
      setBills(data);
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBillsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api('/api/admin/users');
      setUsers(data.items);
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const loadAudit = async (q = auditQ) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const data = await api(`/api/admin/audit?${params.toString()}`);
      setAudit(data.items);
      setAuditTotal(data.total);
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setAuditLoading(false);
    }
  };

  React.useEffect(() => {
    if (authed) {
      Promise.allSettled([loadSubmissions(), loadBills(), loadUsers(), loadAudit()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const data = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const body = await data.json();
      if (!data.ok) throw new Error(body.error || 'Correo o clave incorrectos.');
      sessionStorage.setItem(STORAGE_TOKEN, body.token);
      sessionStorage.setItem(STORAGE_USER, JSON.stringify(body.user));
      setSessionUser(body.user);
      setAuthed(true);
    } catch (err: any) {
      setLoginError(err.message || 'Correo o clave incorrectos.');
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem(STORAGE_TOKEN)}` },
      });
    } catch { /* noop */ }
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    setAuthed(false);
    setSessionUser(null);
    setSubmissions([]);
    setDetail(null);
    setSelectedId(null);
  };

  const changeStatus = async (newStatus: PQRSDStatus) => {
    if (!detail) return;
    setBusyAction('status');
    try {
      await api(`/api/admin/submissions/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setNotice({ type: 'ok', text: 'Estado actualizado.' });
      loadDetail(detail.id);
      loadSubmissions();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const sendResponse = async (sendEmail: boolean) => {
    if (!detail || responseText.trim().length < 10) {
      setNotice({ type: 'err', text: 'La respuesta debe tener al menos 10 caracteres.' });
      return;
    }
    setBusyAction('respond');
    try {
      const data = await api(`/api/admin/submissions/${detail.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: responseText.trim(), sendEmail }),
      });
      setNotice({
        type: 'ok',
        text: sendEmail && data.emailed
          ? 'Respuesta guardada y enviada al correo del ciudadano.'
          : sendEmail && !data.emailed
          ? 'Respuesta guardada. El correo NO se envió (Resend no configurado).'
          : 'Respuesta guardada.',
      });
      loadDetail(detail.id);
      loadSubmissions();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const anonymize = async () => {
    if (!detail) return;
    if (!confirm(`¿Anonimizar el radicado ${detail.id}? Los datos personales (nombre, correo, teléfono) se eliminarán de forma permanente.`)) return;
    setBusyAction('anonymize');
    try {
      await api(`/api/admin/submissions/${detail.id}/anonymize`, { method: 'POST' });
      setNotice({ type: 'ok', text: 'Radicado anonimizado.' });
      loadDetail(detail.id);
      loadSubmissions();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const removeSubmission = async () => {
    if (!detail) return;
    if (!confirm(`¿Eliminar permanentemente el radicado ${detail.id} y sus adjuntos? Esta acción no se puede deshacer.`)) return;
    setBusyAction('delete');
    try {
      await api(`/api/admin/submissions/${detail.id}`, { method: 'DELETE' });
      setNotice({ type: 'ok', text: 'Radicado eliminado.' });
      setDetail(null);
      setSelectedId(null);
      loadSubmissions();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const downloadDocument = async (doc: { id: number; filename: string }) => {
    if (!detail) return;
    try {
      const token = sessionStorage.getItem(STORAGE_TOKEN) || '';
      const res = await fetch(`/api/admin/submissions/${detail.id}/documents/${doc.id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo descargar.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || 'adjunto';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.title.trim() || !billForm.number.trim()) {
      setNotice({ type: 'err', text: 'Título y número del proyecto son obligatorios.' });
      return;
    }
    setUploadingBill(true);
    try {
      const fd = new FormData();
      Object.entries(billForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (billFile) fd.append('file', billFile);
      const token = sessionStorage.getItem(STORAGE_TOKEN) || '';
      const res = await fetch('/api/admin/bills', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar.');
      setNotice({ type: 'ok', text: `Proyecto ${data.number} registrado.` });
      setBillForm(emptyBillForm);
      setBillFile(null);
      e.currentTarget.reset();
      loadBills();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setUploadingBill(false);
    }
  };

  const removeBill = async (bill: FiledBill) => {
    if (!confirm(`¿Eliminar el proyecto ${bill.number}?`)) return;
    try {
      await api(`/api/admin/bills/${bill.id}`, { method: 'DELETE' });
      setNotice({ type: 'ok', text: 'Proyecto de ley eliminado.' });
      loadBills();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setNotice({ type: 'ok', text: `Usuario ${newUser.email} creado.` });
      setNewUser({ name: '', email: '', password: '' });
      loadUsers();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setCreatingUser(false);
    }
  };

  const toggleUserActive = async (user: AdminUser) => {
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: user.is_active !== 1 }),
      });
      loadUsers();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const resetUserPassword = async (user: AdminUser) => {
    const newPass = prompt(`Nueva clave para ${user.email} (mínimo 8 caracteres):`);
    if (!newPass) return;
    if (newPass.length < 8) {
      setNotice({ type: 'err', text: 'La clave debe tener al menos 8 caracteres.' });
      return;
    }
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPass }),
      });
      setNotice({ type: 'ok', text: `Clave de ${user.email} actualizada.` });
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (user.email === sessionUser?.email) {
      setNotice({ type: 'err', text: 'No puede eliminarse a sí mismo.' });
      return;
    }
    if (!confirm(`¿Eliminar el usuario ${user.email}?`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setNotice({ type: 'ok', text: 'Usuario eliminado.' });
      loadUsers();
      loadAudit();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  /* ---------- Login screen ---------- */

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ant-blue-light text-ant-blue mb-3">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Panel del Despacho</h2>
            <p className="text-xs text-slate-500 mt-1">Acceso restringido. Ingrese el correo y la clave de su usuario institucional.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Correo institucional"
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 focus:border-ant-blue rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:bg-white transition-all"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Clave"
              className="w-full bg-slate-50 border border-slate-200 focus:border-ant-blue rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:bg-white transition-all"
            />
            {loginError && <p className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100">{loginError}</p>}
            <button
              type="submit"
              disabled={!loginEmail || !loginPassword || loggingIn}
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-ant-blue text-white py-3.5 font-bold text-sm hover:bg-ant-blue-dark disabled:bg-slate-200 disabled:text-slate-400 transition-all"
            >
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              <span>Ingresar al Despacho</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              {sessionUser ? `Sesión expirada. Usuario: ${sessionUser.email}` : 'Contacte al administrador si no tiene usuario.'}
            </p>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- Panel ---------- */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-slate-900 text-white sticky top-16 z-40 shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-ant-gold" />
            <span className="font-bold text-sm uppercase tracking-wider">Despacho · Administración</span>
            <span className="hidden sm:inline text-[10px] text-slate-400 font-semibold">{sessionUser?.name} <span className="text-slate-500">&lt;{sessionUser?.email}&gt;</span></span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white">
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {notice && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-xs font-semibold border ${notice.type === 'ok' ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {notice.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setTab('radicados')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${tab === 'radicados' ? 'bg-ant-blue text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <Inbox className="h-4 w-4" />
            <span>Radicados PQRSD</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20">{total}</span>
          </button>
          <button
            onClick={() => setTab('leyes')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${tab === 'leyes' ? 'bg-ant-blue text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Proyectos de Ley</span>
            <span className="text-[10px] text-slate-400">{bills.length}</span>
          </button>
          <button
            onClick={() => setTab('usuarios')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${tab === 'usuarios' ? 'bg-ant-blue text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
          </button>
          <button
            onClick={() => setTab('auditoria')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${tab === 'auditoria' ? 'bg-ant-blue text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <ScrollText className="h-4 w-4" />
            <span>Auditoría</span>
          </button>
        </div>

        {tab === 'radicados' && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* List + filters */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Radicados</h3>
                <button onClick={() => loadSubmissions()} className="text-slate-400 hover:text-ant-blue"><RefreshCw className="h-4 w-4" /></button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 focus:outline-none focus:border-ant-blue"
                >
                  <option value="">Estado: Todos</option>
                  {PQRSD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 focus:outline-none focus:border-ant-blue"
                >
                  <option value="">Tipo: Todos</option>
                  {PQRSD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <select
                value={filters.proposalId}
                onChange={(e) => setFilters({ ...filters, proposalId: e.target.value })}
                className="w-full mb-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 focus:outline-none focus:border-ant-blue"
              >
                <option value="">Eje legislativo: Todos</option>
                {PROPOSALS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>

              <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder="Buscar por radicado, tipo o eje..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-ant-blue focus:bg-white"
                />
              </div>

              <button
                onClick={() => loadSubmissions()}
                className="w-full mb-3 flex items-center justify-center gap-2 rounded-lg bg-ant-blue-light text-ant-blue-dark py-2 text-xs font-bold hover:bg-ant-blue hover:text-white transition-colors"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Aplicar filtros</span>
              </button>

              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {loadingList ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-ant-blue" /></div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400"><p className="text-xs">No hay radicados con esos filtros.</p></div>
                ) : (
                  submissions.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => loadDetail(sub.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === sub.id ? 'border-ant-blue bg-ant-blue-light/30 ring-1 ring-ant-blue/20' : 'border-slate-100 bg-slate-50/50 hover:border-ant-blue'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black text-slate-800">{sub.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusStyle(sub.status)}`}>{sub.status}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          {sub.anonymized ? '· Anonimizado ·' : `${sub.firstName || ''} ${sub.lastName || ''}`}
                        </span>
                        <span className="text-[10px] text-slate-400">{sub.type}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{sub.categoryName}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detail */}
            <div className="lg:col-span-7 space-y-5">
              {!detail ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 border-dashed">
                  <Eye className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">Selecciona un radicado para ver su detalle</p>
                  <p className="text-xs mt-1">Desde aquí podrás cambiar el estado, responder, anonimizar o eliminar.</p>
                </div>
              ) : (
                <>
                  {/* Detail header */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-ant-blue">RADICADO</span>
                        <h4 className="text-lg font-mono font-black text-slate-900">{detail.id}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Radicado el {new Date(detail.createdAt).toLocaleString()} · Actualizado el {new Date(detail.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <select
                        value={detail.status}
                        onChange={(e) => changeStatus(e.target.value as PQRSDStatus)}
                        disabled={busyAction === 'status'}
                        className="rounded-lg border border-slate-200 bg-white text-xs font-bold px-2.5 py-2 focus:outline-none focus:border-ant-blue"
                      >
                        {PQRSD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        {busyAction === 'status' && <option>Guardando...</option>}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Ciudadano</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">{detail.anonymized ? '— anonimizado —' : `${detail.firstName || ''} ${detail.lastName || ''}`}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Correo</span>
                        <span className="font-bold text-slate-800 mt-0.5 block break-all">{detail.anonymized ? '— anonimizado —' : detail.email}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Teléfono</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">{detail.anonymized ? '— anonimizado —' : detail.phone}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Tipo / Eje</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">{detail.type}</span>
                        <span className="text-slate-400 text-[10px] block">{detail.categoryName}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Descripción del ciudadano</span>
                      <p className="text-sm text-slate-700 leading-relaxed mt-1 bg-slate-50 rounded-xl p-3 whitespace-pre-line">{detail.description}</p>
                    </div>

                    {/* Confirmation of emails */}
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded-full border ${detail.emailSent ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {detail.emailSent ? '✓ Confirmación enviada al ciudadano' : 'Sin confirmación enviada'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border ${detail.despachoNotified ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {detail.despachoNotified ? '✓ Aviso al despacho enviado' : 'Sin aviso al despacho'}
                      </span>
                      {detail.anonymized && <span className="px-2 py-0.5 rounded-full border bg-ant-blue-light text-ant-blue-dark border-ant-blue-light">Anonimizado</span>}
                    </div>
                  </div>

                  {/* Attachments */}
                  {detail.documents && detail.documents.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-ant-blue" /> Documentos adjuntos
                      </h4>
                      <div className="space-y-2">
                        {detail.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                            <span className="text-xs text-slate-700 truncate">{doc.filename}</span>
                            <button onClick={() => downloadDocument(doc)} className="flex items-center gap-1 text-xs font-bold text-ant-blue hover:underline shrink-0 ml-3">
                              <Download className="h-3.5 w-3.5" /> Descargar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Respuesta del Despacho</h4>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={5}
                      placeholder="Escriba la respuesta institucional para este radicado..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-ant-blue focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => sendResponse(false)}
                        disabled={busyAction === 'respond'}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" /> Guardar respuesta
                      </button>
                      <button
                        onClick={() => sendResponse(true)}
                        disabled={busyAction === 'respond'}
                        className="flex items-center gap-1.5 rounded-xl bg-ant-blue text-white px-4 py-2.5 text-xs font-bold hover:bg-ant-blue-dark disabled:opacity-50 transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" /> Guardar y enviar al correo
                      </button>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Privacidad (Ley 1581 / 2012)
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={anonymize}
                        disabled={busyAction === 'anonymize' || detail.anonymized}
                        className="flex items-center gap-1.5 rounded-xl border border-ant-blue text-ant-blue px-4 py-2.5 text-xs font-bold hover:bg-ant-blue-light disabled:opacity-40 transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Anonimizar (eliminar datos personales)
                      </button>
                      <button
                        onClick={removeSubmission}
                        disabled={busyAction === 'delete'}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 px-4 py-2.5 text-xs font-bold hover:bg-red-100 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar definitivamente
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'leyes' && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Form */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 text-ant-blue" /> Registrar Proyecto de Ley
              </h3>
              <form onSubmit={handleBillSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Título del Proyecto *</label>
                  <input
                    value={billForm.title}
                    onChange={(e) => setBillForm({ ...billForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="Ej. Formalización Minera Gradual"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Número *</label>
                    <input
                      value={billForm.number}
                      onChange={(e) => setBillForm({ ...billForm, number: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                      placeholder="Ej. PL 098/2026"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha de Radicación</label>
                    <input
                      type="date"
                      value={billForm.dateFiled}
                      onChange={(e) => setBillForm({ ...billForm, dateFiled: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado del Trámite</label>
                    <select
                      value={billForm.status}
                      onChange={(e) => setBillForm({ ...billForm, status: e.target.value as BillStatus })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    >
                      {BILL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Impacto</label>
                    <select
                      value={billForm.impactScore}
                      onChange={(e) => setBillForm({ ...billForm, impactScore: e.target.value as 'Alto' | 'Medio' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    >
                      <option value="Alto">Alto</option>
                      <option value="Medio">Medio</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Eje Legislativo Relacionado</label>
                  <select
                    value={billForm.proposalIdRelated}
                    onChange={(e) => setBillForm({ ...billForm, proposalIdRelated: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                  >
                    <option value="general">General / Sin eje</option>
                    {PROPOSALS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Resumen del proyecto *</label>
                  <textarea
                    value={billForm.summary}
                    onChange={(e) => setBillForm({ ...billForm, summary: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="Exposición de motivos / resumen ejecutivo"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado / Descripción de la etapa actual</label>
                  <input
                    value={billForm.stageDescription}
                    onChange={(e) => setBillForm({ ...billForm, stageDescription: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="Ej. Sin asignación de ponentes. Pendiente primer debate en Comisión Quinta."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Autores y ponentes (separados por coma)</label>
                  <input
                    value={billForm.authors}
                    onChange={(e) => setBillForm({ ...billForm, authors: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="Ana Ligia Mora Martínez, ..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Iniciativas clave del articulado (separadas por punto y coma)</label>
                  <textarea
                    value={billForm.initiatives}
                    onChange={(e) => setBillForm({ ...billForm, initiatives: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="Iniciativa 1; Iniciativa 2; Iniciativa 3"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Documento oficial (PDF/DOC/TXT, máx 20 MB)</label>
                  <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 hover:border-ant-blue bg-slate-50 px-4 py-3 text-sm text-slate-600 cursor-pointer transition-all">
                    <Upload className="h-4 w-4 text-ant-blue" />
                    <span className="truncate">{billFile ? billFile.name : 'Seleccionar archivo del proyecto de ley'}</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadingBill}
                  className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-900 text-white py-3.5 font-bold text-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                >
                  {uploadingBill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Registrar proyecto de ley
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-4">Proyectos registrados ({bills.length})</h3>
              {billsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ant-blue" /></div>
              ) : bills.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">Aún no hay proyectos registrados.</p>
                  <p className="text-xs mt-1">Use el formulario para subir los proyectos que radique o apoye la unidad legislativa.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {bills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{bill.number}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusStyle(bill.status)}`}>{bill.status}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900 truncate">{bill.title}</h5>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>{bill.dateFiled ? new Date(bill.dateFiled).toLocaleDateString() : 'Sin fecha'}</span>
                          {bill.hasFile && (
                            <a href={`/api/bills/${bill.id}/file`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ant-blue font-bold hover:underline">
                              <Paperclip className="h-3 w-3" /> Ver documento
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeBill(bill)}
                        className="shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title={`Eliminar ${bill.number}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'usuarios' && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Create user */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-ant-blue" /> Nuevo usuario del Despacho
              </h3>
              <form onSubmit={createUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre completo *</label>
                  <input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="Ej. Laura Gómez Tobón"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Correo institucional *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="ejemplo@despacho.co"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Clave (mínimo 8 caracteres) *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ant-blue focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingUser || !newUser.name || !newUser.email || newUser.password.length < 8}
                  className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-900 text-white py-3.5 font-bold text-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                >
                  {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Crear usuario
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-4">Usuarios del Despacho ({users.length})</h3>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{user.name}</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${user.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {user.is_active ? 'Activo' : 'Desactivado'}
                        </span>
                        {user.email === sessionUser?.email && (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-ant-blue-light text-ant-blue-dark border-ant-blue-light">Usted</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 break-all">{user.email}</p>
                      <p className="text-[10px] text-slate-400">Creado el {new Date(user.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleUserActive(user)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        title={user.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => resetUserPassword(user)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Cambiar clave"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeUser(user)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">No hay usuarios del Despacho.</p>
                    <p className="text-xs mt-1">Cree el primero con el formulario o con <code className="text-ant-blue">npx tsx scripts/seed_admin_user.ts</code>.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'auditoria' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-4">Auditoría de acciones del Despacho ({auditTotal})</h3>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[220px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  value={auditQ}
                  onChange={(e) => setAuditQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadAudit(e.currentTarget.value); }}
                  placeholder="Buscar por usuario, acción o radicado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-ant-blue focus:bg-white"
                />
              </div>
              <button
                onClick={() => loadAudit(auditQ)}
                className="flex items-center gap-1.5 rounded-lg bg-ant-blue text-white px-4 py-2 text-xs font-bold hover:bg-ant-blue-dark transition-colors"
              >
                <Filter className="h-3.5 w-3.5" /> Filtrar
              </button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {auditLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ant-blue" /></div>
              ) : audit.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ScrollText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">Sin registros de auditoría.</p>
                  <p className="text-xs mt-1">Las acciones sensibles (login, respuestas, anonimizaciones, usuarios, leyes) quedan registradas aquí.</p>
                </div>
              ) : (
                audit.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{entry.action}</span>
                        {entry.targetId && <span className="text-[10px] font-mono text-slate-500">{entry.targetId}</span>}
                      </div>
                      <p className="text-xs text-slate-700 font-semibold">{entry.adminEmail}</p>
                      {entry.details && <p className="text-[10px] text-slate-400 break-all">{entry.details}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}