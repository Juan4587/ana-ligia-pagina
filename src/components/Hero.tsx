import { ArrowRight, FileText } from 'lucide-react';

interface HeroProps {
  onExplorePropuestas: () => void;
  onContactForm: () => void;
}

const trajectory = [
  { role: 'Representante a la Cámara', institution: 'Congreso de la República · Antioquia', current: true },
  { role: 'Secretaria de Medio Ambiente', institution: 'Alcaldía de Medellín' },
  { role: 'Directora General', institution: 'Corantioquia' },
  { role: 'Diputada', institution: 'Asamblea Departamental de Antioquia' },
];

export default function Hero({ onExplorePropuestas, onContactForm }: HeroProps) {
  return (
    <div className="bg-neutral-50 border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">

          {/* Left: Content */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                Representante a la Cámara · Antioquia
              </span>
              <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl leading-tight font-display tracking-tight">
                Ana Ligia Mora Martínez
              </h1>
              <p className="text-lg text-neutral-600 font-sans leading-relaxed max-w-xl">
                Ingeniera Ambiental. Su trabajo legislativo se fundamenta en la evidencia, el rigor técnico y el compromiso con el desarrollo sostenible de Antioquia y Colombia.
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <span className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                Trayectoria
              </span>
              <div className="space-y-0">
                {trajectory.map((item, index) => (
                  <div key={index} className="flex gap-4 py-3 border-l-2 border-primary/20 pl-4 -ml-px relative">
                    <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 ${item.current ? 'bg-primary border-primary' : 'bg-white border-neutral-300'}`} />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-neutral-900 font-serif">{item.role}</span>
                      <p className="text-sm text-neutral-500">{item.institution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onExplorePropuestas}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors shadow-md shadow-primary/20"
              >
                Conocer agenda legislativa
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onContactForm}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                Radicar PQRSD
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right: Photo */}
          <div className="lg:col-span-5">
            <div className="relative">
              <img
                src="/foto_oficial.jpg"
                alt="Ana Ligia Mora Martínez"
                className="w-full rounded-2xl border border-neutral-200 shadow-lg shadow-primary/5"
              />
              <div className="mt-4 flex items-center gap-3 text-sm text-neutral-500">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                <span>Ingeniera Ambiental · Especialista en Alta Gerencia y Legislación Ambiental</span>
              </div>
            </div>
          </div>

        </div>

        {/* Logo Showcase */}
        <div className="mt-16 pt-10 border-t border-neutral-200">
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase mb-6">
            Identidad institucional
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="flex items-center gap-4 p-4 border border-neutral-200 rounded-xl hover:border-primary/30 transition-colors">
              <img
                src="/logo-cd-new.png"
                alt="Centro Democrático"
                className="h-10 w-10 object-contain rounded-lg"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-900">Centro Democrático</p>
                <p className="text-xs text-neutral-500">Aval oficial</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 border border-neutral-200 rounded-xl hover:border-primary/30 transition-colors">
              <img
                src="/enamorados_antioquia.png"
                alt="Enamorados de Antioquia"
                className="h-10 w-10 object-contain rounded-lg"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-900">Enamorados de Antioquia</p>
                <p className="text-xs text-neutral-500">Equipo político y técnico</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
