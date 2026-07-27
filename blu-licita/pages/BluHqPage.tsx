import React from 'react';
import { ArrowUpRight, Building2, CreditCard, DollarSign, Headphones, Loader2, Megaphone, RefreshCw, Search, Users, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { hqService, type HqCustomerRow, type HqOverview } from '../services/hqService';
import { platformTeamService, type PlatformTeamMember } from '../services/platformTeamService';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const statusTone = (status: string): 'blue' | 'emerald' | 'rose' | 'amber' => {
  if (status === 'Ativo') return 'emerald';
  if (status === 'Teste') return 'blue';
  if (status === 'Atenção') return 'amber';
  if (status === 'Bloqueado') return 'rose';
  return 'blue';
};

export const BluHqPage: React.FC = () => {
  const [data, setData] = React.useState<HqOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedTenantId, setSelectedTenantId] = React.useState('');
  const [prospectsOpen, setProspectsOpen] = React.useState(false);
  const [partnersOpen, setPartnersOpen] = React.useState(false);
  const [bluTeamMembers, setBluTeamMembers] = React.useState<PlatformTeamMember[]>([]);
  const [bluTeamOpen, setBluTeamOpen] = React.useState(false);
  const [bluTeamSaving, setBluTeamSaving] = React.useState(false);
  const [bluTeamForm, setBluTeamForm] = React.useState({ name: '', email: '', phone: '', role: 'Blu Team', department: 'Plataforma Blu' });
  const [savingTenant, setSavingTenant] = React.useState(false);
  const [tenantForm, setTenantForm] = React.useState({
    displayName: '',
    legalName: '',
    fantasyName: '',
    owner: '',
    planId: '',
    status: '',
    companyDocument: '',
    companySize: '',
    companyLegalNature: '',
    companyStateRegistration: '',
    companyMunicipalRegistration: '',
    companyEmail: '',
    companyPhone: '',
    companyMobile: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await hqService.overview());
      setError('');
    } catch (reason: any) {
      console.error('Erro ao carregar Blu HQ:', reason);
      setData(null);
      setError(reason?.code === 'permission-denied'
        ? 'Sem permissão para carregar o Blu HQ. Publique as regras atualizadas do Firestore.'
        : reason?.message || 'Não foi possível carregar os dados do Blu HQ.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    platformTeamService.list().then(setBluTeamMembers).catch(() => setBluTeamMembers([]));
  }, []);

  const tenants = React.useMemo(
    () => (data?.tenants || []).filter((item) => `${item.company} ${item.owner} ${item.plan} ${item.status}`.toLowerCase().includes(search.toLowerCase())),
    [data?.tenants, search],
  );
  const prospects = React.useMemo(
    () => (data?.prospects || []).filter((item) => `${item.name} ${item.source} ${item.stage} ${item.value}`.toLowerCase().includes(search.toLowerCase())),
    [data?.prospects, search],
  );
  const incompleteCustomers = React.useMemo(
    () => (data?.incompleteCustomers || []).filter((item) => `${item.company} ${item.owner} ${item.email} ${item.phone} ${item.plan} ${item.reason}`.toLowerCase().includes(search.toLowerCase())),
    [data?.incompleteCustomers, search],
  );
  const selectedTenant = React.useMemo(() => data?.tenants.find((item) => item.id === selectedTenantId) || null, [data?.tenants, selectedTenantId]);
  const tenantMembers = React.useMemo(() => (data?.members || []).filter((item) => item.companyId === selectedTenantId), [data?.members, selectedTenantId]);

  const saveBluTeamMember = async () => {
    if (!bluTeamForm.name || !bluTeamForm.email) return;
    setBluTeamSaving(true);
    try {
      await platformTeamService.invite({
        name: bluTeamForm.name,
        email: bluTeamForm.email,
        phone: bluTeamForm.phone,
        role: bluTeamForm.role,
        department: bluTeamForm.department,
      });
      setBluTeamForm({ name: '', email: '', phone: '', role: 'Blu Team', department: 'Plataforma Blu' });
      await platformTeamService.list().then(setBluTeamMembers).catch(() => setBluTeamMembers([]));
    } finally {
      setBluTeamSaving(false);
    }
  };

  React.useEffect(() => {
    if (!selectedTenant) return;
    setTenantForm({
      displayName: selectedTenant.company || '',
      legalName: selectedTenant.companyLegalName || selectedTenant.companyTradeName || selectedTenant.companyName || '',
      fantasyName: selectedTenant.companyFantasyName || '',
      owner: selectedTenant.owner || '',
      planId: selectedTenant.planId || '',
      status: selectedTenant.accessStatus || selectedTenant.status || '',
      companyDocument: selectedTenant.companyDocument || '',
      companySize: selectedTenant.companySize || '',
      companyLegalNature: selectedTenant.companyLegalNature || '',
      companyStateRegistration: selectedTenant.companyStateRegistration || '',
      companyMunicipalRegistration: selectedTenant.companyMunicipalRegistration || '',
      companyEmail: selectedTenant.companyEmail || '',
      companyPhone: selectedTenant.companyPhone || '',
      companyMobile: selectedTenant.companyMobile || '',
      zipCode: selectedTenant.zipCode || '',
      street: selectedTenant.street || '',
      number: selectedTenant.number || '',
      complement: selectedTenant.complement || '',
      neighborhood: selectedTenant.neighborhood || '',
      city: selectedTenant.city || '',
      state: selectedTenant.state || '',
    });
  }, [selectedTenant]);

  const saveTenant = async () => {
    if (!selectedTenant) return;
    setSavingTenant(true);
    try {
      await updateDoc(doc(db, 'companies', selectedTenant.id), {
        name: tenantForm.displayName,
        tradeName: tenantForm.displayName,
        razaoSocial: tenantForm.legalName,
        nomeFantasia: tenantForm.fantasyName,
        document: tenantForm.companyDocument,
        porte: tenantForm.companySize,
        naturezaJuridica: tenantForm.companyLegalNature,
        inscricaoEstadual: tenantForm.companyStateRegistration,
        inscricaoMunicipal: tenantForm.companyMunicipalRegistration,
        email: tenantForm.companyEmail,
        phone: tenantForm.companyPhone,
        telefoneFixo: tenantForm.companyPhone,
        telefoneCelular: tenantForm.companyMobile,
        cep: tenantForm.zipCode,
        logradouro: tenantForm.street,
        numero: tenantForm.number,
        complemento: tenantForm.complement,
        bairro: tenantForm.neighborhood,
        municipio: tenantForm.city,
        uf: tenantForm.state,
        accessStatus: tenantForm.status,
        updatedAt: new Date().toISOString(),
      });
      if (selectedTenant.subscriptionId) {
        await updateDoc(doc(db, 'subscriptions', selectedTenant.subscriptionId), {
          planId: tenantForm.planId,
          status: tenantForm.status || selectedTenant.status,
          updatedAt: new Date().toISOString(),
        });
      }
      await load();
      setSelectedTenantId('');
    } finally {
      setSavingTenant(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-950 p-7 text-white shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-200">Blu HQ</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Gestão comercial da plataforma</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Dados reais de clientes SaaS, prospects, assinaturas, pagamentos e chamados registrados no banco.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
          Atualizar
        </button>
      </header>

      {error && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100">{error}</section>}

      {loading ? (
        <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Building2 />} label="Clientes SaaS" value={String(data?.metrics.customers || 0)} detail="Empresas com ambiente criado" />
            <Metric icon={<Users />} label="Prospects" value={String(data?.metrics.prospects || 0)} detail="Leads e prospects reais" />
            <Metric icon={<DollarSign />} label="MRR atual" value={formatCurrency(data?.metrics.mrr || 0)} detail="Calculado pelos planos ativos/teste" />
            <Metric icon={<CreditCard />} label="Cobranças críticas" value={String(data?.metrics.criticalCharges || 0)} detail="Pendentes, expiradas ou falhas" tone="rose" />
            <Metric icon={<Users />} label="Usuários" value={String(data?.metrics.users || 0)} detail="Membros e proprietários cadastrados" />
            <Metric icon={<Megaphone />} label="Leads do site" value={String(data?.metrics.leads || 0)} detail="Contatos vindos do Fale Conosco" />
            <Metric icon={<RefreshCw />} label="Testes grátis" value={String(data?.metrics.trialCompanies || 0)} detail="Empresas em período gratuito" />
            <Metric icon={<Users />} label="Cadastros incompletos" value={String(data?.metrics.incompleteCustomers || 0)} detail="Empresas ou vínculos que ainda pedem revisão" tone="amber" />
            <Metric icon={<Users />} label="Parceiros" value={String(data?.metrics.partners || 0)} detail="Revendedores e parceiros cadastrados" />
            <Metric icon={<ArrowUpRight />} label="Movimentos de plano" value={`${String(data?.metrics.upgrades || 0)} / ${String(data?.metrics.downgrades || 0)}`} detail="Upgrades / downgrades registrados" />
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-300/20 dark:bg-amber-500/10">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-amber-700 dark:text-amber-100">Fila comercial</p>
                <h2 className="mt-2 text-xl font-black text-amber-950 dark:text-white">Cadastros incompletos</h2>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/80">Aqui estão os clientes que entraram pelo teste grátis ou pelo cadastro comum, mas ainda precisam de contato para completar os dados.</p>
              </div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{incompleteCustomers.length} cliente(s) para tratar</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              {incompleteCustomers.length ? (
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-amber-100/60 text-[10px] uppercase tracking-wide text-amber-800 dark:bg-white/5 dark:text-amber-100/80">
                    <tr>{['Empresa', 'Responsável', 'E-mail', 'Telefone', 'Plano', 'Status', 'Pendência'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200/60 dark:divide-white/10">
                    {incompleteCustomers.map((item) => (
                      <tr key={item.id} className="bg-white/60 dark:bg-white/[0.03]">
                        <td className="px-4 py-4 font-bold text-amber-950 dark:text-white">{item.company}</td>
                        <td className="px-4 text-amber-900 dark:text-amber-100">{item.owner || '—'}</td>
                        <td className="px-4 text-amber-900 dark:text-amber-100">{item.email || '—'}</td>
                        <td className="px-4 text-amber-900 dark:text-amber-100">{item.phone || '—'}</td>
                        <td className="px-4"><Badge tone={item.status === 'Ativo' ? 'emerald' : item.status === 'Teste' ? 'blue' : 'amber'}>{item.plan}</Badge></td>
                        <td className="px-4"><Badge tone={item.status === 'Bloqueado' ? 'rose' : 'amber'}>{item.status}</Badge></td>
                        <td className="px-4 text-amber-900 dark:text-amber-100">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Nenhum cadastro incompleto" description="Quando faltar contato, assinatura ou dados essenciais, o comercial verá aqui." compact />
              )}
            </div>
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
                <div>
                  <h2 className="text-xl font-black">Clientes da plataforma</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Empresas reais em `companies`, assinaturas em `subscriptions` e planos em `plans`.</p>
                </div>
                <div className="flex w-full max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 md:max-w-[340px] dark:border-white/10 dark:bg-white/8">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="Buscar cliente..."
                  />
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                {tenants.length ? (
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-white/5">
                      <tr>{['Empresa', 'Responsável', 'Plano', 'Status', 'MRR', 'Saúde'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {tenants.map((item) => (
                        <tr key={item.id} className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-white/5" onClick={() => setSelectedTenantId(item.id)}>
                          <td className="px-4 py-4 font-bold">{item.company}</td>
                          <td className="px-4">{item.owner}</td>
                          <td className="px-4">{item.plan}</td>
                          <td className="px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                              {(!item.companyDocument || !item.subscriptionId) && <Badge tone="amber">Pendente revisão</Badge>}
                            </div>
                          </td>
                          <td className="px-4 font-semibold">{formatCurrency(item.mrr)}</td>
                          <td className="px-4">{item.health}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="Nenhum cliente encontrado" description="Quando empresas reais forem cadastradas, elas aparecerão aqui." />
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Pipeline de prospects, leads e testes</h2>
                  <button onClick={() => setProspectsOpen(true)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]">Abrir em popup</button>
                </div>
                <div className="mt-4 space-y-3">
                  {prospects.slice(0, 3).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{item.name}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.source}</p>
                        </div>
                        <ArrowUpRight size={16} className="text-blue-600" />
                      </div>
                      <p className="mt-4 text-sm font-semibold">{item.stage}</p>
                      <p className="mt-1 text-xs text-blue-600">{item.value}</p>
                    </article>
                  ))}
                  {!prospects.length && <EmptyState title="Nenhum prospect real" description="Leads do site (Fale Conosco), clientes em teste e prospects comerciais aparecerão nesta fila." compact />}
                </div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Parceiros da Blu</h2>
                  <button onClick={() => setPartnersOpen(true)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]">Abrir em popup</button>
                </div>
                <div className="mt-4 space-y-3">
                  {(data?.partners || []).slice(0, 3).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{item.name}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.companyName || item.legalName || '—'}</p>
                        </div>
                        <ArrowUpRight size={16} className="text-blue-600" />
                      </div>
                      <p className="mt-4 text-sm font-semibold">{item.referralCode || 'Sem código'}</p>
                      <p className="mt-1 text-xs text-blue-600">{item.type || 'revendedor'}</p>
                    </article>
                  ))}
                  {!data?.partners?.length && <EmptyState title="Nenhum parceiro real" description="Os parceiros cadastrados pelo novo portal aparecerão aqui." compact />}
                </div>
              </section>
              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900 shadow-sm dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-100">
                <div className="flex gap-3">
                  <Megaphone className="shrink-0" />
                  <div><h2 className="font-black">Leads do site</h2><p className="mt-1 text-sm leading-6">Os contatos de Fale Conosco deixam de ficar em Clientes e passam a ser acompanhados aqui, dentro do Blu HQ, ao lado de testes gratuitos e oportunidades comerciais.</p></div>
                </div>
              </section>
              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900 shadow-sm dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-100">
                <div className="flex gap-3">
                  <Megaphone className="shrink-0" />
                  <div><h2 className="font-black">Novidades do produto</h2><p className="mt-1 text-sm leading-6">A página “Novidades” segue disponível apenas para o admin da Blu e ajuda o time interno a acompanhar lançamentos, vendas e movimentações comerciais.</p></div>
                </div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <h2 className="flex items-center gap-2 text-xl font-black"><Headphones className="text-blue-600" size={20} />Atendimento e SAC</h2>
                <div className="mt-4 space-y-3">
                  {(data?.supportQueue || []).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                      <p className="text-sm font-black">{item.subject}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.company}</p>
                      <p className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-200">{item.status}</p>
                    </article>
                  ))}
                  {!data?.supportQueue?.length && <EmptyState title="Fila de suporte vazia" description="Chamados abertos aparecerão aqui." compact />}
                </div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black">Equipe Blu</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Pessoas com acesso aos itens da Plataforma Blu do menu.</p>
                  </div>
                  <button onClick={() => setBluTeamOpen((value) => !value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]">
                    {bluTeamOpen ? 'Fechar formulário' : 'Novo membro Blu'}
                  </button>
                </div>
                {bluTeamOpen && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Field label="Nome" value={bluTeamForm.name} onChange={(value) => setBluTeamForm((current) => ({ ...current, name: value }))} />
                    <Field label="E-mail" value={bluTeamForm.email} onChange={(value) => setBluTeamForm((current) => ({ ...current, email: value }))} />
                    <Field label="Telefone" value={bluTeamForm.phone} onChange={(value) => setBluTeamForm((current) => ({ ...current, phone: value }))} />
                    <Field label="Cargo" value={bluTeamForm.role} onChange={(value) => setBluTeamForm((current) => ({ ...current, role: value }))} />
                    <Field label="Departamento" value={bluTeamForm.department} onChange={(value) => setBluTeamForm((current) => ({ ...current, department: value }))} />
                    <div className="flex items-end">
                      <button onClick={saveBluTeamMember} disabled={bluTeamSaving || !bluTeamForm.name || !bluTeamForm.email} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{bluTeamSaving ? 'Enviando...' : 'Convidar membro Blu'}</button>
                    </div>
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {bluTeamMembers.map((member) => (
                    <article key={member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{member.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-300">{member.email}</p>
                        </div>
                        <Badge tone={member.status === 'active' ? 'emerald' : 'amber'}>{member.status}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{member.role} · {member.department || 'Plataforma Blu'}</p>
                    </article>
                  ))}
                  {!bluTeamMembers.length && <EmptyState title="Nenhum membro Blu" description="Convide pessoas para acessar os itens da Plataforma Blu." compact />}
                </div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <h2 className="text-xl font-black">Usuários da plataforma</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Todos os usuários vinculados às empresas e aos testes grátis aparecem aqui.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[740px] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-white/[0.05]">
                      <tr>{['Usuário', 'E-mail', 'Empresa', 'Perfil', 'Status'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {(data?.members || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 font-bold">{item.name}</td>
                          <td className="px-4 text-slate-500 dark:text-slate-300">{item.email}</td>
                          <td className="px-4">{item.company}</td>
                          <td className="px-4">{item.role}</td>
                          <td className="px-4"><Badge tone={item.status === 'active' ? 'emerald' : 'amber'}>{item.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data?.members?.length && <EmptyState title="Nenhum usuário encontrado" description="Usuários convidados, do teste grátis e da equipe aparecerão aqui." />}
                </div>
              </section>
            </div>
          </section>
        </>
      )}

      {selectedTenant && (
        <Modal title={`Editar cliente · ${selectedTenant.company}`} close={() => setSelectedTenantId('')}>
          <div className="space-y-5">
            <section className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
              <div className="grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
                {selectedTenant.logoUrl ? <img src={selectedTenant.logoUrl} alt="Logo" className="h-full w-full object-contain p-3" /> : <Building2 size={32} className="text-slate-300" />}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoChip label="Nome de exibição" value={selectedTenant.company || '—'} />
                <InfoChip label="Razão social" value={selectedTenant.companyLegalName || selectedTenant.companyTradeName || selectedTenant.companyName || '—'} />
                <InfoChip label="Nome fantasia" value={selectedTenant.companyFantasyName || '—'} />
                <InfoChip label="Porte" value={selectedTenant.companySize || '—'} />
                <InfoChip label="Natureza jurídica" value={selectedTenant.companyLegalNature || '—'} />
                <InfoChip label="CNPJ" value={selectedTenant.companyDocument || '—'} />
              </div>
            </section>
            <section className="grid gap-3 md:grid-cols-2">
              <Field label="Nome de exibição" value={tenantForm.displayName} onChange={(value) => setTenantForm((current) => ({ ...current, displayName: value }))} />
              <Field label="Razão social" value={tenantForm.legalName} onChange={(value) => setTenantForm((current) => ({ ...current, legalName: value }))} />
              <Field label="Nome fantasia" value={tenantForm.fantasyName} onChange={(value) => setTenantForm((current) => ({ ...current, fantasyName: value }))} />
              <Field label="Responsável" value={tenantForm.owner} onChange={(value) => setTenantForm((current) => ({ ...current, owner: value }))} />
              <Field label="CNPJ" value={tenantForm.companyDocument} onChange={(value) => setTenantForm((current) => ({ ...current, companyDocument: value }))} />
              <Field label="Porte" value={tenantForm.companySize} onChange={(value) => setTenantForm((current) => ({ ...current, companySize: value }))} />
              <Field label="Natureza jurídica" value={tenantForm.companyLegalNature} onChange={(value) => setTenantForm((current) => ({ ...current, companyLegalNature: value }))} />
              <Field label="Inscrição estadual" value={tenantForm.companyStateRegistration} onChange={(value) => setTenantForm((current) => ({ ...current, companyStateRegistration: value }))} />
              <Field label="Inscrição municipal" value={tenantForm.companyMunicipalRegistration} onChange={(value) => setTenantForm((current) => ({ ...current, companyMunicipalRegistration: value }))} />
              <Field label="E-mail" value={tenantForm.companyEmail} onChange={(value) => setTenantForm((current) => ({ ...current, companyEmail: value }))} />
              <Field label="Telefone" value={tenantForm.companyPhone} onChange={(value) => setTenantForm((current) => ({ ...current, companyPhone: value }))} />
              <Field label="Celular" value={tenantForm.companyMobile} onChange={(value) => setTenantForm((current) => ({ ...current, companyMobile: value }))} />
              <Field label="Plano ID" value={tenantForm.planId} onChange={(value) => setTenantForm((current) => ({ ...current, planId: value }))} />
              <Field label="Status de acesso" value={tenantForm.status} onChange={(value) => setTenantForm((current) => ({ ...current, status: value }))} />
              <Field label="CEP" value={tenantForm.zipCode} onChange={(value) => setTenantForm((current) => ({ ...current, zipCode: value }))} />
              <Field label="Logradouro" value={tenantForm.street} onChange={(value) => setTenantForm((current) => ({ ...current, street: value }))} />
              <Field label="Número" value={tenantForm.number} onChange={(value) => setTenantForm((current) => ({ ...current, number: value }))} />
              <Field label="Complemento" value={tenantForm.complement} onChange={(value) => setTenantForm((current) => ({ ...current, complement: value }))} />
              <Field label="Bairro" value={tenantForm.neighborhood} onChange={(value) => setTenantForm((current) => ({ ...current, neighborhood: value }))} />
              <Field label="Município" value={tenantForm.city} onChange={(value) => setTenantForm((current) => ({ ...current, city: value }))} />
              <Field label="UF" value={tenantForm.state} onChange={(value) => setTenantForm((current) => ({ ...current, state: value }))} />
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Cadastro completo do Perfil</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <InfoChip label="Inscrição estadual" value={selectedTenant.companyStateRegistration || '—'} />
                <InfoChip label="Inscrição municipal" value={selectedTenant.companyMunicipalRegistration || '—'} />
                <InfoChip label="E-mail financeiro" value={selectedTenant.companyEmail || '—'} />
                <InfoChip label="Telefone fixo" value={selectedTenant.companyPhone || '—'} />
                <InfoChip label="Telefone celular" value={selectedTenant.companyMobile || '—'} />
                <InfoChip label="CNPJ" value={selectedTenant.companyDocument || '—'} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InfoChip label="CEP" value={selectedTenant.zipCode || '—'} />
                <InfoChip label="Logradouro" value={selectedTenant.street || '—'} />
                <InfoChip label="Número" value={selectedTenant.number || '—'} />
                <InfoChip label="Complemento" value={selectedTenant.complement || '—'} />
                <InfoChip label="Bairro" value={selectedTenant.neighborhood || '—'} />
                <InfoChip label="Município / UF" value={[selectedTenant.city, selectedTenant.state].filter(Boolean).join(' / ') || '—'} />
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Limites e uso</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <InfoChip label="Usuários" value={String(selectedTenant.companyUsersCount || 0)} />
                <InfoChip label="Assinatura" value={selectedTenant.subscriptionId || '—'} />
                <InfoChip label="Próxima cobrança" value={selectedTenant.nextBillingDate ? new Date(selectedTenant.nextBillingDate).toLocaleDateString('pt-BR') : '—'} />
                <InfoChip label="Fim do teste" value={selectedTenant.trialEndsAt ? new Date(selectedTenant.trialEndsAt).toLocaleDateString('pt-BR') : '—'} />
                <InfoChip label="Ciclo atual" value={selectedTenant.currentPeriodEndsAt ? new Date(selectedTenant.currentPeriodEndsAt).toLocaleDateString('pt-BR') : '—'} />
                <InfoChip label="Plano atual" value={selectedTenant.plan || '—'} />
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Sócios, representantes e atividades</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-black">Sócios</p>
                  {(selectedTenant.partners || []).length ? (selectedTenant.partners || []).map((item: any, index: number) => (
                    <div key={`${item.id || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="font-black">{item.nome || item.name || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.numeroInscricao || item.cpf || item.cnpj || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.qualificacao || '—'}</p>
                    </div>
                  )) : <EmptyState title="Sem sócios" description="Os sócios do perfil aparecerão aqui." compact />}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-black">Representantes</p>
                  {(selectedTenant.representatives || []).length ? (selectedTenant.representatives || []).map((item: any, index: number) => (
                    <div key={`${item.id || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="font-black">{item.nome || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.cpf || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.cargo || '—'}</p>
                    </div>
                  )) : <EmptyState title="Sem representantes" description="Os representantes do perfil aparecerão aqui." compact />}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-black">Atividades / CNAEs</p>
                  {(selectedTenant.activities || []).length ? (selectedTenant.activities || []).map((item: any, index: number) => (
                    <div key={`${item.id || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="font-black">{item.codigo || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.descricao || '—'}</p>
                    </div>
                  )) : <EmptyState title="Sem atividades" description="As atividades econômicas do perfil aparecerão aqui." compact />}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-black">Demonstrativos</p>
                {(selectedTenant.statements || []).length ? (selectedTenant.statements || []).map((item: any, index: number) => (
                  <div key={`${item.id || index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <div>
                      <p className="font-black">{item.titulo || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{item.ano || '—'}</p>
                    </div>
                    <p className="text-xs font-bold text-blue-600">{item.fileUrl ? 'Anexo disponível' : 'Sem arquivo'}</p>
                  </div>
                )) : <EmptyState title="Sem demonstrativos" description="Os demonstrativos do perfil aparecerão aqui." compact />}
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Equipe vinculada</h3>
              <div className="mt-3 space-y-2">
                {tenantMembers.map((member) => (
                  <div key={member.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/[0.04]">
                    <div>
                      <p className="font-black">{member.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-950">{member.role}</span>
                      <Badge tone={member.status === 'active' ? 'emerald' : 'amber'}>{member.status}</Badge>
                    </div>
                  </div>
                ))}
                {!tenantMembers.length && <EmptyState title="Nenhum membro" description="Os membros dessa empresa aparecerão aqui." compact />}
              </div>
            </section>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedTenantId('')} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100">Fechar</button>
              <button onClick={saveTenant} disabled={savingTenant} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{savingTenant ? 'Salvando...' : 'Salvar alterações'}</button>
            </div>
          </div>
        </Modal>
      )}

      {prospectsOpen && (
        <Modal title="Prospects e leads" close={() => setProspectsOpen(false)}>
          <div className="space-y-3">
            {prospects.length ? prospects.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.source}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-blue-600" />
                </div>
                <p className="mt-3 text-sm font-semibold">{item.stage}</p>
                <p className="mt-1 text-xs text-blue-600">{item.value}</p>
              </article>
            )) : <EmptyState title="Nenhum prospect encontrado" description="Use a busca para encontrar leads e prospects reais." compact />}
          </div>
        </Modal>
      )}

      {partnersOpen && (
        <Modal title="Parceiros da Blu" close={() => setPartnersOpen(false)}>
          <div className="space-y-3">
            {(data?.partners || []).length ? (data?.partners || []).map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.companyName || item.legalName || '—'}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-blue-600" />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-300 md:grid-cols-2">
                  <p>Telefone: {item.phone || '—'}</p>
                  <p>E-mail: {item.email || '—'}</p>
                  <p>Banco: {item.bankName || '—'}</p>
                  <p>Pix: {[item.pixType, item.pixKey].filter(Boolean).join(' · ') || '—'}</p>
                </div>
              </article>
            )) : <EmptyState title="Nenhum parceiro encontrado" description="Os parceiros cadastrados aparecerão aqui." compact />}
          </div>
        </Modal>
      )}
    </div>
  );
};

const Metric = ({ icon, label, value, detail, tone = 'blue' }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: 'blue' | 'rose' }) => (
  <article className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200'}`}>{icon}</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{detail}</p>
  </article>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'emerald' | 'rose' | 'amber' }) => {
  const classes = tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>;
};

const EmptyState = ({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) => (
  <div className={`rounded-2xl border border-dashed border-slate-300 text-center dark:border-white/10 ${compact ? 'p-5' : 'p-10'}`}>
    <p className="font-black">{title}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
  </div>
);

const Modal = ({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm md:items-center md:p-6">
    <button aria-label="Fechar modal" onClick={close} className="absolute inset-0" />
    <section className="relative z-[121] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,.25)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_24px_100px_rgba(0,0,0,.55)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
        <h2 className="text-lg font-black">{title}</h2>
        <button onClick={close} className="rounded-xl px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">Fechar</button>
      </header>
      <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
    </section>
  </div>
);

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block text-xs font-black uppercase tracking-[.18em] text-slate-400">
    {label}
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
    />
  </label>
);

const InfoChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);
