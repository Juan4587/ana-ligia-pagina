import { Mail, MapPin, Calendar, Twitter, Instagram, Facebook } from 'lucide-react';

const SOCIAL_LINKS = [
  { icon: Twitter, label: 'X / Twitter', url: 'https://x.com/amoramartinez1?lang=es' },
  { icon: Instagram, label: 'Instagram', url: 'https://www.instagram.com/amoramartinez1/?hl=es' },
  { icon: Facebook, label: 'Facebook', url: 'https://www.facebook.com/AnaLigiaMoraM/?locale=es_LA' },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-white border-t border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-12">

          {/* Column 1: Brand */}
          <div className="md:col-span-5 space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/logo-blanco.png"
                alt="Ana Ligia Mora Martínez"
                width={1908}
                height={593}
                loading="lazy"
                className="w-56 md:w-[360px] h-auto"
              />
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-md">
              Ingeniera ambiental comprometida con el desarrollo sostenible de Antioquia y Colombia. Liderando desde la Comisión Quinta del Congreso con rigor técnico, evidencia científica y cercanía ciudadana.
            </p>
          </div>

          {/* Column 2: Social Media */}
          <div className="md:col-span-2 space-y-4">
            <h5 className="text-xs font-semibold tracking-[0.15em] text-neutral-300 uppercase">
              Redes Sociales
            </h5>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, label, url }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 hover:bg-primary hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 3: Contact */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-xs font-semibold tracking-[0.15em] text-neutral-300 uppercase">Canales oficiales</h5>
            <div className="space-y-3 text-sm text-neutral-300">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                <span>Congreso de la República, Edificio Nuevo del Congreso, Bogotá D.C.</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-neutral-500 shrink-0" />
                <a href="mailto:ana.mora@camara.gov.co" className="hover:text-primary-light transition-colors">
                  ana.mora@camara.gov.co
                </a>
              </div>
            </div>
          </div>

          {/* Column 4: Legal */}
          <div className="md:col-span-2 space-y-4">
            <h5 className="text-xs font-semibold tracking-[0.15em] text-neutral-300 uppercase">Garantías legales</h5>
            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p>
                <strong className="text-neutral-200">Habeas Data:</strong> De conformidad con la Ley 1581 de 2012, tus datos personales están protegidos.
              </p>
              <p>
                <strong className="text-neutral-200">Comisión Quinta:</strong> Medio ambiente, recursos naturales, minería, energía y desarrollo rural.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Período Constitucional 2026 — 2030</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Ana Ligia Mora Martínez. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span className="hover:text-neutral-300 cursor-pointer">Políticas de privacidad</span>
            <span className="text-neutral-700">·</span>
            <span className="hover:text-neutral-300 cursor-pointer">Términos de uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
