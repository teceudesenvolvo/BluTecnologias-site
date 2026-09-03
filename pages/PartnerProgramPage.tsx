import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  Building2,
  CheckCircle2,
  Handshake,
  Link2,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

const benefits = [
  {
    title: 'Comissão sobre a primeira mensalidade',
    description: 'O parceiro ganha com a primeira cobrança do cliente, com regras comerciais claras e rastreáveis.',
    icon: WalletCards,
  },
  {
    title: 'Seu próprio link de vendas',
    description: 'Cada parceiro pode compartilhar um link exclusivo e acompanhar sua origem de vendas com mais clareza.',
    icon: Link2,
  },
  {
    title: 'Cadastro simples e profissional',
    description: 'Pessoa física ou jurídica, com dados básicos, conta bancária e Pix para receber corretamente.',
    icon: Building2,
  },
  {
    title: 'Estrutura pronta para escalar',
    description: 'A Blu registra os parceiros, os clientes indicados e a relação comercial em um fluxo organizado.',
    icon: TrendingUp,
  },
];

const steps = [
  ['Crie seu cadastro', 'Preencha seus dados e informe como prefere receber a comissão.'],
  ['Gere seu link', 'Compartilhe sua página exclusiva com os clientes certos.'],
  ['Acompanhe suas vendas', 'Veja seus cadastros, indicações e conversões em um só lugar.'],
];

export const PartnerProgramPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-950 dark:bg-[#05070b] dark:text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute bottom-[15%] right-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/72 px-5 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" aria-label="Blu" className="flex items-center">
            <img src={Logo} alt="Blu" className="h-10 w-10 rounded-2xl object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/parceiros/cadastro"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-600 dark:bg-white dark:text-slate-950"
            >
              Quero ser parceiro
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 md:pt-16">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs font-black uppercase tracking-[.18em] text-blue-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:text-blue-200">
              <Sparkles size={14} />
              Programa de parceria Blu
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-black tracking-[-0.06em] md:text-7xl">
              Ganhe indicando a Blu para empresas que querem crescer com mais organização.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Nosso programa foi pensado para parceiros que desejam compartilhar uma solução premium
              de gestão, gerar novas receitas e acompanhar suas indicações de forma profissional.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/admin/parceiros/cadastro"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-black text-white shadow-2xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500"
              >
                Começar agora
                <ArrowRight size={17} />
              </Link>
              <Link
                to="/admin/login"
                className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white/70 px-7 text-sm font-black text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-200"
              >
                Já sou parceiro
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {['Link exclusivo', 'Comissão comercial', 'Cadastro PF/PJ'].map((item) => (
                <div key={item} className="rounded-3xl border border-white/65 bg-white/65 p-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
                  <p className="text-sm font-black">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/65 bg-gradient-to-br from-white/84 via-white/54 to-sky-50/35 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.09)] backdrop-blur-2xl dark:border-white/12 dark:from-white/13 dark:via-white/7 dark:to-blue-500/10 dark:shadow-[0_24px_100px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                  <Handshake size={22} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600 dark:text-blue-200">Blupro Partner</p>
                  <h2 className="mt-1 text-2xl font-black">Sua vitrine comercial com a Blu</h2>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                {benefits.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-3xl border border-white/65 bg-white/58 p-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
                      <div className="flex items-start gap-4">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                          <Icon size={18} />
                        </span>
                        <div>
                          <h3 className="font-black">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 lg:grid-cols-3">
          {steps.map(([title, description], index) => (
            <article key={title} className="rounded-[2rem] border border-white/65 bg-white/70 p-6 shadow-sm backdrop-blur-2xl dark:border-white/12 dark:bg-white/8">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-sm font-black text-white">{index + 1}</div>
              <h3 className="mt-6 text-2xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">{description}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 grid gap-8 rounded-[2.5rem] border border-white/65 bg-white/70 p-8 shadow-sm backdrop-blur-2xl lg:grid-cols-[1fr_auto] lg:items-center dark:border-white/12 dark:bg-white/8">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600 dark:text-blue-200">Como funciona</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Você indica. A Blu cuida da jornada.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-300">
              O parceiro entra com o relacionamento comercial, e a plataforma organiza o cadastro,
              a origem das vendas e o relacionamento com o cliente final.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/parceiros/cadastro"
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-blue-600 dark:bg-white dark:text-slate-950"
            >
              Criar cadastro
            </Link>
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-200"
            >
              Voltar para a home
            </Link>
          </div>
        </section>

        <section className="mt-16 rounded-[2.5rem] border border-white/65 bg-gradient-to-br from-white/84 via-white/54 to-sky-50/35 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.09)] backdrop-blur-2xl dark:border-white/12 dark:from-white/13 dark:via-white/7 dark:to-blue-500/10 dark:shadow-[0_24px_100px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600 dark:text-blue-200">Próximo passo</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Cadastre-se como parceiro e comece sua operação comercial.</h2>
            </div>
            <Link
              to="/admin/parceiros/cadastro"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-black text-white shadow-2xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Ir para o cadastro
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};
