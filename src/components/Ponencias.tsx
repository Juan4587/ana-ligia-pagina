/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText, Calendar, CheckCircle2, Clock, ArrowRight,
  Filter, Search, X, Loader2
} from 'lucide-react';

import { Ponencia } from '../types';
import { getStatusStyles, getTypeColor, mapStatusToBucket, GESTION_STATUS_BUCKETS } from './legislativeStyles';

const STATUSES: string[] = [...GESTION_STATUS_BUCKETS];

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Agua': 'bg-ant-blue-light text-ant-blue-dark border-ant-blue/20',
    'Energía': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Ambiente': 'bg-green-100 text-green-800 border-green-200',
    'Social': 'bg-purple-100 text-purple-800 border-purple-200',
    'Rural': 'bg-orange-100 text-orange-800 border-orange-200',
  };
  return colors[category] || 'bg-slate-100 text-slate-800 border-slate-200';
};

export default function Ponencias() {
  const [ponencias, setPonencias] = React.useState<Ponencia[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<string>('Todos');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<string>('Todos');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedPonencia, setSelectedPonencia] = React.useState<Ponencia | null>(null);

  React.useEffect(() => {
    fetch('/api/ponencias')
      .then((response) => {
        if (!response.ok) throw new Error('Error cargando ponencias');
        return response.json();
      })
      .then((data: Ponencia[]) => setPonencias(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const categories = React.useMemo(() => {
    const types = Array.from(new Set(ponencias.map((p) => p.type))).sort();
    return ['Todos', ...types];
  }, [ponencias]);

  const filteredPonencias = ponencias.filter((p) => {
    const matchesCategory = activeCategory === 'Todos' || p.type === activeCategory || p.category === activeCategory;
    const matchesStatus = activeStatusFilter === 'Todos' || mapStatusToBucket(p.status) === activeStatusFilter;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => { counts[s] = 0; });
    ponencias.forEach((p) => {
      const bucket = mapStatusToBucket(p.status);
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }, [ponencias]);

  const typeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => { if (c !== 'Todos') counts[c] = ponencias.filter((p) => p.type === c).length; });
    return counts;
  }, [ponencias, categories]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50 min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50 min-h-screen">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-block bg-primary-light text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Ponencias y Proposiciones
          </span>
          <h2 className="text-3xl font-extrabold text-neutral-900 sm:text-4xl">
            Ponencias y Proposiciones
          </h2>
        </div>
        <p className="text-neutral-600 mt-6 text-center">
          No se pudieron cargar las ponencias. Inténtelo de nuevo más tarde.
        </p>
      </div>
    );
  }

  if (ponencias.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50 min-h-screen">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-block bg-primary-light text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Ponencias y Proposiciones
          </span>
          <h2 className="text-3xl font-extrabold text-neutral-900 sm:text-4xl">
            Ponencias y Proposiciones
          </h2>
        </div>
        <p className="text-neutral-600 mt-6 text-center">
          Todavía no hay ponencias cargadas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50 min-h-screen">

      {/* Title & Introduction */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="inline-block bg-primary-light text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          Ponencias y Proposiciones
        </span>
        <h2 className="text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Ponencias y Proposiciones
        </h2>
        <p className="text-neutral-600 mt-4 text-base leading-relaxed">
          Espacio para el seguimiento y actualización constante de nuestras ponencias, proposiciones y proyectos de ley ante el Congreso de la República.
        </p>
      </div>

      {/* Stats Counter Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="text-center">
          <span className="block text-2xl font-black text-primary">{ponencias.length}</span>
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total de Ponencias</span>
        </div>
        {STATUSES.map((status) => (
          <div key={status} className="text-center">
            <span className="block text-2xl font-black text-primary">{statusCounts[status] || 0}</span>
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{status}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, descripción o autor..."
            className="w-full bg-neutral-50 border border-neutral-200 hover:border-neutral-300 focus:border-primary focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-800 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center space-x-1 px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {cat === 'Todos' && <Filter className="h-3.5 w-3.5 mr-1" />}
              <span>{cat}</span>
              {cat !== 'Todos' && typeCounts[cat] !== undefined && (
                <span className={`ml-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {typeCounts[cat]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1" /> Estado:
          </span>
          {['Todos', ...STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatusFilter(status)}
              className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                activeStatusFilter === status
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {status === 'Todos' && <Filter className="h-3 w-3 mr-0.5" />}
              <span>{status}</span>
              <span className="inline-block bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {status === 'Todos' ? ponencias.length : statusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-neutral-500 font-medium">
          Mostrando <span className="font-bold text-primary">{filteredPonencias.length}</span> de <span className="font-bold text-primary">{ponencias.length}</span> registros
        </p>
      </div>

      {/* Ponencias Grid */}
      {filteredPonencias.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-3xl text-neutral-400 space-y-3">
          <FileText className="h-12 w-12 mx-auto text-neutral-300" />
          <p className="text-sm font-semibold text-neutral-600">No se encontraron ponencias que coincidan con la búsqueda.</p>
          <button
            onClick={() => { setSearchQuery(''); setActiveCategory('Todos'); setActiveStatusFilter('Todos'); }}
            className="text-xs text-primary font-bold hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPonencias.map((ponencia) => (
            <div
              key={ponencia.id}
              onClick={() => setSelectedPonencia(ponencia)}
              className="group relative flex flex-col justify-between bg-white border border-neutral-200 hover:border-primary rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
            >
              <div>
                {/* Header: Type badge and icon */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${getTypeColor(ponencia.type)}`}>
                    {ponencia.type}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${getStatusStyles(ponencia.status)}`}>
                    {ponencia.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-neutral-900 group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {ponencia.title}
                </h3>

                {/* Category and Author */}
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryColor(ponencia.category)}`}>
                    {ponencia.category}
                  </span>
                </div>

                {/* Short Description */}
                <p className="text-neutral-500 text-xs mt-3 line-clamp-3 leading-relaxed font-normal">
                  {ponencia.shortDescription}
                </p>
              </div>

              {/* Footer: Date and Arrow */}
              <div className="mt-6 flex items-center justify-between text-xs font-bold text-neutral-400 group-hover:text-primary transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(ponencia.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{ponencia.author}</span>
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPonencia && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-neutral-900 text-white p-6 flex justify-between items-start border-b border-neutral-800">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-inner">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary-light">
                    {selectedPonencia.type} · {selectedPonencia.category}
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1 sm:text-2xl leading-tight">
                    {selectedPonencia.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedPonencia(null)}
                className="rounded-full bg-neutral-800 p-2 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-8">

              {/* Status and Metadata Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-2 ${getStatusStyles(selectedPonencia.status)}`}>
                    {selectedPonencia.status}
                  </span>
                  <p className="text-xs font-bold text-neutral-500 mt-1">Estado Actual</p>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center text-neutral-400 mb-2">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-neutral-800">
                    {new Date(selectedPonencia.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs font-bold text-neutral-500 mt-1">Fecha de Presentación</p>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center text-neutral-400 mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-neutral-800">{selectedPonencia.type}</p>
                  <p className="text-xs font-bold text-neutral-500 mt-1">Tipo</p>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center text-neutral-400 mb-2">
                    <span className="text-sm font-bold text-neutral-800">{selectedPonencia.author}</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-500 mt-1">Autor / Ponente</p>
                </div>
              </div>

              {/* Full Description */}
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2 flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Descripción Completa</span>
                </h4>
                <p className="text-neutral-700 text-sm leading-relaxed">
                  {selectedPonencia.description}
                </p>
              </div>

              {/* Author & Category Info */}
              <div className="grid gap-6 md:grid-cols-2 text-left">
                <div className="bg-primary-light border border-primary/20 rounded-2xl p-5">
                  <div className="flex items-center space-x-2 text-primary mb-3">
                    <FileText className="h-5 w-5 shrink-0" />
                    <h5 className="font-extrabold text-sm uppercase tracking-wider">Categoría Legislativa</h5>
                  </div>
                  <p className="text-primary-dark text-sm leading-relaxed">{selectedPonencia.category}</p>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center space-x-2 text-neutral-700 mb-3">
                    <Calendar className="h-5 w-5 shrink-0" />
                    <h5 className="font-extrabold text-sm uppercase tracking-wider">Fecha de Radicación</h5>
                  </div>
                  <p className="text-neutral-800 text-sm leading-relaxed">
                    {new Date(selectedPonencia.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Acts */}
              {selectedPonencia.acts && selectedPonencia.acts.length > 0 && (
                <div className="text-left">
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">
                    Iniciativas Legislativas Relacionadas
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedPonencia.acts.map((act, index) => (
                      <div key={index} className="flex items-start space-x-2.5 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-xs text-neutral-700 font-mono font-bold">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedPonencia(null)}
                className="px-6 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors"
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
