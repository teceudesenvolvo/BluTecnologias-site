import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, CreditCard, FileText, Headphones, HelpCircle, LayoutDashboard, ListTodo, Megaphone, Menu, Moon, Package, Search, Settings, ShieldCheck, Sun, Target, UserRoundCog, Users, WalletCards, X } from 'lucide-react';
import { auth, certificateService, onAuthStateChanged, type Certificate } from '../../services/firebase';
import { BluLogo } from '../components/BluLogo';
import { useBluAuth } from '../contexts/BluAuthContext';
import type { ExternalOpportunity } from '../integrations/core/integrationTypes';
import { integrationOpportunityService } from '../services/integrationOpportunityService';
import { interestSettingsService } from '../services/interestSettingsService';
import { accessControlService, defaultAccessRoles, type AccessRole } from '../services/accessControlService';
import { billingClient, type BillingSummary } from '../billing/services/billingClient';

const nav = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Oportunidades', to: '/admin/oportunidades', icon: Target },
  { label: 'CRM', to: '/admin/crm', icon: Users },
  { label: 'Equipe', to: '/admin/equipe', icon: UserRoundCog },
  { label: 'Licitações', to: '/admin/licitacoes', icon: ClipboardCheck },
  { label: 'Clientes', to: '/admin/clientes', icon: Users },
  { label: 'Contratos', to: '/admin/contratos', icon: BriefcaseBusiness },
  { label: 'Orçamentos', to: '/admin/orcamentos', icon: CircleDollarSign },
  { label: 'Ordens', to: '/admin/ordens', icon: ListTodo },
  { label: 'Produtos', to: '/admin/produtos', icon: Package },
  { label: 'Financeiro', to: '/admin/financeiro', icon: WalletCards },
  { label: 'Documentos', to: '/admin/documentos', icon: FileText },
  { label: 'Calendário', to: '/admin/calendario', icon: CalendarDays },
  { label: 'Relatórios', to: '/admin/relatorios', icon: BarChart3 },
  { label: 'Integrações', to: '/admin/integracoes', icon: CircleDollarSign },
  { label: 'Planos', to: '/admin/planos', icon: ShieldCheck },
  { label: 'Assinatura', to: '/admin/assinatura', icon: CreditCard },
  { label: 'Suporte', to: '/admin/suporte', icon: Headphones },
  { label: 'Configurações', to: '/admin/configuracoes', icon: Settings },
];

const platformAdminNav = [
  { label: 'Novidades', to: '/admin/novidades', icon: Megaphone },
  { label: 'Blu HQ', to: '/admin/hq', icon: ShieldCheck },
];

const quickFeatures = [
  { label: 'Nova oportunidade', to: '/admin/oportunidades', description: 'Buscar processos, editais, PNCP e integrações', keywords: 'licitação licitacao edital pncp comprasgov tce oportunidade participar arquivos ia' },
  { label: 'Áreas de interesse', to: '/admin/oportunidades', description: 'Configurar filtros de objetos e estados de interesse', keywords: 'areas interesse filtros estados oportunidades notificações notificacoes' },
  { label: 'Gerar proposta', to: '/admin/licitacoes', description: 'Gerar propostas, impugnações, esclarecimentos e parecer com IA', keywords: 'proposta impugnação impugnacao esclarecimento parecer ia edital saved licitacoes' },
  { label: 'Novo orçamento', to: '/admin/orcamentos', description: 'Criar orçamento e PDF timbrado da proposta', keywords: 'orcamento orçamento pdf proposta itens produto serviço servico impostos' },
  { label: 'Nova cobrança', to: '/admin/financeiro', description: 'Enviar cobrança oficial com nota fiscal, certidões e relatório', keywords: 'cobranca cobrança receber financeiro nota fiscal certidao relatório contrato cliente email' },
  { label: 'Contas bancárias', to: '/admin/financeiro/contas-bancarias', description: 'Gerenciar bancos, caixas, recebimentos e pagamentos', keywords: 'banco conta bancaria bancária pix saldo transferência transferencia' },
  { label: 'Fluxo de caixa', to: '/admin/financeiro/fluxo-de-caixa', description: 'Entradas, saídas, previsto, realizado e vencimentos', keywords: 'fluxo caixa entrada saida saída receita despesa vencido previsto realizado' },
  { label: 'Notas fiscais', to: '/admin/financeiro/notas-fiscais', description: 'Notas emitidas, recebidas, XML, PDF e vínculos financeiros', keywords: 'nfse nfe nota fiscal xml pdf retenção retencao tributo' },
  { label: 'Gestão tributária', to: '/admin/financeiro/gestao-tributaria', description: 'Tributos, retenções, guias e estimativas gerenciais', keywords: 'tributo imposto iss inss irrf pis cofins csll icms ipi retenção' },
  { label: 'DRE Gerencial', to: '/admin/financeiro/dre-gerencial', description: 'Resultado gerencial, margem e orçado x realizado', keywords: 'dre resultado lucro margem gerencial competência caixa' },
  { label: 'Upload de documentos', to: '/admin/documentos', description: 'Cadastrar documentos, certidões e baixar ZIP', keywords: 'documento certidão certidao upload validade vencimento zip download' },
  { label: 'Abrir chamado', to: '/admin/suporte', description: 'Chat com suporte, SAC e acompanhamento de chamados', keywords: 'suporte chamado chat sac atendimento ajuda problema ticket' },
  { label: 'Níveis de acesso', to: '/admin/configuracoes/niveis-acesso', description: 'Configurar permissões por tipo de usuário', keywords: 'permissão permissao acesso perfil usuário usuario tipo equipe admin' },
  { label: 'Minha assinatura', to: '/admin/assinatura', description: 'Plano atual, uso, cobranças e pagamentos', keywords: 'assinatura plano pagamento cobrança infinitepay upgrade uso limite' },
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
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('blu-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });
  const [notificationOpen,setNotificationOpen]=useState(false);const [todayOpportunities,setTodayOpportunities]=useState<ExternalOpportunity[]>([]);const[certificateAlerts,setCertificateAlerts]=useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [firebaseUid, setFirebaseUid] = useState(auth.currentUser?.uid || '');
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>(defaultAccessRoles);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const { user } = useBluAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = accessControlService.roleFor(user?.role, accessRoles);
  const canAccessPath = (pathname: string) => {
    const key = accessControlService.pageKeyFromPath(pathname);
    if (!key) return true;
    return currentRole.pages.includes(key);
  };
  const isBluPlatformAdmin = String(user?.email || '').toLowerCase() === 'admin@blutecnologias.com.br';
  const visibleNav = [...nav.filter((item) => canAccessPath(item.to)), ...(isBluPlatformAdmin ? platformAdminNav : [])];
  const title = [...nav, ...platformAdminNav].find((item) => location.pathname.startsWith(item.to))?.label || 'Visão Geral';
  const currentPageAllowed = canAccessPath(location.pathname);
  const subscriptionStatus = String(billing?.subscription?.status || '');
  const billingRestricted = subscriptionStatus === 'SUSPENDED' && !location.pathname.startsWith('/admin/assinatura') && !location.pathname.startsWith('/admin/planos');
  const searchableItems = React.useMemo(() => {
    const navItems = visibleNav.map((item) => ({ label: item.label, to: item.to, description: 'Abrir página do sistema', keywords: item.label }));
    const featureItems = quickFeatures.filter((item) => canAccessPath(item.to) && (isBluPlatformAdmin || !item.to.startsWith('/admin/hq')) && visibleNav.some((navItem) => item.to.startsWith(navItem.to) || navItem.to.startsWith(item.to)));
    const unique = new Map<string, { label: string; to: string; description: string; keywords: string }>();
    [...navItems, ...featureItems].forEach((item) => unique.set(`${item.to}:${item.label}`, item));
    return [...unique.values()];
  }, [visibleNav, currentRole.pages.join('|'), isBluPlatformAdmin]);
  const searchResults = React.useMemo(() => {
    const term = searchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (!term) return searchableItems.slice(0, 8);
    return searchableItems
      .map((item) => {
        const haystack = `${item.label} ${item.description} ${item.keywords}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const score = item.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().startsWith(term) ? 3 : haystack.includes(term) ? 1 : 0;
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [searchQuery, searchableItems]);
  const openSearchResult = (to: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(to);
  };

  useEffect(()=>{if(!user||!firebaseUid)return;const today=new Date().toISOString().slice(0,10);Promise.all([integrationOpportunityService.listModalities(),interestSettingsService.get(user.companyId)]).then(async([modalities,keywords])=>{const auction=modalities.find((item)=>item.nome.toLowerCase().includes('pregão')&&item.nome.toLowerCase().includes('eletr'));if(!auction)return;const result=await integrationOpportunityService.list('pncp',{startDate:today,endDate:today,modalityCode:auction.id,pageSize:50});setTodayOpportunities(result.data.filter((item)=>item.publicationDate?.slice(0,10)===today&&(keywords.length===0||interestSettingsService.matches(item.object,keywords))).slice(0,20))}).catch(()=>setTodayOpportunities([]))},[user,firebaseUid]);
  useEffect(()=>{if(!user||!firebaseUid)return;certificateService.getAll().then(items=>{const today=new Date();today.setHours(0,0,0,0);setCertificateAlerts(latestCertificateVersions(items).filter(item=>{if(!item.expiryDate)return false;const expiry=new Date(`${item.expiryDate}T12:00:00`);const days=Math.ceil((expiry.getTime()-today.getTime())/86400000);return days<=7}))}).catch(()=>setCertificateAlerts([]))},[user,firebaseUid]);
  useEffect(()=>{if(!user)return;accessControlService.get(user.companyId).then((settings)=>setAccessRoles(settings.roles)).catch(()=>setAccessRoles(defaultAccessRoles))},[user]);
  useEffect(()=>{if(!user||!firebaseUid)return;billingClient.summary().then(setBilling).catch(()=>setBilling(null))},[user,firebaseUid]);
  useEffect(()=>{const read=()=>{setAuthDisplayName(auth.currentUser?.displayName||'');setFirebaseUid(auth.currentUser?.uid||'')};read();const unsubscribe=onAuthStateChanged(auth,()=>read());window.addEventListener('blu:profile-updated',read);return()=>{unsubscribe();window.removeEventListener('blu:profile-updated',read)}},[]);
  useEffect(()=>{document.documentElement.classList.toggle('dark',darkMode);window.localStorage.setItem('blu-theme',darkMode?'dark':'light')},[darkMode]);
  useEffect(()=>{const listener=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchInputRef.current?.focus();setSearchOpen(true)}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[]);

  const rawUserName = String(authDisplayName || user?.name || '').trim();
  const companyName = String(user?.companyName || '').trim();
  const fallbackUserName = String(user?.email || 'Usuário Blu').split('@')[0] || 'Usuário Blu';
  const footerUserName = !rawUserName || rawUserName === companyName || /blu tecnologias/i.test(rawUserName) ? fallbackUserName : rawUserName;
  const initials = footerUserName.split(/\s+/).filter(Boolean).slice(0,2).map((item)=>item[0]?.toUpperCase()).join('') || 'U';
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {mobileOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-white/10 dark:bg-slate-950 ${collapsed ? 'w-[76px]' : 'w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5 dark:border-white/10">
          <BluLogo compact={collapsed} />
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-white/10" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-[#0877ff] shadow-sm dark:border dark:border-blue-300/20 dark:bg-blue-500/[0.18] dark:text-blue-100 dark:shadow-blue-950/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={18} strokeWidth={1.9} />{!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3 dark:border-white/10">
          <button onClick={() => navigate('/admin/perfil')} title="Meu perfil" className={`flex w-full items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/8 ${collapsed ? 'justify-center' : ''}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">{initials}</div>
            {!collapsed && <div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-semibold">{footerUserName}</p><p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{companyName || 'Minha empresa'}</p></div>}
          </button>
        </div>
        <button onClick={() => setCollapsed((value) => !value)} className="absolute -right-3 top-[86px] hidden h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm lg:grid dark:border-white/10 dark:bg-slate-900 dark:text-slate-300" aria-label="Recolher menu">{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
      </aside>
      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7 dark:border-white/10 dark:bg-slate-950/90">
          <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden dark:border-white/10 dark:text-slate-300" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="min-w-0"><h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1><p className="hidden text-xs text-slate-400 sm:block">{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p></div>
          <div className="relative ml-auto hidden w-full max-w-[420px] md:block" onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/8">
              <Search size={17} className="text-slate-400"/>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false);
                  if (event.key === 'Enter' && searchResults[0]) openSearchResult(searchResults[0].to);
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Buscar páginas ou funcionalidades..."
              />
              <kbd className="rounded border bg-white px-1.5 text-[10px] text-slate-400 dark:border-white/10 dark:bg-slate-900">⌘K</kbd>
            </div>
            {searchOpen && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Busca rápida</p>
                </div>
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {searchResults.map((item) => (
                    <button key={`${item.to}-${item.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => openSearchResult(item.to)} className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-blue-50 dark:hover:bg-white/8">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-300">{item.description}</p>
                    </button>
                  ))}
                  {!searchResults.length && <p className="px-3 py-8 text-center text-sm text-slate-500">Nenhuma página ou funcionalidade encontrada.</p>}
                </div>
              </div>
            )}
          </div>
          <button onClick={()=>setDarkMode((value)=>!value)} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label={darkMode?'Mudar para tema claro':'Mudar para tema escuro'} title={darkMode?'Tema claro':'Tema escuro'}>{darkMode?<Sun size={19}/>:<Moon size={19}/>}</button>
          <button className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Ajuda"><HelpCircle size={19}/></button>
          <div className="relative">
            <button onClick={()=>setNotificationOpen((value)=>!value)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Notificações">
              <Bell size={19}/>{todayOpportunities.length+certificateAlerts.length>0&&<span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{todayOpportunities.length+certificateAlerts.length}</span>}
            </button>
            {notificationOpen&&<div className="absolute right-0 top-12 z-50 w-[min(400px,90vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-4"><h3 className="font-bold">Notificações</h3><p className="mt-1 text-xs text-slate-500">Oportunidades e documentos que precisam da sua atenção.</p></div>
              <div className="max-h-[460px] overflow-y-auto">
                {certificateAlerts.length>0&&<div><p className="bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">Certidões</p>{certificateAlerts.map(item=>{const today=new Date();today.setHours(0,0,0,0);const days=Math.ceil((new Date(`${item.expiryDate}T12:00:00`).getTime()-today.getTime())/86400000);return <button key={item.id} onClick={()=>{setNotificationOpen(false);navigate('/admin/documentos')}} className="block w-full border-b border-slate-100 p-4 text-left hover:bg-amber-50"><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className={`mt-1 text-xs font-semibold ${days<=0?'text-rose-600':'text-amber-600'}`}>{days<0?'Certidão vencida':days===0?'Vence hoje':`Vence em ${days} dia${days===1?'':'s'}`}</p></button>})}</div>}
                {todayOpportunities.length>0&&<div><p className="bg-blue-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">Oportunidades de hoje</p>{todayOpportunities.map((item)=><button key={item.externalId} onClick={()=>{setNotificationOpen(false);navigate('/admin/oportunidades')}} className="block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50"><p className="text-xs font-bold uppercase text-blue-600">{item.organizationName}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{item.object}</p><p className="mt-2 text-xs text-slate-400">Publicado hoje · {item.processNumber||item.procurementNumber}</p></button>)}</div>}
                {todayOpportunities.length===0&&certificateAlerts.length===0&&<p className="p-8 text-center text-sm text-slate-500">Nenhuma notificação nova.</p>}
              </div>
              <button onClick={()=>{setNotificationOpen(false);navigate('/admin/oportunidades')}} className="w-full border-t border-slate-100 p-3 text-xs font-semibold text-blue-600">Configurar áreas de interesse</button>
            </div>}
          </div>
        </header>
        <main className="p-4 md:p-7">
          {['PAST_DUE','GRACE_PERIOD','PAYMENT_PENDING','SUSPENDED'].includes(subscriptionStatus)&&<div className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${subscriptionStatus==='SUSPENDED'?'border-rose-200 bg-rose-50 text-rose-800':'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {subscriptionStatus==='SUSPENDED'?'Assinatura suspensa por atraso. Regularize o pagamento para voltar a realizar alterações no sistema.':'Pagamento pendente. Você tem até 7 dias de tolerância antes do bloqueio de escrita.'}
            <button onClick={()=>navigate('/admin/assinatura')} className="ml-3 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Atualizar pagamento</button>
          </div>}
          {billingRestricted ? <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-bold">Acesso temporariamente bloqueado</h2><p className="mt-2 text-sm text-slate-500">O pagamento está em atraso acima do período de tolerância. Seus dados estão preservados; regularize a assinatura para continuar usando a Blu.</p><button onClick={()=>navigate('/admin/assinatura')} className="mt-5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Atualizar pagamento</button></div> : currentPageAllowed ? <Outlet /> : <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-bold">Acesso restrito</h2><p className="mt-2 text-sm text-slate-500">Seu tipo de usuário não possui permissão para acessar esta página. Solicite ajuste em Configurações › Níveis de acesso.</p><button onClick={()=>navigate('/admin/dashboard')} className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Voltar ao dashboard</button></div>}
        </main>
      </div>
    </div>
  );
};
