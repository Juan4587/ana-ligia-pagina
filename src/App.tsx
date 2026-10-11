import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Ponencias from './components/Ponencias';
import Agenda from './components/Agenda';
import Galeria from './components/Galeria';
import PQRSDForm from './components/PQRSDForm';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import Blog from './components/Blog';
import BlogCard from './components/BlogCard';
import { BlogPost } from './types';

const VALID_TABS = ['inicio', 'ponencias', 'agenda', 'galeria', 'pqrsd', 'admin', 'blog'];

function getTabFromHash(): string {
  if (typeof window === 'undefined') return 'inicio';
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash === 'despacho') return 'admin';
  if (VALID_TABS.includes(hash)) return hash;
  return 'inicio';
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState<string>(getTabFromHash);
  const [latestPosts, setLatestPosts] = React.useState<BlogPost[]>([]);

  React.useEffect(() => {
    fetch('/api/posts')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const sorted = [...data]
          .filter((p): p is BlogPost => p && typeof p.date === 'string')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        setLatestPosts(sorted);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const onHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const targetHash = tab === 'inicio' ? '' : `#${tab}`;
    if (window.location.hash !== targetHash) {
      if (tab === 'inicio') {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = targetHash;
      }
    }
  };

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
      <div className="min-h-screen bg-neutral-50 flex flex-col text-neutral-800 font-sans selection:bg-primary/10 selection:text-primary">

      {/* Universal Header */}
      <Header activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'inicio' && (
          <div className="space-y-16">
            <Hero
              onExplorePropuestas={() => handleTabChange('agenda')}
              onContactForm={() => handleTabChange('pqrsd')}
            />

            {/* Últimas publicaciones */}
            {latestPosts.length > 0 && (
              <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                      Blog
                    </span>
                    <h2 className="text-2xl font-bold text-neutral-900 font-serif mt-1">
                      Últimas publicaciones
                    </h2>
                  </div>
                  <a
                    href="#blog"
                    className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    Ver todas las publicaciones →
                  </a>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {latestPosts.map((post) => (
                    <BlogCard
                      key={post.id}
                      post={post}
                      onClick={() => handleTabChange('blog')}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Philosophy section */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
              <div className="border border-gray-200 rounded-2xl p-8 md:p-10 grid gap-10 md:grid-cols-12 items-center bg-white">
                <div className="md:col-span-5 border-l-4 border-primary pl-6 py-2">
                  <span className="block text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-1">
                    Filosofía legislativa
                  </span>
                  <blockquote className="text-2xl font-bold text-gray-900 leading-tight">
                    "Toma de decisiones basadas en evidencia y rigor técnico"
                  </blockquote>
                  <p className="text-gray-400 text-xs mt-3 font-semibold">— Ana Ligia Mora Martínez</p>
                </div>

                <div className="md:col-span-7 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 font-serif">Una agenda con sello técnico</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    La labor legislativa debe distanciarse del sectarismo político y centrarse en las soluciones basadas en evidencia científica y datos. Como <strong>Ingeniera Ambiental</strong>, especialista en <strong>Legislación Ambiental</strong> y exdirectora de la principal corporación ambiental de Antioquia (Corantioquia), Ana Ligia Mora ha diseñado un portafolio de leyes con rigurosa viabilidad técnica, cuidando el equilibrio socioeconómico de los sectores minero, agrícola e industrial de Colombia.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'ponencias' && <Ponencias />}

        {activeTab === 'agenda' && <Agenda />}

        {activeTab === 'galeria' && <Galeria />}

        {activeTab === 'pqrsd' && <PQRSDForm />}

        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'blog' && <Blog />}
      </main>

      <Footer />
    </div>
  );
}
