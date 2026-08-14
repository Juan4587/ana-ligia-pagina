import React from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'agenda', label: 'Agenda legislativa' },
    { id: 'simulador', label: 'Simulador' },
    { id: 'galeria', label: 'Galería' },
    { id: 'pqrsd', label: 'PQRSD' },
    { id: 'admin', label: 'Despacho' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('inicio')}>
          <img
            src="/logo_cd.jpeg"
            alt="Centro Democrático"
            className="h-9 w-9 object-contain rounded-lg border border-gray-200 bg-white p-0.5"
          />
          <div>
            <h1 className="text-base font-bold text-ant-blue-dark font-serif leading-tight">
              Ana Ligia Mora
            </h1>
            <p className="text-[10px] tracking-[0.15em] text-gray-400 font-sans font-semibold uppercase">
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
                  ? 'text-ant-blue bg-ant-blue-light font-semibold'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Menú"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-2 pb-4 pt-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'text-ant-blue bg-ant-blue-light font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
