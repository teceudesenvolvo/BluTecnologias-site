import React from "react";
import { CheckCircle2, Copy, Download, Eye, FilePlus2, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useBudgets } from "../hooks/useBudgets";
import type { Budget, BudgetInput, BudgetItemInput, BudgetStatus, BudgetType } from "../domain/budgetTypes";
import { PlanLimitWarning, usePlanLimits } from "../../hooks/usePlanLimits";
import { companySettingsService } from "../../../services/firestoreSettingsService";
import { useBluAuth } from "../../contexts/BluAuthContext";
import { FirebaseFinancialSettingsAdapter } from "../adapters/FirebaseFinancialSettingsAdapter";
import { FinancialSettingsService } from "../services/FinancialSettingsService";
import type { FinancialConfigurationInput, FinancialConfigurationRecord } from "../domain/financialSettingsTypes";
import { clientService, prospectService } from "../../../services/firebase";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (value: number) => brl.format((value || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
const yearEnd = () => `${new Date().getFullYear()}-12-31`;
const date = (value: string) => (value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const addDays = (base: string, days: number) => {
  const target = new Date(`${base || today()}T12:00:00`);
  target.setDate(target.getDate() + Math.max(0, Number(days || 0)));
  return target.toISOString().slice(0, 10);
};
const nextBudgetCode = (budgets: Budget[]) => {
  const year = new Date().getFullYear();
  const max = budgets.reduce((highest, item) => {
    const match = String(item.code || "").match(new RegExp(`ORC-${year}-(\\d+)`));
    if (!match) return highest;
    return Math.max(highest, Number(match[1] || 0));
  }, 0);
  return `ORC-${year}-${String(max + 1).padStart(4, "0")}`;
};
const proposalValidityLabel = (budget: Budget) => `${Number((budget as any).proposalValidityDays || 15)} dia(s)`;

const typeLabels: Record<BudgetType, string> = {
  business: "Empresarial",
  commercial: "Comercial",
  tender: "Licitação",
  contract: "Contrato",
  project: "Projeto",
  costCenter: "Centro de custo",
};

const statusLabels: Record<BudgetStatus, string> = {
  draft: "Rascunho",
  analysis: "Em análise",
  pendingApproval: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  revised: "Revisado",
  replaced: "Substituído",
  closed: "Encerrado",
};

const emptyItem = (): BudgetItemInput => ({
  itemType: "product",
  catalogItemId: "",
  productService: "",
  description: "",
  quantityMilliUnits: 1000,
  unit: "un",
  unitCostCents: 0,
  unitPriceCents: 0,
  taxPercent: 0,
  taxCents: 0,
  taxRegime: "",
  taxCode: "",
  serviceCode: "",
  ncm: "",
  cfop: "",
  issPercent: 0,
  icmsPercent: 0,
  pisPercent: 0,
  cofinsPercent: 0,
  logisticsCents: 0,
  additionalExpensesCents: 0,
  totalCents: 0,
  marginCents: 0,
});

const empty: BudgetInput = {
  name: "",
  code: "",
  type: "business",
  periodStart: today(),
  periodEnd: yearEnd(),
  versionNumber: 1,
  responsibleUserId: "",
  responsibleName: "",
  projectId: "",
  projectName: "",
  contractId: "",
  contractName: "",
  opportunityId: "",
  opportunityName: "",
  organizationId: "",
  organizationName: "",
  organizationSourceType: "manual",
  organizationDocument: "",
  organizationEmail: "",
  organizationPhone: "",
  organizationAddress: "",
  organizationContactName: "",
  costCenterId: "",
  costCenterName: "",
  status: "draft",
  notes: "",
  proposalIntro: "Apresentamos nossa proposta comercial conforme as condições, itens e valores relacionados abaixo. Permanecemos à disposição para ajustes, esclarecimentos e continuidade da contratação.",
  proposalCustomText: "",
  proposalValidityDays: 15,
  ...( {
    proposalAccentColor: "#0ea5e9",
    proposalHeaderTheme: "light",
    proposalShowLogo: true,
    proposalFooterText: "Sistema de Gestão Blu Tecnologias",
  } as any),
  projectFinancials: false,
  items: [emptyItem()],
};

const normalizeDigits = (value: string) => String(value || "").replace(/\D/g, "");
const joinAddress = (...parts: Array<string | undefined | null>) => parts.filter(Boolean).join(", ");
const clientLabel = (client: any) => client?.razaoSocial || client?.name || client?.contato || client?.email || "Cliente";
const clientDocument = (client: any) => client?.cnpj || client?.cpf || "";
const clientPhone = (client: any) => client?.phone || client?.telefoneCelular || client?.telefoneFixo || "";
const clientAddress = (client: any) => client?.address || joinAddress(client?.logradouro, client?.numero, client?.bairro, client?.city || client?.municipio, client?.state || client?.uf, client?.cep);
const prospectLabel = (prospect: any) =>
  prospect?.tipoOrgao === "empresa"
    ? prospect?.razaoSocial || prospect?.contato || prospect?.presidente || "Empresa"
    : prospect?.razaoSocial || `${prospect?.tipoOrgao === "camara" ? "Câmara Municipal" : prospect?.tipoOrgao === "prefeitura" ? "Prefeitura" : "Órgão"} de ${prospect?.municipio || ""}`.trim();
const prospectContact = (prospect: any) => prospect?.contato || prospect?.presidente || "";
const prospectAddress = (prospect: any) => prospect?.endereco || joinAddress(prospect?.municipio, prospect?.estado, prospect?.cep);

const proposalDesignSettings = new FinancialSettingsService(new FirebaseFinancialSettingsAdapter());
const proposalDesignKey = "budget_proposal_design";
const proposalDesignDefaults = {
  proposalAccentColor: "#0ea5e9",
  proposalHeaderTheme: "light",
  proposalShowLogo: true,
  proposalFooterText: "Sistema de Gestão Blu Tecnologias",
};
type ProposalDesignConfig = typeof proposalDesignDefaults;
const extractProposalDesign = (source: any): ProposalDesignConfig => ({
  proposalAccentColor: source?.proposalAccentColor || proposalDesignDefaults.proposalAccentColor,
  proposalHeaderTheme: source?.proposalHeaderTheme || proposalDesignDefaults.proposalHeaderTheme,
  proposalShowLogo: source?.proposalShowLogo !== false,
  proposalFooterText: source?.proposalFooterText || proposalDesignDefaults.proposalFooterText,
});
const applyProposalDesign = <T extends Record<string, any>>(source: T, design?: Partial<ProposalDesignConfig>) => ({
  ...source,
  proposalAccentColor: design?.proposalAccentColor || source?.proposalAccentColor || proposalDesignDefaults.proposalAccentColor,
  proposalHeaderTheme: design?.proposalHeaderTheme || source?.proposalHeaderTheme || proposalDesignDefaults.proposalHeaderTheme,
  proposalShowLogo: design?.proposalShowLogo ?? source?.proposalShowLogo ?? proposalDesignDefaults.proposalShowLogo,
  proposalFooterText: design?.proposalFooterText || source?.proposalFooterText || proposalDesignDefaults.proposalFooterText,
});

const useBudgetProposalDesign = () => {
  const { user } = useBluAuth();
  const [item, setItem] = React.useState<FinancialConfigurationRecord | null>(null);
  const [design, setDesign] = React.useState<ProposalDesignConfig>(proposalDesignDefaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const context = React.useMemo(
    () => ({ companyId: user?.companyId || "", userId: user?.id || "" }),
    [user],
  );

  const load = React.useCallback(async () => {
    if (!context.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const preferences = await proposalDesignSettings.load(context, "preferences");
      const record = preferences.find((entry) => entry.code === proposalDesignKey) || null;
      setItem(record);
      setDesign(
        record
          ? extractProposalDesign({
              ...record.data,
              proposalShowLogo: record.data?.proposalShowLogo !== false,
            })
          : proposalDesignDefaults,
      );
    } catch (reason: any) {
      console.error(reason);
      setError(reason?.message || "Não foi possível carregar o layout padrão da proposta.");
    } finally {
      setLoading(false);
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = React.useCallback(
    async (next: ProposalDesignConfig) => {
      if (!context.companyId) return;
      setSaving(true);
      setError("");
      try {
        const payload: FinancialConfigurationInput = {
          section: "preferences",
          name: "Layout padrão das propostas",
          code: proposalDesignKey,
          description: "Configuração visual padrão usada nas propostas de orçamento.",
          status: "active",
          order: item?.order ?? 90,
          data: {
            proposalAccentColor: next.proposalAccentColor,
            proposalHeaderTheme: next.proposalHeaderTheme,
            proposalShowLogo: next.proposalShowLogo,
            proposalFooterText: next.proposalFooterText,
          },
        };
        const id = await proposalDesignSettings.save(context, "preferences", payload, item?.id);
        setItem((current) =>
          ({
            id: item?.id || id,
            companyId: context.companyId,
            ...payload,
            createdBy: current?.createdBy || context.userId,
            updatedBy: context.userId,
          } as FinancialConfigurationRecord),
        );
        setDesign(next);
      } catch (reason: any) {
        console.error(reason);
        setError(reason?.message || "Não foi possível salvar o layout padrão da proposta.");
        throw reason;
      } finally {
        setSaving(false);
      }
    },
    [context, item],
  );

  return { design, loading, saving, error, save };
};

export const BudgetsPage = () => {
  const data = useBudgets();
  const plan = usePlanLimits();
  const proposalDesign = useBudgetProposalDesign();
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [editing, setEditing] = React.useState<Budget | undefined>();
  const [formOpen, setFormOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Budget | undefined>();
  const nextCode = React.useMemo(() => nextBudgetCode((data.budgets || []) as Budget[]), [data.budgets]);

  const budgets = (data.budgets || []) as Budget[];
  const filtered = budgets.filter(
    (item) =>
      (!search || `${item.code} ${item.name} ${item.organizationName}`.toLowerCase().includes(search.toLowerCase())) &&
      (!type || item.type === type) &&
      (!status || item.status === status),
  );
  const realized = (budget: Budget) =>
    (data.transactions || [])
      .filter((item: any) => (budget.projectId && item.projectId === budget.projectId) || (budget.contractId && item.contractId === budget.contractId) || (budget.costCenterId && item.costCenterId === budget.costCenterId))
      .filter((item: any) => ["paid", "received"].includes(item.status))
      .reduce((sum: number, item: any) => sum + Math.abs(Number(item.netAmountCents || item.amountCents || 0)), 0);
  const active = budgets.filter((item) => !["replaced", "closed"].includes(item.status));

  const execute = async (payload: any) => {
    await data.command(payload);
    setDetail(undefined);
  };

  if (data.loading) {
    return (
      <div className="grid min-h-[560px] place-items-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Planejamento comercial</p>
          <h1 className="mt-2 text-3xl font-bold">Orçamentos</h1>
          <p className="text-sm text-slate-500">Planeje, versione, aprove e acompanhe o realizado fora do módulo financeiro.</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">Modelos personalizados de proposta no plano: {plan.label("documentTemplates")}</p>
        </div>
        <button onClick={() => { setEditing(undefined); setFormOpen(true); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
          <Plus size={17} /> Novo orçamento
        </button>
      </header>

      <PlanLimitWarning>
        Orçamentos não possuem limite de quantidade nos planos atuais. A limitação aplicada aqui é para modelos personalizados de documentos/propostas: {plan.label("documentTemplates")}.
      </PlanLimitWarning>

      {data.error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{data.error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Orçamentos ativos" value={String(active.length)} />
        <Metric label="Valor total orçado" value={money(active.reduce((sum, item) => sum + item.totalBudgetedCents, 0))} />
        <Metric label="Valor aprovado" value={money(budgets.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.totalBudgetedCents, 0))} />
        <Metric label="Valor realizado" value={money(budgets.reduce((sum, item) => sum + realized(item), 0))} />
        <Metric label="Pendentes" value={String(budgets.filter((item) => item.status === "pendingApproval").length)} />
        <Metric label="Empresas" value={String((data.companies || []).length)} />
      </div>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_220px]">
        <label className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar orçamento, órgão ou código" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm" />
        </label>
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border bg-white px-3 text-sm">
          <option value="">Todos os tipos</option>
          {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border bg-white px-3 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
            <tr>{["Orçamento", "Tipo", "Validade", "Versão", "Status", "Orçado", "Realizado", "Margem", "Responsável", "Ações"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((budget) => {
              const done = realized(budget);
              return (
                <tr key={budget.id}>
                  <td className="px-4 py-4"><b>{budget.code}</b><small className="block text-slate-500">{budget.name}</small></td>
                  <td className="px-4">{typeLabels[budget.type]}</td>
                  <td className="px-4">{proposalValidityLabel(budget)}<small className="block text-slate-500">até {date(validityDate(budget))}</small></td>
                  <td className="px-4">v{budget.versionNumber}</td>
                  <td className="px-4"><Badge status={budget.status} /></td>
                  <td className="px-4 font-bold">{money(budget.totalBudgetedCents)}</td>
                  <td className="px-4">{money(done)}</td>
                  <td className={`px-4 font-bold ${budget.totalMarginCents < 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(budget.totalMarginCents)}</td>
                  <td className="px-4">{budget.responsibleName || "—"}</td>
                  <td className="px-4">
                    <div className="flex gap-1">
                      <IconButton title="Visualizar" action={() => setDetail(budget)}><Eye size={15} /></IconButton>
                      <IconButton title="Duplicar versão" action={() => execute({ action: "duplicate", budgetId: budget.id })}><Copy size={15} /></IconButton>
                      {!["approved", "replaced", "closed"].includes(budget.status) && <IconButton title="Editar" action={() => { setEditing(budget); setFormOpen(true); }}><FilePlus2 size={15} /></IconButton>}
                      <IconButton title="Excluir" action={() => { if (confirm(`Excluir o orçamento ${budget.code}? Esta ação remove a versão e seus itens.`)) execute({ action: "delete", budgetId: budget.id }); }}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={10} className="p-12 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && <BudgetForm budget={editing} data={data} nextCode={nextCode} proposalDesign={proposalDesign} close={() => setFormOpen(false)} save={async (input) => { await execute({ action: "save", budgetId: editing?.id, input }); setFormOpen(false); }} />}
      {detail && <BudgetDetails budget={detail} items={(data.items || []).filter((item: any) => item.budgetId === detail.id)} realized={realized(detail)} companies={data.companies || []} close={() => setDetail(undefined)} approve={() => execute({ action: "approve", budgetId: detail.id })} reject={() => { const reason = prompt("Motivo da rejeição"); if (reason?.trim()) execute({ action: "reject", budgetId: detail.id, reason }); }} />}
    </div>
  );
};

const BudgetForm = ({ budget, data, nextCode, proposalDesign, close, save }: { budget?: Budget; data: any; nextCode: string; proposalDesign: ReturnType<typeof useBudgetProposalDesign>; close: () => void; save: (value: BudgetInput) => Promise<void> }) => {
  const sourceItems = (data.items || [])
    .filter((item: any) => item.budgetId === budget?.id)
    .sort((a: any, b: any) => a.position - b.position)
    .map((item: any) => {
      const subtotal = Math.round(Number(item.unitPriceCents || 0) * (Number(item.quantityMilliUnits || 0) / 1000));
      return { ...item, taxPercent: Number(item.taxPercent ?? (subtotal > 0 ? (Number(item.taxCents || 0) / subtotal) * 100 : 0)) };
    });
  const [form, setForm] = React.useState<BudgetInput>(() => (
    budget
      ? applyProposalDesign({ ...budget, items: sourceItems.length ? sourceItems : [emptyItem()] }, proposalDesign.design)
      : applyProposalDesign({ ...empty, code: nextCode }, proposalDesign.design)
  ));
  const [companies, setCompanies] = React.useState<any[]>(() => data.companies || []);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [designOpen, setDesignOpen] = React.useState(false);
  const [designDraft, setDesignDraft] = React.useState<ProposalDesignConfig>(() => extractProposalDesign(budget || proposalDesign.design));
  const clients = data.clients || [];
  const prospects = data.prospects || [];
  const catalog = (data.products || []).filter((item: any) => item.active !== false);
  const recipientMode = (form as any).organizationSourceType || "manual";
  const recipientOptions = React.useMemo(
    () => [
      ...clients.map((item: any) => [`client:${item.id}`, `${clientLabel(item)} · Cliente`] as [string, string]),
      ...prospects.map((item: any) => [`prospect:${item.id}`, `${prospectLabel(item)} · Prospect`] as [string, string]),
    ],
    [clients, prospects],
  );
  const formTotals = React.useMemo(() => ({
    totalBudgetedCents: form.items.reduce((sum, item) => sum + Number(item.totalCents || 0), 0),
    totalCostCents: form.items.reduce((sum, item) => {
      const quantity = Number(item.quantityMilliUnits || 0) / 1000;
      return sum + Math.round(Number(item.unitCostCents || 0) * quantity) + Number(item.taxCents || 0) + Number(item.logisticsCents || 0) + Number(item.additionalExpensesCents || 0);
    }, 0),
    totalTaxesCents: form.items.reduce((sum, item) => sum + Number(item.taxCents || 0), 0),
    totalMarginCents: form.items.reduce((sum, item) => sum + Number(item.marginCents || 0), 0),
  }), [form.items]);

  React.useEffect(() => {
    setCompanies(data.companies || []);
  }, [data.companies]);

  React.useEffect(() => {
    if (!budget && !form.code) {
      setForm((current) => ({ ...current, code: nextCode }));
    }
  }, [budget, form.code, nextCode]);

  React.useEffect(() => {
    if (budget) return;
    setForm((current) => applyProposalDesign(current, proposalDesign.design));
    setDesignDraft((current) => ({ ...proposalDesign.design, ...current }));
  }, [budget, proposalDesign.design]);

  React.useEffect(() => {
    if (companies.length) return;
    let active = true;
    companySettingsService
      .getAll()
      .then((items) => {
        if (active && items.length) setCompanies(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [companies.length]);

  const applyDesignToForm = React.useCallback((design: ProposalDesignConfig) => {
    setForm((current) => applyProposalDesign(current, design));
  }, []);

  const updateItem = (index: number, key: keyof BudgetItemInput, value: any) => {
    const items = form.items.map((item, currentIndex) => {
      if (currentIndex !== index) return item;
      const next = { ...item, [key]: value };
      const quantity = next.quantityMilliUnits / 1000;
      const subtotalCents = Math.round(next.unitPriceCents * quantity);
      next.taxCents = Math.round((subtotalCents * Number(next.taxPercent || 0)) / 100);
      next.totalCents = subtotalCents + next.taxCents + next.logisticsCents + next.additionalExpensesCents;
      const cost = Math.round(next.unitCostCents * quantity) + next.taxCents + next.logisticsCents + next.additionalExpensesCents;
      next.marginCents = next.totalCents - cost;
      return next;
    });
    setForm({ ...form, items });
  };
  const selectCatalogItem = (index: number, catalogItemId: string) => {
    const selected = catalog.find((entry: any) => entry.id === catalogItemId);
    const items = form.items.map((item, currentIndex) => {
      if (currentIndex !== index) return item;
      const next: BudgetItemInput = {
        ...item,
        catalogItemId,
        itemType: selected?.type || item.itemType || "product",
        productService: selected?.name || item.productService,
        description: selected?.description || selected?.notes || item.description,
        unit: selected?.unit || item.unit || "un",
        unitCostCents: Number(selected?.costCents || item.unitCostCents || 0),
        unitPriceCents: Number(selected?.salePriceCents || item.unitPriceCents || 0),
        taxPercent: Number(selected?.taxPercent || item.taxPercent || 0),
        taxRegime: selected?.taxRegime || item.taxRegime || "",
        taxCode: selected?.taxCode || item.taxCode || "",
        serviceCode: selected?.serviceCode || item.serviceCode || "",
        ncm: selected?.ncm || item.ncm || "",
        cfop: selected?.cfop || item.cfop || "",
        issPercent: Number(selected?.issPercent || item.issPercent || 0),
        icmsPercent: Number(selected?.icmsPercent || item.icmsPercent || 0),
        pisPercent: Number(selected?.pisPercent || item.pisPercent || 0),
        cofinsPercent: Number(selected?.cofinsPercent || item.cofinsPercent || 0),
      };
      const quantity = next.quantityMilliUnits / 1000;
      const subtotalCents = Math.round(next.unitPriceCents * quantity);
      next.taxCents = Math.round((subtotalCents * Number(next.taxPercent || 0)) / 100);
      next.totalCents = subtotalCents + next.taxCents + next.logisticsCents + next.additionalExpensesCents;
      const cost = Math.round(next.unitCostCents * quantity) + next.taxCents + next.logisticsCents + next.additionalExpensesCents;
      next.marginCents = next.totalCents - cost;
      return next;
    });
    setForm({ ...form, items });
  };
  const applyRecipient = (mode: "client" | "prospect" | "manual", selectedValue = "") => {
    if (mode === "manual") {
      setForm({
        ...form,
        organizationSourceType: "manual",
        organizationId: "",
        organizationName: "",
        organizationDocument: "",
        organizationEmail: "",
        organizationPhone: "",
        organizationAddress: "",
        organizationContactName: "",
      });
      return;
    }
    if (!selectedValue) {
      setForm({
        ...form,
        organizationSourceType: mode,
        organizationId: "",
        organizationName: "",
        organizationDocument: "",
        organizationEmail: "",
        organizationPhone: "",
        organizationAddress: "",
        organizationContactName: "",
      });
      return;
    }
    const [kind, id] = selectedValue.split(":");
    if (!id || kind !== mode) return;
    if (mode === "client") {
      const selected = clients.find((item: any) => item.id === id);
      setForm({
        ...form,
        organizationSourceType: "client",
        organizationId: selected?.id || "",
        organizationName: clientLabel(selected),
        organizationDocument: clientDocument(selected),
        organizationEmail: selected?.email || "",
        organizationPhone: clientPhone(selected),
        organizationAddress: clientAddress(selected),
        organizationContactName: selected?.name || selected?.contactName || "",
      });
      return;
    }
    const selected = prospects.find((item: any) => item.id === id);
    setForm({
      ...form,
      organizationSourceType: "prospect",
      organizationId: selected?.id || "",
      organizationName: prospectLabel(selected),
      organizationDocument: selected?.cnpj || "",
      organizationEmail: selected?.email || "",
      organizationPhone: selected?.phone || "",
      organizationAddress: prospectAddress(selected),
      organizationContactName: prospectContact(selected),
    });
  };
  const selectedRecipientValue = recipientMode === "manual" || !form.organizationId ? "" : `${recipientMode}:${form.organizationId}`;
  const previewBudget = React.useMemo(
    () => ({
      ...(form as BudgetInput),
      id: budget?.id || "preview",
      totalBudgetedCents: formTotals.totalBudgetedCents,
      totalCostCents: formTotals.totalCostCents,
      totalMarginCents: formTotals.totalMarginCents,
      realizedCents: 0,
      createdAt: budget?.createdAt || new Date().toISOString(),
      createdBy: budget?.createdBy || form.responsibleUserId || "preview",
      updatedAt: new Date().toISOString(),
      updatedBy: form.responsibleUserId || "preview",
      rootBudgetId: budget?.rootBudgetId || budget?.id || "preview",
      issuerCompanyId: (form as any).issuerCompanyId || "",
      issuerCompanyName: (form as any).issuerCompanyName || "",
    } as Budget),
    [budget, form, formTotals],
  );
  const previewCompany = React.useMemo(
    () => companies.find((item: any) => item.id === (form as any).issuerCompanyId) || companies[0] || {},
    [companies, form],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validityDays = Number((form as any).proposalValidityDays || 15);
    const baseDate = budget?.periodStart || today();
    void (async () => {
      const sourceType = (form as any).organizationSourceType;
      const sourceId = (form as any).organizationId;

      if (sourceType === "client" && sourceId) {
        const selected = clients.find((item: any) => item.id === sourceId);
        const payload = {
          razaoSocial: form.organizationName || selected?.razaoSocial || "",
          name: (form as any).organizationContactName || selected?.name || form.organizationName || "",
          cnpj: normalizeDigits((form as any).organizationDocument || selected?.cnpj || ""),
          organizationCnpj: normalizeDigits((form as any).organizationDocument || selected?.organizationCnpj || selected?.cnpj || ""),
          email: (form as any).organizationEmail || selected?.email || "",
          financialContact: (form as any).organizationEmail || selected?.financialContact || selected?.email || "",
          phone: (form as any).organizationPhone || selected?.phone || "",
          address: (form as any).organizationAddress || selected?.address || "",
        };
        const changed =
          selected &&
          (selected.razaoSocial || "") !== payload.razaoSocial ||
          (selected?.name || "") !== payload.name ||
          normalizeDigits(selected?.cnpj || "") !== payload.cnpj ||
          normalizeDigits(selected?.organizationCnpj || selected?.cnpj || "") !== payload.organizationCnpj ||
          (selected?.email || "") !== payload.email ||
          (selected?.financialContact || selected?.email || "") !== payload.financialContact ||
          (selected?.phone || "") !== payload.phone ||
          (selected?.address || "") !== payload.address;
        if (changed) {
          const updated = await clientService.update(sourceId, payload);
          if (!updated) throw new Error("Não foi possível atualizar os dados do cliente vinculado.");
        }
      }

      if (sourceType === "prospect" && sourceId) {
        const selected = prospects.find((item: any) => item.id === sourceId);
        const payload = {
          razaoSocial: form.organizationName || selected?.razaoSocial || "",
          cnpj: normalizeDigits((form as any).organizationDocument || selected?.cnpj || ""),
          email: (form as any).organizationEmail || selected?.email || "",
          phone: (form as any).organizationPhone || selected?.phone || "",
          endereco: (form as any).organizationAddress || selected?.endereco || "",
          contato: (form as any).organizationContactName || selected?.contato || "",
          presidente: (form as any).organizationContactName || selected?.presidente || "",
        };
        const changed =
          selected &&
          (selected.razaoSocial || "") !== payload.razaoSocial ||
          normalizeDigits(selected?.cnpj || "") !== payload.cnpj ||
          (selected?.email || "") !== payload.email ||
          (selected?.phone || "") !== payload.phone ||
          (selected?.endereco || "") !== payload.endereco ||
          (selected?.contato || "") !== payload.contato ||
          (selected?.presidente || "") !== payload.presidente;
        if (changed) {
          const updated = await prospectService.update(sourceId, payload);
          if (!updated) throw new Error("Não foi possível atualizar os dados do prospect vinculado.");
        }
      }

      await save({
        ...form,
        code: form.code || nextCode,
        periodStart: baseDate,
        periodEnd: addDays(baseDate, validityDays),
      });
    })();
  };

  return (
    <Overlay>
      <section className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white md:h-[92vh] md:rounded-3xl">
        <ModalHeader title={budget ? "Editar orçamento" : "Novo orçamento"} close={close} />
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <Select label="Empresa emitente" value={(form as any).issuerCompanyId || ""} set={(value) => {
                const company = companies.find((item: any) => item.id === value);
                setForm({ ...form, ...( { issuerCompanyId: value, issuerCompanyName: company?.razaoSocial || company?.name || "", issuerCompanyDocument: company?.cnpj || "", issuerCompanyLogoUrl: companyLogoUrl(company), issuerCompanyEmail: company?.email || "", issuerCompanyPhone: company?.telefoneCelular || company?.telefoneFixo || company?.phone || "", issuerCompanyAddress: companyAddress(company) } as any ) });
                }} options={[["", "Selecione"], ...companies.map((item: any) => [item.id, item.razaoSocial || item.name])]} />
              </div>
              <div className="md:col-span-3">
                <Input label="Código do orçamento" value={form.code || nextCode} set={() => undefined} disabled />
              </div>
              <div className="md:col-span-5">
                <Input label="Nome" value={form.name} set={(value) => setForm({ ...form, name: value })} />
              </div>
              <div className="md:col-span-3">
                <Select label="Tipo" value={form.type} set={(value) => setForm({ ...form, type: value as BudgetType })} options={Object.entries(typeLabels)} />
              </div>
              <div className="md:col-span-3">
                <Input label="Validade da proposta (dias)" type="number" value={String((form as any).proposalValidityDays || 15)} set={(value) => setForm({ ...form, proposalValidityDays: Number(value) } as BudgetInput)} />
              </div>
              <div className="md:col-span-3">
                <Read label="Válida até" value={date(addDays(budget?.periodStart || today(), Number((form as any).proposalValidityDays || 15)))} />
              </div>
              <div className="md:col-span-3">
                <Select label="Status" value={form.status} set={(value) => setForm({ ...form, status: value as BudgetStatus })} options={Object.entries(statusLabels).filter(([value]) => !["approved", "replaced", "closed"].includes(value))} />
              </div>
              <div className="md:col-span-4">
                <Select label="Projeto" value={form.projectId} set={(value) => { const item = data.projects.find((project: any) => project.id === value); setForm({ ...form, projectId: value, projectName: item?.name || "" }); }} options={[["", "Nenhum"], ...data.projects.map((item: any) => [item.id, item.name])]} />
              </div>
              <div className="md:col-span-4">
                <Input label="Contrato" value={form.contractName} set={(value) => setForm({ ...form, contractName: value })} />
              </div>
              <div className="md:col-span-4">
                <Input label="Licitação" value={form.opportunityName} set={(value) => setForm({ ...form, opportunityName: value })} />
              </div>
              <div className="md:col-span-6">
                <Select label="Centro de custo" value={form.costCenterId} set={(value) => { const item = data.costCenters.find((center: any) => center.id === value); setForm({ ...form, costCenterId: value, costCenterName: item?.name || "" }); }} options={[["", "Nenhum"], ...data.costCenters.map((item: any) => [item.id, `${item.code} · ${item.name}`])]} />
              </div>
              <div className="md:col-span-6">
                <Select label="Responsável" value={form.responsibleUserId} set={(value) => { const item = data.members.find((member: any) => (member.userId || member.id) === value); setForm({ ...form, responsibleUserId: value, responsibleName: item?.name || "" }); }} options={[["", "Não definido"], ...data.members.map((item: any) => [item.userId || item.id, item.name])]} />
              </div>
            </div>

            <section className="space-y-4 rounded-2xl border bg-white p-4">
              <div>
                <p className="text-sm font-bold">Destinatário da proposta</p>
                <p className="mt-1 text-xs text-slate-500">Selecione um cliente cadastrado, um prospect já salvo ou preencha os dados manualmente para esta proposta.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Select
                  label="Origem dos dados"
                  value={recipientMode}
                  set={(value) => applyRecipient(value as "client" | "prospect" | "manual")}
                  options={[
                    ["client", "Cliente cadastrado"],
                    ["prospect", "Prospect cadastrado"],
                    ["manual", "Preencher manualmente"],
                  ]}
                />
                </div>
                {recipientMode !== "manual" ? (
                  <div className="md:col-span-8">
                    <Select
                    label={recipientMode === "client" ? "Cliente" : "Prospect"}
                    value={selectedRecipientValue}
                    set={(value) => applyRecipient(recipientMode as "client" | "prospect", value)}
                    options={[
                      ["", recipientMode === "client" ? "Selecione um cliente" : "Selecione um prospect"],
                      ...recipientOptions.filter(([value]) => value.startsWith(`${recipientMode}:`)),
                    ]}
                  />
                  </div>
                ) : (
                  <div className="md:col-span-8">
                    <Input label="Nome do cliente/órgão" value={form.organizationName} set={(value) => setForm({ ...form, organizationName: value })} />
                  </div>
                )}
                <div className="md:col-span-4">
                  <Input label="Documento" value={(form as any).organizationDocument || ""} set={(value) => setForm({ ...form, organizationDocument: normalizeDigits(value) } as BudgetInput)} />
                </div>
                <div className="md:col-span-4">
                  <Input label="Contato responsável" value={(form as any).organizationContactName || ""} set={(value) => setForm({ ...form, organizationContactName: value } as BudgetInput)} />
                </div>
                <div className="md:col-span-4">
                  <Input label="Telefone" value={(form as any).organizationPhone || ""} set={(value) => setForm({ ...form, organizationPhone: value } as BudgetInput)} />
                </div>
                <div className="md:col-span-6">
                  <Input label="E-mail" value={(form as any).organizationEmail || ""} set={(value) => setForm({ ...form, organizationEmail: value } as BudgetInput)} />
                </div>
                <label className="text-xs font-bold text-slate-600 md:col-span-6">Endereço<div className="mt-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><input value={(form as any).organizationAddress || ""} onChange={(event) => setForm({ ...form, organizationAddress: event.target.value } as BudgetInput)} className="w-full outline-none" placeholder="Rua, número, bairro, cidade, UF, CEP" /></div></label>
              </div>
            </section>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Itens do orçamento</h3>
                <button type="button" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })} className="text-sm font-bold text-blue-600">+ Adicionar item</button>
              </div>
              <div className="mt-3 space-y-3">
	                {form.items.map((item, index) => (
	                  <div key={index} className="grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-12">
	                    <div className="md:col-span-3"><Select label="Tipo do item" value={item.itemType || "product"} set={(value) => updateItem(index, "itemType", value as any)} options={[["product", "Produto"], ["service", "Serviço"]]} /></div>
	                    <div className="md:col-span-3"><Select label="Buscar no catálogo" value={item.catalogItemId || ""} set={(value) => selectCatalogItem(index, value)} options={[["", "Selecionar item"], ...catalog.filter((entry: any) => (entry.type || "product") === (item.itemType || "product")).map((entry: any) => [entry.id, `${entry.name} · ${money(Number(entry.salePriceCents || 0))}`])]} /></div>
	                    <div className="md:col-span-6"><Input label="Produto ou serviço" value={item.productService} set={(value) => updateItem(index, "productService", value)} /></div>
	                    <label className="text-xs font-bold text-slate-600 md:col-span-12">Descrição<div className="mt-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><textarea value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} className="min-h-[132px] w-full resize-y outline-none" placeholder="Detalhe o item com especificações técnicas, escopo, composição, diferenciais, observações comerciais e condições aplicáveis." /></div></label>
                      <div className="md:col-span-2"><Decimal label="Quantidade" value={item.quantityMilliUnits / 1000} set={(value) => updateItem(index, "quantityMilliUnits", Math.round(value * 1000))} /></div>
                      <div className="md:col-span-2"><Input label="Unidade" value={item.unit} set={(value) => updateItem(index, "unit", value)} /></div>
                      <div className="md:col-span-2"><MoneyInput label="Custo unitário" value={item.unitCostCents} set={(value) => updateItem(index, "unitCostCents", value)} /></div>
                      <div className="md:col-span-2"><MoneyInput label="Preço unitário" value={item.unitPriceCents} set={(value) => updateItem(index, "unitPriceCents", value)} /></div>
	                    <div className="md:col-span-2"><PercentInput label="Impostos (%)" value={Number(item.taxPercent || 0)} set={(value) => updateItem(index, "taxPercent", value)} /></div>
	                    <div className="md:col-span-2"><Read label="Valor dos impostos" value={money(item.taxCents)} /></div>
	                    <div className="md:col-span-3"><Input label={item.itemType === "service" ? "Código de serviço" : "NCM"} value={item.itemType === "service" ? item.serviceCode || "" : item.ncm || ""} set={(value) => updateItem(index, item.itemType === "service" ? "serviceCode" : "ncm", value)} /></div>
	                    <div className="md:col-span-3"><Input label="Regra tributária" value={item.taxRegime || ""} set={(value) => updateItem(index, "taxRegime", value)} /></div>
	                    <div className="md:col-span-2"><MoneyInput label="Logística" value={item.logisticsCents} set={(value) => updateItem(index, "logisticsCents", value)} /></div>
                      <div className="md:col-span-2"><MoneyInput label="Despesas adicionais" value={item.additionalExpensesCents} set={(value) => updateItem(index, "additionalExpensesCents", value)} /></div>
                      <div className="md:col-span-2"><Read label="Total" value={money(item.totalCents)} /></div>
                      <div className="md:col-span-3"><Read label="Margem" value={money(item.marginCents)} /></div>
                      <div className="md:col-span-3 md:self-end md:justify-self-end"><button type="button" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })} className="w-full rounded-xl border px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-30 md:w-auto">Remover</button></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
                <Metric label="Total do orçamento" value={money(formTotals.totalBudgetedCents)} />
                <Metric label="Custos previstos" value={money(formTotals.totalCostCents)} />
                <Metric label="Impostos calculados" value={money(formTotals.totalTaxesCents)} />
                <Metric label="Margem prevista" value={money(formTotals.totalMarginCents)} />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Proposta comercial</p>
                  <p className="mt-1 text-sm text-slate-500">Defina os textos da proposta e mantenha um layout padrão reutilizável para todos os orçamentos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setDesignDraft(extractProposalDesign(form)); setDesignOpen(true); }} className="rounded-xl border px-4 py-2.5 text-sm font-bold text-slate-700">Configurar design</button>
                  <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">Visualizar prévia do PDF</button>
                </div>
              </div>
              {proposalDesign.error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">{proposalDesign.error}</p>}
              <div className="grid gap-4 md:grid-cols-12">
                <label className="block text-xs font-bold text-slate-600 md:col-span-12">Texto de apresentação<textarea value={(form as any).proposalIntro || ""} onChange={(event) => setForm({ ...form, proposalIntro: event.target.value } as BudgetInput)} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" rows={3} /></label>
                <label className="block text-xs font-bold text-slate-600 md:col-span-12">Texto personalizado da proposta<textarea value={(form as any).proposalCustomText || ""} onChange={(event) => setForm({ ...form, proposalCustomText: event.target.value } as BudgetInput)} placeholder="Inclua condições comerciais, prazos, observações técnicas ou qualquer mensagem específica para o cliente." className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" rows={4} /></label>
                <label className="block text-xs font-bold text-slate-600 md:col-span-12">Observações internas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" rows={3} /></label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.projectFinancials} onChange={(event) => setForm({ ...form, projectFinancials: event.target.checked })} />Alimentar projeções financeiras quando aprovado</label>
          </div>
          <footer className="flex justify-end gap-2 border-t p-5">
            <button type="button" onClick={close} className="rounded-xl border px-4 py-2.5 font-bold">Cancelar</button>
            <button disabled={data.saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white">Salvar orçamento</button>
          </footer>
        </form>
      </section>
      {previewOpen && (
        <Overlay>
          <section className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white">
            <ModalHeader title="Prévia do PDF da proposta" close={() => setPreviewOpen(false)} />
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              <ProposalPreview budget={previewBudget} items={form.items} company={previewCompany} />
            </div>
            <footer className="flex justify-end gap-2 border-t bg-white p-4">
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl border px-4 py-2.5 font-bold">Fechar</button>
              <button type="button" onClick={() => void generateBudgetPdf(previewBudget, form.items, previewCompany)} className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white">Gerar PDF</button>
            </footer>
          </section>
        </Overlay>
      )}
      {designOpen && (
        <Overlay>
          <section className="flex h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white">
            <ModalHeader title="Configuração visual da proposta" close={() => setDesignOpen(false)} />
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-sm text-slate-500">Esse layout fica salvo no Firestore e passa a ser o padrão da empresa para novas propostas.</p>
              <div className="grid gap-4">
                <Input label="Cor de destaque" value={designDraft.proposalAccentColor} set={(value) => setDesignDraft((current) => ({ ...current, proposalAccentColor: value || proposalDesignDefaults.proposalAccentColor }))} />
                <Select label="Tema do cabeçalho" value={designDraft.proposalHeaderTheme} set={(value) => setDesignDraft((current) => ({ ...current, proposalHeaderTheme: value }))} options={[["light", "Claro"], ["dark", "Escuro"], ["brand", "Azul Blu"]]} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={designDraft.proposalShowLogo} onChange={(event) => setDesignDraft((current) => ({ ...current, proposalShowLogo: event.target.checked }))} />Exibir logomarca da emitente</label>
                <label className="block text-xs font-bold text-slate-600">Rodapé da proposta<textarea value={designDraft.proposalFooterText} onChange={(event) => setDesignDraft((current) => ({ ...current, proposalFooterText: event.target.value }))} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" rows={4} /></label>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Prévia rápida do layout</p>
                <div className="mt-3">
                  <ProposalPreview budget={applyProposalDesign(previewBudget, designDraft)} items={form.items} company={previewCompany} />
                </div>
              </div>
            </div>
            <footer className="flex justify-between gap-2 border-t p-4">
              <button type="button" onClick={() => { applyDesignToForm(designDraft); setDesignOpen(false); }} className="rounded-xl border px-4 py-2.5 font-bold">Aplicar ao orçamento</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDesignOpen(false)} className="rounded-xl border px-4 py-2.5 font-bold">Cancelar</button>
                <button
                  type="button"
                  disabled={proposalDesign.saving || proposalDesign.loading}
                  onClick={async () => {
                    await proposalDesign.save(designDraft);
                    applyDesignToForm(designDraft);
                    setDesignOpen(false);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white disabled:opacity-60"
                >
                  {proposalDesign.saving ? "Salvando..." : "Salvar como padrão"}
                </button>
              </div>
            </footer>
          </section>
        </Overlay>
      )}
    </Overlay>
  );
};

const BudgetDetails = ({ budget, items, realized, companies, close, approve, reject }: { budget: Budget; items: any[]; realized: number; companies: any[]; close: () => void; approve: () => void; reject: () => void }) => {
  const company = companies.find((item) => item.id === (budget as any).issuerCompanyId) || companies[0] || {};
  return (
    <Overlay>
      <section className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white">
        <ModalHeader title={`${budget.code} · ${budget.name}`} close={close} />
        <main className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Orçado" value={money(budget.totalBudgetedCents)} />
            <Metric label="Realizado" value={money(realized)} />
            <Metric label="Variação" value={money(budget.totalBudgetedCents - realized)} />
            <Metric label="Margem prevista" value={money(budget.totalMarginCents)} />
          </div>
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <Badge status={budget.status} />
                <p className="mt-3 text-sm text-slate-500">{typeLabels[budget.type]} · versão {budget.versionNumber} · validade de {proposalValidityLabel(budget)} · até {date(validityDate(budget))}</p>
                <p className="mt-1 text-xs text-slate-400">Emitente: {(budget as any).issuerCompanyName || company.razaoSocial || company.name || "Empresa não selecionada"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void generateBudgetPdf(budget, items, company)} className="flex h-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Download size={16} />Pré-visualizar / gerar PDF</button>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Prévia da proposta</p>
            <ProposalPreview budget={budget} items={items} company={company} />
          </section>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-400"><tr>{["Item", "Qtd.", "Custo un.", "Preço un.", "Impostos", "Logística/despesas", "Total", "Margem"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-bold">{item.productService}<small className="block font-normal text-slate-400">{item.description}</small></td>
                    <td className="px-4">{item.quantityMilliUnits / 1000} {item.unit}</td>
                    <td className="px-4">{money(item.unitCostCents)}</td>
                    <td className="px-4">{money(item.unitPriceCents)}</td>
                    <td className="px-4">{Number(item.taxPercent || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%<small className="block text-slate-400">{money(item.taxCents)}</small></td>
                    <td className="px-4">{money(item.logisticsCents + item.additionalExpensesCents)}</td>
                    <td className="px-4 font-bold">{money(item.totalCents)}</td>
                    <td className="px-4">{money(item.marginCents)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black">
                  <td colSpan={6} className="px-4 py-4 text-right">Total geral do orçamento</td>
                  <td className="px-4">{money(budget.totalBudgetedCents)}</td>
                  <td className="px-4">{money(budget.totalMarginCents)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
        <footer className="flex justify-end gap-2 border-t p-4">
          {budget.status === "pendingApproval" && (
            <>
              <button onClick={reject} className="rounded-xl border px-4 py-2 font-bold text-rose-600">Rejeitar</button>
              <button onClick={approve} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><CheckCircle2 size={16} />Aprovar versão</button>
            </>
          )}
        </footer>
      </section>
    </Overlay>
  );
};

const imageToDataUrl = async (url: string) => {
  if (!url || url.startsWith("data:")) return url;
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

const generateBudgetPdf = async (budget: Budget, items: any[], company: any) => {
  const win = window.open("", "_blank");
  if (!win) return;
  const logo = await imageToDataUrl(companyLogo(budget, company));
  win.document.write(proposalHtml({ ...budget, issuerCompanyLogoUrl: logo } as Budget, items, company, true));
  win.document.close();
};

const companyAddress = (company: any) => [company?.logradouro, company?.numero, company?.bairro, company?.municipio, company?.uf].filter(Boolean).join(", ");
const companyName = (budget: Budget, company: any) => (budget as any).issuerCompanyName || company?.razaoSocial || company?.name || "Empresa emitente";
const companyDocument = (budget: Budget, company: any) => (budget as any).issuerCompanyDocument || company?.cnpj || "";
const companyLogoUrl = (company: any) => company?.logoUrl || company?.logo || company?.brandLogoUrl || company?.imageUrl || "";
const companyLogo = (budget: Budget, company: any) => (budget as any).issuerCompanyLogoUrl || companyLogoUrl(company);
const companyEmail = (budget: Budget, company: any) => (budget as any).issuerCompanyEmail || company?.email || "";
const companyPhone = (budget: Budget, company: any) => (budget as any).issuerCompanyPhone || company?.telefoneCelular || company?.telefoneFixo || company?.phone || "";
const companyFooter = (budget: Budget, company: any) => (budget as any).issuerCompanyAddress || companyAddress(company) || company?.address || "";
const proposalAccent = (budget: Budget) => (budget as any).proposalAccentColor || "#0ea5e9";
const proposalHeaderTheme = (budget: Budget) => (budget as any).proposalHeaderTheme || "light";
const proposalShowLogo = (budget: Budget) => (budget as any).proposalShowLogo !== false;
const proposalFooterText = (budget: Budget) => (budget as any).proposalFooterText || "Sistema de Gestão Blu Tecnologias";
const proposalHeaderStyles = (budget: Budget) => {
  const accent = proposalAccent(budget);
  const theme = proposalHeaderTheme(budget);
  if (theme === "dark") return { background: "#0f172a", text: "#ffffff", muted: "#cbd5e1", pill: accent };
  if (theme === "brand") return { background: `linear-gradient(135deg, ${accent}, #0f172a)`, text: "#ffffff", muted: "#dbeafe", pill: "#ffffff" };
  return { background: "#f8fafc", text: "#0f172a", muted: "#64748b", pill: accent };
};
const escapeHtml = (value: any) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] as string));
const validityDate = (budget: Budget) => {
  const days = Number((budget as any).proposalValidityDays || 15);
  const created = new Date(`${budget.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)}T12:00:00`);
  created.setDate(created.getDate() + days);
  return created.toISOString().slice(0, 10);
};

const ProposalPreview = ({ budget, items, company }: { budget: Budget; items: any[]; company: any }) => {
  const validity = date(validityDate(budget));
  const header = proposalHeaderStyles(budget);
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b p-5" style={{ background: header.background, color: header.text }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {proposalShowLogo(budget) && companyLogo(budget, company) ? <img src={companyLogo(budget, company)} alt="Logo" className="h-14 w-14 rounded-2xl bg-white object-contain p-1" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black" style={{ background: proposalAccent(budget), color: "#fff" }}>b</div>}
            <div>
              <h3 className="text-xl font-black">{companyName(budget, company)}</h3>
              <p className="text-sm" style={{ color: header.muted }}>CNPJ {companyDocument(budget, company) || "não informado"}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: header.muted }}>Proposta comercial</p>
            <p className="text-lg font-black">{budget.code}</p>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
          <Read label="Cliente/órgão" value={budget.organizationName || "Não informado"} />
          <Read label="Objeto/proposta" value={budget.name || "Não informado"} />
          <Read label="Validade" value={`${proposalValidityLabel(budget)} · até ${validity}`} />
        </div>
        <div className="prose prose-sm max-w-none text-slate-600">
          <p>{(budget as any).proposalIntro || "Apresentamos nossa proposta comercial conforme as condições abaixo."}</p>
          {(budget as any).proposalCustomText && <p>{(budget as any).proposalCustomText}</p>}
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Item", "Qtd.", "Un.", "Preço unit.", "Total"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
            <tbody className="divide-y">
              {items.map((item, index) => <tr key={item.id || index}><td className="px-4 py-3 font-bold">{item.productService}<small className="block font-normal text-slate-400">{item.description}</small></td><td className="px-4">{item.quantityMilliUnits / 1000}</td><td className="px-4">{item.unit}</td><td className="px-4">{money(item.unitPriceCents)}</td><td className="px-4 font-bold">{money(item.totalCents)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl p-5" style={{ background: `${proposalAccent(budget)}14` }}>
          <p className="max-w-xl text-sm" style={{ color: "#0f172a" }}>Agradecemos a oportunidade de apresentar esta proposta. Permanecemos à disposição para quaisquer esclarecimentos e próximos passos.</p>
          <div className="text-right">
            <p className="text-xs font-bold uppercase" style={{ color: proposalAccent(budget) }}>Total da proposta</p>
            <p className="text-3xl font-black text-slate-950">{money(budget.totalBudgetedCents)}</p>
          </div>
        </div>
        <div className="border-t pt-4 text-xs leading-5 text-slate-500">
          <p>{companyFooter(budget, company)}</p>
          <p>{[companyEmail(budget, company), companyPhone(budget, company)].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 font-semibold">{proposalFooterText(budget)}</p>
        </div>
      </div>
    </div>
  );
};

const proposalHtml = (budget: Budget, items: any[], company: any, autoPrint = false) => {
  const validity = date(validityDate(budget));
  const accent = proposalAccent(budget);
  const header = proposalHeaderStyles(budget);
  const rows = items.map((item, index) => `<tr><td><strong>${index + 1}. ${escapeHtml(item.productService)}</strong><br/><small>${escapeHtml(item.description)}</small></td><td>${item.quantityMilliUnits / 1000}</td><td>${escapeHtml(item.unit)}</td><td>${money(item.unitPriceCents)}</td><td><strong>${money(item.totalCents)}</strong></td></tr>`).join("");
  const logo = companyLogo(budget, company);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(budget.code)} - Proposta</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;margin:0;color:#0f172a;background:#eef2f7}.page{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:22mm 18mm;position:relative}.head{display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:3px solid ${accent};padding:18px;border-radius:22px}.brand{display:flex;align-items:center;gap:16px}.logo{width:68px;height:68px;border-radius:18px;object-fit:contain;border:1px solid #e2e8f0;padding:6px;background:#fff}.fallback{display:grid;place-items:center;width:68px;height:68px;border-radius:18px;background:${accent};color:white;font-size:28px;font-weight:900}.muted{color:${header.muted}}.title{text-align:right}.title p{margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${header.muted}}.title h1{margin:6px 0 0;font-size:22px}.box{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:22px 0}.info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}.info small{display:block;text-transform:uppercase;font-weight:800;color:#64748b;font-size:9px}.info strong{display:block;margin-top:5px;font-size:13px}.text{font-size:13px;line-height:1.65;color:#334155;margin:18px 0}.text p{margin:0 0 10px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th{background:#f8fafc;text-align:left;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.08em}th,td{border-bottom:1px solid #e2e8f0;padding:10px;vertical-align:top}td small{color:#64748b}.total{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-top:22px;background:${accent}14;border-radius:16px;padding:18px;color:#172554}.total .thanks{max-width:420px;font-size:13px;line-height:1.6}.total .amount{text-align:right}.total .amount small{display:block;text-transform:uppercase;font-weight:800;color:${accent};font-size:10px}.total .amount strong{font-size:28px}.foot{position:absolute;left:18mm;right:18mm;bottom:12mm;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;line-height:1.45;color:#64748b}.actions{position:fixed;right:24px;top:24px;display:flex;gap:8px}.actions button{border:0;border-radius:12px;background:${accent};color:white;padding:10px 14px;font-weight:800;cursor:pointer}.actions button.secondary{background:#0f172a}@media print{body{background:white}.page{margin:0;padding-top:10mm}.actions{display:none}}
  </style></head><body><div class="actions"><button onclick="window.print()">Salvar como PDF</button><button class="secondary" onclick="window.close()">Fechar</button></div><main class="page">
    <header class="head" style="background:${header.background};color:${header.text}"><div class="brand">${proposalShowLogo(budget) && logo ? `<img class="logo" src="${escapeHtml(logo)}"/>` : `<div class="fallback">b</div>`}<div><h2>${escapeHtml(companyName(budget, company))}</h2><p class="muted">CNPJ ${escapeHtml(companyDocument(budget, company) || "não informado")}</p></div></div><div class="title"><p>Proposta comercial</p><h1>${escapeHtml(budget.code)}</h1></div></header>
    <section class="box"><div class="info"><small>Cliente/órgão</small><strong>${escapeHtml(budget.organizationName || "Não informado")}</strong></div><div class="info"><small>Objeto/proposta</small><strong>${escapeHtml(budget.name || "Não informado")}</strong></div><div class="info"><small>Validade</small><strong>${proposalValidityLabel(budget)} · até ${validity}</strong></div></section>
    <section class="text"><p>${escapeHtml((budget as any).proposalIntro || "Apresentamos nossa proposta comercial conforme as condições abaixo.")}</p>${(budget as any).proposalCustomText ? `<p>${escapeHtml((budget as any).proposalCustomText)}</p>` : ""}</section>
    <table><thead><tr><th>Item</th><th>Qtd.</th><th>Un.</th><th>Preço unit.</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="total"><div class="thanks">Agradecemos a oportunidade de apresentar esta proposta. Permanecemos à disposição para quaisquer esclarecimentos e próximos passos.</div><div class="amount"><small>Total da proposta</small><strong>${money(budget.totalBudgetedCents)}</strong></div></section>
    <footer class="foot"><strong>${escapeHtml(companyName(budget, company))}</strong><br/>${escapeHtml(companyFooter(budget, company))}<br/>${escapeHtml([companyEmail(budget, company), companyPhone(budget, company)].filter(Boolean).join(" · "))}<br/>${escapeHtml(proposalFooterText(budget))}</footer>
  </main>${autoPrint ? `<script>setTimeout(()=>window.print(),350)</script>` : ""}</body></html>`;
};

const Overlay = ({ children }: { children: React.ReactNode }) => <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 md:items-center md:p-5">{children}</div>;
const ModalHeader = ({ title, close }: { title: string; close: () => void }) => <header className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold">{title}</h2><button onClick={close} className="rounded-lg p-2"><X size={20} /></button></header>;
const Metric = ({ label, value }: { label: string; value: string }) => <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{value}</p></article>;
const Badge = ({ status }: { status: BudgetStatus }) => <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">{statusLabels[status]}</span>;
const IconButton = ({ title, action, children }: { title: string; action: () => void; children: React.ReactNode }) => <button title={title} onClick={action} className="rounded-lg border p-2 hover:bg-slate-50">{children}</button>;
const Input = ({ label, value, set, type = "text", disabled = false }: { label: string; value: any; set: (value: string) => void; type?: string; disabled?: boolean }) => <label className="text-xs font-bold text-slate-600">{label}<input required={!disabled} disabled={disabled} readOnly={disabled} type={type} value={value || ""} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal disabled:bg-slate-50 disabled:text-slate-500" /></label>;
const Select = ({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: any[] }) => <label className="text-xs font-bold text-slate-600">{label}<select value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
const MoneyInput = ({ label, value, set }: { label: string; value: number; set: (value: number) => void }) => <label className="text-xs font-bold text-slate-600">{label}<input type="number" step="0.01" min="0" value={(value / 100).toFixed(2)} onChange={(event) => set(Math.round(Number(event.target.value) * 100))} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>;
const PercentInput = ({ label, value, set }: { label: string; value: number; set: (value: number) => void }) => <label className="text-xs font-bold text-slate-600">{label}<input type="number" step="0.01" min="0" value={Number(value || 0)} onChange={(event) => set(Number(event.target.value))} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>;
const Decimal = ({ label, value, set }: { label: string; value: number; set: (value: number) => void }) => <label className="text-xs font-bold text-slate-600">{label}<input type="number" step="0.001" min="0.001" value={value} onChange={(event) => set(Number(event.target.value))} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>;
const Read = ({ label, value }: { label: string; value: string }) => <div className="text-xs font-bold text-slate-600">{label}<div className="mt-2 rounded-xl bg-white px-3 py-2.5 text-sm">{value}</div></div>;
