import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Users, MapPin, ThumbsUp, Headphones } from 'lucide-react';
import { Card3D } from '../components/ui/Card3D';
import { initialSoftwares } from '../services/mockData';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 shadow-sm">
            <span className="text-blue-600 font-semibold text-sm tracking-wide uppercase">
              GovTech de Alta Performance
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-800 mb-8 tracking-tight leading-tight">
            Transformando a <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
              Gestão Pública
            </span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            Tecnologia que aproxima o cidadão, moderniza processos e traz transparência para Prefeituras e Câmaras Municipais.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/products">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] hover:-translate-y-1 transition-all flex items-center">
                Conheça Nossas Soluções
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </Link>
            <button className="px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold text-lg shadow-[6px_6px_12px_#c5c5c5,-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_#c5c5c5,-8px_-8px_16px_#ffffff] hover:-translate-y-1 transition-all">
              Falar com Especialista
            </button>
          </div>
        </div>
      </section>

      {/* Stats / Trust Section */}
      <section className="py-12 bg-white/50 backdrop-blur-sm border-y border-white/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <div className="text-slate-500 font-medium">Cidades Atendidas</div>
          </div>
          <div className="p-6 border-l border-r border-slate-200/50">
            <ThumbsUp className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
            <div className="text-slate-500 font-medium">Aprovação Popular</div>
          </div>
          <div className="p-6">
            <Headphones className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <div className="text-slate-500 font-medium">Suporte Especializado</div>
          </div>
        </div>
      </section>

      {/* Featured Products Preview */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Ecossistema Blu</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Soluções integradas desenhadas especificamente para as necessidades do setor público brasileiro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {initialSoftwares.slice(0, 3).map((software) => (
              <Card3D
                key={software.id}
                title={software.nome_produto}
                description={software.descricao_venda}
                features={software.features}
                icon={
                  software.icone_3d === 'LayoutDashboard' ? <Zap className="w-8 h-8" /> :
                  software.icone_3d === 'Landmark' ? <ShieldCheck className="w-8 h-8" /> :
                  <Users className="w-8 h-8" />
                }
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
