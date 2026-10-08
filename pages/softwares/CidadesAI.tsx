import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileSearch,
  Landmark,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const capabilities = [
  {
    icon: MessageCircle,
    eyebrow: 'Para o cidadão',
    title: 'Respostas mais fáceis de encontrar.',
    description:
      'Uma experiência conversacional ajuda a localizar orientações e serviços municipais sem obrigar o cidadão a conhecer a estrutura interna do órgão.',
    points: ['Linguagem simples', 'Acesso a partir de diferentes dispositivos'],
    tone: 'blue',
  },
  {
    icon: FileSearch,
    eyebrow: 'Para as equipes',
    title: 'Informação organizada para apoiar o trabalho.',
    description:
      'A equipe encontra conteúdos, procedimentos e referências da própria prefeitura em um ponto de consulta, com a fonte sempre em destaque.',
    points: ['Busca em conteúdos institucionais', 'Respostas vinculadas às fontes disponíveis'],
    tone: 'cyan',
  },
  {
    icon: ClipboardCheck,
    eyebrow: 'Para a gestão',
    title: 'Mais contexto. Decisões continuam humanas.',
    description:
      'A IA pode resumir informações e apoiar a análise. A validação, a decisão administrativa e a responsabilidade permanecem com os agentes públicos.',
    points: ['Apoio, não substituição de servidores', 'Uso responsável e supervisionado'],
    tone: 'indigo',
  },
];

const principles = [
  {
    icon: Database,
    title: 'Base institucional',
    description: 'O conhecimento municipal começa nos conteúdos e orientações que o próprio órgão disponibiliza.',
  },
  {
    icon: ShieldCheck,
    title: 'Governança desde o início',
    description: 'A implantação deve definir responsáveis, revisão de conteúdo, níveis de acesso e limites de uso.',
  },
  {
    icon: LockKeyhole,
    title: 'Privacidade e controle',
    description: 'Dados pessoais e informações restritas exigem tratamento adequado, acesso controlado e avaliação do órgão.',
  },
];

const rollout = [
  ['01', 'Mapear prioridades', 'Escolha os serviços, dúvidas recorrentes e processos que mais precisam de clareza.'],
  ['02', 'Organizar as fontes', 'Reúna conteúdos oficiais, defina responsáveis e estabeleça como eles serão revisados.'],
  ['03', 'Implantar com acompanhamento', 'Configure a experiência, oriente as equipes e acompanhe a qualidade das respostas.'],
];

export const CidadesAI: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="overflow-hidden bg-white pt-14 text-slate-950 selection:bg-cyan-100 selection:text-blue-950">
      <section className="relative isolate overflow-hidden bg-[#07172e] px-5 pb-20 pt-24 text-white sm:pb-28 sm:pt-32">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_76%_18%,rgba(0,177,225,.25),transparent_34%),radial-gradient(ellipse_at_6%_92%,rgba(37,99,235,.24),transparent_35%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-bold text-cyan-100">
              <Sparkles size={16} /> Inteligência artificial para cidades
            </span>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Uma cidade mais simples de entender e de acessar.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Cidades AI aproxima cidadãos e equipes das informações públicas com uma experiência de inteligência artificial planejada para a realidade municipal.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/contact" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-cyan-400 px-7 text-base font-black text-[#06152d] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300">
                Conversar sobre Cidades AI <ArrowRight size={18} />
              </Link>
              <a href="#como-funciona" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-base font-bold text-white transition hover:bg-white/10">
                Conhecer a proposta
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-400">Desenhado para implantação responsável, com participação e supervisão do órgão público.</p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-[#07172e]"><Bot size={24} /></div>
                  <div><p className="font-extrabold">Assistente da cidade</p><p className="text-xs text-slate-400">Informação municipal em linguagem simples</p></div>
                </div>
                <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-xs font-bold text-cyan-100">Cidades AI</span>
              </div>
              <div className="space-y-4 py-6">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500/20 p-4 text-sm leading-6 text-blue-50">
                  Como faço para solicitar um serviço da prefeitura?
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-6 text-slate-700">
                  Posso ajudar a localizar as orientações disponíveis. Qual serviço você está procurando?
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500"><FileSearch size={14} className="text-cyan-600" /> Resposta baseada em conteúdo institucional</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Iluminação pública', 'IPTU', 'Agendamento'].map((item) => <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">{item}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#08142a]/70 px-4 py-3 text-sm text-slate-400"><Search size={17} /> Pergunte sobre um serviço municipal <span className="ml-auto grid h-8 w-8 place-items-center rounded-xl bg-cyan-400 text-[#07172e]"><ChevronRight size={17} /></span></div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#102442] p-4 shadow-xl sm:flex">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><Landmark size={20} /></div>
              <div><p className="text-xs font-bold text-white">Fontes do órgão</p><p className="text-xs text-slate-400">Gestão municipal no controle</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-[#f5f8fc] px-5 py-12">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-3">
          {[
            [Building2, 'Feita para o contexto municipal'],
            [Users, 'Útil para cidadão e servidor'],
            [ShieldCheck, 'IA com supervisão humana'],
          ].map(([Icon, label]) => {
            const FeatureIcon = Icon as typeof Building2;
            return <div key={label as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><FeatureIcon size={23} className="shrink-0 text-blue-600" /><span className="font-bold text-slate-700">{label as string}</span></div>;
          })}
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-24 px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[.2em] text-blue-600">Uma nova camada de acesso</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">A tecnologia ajuda. A informação continua pública e oficial.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">Cidades AI foi pensado para tornar o conhecimento do município mais fácil de encontrar e apoiar rotinas de atendimento e gestão sem substituir os canais ou a responsabilidade institucional.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {capabilities.map(({ icon: Icon, eyebrow, title, description, points, tone }) => (
              <article key={title} className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone === 'cyan' ? 'bg-cyan-50 text-cyan-700' : tone === 'indigo' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}><Icon size={23} /></span>
                <p className="mt-7 text-xs font-black uppercase tracking-[.16em] text-slate-400">{eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight">{title}</h3>
                <p className="mt-4 min-h-28 leading-7 text-slate-600">{description}</p>
                <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  {points.map((point) => <li key={point} className="flex gap-2 text-sm font-semibold text-slate-700"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{point}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07172e] px-5 py-24 text-white sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-cyan-300">Confiança pública</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Inteligência artificial precisa de regras claras.</h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">Cada município tem seus próprios fluxos, conteúdos e exigências. A implantação começa com escopo, governança e validação institucional — não com respostas sem contexto.</p>
          </div>
          <div className="grid gap-4">
            {principles.map(({ icon: Icon, title, description }) => <article key={title} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[.05] p-6"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Icon size={22} /></span><div><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-slate-300">{description}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[.2em] text-blue-600">Implantação acompanhada</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Comece com um desafio concreto da sua cidade.</h2></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {rollout.map(([number, title, description]) => <article key={number} className="rounded-[1.75rem] bg-[#f5f8fc] p-7"><p className="text-sm font-black tracking-[.15em] text-blue-600">ETAPA {number}</p><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-br from-blue-700 to-[#06172d] px-6 py-14 text-center text-white sm:px-14 sm:py-20">
          <Landmark size={32} className="mx-auto text-cyan-200" />
          <p className="mt-5 text-sm font-black uppercase tracking-[.2em] text-cyan-200">Cidades AI para órgãos públicos</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">Vamos conversar sobre as prioridades do seu município?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">Apresente seu cenário. Nossa equipe ajuda a avaliar um caminho de implantação adequado ao órgão.</p>
          <Link to="/contact" className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 font-black text-blue-800 transition hover:bg-cyan-50">Solicitar uma apresentação <ArrowRight size={18} /></Link>
          <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-semibold text-blue-100"><span>Portal de Serviços</span><span>Portal do Legislativo</span><span>App da Câmara</span><span>Portal Escolar</span><Link to="/products" className="inline-flex items-center gap-1 text-white underline underline-offset-4">Ver todas as soluções <ChevronRight size={15} /></Link></div>
        </div>
      </section>
    </main>
  );
};
