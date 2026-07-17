import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, HelpCircle, LayoutDashboard, ListTodo, Menu, Search, Settings, Target, UserRoundCog, Users, WalletCards, X } from 'lucide-react';
import { certificateService, type Certificate } from '../../services/firebase';
import { BluLogo } from '../components/BluLogo';
import { useBluAuth } from '../contexts/BluAuthContext';
import type { ExternalOpportunity } from '../integrations/core/integrationTypes';
import { integrationOpportunityService } from '../services/integrationOpportunityService';
import { interestSettingsService } from '../services/interestSettingsService';

const nav = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Oportunidades', to: '/admin/oportunidades', icon: Target },
  { label: 'CRM', to: '/admin/crm', icon: Users },
  { label: 'Equipe', to: '/admin/equipe', icon: UserRoundCog },
  { label: 'Licitações', to: '/admin/licitacoes', icon: ClipboardCheck },
  { label: 'Contratos', to: '/admin/contratos', icon: BriefcaseBusiness },
  { label: 'Ordens', to: '/admin/ordens', icon: ListTodo },
  { label: 'Financeiro', to: '/admin/financeiro', icon: WalletCards },
  { label: 'Documentos', to: '/admin/documentos', icon: FileText },
  { label: 'Calendário', to: '/admin/calendario', icon: CalendarDays },
  { label: 'Relatórios', to: '/admin/relatorios', icon: BarChart3 },
  { label: 'Integrações', to: '/admin/integracoes', icon: CircleDollarSign },
  { label: 'Configurações', to: '/admin/configuracoes', icon: Settings },
];

const certificateReference = (item: Certificate) => {
  const extended = item as Certificate & { type?: string; company?: string };
  const normalize = (value?: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const company = normalize(extended.company);
  const type = normalize(extended.type);
  const name = normalize(item.name);
  return company ? `${company}|${type || name}` : name;
};

const latestCertificateVersions = (items: Certificate[]) => {
  const latest = new Map<string, Certificate>();
  items.forEach((item) => {
    const reference = certificateReference(item);
    const current = latest.get(reference);
    if (!current) { latest.set(reference, item); return; }
    const itemIssue = item.issueDate || '';
    const currentIssue = current.issueDate || '';
    if (itemIssue > currentIssue || (itemIssue === currentIssue && (item.expiryDate || '') > (current.expiryDate || ''))) latest.set(reference, item);
  });
  return [...latest.values()];
};

export const BluAppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen,setNotificationOpen]=useState(false);const [todayOpportunities,setTodayOpportunities]=useState<ExternalOpportunity[]>([]);const[certificateAlerts,setCertificateAlerts]=useState<Certificate[]>([]);
  const { user, signOut } = useBluAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = nav.find((item) => location.pathname.startsWith(item.to))?.label || 'Visão Geral';

  useEffect(()=>{if(!user)return;const today=new Date().toISOString().slice(0,10);Promise.all([integrationOpportunityService.listModalities(),interestSettingsService.get(user.companyId)]).then(async([modalities,keywords])=>{const auction=modalities.find((item)=>item.nome.toLowerCase().includes('pregão')&&item.nome.toLowerCase().includes('eletr'));if(!auction)return;const result=await integrationOpportunityService.list('pncp',{startDate:today,endDate:today,modalityCode:auction.id,pageSize:50});setTodayOpportunities(result.data.filter((item)=>item.publicationDate?.slice(0,10)===today&&(keywords.length===0||interestSettingsService.matches(item.object,keywords))).slice(0,20))}).catch(()=>setTodayOpportunities([]))},[user]);
  useEffect(()=>{if(!user)return;certificateService.getAll().then(items=>{const today=new Date();today.setHours(0,0,0,0);setCertificateAlerts(latestCertificateVersions(items).filter(item=>{if(!item.expiryDate)return false;const expiry=new Date(`${item.expiryDate}T12:00:00`);const days=Math.ceil((expiry.getTime()-today.getTime())/86400000);return days<=7}))}).catch(()=>setCertificateAlerts([]))},[user]);

  const logout = async () => { await signOut(); navigate('/admin/login'); };
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {mobileOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5">
          <BluLogo compact={collapsed} />
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-[#0877ff]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={18} strokeWidth={1.9} />{!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button onClick={logout} title="Sair" className={`flex w-full items-center gap-3 rounded-xl p-2 hover:bg-slate-50 ${collapsed ? 'justify-center' : ''}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">LR</div>
            {!collapsed && <><div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-[11px] text-slate-500">{user?.companyName}</p></div><ChevronDown size={15} className="text-slate-400" /></>}
          </button>
        </div>
        <button onClick={() => setCollapsed((value) => !value)} className="absolute -right-3 top-[86px] hidden h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm lg:grid" aria-label="Recolher menu">{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
      </aside>
      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
          <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="min-w-0"><h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1><p className="hidden text-xs text-slate-400 sm:block">{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p></div>
          <div className="ml-auto hidden w-full max-w-[340px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex"><Search size={17} className="text-slate-400"/><input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Buscar em toda a Blu..."/><kbd className="rounded border bg-white px-1.5 text-[10px] text-slate-400">⌘K</kbd></div>
          <button className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="Ajuda"><HelpCircle size={19}/></button>
          <div className="relative">
            <button onClick={()=>setNotificationOpen((value)=>!value)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="Notificações">
              <Bell size={19}/>{todayOpportunities.length+certificateAlerts.length>0&&<span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{todayOpportunities.length+certificateAlerts.length}</span>}
            </button>
            {notificationOpen&&<div className="absolute right-0 top-12 z-50 w-[min(400px,90vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-4"><h3 className="font-bold">Notificações</h3><p className="mt-1 text-xs text-slate-500">Oportunidades e documentos que precisam da sua atenção.</p></div>
              <div className="max-h-[460px] overflow-y-auto">
                {certificateAlerts.length>0&&<div><p className="bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">Certidões</p>{certificateAlerts.map(item=>{const today=new Date();today.setHours(0,0,0,0);const days=Math.ceil((new Date(`${item.expiryDate}T12:00:00`).getTime()-today.getTime())/86400000);return <button key={item.id} onClick={()=>{setNotificationOpen(false);navigate('/admin/documentos')}} className="block w-full border-b border-slate-100 p-4 text-left hover:bg-amber-50"><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className={`mt-1 text-xs font-semibold ${days<=0?'text-rose-600':'text-amber-600'}`}>{days<0?'Certidão vencida':days===0?'Vence hoje':`Vence em ${days} dia${days===1?'':'s'}`}</p></button>})}</div>}
                {todayOpportunities.length>0&&<div><p className="bg-blue-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">Oportunidades de hoje</p>{todayOpportunities.map((item)=><button key={item.externalId} onClick={()=>{setNotificationOpen(false);navigate('/admin/oportunidades')}} className="block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50"><p className="text-xs font-bold uppercase text-blue-600">{item.organizationName}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{item.object}</p><p className="mt-2 text-xs text-slate-400">Publicado hoje · {item.processNumber||item.procurementNumber}</p></button>)}</div>}
                {todayOpportunities.length===0&&certificateAlerts.length===0&&<p className="p-8 text-center text-sm text-slate-500">Nenhuma notificação nova.</p>}
              </div>
              <button onClick={()=>{setNotificationOpen(false);navigate('/admin/configuracoes/areas-interesse')}} className="w-full border-t border-slate-100 p-3 text-xs font-semibold text-blue-600">Configurar notificações</button>
            </div>}
          </div>
        </header>
        <main className="p-4 md:p-7"><Outlet /></main>
      </div>
    </div>
  );
};
