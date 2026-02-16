import React from 'react';
import { Link } from 'react-router-dom';
import { initialSoftwares } from '../services/mockData';
import { LayoutDashboard, Landmark, Smartphone, ChevronRight } from 'lucide-react';

export const Products: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-full h-full" strokeWidth={1} />;
      case 'Landmark': return <Landmark className="w-full h-full" strokeWidth={1} />;
      case 'Smartphone': return <Smartphone className="w-full h-full" strokeWidth={1} />;
      default: return <LayoutDashboard className="w-full h-full" strokeWidth={1} />;
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20 font-sans text-slate-900">
      {/* Header Section */}
      <section className="pt-20 pb-16 px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Soluções que transformam.
        </h1>
        <p className="text-2xl md:text-3xl text-slate-500 font-medium max-w-3xl mx-auto">
          Tecnologia desenhada para a gestão pública moderna.
        </p>
      </section>

      {/* Main Products Grid */}
      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {initialSoftwares.map((software, index) => {
             const isLarge = index === 0; // First item large
             return (
              <div 
                key={software.id} 
                className={`group relative overflow-hidden rounded-[2.5rem] bg-slate-50 hover:bg-slate-100 transition-colors duration-500 ${isLarge ? 'md:col-span-2 aspect-[2/1]' : 'aspect-square'} flex flex-col items-center justify-between p-10 text-center`}
              >
                <div className="z-10 flex flex-col items-center">
                  <h2 className="text-3xl md:text-5xl font-bold mb-4">{software.nome_produto}</h2>
                  <p className="text-lg md:text-xl text-slate-500 max-w-lg mb-6">{software.descricao_venda}</p>
                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <Link to={`/products/${software.id}`} className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                      Saiba mais <ChevronRight size={16} />
                    </Link>
                    <span className="text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer">
                      Agendar Demo <ChevronRight size={16} />
                    </span>
                  </div>
                </div>

                {/* Abstract Visual Representation */}
                <div className={`relative ${isLarge ? 'w-64 h-64 md:w-96 md:h-96' : 'w-48 h-48'} text-slate-200 group-hover:scale-105 transition-transform duration-700 ease-out`}>
                   {getIcon(software.icone_3d)}
                </div>
                
                {/* Clickable Area */}
                <Link to={`/products/${software.id}`} className="absolute inset-0 z-0" aria-label={`Ver ${software.nome_produto}`} />
              </div>
             );
          })}

          {/* Extra "Coming Soon" or "Contact" Card */}
          <div className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-blue-600 text-white aspect-[2/1] flex flex-col items-center justify-center p-10 text-center">
             <h2 className="text-3xl md:text-5xl font-bold mb-6">Blu Ecosystem</h2>
             <p className="text-blue-100 text-xl mb-8 max-w-2xl">Uma plataforma única para conectar prefeitura, câmara e cidadãos com eficiência e transparência.</p>
             <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors">
               Falar com um Especialista
             </button>
          </div>

        </div>
      </section>

      {/* Comparison / Why Blu Section */}
      <section className="py-32 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-16">Por que escolher a Blu?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
             <div>
               <div className="text-5xl font-bold text-blue-600 mb-4">100%</div>
               <h3 className="text-xl font-bold mb-2">Em Nuvem</h3>
               <p className="text-slate-500">Acesse de qualquer lugar, sem instalações complexas.</p>
             </div>
             <div>
               <div className="text-5xl font-bold text-blue-600 mb-4">24/7</div>
               <h3 className="text-xl font-bold mb-2">Suporte</h3>
               <p className="text-slate-500">Equipe especializada pronta para atender sua prefeitura.</p>
             </div>
             <div>
               <div className="text-5xl font-bold text-blue-600 mb-4">LGPD</div>
               <h3 className="text-xl font-bold mb-2">Compliance</h3>
               <p className="text-slate-500">Segurança de dados e conformidade total com a lei.</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};
