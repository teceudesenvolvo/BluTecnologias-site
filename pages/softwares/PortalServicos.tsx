import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initialSoftwares } from '../../services/mockData';
import PortalServicosImg from '../../assets/DashPortalServicos.png';
import AppCamaraImg from '../../assets/HomeAppCamara.png';
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
  Scale,
  HeartHandshake,
  Siren,
  ShieldQuestion,
  MessageSquare,
  Banknote,
  Library,
  FileSearch,
  Bell,
  Lock,
  Calendar,
  Video,
  Users,
  Info,
  Mic,
  Newspaper,
  BookMarked,
  HelpCircle,
  Accessibility,
  Handshake,
  ListChecks,
  UserCog,
  Phone,
  FileText,
  Sparkles
} from 'lucide-react';
import { ScrollReveal } from '../../components/ScrollReveal';

export const PortalServicos: React.FC = () => {
  // ID fixo para o Portal de Serviços
  const product = initialSoftwares.find(p => p.id === '1');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pt-14">
      

      {/* 1 & 2. Hero Section */}
      <section id="overview" className="pt-32 pb-20 px-6 text-center bg-slate-50">
        <ScrollReveal>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            A Câmara a um clique de distância.
          </h1>
          <p className="text-2xl md:text-4xl font-medium text-slate-500 mb-10 max-w-4xl mx-auto tracking-tight">
            Nosso compromisso é modernizar processos e usar a tecnologia como ponte para a transparência e eficiência pública.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#servicos" className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-lg">
              Conhecer Serviços
            </a>
          </div>
        </ScrollReveal>
      </section>

      {/* Hero Image */}
      <section className="px-6 -mt-10">
        <ScrollReveal delay={200} className="max-w-6xl mx-auto">
          <div className="relative w-full aspect-[16/9] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <img src={PortalServicosImg} alt="Dashboard do Portal de Serviços" className="w-full h-full object-cover object-top" />
          </div>
        </ScrollReveal>
      </section>

      {/* 3-10. Main Services Grid */}
      <section id="servicos" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Cidadania Digital e Segura</h2>
            <p className="text-xl text-slate-500 mt-4 max-w-3xl mx-auto">Serviços essenciais para o cidadão, disponíveis de forma online, rápida e com total proteção de dados.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Atendimento Jurídico */}
            <ScrollReveal className="bg-slate-50 border border-slate-100 p-10 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <Scale className="w-12 h-12 text-blue-600 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Atendimento Jurídico</h3>
              <p className="text-slate-600 mb-4">Orientação gratuita para cidadãos que não podem contratar um advogado. Solicite online com RG, CPF e comprovante de residência.</p>
              <a href="#" className="font-semibold text-blue-600 hover:underline">Saiba como solicitar &rarr;</a>
            </ScrollReveal>

            {/* Procuradoria da Mulher */}
            <ScrollReveal delay={100} className="bg-pink-50 border border-pink-100 p-10 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 lg:col-span-2">
              <HeartHandshake className="w-12 h-12 text-pink-600 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Procuradoria da Mulher</h3>
              <p className="text-slate-600 mb-4">Órgão dedicado à defesa dos direitos das mulheres. Realize denúncias de forma sigilosa e segura, com acolhimento por equipe especializada.</p>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="font-semibold text-pink-600 hover:underline">Fazer denúncia &rarr;</a>
                <span className="font-semibold text-red-600 flex items-center gap-2"><Siren size={18}/> Botão do Pânico (Exclusivo no App)</span>
              </div>
            </ScrollReveal>

            {/* PROCON */}
            <ScrollReveal delay={200} className="bg-slate-50 border border-slate-100 p-10 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 lg:col-span-2">
              <ShieldQuestion className="w-12 h-12 text-green-600 mb-6" />
              <h3 className="text-2xl font-bold mb-3">PROCON Municipal Digital</h3>
              <p className="text-slate-600 mb-4">Defenda seus direitos de consumidor. Registre reclamações contra empresas e prestadores de serviço diretamente pelo portal.</p>
              <a href="#" className="font-semibold text-green-600 hover:underline">Registrar reclamação &rarr;</a>
            </ScrollReveal>

            {/* Ouvidoria */}
            <ScrollReveal delay={300} className="bg-slate-50 border border-slate-100 p-10 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <MessageSquare className="w-12 h-12 text-purple-600 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Ouvidoria: Sua Voz</h3>
              <p className="text-slate-600 mb-4">O canal oficial para enviar sugestões, elogios, críticas ou reclamações sobre qualquer serviço municipal.</p>
              <a href="#" className="font-semibold text-purple-600 hover:underline">Fale com a Ouvidoria &rarr;</a>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 11-22. Transparência e Atividade Legislativa */}
      <section id="transparencia" className="py-32 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Legislativo Aberto e Transparente</h2>
            <p className="text-xl text-slate-500 mt-4 max-w-3xl mx-auto">Acompanhe de perto o trabalho dos vereadores e as decisões que moldam o futuro da nossa cidade.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Banknote, title: "Portal da Transparência", desc: "Consulte gastos, licitações e contratos." },
              { icon: Library, title: "Leis Municipais", desc: "Acesse a biblioteca digital de leis e decretos." },
              { icon: FileSearch, title: "Acompanhe seu Processo", desc: "Verifique o andamento de suas solicitações." },
              { icon: Calendar, title: "Agenda de Sessões", desc: "Fique por dentro do calendário de votações." },
              { icon: Video, title: "Sessões Ao Vivo", desc: "Assista às sessões em tempo real pela internet." },
              { icon: Users, title: "Perfil dos Vereadores", desc: "Conheça a biografia e projetos de cada parlamentar." },
              { icon: Newspaper, title: "Notícias e Comunicados", desc: "Feed de atualizações e eventos da Câmara." },
              { icon: BookMarked, title: "Diário Oficial", desc: "Acesso às publicações e atos administrativos." },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 100} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <item.icon className="w-10 h-10 text-blue-600 mb-5" />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      
      {/* 14 & 15. App e Segurança */}
      <section className="py-32 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              Mobilidade e Segurança
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">O poder na palma da sua mão.</h2>
            <p className="text-xl text-gray-400 leading-relaxed mb-6">
              Com o aplicativo da Câmara, você recebe notificações em tempo real e acessa ferramentas exclusivas.
            </p>
            <p className="text-xl text-gray-400 leading-relaxed">
              Todos os seus dados são protegidos com criptografia de ponta a ponta, em total conformidade com a LGPD.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200} className="relative mx-auto max-w-[300px]">
            <div className="relative aspect-[9/19] bg-zinc-800 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10">
              <img src={AppCamaraImg} alt="App da Câmara" className="w-full h-full object-cover" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 19-30. Outras Seções */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Mais para Você</h2>
            <p className="text-xl text-slate-500 mt-4 max-w-3xl mx-auto">Informação, participação e o futuro da gestão pública digital.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Info, title: "Como Funciona a Câmara?", desc: "Entenda o papel do Poder Legislativo e a importância do seu vereador." },
              { icon: Mic, title: "Tribuna Livre", desc: "Saiba como usar a palavra durante as sessões para levar as demandas da sua comunidade." },
              { icon: Accessibility, title: "Acessibilidade Digital", desc: "Nosso compromisso em tornar o portal acessível para pessoas com deficiência." },
              { icon: ListChecks, title: "Guia de Serviços Online", desc: "Um índice completo de todos os serviços que podem ser resolvidos de forma 100% digital." },
              { icon: UserCog, title: "Portal do Servidor", desc: "Área restrita para funcionários da Câmara acessarem seus documentos e avisos." },
              { icon: Sparkles, title: "O Futuro é Digital", desc: "Conheça nosso plano de expansão com novos serviços e funcionalidades para os próximos meses." },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 100} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <item.icon className="w-8 h-8 text-slate-500 mb-4" />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
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
