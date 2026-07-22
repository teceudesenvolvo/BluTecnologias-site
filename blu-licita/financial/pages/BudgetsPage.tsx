import React from "react";
import { BarChart3, CheckCircle2, Copy, Eye, FilePlus2, Loader2, Plus, Search, X } from "lucide-react";
import { useBudgets } from "../hooks/useBudgets";
import type { Budget, BudgetInput, BudgetItemInput, BudgetStatus, BudgetType } from "../domain/budgetTypes";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (value: number) => brl.format((value || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
const yearEnd = () => `${new Date().getFullYear()}-12-31`;
const date = (value: string) => (value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—");

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
  productService: "",
  description: "",
  quantityMilliUnits: 1000,
  unit: "un",
  unitCostCents: 0,
  unitPriceCents: 0,
  taxCents: 0,
  logisticsCents: 0,
  additionalExpensesCents: 0,
  totalCents: 0,
  marginCents: 0,
});

const empty: BudgetInput = {
  name: "",
  code: `ORC-${new Date().getFullYear()}-`,
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
  costCenterId: "",
  costCenterName: "",
  status: "draft",
  notes: "",
  projectFinancials: false,
  items: [emptyItem()],
};

export const BudgetsPage = () => {
  const data = useBudgets();
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [editing, setEditing] = React.useState<Budget | undefined>();
  const [formOpen, setFormOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Budget | undefined>();

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
        </div>
        <button onClick={() => { setEditing(undefined); setFormOpen(true); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
          <Plus size={17} /> Novo orçamento
        </button>
      </header>

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
            <tr>{["Orçamento", "Tipo", "Período", "Versão", "Status", "Orçado", "Realizado", "Margem", "Responsável", "Ações"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((budget) => {
              const done = realized(budget);
              return (
                <tr key={budget.id}>
                  <td className="px-4 py-4"><b>{budget.code}</b><small className="block text-slate-500">{budget.name}</small></td>
                  <td className="px-4">{typeLabels[budget.type]}</td>
                  <td className="px-4">{date(budget.periodStart)}–{date(budget.periodEnd)}</td>
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
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={10} className="p-12 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && <BudgetForm budget={editing} data={data} close={() => setFormOpen(false)} save={async (input) => { await execute({ action: "save", budgetId: editing?.id, input }); setFormOpen(false); }} />}
      {detail && <BudgetDetails budget={detail} items={(data.items || []).filter((item: any) => item.budgetId === detail.id)} realized={realized(detail)} companies={data.companies || []} close={() => setDetail(undefined)} approve={() => execute({ action: "approve", budgetId: detail.id })} reject={() => { const reason = prompt("Motivo da rejeição"); if (reason?.trim()) execute({ action: "reject", budgetId: detail.id, reason }); }} />}
    </div>
  );
};

const BudgetForm = ({ budget, data, close, save }: { budget?: Budget; data: any; close: () => void; save: (value: BudgetInput) => Promise<void> }) => {
  const sourceItems = (data.items || []).filter((item: any) => item.budgetId === budget?.id).sort((a: any, b: any) => a.position - b.position);
  const [form, setForm] = React.useState<BudgetInput>(() => (budget ? { ...budget, items: sourceItems.length ? sourceItems : [emptyItem()] } : empty));
  const companies = data.companies || [];

  const updateItem = (index: number, key: keyof BudgetItemInput, value: any) => {
    const items = form.items.map((item, currentIndex) => {
      if (currentIndex !== index) return item;
      const next = { ...item, [key]: value };
      const quantity = next.quantityMilliUnits / 1000;
      next.totalCents = Math.round(next.unitPriceCents * quantity);
      const cost = Math.round(next.unitCostCents * quantity) + next.taxCents + next.logisticsCents + next.additionalExpensesCents;
      next.marginCents = next.totalCents - cost;
      return next;
    });
    setForm({ ...form, items });
  };

  return (
    <Overlay>
      <section className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white md:h-[92vh] md:rounded-3xl">
        <ModalHeader title={budget ? "Editar orçamento" : "Novo orçamento"} close={close} />
        <form onSubmit={(event) => { event.preventDefault(); save(form); }} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Empresa emitente" value={(form as any).issuerCompanyId || ""} set={(value) => {
                const company = companies.find((item: any) => item.id === value);
                setForm({ ...form, ...( { issuerCompanyId: value, issuerCompanyName: company?.razaoSocial || company?.name || "", issuerCompanyDocument: company?.cnpj || "", issuerCompanyLogoUrl: company?.logoUrl || "" } as any ) });
              }} options={[["", "Selecione"], ...companies.map((item: any) => [item.id, item.razaoSocial || item.name])]} />
              <Input label="Código" value={form.code} set={(value) => setForm({ ...form, code: value })} />
              <Input label="Nome" value={form.name} set={(value) => setForm({ ...form, name: value })} />
              <Select label="Tipo" value={form.type} set={(value) => setForm({ ...form, type: value as BudgetType })} options={Object.entries(typeLabels)} />
              <Input label="Início" type="date" value={form.periodStart} set={(value) => setForm({ ...form, periodStart: value })} />
              <Input label="Fim" type="date" value={form.periodEnd} set={(value) => setForm({ ...form, periodEnd: value })} />
              <Select label="Status" value={form.status} set={(value) => setForm({ ...form, status: value as BudgetStatus })} options={Object.entries(statusLabels).filter(([value]) => !["approved", "replaced", "closed"].includes(value))} />
              <Select label="Projeto" value={form.projectId} set={(value) => { const item = data.projects.find((project: any) => project.id === value); setForm({ ...form, projectId: value, projectName: item?.name || "" }); }} options={[["", "Nenhum"], ...data.projects.map((item: any) => [item.id, item.name])]} />
              <Input label="Contrato" value={form.contractName} set={(value) => setForm({ ...form, contractName: value })} />
              <Input label="Licitação" value={form.opportunityName} set={(value) => setForm({ ...form, opportunityName: value })} />
              <Input label="Órgão" value={form.organizationName} set={(value) => setForm({ ...form, organizationName: value })} />
              <Select label="Centro de custo" value={form.costCenterId} set={(value) => { const item = data.costCenters.find((center: any) => center.id === value); setForm({ ...form, costCenterId: value, costCenterName: item?.name || "" }); }} options={[["", "Nenhum"], ...data.costCenters.map((item: any) => [item.id, `${item.code} · ${item.name}`])]} />
              <Select label="Responsável" value={form.responsibleUserId} set={(value) => { const item = data.members.find((member: any) => (member.userId || member.id) === value); setForm({ ...form, responsibleUserId: value, responsibleName: item?.name || "" }); }} options={[["", "Não definido"], ...data.members.map((item: any) => [item.userId || item.id, item.name])]} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Itens do orçamento</h3>
                <button type="button" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })} className="text-sm font-bold text-blue-600">+ Adicionar item</button>
              </div>
              <div className="mt-3 space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-4">
                    <Input label="Produto ou serviço" value={item.productService} set={(value) => updateItem(index, "productService", value)} />
                    <Input label="Descrição" value={item.description} set={(value) => updateItem(index, "description", value)} />
                    <Decimal label="Quantidade" value={item.quantityMilliUnits / 1000} set={(value) => updateItem(index, "quantityMilliUnits", Math.round(value * 1000))} />
                    <Input label="Unidade" value={item.unit} set={(value) => updateItem(index, "unit", value)} />
                    <MoneyInput label="Custo unitário" value={item.unitCostCents} set={(value) => updateItem(index, "unitCostCents", value)} />
                    <MoneyInput label="Preço unitário" value={item.unitPriceCents} set={(value) => updateItem(index, "unitPriceCents", value)} />
                    <MoneyInput label="Impostos" value={item.taxCents} set={(value) => updateItem(index, "taxCents", value)} />
                    <MoneyInput label="Logística" value={item.logisticsCents} set={(value) => updateItem(index, "logisticsCents", value)} />
                    <MoneyInput label="Despesas adicionais" value={item.additionalExpensesCents} set={(value) => updateItem(index, "additionalExpensesCents", value)} />
                    <Read label="Total" value={money(item.totalCents)} />
                    <Read label="Margem" value={money(item.marginCents)} />
                    <button type="button" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })} className="self-end rounded-xl border px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-30">Remover</button>
                  </div>
                ))}
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-600">Observações<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" rows={3} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.projectFinancials} onChange={(event) => setForm({ ...form, projectFinancials: event.target.checked })} />Alimentar projeções financeiras quando aprovado</label>
          </div>
          <footer className="flex justify-end gap-2 border-t p-5">
            <button type="button" onClick={close} className="rounded-xl border px-4 py-2.5 font-bold">Cancelar</button>
            <button disabled={data.saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white">Salvar orçamento</button>
          </footer>
        </form>
      </section>
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
                <p className="mt-3 text-sm text-slate-500">{typeLabels[budget.type]} · versão {budget.versionNumber} · {date(budget.periodStart)} a {date(budget.periodEnd)}</p>
                <p className="mt-1 text-xs text-slate-400">Emitente: {(budget as any).issuerCompanyName || company.razaoSocial || company.name || "Empresa não selecionada"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => generateBudgetPdf(budget, items, company)} className="flex h-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><BarChart3 size={16} />Gerar PDF</button>
              </div>
            </div>
          </section>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-400"><tr>{["Item", "Qtd.", "Custo un.", "Preço un.", "Impostos/logística", "Total", "Margem"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-bold">{item.productService}<small className="block font-normal text-slate-400">{item.description}</small></td>
                    <td className="px-4">{item.quantityMilliUnits / 1000} {item.unit}</td>
                    <td className="px-4">{money(item.unitCostCents)}</td>
                    <td className="px-4">{money(item.unitPriceCents)}</td>
                    <td className="px-4">{money(item.taxCents + item.logisticsCents + item.additionalExpensesCents)}</td>
                    <td className="px-4 font-bold">{money(item.totalCents)}</td>
                    <td className="px-4">{money(item.marginCents)}</td>
                  </tr>
                ))}
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

const generateBudgetPdf = (budget: Budget, items: any[], company: any) => {
  const rows = items.map((item) => `<tr><td><b>${item.productService || ""}</b><br/><small>${item.description || ""}</small></td><td>${item.quantityMilliUnits / 1000} ${item.unit || ""}</td><td>${money(item.unitPriceCents)}</td><td>${money(item.totalCents)}</td></tr>`).join("");
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${budget.code}</title><style>body{font-family:Inter,Arial,sans-serif;margin:40px;color:#0f172a}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #0ea5e9;padding-bottom:18px}.logo{max-height:72px;max-width:180px}.muted{color:#64748b}.box{border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-top:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f8fafc;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase}th,td{border-bottom:1px solid #e2e8f0;padding:12px}.total{text-align:right;font-size:22px;font-weight:800;margin-top:24px}.foot{border-top:1px solid #e2e8f0;margin-top:48px;padding-top:16px;color:#64748b;font-size:12px}@media print{button{display:none}}</style></head><body><div class="head"><div>${company.logoUrl ? `<img class="logo" src="${company.logoUrl}"/>` : `<h1>${company.razaoSocial || company.name || "Blu"}</h1>`}<p class="muted">${company.razaoSocial || company.name || ""}<br/>CNPJ ${company.cnpj || "não informado"}</p></div><div><h2>Orçamento ${budget.code}</h2><p class="muted">${date(budget.periodStart)} a ${date(budget.periodEnd)}</p></div></div><div class="box"><h2>${budget.name}</h2><p>${budget.organizationName || ""}</p><p class="muted">${budget.notes || ""}</p></div><table><thead><tr><th>Item</th><th>Qtd.</th><th>Preço un.</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: ${money(budget.totalBudgetedCents)}</p><div class="foot">${company.footer || company.address || "Documento gerado pela Blu."}</div><script>window.print()</script></body></html>`);
  win.document.close();
};

const Overlay = ({ children }: { children: React.ReactNode }) => <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 md:items-center md:p-5">{children}</div>;
const ModalHeader = ({ title, close }: { title: string; close: () => void }) => <header className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold">{title}</h2><button onClick={close} className="rounded-lg p-2"><X size={20} /></button></header>;
const Metric = ({ label, value }: { label: string; value: string }) => <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{value}</p></article>;
const Badge = ({ status }: { status: BudgetStatus }) => <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">{statusLabels[status]}</span>;
const IconButton = ({ title, action, children }: { title: string; action: () => void; children: React.ReactNode }) => <button title={title} onClick={action} className="rounded-lg border p-2 hover:bg-slate-50">{children}</button>;
const Input = ({ label, value, set, type = "text" }: { label: string; value: any; set: (value: string) => void; type?: string }) => <label className="text-xs font-bold text-slate-600">{label}<input required type={type} value={value || ""} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>;
const Select = ({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: any[] }) => <label className="text-xs font-bold text-slate-600">{label}<select value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
const MoneyInput = ({ label, value, set }: { label: string; value: number; set: (value: number) => void }) => <label className="text-xs font-bold text-slate-600">{label}<input type="number" step="0.01" min="0" value={(value / 100).toFixed(2)} onChange={(event) => set(Math.round(Number(event.target.value) * 100))} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>;
const Decimal = ({ label, value, set }: { label: string; value: number; set: (value: number) => void }) => <label className="text-xs font-bold text-slate-600">{label}<input type="number" step="0.001" min="0.001" value={value} onChange={(event) => set(Number(event.target.value))} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>;
const Read = ({ label, value }: { label: string; value: string }) => <div className="text-xs font-bold text-slate-600">{label}<div className="mt-2 rounded-xl bg-white px-3 py-2.5 text-sm">{value}</div></div>;
