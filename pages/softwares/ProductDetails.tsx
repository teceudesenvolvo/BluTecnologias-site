import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Globe,
  GraduationCap
} from 'lucide-react';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const product = initialSoftwares.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
        <h2 className="text-3xl font-bold mb-4">Produto não encontrado</h2>
        <Link to="/products" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar para Soluções
        </Link>
      </div>
    );
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-full h-full" strokeWidth={1} />;
      case 'Landmark': return <Landmark className="w-full h-full" strokeWidth={1} />;
      case 'Smartphone': return <Smartphone className="w-full h-full" strokeWidth={1} />;
      case 'GraduationCap': return <GraduationCap className="w-full h-full" strokeWidth={1} />;
      default: return <LayoutDashboard className="w-full h-full" strokeWidth={1} />;
    }
  };

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pt-20">
      {/* Apple-style Sticky Sub-nav */}
      

      {/* Hero Section */}
      <section className="relative pt-12 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest mb-8">
            <Star className="w-3 h-3 fill-current" />
            Novo Lançamento
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 mb-6">
            {product.nome_produto}
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 max-w-3xl mx-auto leading-relaxed tracking-tight">
            {product.descricao_venda}
          </p>

          {/* Hero Image / Abstract Representation */}
          <div className="mt-20 relative mx-auto max-w-5xl">
             <div className="relative aspect-[16/9] bg-gradient-to-b from-slate-50 to-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex items-center justify-center group">
               {/* Decorative background elements */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-50"></div>
               
               {/* Main Icon with animation */}
               <div className="w-48 h-48 text-slate-900/10 group-hover:text-blue-600/20 transition-all duration-1000 transform group-hover:scale-110 group-hover:rotate-3">
                  {getIcon(product.icone_3d)}
               </div>
               
               {/* Floating UI Elements (Abstract) */}
               <div className="absolute bottom-12 left-12 right-12 h-24 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg flex items-center justify-around px-12 animate-fade-in-up">
                  <div className="h-2 w-1/4 bg-slate-200 rounded-full"></div>
                  <div className="h-2 w-1/4 bg-slate-200 rounded-full"></div>
                  <div className="h-2 w-1/6 bg-blue-100 rounded-full"></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Section - "Bento" Grid Style */}
      <section className="bg-[#101010] text-white py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-24 max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
              Inteligência que <br/>
              <span className="text-gray-500">transforma a cidade.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Large Feature */}
            <div className="col-span-1 md:col-span-4 bg-[#1a1a1a] rounded-[2rem] p-10 md:p-14 overflow-hidden relative group min-h-[500px] flex flex-col justify-between hover:bg-[#202020] transition-colors duration-500">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-4">Gestão em Tempo Real</h3>
                <p className="text-gray-400 text-lg max-w-md">
                  Dashboards que atualizam instantaneamente. Tome decisões baseadas em dados vivos, não em relatórios de ontem.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-3/4 h-3/4 bg-gradient-to-tl from-blue-600/20 to-transparent rounded-tl-full opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="mt-8 flex gap-4">
                 <div className="h-32 w-full bg-[#252525] rounded-xl border border-white/5 p-4">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full mb-4 flex items-center justify-center text-green-400"><Zap size={16}/></div>
                    <div className="h-2 w-1/2 bg-white/10 rounded-full mb-2"></div>
                    <div className="h-2 w-1/3 bg-white/10 rounded-full"></div>
                 </div>
                 <div className="h-32 w-full bg-[#252525] rounded-xl border border-white/5 p-4 hidden sm:block">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full mb-4 flex items-center justify-center text-blue-400"><Globe size={16}/></div>
                    <div className="h-2 w-1/2 bg-white/10 rounded-full mb-2"></div>
                    <div className="h-2 w-1/3 bg-white/10 rounded-full"></div>
                 </div>
              </div>
            </div>

            {/* Tall Feature */}
            <div className="col-span-1 md:col-span-2 bg-[#1a1a1a] rounded-[2rem] p-10 flex flex-col justify-between hover:bg-[#202020] transition-colors duration-500">
              <div>
                <Shield className="w-12 h-12 text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Segurança Total</h3>
                <p className="text-gray-400">
                  Criptografia de ponta a ponta e conformidade nativa com a LGPD.
                </p>
              </div>
              <div className="mt-10 h-40 bg-gradient-to-t from-blue-900/10 to-transparent rounded-xl border-b border-blue-500/30"></div>
            </div>

            {/* Wide Feature */}
            <div className="col-span-1 md:col-span-3 bg-[#1a1a1a] rounded-[2rem] p-10 flex flex-col md:flex-row items-center gap-8 hover:bg-[#202020] transition-colors duration-500">
               <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3">Integração Nativa</h3>
                  <p className="text-gray-400">
                    Conecta-se perfeitamente com os sistemas legados através de APIs modernas.
                  </p>
               </div>
               <div className="flex-1 flex justify-center">
                  <div className="flex -space-x-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-16 h-16 rounded-full bg-[#252525] border-4 border-[#1a1a1a] flex items-center justify-center text-gray-600 font-bold">
                        API
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* Small Feature */}
            <div className="col-span-1 md:col-span-3 bg-blue-600 rounded-[2rem] p-10 flex flex-col justify-center items-center text-center relative overflow-hidden group">
               <div className="relative z-10">
                 <h3 className="text-3xl font-bold mb-2 text-white">Suporte 24/7</h3>
                 <p className="text-blue-100">Nossa equipe nunca dorme.</p>
               </div>
               <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Especificações Técnicas</h2>
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

      {/* Footer CTA */}
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