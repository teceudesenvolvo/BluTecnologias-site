import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  GraduationCap,
  MapPin,
  ScanLine,
  ScanFace,
  Users,
} from 'lucide-react';
import { ScrollReveal } from '../../components/ScrollReveal';
import PortalEscolarDashboard from '../../assets/dashBluEscolar.png';

const modules = [
  {
    icon: Calendar,
    title: 'Matrícula e rematrícula online',
    description: 'Receba inscrições sem filas e acompanhe cada solicitação em um fluxo organizado.',
  },
  {
    icon: Clock,
    title: 'Análise e acompanhamento',
    description: 'Visualize matrículas pendentes, aprovadas e em análise para orientar as equipes.',
  },
  {
    icon: BarChart3,
    title: 'Painel da rede municipal',
    description: 'Acompanhe vagas ocupadas e disponíveis, taxa de ocupação e indicadores da rede.',
  },
  {
    icon: BookOpen,
    title: 'Diário de classe digital',
    description: 'Apoie o registro das atividades escolares e reduza a dependência de formulários em papel.',
  },
  {
    icon: CheckCircle2,
    title: 'Frequência escolar',
    description: 'Registre a presença dos alunos e mantenha o acompanhamento integrado à rotina escolar.',
  },
  {
    icon: ScanFace,
    title: 'Reconhecimento facial',
    description: 'Automatize o registro de entrada e saída dos estudantes por reconhecimento facial, conforme a política definida pelo município.',
  },
  {
    icon: DoorOpen,
    title: 'Integração com catracas',
    description: 'Conecte o controle de acesso escolar a catracas compatíveis e associe os registros ao acompanhamento de frequência.',
  },
  {
    icon: Bus,
    title: 'Transporte escolar',
    description: 'Centralize informações de rotas e atendimento do transporte escolar municipal.',
  },
  {
    icon: MapPin,
    title: 'Distribuição de vagas',
    description: 'Considere a localização das escolas e as informações de demanda no planejamento da rede.',
  },
  {
    icon: ScanLine,
    title: 'Documentos da matrícula',
    description: 'Receba e consulte os documentos enviados junto às solicitações de matrícula.',
  },
  {
    icon: Bell,
    title: 'Avisos e notificações',
    description: 'Mantenha famílias e equipes informadas sobre etapas, prazos e atualizações.',
  },
];

const audiences = [
  ['Secretaria de Educação', 'Visão consolidada da rede para planejar vagas, acompanhar solicitações e apoiar decisões.'],
  ['Gestão escolar', 'Acompanhamento das matrículas e organização das rotinas da unidade.'],
  ['Professores e equipes', 'Ferramentas digitais para registros escolares e comunicação do dia a dia.'],
  ['Famílias', 'Acesso online às etapas de matrícula e às informações disponibilizadas pela rede.'],
];

export const BluEscolar: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="overflow-hidden bg-white pt-14 text-slate-950 selection:bg-indigo-100 selection:text-indigo-950">
      <section className="relative isolate overflow-hidden bg-[#111342] px-5 pb-20 pt-24 text-white sm:pb-28 sm:pt-32">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,rgba(129,140,248,.35),transparent_35%),radial-gradient(ellipse_at_4%_95%,rgba(56,189,248,.15),transparent_34%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.88fr_1.12fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/20 bg-white/10 px-4 py-2 text-sm font-bold text-indigo-100"><GraduationCap size={17} /> Educação pública conectada</span>
            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-7xl">Portal Escolar</h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-indigo-100 sm:text-2xl">Matrículas, rotina escolar e indicadores da rede municipal em uma experiência digital integrada.</p>
            <p className="mt-5 max-w-xl leading-7 text-indigo-100/75">Aproxime Secretaria de Educação, escolas, equipes e famílias, com informações organizadas para acompanhar cada etapa.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/contact" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 font-black text-indigo-950 shadow-lg transition hover:bg-indigo-50">Solicitar demonstração <ArrowRight size={18} /></Link>
              <a href="#modulos" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 font-bold text-white transition hover:bg-white/10">Ver módulos</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-sm font-bold text-indigo-100">
              {['Matrícula online', 'Frequência facial', 'Integração com catracas'].map((item) => <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-2">{item}</span>)}
            </div>
          </div>

          <ScrollReveal delay={150} className="relative">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/20 bg-white p-2 shadow-2xl shadow-indigo-950/40 sm:rounded-[2rem] sm:p-3">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 pb-3 pt-1 sm:px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-semibold text-slate-500">Painel da Secretaria de Educação</span>
              </div>
              <img src={PortalEscolarDashboard} alt="Painel do Portal Escolar com indicadores de vagas e matrículas da rede municipal" className="block h-auto w-full rounded-b-xl object-cover object-top" />
            </div>
            <div className="mt-3 text-center text-xs font-medium text-indigo-100/70">Exemplo do painel de acompanhamento da rede escolar.</div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-[#f7f8ff] px-5 py-11">
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-3">
          {[
            [Calendar, 'Inscrições e matrículas'],
            [BarChart3, 'Indicadores da rede'],
            [ScanFace, 'Frequência com reconhecimento facial'],
          ].map(([Icon, label]) => {
            const ItemIcon = Icon as typeof Calendar;
            return <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-5"><ItemIcon className="shrink-0 text-indigo-600" size={22} /><span className="font-bold text-slate-700">{label as string}</span></div>;
          })}
        </div>
      </section>

      <section id="modulos" className="scroll-mt-24 px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[.2em] text-indigo-600">Uma visão conectada da educação</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Da matrícula aos indicadores da rede.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">O Portal Escolar organiza etapas e informações que fazem parte da rotina da educação municipal, com módulos definidos conforme as necessidades da rede.</p>
          </div>
          <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
            <strong>Integração sujeita à compatibilidade:</strong> a conexão com catracas depende dos equipamentos, protocolos e avaliação técnica de cada escola. A implantação deve seguir as políticas de privacidade e os controles definidos pelo município para dados biométricos.
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, description }, index) => (
              <ScrollReveal key={title} delay={index * 35} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><Icon size={23} /></span>
                <h3 className="mt-6 text-xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{description}</p>
              </ScrollReveal>
            ))}
          </div>
          <p className="mt-7 text-center text-sm text-slate-500">Os módulos e fluxos podem variar conforme a implantação e o escopo contratado.</p>
        </div>
      </section>

      <section className="bg-[#f7f8ff] px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[.2em] text-indigo-600">Para toda a comunidade escolar</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Cada equipe acompanha o que precisa.</h2></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {audiences.map(([title, description]) => <article key={title} className="flex gap-4 rounded-2xl border border-indigo-100 bg-white p-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Users size={21} /></span><div><h3 className="font-black">{title}</h3><p className="mt-2 leading-7 text-slate-600">{description}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-indigo-600">Como funciona</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Mais clareza em cada etapa do ano letivo.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">A rede acompanha a demanda, organiza o atendimento e consulta indicadores em um ambiente preparado para a gestão da educação pública.</p>
          </div>
          <div className="space-y-4">
            {[
              ['01', 'A família envia a solicitação', 'O processo de matrícula pode começar pelos canais digitais definidos pela Secretaria.'],
              ['02', 'A escola acompanha e analisa', 'As equipes consultam o status e dão andamento às solicitações recebidas.'],
              ['03', 'A Secretaria visualiza a rede', 'Indicadores de vagas e ocupação ajudam no acompanhamento e no planejamento.'],
            ].map(([number, title, description]) => <article key={number} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-black text-white">{number}</span><div><h3 className="font-black">{title}</h3><p className="mt-2 leading-7 text-slate-600">{description}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-br from-indigo-700 to-[#111342] px-6 py-14 text-center text-white sm:px-14 sm:py-20">
          <GraduationCap size={34} className="mx-auto text-indigo-200" />
          <p className="mt-5 text-sm font-black uppercase tracking-[.2em] text-indigo-200">Portal Escolar</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">Sua rede municipal pronta para uma gestão mais conectada?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-indigo-100">Converse com a Blu sobre os desafios da Secretaria de Educação e conheça uma proposta adequada à realidade do seu município.</p>
          <Link to="/contact" className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 font-black text-indigo-900 transition hover:bg-indigo-50">Agendar apresentação <ArrowRight size={18} /></Link>
          <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-indigo-100"><Link to="/products/1" className="hover:text-white">Portal de Serviços</Link><Link to="/products/2" className="hover:text-white">Portal do Legislativo</Link><Link to="/products/3" className="hover:text-white">App da Câmara</Link><Link to="/products/cidades-ai" className="hover:text-white">Cidades AI</Link><Link to="/products" className="inline-flex items-center gap-1 text-white underline underline-offset-4">Todas as soluções <ArrowRight size={14} /></Link></div>
        </div>
      </section>
    </main>
  );
};
