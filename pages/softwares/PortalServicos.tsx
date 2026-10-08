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
            Os serviços públicos a um clique de distância.
          </h1>
          <p className="text-2xl md:text-4xl font-medium text-slate-500 mb-10 max-w-4xl mx-auto tracking-tight">
            Uma experiência digital para prefeituras e câmaras municipais aproximarem o cidadão dos serviços, orientações e solicitações do seu órgão.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#servicos" className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-lg">
              Ver recursos do portal
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
            <img src={PortalServicosImg} alt="Exemplo de implantação do Portal de Serviços em uma instituição pública" className="w-full h-full object-cover object-top" />
          </div>
          <p className="mt-3 text-center text-sm text-slate-500">Exemplo de implantação em uma Câmara Municipal. A solução também atende prefeituras e é configurada para a realidade de cada órgão.</p>
        </ScrollReveal>
      </section>

      {/* 3-10. Main Services Grid */}
      <section id="servicos" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Atendimento municipal em um só lugar</h2>
            <p className="text-xl text-slate-500 mt-4 max-w-3xl mx-auto">Organize serviços, canais de atendimento e solicitações para que a população encontre o caminho certo sem depender de filas ou informações dispersas.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Scale, title: 'Atendimento Jurídico', desc: 'Receba solicitações de assistência jurídica, orientações e documentos em um fluxo digital.' },
              { icon: HeartHandshake, title: 'Procuradoria da Mulher', desc: 'Disponibilize um canal reservado para acolhimento e encaminhamento conforme os protocolos do órgão.' },
              { icon: Siren, title: 'Botão do Pânico no aplicativo', desc: 'Recurso de segurança para acionar o canal de apoio da Procuradoria da Mulher pelo app institucional.' },
              { icon: ShieldQuestion, title: 'PROCON Municipal', desc: 'Organize o recebimento e o acompanhamento de reclamações de consumo.' },
              { icon: MessageSquare, title: 'Ouvidoria', desc: 'Reúna manifestações, sugestões, elogios, críticas e reclamações para acompanhamento.' },
              { icon: Users, title: 'Balcão do Cidadão', desc: 'Ofereça um ponto digital para orientar a população e encaminhar demandas.' },
              { icon: FileText, title: 'Protocolo Digital', desc: 'Receba solicitações e documentos sem depender exclusivamente do atendimento presencial.' },
              { icon: FileSearch, title: 'Consulta de Processos', desc: 'Permita que o cidadão consulte o andamento de protocolos e solicitações.' },
              { icon: Banknote, title: 'Emissão de Guias', desc: 'Disponibilize a emissão de guias e orientações de pagamento pelos canais digitais.' },
              { icon: Phone, title: 'Solicitações aos Vereadores', desc: 'Organize pedidos enviados à Câmara e encaminhe-os para acompanhamento.' },
              { icon: Calendar, title: 'Agendamento de Gabinetes', desc: 'Facilite a solicitação de horários de atendimento com os gabinetes.' },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 40} className="rounded-3xl border border-slate-100 bg-slate-50 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <item.icon className="mb-5 h-10 w-10 text-blue-600" />
                <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                <p className="leading-7 text-slate-600">{item.desc}</p>
              </ScrollReveal>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">A disponibilidade de cada módulo depende da configuração e do escopo contratado pelo órgão.</p>
        </div>
      </section>

      {/* Transparência e informação municipal */}
      <section id="transparencia" className="py-32 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Informação pública clara e acessível</h2>
            <p className="text-xl text-slate-500 mt-4 max-w-3xl mx-auto">Publique orientações e facilite o acesso da população aos canais, serviços e informações do município.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Banknote, title: "Portal da Transparência", desc: "Facilite o acesso da população a despesas, contratos e informações públicas." },
              { icon: Library, title: "Carta de Serviços", desc: "Explique como acessar cada serviço, seus requisitos e documentos necessários." },
              { icon: FileSearch, title: "Acompanhamento de Processos", desc: "Permita consultar o andamento de protocolos e solicitações." },
              { icon: Calendar, title: "Agenda Municipal", desc: "Divulgue eventos, atendimentos e atividades públicas do município." },
              { icon: Video, title: "Audiências Públicas", desc: "Compartilhe informações e conteúdos de participação social." },
              { icon: Users, title: "Secretarias e Órgãos", desc: "Ajude o cidadão a localizar áreas e canais de atendimento." },
              { icon: Newspaper, title: "Notícias e Comunicados", desc: "Publique atualizações e avisos da administração municipal ou da Câmara." },
              { icon: BookMarked, title: "Diário Oficial", desc: "Organize o acesso a publicações e atos administrativos." },
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
      
      {/* Acesso mobile e segurança */}
      <section className="py-32 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              Mobilidade e Segurança
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">A prefeitura na palma da sua mão.</h2>
            <p className="text-xl text-gray-400 leading-relaxed mb-6">
              Em uma experiência adaptada ao celular, a população encontra serviços, avisos e canais digitais da prefeitura com mais facilidade.
            </p>
            <p className="text-xl text-gray-400 leading-relaxed">
              A implantação considera os perfis de acesso e os cuidados necessários para tratar dados pessoais conforme as diretrizes do órgão.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200} className="relative mx-auto max-w-[300px]">
            <div className="relative aspect-[9/19] bg-zinc-800 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10">
              <img src={AppCamaraImg} alt="Exemplo de aplicativo institucional municipal" className="w-full h-full object-cover" />
            </div>
            <p className="mt-3 text-center text-sm text-slate-300">Exemplo de aplicativo de uma Câmara Municipal. A identidade e os serviços podem ser configurados para prefeituras.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* Recursos para a gestão municipal */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Mais módulos para cada realidade pública</h2>
            <p className="text-xl text-slate-500 mt-4 max-w-3xl mx-auto">Recursos para gestão do portal, comunicação com cidadãos e transparência legislativa, conforme o perfil do órgão.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Info, title: "Guia de Serviços Online", desc: "Reúna orientações para a população acessar serviços municipais e legislativos." },
              { icon: Mic, title: "Participação Cidadã", desc: "Divulgue consultas, audiências e formas de contribuir com a gestão." },
              { icon: Accessibility, title: "Acessibilidade Digital", desc: "Facilite o acesso ao portal para pessoas com diferentes necessidades." },
              { icon: UserCog, title: "Gestão de Usuários", desc: "Administre os usuários internos que operam os módulos do portal." },
              { icon: Lock, title: "Perfil e Permissões", desc: "Organize o acesso às áreas administrativas conforme o perfil de cada usuário." },
              { icon: Smartphone, title: "Aplicativo Institucional", desc: "Leve notícias, serviços e canais de atendimento do órgão para o celular." },
              { icon: Users, title: "Portal do Servidor", desc: "Disponibilize informações e avisos institucionais para as equipes do órgão." },
              { icon: Bell, title: "Notificações no Aplicativo", desc: "Envie avisos e atualizações aos cidadãos pelo app institucional." },
              { icon: Library, title: "Leis Municipais", desc: "Disponibilize leis e decretos municipais para consulta pública." },
              { icon: Calendar, title: "Agenda de Sessões", desc: "Divulgue pautas e datas das sessões da Câmara Municipal." },
              { icon: Video, title: "Sessões ao Vivo", desc: "Compartilhe a transmissão das sessões legislativas com a população." },
              { icon: Users, title: "Perfil dos Vereadores", desc: "Apresente informações públicas sobre os parlamentares e seus mandatos." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 40} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
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
            Modernize o atendimento da sua prefeitura.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/contact" className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-600/30">
              Solicitar demonstração
            </Link>
            <Link to="/products" className="px-10 py-4 text-slate-600 font-bold text-lg hover:bg-slate-50 rounded-full transition-all flex items-center">
              Ver todos os produtos <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
