import React from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, X } from 'lucide-react';

type TourStep = { selector: string; title: string; description: string; mobile?: boolean; desktop?: boolean };

const steps: TourStep[] = [
  { selector: '[data-tour="dashboard"]', title: 'Esta é a sua central de gestão', description: 'A Dashboard reúne os indicadores, alertas e atividades mais importantes da empresa.' },
  { selector: '[data-tour="navigation"]', title: 'Todos os módulos ficam aqui', description: 'Use o menu lateral para acessar vendas, serviços, financeiro, documentos, relatórios e configurações.', desktop: true },
  { selector: '[data-tour="mobile-menu"]', title: 'Todos os módulos ficam aqui', description: 'Toque no menu para abrir vendas, serviços, financeiro, documentos, relatórios e configurações.', mobile: true },
  { selector: '[data-tour="company"]', title: 'Empresa atual', description: 'Quando seu plano permitir mais empresas, troque o contexto por aqui. Todos os dados acompanham a empresa selecionada.', desktop: true },
  { selector: '[data-tour="search"]', title: 'Encontre qualquer recurso', description: 'Pesquise páginas e funcionalidades sem precisar percorrer todo o menu.', desktop: true },
  { selector: '[data-tour="notifications"]', title: 'Não perca nada importante', description: 'Acompanhe oportunidades, vencimentos, documentos e alertas operacionais.' },
  { selector: '[data-tour="profile"]', title: 'Seu perfil e configurações', description: 'Gerencie seus dados, empresas e preferências de acesso.' },
];

const storageKey = (userId: string) => `blu:first-access-tour:v1:${userId}`;

export const FirstAccessTour: React.FC<{ userId: string; enabled: boolean }> = ({ userId, enabled }) => {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  const visibleSteps = React.useMemo(
    () => steps.filter((step) => (isMobile ? !step.desktop : !step.mobile)),
    [isMobile],
  );

  const updateRect = React.useCallback(() => {
    const step = visibleSteps[index] || visibleSteps[0];
    const element = step ? document.querySelector(step.selector) : null;
    const nextRect = element?.getBoundingClientRect() || null;
    const visible = nextRect && nextRect.width > 0 && nextRect.height > 0;
    setRect(visible ? nextRect : null);
    if (visible) element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [index, visibleSteps]);

  React.useEffect(() => {
    const syncViewport = () => setIsMobile(window.matchMedia('(max-width: 1023px)').matches);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  React.useEffect(() => {
    if (!enabled || !userId || localStorage.getItem(storageKey(userId))) return;
    const timer = window.setTimeout(() => { setIndex(0); setOpen(true); }, 700);
    return () => window.clearTimeout(timer);
  }, [enabled, userId]);

  React.useEffect(() => {
    const restart = () => { setIndex(0); setOpen(true); };
    window.addEventListener('blu:start-tour', restart);
    return () => window.removeEventListener('blu:start-tour', restart);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (index >= visibleSteps.length) setIndex(0);
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [index, open, updateRect, visibleSteps.length]);

  if (!open) return null;
  const step = visibleSteps[index] || visibleSteps[0];
  const complete = () => { localStorage.setItem(storageKey(userId), new Date().toISOString()); setOpen(false); };
  const top = isMobile ? undefined : rect && rect.bottom + 16 + 260 < window.innerHeight ? rect.bottom + 16 : Math.max(16, (rect?.top || window.innerHeight / 2) - 276);
  const left = rect ? Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - 416)) : Math.max(16, (window.innerWidth - 400) / 2);

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Tour de primeiro acesso">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />
      {rect && <div aria-hidden className="pointer-events-none fixed rounded-2xl ring-4 ring-sky-400 ring-offset-4 ring-offset-white/20" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgba(2,6,23,.18)' }} />}
      <section className="fixed bottom-4 left-4 w-[calc(100vw-32px)] max-w-sm rounded-3xl border border-white/70 bg-white p-5 text-slate-900 shadow-2xl lg:bottom-auto dark:border-white/10 dark:bg-slate-900 dark:text-white" style={isMobile ? undefined : { left, top }}>
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"><Compass size={21} /></span>
          <button onClick={complete} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Pular apresentação"><X size={18} /></button>
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[.18em] text-sky-600">Primeiros passos · {index + 1} de {visibleSteps.length}</p>
        <h2 className="mt-2 text-xl font-black tracking-tight">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{step.description}</p>
        <div className="mt-5 flex items-center gap-1.5">{visibleSteps.map((_, itemIndex) => <span key={itemIndex} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-7 bg-sky-500' : 'w-1.5 bg-slate-200 dark:bg-white/15'}`} />)}</div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button onClick={() => index ? setIndex(index - 1) : complete()} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">{index ? <><ArrowLeft size={16} /> Voltar</> : 'Pular tour'}</button>
          <button onClick={() => index === visibleSteps.length - 1 ? complete() : setIndex(index + 1)} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-sky-600/20">{index === visibleSteps.length - 1 ? <><Check size={16} /> Concluir</> : <>Próximo <ArrowRight size={16} /></>}</button>
        </div>
      </section>
    </div>
  );
};
