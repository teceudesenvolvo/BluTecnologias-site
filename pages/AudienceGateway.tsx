import React from 'react';
import { ArrowUpRight, Building2, Landmark, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

const audienceCards = [
  {
    eyebrow: 'Gestão empresarial',
    title: 'Para empresas',
    description: 'ERP, vendas, serviços, financeiro, e-commerce, PDV, estoque e contabilidade conectados em uma única operação.',
    to: '/empresas',
    action: 'Conhecer a Blu para empresas',
    icon: Building2,
    tone: 'from-[#07162f] via-[#082d58] to-[#0877ff]',
    glow: 'bg-cyan-300/25',
    bullets: ['Comércio e serviços', 'Teste grátis por 7 dias', 'Implantação guiada'],
  },
  {
    eyebrow: 'Transformação pública',
    title: 'Para órgãos públicos',
    description: 'Portais, aplicativos, educação, legislativo e governança digital para aproximar gestão e cidadão.',
    to: '/products',
    action: 'Ver soluções GovTech',
    icon: Landmark,
    tone: 'from-[#061b21] via-[#063f4c] to-[#08a5c2]',
    glow: 'bg-blue-300/25',
    bullets: ['Prefeituras e câmaras', 'Soluções modulares', 'Atendimento especializado'],
  },
] as const;

export const AudienceGateway: React.FC = () => (
  <main className="relative min-h-screen overflow-hidden bg-[#030712] px-4 py-5 text-white sm:px-6">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(14,165,233,.22),transparent_38%)]" />
    <header className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between py-3">
      <Link to="/" className="flex items-center gap-3">
        <img src={Logo} alt="Blu" className="h-11 w-11 rounded-2xl object-contain" />
        <div><p className="font-black tracking-tight">Blu Tecnologias</p><p className="text-[10px] font-bold uppercase tracking-[.22em] text-slate-400">Tecnologia que conecta</p></div>
      </Link>
      <Link to="/admin/login" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black backdrop-blur-xl transition hover:bg-white/10">Entrar</Link>
    </header>

    <section className="relative z-10 mx-auto max-w-[1500px] pb-8 pt-12 text-center md:pt-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-cyan-200"><Sparkles size={14}/>Um ecossistema. Duas jornadas.</span>
      <h1 className="mx-auto mt-6 max-w-5xl text-balance text-4xl font-black tracking-[-.055em] sm:text-6xl lg:text-7xl">Como a Blu pode transformar a sua operação?</h1>
      <p className="mx-auto mt-5 max-w-2xl text-balance text-sm leading-7 text-slate-300 sm:text-base">Escolha seu perfil para acessar soluções, conteúdo e uma jornada comercial construída para a sua realidade.</p>
    </section>

    <section className="relative z-10 mx-auto grid max-w-[1500px] gap-4 pb-10 lg:grid-cols-2">
      {audienceCards.map(({ eyebrow, title, description, to, action, icon: Icon, tone, glow, bullets }) => (
        <Link key={to} to={to} className={`group relative min-h-[470px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br ${tone} p-7 shadow-2xl transition duration-500 hover:-translate-y-1 hover:border-white/25 sm:p-10`}>
          <div className={`absolute -right-20 -top-20 h-72 w-72 rounded-full ${glow} blur-3xl transition duration-700 group-hover:scale-125`} />
          <div className="relative flex h-full flex-col">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-xl backdrop-blur-xl"><Icon size={25}/></span>
            <p className="mt-12 text-xs font-black uppercase tracking-[.22em] text-cyan-100">{eyebrow}</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-6xl">{title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75">{description}</p>
            <div className="mt-8 flex flex-wrap gap-2">{bullets.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold"><ShieldCheck size={14}/>{item}</span>)}</div>
            <span className="mt-auto inline-flex items-center gap-2 pt-10 text-sm font-black">{action}<ArrowUpRight className="transition group-hover:translate-x-1 group-hover:-translate-y-1" size={18}/></span>
          </div>
        </Link>
      ))}
    </section>
  </main>
);
