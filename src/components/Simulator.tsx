/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Tractor, Pickaxe, GraduationCap, Briefcase, HeartHandshake, UserCheck, 
  ArrowRight, ChevronRight, TrendingUp, RefreshCw, Star, Info,
  Zap, Leaf, TreePine, Droplet, Sprout, Gem, FileText, PawPrint
} from 'lucide-react';
import { SIMULATOR_PROFILES, PROPOSALS } from '../data';
import { SimulatorProfile } from '../types';

export default function Simulator() {
  const [selectedProfile, setSelectedProfile] = React.useState<SimulatorProfile | null>(null);

  const getProfileIcon = (name: string, className: string = "h-8 w-8") => {
    switch (name) {
      case 'Tractor': return <Tractor className={className} />;
      case 'Pickaxe': return <Pickaxe className={className} />;
      case 'GraduationCap': return <GraduationCap className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'HeartHandshake': return <HeartHandshake className={className} />;
      case 'UserCheck': return <UserCheck className={className} />;
      default: return <UserCheck className={className} />;
    }
  };

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

  const getRelevanceBadgeColor = (level: string) => {
    switch (level) {
      case 'MUY ALTA': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ALTA': return 'bg-ant-blue-light text-ant-blue-dark border-ant-blue/20';
      case 'MEDIA': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      
      {/* Header and Intro */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          Simulador de Impacto
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          ¿Cómo te beneficia la Agenda Legislativa?
        </h2>
        <p className="text-slate-600 mt-4 text-lg">
          No todos los ciudadanos enfrentan los mismos desafíos. Selecciona tu perfil y descubre qué propuestas de Ana Ligia Mora están diseñadas directamente para mejorar tu vida cotidiana.
        </p>
      </div>

      {!selectedProfile ? (
        /* Step 1: Profile Grid Selection */
        <div className="space-y-8 animate-in fade-in duration-300">
          <h3 className="text-xl font-bold text-slate-800 text-center flex items-center justify-center space-x-2">
            <Star className="h-5 w-5 text-ant-blue fill-ant-blue" />
            <span>Paso 1: ¿Quién eres o qué actividad representas?</span>
          </h3>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SIMULATOR_PROFILES.map((profile) => (
              <div
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className="group flex flex-col justify-between bg-white border border-slate-200 hover:border-ant-blue rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-ant-blue group-hover:text-white shadow-sm transition-colors duration-200 mb-5">
                    {getProfileIcon(profile.icon)}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-ant-blue-dark transition-colors">
                    {profile.name}
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {profile.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-slate-400 group-hover:text-ant-blue transition-colors">
                  <span>Explorar mi impacto</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Step 2: Custom Matched Results */
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-300">
          
          {/* Header Card representing selected profile */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ant-blue text-white shadow-md">
              {getProfileIcon(selectedProfile.icon, "h-10 w-10")}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-2xl font-black text-slate-900">{selectedProfile.name}</h3>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">{selectedProfile.description}</p>
              <button
                onClick={() => setSelectedProfile(null)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-ant-blue font-bold mt-4 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Elegir otro perfil</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-2 px-2">
              <TrendingUp className="h-4.5 w-4.5 text-ant-blue" />
              <span>Propuestas con Impacto Directo</span>
            </h4>

            <div className="space-y-6">
              {selectedProfile.relevance.map((rel, index) => {
                // Find matching proposal info
                const proposal = PROPOSALS.find(p => p.id === rel.proposalId);
                if (!proposal) return null;

                return (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Left Mini Column: Proposal category and icon */}
                    <div 
                      className="md:w-48 shrink-0 p-6 flex flex-row md:flex-col items-center justify-between md:justify-center border-b md:border-b-0 md:border-r border-slate-100"
                      style={{ backgroundColor: `${proposal.color}05` }}
                    >
                      <div 
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: proposal.color }}
                      >
                        {getProposalIcon(proposal.icon, "h-6 w-6")}
                      </div>
                      <div className="md:mt-4 text-right md:text-center">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">PROPUESTA</span>
                        <span className="block text-xs font-bold text-slate-700 uppercase mt-0.5">{proposal.category}</span>
                      </div>
                    </div>

                    {/* Right column: Benefits explanation */}
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-lg font-bold text-slate-900">{proposal.title}</h5>
                        <div className="flex items-center space-x-2">
                          {/* Relevance badge */}
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${getRelevanceBadgeColor(rel.level)}`}>
                            Prioridad: {rel.level}
                          </span>
                          {/* Impact meter */}
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200`}>
                            Impacto {rel.impact === 'high' ? 'Alto' : 'Medio'}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-500 text-sm italic border-l-2 border-slate-200 pl-3">
                        "{proposal.shortDescription}"
                      </p>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start space-x-3">
                        <Info className="h-5 w-5 text-ant-blue shrink-0 mt-0.5" />
                        <div>
                          <h6 className="text-xs font-bold text-slate-800">¿Cómo te beneficia en tu día a día?</h6>
                          <p className="text-sm text-slate-700 mt-1 leading-relaxed font-medium">
                            {rel.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Disclaimer */}
          <p className="text-center text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            *El simulador calcula el impacto técnico y regulatorio con base en los textos y articulados oficiales de los 5 proyectos de ley radicados por el Equipo Enamorados de Antioquia en la Cámara (PL 115, 116, 118, 119 y 120 de 2026).
          </p>
        </div>
      )}

    </div>
  );
}
