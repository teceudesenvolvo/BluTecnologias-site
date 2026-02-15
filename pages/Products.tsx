import React from 'react';
import { Card3D } from '../components/ui/Card3D';
import { initialSoftwares } from '../services/mockData';
import { LayoutDashboard, Landmark, Smartphone, CheckCircle2 } from 'lucide-react';

export const Products: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-8 h-8" />;
      case 'Landmark': return <Landmark className="w-8 h-8" />;
      case 'Smartphone': return <Smartphone className="w-8 h-8" />;
      default: return <LayoutDashboard className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Nossas Soluções
          </h1>
          <p className="text-xl text-slate-500 max-w-3xl">
            Ferramentas poderosas para modernizar a administração pública, focadas na experiência do usuário e na eficiência processual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {initialSoftwares.map((software) => (
            <div key={software.id} className="flex flex-col">
              <Card3D
                title={software.nome_produto}
                description={software.descricao_venda}
                icon={getIcon(software.icone_3d)}
                features={software.features}
                highlight={true}
              />
              
              {/* Expanded Details (Visual only for demo) */}
              <div className="mt-6 px-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Destaques Técnicos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center text-slate-600 bg-white/50 p-3 rounded-lg border border-white/60">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                    LGPD Compliance
                  </div>
                  <div className="flex items-center text-slate-600 bg-white/50 p-3 rounded-lg border border-white/60">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                    Cloud Native
                  </div>
                  <div className="flex items-center text-slate-600 bg-white/50 p-3 rounded-lg border border-white/60">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                    API Aberta
                  </div>
                  <div className="flex items-center text-slate-600 bg-white/50 p-3 rounded-lg border border-white/60">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                    Suporte 24h
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-[2.5rem] p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para modernizar sua gestão?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Agende uma demonstração gratuita e veja como a Blu Tecnologias pode transformar sua cidade.
            </p>
            <button className="bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform">
              Agendar Demonstração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
