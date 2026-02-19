import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Banknote,
  Shield,
  BarChart3,
  Calendar,
  Cpu,
  Globe,
  AlertTriangle,
  Clock,
  Smartphone,
  Layers,
  Eye,
  Search,
  FileSignature,
  FileCheck,
  CreditCard,
  Lock,
  Cloud,
  Code,
  Users,
  Building2,
  Briefcase
} from 'lucide-react';
import { ScrollReveal } from '../../components/ScrollReveal';
import DashSistemaFinImg from '../../assets/dashSistemaFin.png';

export const BluGov: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pt-14">

      {/* Hero Section - Apple Style: Big, Bold, Centered */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-0 relative overflow-hidden">
        <ScrollReveal>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-center mb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-700">
            Governança <br />
            <span className="text-blue-600">Reimaginada.</span>
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 max-w-3xl mx-auto text-center mb-10 leading-relaxed">
            Infraestrutura única. Inteligência Artificial. <br/>
            O fim da burocracia como você conhece.
          </p>
          <div className="flex gap-6 justify-center mb-20">
            <Link to="/contact" className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1">
              Agendar Demo
            </Link>
            <a href="#overview" className="text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all flex items-center gap-2">
              Saiba mais <ChevronRight size={20} />
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200} className="w-full max-w-5xl mx-auto relative z-10 mt-12">
           {/* MacBook Mockup */}
           <div className="relative mx-auto">
              {/* Screen */}
              <div className="relative mx-auto border-slate-800 bg-slate-800 border-[8px] rounded-t-2xl aspect-video shadow-2xl">
                 <div className="rounded-lg overflow-hidden h-full w-full bg-black flex items-center justify-center">
                    <img src={DashSistemaFinImg} className="w-full h-full object-contain" alt="Dashboard BluGov" />
                 </div>
              </div>
              {/* Base */}
              <div className="relative mx-auto bg-slate-700 rounded-b-xl h-5 shadow-2xl">
                 <div className="absolute left-1/2 top-0 -translate-x-1/2 w-24 h-2 bg-slate-900/50 rounded-b-md"></div>
              </div>
           </div>
        </ScrollReveal>
      </section>

      {/* Módulo 1: O Que é a Plataforma */}
      <section id="overview" className="py-32 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-6xl font-bold mb-16 text-center tracking-tight">O Ecossistema G2B.</h2>
          </ScrollReveal>
          
          <div className="grid gap-12">
            {[
              { title: "O Que é a Plataforma", desc: "Uma infraestrutura única que conecta a gestão pública à eficiência privada.", icon: Layers },
              { title: "A Dor do Gestor Público", desc: "O fim da fragmentação de dados e da burocracia lenta.", icon: AlertTriangle },
              { title: "A Dor do Fornecedor", desc: "Transparência total sobre quando e como irá receber.", icon: Eye },
              { title: "O Modelo G2B", desc: "Government to Business: Um ecossistema onde ambos os lados ganham eficiência.", icon: Users },
              { title: "Diferencial Fintech", desc: "Não somos apenas software; operamos o fluxo real do dinheiro.", icon: Banknote }
            ].map((item, i) => (
              <ScrollReveal key={i} className="group flex flex-col md:flex-row items-start md:items-center gap-6 p-8 rounded-3xl bg-white hover:shadow-xl transition-all duration-500 border border-slate-100">
                 <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <item.icon size={32} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-xl text-slate-500 font-medium">{item.desc}</p>
                 </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Módulo 2: O Poder da IA (Dark Mode) */}
      <section className="py-40 px-6 bg-black text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="mb-24 text-center">
               <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 2</span>
               <h2 className="text-5xl md:text-7xl font-bold tracking-tight">IA que escreve leis. <br/> E evita erros.</h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[
               { title: "Gerador de Editais IA", desc: "Criação de minutas baseadas na Lei 14.133/21 em segundos.", icon: Sparkles },
               { title: "Personalização Técnica", desc: "IA sugere especificações de mercado para evitar editais vazios.", icon: Cpu },
               { title: "Preço de Referência", desc: "Varredura nacional para garantir orçamentos realistas.", icon: Search },
               { title: "Prevenção de Erros", desc: "Revisão automática de cláusulas obrigatórias pela IA.", icon: Shield },
               { title: "Redução de Impugnações", desc: "Editais mais técnicos e menos falhos reduzem paralisações judiciais.", icon: CheckCircle2 }
             ].map((item, i) => (
               <ScrollReveal key={i} delay={i * 100} className="bg-zinc-900/50 backdrop-blur-md p-10 rounded-[2.5rem] border border-zinc-800 hover:bg-zinc-800 transition-colors">
                  <item.icon className="w-12 h-12 text-blue-500 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-zinc-400 text-lg leading-relaxed">{item.desc}</p>
               </ScrollReveal>
             ))}
          </div>
        </div>
      </section>

      {/* Módulo 3: Motor Anticonflito */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
           <div className="grid md:grid-cols-2 gap-16 items-center">
              <ScrollReveal>
                 <span className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 3</span>
                 <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8 tracking-tight">Motor Anticonflito.</h2>
                 <p className="text-2xl text-slate-500 mb-12">Governança automática que impede o erro antes que ele aconteça.</p>
                 
                 <div className="space-y-8">
                    {[
                      { title: "Check de Duplicidade", desc: "A IA impede licitar o que já está contratado." },
                      { title: "Integração com Almoxarifado", desc: "Verifica se há estoque antes de autorizar nova compra." },
                      { title: "Vigência de Contratos", desc: "Alerta de sobreposição de períodos contratuais." },
                      { title: "Compliance Preventivo", desc: "Bloqueio de processos que não respeitam a dotação orçamentária." },
                      { title: "Rastro de Auditoria", desc: "Cada decisão da IA é logada para consulta de órgãos de controle." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4">
                         <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 mt-1">
                           <CheckCircle2 size={16} />
                         </div>
                         <div>
                           <h4 className="text-xl font-bold text-slate-900">{item.title}</h4>
                           <p className="text-slate-500">{item.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </ScrollReveal>
              <ScrollReveal delay={200} className="bg-slate-100 rounded-[3rem] aspect-square flex items-center justify-center p-12">
                 {/* Abstract Visual */}
                 <div className="relative w-full h-full bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-4 border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500"><AlertTriangle /></div>
                       <div className="flex-1">
                          <div className="h-4 w-3/4 bg-slate-200 rounded mb-2"></div>
                          <div className="h-3 w-1/2 bg-slate-100 rounded"></div>
                       </div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-medium">
                       Bloqueio Automático Ativo
                    </div>
                 </div>
              </ScrollReveal>
           </div>
        </div>
      </section>

      {/* Módulo 4: Portal de Licitações (Bento Grid) */}
      <section className="py-32 px-6 bg-slate-50">
         <div className="max-w-7xl mx-auto">
            <ScrollReveal className="text-center mb-20">
               <span className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 4</span>
               <h2 className="text-4xl md:text-6xl font-bold text-slate-900">Pregão Nativo.</h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <ScrollReveal className="md:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
                  <Globe className="w-12 h-12 text-blue-600 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Pregão Eletrônico Nativo</h3>
                  <p className="text-slate-500 text-lg">Sala de lances integrada sem necessidade de sistemas externos. Tudo acontece aqui.</p>
               </ScrollReveal>
               <ScrollReveal delay={100} className="bg-blue-600 p-10 rounded-[2.5rem] shadow-sm text-white">
                  <Smartphone className="w-12 h-12 text-blue-200 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Notificações Push</h3>
                  <p className="text-blue-100">Fornecedores recebem editais no celular por nicho.</p>
               </ScrollReveal>
               <ScrollReveal delay={200} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
                  <BarChart3 className="w-12 h-12 text-purple-600 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Análise de Propostas</h3>
                  <p className="text-slate-500">IA faz o comparativo automático entre os lances e o edital.</p>
               </ScrollReveal>
               <ScrollReveal delay={300} className="md:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
                  <FileCheck className="w-12 h-12 text-green-600 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Habilitação & Assinatura</h3>
                  <p className="text-slate-500 text-lg">O sistema checa certidões no momento do lance vencedor. Contratos assinados via Gov.br sem papel.</p>
               </ScrollReveal>
            </div>
         </div>
      </section>

      {/* Módulo 5: ERP & CRM */}
      <section className="py-32 px-6 bg-white">
         <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal>
               <span className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 5</span>
               <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-16">Para quem vende ao governo.</h2>
            </ScrollReveal>
            
            <div className="space-y-12 text-left">
               {[
                 { title: "Dashboard de Vendas Públicas", desc: "Pipeline focado em contratos governamentais." },
                 { title: "Controle de Estoque para Órgãos", desc: "Reserva automática de produtos vendidos ao governo." },
                 { title: "CRM de Relacionamento Institucional", desc: "Histórico de interações com cada secretaria." },
                 { title: "Gestão Multicidades", desc: "Uma única conta para vender para várias prefeituras." },
                 { title: "Segurança de Dados", desc: "Criptografia de ponta a ponta para dados empresariais sensíveis." }
               ].map((item, i) => (
                 <ScrollReveal key={i} className="border-b border-slate-100 pb-8 last:border-0">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-xl text-slate-500">{item.desc}</p>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* Módulo 6: Gestão de Contratos (Timeline) */}
      <section className="py-32 px-6 bg-slate-900 text-white">
         <div className="max-w-7xl mx-auto">
            <ScrollReveal className="mb-20">
               <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 6</span>
               <h2 className="text-4xl md:text-6xl font-bold">Execução Perfeita.</h2>
            </ScrollReveal>

            <div className="relative border-l-2 border-slate-700 ml-4 md:ml-10 space-y-16">
               {[
                 { title: "Medição Digital", desc: "Fornecedor envia fotos e relatórios de execução pelo App.", icon: Smartphone },
                 { title: "Atesto Online", desc: "Fiscal do contrato aprova a entrega com um clique no sistema web.", icon: CheckCircle2 },
                 { title: "Cronograma de Gantt", desc: "Prefeitura e empresa veem o mesmo prazo compartilhado.", icon: Calendar },
                 { title: "Gestão de Aditivos", desc: "Fluxo simplificado para reequilíbrio econômico-financeiro.", icon: FileSignature },
                 { title: "Avaliação de Desempenho", desc: "Rating para fornecedores (o 'Uber' dos fornecedores públicos).", icon: Sparkles }
               ].map((item, i) => (
                 <ScrollReveal key={i} className="relative pl-12 md:pl-20">
                    <div className="absolute -left-[9px] top-0 w-5 h-5 rounded-full bg-blue-500 border-4 border-slate-900"></div>
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                       <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
                          <item.icon size={24} />
                       </div>
                       <div>
                          <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                          <p className="text-slate-400 text-lg">{item.desc}</p>
                       </div>
                    </div>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* Módulo 7: Fintech (Gradient) */}
      <section className="py-32 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
         <div className="max-w-7xl mx-auto text-center">
            <ScrollReveal>
               <span className="text-blue-200 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 7</span>
               <h2 className="text-5xl md:text-7xl font-bold mb-8">O dinheiro flui.</h2>
               <p className="text-2xl text-blue-100 max-w-3xl mx-auto mb-20">
                 A camada Fintech integrada que transforma contratos em liquidez imediata.
               </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[
                 { title: "Antecipação de Recebíveis", desc: "Fornecedor transforma nota fiscal em dinheiro imediato." },
                 { title: "Taxas Competitivas", desc: "Crédito mais barato por ser garantido pelo ente público." },
                 { title: "Liquidação Open Finance", desc: "Pagamento direto da conta da prefeitura para o fornecedor." },
                 { title: "Cessão Automática", desc: "Jurídico integrado para troca de domicílio bancário." },
                 { title: "Fluxo Preditivo", desc: "IA prevê quando a prefeitura terá caixa para pagar." }
               ].map((item, i) => (
                 <ScrollReveal key={i} delay={i * 50} className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/20">
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-blue-100">{item.desc}</p>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* Módulo 8: Certidões */}
      <section className="py-32 px-6 bg-white">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
               <span className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 8</span>
               <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-8">Gestão de Certidões.</h2>
               <div className="space-y-6">
                  {[
                    "Robô de Busca Automática em 50+ portais.",
                    "Alerta de Inconsistência antes da negativação.",
                    "Dossiê do Órgão Público para repasses.",
                    "Validação em Tempo Real no pagamento.",
                    "Histórico de Regularidade como prova de idoneidade."
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                       <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       <p className="text-lg text-slate-700 font-medium">{text}</p>
                    </div>
                  ))}
               </div>
            </ScrollReveal>
            <ScrollReveal delay={200} className="relative">
               <div className="aspect-square bg-slate-900 rounded-[3rem] p-10 flex flex-col justify-center items-center text-center shadow-2xl">
                  <Shield size={80} className="text-green-500 mb-6" />
                  <div className="text-4xl font-bold text-white mb-2">100%</div>
                  <div className="text-slate-400">Regularidade Garantida</div>
               </div>
            </ScrollReveal>
         </div>
      </section>

      {/* Módulo 9: Transparência */}
      <section className="py-32 px-6 bg-slate-50">
         <div className="max-w-7xl mx-auto">
            <ScrollReveal className="text-center mb-20">
               <span className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 9</span>
               <h2 className="text-4xl md:text-6xl font-bold text-slate-900">Cidadania Ativa.</h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[
                 { title: "Portal da Transparência", desc: "Dados transacionais abertos ao público em tempo real.", icon: Eye },
                 { title: "Visualização de Dados (BI)", desc: "Gráficos simples para o cidadão entender os gastos.", icon: BarChart3 },
                 { title: "Rastreio da Nota Fiscal", desc: "O cidadão vê o caminho do dinheiro até o destino final.", icon: Search },
                 { title: "Canal de Denúncias", desc: "Integrado diretamente a cada contrato ou obra específica.", icon: AlertTriangle },
                 { title: "Open Data API", desc: "Dados acessíveis para desenvolvedores e observatórios sociais.", icon: Code }
               ].map((item, i) => (
                 <ScrollReveal key={i} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <item.icon className="w-10 h-10 text-slate-900 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-500">{item.desc}</p>
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* Módulo 10: Futuro */}
      <section className="py-32 px-6 bg-white">
         <div className="max-w-5xl mx-auto text-center">
            <ScrollReveal>
               <span className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-4 block">Módulo 10</span>
               <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-12">Implementação e Futuro.</h2>
            </ScrollReveal>

            <div className="flex flex-wrap justify-center gap-4">
               {[
                 "Integração com Legado",
                 "Onboarding Guiado",
                 "Escalabilidade em Nuvem",
                 "Segurança LGPD",
                 "Sustentabilidade (Papel Zero)"
               ].map((tag, i) => (
                 <ScrollReveal key={i} delay={i * 50} className="px-6 py-3 rounded-full bg-slate-100 text-slate-700 font-bold text-lg border border-slate-200">
                    {tag}
                 </ScrollReveal>
               ))}
            </div>
         </div>
      </section>

      {/* Footer CTA */}
      <section className="py-40 px-6 bg-slate-900 text-white text-center">
        <ScrollReveal>
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            O futuro da gestão é agora.
          </h2>
          <p className="text-2xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Junte-se às prefeituras que estão redefinindo o padrão de eficiência pública.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/contact" className="px-12 py-5 bg-blue-600 text-white rounded-full font-bold text-xl hover:bg-blue-700 transition-all shadow-2xl hover:shadow-blue-600/50 flex items-center gap-3">
              <Calendar size={24} /> Agendar Demonstração
            </Link>
          </div>
        </ScrollReveal>
      </section>

    </div>
  );
};
