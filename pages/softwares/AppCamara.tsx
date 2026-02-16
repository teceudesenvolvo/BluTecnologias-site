import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initialSoftwares } from '../../services/mockData';
import { 
  ArrowLeft, 
  CheckCircle2, 
  LayoutDashboard, 
  Landmark, 
  Smartphone, 
  ChevronRight, 
  Star,
  Zap,
  Shield,
  Wifi,
  FileText,
  MessageSquare,
  Users,
  Download,
  Info,
  AlertTriangle,
  ShoppingBag,
  HeartHandshake,
  Calendar,
  Tv,
  UserCheck,
  MousePointerClick,
  Bell,
  Eye,
  TrendingUp,
  Quote,
  Lock,
  HelpCircle,
  BarChart3
} from 'lucide-react';

export const AppCamara: React.FC = () => {
  // ID fixo para o App da Câmara
  const product = initialSoftwares.find(p => p.id === '3');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pt-20">
      

      {/* 1. Hero Section (Destaque Principal) */}
      <section className="relative pt-24 pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-blue-600 font-bold tracking-wider text-xs uppercase bg-blue-50 px-3 py-1 rounded-full">App Oficial</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
            <span className="block text-slate-900 leading-tight">
              Aproxime sua gestão <br/> dos cidadãos.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed mt-8 font-medium">
            Ofereça aos seus cidadãos uma ferramenta poderosa para participação e acesso a serviços, enquanto sua gestão ganha dados estratégicos e otimiza o atendimento.
          </p>

          <div className="mt-12 flex justify-center gap-4">
             <button className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-slate-200 flex items-center gap-2">
               <Calendar size={20} /> Agendar Demonstração
             </button>
             <a href="#features" className="text-blue-600 hover:text-blue-700 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 transition-all hover:bg-blue-50">
               Conheça as Funcionalidades <ChevronRight size={20} />
             </a>
          </div>

          {/* Abstract Phone Visualization */}
          <div className="mt-24 relative mx-auto max-w-[300px] md:max-w-[400px]">
             <div className="relative aspect-[9/19] bg-white rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
               {/* Screen Content */}
               <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl mb-8 shadow-lg flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full mb-4"></div>
                  <div className="w-3/4 h-2 bg-slate-200 rounded-full mb-4"></div>
                  <div className="w-1/2 h-2 bg-slate-200 rounded-full"></div>
                  
                  {/* Floating UI Elements */}
                  <div className="absolute bottom-10 left-6 right-6 h-16 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm flex items-center justify-around px-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Zap size={16}/></div>
                    <div className="w-8 h-8 rounded-full text-slate-400 flex items-center justify-center"><Users size={16}/></div>
                    <div className="w-8 h-8 rounded-full text-slate-400 flex items-center justify-center"><FileText size={16}/></div>
                  </div>
               </div>
               
               {/* Dynamic Island / Notch */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. O Problema (A Dor do Cidadão) */}
      <section className="py-32 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-8">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Sua gestão está realmente ouvindo o cidadão?
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed">
            Processos em papel, demandas perdidas e falta de dados estruturados dificultam uma gestão responsiva e eficiente. A distância entre o gabinete e o cidadão gera desconfiança e sobrecarrega o atendimento presencial.
          </p>
        </div>
      </section>

      {/* 3. A Solução (A Proposta de Valor) */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              Solução
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Conexão direta com <br/>
              <span className="text-blue-600">quem decide.</span>
            </h2>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              Nossa plataforma cria uma ponte digital segura e transparente entre o cidadão e o legislativo. Transforme a participação política em uma fonte de dados para uma governança mais inteligente e assertiva.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="text-green-500" /> Simples
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="text-green-500" /> Rápido
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="text-green-500" /> Moderno
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="aspect-square bg-gradient-to-br from-blue-50 to-slate-100 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-center overflow-hidden">
                {/* Abstract representation of connection */}
                <div className="relative w-full h-full">
                  <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-blue-500 rounded-2xl shadow-lg flex items-center justify-center text-white z-10 animate-bounce">
                    <Users size={40} />
                  </div>
                  <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-slate-800 rounded-2xl shadow-lg flex items-center justify-center text-white z-10 animate-bounce delay-100">
                    <Landmark size={40} />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-2 bg-slate-200 -rotate-45"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 4-8. Funcionalidades (Bento Grid) */}
      <section id="features" className="bg-slate-900 py-32 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-bold mb-20 text-center">
            Tudo o que você precisa.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 4. Ouvidoria Digital */}
            <div className="col-span-1 md:col-span-2 bg-slate-800 rounded-3xl p-10 border border-slate-700 hover:bg-slate-750 transition-all group overflow-hidden relative">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-blue-900/50">
                  <MessageSquare size={28} />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">Ouvidoria Digital</h3>
                <p className="text-slate-400 text-lg max-w-lg">
                  Centralize e gerencie todas as demandas da ouvidoria. O cidadão registra ocorrências com geolocalização e fotos, e o gestor acompanha tudo através de dashboards, SLAs e relatórios de desempenho.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-blue-600/20 to-transparent rounded-tl-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            </div>

            {/* 5. Procon na Mão */}
            <div className="col-span-1 bg-slate-800 rounded-3xl p-10 border border-slate-700 hover:bg-slate-750 transition-all flex flex-col justify-between group">
               <div>
                 <ShoppingBag className="w-12 h-12 text-orange-500 mb-6" />
                 <h3 className="text-2xl font-bold mb-2 text-white">Procon na Mão</h3>
                 <p className="text-slate-400">Digitalize o atendimento do PROCON, permitindo que cidadãos abram reclamações e enviem documentos online, reduzindo o fluxo presencial.</p>
               </div>
            </div>

            {/* 6. Procuradoria da Mulher */}
            <div className="col-span-1 bg-slate-800 rounded-3xl p-10 border border-slate-700 hover:bg-slate-750 transition-all group">
               <HeartHandshake className="w-12 h-12 text-pink-500 mb-6" />
               <h3 className="text-2xl font-bold mb-2 text-white">Procuradoria da Mulher</h3>
               <p className="text-slate-400">Ofereça um canal de apoio com denúncias seguras e "Botão de Emergência", garantindo sigilo e agilidade no atendimento.</p>
            </div>

            {/* 7. Agendamento de Gabinetes */}
            <div className="col-span-1 md:col-span-2 bg-slate-800 rounded-3xl p-10 border border-slate-700 hover:bg-slate-750 transition-all relative overflow-hidden group">
               <div className="relative z-10">
                 <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-green-900/50">
                    <Calendar size={28} />
                 </div>
                 <h3 className="text-3xl font-bold mb-4 text-white">Agendamento de Gabinetes</h3>
                 <p className="text-slate-400 text-lg max-w-lg">
                   Otimize a agenda dos gabinetes. O sistema permite que os cidadãos solicitem e agendem reuniões de forma organizada, liberando a equipe para focar em atividades estratégicas.
                 </p>
               </div>
               <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-green-600/20 rounded-full blur-3xl group-hover:bg-green-600/30 transition-colors duration-500"></div>
            </div>

            {/* 8. TV Câmara */}
            <div className="col-span-1 md:col-span-3 bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-12 border border-slate-700 text-center relative overflow-hidden group">
               <div className="relative z-10 flex flex-col items-center">
                 <Tv className="w-16 h-16 text-blue-400 mb-6" />
                 <h3 className="text-3xl font-bold mb-4 text-white">TV Câmara e Transparência</h3>
                 <p className="text-slate-300 text-lg max-w-2xl">
                   Cumpra a lei de acesso à informação com excelência. Transmita sessões ao vivo e disponibilize um arquivo completo de leis, projetos e votações, integrado ao perfil de cada parlamentar.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Como Funciona (Passo a Passo) */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">Como implementar na sua cidade</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: MousePointerClick, title: "Implantação Rápida", desc: "Nossa equipe configura e personaliza o app para a sua Câmara." },
              { icon: UserCheck, title: "Treinamento e Suporte", desc: "Capacitamos sua equipe para gerenciar a plataforma e extrair o máximo de insights." },
              { icon: Users, title: "Divulgação para Cidadãos", desc: "Fornecemos material de campanha para engajar a população a usar o novo canal." },
              { icon: BarChart3, title: "Análise de Dados", desc: "Acompanhe os resultados através de relatórios e dashboards inteligentes." }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6">
                  <step.icon size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">{step.title}</h3>
                <p className="text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Benefícios para a Cidade */}
      <section className="py-32 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Vantagens para a Gestão Pública</h2>
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
              <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Agilidade</h3>
              <p className="text-slate-500">Reduza o tempo de resposta ao cidadão com processos e fluxos automatizados.</p>
           </div>
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
              <Eye className="w-12 h-12 text-blue-600 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Transparência</h3>
              <p className="text-slate-500">O cidadão acompanha o status de suas solicitações, aumentando a confiança na gestão.</p>
           </div>
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Economia</h3>
              <p className="text-slate-500">Menos gastos com deslocamento e papelada para o município.</p>
           </div>
        </div>
      </section>

      {/* 11. Depoimentos (Prova Social) */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">O que dizem os gestores</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-slate-50 p-8 rounded-3xl relative">
              <Quote className="absolute top-6 left-6 text-blue-200 w-10 h-10" />
              <p className="text-slate-700 italic mb-6 relative z-10 pt-6">
                "Com o App, centralizamos a ouvidoria e reduzimos o tempo de resposta em 60%. Os relatórios nos dão uma visão clara dos principais problemas da cidade."
              </p>
              <div className="font-bold text-slate-900">– Prefeito de Cidade Exemplo</div>
              <div className="text-sm text-slate-500">Cliente Blu</div>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl relative">
              <Quote className="absolute top-6 left-6 text-blue-200 w-10 h-10" />
              <p className="text-slate-700 italic mb-6 relative z-10 pt-6">
                "A funcionalidade da Procuradoria da Mulher foi um marco. Conseguimos oferecer um canal seguro e eficiente, que era uma demanda antiga da nossa comunidade."
              </p>
              <div className="font-bold text-slate-900">– Vereadora de Vila Nova</div>
              <div className="text-sm text-slate-500">Cliente Blu</div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. Segurança e Privacidade */}
      <section className="py-24 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <Lock className="w-16 h-16 text-blue-400 mb-6" />
            <h2 className="text-3xl font-bold mb-4">Seus dados estão protegidos.</h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Operamos em conformidade total com a LGPD (Lei Geral de Proteção de Dados). Suas denúncias podem ser anônimas quando permitido por lei e suas informações pessoais são criptografadas.
            </p>
          </div>
          <div className="flex-1 flex justify-center">
             <Shield className="w-48 h-48 text-slate-700 opacity-50" />
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Dúvidas comuns</h2>
          <div className="space-y-6">
            {[
              { q: "Qual o modelo de contratação?", a: "Nossas soluções são contratadas através de uma assinatura anual (SaaS), que inclui implantação, treinamento, suporte e atualizações contínuas." },
              { q: "A implantação exige uma equipe de TI dedicada?", a: "Não. Nossa plataforma é 100% em nuvem e nossa equipe cuida de toda a configuração. Sua equipe precisará apenas de um treinamento básico para operar o painel de gestão." },
              { q: "Como os dados dos cidadãos são protegidos?", a: "Operamos em total conformidade com a LGPD. Todos os dados são criptografados e o acesso às informações é controlado por níveis de permissão, garantindo sigilo e segurança." }
            ].map((item, i) => (
              <div key={i} className="border-b border-slate-100 pb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <HelpCircle size={20} className="text-blue-600" /> {item.q}
                </h3>
                <p className="text-slate-600 ml-7">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. Números de Impacto */}
      <section className="py-24 px-6 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Resultados que sua gestão pode alcançar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="text-5xl font-bold mb-2">+500</div>
              <div className="text-blue-100 font-medium">Demandas atendidas este mês</div>
            </div>
            <div className="p-6 border-y md:border-y-0 md:border-x border-blue-500">
              <div className="text-5xl font-bold mb-2">60%</div>
              <div className="text-blue-100 font-medium">Redução no tempo de resposta</div>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-blue-100 font-medium">Das sessões transmitidas em HD</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA Final */}
      <section id="download" className="py-32 px-6 bg-slate-50 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
          Pronto para transformar sua gestão?
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 flex items-center gap-3">
            <Calendar size={24} /> Agendar uma Demonstração
          </button>
        </div>
      </section>
    </div>
  );
};
