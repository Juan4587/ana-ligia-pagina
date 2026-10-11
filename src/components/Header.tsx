import React from 'react';
import { Menu, X, Twitter, Instagram, Facebook } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SOCIAL_LINKS = [
  { icon: Twitter, label: 'X / Twitter', url: 'https://x.com/amoramartinez1?lang=es' },
  { icon: Instagram, label: 'Instagram', url: 'https://www.instagram.com/amoramartinez1/?hl=es' },
  { icon: Facebook, label: 'Facebook', url: 'https://www.facebook.com/AnaLigiaMoraM/?locale=es_LA' },
];

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [isOpen, setIsOpen] = React.useState(false);

const navItems = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'ponencias', label: 'Ponencias' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'galeria', label: 'Galería' },
    { id: 'blog', label: 'Blog Informativo' },
    { id: 'pqrsd', label: 'PQRSD' },
    { id: 'admin', label: 'Despacho' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('inicio')}>
          <img
            src="/logo-cd-new.png"
            alt="Centro Democrático"
            className="h-9 w-9 object-contain rounded-lg"
          />
          <div>
            <h1 className="text-base font-bold text-neutral-900 font-serif leading-tight">
              Ana Ligia Mora
            </h1>
            <p className="text-[10px] tracking-[0.15em] text-neutral-500 font-sans font-semibold uppercase">
              Congresista 2026-2030
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'text-primary bg-primary-light font-semibold'
                  : 'text-neutral-600 hover:text-primary hover:bg-neutral-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Desktop Social Icons */}
        <div className="hidden md:flex items-center gap-2">
          {SOCIAL_LINKS.map(({ icon: Icon, label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-primary-light hover:text-primary transition-colors"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>

        {/* Mobile button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Menú"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-2 pb-4 pt-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'text-primary bg-primary-light font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-center gap-3">
            {SOCIAL_LINKS.map(({ icon: Icon, label, url }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-neutral-400 hover:text-primary">
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
