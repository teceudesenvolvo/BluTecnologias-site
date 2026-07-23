import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  Instagram,
  Linkedin,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';
import DashboardImage from '../assets/blu-dashboard-home.png';

const pain = [
  ['Documentos espalhados', FileText],
  ['Planilhas sem fim', Search],
  ['Retrabalho diário', Clock3],
  ['Informações perdidas', Minus],
  ['Falta de controle', ShieldCheck],
];

const benefits = [
  'Mais produtividade',
  'Mais controle',
  'Menos retrabalho',
  'Mais organização',
  'Mais tranquilidade',
  'Mais tempo para crescer',
];

const aiInsights = [
  'A Blu percebeu uma queda no fluxo de caixa.',
  'A Blu encontrou contratos próximos do vencimento.',
  'A Blu identificou clientes inadimplentes.',
];

const testimonials = [
  {
    name: 'Marina Duarte',
    company: 'Distribuidora Nordeste',
    role: 'Diretora Comercial',
    result: 'Reduziu horas de controle manual e ganhou clareza sobre contratos e recebimentos.',
    photo: 'MD',
  },
  {
    name: 'Rafael Monte',
    company: 'Gráfica Prime',
    role: 'Sócio administrador',
    result: 'Organizou documentos, prazos e propostas em uma única rotina de trabalho.',
    photo: 'RM',
  },
  {
    name: 'Clara Bezerra',
    company: 'Lavoro Serviços',
    role: 'Gestora financeira',
    result: 'Passou a acompanhar cobranças, contratos e vencimentos sem depender de planilhas.',
    photo: 'CB',
  },
];

const faqs = [
  ['A Blu é só para licitações?', 'Não. A Blu acompanha a operação completa: oportunidades, contratos, documentos, financeiro, cobranças e recebimentos.'],
  ['Preciso instalar alguma coisa?', 'Não. A Blu funciona online, no navegador, com uma experiência moderna em desktop, tablet e celular.'],
  ['O teste grátis exige cartão?', 'A proposta comercial é oferecer 7 dias gratuitos para conhecer a plataforma antes de contratar.'],
  ['Meus dados ficam seguros?', 'A Blu foi desenhada com autenticação, isolamento por empresa e controles de acesso para equipes.'],
];

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const liquidCard = 'relative overflow-hidden rounded-[2rem] border border-white/65 bg-gradient-to-br from-white/82 via-white/48 to-blue-50/28 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-white/90 after:pointer-events-none after:absolute after:-right-16 after:-top-16 after:h-36 after:w-36 after:rounded-full after:bg-blue-400/10 after:blur-2xl dark:border-white/12 dark:from-white/13 dark:via-white/7 dark:to-blue-400/8 dark:shadow-[0_20px_80px_rgba(0,0,0,0.24)]';
const liquidPanel = 'relative overflow-hidden rounded-[2.5rem] border border-white/65 bg-gradient-to-br from-white/84 via-white/54 to-sky-50/35 shadow-[0_24px_90px_rgba(15,23,42,0.09)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-white/90 after:pointer-events-none after:absolute after:-right-24 after:-top-24 after:h-60 after:w-60 after:rounded-full after:bg-blue-500/10 after:blur-3xl dark:border-white/12 dark:from-white/13 dark:via-white/7 dark:to-blue-500/10 dark:shadow-[0_24px_100px_rgba(0,0,0,0.3)]';

export const Home: React.FC = () => {
  const [dark, setDark] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(0);

  return (
    <div className={`${dark ? 'dark' : ''}`}>
      <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-950 transition-colors duration-500 dark:bg-[#05070b] dark:text-white">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute left-1/2 top-[-240px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-500/15" />
          <div className="absolute bottom-[20%] right-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <Header dark={dark} setDark={setDark} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl flex-col items-center px-5 pb-16 pt-24 text-center md:pt-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:text-blue-200">
            <Sparkles size={14} />
            Da oportunidade ao pagamento
          </div>
          <h1 className="mt-7 max-w-5xl text-balance text-5xl font-black tracking-[-0.06em] text-slate-950 md:text-7xl lg:text-8xl dark:text-white">
            Enquanto você administra sua empresa...
            <span className="block bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 bg-clip-text text-transparent">A Blu trabalha por você.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-balance text-lg leading-8 text-slate-600 md:text-xl dark:text-slate-300">
            Organize processos, documentos, contratos e informações em um único lugar utilizando Inteligência Artificial.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/admin/onboarding" className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-black text-white shadow-2xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500">
              Experimentar gratuitamente por 7 dias
              <ArrowRight className="transition group-hover:translate-x-1" size={17} />
            </Link>
            <Link to="/admin/login" className="inline-flex h-14 items-center justify-center rounded-full border border-blue-200 bg-blue-50/80 px-7 text-sm font-black text-blue-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-blue-100 dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/15">
              Entrar no sistema
            </Link>
            <Link to="/contact" className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white/70 px-7 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
              Agendar demonstração
            </Link>
          </div>
          <DeviceMockup />
        </section>

        <section id="problema" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
          <StoryTitle eyebrow="O problema" title="Sua empresa cresce. Mas a gestão fica cada vez mais complicada." />
          <div className="mt-12 grid gap-3 md:grid-cols-5">
            {pain.map(([label, Icon]) => (
              <article key={label as string} className={`${liquidCard} group p-5 transition hover:-translate-y-1`}>
                <span className="relative z-10 grid h-11 w-11 place-items-center rounded-2xl border border-white/70 bg-white/58 text-blue-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-blue-200">
                  <Icon size={19} />
                </span>
                <p className="relative z-10 mt-7 text-sm font-black text-slate-900 dark:text-white">{label as string}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
          <StoryTitle eyebrow="Transformação" title="De uma operação reativa para uma empresa organizada." />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <BeforeAfter title="Antes" muted items={['Arquivos em pastas diferentes', 'Contratos sem acompanhamento', 'Cobranças lembradas tarde demais', 'Decisões baseadas em sensação']} />
            <BeforeAfter title="Depois" items={['Tudo conectado em um único lugar', 'Prazos e contratos visíveis', 'Alertas antes do problema aparecer', 'Decisões com dados claros']} />
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
          <StoryTitle eyebrow="Por que Blu?" title="Não é sobre ter mais telas. É sobre trabalhar com mais leveza." />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item) => (
              <article key={item} className={`${liquidCard} p-6`}>
                <CheckCircle2 className="relative z-10 text-blue-600 dark:text-blue-300" />
                <h3 className="relative z-10 mt-8 text-xl font-black tracking-tight">{item}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
          <StoryTitle eyebrow="Como funciona" title="Três passos para sua empresa respirar melhor." />
          <div className="mt-12 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <Step number="1" title="Criar conta" description="Entre na Blu e comece o teste gratuito." />
            <ArrowRight className="mx-auto hidden text-slate-300 md:block" />
            <Step number="2" title="Organizar empresa" description="Centralize clientes, contratos, documentos e cobranças." />
            <ArrowRight className="mx-auto hidden text-slate-300 md:block" />
            <Step number="3" title="Crescer" description="Use dados, alertas e IA para vender com mais controle." />
          </div>
        </section>

        <section id="ia" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
          <div className={`${liquidPanel} grid gap-8 p-6 md:p-10 lg:grid-cols-[0.85fr_1.15fr]`}>
            <div className="relative z-10">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/60 text-blue-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-blue-200"><Brain size={22} /></div>
              <p className="mt-8 text-xs font-black uppercase tracking-[.22em] text-blue-600 dark:text-blue-200">IA Blu</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl dark:text-white">A IA ajuda. Você decide.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300">A Blu observa a operação em silêncio e chama sua atenção quando algo merece cuidado.</p>
            </div>
            <div className="relative z-10 space-y-3">
              {aiInsights.map((item, index) => (
                <article key={item} className="rounded-3xl border border-white/65 bg-white/48 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-200">Alerta {index + 1}</p>
                  <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
          <StoryTitle eyebrow="Depoimentos" title="Empresas que trocaram confusão por clareza." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className={`${liquidCard} p-6`}>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-black text-white">{item.photo}</span>
                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.role} · {item.company}</p>
                  </div>
                </div>
                <p className="relative z-10 mt-8 text-lg font-bold leading-8 text-slate-700 dark:text-slate-200">“{item.result}”</p>
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-4xl px-5 py-24">
          <StoryTitle eyebrow="Perguntas frequentes" title="O que normalmente perguntam antes de começar." center />
          <div className="mt-10 space-y-3">
            {faqs.map(([question, answer], index) => (
              <article key={question} className={`${liquidCard} rounded-3xl`}>
                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="relative z-10 flex w-full items-center justify-between gap-4 p-5 text-left font-black">
                  {question}
                  <ChevronDown className={`transition ${openFaq === index ? 'rotate-180' : ''}`} size={18} />
                </button>
                {openFaq === index && <p className="relative z-10 px-5 pb-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{answer}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-6xl px-5 py-24 text-center">
          <div className={`${liquidPanel} rounded-[3rem] px-6 py-16`}>
            <p className="relative z-10 text-xs font-black uppercase tracking-[.22em] text-blue-600 dark:text-blue-300">Comece agora</p>
            <h2 className="relative z-10 mx-auto mt-5 max-w-4xl text-balance text-4xl font-black tracking-[-0.05em] md:text-6xl">Sua empresa merece trabalhar com inteligência.</h2>
            <p className="relative z-10 mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-300">Experimente gratuitamente e veja como é administrar processos, contratos, documentos e financeiro com a Blu ao seu lado.</p>
            <Link to="/admin/onboarding" className="relative z-10 mt-9 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-black text-white shadow-2xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500">
              Experimentar gratuitamente
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        <LandingFooter />
      </main>
    </div>
  );
};

const Header = ({ dark, setDark, menuOpen, setMenuOpen }: { dark: boolean; setDark: (value: boolean) => void; menuOpen: boolean; setMenuOpen: (value: boolean) => void }) => (
  <header className="fixed inset-x-0 top-0 z-50 px-4 py-4">
    <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-3xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65">
      <Link to="/" className="flex items-center gap-3">
        <img src={Logo} alt="Blu" className="h-10 w-10 rounded-2xl object-contain" />
        <span className="text-sm font-black tracking-tight">Blu</span>
      </Link>
      <div className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex dark:text-slate-300">
        <button onClick={() => scrollToSection('problema')} className="hover:text-blue-600">Produto</button>
        <button onClick={() => scrollToSection('ia')} className="hover:text-blue-600">IA</button>
        <Link to="/blog" className="hover:text-blue-600">Conteúdos</Link>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <button onClick={() => setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200" aria-label="Alternar tema">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link to="/admin/login" className="rounded-full border border-slate-200 bg-white/60 px-5 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">Entrar no sistema</Link>
        <Link to="/admin/onboarding" className="rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-600 dark:bg-white dark:text-slate-950">Teste grátis</Link>
      </div>
      <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/70 md:hidden dark:border-white/10 dark:bg-white/10">
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
    </nav>
    {menuOpen && (
      <div className="mx-auto mt-2 max-w-7xl rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-slate-950/90">
        <div className="grid gap-2 text-sm font-bold">
          <Link to="/admin/onboarding" className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-white">Experimentar gratuitamente</Link>
          <Link to="/admin/login" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-blue-700 dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-200">Entrar no sistema</Link>
          <Link to="/contact" className="rounded-2xl border border-white/70 bg-white/58 px-4 py-3 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">Agendar demonstração</Link>
        </div>
      </div>
    )}
  </header>
);

const DeviceMockup = () => (
  <div className="relative mt-20 w-full max-w-6xl">
    <div className="absolute inset-x-10 top-10 h-48 rounded-full bg-blue-500/20 blur-3xl" />
    <div className={`${liquidPanel} relative mx-auto rounded-[2.2rem] p-3`}>
      <div className="relative z-10 overflow-hidden rounded-[1.7rem] border border-white/70 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 dark:border-white/10">
        <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-white/8 px-4">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-300" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <img src={DashboardImage} alt="Dashboard executivo da Blu aberto no sistema" className="h-[260px] w-full object-cover object-left-top md:h-[520px]" />
      </div>
    </div>
    <div className="relative z-10 mx-auto mt-5 grid max-w-4xl gap-3 md:grid-cols-3">
      <MiniSignal title="Recebimentos" value="R$ 47 mil" description="Valores a receber visíveis no painel" />
      <MiniSignal title="Contratos" value="3 vencendo" description="Alertas antes dos prazos críticos" />
      <MiniSignal title="Operação" value="1 lugar" description="Oportunidades, documentos e financeiro" />
    </div>
  </div>
);

const MiniSignal = ({ title, value, description }: { title: string; value: string; description: string }) => (
  <article className={`${liquidCard} p-4 text-left`}>
    <BriefcaseBusiness className="relative z-10 text-blue-600" size={18} />
    <p className="relative z-10 mt-5 text-[10px] font-black uppercase tracking-[.18em] text-blue-600 dark:text-blue-200">{title}</p>
    <p className="relative z-10 mt-2 text-xl font-black">{value}</p>
    <p className="relative z-10 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{description}</p>
  </article>
);

const StoryTitle = ({ eyebrow, title, center = false }: { eyebrow: string; title: string; center?: boolean }) => (
  <div className={center ? 'text-center' : ''}>
    <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600 dark:text-blue-300">{eyebrow}</p>
    <h2 className={`mt-4 max-w-4xl text-balance text-4xl font-black tracking-[-0.05em] md:text-6xl ${center ? 'mx-auto' : ''}`}>{title}</h2>
  </div>
);

const BeforeAfter = ({ title, items, muted = false }: { title: string; items: string[]; muted?: boolean }) => (
  <article className={`relative overflow-hidden rounded-[2.5rem] border p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-white/90 after:pointer-events-none after:absolute after:-right-20 after:-top-20 after:h-48 after:w-48 after:rounded-full after:blur-3xl ${muted ? 'border-white/65 bg-gradient-to-br from-white/78 via-white/44 to-slate-50/30 text-slate-900 after:bg-slate-300/12 dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-white/3 dark:text-white' : 'border-blue-200/80 bg-gradient-to-br from-white/88 via-sky-50/68 to-cyan-100/48 text-slate-950 shadow-blue-500/10 after:bg-blue-400/14 dark:border-blue-300/20 dark:from-blue-500/18 dark:via-white/8 dark:to-cyan-400/12 dark:text-white'}`}>
    <p className={`relative z-10 text-xs font-black uppercase tracking-[.18em] ${muted ? 'text-slate-400 dark:text-slate-300' : 'text-blue-600 dark:text-blue-200'}`}>{title}</p>
    <div className="relative z-10 mt-8 space-y-3">
      {items.map((item) => <p key={item} className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={16} />{item}</p>)}
    </div>
  </article>
);

const Step = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <article className={`${liquidCard} p-6 text-center`}>
    <span className="relative z-10 mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-xl shadow-blue-600/20">{number}</span>
    <h3 className="relative z-10 mt-7 text-2xl font-black">{title}</h3>
    <p className="relative z-10 mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
  </article>
);

const LandingFooter = () => (
  <footer className="relative z-10 border-t border-slate-200/70 bg-white/55 px-5 py-12 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
    <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
        <img src={Logo} alt="Blu" className="h-12 w-12 rounded-2xl object-contain" />
        <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-300">A plataforma completa para empresas que querem vender, executar, cobrar e crescer com mais inteligência.</p>
      </div>
      <FooterGroup title="Institucional" links={['Sobre', 'Contato', 'LGPD']} />
      <FooterGroup title="Legal" links={['Política de Privacidade', 'Termos de Uso']} />
      <div>
        <h4 className="text-sm font-black">Social</h4>
        <div className="mt-5 flex gap-2">
          {[Instagram, Linkedin, MessageCircle].map((Icon, index) => (
            <a key={index} href="#" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/70 text-slate-600 transition hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              <Icon size={17} />
            </a>
          ))}
        </div>
      </div>
    </div>
    <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-3 border-t border-slate-200/70 pt-6 text-xs text-slate-400 md:flex-row dark:border-white/10">
      <p>© {new Date().getFullYear()} Blu. Todos os direitos reservados.</p>
      <p>Construída para empresas que vendem ao governo.</p>
    </div>
  </footer>
);

const FooterGroup = ({ title, links }: { title: string; links: string[] }) => (
  <div>
    <h4 className="text-sm font-black">{title}</h4>
    <div className="mt-5 grid gap-3 text-sm text-slate-500 dark:text-slate-300">
      {links.map((item) => <a key={item} href="#" className="transition hover:text-blue-600">{item}</a>)}
    </div>
  </div>
);
