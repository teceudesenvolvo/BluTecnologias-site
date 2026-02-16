import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import AppCamaraImg from '../assets/HomeAppCamara.png';
import PortalServicosImg from '../assets/DashPortalServicos.png';
import PortalLegislativoImg from '../assets/PortalLegis.png';
import BluEscolarImg from '../assets/dashBluEscolar.png';

export const Home: React.FC = () => {
  return (
    <div className="bg-white font-sans text-slate-900 pt-14">
      
      {/* Hero 1: App da Câmara (Dark Theme - iPhone Pro style) */}
      <section className="relative h-[85vh] bg-gradient-to-b from-blue-50 to-white text-slate-900 flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden">
        <ScrollReveal className="z-10 text-center px-6">
          <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">App da Câmara</h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-8">Um canal direto com o cidadão.</p>
          <div className="flex items-center justify-center gap-8 text-blue-600 text-lg font-medium">
            <Link to="/products/3" className="hover:underline flex items-center gap-1">
              Saiba mais <ChevronRight size={18} />
            </Link>
            <Link to="/contact" className="hover:underline flex items-center gap-1">
              Agendar Demo <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        {/* Abstract visual for App */}
        <ScrollReveal delay={200} className="mt-12 w-[280px] md:w-[350px] h-full bg-zinc-900 rounded-t-[3rem] border-t-8 border-x-8 border-zinc-800 shadow-2xl mx-auto relative ring-1 ring-slate-900/5 overflow-hidden">
           <img src={AppCamaraImg} alt="Demonstração do App da Câmara" className="w-full h-full object-cover object-top" />
        </ScrollReveal>
      </section>

      {/* Hero 2: Portal de Serviços (Light Theme) */}
      <section className="relative h-[85vh] bg-slate-50 flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden border-t border-slate-200">
        <ScrollReveal className="z-10 text-center px-6">
          <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight text-slate-900">Portal de Serviços</h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-8">Eficiência para a gestão.</p>
          <div className="flex items-center justify-center gap-8 text-blue-600 text-lg font-medium">
            <Link to="/products/1" className="hover:underline flex items-center gap-1">
              Saiba mais <ChevronRight size={18} />
            </Link>
            <Link to="/contact" className="hover:underline flex items-center gap-1">
              Agendar Demo <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        {/* Abstract visual */}
        <ScrollReveal delay={200} className="mt-12 w-[90%] max-w-5xl h-full bg-white rounded-t-2xl shadow-2xl border border-slate-200 mx-auto relative top-10 flex flex-col overflow-hidden">
           {/* Browser window mock */}
           <div className="h-10 bg-slate-100 border-b border-slate-200 rounded-t-2xl flex items-center px-4 gap-2 flex-shrink-0">
             <div className="w-3 h-3 rounded-full bg-red-400" />
             <div className="w-3 h-3 rounded-full bg-yellow-400" />
             <div className="w-3 h-3 rounded-full bg-green-400" />
           </div>
           <img src={PortalServicosImg} alt="Demonstração do Portal de Serviços" className="w-full h-full object-cover object-top" />
        </ScrollReveal>
      </section>

      {/* Hero 3: Portal Legislativo */}
      <section className="relative h-[85vh] bg-gradient-to-b from-green-100 to-white flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden border-t border-green-100">
         <ScrollReveal className="z-10 text-center px-6">
          <div className="mb-4">
             <span className="text-orange-600 font-bold tracking-wider text-xs uppercase">Novo</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight text-slate-900">Portal do Legislativo</h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-8">Transparência total.</p>
          <div className="flex items-center justify-center gap-8 text-green-600 text-lg font-medium">
            <Link to="/products/2" className="hover:underline flex items-center gap-1">
              Saiba mais <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={200} className="mt-12 relative w-full max-w-4xl">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-orange-50 rounded-3xl blur-2xl opacity-60 transform rotate-3 scale-95"></div>
            <img src={PortalLegislativoImg} alt="Demonstração do Portal do Legislativo" className="relative w-full rounded-2xl shadow-2xl border border-slate-100" />
        </ScrollReveal>
      </section>

      {/* Hero 4: Blu Escolar */}
      <section className="relative h-[85vh] bg-gradient-to-b from-purple-100 to-white text-slate-900 flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden border-t border-purple-100">
         <ScrollReveal className="z-10 text-center px-6">
          <div className="mb-4">
             <span className="bg-purple-200 text-purple-800 font-bold tracking-wider text-xs uppercase px-3 py-1 rounded-full">Educação</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">Blu Escolar</h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-8">Gestão educacional inteligente.</p>
          <div className="flex items-center justify-center gap-8 text-purple-600 text-lg font-medium">
            <Link to="/products/4" className="hover:underline flex items-center gap-1">
              Saiba mais <ChevronRight size={18} />
            </Link>
            <Link to="/contact" className="hover:underline flex items-center gap-1">
              Agendar Demo <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={200} className="mt-12 relative w-full max-w-4xl aspect-[16/9] bg-white rounded-t-3xl shadow-2xl border-t-8 border-x-8 border-slate-200 mx-auto top-10 overflow-hidden flex flex-col">
            <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 flex-shrink-0">
               <div className="w-3 h-3 rounded-full bg-slate-300"></div>
               <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            </div>
            <img src={BluEscolarImg} alt="Demonstração do Blu Escolar" className="w-full h-full object-cover object-top" />
        </ScrollReveal>
      </section>

      {/* Grid Section for Blog/News */}
      <section className="py-6 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Card 1 */}
           <ScrollReveal className="h-full">
             <div className="bg-slate-50 h-[500px] rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] duration-500">
                <h3 className="text-4xl font-bold mb-4 z-10 text-slate-900">Blog Blu</h3>
                <p className="text-xl text-slate-500 mb-6 z-10">Fique por dentro das novidades.</p>
                <Link to="/blog" className="text-blue-600 hover:underline z-10 flex items-center gap-1 font-medium">Ler artigos <ChevronRight size={16}/></Link>
             </div>
           </ScrollReveal>
           
           {/* Card 2 */}
           <ScrollReveal delay={200} className="h-full">
             <div className="bg-gradient-to-b from-blue-100 to-white text-slate-900 h-[500px] rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] duration-500 border border-blue-50">
                <h3 className="text-4xl font-bold mb-4 z-10">Área do Cliente</h3>
                <p className="text-xl text-slate-500 mb-6 z-10">Gerencie seus produtos.</p>
                <Link to="/admin" className="text-blue-600 hover:underline z-10 flex items-center gap-1 font-medium">Acessar <ChevronRight size={16}/></Link>
             </div>
           </ScrollReveal>
        </div>
      </section>
    </div>
  );
};
