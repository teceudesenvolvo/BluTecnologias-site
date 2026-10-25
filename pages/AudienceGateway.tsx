import React from 'react';
import { ArrowRight, ArrowUpRight, Building2, Landmark, ShieldCheck, Sparkles, X } from 'lucide-react';
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

export const AudienceGateway: React.FC = () => {
  const [showWelcome, setShowWelcome] = React.useState(false);

  React.useEffect(() => {
    try {
      const hasSeenWelcome = window.localStorage.getItem('blu-welcome-seen');
      if (!hasSeenWelcome) {
        setShowWelcome(true);
        window.localStorage.setItem('blu-welcome-seen', 'true');
      }
    } catch {
      // Keep the gateway usable when browser storage is unavailable.
    }
  }, []);

  return (
  <main className="relative min-h-screen overflow-hidden bg-[#030712] px-4 py-5 text-white sm:px-6">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(14,165,233,.22),transparent_38%)]" />
    <header className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between py-3">
      <Link to="/" aria-label="Blu" className="flex items-center">
        <img src={Logo} alt="Blu" className="h-11 w-11 rounded-2xl object-contain" />
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

    {showWelcome && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowWelcome(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="relative my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#102844] via-[#0b1b30] to-[#07111f] p-7 text-white shadow-2xl shadow-black/50 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <button type="button" onClick={() => setShowWelcome(false)} aria-label="Fechar apresentação" className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={18}/></button>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-xs font-black uppercase tracking-[.14em] text-sky-200"><Sparkles size={14}/>Bem-vindo à Blu</span>
          <h2 id="welcome-title" className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Conheça a Blu Tecnologias</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">Tecnologia para conectar operações, simplificar a gestão e aproximar pessoas. Escolha sua jornada para conhecer nossas soluções empresariais e públicas.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/empresas" onClick={() => setShowWelcome(false)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-[#061321] transition hover:bg-sky-300">Conheça a Blu <ArrowRight size={16}/></Link>
            <button type="button" onClick={() => setShowWelcome(false)} className="min-h-12 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5">Continuar explorando</button>
          </div>
        </div>
      </section>
    </div>}
  </main>
  );
};
