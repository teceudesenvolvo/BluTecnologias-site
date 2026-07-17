import React from 'react';

export const BluLogo: React.FC<{ compact?: boolean; light?: boolean }> = ({ compact, light }) => (
  <div className="flex items-center gap-2.5" aria-label="Blu">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0877ff] text-lg font-bold text-white shadow-sm">b</div>
    {!compact && <div><div className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-950'}`}>Blu</div><div className={`-mt-1 text-[9px] font-semibold uppercase tracking-[.18em] ${light ? 'text-blue-200' : 'text-slate-400'}`}>Da oportunidade ao pagamento</div></div>}
  </div>
);
