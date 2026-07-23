import React from "react";
import { Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, deleteCompanyDoc, listCompanyDocs } from "../services/firestoreCompany";

type Product = { id: string; type: "product" | "service"; name: string; sku?: string; category: string; unit: string; salePriceCents: number; costCents: number; taxPercent: number; taxRegime?: string; taxCode?: string; serviceCode?: string; ncm?: string; cfop?: string; issPercent?: number; icmsPercent?: number; pisPercent?: number; cofinsPercent?: number; notes?: string; active: boolean };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);

export const ProductsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [items, setItems] = React.useState<Product[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setItems(await listCompanyDocs<Product>("products", user.companyId)); }
    finally { setLoading(false); }
  }, [user]);
  React.useEffect(() => { load(); }, [load]);
  const visible = items.filter((item) => `${item.type} ${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Catálogo comercial</p><h1 className="mt-2 text-3xl font-bold">Produtos e serviços</h1><p className="mt-1 text-sm text-slate-500">Gerenciador focado em venda ao governo, formação de orçamento e proposta — não em estoque ou logística.</p></div><button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Plus size={17}/>Novo item</button></header>
    <section className="grid gap-3 sm:grid-cols-4"><Metric label="Itens ativos" value={String(items.filter((item) => item.active).length)}/><Metric label="Produtos" value={String(items.filter((item) => (item.type || "product") === "product").length)}/><Metric label="Serviços" value={String(items.filter((item) => item.type === "service").length)}/><Metric label="Margem média" value={`${Math.round(items.reduce((sum, item) => sum + (item.salePriceCents ? ((item.salePriceCents - item.costCents) / item.salePriceCents) * 100 : 0), 0) / Math.max(1, items.length))}%`}/></section>
    <section className="rounded-2xl border bg-white p-4"><label className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto, serviço, categoria ou SKU" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"/></label></section>
    <section className="overflow-x-auto rounded-2xl border bg-white">{loading ? <div className="grid h-72 place-items-center"><Loader2 className="animate-spin text-blue-600"/></div> : <table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Item", "Tipo", "Categoria", "Unidade", "Preço venda", "Custo", "Tributação", "Margem", ""].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y">{visible.map((item) => <tr key={item.id}><td className="px-4 py-4"><b>{item.name}</b><small className="block text-slate-400">{item.sku || "Sem código"} · {item.active ? "Ativo" : "Inativo"}</small></td><td className="px-4">{item.type === "service" ? "Serviço" : "Produto"}</td><td className="px-4">{item.category || "—"}</td><td className="px-4">{item.unit}</td><td className="px-4 font-bold">{money(item.salePriceCents)}</td><td className="px-4">{money(item.costCents)}</td><td className="px-4">{item.taxPercent}%<small className="block text-slate-400">{item.type === "service" ? item.serviceCode || "Sem código serviço" : item.ncm || "Sem NCM"}</small></td><td className="px-4 font-bold text-emerald-600">{item.salePriceCents ? Math.round(((item.salePriceCents - item.costCents) / item.salePriceCents) * 100) : 0}%</td><td className="px-4 text-right"><button onClick={async () => { if (confirm("Excluir item do catálogo?")) { await deleteCompanyDoc("products", item.id); await load(); } }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></button></td></tr>)}{!visible.length && <tr><td colSpan={9} className="p-12 text-center text-slate-400">Nenhum item cadastrado.</td></tr>}</tbody></table>}</section>
    {open && <ProductForm close={() => setOpen(false)} save={async (value) => { if (!user) return; await createCompanyDoc("products", user.companyId, user.id, value); setOpen(false); await load(); }}/>}
  </div>;
};

const ProductForm = ({ close, save }: { close: () => void; save: (value: Omit<Product, "id">) => Promise<void> }) => {
  const [form, setForm] = React.useState<Omit<Product, "id">>({ type: "product", name: "", sku: "", category: "", unit: "un", salePriceCents: 0, costCents: 0, taxPercent: 0, taxRegime: "", taxCode: "", serviceCode: "", ncm: "", cfop: "", issPercent: 0, icmsPercent: 0, pisPercent: 0, cofinsPercent: 0, notes: "", active: true });
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4"><section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><h2 className="font-bold">Novo produto ou serviço</h2><button onClick={close}><X/></button></header><form onSubmit={(event) => { event.preventDefault(); save(form); }} className="flex max-h-[calc(92vh-72px)] flex-col"><div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
    <section className="grid gap-4 rounded-2xl border bg-slate-50 p-4 md:col-span-2 md:grid-cols-4">
      <label className="text-xs font-bold text-slate-600">Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Product["type"], unit: event.target.value === "service" ? "serv" : "un" })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"><option value="product">Produto</option><option value="service">Serviço</option></select></label>
      <Field label="Nome" value={form.name} set={(v) => setForm({ ...form, name: v })}/>
      <Field label="SKU/Código interno" value={form.sku || ""} set={(v) => setForm({ ...form, sku: v })}/>
      <Field label="Categoria comercial" value={form.category} set={(v) => setForm({ ...form, category: v })}/>
      <Field label="Unidade" value={form.unit} set={(v) => setForm({ ...form, unit: v })}/>
      <Field label="Preço de venda (R$)" type="number" value={String(form.salePriceCents / 100)} set={(v) => setForm({ ...form, salePriceCents: Math.round(Number(v) * 100) })}/>
      <Field label="Custo estimado (R$)" type="number" value={String(form.costCents / 100)} set={(v) => setForm({ ...form, costCents: Math.round(Number(v) * 100) })}/>
      <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })}/>Ativo para propostas</label>
    </section>
    <section className="grid gap-4 rounded-2xl border bg-white p-4 md:col-span-2 md:grid-cols-4">
      <h3 className="font-bold md:col-span-4">Tributação gerencial</h3>
      <Field label="Regime/regra tributária" value={form.taxRegime || ""} set={(v) => setForm({ ...form, taxRegime: v })}/>
      <Field label="Código fiscal interno" value={form.taxCode || ""} set={(v) => setForm({ ...form, taxCode: v })}/>
      {form.type === "service" ? <Field label="Código de serviço / LC 116" value={form.serviceCode || ""} set={(v) => setForm({ ...form, serviceCode: v })}/> : <Field label="NCM" value={form.ncm || ""} set={(v) => setForm({ ...form, ncm: v })}/>}
      <Field label="CFOP" value={form.cfop || ""} set={(v) => setForm({ ...form, cfop: v })}/>
      <Field label="Impostos totais (%)" type="number" value={String(form.taxPercent)} set={(v) => setForm({ ...form, taxPercent: Number(v) })}/>
      <Field label="ISS (%)" type="number" value={String(form.issPercent || 0)} set={(v) => setForm({ ...form, issPercent: Number(v) })}/>
      <Field label="ICMS (%)" type="number" value={String(form.icmsPercent || 0)} set={(v) => setForm({ ...form, icmsPercent: Number(v) })}/>
      <Field label="PIS (%)" type="number" value={String(form.pisPercent || 0)} set={(v) => setForm({ ...form, pisPercent: Number(v) })}/>
      <Field label="COFINS (%)" type="number" value={String(form.cofinsPercent || 0)} set={(v) => setForm({ ...form, cofinsPercent: Number(v) })}/>
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700 md:col-span-3">Esses dados são usados para formação de preço e gestão gerencial. A validação fiscal final deve ser feita pela contabilidade.</p>
    </section>
    <label className="text-xs font-bold text-slate-600 md:col-span-2">Observações comerciais<textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal"/></label>
  </div><footer className="flex justify-end gap-2 border-t p-5"><button type="button" onClick={close} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white"><Save size={16}/>Salvar</button></footer></form></section></div>;
};
const Metric = ({ label, value }: { label: string; value: string }) => <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>;
const Field = ({ label, value, set, type = "text" }: { label: string; value: string; set: (value: string) => void; type?: string }) => <label className="text-xs font-bold text-slate-600">{label}<input required type={type} step={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal"/></label>;
