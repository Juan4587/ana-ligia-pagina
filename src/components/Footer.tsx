import { Mail, MapPin, Calendar } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-12">

          {/* Column 1: Brand */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo_cd.jpeg"
                alt="Centro Democrático"
                className="h-9 w-9 object-contain rounded-lg border border-gray-200 bg-white p-0.5"
              />
              <div>
                <h4 className="text-base font-bold text-gray-900 font-serif leading-tight">
                  Ana Ligia Mora Martínez
                </h4>
                <p className="text-[10px] tracking-[0.15em] text-gray-400 font-sans font-semibold uppercase">
                  Representante a la Cámara · Antioquia
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              Ingeniera ambiental comprometida con el desarrollo sostenible de Antioquia y Colombia. Liderando desde la Comisión Quinta del Congreso con rigor técnico, evidencia científica y cercanía ciudadana.
            </p>
          </div>

          {/* Column 2: Contact */}
          <div className="md:col-span-4 space-y-4">
            <h5 className="text-xs font-semibold tracking-[0.15em] text-gray-400 uppercase">Canales oficiales</h5>
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span>Congreso de la República, Edificio Nuevo del Congreso, Bogotá D.C.</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <a href="mailto:ana.mora@camara.gov.co" className="hover:text-ant-blue transition-colors">
                  ana.mora@camara.gov.co
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Legal */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-xs font-semibold tracking-[0.15em] text-gray-400 uppercase">Garantías legales</h5>
            <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
              <p>
                <strong className="text-gray-500">Habeas Data:</strong> De conformidad con la Ley 1581 de 2012, tus datos personales están protegidos.
              </p>
              <p>
                <strong className="text-gray-500">Comisión Quinta:</strong> Medio ambiente, recursos naturales, minería, energía y desarrollo rural.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Período Constitucional 2026 — 2030</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Ana Ligia Mora Martínez. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-600 cursor-pointer">Políticas de privacidad</span>
            <span className="text-gray-300">·</span>
            <span className="hover:text-gray-600 cursor-pointer">Términos de uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
