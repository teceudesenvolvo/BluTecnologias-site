import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Store, CalendarDays, Package, WalletCards, Users, ShoppingCart, Clock3, Layers, Menu, X } from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

const content = {
  comercio: {
    name: 'Comércio', eyebrow: 'Da primeira venda à próxima filial',
    title: 'Sua loja pronta para vender.', emphasis: 'Sua gestão pronta para crescer.',
    description: 'Conecte balcão, loja online, estoque e financeiro na Blu. Venda em mais canais sem perder o controle da sua operação.',
    cta: 'Quero organizar meu comércio',
    pains: ['O estoque da loja não acompanha as vendas online?', 'O fechamento do caixa depende de planilhas?', 'Você vende, mas não sabe quanto realmente sobra?'],
    features: [
      { icon: ShoppingCart, title: 'Venda no balcão com agilidade', text: 'PDV, abertura e fechamento de caixa, clientes avulsos e comprovantes em um fluxo de venda.' },
      { icon: Store, title: 'Leve sua loja para a internet', text: 'Catálogo online com a identidade da sua empresa, produtos e pedidos conectados ao ERP.' },
      { icon: Package, title: 'Saiba o que entra e o que sai', text: 'Produtos, variações, imagens e movimentações para acompanhar seu estoque.' },
      { icon: WalletCards, title: 'Enxergue o resultado das vendas', text: 'Organize cobranças, receitas, despesas e fluxo de caixa no mesmo ambiente.' },
    ],
    journey: ['Cadastre sua empresa e seus produtos', 'Configure caixa, estoque e canais de venda', 'Venda e acompanhe a operação na Blu'],
    faq: [
      ['Posso vender no balcão e online?', 'Sim. A Blu reúne PDV e e-commerce. Confira os módulos incluídos no plano escolhido.'],
      ['Preciso de outra plataforma para a loja virtual?', 'O e-commerce é um módulo da própria Blu e utiliza o catálogo e a operação da empresa.'],
      ['Posso começar pequeno?', 'Escolha o plano adequado à sua operação e consulte opções de upgrade conforme precisar de mais recursos.'],
    ],
  },
  servicos: {
    name: 'Serviços', eyebrow: 'Menos improviso. Mais tempo para atender.',
    title: 'Transforme sua agenda', emphasis: 'em uma operação que cresce.',
    description: 'Organize agendamentos, profissionais, atendimentos e financeiro. Cuide do cliente enquanto a Blu conecta a rotina do seu negócio.',
    cta: 'Quero organizar meus serviços',
    pains: ['Os agendamentos se perdem entre mensagens?', 'As comissões dão trabalho para conferir?', 'Você não acompanha o consumo de insumos?'],
    features: [
      { icon: CalendarDays, title: 'Uma agenda para toda a operação', text: 'Visualize horários e agendamentos por data e acompanhe os atendimentos.' },
      { icon: Users, title: 'Profissionais e comissões organizados', text: 'Cadastre sua equipe e configure as comissões dos profissionais responsáveis.' },
      { icon: Layers, title: 'Controle o que cada serviço consome', text: 'Associe insumos aos serviços e acompanhe a baixa de estoque na execução.' },
      { icon: WalletCards, title: 'Atendimento conectado ao financeiro', text: 'Venda serviços, organize cobranças e acompanhe receitas e despesas em um só lugar.' },
    ],
    journey: ['Cadastre sua empresa, equipe e serviços', 'Organize agenda, preços e insumos', 'Atenda, receba e acompanhe seus resultados'],
    faq: [
      ['O catálogo de serviços é separado dos produtos?', 'Sim. Serviços têm cadastro e fluxo próprios, com parâmetros de atendimento e agendamento.'],
      ['Posso atender clientes avulsos?', 'O PDV de serviços permite atendimento a clientes cadastrados ou avulsos.'],
      ['Todos os planos incluem comissões e insumos?', 'Os módulos variam por plano. Consulte a comparação dos planos para serviços antes de contratar.'],
    ],
  },
};

export const BusinessLanding: React.FC<{ type: keyof typeof content }> = ({ type }) => {
  const page = content[type];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [params] = useSearchParams();
  const referral = params.get('indicacao');
  const plans = `/planos?tipo=${type}${referral ? `&indicacao=${encodeURIComponent(referral)}` : ''}`;
  React.useEffect(() => {
    const previous = document.title;
    document.title = `Blu para ${page.name} | Vendas e gestão conectadas`;
    window.scrollTo(0, 0);
    setMenuOpen(false);
    return () => { document.title = previous; };
  }, [page.name]);
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';
  return <div className="bg-white pt-24 text-slate-950">
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-4">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/70 px-4 py-3 shadow-[0_8px_32px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl" aria-label="Navegação comercial">
        <Link to="/empresas" className="flex items-center" aria-label="Blu para empresas"><img src={Logo} alt="Blu" className="h-10 w-10 rounded-2xl object-contain"/></Link>
        <div className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex"><a href="#recursos" className="hover:text-blue-600">Soluções</a><Link to={plans} className="hover:text-blue-600">Planos</Link><Link to={`/empresas/${type === 'comercio' ? 'servicos' : 'comercio'}`} className="hover:text-blue-600">Para {type === 'comercio' ? 'serviços' : 'comércio'}</Link></div>
        <div className="flex items-center gap-2"><Link to="/admin/login" className="hidden rounded-full border border-slate-200 bg-white/60 px-5 py-3 text-xs font-black text-slate-700 hover:text-blue-600 lg:block">Entrar no sistema</Link><Link to={plans} className="rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-600">Conhecer planos</Link><button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="business-mobile-menu" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/70 md:hidden">{menuOpen ? <X size={18}/> : <Menu size={18}/>}</button></div>
      </nav>
      {menuOpen && <nav id="business-mobile-menu" aria-label="Menu mobile" className="mx-auto mt-2 grid max-w-7xl gap-2 rounded-3xl border border-white/70 bg-white/90 p-4 text-sm font-bold shadow-xl backdrop-blur-2xl md:hidden"><a href="#recursos" onClick={() => setMenuOpen(false)} className="rounded-xl p-3 hover:bg-blue-50">Soluções</a><Link to={plans} className="rounded-xl p-3 hover:bg-blue-50">Planos</Link><Link to={`/empresas/${type === 'comercio' ? 'servicos' : 'comercio'}`} className="rounded-xl p-3 hover:bg-blue-50">Para {type === 'comercio' ? 'serviços' : 'comércio'}</Link><Link to="/admin/login" className="rounded-xl p-3 hover:bg-blue-50">Entrar no sistema</Link></nav>}
    </header>
    <section className="relative overflow-hidden bg-slate-50"><div className="pointer-events-none absolute -right-32 top-0 h-[560px] w-[560px] rounded-full bg-sky-100 blur-3xl"/><div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.2fr_1fr] lg:py-28"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Blu para {page.name} · {page.eyebrow}</p><h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{page.title}<span className="mt-2 block text-blue-600">{page.emphasis}</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{page.description}</p><div className="mt-8 flex flex-wrap items-center gap-5"><Link to={plans} className={button}>{page.cta}<ArrowRight size={18}/></Link><a href="#recursos" className="text-sm font-bold">Explorar as soluções ↓</a></div><p className="mt-5 text-xs text-slate-500">Escolha seu plano · Configure sua empresa · Comece a usar</p></div><div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl sm:p-10"><p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Uma operação conectada</p><h2 className="mt-5 text-3xl font-bold">Seu próximo passo não precisa ser mais uma planilha.</h2><div className="mt-8 space-y-5">{page.features.map(({ icon: Icon, title }, i) => <div key={title} className="flex items-center gap-4 border-t border-white/10 pt-5"><span className="rounded-xl bg-white/10 p-3 text-sky-300"><Icon size={22}/></span><span className="flex-1 font-semibold">{title}</span><span className="text-xs text-slate-500">0{i + 1}</span></div>)}</div></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16"><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Sua rotina pode ser mais simples</p><div className="mt-6 grid gap-5 md:grid-cols-3">{page.pains.map(text => <div key={text} className="rounded-2xl border border-slate-200 p-6"><Clock3 size={22} className="text-blue-600"/><h2 className="mt-4 text-xl font-bold">{text}</h2><p className="mt-3 text-sm leading-6 text-slate-500">Concentre as informações e reduza tarefas manuais com uma gestão conectada.</p></div>)}</div></section>
    <section id="recursos" className="scroll-mt-24 bg-slate-50 py-20"><div className="mx-auto max-w-7xl px-5"><h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Mais controle para você.<br/>Uma experiência melhor para seu cliente.</h2><div className="mt-10 grid gap-6 md:grid-cols-2">{page.features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-slate-100 bg-white p-8"><Icon size={28} className="text-blue-600"/><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p></article>)}</div><p className="mt-6 text-sm text-slate-500">A disponibilidade dos recursos depende do plano contratado.</p></div></section>
    <section className="mx-auto max-w-7xl px-5 py-20"><h2 className="text-3xl font-black">Começar é mais simples do que parece.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{page.journey.map((text, i) => <div key={text}><span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 font-black text-blue-600">{i + 1}</span><h3 className="mt-5 text-xl font-bold">{text}</h3></div>)}</div></section>
    <section className="mx-auto max-w-3xl px-5 pb-20"><h2 className="mb-8 text-3xl font-black">Antes de começar</h2>{page.faq.map(([question, answer]) => <details key={question} className="border-b border-slate-200 py-5"><summary className="cursor-pointer font-bold">{question}</summary><p className="mt-4 text-sm leading-7 text-slate-600">{answer}</p></details>)}</section>
    <section className="bg-blue-600 px-5 py-20 text-center text-white"><h2 className="text-3xl font-black sm:text-4xl">Dê espaço para seu negócio crescer.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-blue-100">Escolha um plano para {page.name.toLowerCase()} e comece a organizar sua operação com a Blu.</p><Link to={plans} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-blue-700">Ver planos para {page.name.toLowerCase()} <ArrowRight size={18}/></Link></section>
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-8 text-sm text-slate-500"><span>Blu Tecnologias · Gestão para empresas</span><div className="flex gap-5"><Link to="/empresas">Todas as soluções</Link><Link to="/contact">Fale com a Blu</Link><Link to="/admin/login">Entrar</Link></div></footer>
  </div>;
};
