import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initialSoftwares } from '../../services/mockData';
import PortalLegislativoImg from '../../assets/PortalLegis.png';
import { 
  ArrowLeft, 
  CheckCircle2, 
  LayoutDashboard, 
  Landmark, 
  Smartphone, 
  ChevronRight, 
  Star,
  Shield,
  Globe,
  Bot,
  PenTool,
  Scale,
  FileText,
  Search,
  PieChart,
  Languages,
  Copy,
  Mic,
  ShieldCheck,
  Rss,
  Bell,
  Lightbulb,
  MessageCircle,
  Trophy,
  UserCheck,
  AlertTriangle,
  Video,
  PenLine,
  Cloud,
  Link as LinkIcon,
  Lock,
  QrCode,
  FileInput,
  Building,
  Users,
  List,
  Puzzle,
  CloudLightning,
  GraduationCap,
  Code,
  Map,
  Phone,
  Target,
  Network,
  TrendingUp,
  Download,
  Play
} from 'lucide-react';
import { ScrollReveal } from '../../components/ScrollReveal';

export const PortalLegislativo: React.FC = () => {
  // ID fixo para o Portal do Legislativo
  const product = initialSoftwares.find(p => p.id === '2');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-green-100 selection:text-green-900 pt-14">
       

      {/* Bloco 1: O Impacto Inicial (Seções 1-5) */}
      <section className="pt-32 pb-20 px-6 text-center bg-slate-50">
        <ScrollReveal>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-8">
            <Star className="w-3 h-3 fill-current" />
            Camara AI
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-slate-900">
            Transformando a Gestão Legislativa com <span className="text-green-600">Inteligência e Transparência.</span>
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-10 max-w-4xl mx-auto tracking-tight">
            A ponte entre o gabinete e a rua. Conectamos o Web e o Mobile em um ecossistema único.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
              <Download size={20} /> Baixar o App
            </button>
            <button className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <Play size={20} /> Demo Parlamentar
            </button>
          </div>
        </ScrollReveal>

        {/* Hero Image */}
        <ScrollReveal delay={200} className="max-w-6xl mx-auto mb-20">
          <div className="relative w-full aspect-[16/9] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <img src={PortalLegislativoImg} alt="Dashboard Camara AI" className="w-full h-full object-cover object-top" />
          </div>
        </ScrollReveal>

        {/* Números que Impressionam */}
        <ScrollReveal className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200 pt-16">
            <div>
                <div className="text-4xl font-bold text-slate-900 mb-2">+10.000</div>
                <div className="text-slate-500 font-medium">Leis Geradas</div>
            </div>
            <div>
                <div className="text-4xl font-bold text-slate-900 mb-2">+500.000</div>
                <div className="text-slate-500 font-medium">Votos Coletados</div>
            </div>
            <div>
                <div className="text-4xl font-bold text-slate-900 mb-2">60%</div>
                <div className="text-slate-500 font-medium">Tempo Economizado</div>
            </div>
        </ScrollReveal>
      </section>

      {/* Bloco 2: A Inteligência Artificial Legislativa (Seções 6-15) */}
      <section id="ia" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Inteligência Artificial Legislativa</h2>
                <p className="text-xl text-slate-500 max-w-3xl mx-auto">O Copilot que entende de Direito Público e potencializa o mandato.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { icon: Bot, title: "Introdução ao Copilot", desc: "A IA que entende de Direito Público e auxilia em cada etapa." },
                    { icon: PenTool, title: "Redação Assistida", desc: "Escreva um Projeto de Lei em minutos com sugestões inteligentes." },
                    { icon: Scale, title: "Análise de Constitucionalidade", desc: "Verificação automática da Lei Orgânica em tempo real." },
                    { icon: FileText, title: "Justificativas Automáticas", desc: "Base fundamentada em dados sociais e precedentes jurídicos." },
                    { icon: Search, title: "Busca Semântica", desc: "Encontre qualquer lei pelo tema ou contexto, não apenas pelo número." },
                    { icon: CheckCircle2, title: "Correção de Normas", desc: "Adequação automática à Lei Complementar 95." },
                    { icon: PieChart, title: "Estimativa de Impacto", desc: "IA projetando custos e benefícios sociais de cada projeto." },
                    { icon: Languages, title: "Tradução Jurídica", desc: "Convertendo o 'juridiquês' para uma linguagem acessível à população." },
                    { icon: Copy, title: "Prevenção de Duplicidade", desc: "O sistema avisa se já existe uma lei igual ou similar tramitando." },
                    { icon: Mic, title: "IA Multimodal", desc: "Transforme áudios de reuniões em atas e rascunhos de requerimentos." },
                ].map((item, i) => (
                    <ScrollReveal key={i} delay={i * 50} className="bg-slate-50 p-8 rounded-3xl hover:shadow-lg transition-all border border-slate-100">
                        <item.icon className="w-10 h-10 text-green-600 mb-4" />
                        <h3 className="text-xl font-bold mb-2 text-slate-900">{item.title}</h3>
                        <p className="text-slate-600">{item.desc}</p>
                    </ScrollReveal>
                ))}
            </div>
        </div>
      </section>

      {/* Bloco 3: O Aplicativo Mobile do Cidadão (Seções 16-25) */}
      <section id="mobile" className="py-32 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
                <div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">O Cidadão no Centro</h2>
                    <p className="text-xl text-slate-400 mb-8">
                        Uma interface intuitiva que coloca a Câmara no bolso do cidadão.
                    </p>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <ShieldCheck className="w-8 h-8 text-green-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold">Login Seguro Gov.br</h3>
                                <p className="text-slate-400">Autenticação nível Prata e Ouro para segurança total.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Rss className="w-8 h-8 text-green-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold">Feed de Votação</h3>
                                <p className="text-slate-400">Participe das decisões da cidade com um toque.</p>
                            </div>
                        </div>
                         <div className="flex gap-4">
                            <Bell className="w-8 h-8 text-green-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold">Notificações Inteligentes</h3>
                                <p className="text-slate-400">"Um projeto do seu interesse será votado hoje."</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative">
                     {/* Placeholder for App Image if needed, or keep abstract */}
                     <div className="aspect-[9/19] max-w-sm mx-auto bg-slate-800 rounded-[3rem] border-8 border-slate-700 shadow-2xl overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                            <Smartphone size={64} />
                        </div>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                    { icon: Lightbulb, title: "Ideias Legislativas", desc: "Como transformar sua sugestão em lei real." },
                    { icon: MessageCircle, title: "Chat 'Entenda a Lei'", desc: "Sua conversa direta com a base de dados legislativa. A IA explica o impacto no seu bairro." },
                    { icon: Trophy, title: "Gamificação Cidadã", desc: "Rankings de participação e transparência para engajar a comunidade." },
                    { icon: UserCheck, title: "Acompanhamento", desc: "Veja como seu representante está votando em tempo real." },
                    { icon: AlertTriangle, title: "Denúncias", desc: "Solicite serviços públicos e reporte problemas direto pelo app." },
                    { icon: Video, title: "Transmissão ao Vivo", desc: "Assista às sessões plenárias com chat integrado." },
                 ].map((item, i) => (
                    <ScrollReveal key={i} delay={i * 50} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:bg-slate-750 transition-colors">
                        <item.icon className="w-8 h-8 text-green-400 mb-3" />
                        <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                        <p className="text-slate-400 text-sm">{item.desc}</p>
                    </ScrollReveal>
                 ))}
            </div>
        </div>
      </section>

      {/* Bloco 4: Segurança e Validade Jurídica (Seções 26-30) */}
      <section className="py-32 px-6 bg-slate-50">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Segurança e Validade Jurídica</h2>
                <p className="text-xl text-slate-500">Tecnologia de ponta para garantir a autenticidade de cada ato.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { icon: PenLine, title: "Assinatura ICP-Brasil", desc: "Validade jurídica total." },
                    { icon: Cloud, title: "Certificado em Nuvem", desc: "Assine via biometria." },
                    { icon: LinkIcon, title: "Blockchain", desc: "Rastreabilidade imutável." },
                    { icon: Lock, title: "LGPD", desc: "Segurança de dados total." },
                    { icon: QrCode, title: "Auditoria Pública", desc: "Verificação via QR Code." },
                ].map((item, i) => (
                    <ScrollReveal key={i} delay={i * 50} className="bg-white p-6 rounded-2xl shadow-sm text-center border border-slate-100">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <item.icon size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                    </ScrollReveal>
                ))}
            </div>
         </div>
      </section>

      {/* Bloco 5: Workflow e Gestão (Seções 31-35) */}
      <section id="workflow" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
            <ScrollReveal>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">Workflow e Gestão Eficiente</h2>
                <div className="space-y-8">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <FileInput size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Tramitação Digital</h3>
                            <p className="text-slate-600">O fim do papel e dos processos físicos. Tudo digital.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Building size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Painel do Prefeito</h3>
                            <p className="text-slate-600">Conexão direta para Sanção e Veto de projetos.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Gestão de Comissões</h3>
                            <p className="text-slate-600">Relatórios automáticos e controle rigoroso de prazos.</p>
                        </div>
                    </div>
                     <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <List size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Ordem do Dia Digital</h3>
                            <p className="text-slate-600">Organização automática das sessões plenárias.</p>
                        </div>
                    </div>
                     <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Puzzle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Integração com eCamara</h3>
                            <p className="text-slate-600">Aproveitando a robustez do legado com inovação.</p>
                        </div>
                    </div>
                </div>
            </ScrollReveal>
            <ScrollReveal delay={200} className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col justify-center">
                 <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-slate-900">Status do Processo</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Em Tramitação</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                        <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                    </div>
                    <p className="text-sm text-slate-500">Aguardando parecer da Comissão de Justiça.</p>
                 </div>
                 <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                        <div>
                            <div className="font-bold text-slate-900">Vereador Autor</div>
                            <div className="text-xs text-slate-500">Partido Exemplo</div>
                        </div>
                    </div>
                    <p className="text-slate-600 text-sm">"Solicito a inclusão do Projeto de Lei 123/2024 na Ordem do Dia..."</p>
                 </div>
            </ScrollReveal>
        </div>
      </section>

      {/* Bloco 6: Futuro e Suporte (Seções 36-40) */}
      <section className="py-32 px-6 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
                <div>
                    <CloudLightning className="w-10 h-10 text-green-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Escalabilidade Cloud</h3>
                    <p className="text-slate-400 text-sm">Hospedagem em Firebase para alta demanda e disponibilidade.</p>
                </div>
                <div>
                    <GraduationCap className="w-10 h-10 text-green-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Treinamento</h3>
                    <p className="text-slate-400 text-sm">Capacitação completa para assessores e vereadores.</p>
                </div>
                <div>
                    <Code className="w-10 h-10 text-green-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">API Aberta</h3>
                    <p className="text-slate-400 text-sm">Integração facilitada com outros sistemas governamentais.</p>
                </div>
                <div>
                    <Map className="w-10 h-10 text-green-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Roadmap</h3>
                    <p className="text-slate-400 text-sm">Evolução constante. Veja o que vem porí no Camara AI.</p>
                </div>
            </div>

            <div className="text-center border-t border-slate-800 pt-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-8">Pronto para o futuro?</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button className="px-10 py-4 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-700 transition-all shadow-xl flex items-center gap-3">
                        <Phone size={24} /> Fale com Consultores
                    </button>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};
