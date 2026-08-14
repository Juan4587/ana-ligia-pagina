/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Zap, Leaf, TreePine, Droplet, Sprout, Gem, PawPrint,
  Filter, ArrowUpRight, X, AlertCircle, FileText, BarChart3, CheckCircle2,
  Search, Calendar, FileSpreadsheet, Sparkles, Heart, Check, Users, MapPin, ChevronRight, Loader2
} from 'lucide-react';
import { PROPOSALS, FILED_BILLS } from '../data';
import { Proposal, FiledBill } from '../types';

export default function Agenda() {
  // Main view switcher: Proposals vs Filed Bills
  const [activeSubTab, setActiveSubTab] = React.useState<'propuestas' | 'radicados'>('propuestas');
  
  // Proposals filters
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Todos');
  const [activeProposal, setActiveProposal] = React.useState<Proposal | null>(null);

  // Filed bills filters & interaction
  const [billSearch, setBillSearch] = React.useState<string>('');
  const [billFilterCategory, setBillFilterCategory] = React.useState<string>('Todos');
  const [selectedBill, setSelectedBill] = React.useState<FiledBill | null>(null);
  
  // Signature backing state (local state tracker for civic support)
  const [signedBills, setSignedBills] = React.useState<Record<string, { signed: boolean; name: string; count: number }>>({
    'PL-112-2026': { signed: false, name: '', count: 1248 },
    'PL-145-2026': { signed: false, name: '', count: 2450 },
    'PL-098-2026': { signed: false, name: '', count: 3102 },
    'PL-154-2026': { signed: false, name: '', count: 914 },
    'PL-133-2026': { signed: false, name: '', count: 1877 },
  });

  const [signingName, setSigningName] = React.useState<string>('');
  const [signingEmail, setSigningEmail] = React.useState<string>('');
  const [signingBillId, setSigningBillId] = React.useState<string | null>(null);
  const [signSuccess, setSignSuccess] = React.useState<boolean>(false);

  // Proyectos de ley dinámicos (subidos desde el panel del Despacho)
  const [bills, setBills] = React.useState<FiledBill[]>(FILED_BILLS);
  const [billsLoaded, setBillsLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/bills')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FiledBill[]) => setBills(data.length ? data : FILED_BILLS))
      .catch(() => {})
      .finally(() => setBillsLoaded(true));
  }, []);

  const categories = ['Todos', 'Ambiente', 'Rural'];

  const filteredProposals = selectedCategory === 'Todos'
    ? PROPOSALS
    : PROPOSALS.filter(p => p.category === selectedCategory);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.title.toLowerCase().includes(billSearch.toLowerCase()) ||
      bill.number.toLowerCase().includes(billSearch.toLowerCase()) ||
      bill.summary.toLowerCase().includes(billSearch.toLowerCase());
    
    if (billFilterCategory === 'Todos') return matchesSearch;
    const relatedProposal = PROPOSALS.find(p => p.id === bill.proposalIdRelated);
    return matchesSearch && relatedProposal?.category === billFilterCategory;
  });

  const getProposalIcon = (name: string, className: string = "h-5 w-5") => {
    switch (name) {
      case 'Zap': return <Zap className={className} />;
      case 'Leaf': return <Leaf className={className} />;
      case 'TreePine': return <TreePine className={className} />;
      case 'Droplet': return <Droplet className={className} />;
      case 'Sprout': return <Sprout className={className} />;
      case 'Gem': return <Gem className={className} />;
      case 'PawPrint': return <PawPrint className={className} />;
      default: return <FileText className={className} />;
    }
  };

  const getBillStatusStyles = (status: FiledBill['status']) => {
    switch (status) {
      case 'Radicado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Primer Debate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Segundo Debate': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Tercer Debate': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Cuarto Debate': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'Sanción Presidencial': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Ley de la República': return 'bg-ant-blue-light text-ant-blue-dark border-ant-blue/20';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Stepper progress value for bills
  const getStageStep = (status: FiledBill['status']): number => {
    const stages: FiledBill['status'][] = [
      'Radicado', 'Primer Debate', 'Segundo Debate', 'Tercer Debate', 'Cuarto Debate', 'Sanción Presidencial', 'Ley de la República'
    ];
    return stages.indexOf(status) + 1;
  };

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingName.trim() || !signingEmail.trim() || !signingBillId) return;

    setSignedBills(prev => ({
      ...prev,
      [signingBillId]: {
        signed: true,
        name: signingName,
        count: prev[signingBillId].count + 1
      }
    }));
    setSignSuccess(true);
    setSigningName('');
    setSigningEmail('');
    
    // Auto clear success indicator
    setTimeout(() => {
      setSignSuccess(false);
      setSigningBillId(null);
    }, 4000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      
      {/* Title & Introduction */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="inline-block bg-ant-blue-light text-ant-blue-dark text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          Compromisos Legislativos
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Agenda Legislativa de Ana Ligia Mora
        </h2>
        <p className="text-slate-600 mt-4 text-base leading-relaxed">
          Un plan de acción riguroso, construido desde la evidencia científica de la ingeniería y la cercanía de la representación. Conoce nuestras propuestas y el estado real de los proyectos radicados en el Congreso.
        </p>
      </div>

      {/* Primary Sub-Tab Pill Navigation */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-xl bg-slate-200 p-1 shadow-sm">
          <button
            onClick={() => setActiveSubTab('propuestas')}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
              activeSubTab === 'propuestas'
                ? 'bg-ant-blue text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            Nuestros 5 Ejes Clave
          </button>
          <button
            onClick={() => setActiveSubTab('radicados')}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all duration-200 flex items-center space-x-1.5 ${
              activeSubTab === 'radicados'
                ? 'bg-ant-blue text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            <span>Proyectos de Ley Radicados</span>
            <span className="inline-block bg-slate-900/10 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
              {bills.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab content: 6 core proposals */}
      {activeSubTab === 'propuestas' ? (
        <div className="space-y-10 animate-in fade-in duration-300">
          
          {/* Categories Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center space-x-1 px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-ant-blue text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat === 'Todos' && <Filter className="h-3.5 w-3.5 mr-1" />}
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Proposals Grid Layout */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => setActiveProposal(proposal)}
                className="group relative flex flex-col justify-between bg-white border border-slate-200 hover:border-ant-blue rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
              >
                <div>
                  {/* Card Header Category and Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200`}>
                      {proposal.category}
                    </span>
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ backgroundColor: proposal.color }}
                    >
                      {getProposalIcon(proposal.icon)}
                    </div>
                  </div>

                  {/* Title and Short description */}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-ant-blue-dark transition-colors duration-200 line-clamp-2">
                    {proposal.title}
                  </h3>
                  <p className="text-slate-500 text-xs mt-3 line-clamp-4 leading-relaxed font-normal">
                    {proposal.shortDescription}
                  </p>
                </div>

                {/* Expand triggers */}
                <div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-ant-blue transition-colors">
                  <span>Ver análisis y cifras clave</span>
                  <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Tab content: Radicated bills space */
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Dashboard controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm grid gap-4 md:grid-cols-12 items-center">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                type="text"
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="Buscar por número de ley, palabra clave, ponentes..."
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="md:col-span-4 relative">
              <select
                value={billFilterCategory}
                onChange={(e) => setBillFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-ant-blue focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Todos">Filtro por Categoría: Todos</option>
                {categories.filter(c => c !== 'Todos').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Filter className="h-4 w-4" />
              </div>
            </div>

            <div className="md:col-span-2 text-right">
              <span className="text-xs text-slate-400 font-bold uppercase">
                {filteredBills.length} Proyectos
              </span>
            </div>

          </div>

          {/* Bills dynamic listings */}
          {!billsLoaded ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-ant-blue" />
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl text-slate-400 space-y-3">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-slate-300 animate-pulse" />
              <p className="text-sm font-semibold text-slate-600">Próximamente se listarán aquí los proyectos de ley radicados.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">Nuestro equipo técnico está consolidando el articulado oficial de las propuestas que serán radicadas para la Agenda Legislativa de Ana Ligia.</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl text-slate-400 space-y-3">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No se encontraron proyectos de ley que coincidan con la búsqueda.</p>
              <button
                onClick={() => { setBillSearch(''); setBillFilterCategory('Todos'); }}
                className="text-xs text-ant-blue font-bold hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredBills.map((bill) => {
                const relatedProposal = PROPOSALS.find(p => p.id === bill.proposalIdRelated);
                const isSigned = signedBills[bill.id]?.signed;
                const signCount = signedBills[bill.id]?.count ?? 0;

                return (
                  <div
                    key={bill.id}
                    className="bg-white border border-slate-200 hover:border-ant-blue rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Badge and Title */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
                          {bill.number}
                        </span>
                        
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getBillStatusStyles(bill.status)}`}>
                          Estado: {bill.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                          Eje Relacionado: {relatedProposal?.title || 'General'}
                        </span>
                        <h4 className="text-lg font-bold text-slate-900 hover:text-ant-blue-dark transition-colors cursor-pointer" onClick={() => setSelectedBill(bill)}>
                          {bill.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed font-normal text-left line-clamp-3">
                        {bill.summary}
                      </p>

                      {/* Timeline Quick Indicator */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-left">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-500">Progreso en el Congreso</span>
                          <span className="font-black text-ant-blue font-mono">Paso {getStageStep(bill.status)} de 7</span>
                        </div>
                        {/* Custom Micro Progress track bar */}
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-ant-blue rounded-full"
                            style={{ width: `${(getStageStep(bill.status) / 7) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Key initiatives mini list */}
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Iniciativas del Articulado:</span>
                        <ul className="space-y-1 pl-1">
                          {bill.initiatives.slice(0, 2).map((init, index) => (
                            <li key={index} className="text-xs text-slate-600 flex items-start gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-ant-blue shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{init}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
                      {/* Support indicator */}
                      <div className="flex items-center space-x-1 text-xs font-semibold text-slate-400">
                        <Heart className={`h-4 w-4 ${isSigned ? 'text-red-500 fill-red-500' : 'text-slate-300'}`} />
                        <span>{signCount} respaldos</span>
                      </div>

                      {/* Primary actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-ant-blue hover:bg-ant-blue-light/20 text-xs font-bold text-slate-700 hover:text-ant-blue transition-colors"
                        >
                          Ver detalle
                        </button>
                        
                        <button
                          onClick={() => {
                            if (!isSigned) {
                              setSigningBillId(bill.id);
                            }
                          }}
                          disabled={isSigned}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                            isSigned
                              ? 'bg-ant-blue-light text-ant-blue-dark border border-ant-blue-light'
                              : 'bg-ant-blue text-white hover:bg-ant-blue shadow-sm'
                          }`}
                        >
                          {isSigned ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Respaldado</span>
                            </>
                          ) : (
                            <span>Respaldar Proyecto</span>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: Detail and Full Stepper for Bills */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900 text-white p-6 flex justify-between items-start border-b border-slate-800">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ant-blue text-white shadow-inner">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ant-gold">
                    {selectedBill.number} · Radicado el {new Date(selectedBill.dateFiled).toLocaleDateString()}
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1 leading-tight max-w-xl">
                    {selectedBill.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Stepper Interactive Timeline */}
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 text-center">
                  Línea de Trámite en el Congreso de la República (Leyes Ordinarias)
                </h4>

                <div className="relative">
                  {/* Background Track Line */}
                  <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0 hidden md:block" />
                  
                  {/* Progress Line representation */}
                  <div 
                    className="absolute top-4 left-4 h-1 bg-ant-blue -translate-y-1/2 z-0 hidden md:block transition-all duration-500" 
                    style={{ width: `${((getStageStep(selectedBill.status) - 1) / 6) * 100}%` }}
                  />

                  {/* Steps list */}
                  <div className="grid gap-6 md:grid-cols-7 relative z-10">
                    {[
                      { name: 'Radicado', label: 'Radicado del Texto' },
                      { name: 'Primer Debate', label: 'Comisión Quinta' },
                      { name: 'Segundo Debate', label: 'Plenaria Cámara' },
                      { name: 'Tercer Debate', label: 'Comisión Senado' },
                      { name: 'Cuarto Debate', label: 'Plenaria Senado' },
                      { name: 'Sanción Presidencial', label: 'Sanción Ejecutiva' },
                      { name: 'Ley de la República', label: 'Promulgación Ley' }
                    ].map((step, idx) => {
                      const currentStep = idx + 1;
                      const billStep = getStageStep(selectedBill.status);
                      const isCompleted = currentStep < billStep;
                      const isActive = currentStep === billStep;

                      return (
                        <div key={step.name} className="flex md:flex-col items-center gap-3 md:gap-0 text-center">
                          <div 
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold border transition-all ${
                              isCompleted 
                                ? 'bg-ant-blue text-white border-ant-blue'
                                : isActive 
                                ? 'bg-slate-900 text-ant-gold border-slate-900 ring-4 ring-ant-blue/10'
                                : 'bg-white text-slate-400 border-slate-200'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : currentStep}
                          </div>
                          <div className="text-left md:text-center md:mt-3">
                            <span className={`block text-xs font-bold leading-tight ${isActive ? 'text-slate-900 font-extrabold' : isCompleted ? 'text-ant-blue-dark' : 'text-slate-400'}`}>
                              {step.name}
                            </span>
                            <span className="block text-[9px] text-slate-400 mt-0.5 leading-none md:hidden lg:block">
                              {step.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-ant-blue shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-left">
                    <strong>Estado actual:</strong> {selectedBill.stageDescription}
                  </p>
                </div>
              </div>

              {/* Summary and content */}
              <div className="grid gap-6 md:grid-cols-12 items-start">
                
                {/* Left info column */}
                <div className="md:col-span-8 space-y-6 text-left">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Exposición de Motivos y Resumen</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{selectedBill.summary}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Estructura del Articulado y Propuestas Clave</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedBill.initiatives.map((init, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start space-x-2.5">
                          <CheckCircle2 className="h-5 w-5 text-ant-blue shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 leading-relaxed">{init}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right metadata column */}
                <div className="md:col-span-4 space-y-4 text-left">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Detalles Técnicos</h5>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="block text-slate-400 font-bold">FECHA DE RADICACIÓN</span>
                        <span className="font-bold text-slate-800 block mt-0.5">{new Date(selectedBill.dateFiled).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="border-t border-slate-200/80 pt-2">
                        <span className="block text-slate-400 font-bold">AUTORES Y PONENTES</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedBill.authors.map((auth, index) => (
                            <span key={index} className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {auth}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-slate-200/80 pt-2">
                        <span className="block text-slate-400 font-bold">RATING DE IMPACTO CIUDADANO</span>
                        <span className="inline-flex items-center text-[10px] font-black uppercase text-ant-blue-dark bg-ant-blue-light px-2.5 py-1 rounded-full mt-1 border border-ant-blue-light">
                          <Sparkles className="h-3.5 w-3.5 text-ant-blue mr-1 animate-pulse" />
                          <span>Impacto {selectedBill.impactScore}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Short citizen backing count card */}
                  <div className="bg-ant-blue text-white rounded-2xl p-5 space-y-3 text-center relative overflow-hidden">
                    <Heart className="h-12 w-12 text-white/15 absolute right-0 bottom-0 translate-x-2 translate-y-2 transform" />
                    <h6 className="text-xs font-bold uppercase tracking-wider">Apoyo Ciudadano Recibido</h6>
                    <span className="block text-3xl font-black">{signedBills[selectedBill.id]?.count ?? 0} firmas</span>
                    <p className="text-[10px] text-ant-blue-light leading-relaxed">
                      Este proyecto tiene un gran interés social en Antioquia. Apóyalo para visibilizar el clamor regional.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Form for Supporting a Bill with Signature */}
      {signingBillId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Acompañar Iniciativa</h4>
              </div>
              <button
                onClick={() => setSigningBillId(null)}
                className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {signSuccess ? (
                <div className="text-center space-y-3 py-6 animate-in zoom-in-95">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ant-blue-light text-ant-blue shadow-sm">
                    <Check className="h-6 w-6" />
                  </div>
                  <h5 className="text-lg font-black text-slate-900">¡Respaldo Registrado!</h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Has sumado tu firma de apoyo al proyecto de ley. Tu voz ayuda a que el Congreso conozca la importancia territorial de esta reglamentación.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSignSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Registra tu apoyo cívico para esta iniciativa legislativa liderada por el equipo Enamorados de Antioquia de Ana Ligia Mora.
                  </p>

                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={signingName}
                      onChange={(e) => setSigningName(e.target.value)}
                      placeholder="Ej. Carolina Henao"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ant-blue focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={signingEmail}
                      onChange={(e) => setSigningEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ant-blue focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-ant-blue text-white font-bold text-xs py-3.5 hover:bg-ant-blue hover:scale-[1.01] transition-all shadow hover:shadow-ant-blue-dark/15"
                  >
                    Confirmar Firma de Respaldo
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Original Proposal Detail Slideover */}
      {activeProposal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-slate-900 text-white p-6 flex justify-between items-start border-b border-slate-800">
              <div className="flex items-center space-x-4">
                <div 
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-inner"
                  style={{ backgroundColor: activeProposal.color }}
                >
                  {getProposalIcon(activeProposal.icon, "h-6 w-6")}
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ant-gold">
                    Eje Legislativo · {activeProposal.category}
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1 sm:text-2xl leading-tight">
                    {activeProposal.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveProposal(null)}
                className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Segment: Descriptions */}
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  La Propuesta Completa
                </h4>
                <p className="text-slate-700 text-sm md:text-base leading-relaxed font-normal whitespace-pre-line">
                  {activeProposal.fullDescription}
                </p>
              </div>

              {/* Segment: The Problem vs Context */}
              <div className="grid gap-6 md:grid-cols-2 text-left">
                {/* Problem Box */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <div className="flex items-center space-x-2 text-red-800 mb-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <h5 className="font-extrabold text-sm uppercase tracking-wider">El Problema de Fondo</h5>
                  </div>
                  <p className="text-red-950 text-xs md:text-sm leading-relaxed">
                    {activeProposal.problem}
                  </p>
                </div>

                {/* Context Box */}
                <div className="bg-ant-blue-light border border-ant-blue-light rounded-2xl p-5">
                  <div className="flex items-center space-x-2 text-ant-blue-dark mb-3">
                    <FileText className="h-5 w-5 shrink-0" />
                    <h5 className="font-extrabold text-sm uppercase tracking-wider">Contexto & Marco de Acción</h5>
                  </div>
                  <p className="text-ant-blue-dark text-xs md:text-sm leading-relaxed">
                    {activeProposal.context}
                  </p>
                </div>
              </div>

              {/* Segment: Core Statistics */}
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-ant-blue" />
                  <span>Cifras Clave & Estadísticas de Respaldo</span>
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  {activeProposal.statistics.map((stat, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center shadow-sm">
                      <span className="block text-3xl font-black text-slate-800 mb-1" style={{ color: activeProposal.color }}>
                        {stat.value}
                      </span>
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        {stat.label}
                      </span>
                      <span className="block text-slate-500 text-xs mt-2 leading-relaxed">
                        {stat.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segment: Core Points */}
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Puntos Clave del Proyecto
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeProposal.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <CheckCircle2 className="h-5 w-5 text-ant-blue shrink-0 mt-0.5" />
                      <p className="text-xs md:text-sm text-slate-700 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Acts info */}
              {activeProposal.acts && activeProposal.acts.length > 0 && (
                <div className="border-t border-slate-100 pt-5 flex flex-wrap gap-2 items-center text-xs text-slate-500">
                  <span className="font-bold">Iniciativas Legislativas Relacionadas:</span>
                  {activeProposal.acts.map((act, index) => (
                    <span key={index} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono">
                      {act}
                    </span>
                  ))}
                </div>
              )}

            </div>

            {/* Close trigger at bottom */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveProposal(null)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
