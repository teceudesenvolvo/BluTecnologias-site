import React, { useEffect } from 'react';
import { 
  Smartphone, 
  MapPin, 
  ScanLine, 
  Clock, 
  ShieldCheck, 
  Accessibility, 
  BarChart3, 
  Leaf, 
  Cloud, 
  Calendar, 
  BookOpen, 
  MessageCircle, 
  Bell, 
  Zap, 
  Palette, 
  HelpCircle, 
  HeartPulse, 
  Bus, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { ScrollReveal } from '../../components/ScrollReveal';
import BluEscolarImg from '../../assets/dashBluEscolar.png';

export const BluEscolar: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pt-14">
      
      

      {/* 1. O Despertar (Hero) */}
      <section id="overview" className="pt-32 pb-20 px-6 text-center">
        <ScrollReveal>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
            Blu Escolar.
          </h1>
          <p className="text-3xl md:text-5xl font-medium text-slate-500 mb-10 max-w-4xl mx-auto tracking-tight">
            Um salto gigante para a educação pública.
          </p>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Redesenhado. Reimaginado. Revolucionário. O Blu Escolar não é apenas um sistema de matrículas; é o novo sistema operativo da educação municipal.
          </p>
        </ScrollReveal>
      </section>

      {/* 2. Design que Inspira */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <ScrollReveal>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Beleza em cada pixel. <br/>
              <span className="text-slate-400">Eficiência em cada clique.</span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed font-medium">
              Criamos uma interface que desaparece para que o conteúdo brilhe. Cores suaves, tipografia nítida e uma fluidez que você precisa sentir para acreditar.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
             {/* Abstract UI Representation */}
             <div className="aspect-square bg-white rounded-[3rem] shadow-2xl p-8 flex flex-col gap-4 border border-slate-100 transform hover:scale-[1.02] transition-transform duration-700">
                <div className="h-8 w-1/3 bg-slate-100 rounded-full mb-4"></div>
                <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-100 p-6 grid grid-cols-2 gap-4">
                   <div className="bg-white rounded-2xl shadow-sm"></div>
                   <div className="bg-white rounded-2xl shadow-sm"></div>
                   <div className="col-span-2 bg-indigo-50 rounded-2xl"></div>
                </div>
             </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 3. A Experiência Mobile */}
      <section className="py-32 px-6 bg-gradient-to-b from-purple-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto text-center mb-24">
          <ScrollReveal>
            <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-slate-900">A escola no seu bolso.</h2>
            <p className="text-2xl text-slate-500 max-w-3xl mx-auto font-medium">
              O App Blu Escolar coloca o poder da gestão educacional na palma da mão. Notificações em tempo real, consulta de notas e frequência com a naturalidade de um gesto.
            </p>
          </ScrollReveal>
        </div>
        {/* Phone Mockup */}
        <ScrollReveal className="relative max-w-[320px] mx-auto">
           <div className="aspect-[9/19] bg-zinc-900 rounded-[3.5rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden relative ring-1 ring-white/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-2xl z-20"></div>
              <div className="h-full w-full bg-zinc-950 flex flex-col p-6 pt-16 gap-6">
                 <div className="w-full h-40 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
                    <Smartphone className="text-white w-16 h-16" strokeWidth={1.5} />
                 </div>
                 <div className="w-full h-24 bg-zinc-800/50 rounded-3xl"></div>
                 <div className="w-full h-24 bg-zinc-800/50 rounded-3xl"></div>
                 <div className="w-full h-24 bg-zinc-800/50 rounded-3xl"></div>
              </div>
           </div>
        </ScrollReveal>
      </section>

      {/* 4. O Portal de Matrículas */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
           <ScrollReveal>
             <div className="bg-indigo-50 rounded-[3rem] p-12 md:p-24 text-center border border-indigo-100">
                <h2 className="text-4xl md:text-6xl font-bold mb-8 text-indigo-900 tracking-tight">Matrículas. <br/> Simplificadas ao extremo.</h2>
                <p className="text-xl md:text-2xl text-indigo-700/80 max-w-3xl mx-auto mb-12 font-medium">
                  O novo portal personalizado para a prefeitura elimina a fricção. O que antes levava horas em filas, agora acontece em segundos, no conforto do seu sofá.
                </p>
                <button className="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1">
                  Ver Demonstração
                </button>
             </div>
           </ScrollReveal>
        </div>
      </section>

      {/* 5-9. Feature Grid (Inteligência, Doc, Tempo Real, Segurança, Inclusão) */}
      <section id="features" className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* 5. Inteligência Pura */}
            <ScrollReveal className="bg-white p-10 rounded-[2.5rem] shadow-sm col-span-1 lg:col-span-2 hover:shadow-md transition-shadow">
               <MapPin className="w-12 h-12 text-indigo-600 mb-6" />
               <h3 className="text-3xl font-bold mb-4">O motor que move tudo.</h3>
               <p className="text-slate-500 text-lg font-medium">
                 Algoritmos inteligentes analisam o zoneamento urbano para sugerir a escola mais próxima de forma automática. É a tecnologia pensando por você.
               </p>
            </ScrollReveal>

            {/* 6. Documentação Digital */}
            <ScrollReveal delay={100} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
               <ScanLine className="w-12 h-12 text-indigo-600 mb-6" />
               <h3 className="text-2xl font-bold mb-4">Scanner inteligente.</h3>
               <p className="text-slate-500 font-medium">
                 Aponte a câmera, capture o comprovante e pronto. O Blu Escolar trata a imagem, extrai os dados e anexa ao processo.
               </p>
            </ScrollReveal>

            {/* 7. Acompanhamento em Tempo Real */}
            <ScrollReveal delay={200} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
               <Clock className="w-12 h-12 text-indigo-600 mb-6" />
               <h3 className="text-2xl font-bold mb-4">Transparência total.</h3>
               <p className="text-slate-500 font-medium">
                 Uma linha do tempo intuitiva mostra exatamente onde o seu processo está. Receba alertas via push e SMS.
               </p>
            </ScrollReveal>

            {/* 8. Segurança de Elite */}
            <ScrollReveal delay={300} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
               <ShieldCheck className="w-12 h-12 text-indigo-600 mb-6" />
               <h3 className="text-2xl font-bold mb-4">Privacidade no DNA.</h3>
               <p className="text-slate-500 font-medium">
                 Protegemos os dados dos alunos com criptografia de ponta a ponta. Segurança não é um recurso, é a base.
               </p>
            </ScrollReveal>

            {/* 9. Inclusão Radical */}
            <ScrollReveal delay={400} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
               <Accessibility className="w-12 h-12 text-indigo-600 mb-6" />
               <h3 className="text-2xl font-bold mb-4">Para todos.</h3>
               <p className="text-slate-500 font-medium">
                 Suporte total a leitores de tela e contrastes adaptativos. Ninguém fica de fora da revolução digital.
               </p>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* 10. Dashboard Pro (Light Gradient) */}
      <section className="py-32 px-6 bg-gradient-to-b from-purple-100 to-white text-slate-900">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
           <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-6">
                Para o Gestor
              </div>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Decisões baseadas em dados, não em palpites.</h2>
              <p className="text-xl text-slate-600 leading-relaxed font-medium">
                Uma central de comando para a Secretaria de Educação. Visualize mapas de calor de demanda escolar e ocupação de salas em tempo real.
              </p>
           </ScrollReveal>
           <ScrollReveal delay={200}>
              <div className="relative w-full aspect-[16/9] bg-white rounded-t-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                 <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                 </div>
                 <img src={BluEscolarImg} alt="Dashboard Blu Escolar" className="w-full h-full object-cover object-top" />
              </div>
           </ScrollReveal>
        </div>
      </section>

      {/* 11-24. Bento Grid of Features */}
      <section id="specs" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-20 tracking-tight">O poder está nos detalhes.</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             
             {[
               { icon: Clock, title: "O Fim das Filas", desc: "Menos espera. Mais educação. Digitalizamos o processo de ponta a ponta.", bg: "bg-slate-50", color: "text-slate-900" },
               { icon: Leaf, title: "Operação Zero Papel", desc: "Elimine toneladas de formulários impressos. Bom para a cidade, melhor para o planeta.", bg: "bg-green-50", color: "text-green-700" },
               { icon: Cloud, title: "Sincronização em Nuvem", desc: "Comece no site, termine no app. Seus dados sempre com você.", bg: "bg-slate-50", color: "text-blue-600" },
               { icon: MapPin, title: "Georreferenciamento", desc: "A escola certa, no lugar certo. Respeito ao zoneamento com precisão.", bg: "bg-slate-50", color: "text-red-500" },
               { icon: Calendar, title: "Calendário Interativo", desc: "Provas, feriados e reuniões sincronizados com seu smartphone.", bg: "bg-slate-50", color: "text-indigo-500", span: "lg:col-span-2" },
               { icon: BookOpen, title: "Diário de Classe Digital", desc: "Liberdade para os professores focarem no ensino, não na burocracia.", bg: "bg-indigo-600", color: "text-white", text: "text-indigo-100", span: "lg:col-span-2" },
               { icon: MessageCircle, title: "Chat Direto", desc: "Diálogo aberto e seguro entre família e escola.", bg: "bg-slate-50", color: "text-purple-500" },
               { icon: Bell, title: "Notificações", desc: "Lembretes inteligentes sobre prazos e atualizações.", bg: "bg-slate-50", color: "text-yellow-500" },
               { icon: Zap, title: "Ultra-Rápido", desc: "Otimizado para conexões 3G. Tecnologia para todos.", bg: "bg-slate-50", color: "text-orange-500" },
               { icon: Palette, title: "Customizável", desc: "A identidade da sua prefeitura, com a alma do Blu.", bg: "bg-slate-50", color: "text-pink-500" },
               { icon: HelpCircle, title: "Suporte Integrado", desc: "Tutoriais e chat com IA para resolver dúvidas em segundos.", bg: "bg-slate-50", color: "text-cyan-500" },
               { icon: HeartPulse, title: "Saúde Integrada", desc: "Verificação automática de carteira de vacinação.", bg: "bg-slate-50", color: "text-red-500" },
               { icon: Bus, title: "Transporte", desc: "Gestão de rotas e carteirinhas escolares.", bg: "bg-slate-50", color: "text-yellow-600" },
               { icon: Layers, title: "Ecossistema Blu", desc: "Integração com merenda, estoque e RH.", bg: "bg-slate-900", color: "text-indigo-400", text: "text-slate-400" },
             ].map((item, i) => (
               <div key={i} className={`${item.bg} p-8 rounded-3xl ${item.span || ''} flex flex-col justify-between`}>
                  <div>
                    <item.icon className={`w-8 h-8 ${item.color} mb-4`} />
                    <h3 className={`font-bold text-xl mb-2 ${item.bg === 'bg-slate-900' || item.bg === 'bg-indigo-600' ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
                    <p className={`text-sm font-medium ${item.text || 'text-slate-500'}`}>{item.desc}</p>
                  </div>
               </div>
             ))}

          </div>
        </div>
      </section>

      {/* 25. O Próximo Passo (CTA) */}
      <section className="py-40 px-6 bg-slate-50 text-center border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 tracking-tight">
            Junte-se à revolução.
          </h2>
          <p className="text-2xl md:text-3xl font-medium text-slate-500 mb-12">
            Blu Escolar. A educação merece esse upgrade.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="px-10 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl hover:-translate-y-1 flex items-center gap-2">
              Agendar Demonstração <ArrowRight size={20} />
            </button>
            <button className="px-10 py-4 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all shadow-sm hover:shadow-md">
              Baixar Whitepaper
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};