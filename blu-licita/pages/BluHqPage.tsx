import React from 'react';
import { ArrowUpRight, Building2, CheckCircle2, CreditCard, DollarSign, Edit3, Headphones, Loader2, Megaphone, Plus, RefreshCw, Save, Search, Trash2, Users, X } from 'lucide-react';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { hqService, type HqCustomerRow, type HqOverview } from '../services/hqService';
import { platformTeamService, type PlatformTeamMember } from '../services/platformTeamService';
import { defaultPublicPlans, loadAllPublicPlans, savePublicPlan, seedDefaultPublicPlans, type PublicPlanDoc } from '../services/publicPlanCatalog';
import { billingProviderAdminService, type BillingProviderConfig } from '../services/billingProviderAdminService';
import { bluHqUserAdminService } from '../services/bluHqUserAdminService';
import { emailTemplateAdminService, type EmailTemplateDoc } from '../services/emailTemplateAdminService';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const maskSensitiveValue = (value?: string, visibleStart = 4) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const prefix = raw.slice(0, Math.min(visibleStart, raw.length));
  return `${prefix}${'*'.repeat(Math.max(3, raw.length - prefix.length))}`;
};

const statusTone = (status: string): 'blue' | 'emerald' | 'rose' | 'amber' => {
  if (status === 'Ativo') return 'emerald';
  if (status === 'Teste') return 'blue';
  if (status === 'Atenção') return 'amber';
  if (status === 'Bloqueado') return 'rose';
  return 'blue';
};

const tenantAccessStatusOptions = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'TRIALING', label: 'Teste grátis' },
  { value: 'PAYMENT_PENDING', label: 'Pagamento pendente' },
  { value: 'PAST_DUE', label: 'Em atraso' },
  { value: 'GRACE_PERIOD', label: 'Tolerância' },
  { value: 'SUSPENDED', label: 'Bloqueado' },
  { value: 'CANCELED', label: 'Cancelado' },
  { value: 'EXPIRED', label: 'Expirado' },
] as const;

const formatPlanLimitValue = (key: string, value: number | null | undefined) => {
  if (value == null) return 'Ilimitado';
  if (key === 'storageBytes') {
    if (value >= 1024 * 1024 * 1024) return `${Math.round(value / (1024 * 1024 * 1024))} GB`;
    if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  }
  return String(value);
};

const planLimitLabels: Record<string, string> = {
  companies: 'Empresas',
  activeContracts: 'Contratos ativos',
  storageBytes: 'Armazenamento',
  users: 'Usuários',
  aiCredits: 'Créditos de IA',
  savedSearches: 'Buscas salvas',
  activeAutomations: 'Automações',
  customAlerts: 'Alertas',
  apiRequests: 'Requisições API',
  certificates: 'Certificados',
  bankAccounts: 'Contas bancárias',
};

const emptyPlan = (): PublicPlanDoc => ({
  id: `plan-${Date.now()}`,
  name: 'Novo plano',
  slug: '',
  description: '',
  priceInCents: 0,
  billingInterval: 'month',
  intervalCount: 1,
  trialDays: 7,
  billingType: 'prepaid',
  cycles: null,
  startAt: null,
  paymentMethods: ['credit_card', 'boleto', 'debit_card'],
  installments: [1],
  limits: {
    companies: 1,
    activeContracts: 1,
    storageBytes: 1024 * 1024 * 1024,
    users: 1,
    aiCredits: 0,
    savedSearches: 0,
    activeAutomations: 0,
    customAlerts: 0,
    apiRequests: 0,
    certificates: 0,
    bankAccounts: 1,
  },
  active: true,
  public: true,
  displayOrder: 999,
});

export const BluHqPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'customers' | 'billing' | 'emails' | 'platform'>('overview');
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
  const [publicPlans, setPublicPlans] = React.useState<PublicPlanDoc[]>([]);
  const [publicPlansLoading, setPublicPlansLoading] = React.useState(true);
  const [publicPlansSaving, setPublicPlansSaving] = React.useState(false);
  const [planEditorOpen, setPlanEditorOpen] = React.useState(false);
  const [planForm, setPlanForm] = React.useState<PublicPlanDoc | null>(null);
  const [gatewayLoading, setGatewayLoading] = React.useState(true);
  const [gatewaySaving, setGatewaySaving] = React.useState(false);
  const [deletingUserId, setDeletingUserId] = React.useState('');
  const [emailTemplates, setEmailTemplates] = React.useState<EmailTemplateDoc[]>([]);
  const [emailTemplatesLoading, setEmailTemplatesLoading] = React.useState(true);
  const [emailTemplatesSavingKey, setEmailTemplatesSavingKey] = React.useState('');
  const [gatewayForm, setGatewayForm] = React.useState<BillingProviderConfig>({
    id: 'pagarme',
    name: 'Pagar.me',
    type: 'payment_gateway',
    enabled: false,
    environment: 'production',
    handle: '',
    accountId: '',
    publicKey: '',
    secretKey: '',
    bluRecipientId: '',
    posSplitFeeBps: 15,
    capabilities: ['checkout_link', 'credit_card', 'debit_card', 'installments', 'webhook', 'payment_check', 'subscription'],
  });
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
    billingDiscountPercent: '0',
    billingDiscountCents: '0',
  });
  const [showGatewaySecrets, setShowGatewaySecrets] = React.useState(false);

  const planOptions = React.useMemo(
    () => publicPlans
      .filter((plan) => plan.active)
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)),
    [publicPlans],
  );

  const selectedPlanDoc = React.useMemo(
    () => planOptions.find((plan) => plan.id === tenantForm.planId) || publicPlans.find((plan) => plan.id === tenantForm.planId) || null,
    [planOptions, publicPlans, tenantForm.planId],
  );

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
  React.useEffect(() => {
    loadAllPublicPlans()
      .then(setPublicPlans)
      .catch(() => setPublicPlans(defaultPublicPlans()))
      .finally(() => setPublicPlansLoading(false));
  }, []);
  React.useEffect(() => {
    setEmailTemplatesLoading(true);
    emailTemplateAdminService.list()
      .then(setEmailTemplates)
      .catch(() => setEmailTemplates(Object.values(emailTemplateAdminService.defaults)))
      .finally(() => setEmailTemplatesLoading(false));
  }, []);
  React.useEffect(() => {
    setGatewayLoading(true);
    billingProviderAdminService.load('pagarme')
      .then((provider) => setGatewayForm({
        id: provider.id || 'pagarme',
        name: provider.name || 'Pagar.me',
        type: provider.type || 'payment_gateway',
        enabled: provider.enabled !== false,
        environment: provider.environment || 'production',
        handle: provider.handle || provider.secretKey || '',
        accountId: provider.accountId || '',
        publicKey: provider.publicKey || (provider as any).publishableKey || (provider as any).clientKey || '',
        secretKey: provider.secretKey || provider.handle || '',
        bluRecipientId: provider.bluRecipientId || '',
        posSplitFeeBps: Number(provider.posSplitFeeBps ?? 15),
        capabilities: (provider.capabilities?.length ? provider.capabilities : ['checkout_link', 'credit_card', 'debit_card', 'installments', 'webhook', 'payment_check', 'subscription'])
          .filter((capability) => capability !== 'pix'),
      }))
      .catch(() => {
        setGatewayForm((current) => ({ ...current, id: 'pagarme', name: 'Pagar.me', type: 'payment_gateway' }));
      })
      .finally(() => setGatewayLoading(false));
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
      billingDiscountPercent: String(selectedTenant.billingDiscountPercent || 0),
      billingDiscountCents: String(selectedTenant.billingDiscountCents || 0),
    });
  }, [selectedTenant]);

  const saveTenant = async () => {
    if (!selectedTenant) return;
    setSavingTenant(true);
    try {
      const now = new Date().toISOString();
      const normalizedStatus = String(tenantForm.status || '').trim();
      const batch = writeBatch(db);

      batch.update(doc(db, 'companies', selectedTenant.id), {
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
        billingDiscountPercent: Number(tenantForm.billingDiscountPercent || 0),
        billingDiscountCents: Number(tenantForm.billingDiscountCents || 0),
        planId: tenantForm.planId,
        accessStatus: normalizedStatus,
        updatedAt: now,
      });

      if (selectedTenant.subscriptionId) {
        batch.update(doc(db, 'subscriptions', selectedTenant.subscriptionId), {
          planId: tenantForm.planId,
          status: normalizedStatus || selectedTenant.status,
          updatedAt: now,
        });
      }

      const platformCustomersByCompany = await getDocs(query(collection(db, 'platformCustomers'), where('companyId', '==', selectedTenant.id))).catch(() => null);
      platformCustomersByCompany?.docs.forEach((item) => {
        batch.update(item.ref, {
          planId: tenantForm.planId,
          accessStatus: normalizedStatus,
          status: normalizedStatus || item.data()?.status || '',
          companyDocument: tenantForm.companyDocument,
          companyName: tenantForm.displayName,
          companyLegalName: tenantForm.legalName,
          companyTradeName: tenantForm.fantasyName || tenantForm.displayName,
          companySize: tenantForm.companySize,
          companyLegalNature: tenantForm.companyLegalNature,
          ownerName: tenantForm.owner,
          ownerEmail: tenantForm.companyEmail,
          ownerPhone: tenantForm.companyMobile || tenantForm.companyPhone,
          updatedAt: now,
        });
      });

      const platformCustomerRef = doc(db, 'platformCustomers', selectedTenant.id);
      batch.set(platformCustomerRef, {
        companyId: selectedTenant.id,
        planId: tenantForm.planId,
        accessStatus: normalizedStatus,
        status: normalizedStatus,
        companyDocument: tenantForm.companyDocument,
        companyName: tenantForm.displayName,
        companyLegalName: tenantForm.legalName,
        companyTradeName: tenantForm.fantasyName || tenantForm.displayName,
        companySize: tenantForm.companySize,
        companyLegalNature: tenantForm.companyLegalNature,
        ownerName: tenantForm.owner,
        ownerEmail: tenantForm.companyEmail,
        ownerPhone: tenantForm.companyMobile || tenantForm.companyPhone,
        updatedAt: now,
      }, { merge: true });

      await batch.commit();
      await load();
      setSelectedTenantId('');
    } finally {
      setSavingTenant(false);
    }
  };

  const saveEmailTemplate = async (template: EmailTemplateDoc) => {
    setEmailTemplatesSavingKey(template.key);
    try {
      await emailTemplateAdminService.save(template);
      setEmailTemplates(await emailTemplateAdminService.list());
    } finally {
      setEmailTemplatesSavingKey('');
    }
  };

  const openPlanEditor = (plan: PublicPlanDoc) => {
    setPlanForm({
      ...plan,
      limits: {
        companies: plan.limits?.companies ?? null,
        activeContracts: plan.limits?.activeContracts ?? null,
        storageBytes: plan.limits?.storageBytes ?? null,
        users: plan.limits?.users ?? null,
        aiCredits: plan.limits?.aiCredits ?? null,
        savedSearches: plan.limits?.savedSearches ?? null,
        activeAutomations: plan.limits?.activeAutomations ?? null,
        customAlerts: plan.limits?.customAlerts ?? null,
        apiRequests: plan.limits?.apiRequests ?? null,
        certificates: plan.limits?.certificates ?? null,
        bankAccounts: plan.limits?.bankAccounts ?? null,
      },
    });
    setPlanEditorOpen(true);
  };

  const savePlan = async () => {
    if (!planForm) return;
    setPublicPlansSaving(true);
    try {
      await savePublicPlan(planForm);
      const refreshed = await loadAllPublicPlans();
      setPublicPlans(refreshed);
      setPlanEditorOpen(false);
      setPlanForm(null);
    } catch (reason: any) {
      console.error('Erro ao salvar plano público:', reason);
      setError(
        reason?.code === 'permission-denied'
          ? 'Sem permissão para salvar planos públicos. Publique as regras do Firestore para o usuário admin da Blu.'
          : reason?.message || 'Não foi possível salvar o plano.'
      );
    } finally {
      setPublicPlansSaving(false);
    }
  };

  const updatePlanForm = (patch: Partial<PublicPlanDoc>) => {
    setPlanForm((current) => current ? { ...current, ...patch } : current);
  };

  const seedPlans = async () => {
    setPublicPlansSaving(true);
    try {
      await seedDefaultPublicPlans();
      setPublicPlans(await loadAllPublicPlans());
    } catch (reason: any) {
      console.error('Erro ao sincronizar planos públicos:', reason);
      setPublicPlans(defaultPublicPlans());
      setError(
        reason?.code === 'permission-denied'
          ? 'Sem permissão para sincronizar planos públicos. Usando catálogo local até publicar as regras.'
          : reason?.message || 'Não foi possível sincronizar os planos.'
      );
    } finally {
      setPublicPlansSaving(false);
    }
  };

  const saveGateway = async () => {
    setGatewaySaving(true);
    try {
      const saved = await billingProviderAdminService.save(gatewayForm);
      setGatewayForm(saved);
      setError('');
    } catch (reason: any) {
      console.error('Erro ao salvar gateway:', reason);
      setError(reason?.message || 'Não foi possível salvar a configuração do gateway.');
    } finally {
      setGatewaySaving(false);
    }
  };

  const deletePlatformUser = async (member: { userId?: string; name: string; email: string }) => {
    const userId = String(member.userId || '').trim();
    if (!userId) {
      setError('Não foi possível identificar o usuário para exclusão.');
      return;
    }
    const confirmed = window.confirm(`Excluir definitivamente ${member.name || member.email} da Blu? Esta ação remove o usuário do Firestore e do Auth.`);
    if (!confirmed) return;
    setDeletingUserId(userId);
    try {
      await bluHqUserAdminService.delete(userId);
      await load();
    } catch (reason: any) {
      console.error('Erro ao excluir usuário da BluHQ:', reason);
      setError(reason?.message || 'Não foi possível excluir o usuário.');
    } finally {
      setDeletingUserId('');
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

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-3 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05]">
        <div className="flex flex-wrap gap-2">
          {[
            ['overview', 'Visão geral'],
            ['customers', 'Clientes e funil'],
            ['billing', 'Planos e gateway'],
            ['emails', 'E-mails'],
            ['platform', 'Plataforma Blu'],
          ].map(([key, label]) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                  active
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          </section>}

          {activeTab === 'billing' && <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Gateway de cobrança</p>
                <h2 className="mt-2 text-xl font-black">Pagar.me</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Configure a chave API do Pagar.me usada pelo checkout. Para produção, cole a chave da conta final e confirme o ambiente correto.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em]">
                <Badge tone={gatewayForm.enabled ? 'emerald' : 'amber'}>{gatewayForm.enabled ? 'Ativo' : 'Inativo'}</Badge>
                <Badge tone={gatewayForm.environment === 'sandbox' ? 'amber' : 'blue'}>{gatewayForm.environment === 'sandbox' ? 'Sandbox' : 'Produção'}</Badge>
              </div>
            </div>
            {gatewayLoading ? (
              <div className="mt-5 grid min-h-[140px] place-items-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                <Loader2 className="animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Account ID do Pagar.me</span>
                      <input
                        type={showGatewaySecrets ? 'text' : 'password'}
                        autoComplete="off"
                        value={gatewayForm.accountId || ''}
                        onChange={(event) => setGatewayForm((current) => ({ ...current, accountId: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none ring-0 transition placeholder:text-slate-400 focus:border-blue-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                        placeholder="acc_..."
                      />
                    </label>
                    <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Chave pública do Pagar.me</span>
                      <input
                      type={showGatewaySecrets ? 'text' : 'password'}
                      autoComplete="off"
                      value={gatewayForm.publicKey || ''}
                      onChange={(event) => setGatewayForm((current) => ({ ...current, publicKey: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none ring-0 transition placeholder:text-slate-400 focus:border-blue-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                      placeholder="pk_..."
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Chave secreta do Pagar.me</span>
                    <input
                      type={showGatewaySecrets ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={gatewayForm.secretKey || gatewayForm.handle}
                      onChange={(event) => setGatewayForm((current) => ({ ...current, secretKey: event.target.value, handle: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none ring-0 transition placeholder:text-slate-400 focus:border-blue-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                      placeholder="sk_..."
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Ambiente</span>
                    <select
                      value={gatewayForm.environment}
                      onChange={(event) => setGatewayForm((current) => ({ ...current, environment: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                    >
                      <option value="production">Produção</option>
                      <option value="sandbox">Sandbox</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Recipient ID da Blu</span>
                    <input value={gatewayForm.bluRecipientId || ''} onChange={(event) => setGatewayForm((current) => ({ ...current, bluRecipientId: event.target.value.trim() }))} placeholder="rp_..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"/>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Taxa Blu no PDV (%)</span>
                    <input type="number" min="0" max="100" step="0.01" value={Number(gatewayForm.posSplitFeeBps ?? 15) / 100} onChange={(event) => setGatewayForm((current) => ({ ...current, posSplitFeeBps: Math.round(Math.max(0, Math.min(100, Number(event.target.value || 0))) * 100) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"/>
                    <span className="block text-[11px] text-slate-400">Padrão: 0,15%. O cálculo final é feito exclusivamente no backend.</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={gatewayForm.enabled}
                      onChange={(event) => setGatewayForm((current) => ({ ...current, enabled: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Gateway habilitado
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                    <p className="font-black text-slate-700 dark:text-white">Capacidades publicadas</p>
                    <p className="mt-1">{gatewayForm.capabilities.join(' • ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGatewaySecrets((current) => !current)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    {showGatewaySecrets ? 'Ocultar credenciais' : 'Mostrar credenciais'}
                  </button>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Status da configuração</p>
                  <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-200">
                    <p><b className="text-slate-900 dark:text-white">ID:</b> {gatewayForm.id}</p>
                    <p><b className="text-slate-900 dark:text-white">Nome:</b> {gatewayForm.name}</p>
                    <p><b className="text-slate-900 dark:text-white">Tipo:</b> {gatewayForm.type}</p>
                    <p><b className="text-slate-900 dark:text-white">Account ID:</b> {gatewayForm.accountId ? maskSensitiveValue(gatewayForm.accountId, 6) : 'não configurado'}</p>
                    <p><b className="text-slate-900 dark:text-white">Chave pública:</b> {gatewayForm.publicKey ? maskSensitiveValue(gatewayForm.publicKey, 6) : 'não configurada'}</p>
                    <p><b className="text-slate-900 dark:text-white">Chave secreta:</b> {gatewayForm.secretKey || gatewayForm.handle ? maskSensitiveValue(gatewayForm.secretKey || gatewayForm.handle, 6) : 'não configurada'}</p>
                    <p><b className="text-slate-900 dark:text-white">Ambiente:</b> {gatewayForm.environment === 'sandbox' ? 'Sandbox' : 'Produção'}</p>
                  </div>
                  <button
                    onClick={saveGateway}
                    disabled={gatewaySaving || !(gatewayForm.secretKey || gatewayForm.handle)}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {gatewaySaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Salvar gateway
                  </button>
                </div>
              </div>
            )}
          </section>}

          {activeTab === 'billing' && <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Configuração comercial</p>
                <h2 className="mt-2 text-xl font-black">Planos públicos da Blu</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Esses planos alimentam a página de planos, o onboarding e a jornada de pagamento. O BluHQ publica aqui o catálogo oficial.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={seedPlans} disabled={publicPlansSaving} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]">
                  {publicPlansSaving ? 'Sincronizando...' : 'Sincronizar planos padrão'}
                </button>
                <button onClick={() => { setPlanForm(emptyPlan()); setPlanEditorOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-500">
                  <Plus size={16} />
                  Novo plano
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {publicPlansLoading ? (
                <div className="grid min-h-[180px] place-items-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                  <Loader2 className="animate-spin text-blue-600" />
                </div>
              ) : publicPlans.length ? publicPlans.map((plan) => (
                <article key={plan.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-400">/{plan.slug || plan.id}</p>
                      <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{plan.description || 'Capacidade configurável para a Blu.'}</p>
                    </div>
                    <Badge tone={plan.active ? 'emerald' : 'amber'}>{plan.public ? 'Público' : 'Privado'}</Badge>
                  </div>
                  <p className="mt-5 text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(plan.priceInCents)}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-slate-400">{plan.billingInterval === 'year' ? 'Cobrança anual' : 'Cobrança mensal'} · {plan.trialDays || 0} dia(s) de teste</p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-200 md:grid-cols-2">
                    <p>Empresas: <b>{plan.limits.companies ?? '∞'}</b></p>
                    <p>Usuários: <b>{plan.limits.users ?? '∞'}</b></p>
                    <p>Contratos: <b>{plan.limits.activeContracts ?? '∞'}</b></p>
                    <p>Armazenamento: <b>{plan.limits.storageBytes === null ? 'Ilimitado' : `${Math.round(plan.limits.storageBytes / 1024 / 1024 / 1024)} GB`}</b></p>
                    <p>Contas: <b>{plan.limits.bankAccounts ?? '∞'}</b></p>
                    <p>API: <b>{plan.limits.apiRequests === null ? 'Ilimitada' : plan.limits.apiRequests}</b></p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => openPlanEditor(plan)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.08]">
                      <Edit3 size={15} />
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        setPublicPlansSaving(true);
                        try {
                          await savePublicPlan({ ...plan, public: !plan.public });
                          setPublicPlans(await loadAllPublicPlans());
                        } finally {
                          setPublicPlansSaving(false);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                      disabled={publicPlansSaving}
                    >
                      {plan.public ? 'Ocultar no cadastro' : 'Publicar no cadastro'}
                    </button>
                  </div>
                </article>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-300">
                  Nenhum plano configurado ainda. Use “Sincronizar planos padrão” para criar a base comercial.
                </div>
              )}
            </div>
          </section>}

          {activeTab === 'overview' && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-300/20 dark:bg-amber-500/10">
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
          </section>}

          {activeTab === 'customers' && <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
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
                          <td className="px-4">
                            <div className="flex items-center gap-2">
                              <Badge tone={item.status === 'active' ? 'emerald' : 'amber'}>{item.status}</Badge>
                              <button
                                onClick={() => deletePlatformUser(item)}
                                disabled={deletingUserId === item.userId}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                title="Excluir usuário"
                              >
                                {deletingUserId === item.userId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data?.members?.length && <EmptyState title="Nenhum usuário encontrado" description="Usuários convidados, do teste grátis e da equipe aparecerão aqui." />}
                </div>
              </section>
            </div>
          </section>}

          {activeTab === 'emails' && (
            <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
              <div className="border-b border-slate-100 pb-4 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Comunicação</p>
                <h2 className="mt-2 text-xl font-black">Editor de e-mails da Blu</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Os convites de equipe já passam a usar este catálogo e o mesmo pipeline de envio das cobranças (`mail_queue` + SMTP configurado).</p>
              </div>
              {emailTemplatesLoading ? (
                <div className="grid min-h-[220px] place-items-center">
                  <Loader2 className="animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {emailTemplates.map((template) => (
                    <article key={template.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{template.key}</p>
                          <h3 className="mt-1 text-lg font-black">{template.name}</h3>
                        </div>
                        <button
                          onClick={() => saveEmailTemplate(template)}
                          disabled={emailTemplatesSavingKey === template.key}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                        >
                          {emailTemplatesSavingKey === template.key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Salvar
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        <Field
                          label="Assunto"
                          value={template.subject}
                          onChange={(value) => setEmailTemplates((current) => current.map((item) => item.key === template.key ? { ...item, subject: value } : item))}
                        />
                        <LongField
                          label="Texto"
                          value={template.text}
                          onChange={(value) => setEmailTemplates((current) => current.map((item) => item.key === template.key ? { ...item, text: value } : item))}
                        />
                        <LongField
                          label="HTML"
                          value={template.html}
                          onChange={(value) => setEmailTemplates((current) => current.map((item) => item.key === template.key ? { ...item, html: value } : item))}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'platform' && (
            <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black">Equipe Blu</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Membros com acesso aos itens da Plataforma Blu.</p>
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
                  {!bluTeamMembers.length && <EmptyState title="Nenhum membro Blu" description="Convide pessoas para acessar a operação interna da Blu." compact />}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_80px_rgba(0,0,0,.35)]">
                <h2 className="text-xl font-black">Usuários da plataforma</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Controle completo dos usuários vinculados a empresas e testes grátis.</p>
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
                          <td className="px-4">
                            <div className="flex items-center gap-2">
                              <Badge tone={item.status === 'active' ? 'emerald' : 'amber'}>{item.status}</Badge>
                              <button
                                onClick={() => deletePlatformUser(item)}
                                disabled={deletingUserId === item.userId}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                {deletingUserId === item.userId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data?.members?.length && <div className="mt-3"><EmptyState title="Nenhum usuário encontrado" description="Usuários convidados, em teste grátis e proprietários aparecerão aqui." compact /></div>}
                </div>
              </section>
            </section>
          )}
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
              <Field label="CEP" value={tenantForm.zipCode} onChange={(value) => setTenantForm((current) => ({ ...current, zipCode: value }))} />
              <Field label="Logradouro" value={tenantForm.street} onChange={(value) => setTenantForm((current) => ({ ...current, street: value }))} />
              <Field label="Número" value={tenantForm.number} onChange={(value) => setTenantForm((current) => ({ ...current, number: value }))} />
              <Field label="Complemento" value={tenantForm.complement} onChange={(value) => setTenantForm((current) => ({ ...current, complement: value }))} />
              <Field label="Bairro" value={tenantForm.neighborhood} onChange={(value) => setTenantForm((current) => ({ ...current, neighborhood: value }))} />
              <Field label="Município" value={tenantForm.city} onChange={(value) => setTenantForm((current) => ({ ...current, city: value }))} />
              <Field label="UF" value={tenantForm.state} onChange={(value) => setTenantForm((current) => ({ ...current, state: value }))} />
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Gestão da assinatura</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Plano</span>
                    <select
                      value={tenantForm.planId}
                      onChange={(event) => setTenantForm((current) => ({ ...current, planId: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                    >
                      <option value="">Sem plano</option>
                      {planOptions.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {formatCurrency(plan.priceInCents || 0)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Status de acesso</span>
                    <select
                      value={tenantForm.status}
                      onChange={(event) => setTenantForm((current) => ({ ...current, status: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                    >
                      <option value="">Não informado</option>
                      {tenantAccessStatusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <InfoChip label="ID do plano" value={tenantForm.planId || 'Sem plano'} />
                  <InfoChip label="Assinatura" value={selectedTenant.subscriptionId || '—'} />
                  <InfoChip label="Status atual" value={tenantForm.status || 'Não informado'} />
                  <InfoChip label="Plano exibido" value={selectedPlanDoc?.name || selectedTenant.plan || '—'} />
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Limites contratados</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {Object.entries(selectedPlanDoc?.limits || selectedTenant.planLimits || {}).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-black uppercase tracking-[.16em] text-slate-400">{planLimitLabels[key] || key}</p>
                        <p className="mt-1 font-bold text-slate-800 dark:text-slate-100">{formatPlanLimitValue(key, value as number | null | undefined)}</p>
                      </div>
                    ))}
                    {!Object.keys(selectedPlanDoc?.limits || selectedTenant.planLimits || {}).length && (
                      <EmptyState title="Sem limites vinculados" description="Selecione um plano para visualizar as capacidades deste cliente." compact />
                    )}
                  </div>
                </div>
              </div>
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
                <InfoChip label="Desconto (%)" value={String(selectedTenant.billingDiscountPercent || 0)} />
                <InfoChip label="Desconto fixo" value={formatCurrency(selectedTenant.billingDiscountCents || 0)} />
              </div>
            </section>
            <section className="grid gap-3 md:grid-cols-2">
              <Field label="Desconto percentual" value={tenantForm.billingDiscountPercent} onChange={(value) => setTenantForm((current) => ({ ...current, billingDiscountPercent: value }))} />
              <Field label="Desconto fixo em centavos" value={tenantForm.billingDiscountCents} onChange={(value) => setTenantForm((current) => ({ ...current, billingDiscountCents: value }))} />
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
                <InfoChip label="Access status" value={selectedTenant.accessStatus || '—'} />
                <InfoChip label="Limite de usuários" value={formatPlanLimitValue('users', (selectedPlanDoc?.limits?.users ?? selectedTenant.planLimits?.users) as number | null | undefined)} />
                <InfoChip label="Limite de contratos" value={formatPlanLimitValue('activeContracts', (selectedPlanDoc?.limits?.activeContracts ?? selectedTenant.planLimits?.activeContracts) as number | null | undefined)} />
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

      {planEditorOpen && planForm && (
        <Modal title={`Editar plano · ${planForm.name}`} close={() => { setPlanEditorOpen(false); setPlanForm(null); }}>
          <div className="space-y-5">
            <section className="grid gap-3 md:grid-cols-2">
              <Field label="ID do plano" value={planForm.id} onChange={(value) => updatePlanForm({ id: value, slug: planForm.slug || value })} />
              <Field label="Slug público" value={planForm.slug} onChange={(value) => updatePlanForm({ slug: value })} />
              <Field label="Nome" value={planForm.name} onChange={(value) => updatePlanForm({ name: value })} />
              <Field label="Descrição" value={planForm.description || ''} onChange={(value) => updatePlanForm({ description: value })} />
              <Field label="Preço em centavos" value={String(planForm.priceInCents)} onChange={(value) => updatePlanForm({ priceInCents: Number(value || 0) })} />
              <Field label="Cobrança" value={planForm.billingInterval} onChange={(value) => updatePlanForm({ billingInterval: value as PublicPlanDoc['billingInterval'] })} />
              <Field label="Intervalo" value={String(planForm.intervalCount ?? 1)} onChange={(value) => updatePlanForm({ intervalCount: Number(value || 1) })} />
              <Field label="Tipo de cobrança" value={planForm.billingType || 'prepaid'} onChange={(value) => updatePlanForm({ billingType: value as NonNullable<PublicPlanDoc['billingType']> })} />
              <Field label="Ciclos" value={String(planForm.cycles ?? '')} onChange={(value) => updatePlanForm({ cycles: value === '' ? null : Number(value) })} />
              <Field label="Início em" value={planForm.startAt || ''} onChange={(value) => updatePlanForm({ startAt: value || null })} />
              <Field label="Dias de teste" value={String(planForm.trialDays)} onChange={(value) => updatePlanForm({ trialDays: Number(value || 0) })} />
              <Field label="Ordem de exibição" value={String(planForm.displayOrder ?? 0)} onChange={(value) => updatePlanForm({ displayOrder: Number(value || 0) })} />
            </section>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                <span className="block text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Plano ativo</span>
                <input type="checkbox" checked={Boolean(planForm.active)} onChange={(event) => updatePlanForm({ active: event.target.checked })} className="mt-3 h-5 w-5" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                <span className="block text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Publicar no cadastro</span>
                <input type="checkbox" checked={Boolean(planForm.public)} onChange={(event) => updatePlanForm({ public: event.target.checked })} className="mt-3 h-5 w-5" />
              </label>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Métodos de pagamento</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {([
                  ['credit_card', 'Cartão de crédito'],
                  ['debit_card', 'Cartão de débito (Pinless)'],
                  ['boleto', 'Boleto'],
                ] as Array<[NonNullable<PublicPlanDoc['paymentMethods']>[number], string]>).map(([method, label]) => {
                  const selected = (planForm.paymentMethods || []).includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => updatePlanForm({
                        paymentMethods: selected
                          ? (planForm.paymentMethods || []).filter((item) => item !== method)
                          : [...(planForm.paymentMethods || []), method],
                      })}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">A Pagar.me para assinaturas não permite Pix. No cartão de crédito, a Blu não expõe parcelamento.</p>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Limites</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {([
                  ['companies', 'Empresas / CNPJs'],
                  ['activeContracts', 'Contratos ativos'],
                  ['users', 'Usuários'],
                  ['storageBytes', 'Armazenamento em bytes'],
                  ['aiCredits', 'Créditos IA'],
                  ['savedSearches', 'Pesquisas salvas'],
                  ['activeAutomations', 'Automações'],
                  ['customAlerts', 'Alertas personalizados'],
                  ['apiRequests', 'Chamadas de API'],
                  ['certificates', 'Certificados digitais'],
                  ['bankAccounts', 'Contas bancárias'],
                ] as Array<[keyof PublicPlanDoc['limits'], string]>).map(([key, label]) => (
                  <Field
                    key={String(key)}
                    label={label}
                    value={String(planForm.limits[key] ?? '')}
                    onChange={(value) => updatePlanForm({
                      limits: {
                        ...planForm.limits,
                        [key]: value === '' ? null : Number(value),
                      },
                    })}
                  />
                ))}
              </div>
            </section>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setPlanEditorOpen(false); setPlanForm(null); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100">Cancelar</button>
              <button onClick={savePlan} disabled={publicPlansSaving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                {publicPlansSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Salvar plano
              </button>
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

const LongField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block text-xs font-black uppercase tracking-[.18em] text-slate-400">
    {label}
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={6}
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
