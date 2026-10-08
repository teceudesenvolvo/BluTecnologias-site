import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileSearch,
  Landmark,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const capabilities = [
  {
    icon: MessageCircle,
    eyebrow: 'Atendimento e serviços',
    title: 'Canais digitais conectados às equipes.',
    description:
      'Organize solicitações, protocolos, ouvidoria e serviços em fluxos digitais que conectam o cidadão à secretaria responsável.',
    points: ['Portal de serviços municipal', 'Acompanhamento de solicitações'],
    tone: 'blue',
  },
  {
    icon: FileSearch,
    eyebrow: 'Operação das secretarias',
    title: 'Rotinas administrativas em módulos.',
    description:
      'Ative recursos conforme as prioridades de cada área e mantenha documentos, contratos, bens, estoques e solicitações organizados.',
    points: ['Módulos por secretaria', 'Equipes e acessos definidos por função'],
    tone: 'cyan',
  },
  {
    icon: ClipboardCheck,
    eyebrow: 'Para a prefeitura',
    title: 'Visão integrada, implantação gradual.',
    description:
      'A prefeitura pode começar pelas áreas prioritárias e ampliar o ERP ao longo do tempo, preservando governança e responsabilidade institucional.',
    points: ['Evolução por etapas', 'Gestão e acompanhamento centralizados'],
    tone: 'indigo',
  },
];

const secretariatModules = [
  { name: 'Administração', description: 'Protocolo e processos, GED, gestão de usuários, recepção e controle interno/compliance.', modules: ['Protocolo e Processos', 'GED', 'Recepção', 'Usuários', 'Controle Interno'] },
  { name: 'Obras e Serviços Urbanos', description: 'Organize a execução de contratos, ordens de serviço, manutenção e acompanhamento de equipes.', modules: ['Fiscalização de Contratos', 'Manutenção Patrimonial', 'Documentos e ocorrências'] },
  { name: 'Patrimônio e Almoxarifado', description: 'Controle bens públicos, inventários, depósitos, requisições e movimentações de materiais.', modules: ['Patrimônio', 'Almoxarifado', 'Inventários'] },
  { name: 'Transportes e Logística', description: 'Acompanhe veículos e motoristas, abastecimentos, documentos, custos e manutenções.', modules: ['Gestão de Frotas', 'Manutenção', 'Custos e documentos'] },
  { name: 'Atendimento ao Cidadão', description: 'Integre canais e solicitações para que cada demanda chegue ao setor correto e possa ser acompanhada.', modules: ['Balcão do Cidadão', 'Ouvidoria', 'e-SIC', 'Mensagens'] },
  { name: 'Educação', description: 'Conecte a operação educacional municipal aos serviços digitais e à gestão da prefeitura.', modules: ['Portal Escolar', 'Matrícula e vida escolar', 'Diário e frequência'] },
  { name: 'Desenvolvimento Econômico', description: 'Organize orientações, solicitações e o relacionamento com empreendedores e empresas contratadas.', modules: ['Microempreendedor', 'Portal de Fornecedores', 'Solicitações digitais'] },
  { name: 'Fazenda e Finanças', description: 'Estruture a arrecadação e a execução financeira municipal com acompanhamento das rotinas e indicadores da secretaria.', modules: ['Receitas e tributos', 'Orçamento e execução', 'Prestação de contas'] },
  { name: 'Saúde', description: 'Organize os serviços e fluxos de atendimento da rede municipal, com acesso adequado aos perfis autorizados.', modules: ['Unidades e serviços', 'Agendamentos e encaminhamentos', 'Gestão de insumos'] },
  { name: 'Assistência Social', description: 'Apoie o acompanhamento de atendimentos e programas sociais com fluxos integrados entre equipes.', modules: ['Atendimentos', 'Programas e benefícios', 'Acompanhamento de famílias'] },
  { name: 'Obras e Infraestrutura', description: 'Acompanhe demandas urbanas, execução de serviços e contratos de obras em uma visão administrativa.', modules: ['Demandas e ordens de serviço', 'Contratos e medições', 'Manutenção'] },
  { name: 'Meio Ambiente e Cultura', description: 'Configure serviços, solicitações e projetos conforme as políticas públicas e processos locais.', modules: ['Licenças e solicitações', 'Projetos e eventos', 'Atendimento digital'] },
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
              <Sparkles size={16} /> ERP modular para gestão municipal
            </span>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Prefeitura e secretarias, conectadas em um só ERP.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Uma plataforma para organizar serviços e rotinas da prefeitura. Cada secretaria pode adotar os módulos de que precisa, com espaço para ampliar a operação conforme as prioridades do município.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/contact" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-cyan-400 px-7 text-base font-black text-[#06152d] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300">
                Conversar sobre Cidades AI <ArrowRight size={18} />
              </Link>
              <a href="#como-funciona" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-base font-bold text-white transition hover:bg-white/10">
                Explorar os módulos
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-400">Implantação modular, com governança e configuração acompanhadas pela prefeitura.</p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-[#07172e]"><Landmark size={24} /></div>
                  <div><p className="font-extrabold">Painel da Prefeitura</p><p className="text-xs text-slate-400">Visão de módulos e secretarias</p></div>
                </div>
                <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-xs font-bold text-cyan-100">Cidades AI</span>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-2">
                {secretariatModules.slice(0, 4).map((item) => <div key={item.name} className="rounded-2xl border border-white/10 bg-white/[.05] p-4"><div className="flex items-center gap-2 text-sm font-bold text-white"><Building2 size={16} className="text-cyan-300" />{item.name}</div><p className="mt-2 text-xs leading-5 text-slate-400">{item.modules.slice(0, 3).join(' · ')}</p></div>)}
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#08142a]/70 px-4 py-3 text-sm text-slate-300"><Users size={17} className="text-cyan-300" />Módulos e acessos organizados por área<span className="ml-auto grid h-8 w-8 place-items-center rounded-xl bg-cyan-400 text-[#07172e]"><ChevronRight size={17} /></span></div>
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
            [ShieldCheck, 'Acessos e módulos governados pela prefeitura'],
          ].map(([Icon, label]) => {
            const FeatureIcon = Icon as typeof Building2;
            return <div key={label as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><FeatureIcon size={23} className="shrink-0 text-blue-600" /><span className="font-bold text-slate-700">{label as string}</span></div>;
          })}
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-24 px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[.2em] text-blue-600">Gestão pública conectada</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Um ERP municipal que acompanha a estrutura da cidade.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">Cada secretaria trabalha com seus fluxos e responsabilidades. Cidades AI permite estruturar a plataforma em módulos por área, compartilhando uma base institucional e uma experiência integrada para cidadãos e servidores.</p>
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

      <section id="modulos" className="scroll-mt-24 bg-[#f5f8fc] px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[.2em] text-blue-600">Contratação modular</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Escolha os módulos de cada secretaria.</h2><p className="mt-5 text-lg leading-8 text-slate-600">A prefeitura pode priorizar uma área, contratar módulos específicos e expandir para outras secretarias. Os exemplos abaixo mostram como a solução pode ser organizada; escopo e disponibilidade são definidos na implantação.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {secretariatModules.map((area) => <article key={area.name} className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={22} /></span><h3 className="mt-5 text-xl font-black">Secretaria de {area.name}</h3><p className="mt-3 min-h-20 leading-7 text-slate-600">{area.description}</p><div className="mt-5 flex flex-wrap gap-2">{area.modules.map((module) => <span key={module} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{module}</span>)}</div></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] bg-gradient-to-br from-cyan-50 to-blue-50 p-7 sm:flex-row sm:items-center sm:p-10">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm"><Sparkles size={27} /></span>
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Inteligência artificial aplicada à gestão</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Uma camada de IA conectada às informações municipais.</h2><p className="mt-3 max-w-4xl leading-7 text-slate-600">Cidades AI pode apoiar a busca e o acesso a orientações institucionais, respeitando fontes aprovadas, permissões e supervisão dos servidores. A IA complementa os módulos de gestão; não substitui decisões administrativas.</p></div>
        </div>
      </section>

      <section className="bg-[#07172e] px-5 py-24 text-white sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[.2em] text-cyan-300">Governança municipal</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl">Tecnologia pública com responsabilidades bem definidas.</h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">A implantação considera a estrutura, os fluxos e as regras de cada município. Perfis de acesso, escopo dos módulos e responsáveis são definidos com a prefeitura.</p>
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
          <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-semibold text-blue-100"><span>Administração</span><span>Atendimento ao cidadão</span><span>Patrimônio e almoxarifado</span><span>Frotas</span><span>Educação</span><Link to="/products" className="inline-flex items-center gap-1 text-white underline underline-offset-4">Ver todas as soluções <ChevronRight size={15} /></Link></div>
        </div>
      </section>
    </main>
  );
};
