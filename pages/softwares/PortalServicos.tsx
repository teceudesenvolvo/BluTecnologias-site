import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initialSoftwares } from '../../services/mockData';
import { 
  ArrowLeft, 
  CheckCircle2, 
  LayoutDashboard, 
  Landmark, 
  Smartphone, 
  ChevronRight, 
  Star,
  Shield,
  Zap,
  Globe
} from 'lucide-react';

export const PortalServicos: React.FC = () => {
  // ID fixo para o Portal de Serviços
  const product = initialSoftwares.find(p => p.id === '1');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-full h-full" strokeWidth={1} />;
      case 'Landmark': return <Landmark className="w-full h-full" strokeWidth={1} />;
      case 'Smartphone': return <Smartphone className="w-full h-full" strokeWidth={1} />;
      default: return <LayoutDashboard className="w-full h-full" strokeWidth={1} />;
    }
  };

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pt-20">
      <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{product.nome_produto}</h2>
          <div className="flex items-center gap-4">
            <Link to="/products" className="text-xs text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
              Visão Geral
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-all">
              Agendar Demo
            </button>
          </div>
        </div>
      </div>

      <section className="relative pt-12 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest mb-8">
            <Star className="w-3 h-3 fill-current" />
            Destaque
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 mb-6">
            {product.nome_produto}
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 max-w-3xl mx-auto leading-relaxed tracking-tight">
            {product.descricao_venda}
          </p>

          <div className="mt-20 relative mx-auto max-w-5xl">
             <div className="relative aspect-[16/9] bg-gradient-to-b from-slate-50 to-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex items-center justify-center group">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-50"></div>
               <div className="w-48 h-48 text-slate-900/10 group-hover:text-blue-600/20 transition-all duration-1000 transform group-hover:scale-110 group-hover:rotate-3">
                  {getIcon(product.icone_3d)}
               </div>
               <div className="absolute bottom-12 left-12 right-12 h-24 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg flex items-center justify-around px-12 animate-fade-in-up">
                  <div className="h-2 w-1/4 bg-slate-200 rounded-full"></div>
                  <div className="h-2 w-1/4 bg-slate-200 rounded-full"></div>
                  <div className="h-2 w-1/6 bg-blue-100 rounded-full"></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#101010] text-white py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-24 max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
              Eficiência para <br/>
              <span className="text-gray-500">serviços ao cidadão.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="col-span-1 md:col-span-4 bg-[#1a1a1a] rounded-[2rem] p-10 md:p-14 overflow-hidden relative group min-h-[500px] flex flex-col justify-between hover:bg-[#202020] transition-colors duration-500">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-4">Atendimento Digital</h3>
                <p className="text-gray-400 text-lg max-w-md">
                  Ofereça um portal intuitivo onde o cidadão pode emitir guias, solicitar certidões, protocolar documentos e consultar processos 24/7, sem precisar se deslocar até a prefeitura.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-3/4 h-3/4 bg-gradient-to-tl from-blue-600/20 to-transparent rounded-tl-full opacity-50 group-hover:opacity-70 transition-opacity" />
            </div>

            <div className="col-span-1 md:col-span-2 bg-[#1a1a1a] rounded-[2rem] p-10 flex flex-col justify-between hover:bg-[#202020] transition-colors duration-500">
              <div>
                <Zap className="w-12 h-12 text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Fluxos Inteligentes</h3>
                <p className="text-gray-400">
                  Configure processos automatizados que direcionam cada solicitação para o setor responsável, com prazos e alertas de SLA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Funcionalidades</h2>
          <div className="grid gap-4">
            {product.features.map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-lg text-slate-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8 tracking-tight">
            Modernize sua gestão.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-600/30">
              Solicitar Orçamento
            </button>
            <Link to="/products" className="px-10 py-4 text-slate-600 font-bold text-lg hover:bg-slate-50 rounded-full transition-all flex items-center">
              Ver todos os produtos <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
