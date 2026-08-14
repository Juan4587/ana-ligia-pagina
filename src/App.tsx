import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Agenda from './components/Agenda';
import Simulator from './components/Simulator';
import Galeria from './components/Galeria';
import PQRSDForm from './components/PQRSDForm';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = React.useState<string>('inicio');

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-ant-white flex flex-col text-gray-800 font-sans selection:bg-ant-blue/10 selection:text-ant-blue-dark">

      {/* Universal Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'inicio' && (
          <div className="space-y-16">
            <Hero
              onExplorePropuestas={() => setActiveTab('agenda')}
              onContactForm={() => setActiveTab('pqrsd')}
            />

            {/* Philosophy section */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
              <div className="border border-gray-200 rounded-2xl p-8 md:p-10 grid gap-10 md:grid-cols-12 items-center bg-white">
                <div className="md:col-span-5 border-l-4 border-ant-blue pl-6 py-2">
                  <span className="block text-ant-blue text-xs font-semibold tracking-[0.2em] uppercase mb-1">
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

        {activeTab === 'agenda' && <Agenda />}

        {activeTab === 'simulador' && <Simulator />}

        {activeTab === 'galeria' && <Galeria />}

        {activeTab === 'pqrsd' && <PQRSDForm />}

        {activeTab === 'admin' && <AdminPanel />}
      </main>

      <Footer />
    </div>
  );
}
