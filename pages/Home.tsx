import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';

export const Home: React.FC = () => {
  return (
    <div className="bg-white font-sans text-slate-900 pt-14">
      
      {/* Hero 1: App da Câmara (Dark Theme - iPhone Pro style) */}
      <section className="relative h-[85vh] bg-gradient-to-b from-blue-50 to-white text-slate-900 flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden">
        <ScrollReveal className="z-10 text-center px-6">
          <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">App da Câmara</h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-8">Cidadania na palma da mão.</p>
          <div className="flex items-center justify-center gap-8 text-blue-600 text-lg font-medium">
            <Link to="/products/3" className="hover:underline flex items-center gap-1">
              Saiba mais <ChevronRight size={18} />
            </Link>
            <Link to="/products/3" className="hover:underline flex items-center gap-1">
              Baixar <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        {/* Abstract visual for App */}
        <ScrollReveal delay={200} className="mt-12 w-[280px] md:w-[350px] h-full bg-zinc-900 rounded-t-[3rem] border-t-8 border-x-8 border-zinc-800 shadow-2xl mx-auto relative ring-1 ring-slate-900/5">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-black rounded-b-2xl" />
           <div className="w-full h-full flex flex-col items-center pt-20 px-4 gap-4">
              <div className="w-full h-32 bg-zinc-800 rounded-2xl animate-pulse opacity-50"></div>
              <div className="w-full h-20 bg-zinc-800 rounded-2xl animate-pulse opacity-30"></div>
              <div className="w-full h-20 bg-zinc-800 rounded-2xl animate-pulse opacity-30"></div>
           </div>
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
            <Link to="/products/1" className="hover:underline flex items-center gap-1">
              Agendar Demo <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        {/* Abstract visual */}
        <ScrollReveal delay={200} className="mt-12 w-[90%] max-w-5xl h-full bg-white rounded-t-2xl shadow-2xl border border-slate-200 mx-auto relative top-10 flex flex-col">
           {/* Browser window mock */}
           <div className="h-10 bg-slate-100 border-b border-slate-200 rounded-t-2xl flex items-center px-4 gap-2">
             <div className="w-3 h-3 rounded-full bg-red-400" />
             <div className="w-3 h-3 rounded-full bg-yellow-400" />
             <div className="w-3 h-3 rounded-full bg-green-400" />
           </div>
           <div className="flex-1 bg-slate-50 p-8 grid grid-cols-3 gap-4">
              <div className="col-span-1 h-40 bg-white rounded-xl shadow-sm"></div>
              <div className="col-span-1 h-40 bg-white rounded-xl shadow-sm"></div>
              <div className="col-span-1 h-40 bg-white rounded-xl shadow-sm"></div>
              <div className="col-span-2 h-64 bg-white rounded-xl shadow-sm"></div>
              <div className="col-span-1 h-64 bg-white rounded-xl shadow-sm"></div>
           </div>
        </ScrollReveal>
      </section>

      {/* Hero 3: Portal Legislativo */}
      <section className="relative h-[85vh] bg-white flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden border-t border-slate-200">
         <ScrollReveal className="z-10 text-center px-6">
          <div className="mb-4">
             <span className="text-orange-600 font-bold tracking-wider text-xs uppercase">Novo</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight text-slate-900">Portal do Legislativo</h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-8">Transparência total.</p>
          <div className="flex items-center justify-center gap-8 text-blue-600 text-lg font-medium">
            <Link to="/products/2" className="hover:underline flex items-center gap-1">
              Saiba mais <ChevronRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={200} className="mt-12 relative w-full max-w-3xl aspect-video">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-orange-50 rounded-3xl blur-2xl opacity-60 transform rotate-3 scale-95"></div>
            <div className="absolute inset-0 bg-white rounded-3xl border border-slate-100 shadow-xl flex items-center justify-center">
                <span className="text-slate-300 font-bold text-4xl">Ao Vivo</span>
            </div>
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
             <div className="bg-black text-white h-[500px] rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] duration-500">
                <h3 className="text-4xl font-bold mb-4 z-10">Área do Cliente</h3>
                <p className="text-xl text-slate-400 mb-6 z-10">Gerencie seus produtos.</p>
                <Link to="/admin" className="text-blue-400 hover:underline z-10 flex items-center gap-1 font-medium">Acessar <ChevronRight size={16}/></Link>
             </div>
           </ScrollReveal>
        </div>
      </section>
    </div>
  );
};
