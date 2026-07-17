import React from 'react';
import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const ModulePlaceholderPage: React.FC = () => { const name = useLocation().pathname.split('/').pop()?.replace('-', ' ') || 'Módulo'; return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-md text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Construction/></div><h2 className="mt-5 text-2xl font-bold capitalize">{name}</h2><p className="mt-2 text-sm leading-6 text-slate-500">A estrutura deste módulo já está preparada na navegação e será implementada nas próximas fases do produto.</p><span className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Em breve</span></div></div> };
