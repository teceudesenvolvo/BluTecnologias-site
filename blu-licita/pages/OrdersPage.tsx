import React from "react";
import { Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { contactService, type ContactLead } from "../../services/firebase";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, deleteCompanyDoc, listCompanyDocs } from "../services/firestoreCompany";

type CatalogItem = { id: string; type: "product" | "service"; name: string; unit: string; salePriceCents: number; costCents: number; taxPercent: number; taxRegime?: string; serviceCode?: string; ncm?: string; active?: boolean };
type OrderItem = { id: string; type: "product" | "service"; catalogItemId?: string; name: string; description?: string; quantityMilliUnits: number; unit: string; unitPriceCents: number; costCents: number; taxPercent: number; taxRegime?: string; serviceCode?: string; ncm?: string; totalCents: number; saveToCatalog?: boolean };
type Order = {
  id: string;
  number: string;
  kind: "service" | "supply";
  clientId: string;
  clientName: string;
  contractId: string;
  contractName: string;
  description: string;
  amountCents: number;
  items?: OrderItem[];
  status: string;
  dueDate: string;
  responsibleName?: string;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (value: number) => brl.format((value || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
const date = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const statuses: Record<string, string> = { draft: "Rascunho", issued: "Emitida", inProgress: "Em execução", delivered: "Entregue", accepted: "Aceita", overdue: "Atrasada", cancelled: "Cancelada" };

export const OrdersPage: React.FC = () => {
  const { user } = useBluAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [clients, setClients] = React.useState<ContactLead[]>([]);
  const [catalog, setCatalog] = React.useState<CatalogItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [savedOrders, savedClients] = await Promise.all([
        listCompanyDocs<Order>("serviceOrders", user.companyId).catch(() => []),
        contactService.getAll().catch(() => []),
      ]);
      const savedCatalog = await listCompanyDocs<CatalogItem>("products", user.companyId).catch(() => []);
      setOrders(savedOrders.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))));
      setClients(savedClients);
      setCatalog(savedCatalog.filter((item) => item.active !== false));
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { load(); }, [load]);

  const visible = orders.filter((item) => `${item.number} ${item.clientName} ${item.contractName} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  const active = orders.filter((item) => !["delivered", "accepted", "cancelled"].includes(item.status));
  const late = orders.filter((item) => item.dueDate && item.dueDate < today() && !["delivered", "accepted", "cancelled"].includes(item.status));

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Execução contratual</p>
          <h1 className="mt-2 text-3xl font-bold">Ordens</h1>
          <p className="mt-1 text-sm text-slate-500">Ordens de serviço e fornecimento vinculadas aos clientes e contratos salvos.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Plus size={17}/>Nova ordem</button>
      </header>
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Ordens ativas" value={String(active.length)} />
        <Metric label="Em execução" value={money(active.reduce((sum, item) => sum + Number(item.amountCents || 0), 0))} />
        <Metric label="Atrasadas" value={String(late.length)} />
        <Metric label="Contratos vinculados" value={String(new Set(orders.map((item) => item.contractId).filter(Boolean)).size)} />
      </section>
      <section className="rounded-2xl border bg-white p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ordem, cliente ou contrato" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"/>
        </label>
      </section>
      <section className="overflow-x-auto rounded-2xl border bg-white">
        {loading ? <div className="grid h-72 place-items-center"><Loader2 className="animate-spin text-blue-600"/></div> : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Ordem", "Tipo", "Cliente", "Contrato", "Valor", "Prazo", "Status", ""].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
            <tbody className="divide-y">
              {visible.map((item) => <tr key={item.id}>
                <td className="px-4 py-4"><b>{item.number}</b><small className="block text-slate-400">{item.description}</small></td>
                <td className="px-4">{item.kind === "service" ? "Serviço" : "Fornecimento"}</td>
                <td className="px-4">{item.clientName}</td>
                <td className="px-4">{item.contractName || "—"}</td>
                <td className="px-4 font-bold">{money(item.amountCents)}</td>
                <td className="px-4">{date(item.dueDate)}</td>
                <td className="px-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">{statuses[item.status] || item.status}</span></td>
                <td className="px-4 text-right"><button onClick={async () => { if (confirm("Excluir ordem?")) { await deleteCompanyDoc("serviceOrders", item.id); await load(); } }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></button></td>
              </tr>)}
              {!visible.length && <tr><td colSpan={8} className="p-12 text-center text-slate-400">Nenhuma ordem encontrada.</td></tr>}
            </tbody>
          </table>
        )}
      </section>
      {open && <OrderForm clients={clients} catalog={catalog} close={() => setOpen(false)} save={async (value) => { if (!user) return; const servicesToCatalog = (value.items || []).filter((item) => item.type === "service" && item.saveToCatalog); await createCompanyDoc("serviceOrders", user.companyId, user.id, value); await Promise.all(servicesToCatalog.map((item) => createCompanyDoc("products", user.companyId, user.id, { type: "service", name: item.name, sku: "", category: "Serviços", unit: item.unit, salePriceCents: item.unitPriceCents, costCents: item.costCents, taxPercent: item.taxPercent, taxRegime: item.taxRegime || "", serviceCode: item.serviceCode || "", notes: item.description || "", active: true }))); setOpen(false); await load(); }} />}
    </div>
  );
};

const emptyOrderItem = (): OrderItem => ({ id: crypto.randomUUID?.() || String(Date.now()), type: "service", catalogItemId: "", name: "", description: "", quantityMilliUnits: 1000, unit: "serv", unitPriceCents: 0, costCents: 0, taxPercent: 0, taxRegime: "", serviceCode: "", ncm: "", totalCents: 0, saveToCatalog: false });
const recalcOrderItem = (item: OrderItem): OrderItem => ({ ...item, totalCents: Math.round(Number(item.unitPriceCents || 0) * (Number(item.quantityMilliUnits || 0) / 1000)) });
const OrderForm = ({ clients, catalog, close, save }: { clients: ContactLead[]; catalog: CatalogItem[]; close: () => void; save: (value: Omit<Order, "id">) => Promise<void> }) => {
  const [form, setForm] = React.useState<Omit<Order, "id">>({ number: `OS-${new Date().getFullYear()}-`, kind: "service", clientId: "", clientName: "", contractId: "", contractName: "", description: "", amountCents: 0, items: [emptyOrderItem()], status: "issued", dueDate: today() });
  const client = clients.find((item) => item.id === form.clientId);
  const contracts = ((client as any)?.contracts || []).filter(Boolean);
  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    const items = (form.items || []).map((item, currentIndex) => currentIndex === index ? recalcOrderItem({ ...item, ...patch }) : item);
    setForm({ ...form, items, amountCents: items.reduce((sum, item) => sum + Number(item.totalCents || 0), 0) });
  };
  const selectCatalog = (index: number, id: string) => {
    const selected = catalog.find((item) => item.id === id);
    if (!selected) return updateItem(index, { catalogItemId: id });
    updateItem(index, { catalogItemId: id, type: selected.type || "product", name: selected.name, unit: selected.unit || "un", unitPriceCents: Number(selected.salePriceCents || 0), costCents: Number(selected.costCents || 0), taxPercent: Number(selected.taxPercent || 0), taxRegime: selected.taxRegime || "", serviceCode: selected.serviceCode || "", ncm: selected.ncm || "" });
  };
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4"><section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><h2 className="font-bold">Nova ordem</h2><button onClick={close}><X/></button></header><form onSubmit={(event) => { event.preventDefault(); save(form); }} className="grid max-h-[calc(92vh-72px)] gap-4 overflow-y-auto p-5 md:grid-cols-2">
    <Field label="Número" value={form.number} set={(v) => setForm({ ...form, number: v })}/>
    <label className="text-xs font-bold text-slate-600">Tipo<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as any })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><option value="service">Ordem de serviço</option><option value="supply">Ordem de fornecimento/produtos</option></select></label>
    <label className="text-xs font-bold text-slate-600">Cliente/órgão<select required value={form.clientId} onChange={(event) => { const selected = clients.find((item) => item.id === event.target.value); setForm({ ...form, clientId: event.target.value, clientName: selected?.razaoSocial || selected?.name || "", contractId: "", contractName: "" }); }} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><option value="">Selecione</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial || item.name}</option>)}</select></label>
    <label className="text-xs font-bold text-slate-600">Contrato<select value={form.contractId} onChange={(event) => { const selected = contracts.find((item: any) => String(item.id || item.title) === event.target.value); setForm({ ...form, contractId: event.target.value, contractName: selected?.title || selected?.name || "" }); }} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><option value="">Sem contrato</option>{contracts.map((item: any, index: number) => <option key={`${item.id || item.title}-${index}`} value={String(item.id || item.title)}>{item.title || item.name || `Contrato ${index + 1}`}</option>)}</select></label>
    <Read label="Valor total" value={money(form.amountCents)} />
    <Field label="Prazo" type="date" value={form.dueDate} set={(v) => setForm({ ...form, dueDate: v })}/>
    <label className="text-xs font-bold text-slate-600 md:col-span-2">Descrição<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal"/></label>
    <section className="space-y-3 md:col-span-2">
      <div className="flex items-center justify-between"><h3 className="font-bold">Itens da ordem</h3><button type="button" onClick={() => setForm({ ...form, items: [...(form.items || []), emptyOrderItem()] })} className="text-sm font-bold text-blue-600">+ Adicionar item</button></div>
      {(form.items || []).map((item, index) => <div key={item.id} className="grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-4">
        <label className="text-xs font-bold text-slate-600">Tipo<select value={item.type} onChange={(event) => updateItem(index, { type: event.target.value as any, catalogItemId: "", unit: event.target.value === "service" ? "serv" : "un" })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><option value="service">Serviço</option><option value="product">Produto</option></select></label>
        <label className="text-xs font-bold text-slate-600">Catálogo<select value={item.catalogItemId || ""} onChange={(event) => selectCatalog(index, event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><option value="">Item manual</option>{catalog.filter((entry) => (entry.type || "product") === item.type).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {money(entry.salePriceCents)}</option>)}</select></label>
        <Field label="Nome" value={item.name} set={(v) => updateItem(index, { name: v })}/>
        <Field label="Unidade" value={item.unit} set={(v) => updateItem(index, { unit: v })}/>
        <Field label="Quantidade" type="number" value={String(item.quantityMilliUnits / 1000)} set={(v) => updateItem(index, { quantityMilliUnits: Math.round(Number(v) * 1000) })}/>
        <Field label="Preço unit. (R$)" type="number" value={String(item.unitPriceCents / 100)} set={(v) => updateItem(index, { unitPriceCents: Math.round(Number(v) * 100) })}/>
        <Field label="Custo unit. (R$)" type="number" value={String(item.costCents / 100)} set={(v) => updateItem(index, { costCents: Math.round(Number(v) * 100) })}/>
        <Field label="Impostos (%)" type="number" value={String(item.taxPercent)} set={(v) => updateItem(index, { taxPercent: Number(v) })}/>
        <Field label={item.type === "service" ? "Código serviço" : "NCM"} value={item.type === "service" ? item.serviceCode || "" : item.ncm || ""} set={(v) => updateItem(index, item.type === "service" ? { serviceCode: v } : { ncm: v })}/>
        <Field label="Regra tributária" value={item.taxRegime || ""} set={(v) => updateItem(index, { taxRegime: v })}/>
        <Read label="Total do item" value={money(item.totalCents)} />
        <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700"><input type="checkbox" checked={!!item.saveToCatalog} onChange={(event) => updateItem(index, { saveToCatalog: event.target.checked })}/>Salvar no catálogo</label>
        <label className="text-xs font-bold text-slate-600 md:col-span-4">Descrição do item<textarea value={item.description || ""} onChange={(event) => updateItem(index, { description: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal"/></label>
      </div>)}
    </section>
    <footer className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={close} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white"><Save size={16}/>Salvar</button></footer>
  </form></section></div>;
};

const Metric = ({ label, value }: { label: string; value: string }) => <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>;
const Field = ({ label, value, set, type = "text" }: { label: string; value: string; set: (value: string) => void; type?: string }) => <label className="text-xs font-bold text-slate-600">{label}<input required type={type} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal"/></label>;
const Read = ({ label, value }: { label: string; value: string }) => <div className="text-xs font-bold text-slate-600">{label}<div className="mt-2 rounded-xl border bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800">{value}</div></div>;
