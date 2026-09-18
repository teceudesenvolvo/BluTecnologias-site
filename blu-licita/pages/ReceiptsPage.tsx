import React from "react";
import { Check, Download, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, listCompanyDocs } from "../services/firestoreCompany";
import { serviceSchedulingService } from "../services/serviceSchedulingService";
import { financialService } from "../../services/firebase";

type ReceiptItem = { id: string; description: string; quantity: number; unitPriceCents: number; type: "product" | "service" };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents: number) => brl.format(Number(cents || 0) / 100);
const label = (item: any) => {
  // Para pessoas jurídicas, o recibo deve identificar a empresa pela Razão Social.
  if (item?.cnpj || item?.documentType === "cnpj" || item?.type === "company") {
    return item?.razaoSocial || item?.legalName || item?.tradeName || item?.name || "Empresa";
  }
  return item?.name || item?.razaoSocial || item?.description || item?.tradeName || "Item";
};

export const ReceiptsPage = () => {
  const { user } = useBluAuth();
  const companyId = user?.companyId || "";
  const [clients, setClients] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [services, setServices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [manualClient, setManualClient] = React.useState({ name: "", document: "", email: "" });
  const [items, setItems] = React.useState<ReceiptItem[]>([]);
  const [manualItem, setManualItem] = React.useState({ description: "", quantity: 1, unitPrice: "" });
  const [lastReceipt, setLastReceipt] = React.useState<any>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    if (!companyId) return;
    Promise.all([
      listCompanyDocs<any>("clients", companyId),
      listCompanyDocs<any>("products", companyId),
      serviceSchedulingService.load(companyId).catch(() => ({ services: [] })),
    ]).then(([c, p, foundation]) => { setClients(c); setProducts(p.filter((x) => x.active !== false)); setServices((foundation?.services || []).filter((x: any) => x.active !== false).map((x: any) => ({ ...x, name: x.product?.name || "Serviço", priceCents: x.product?.salePriceCents || 0 }))); })
      .catch((error) => setNotice(error?.message || "Não foi possível carregar os cadastros."))
      .finally(() => setLoading(false));
  }, [companyId]);

  const selectedClient = clients.find((item) => item.id === clientId);
  const client = selectedClient ? { ...selectedClient, name: label(selectedClient), document: selectedClient.document || selectedClient.cnpj || selectedClient.cpf || "" } : manualClient;
  const total = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
  const addCatalog = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value; if (!value) return;
    const [type, id] = value.split(":");
    const source = (type === "product" ? products : services).find((item) => item.id === id);
    if (!source) return;
    setItems((current) => [...current, { id: crypto.randomUUID(), description: label(source), quantity: 1, unitPriceCents: Number(source.priceCents ?? source.salePriceCents ?? Math.round(Number(source.price || 0) * 100)), type } as ReceiptItem]);
    event.target.value = "";
  };
  const addManual = () => {
    if (!manualItem.description.trim()) return setNotice("Informe a descrição do item.");
    setItems((current) => [...current, { id: crypto.randomUUID(), description: manualItem.description.trim(), quantity: Math.max(1, Number(manualItem.quantity || 1)), unitPriceCents: Math.round(Number(String(manualItem.unitPrice).replace(",", ".") || 0) * 100), type: "product" }]);
    setManualItem({ description: "", quantity: 1, unitPrice: "" });
  };
  const openDocument = (receipt: any) => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return setNotice("Permita pop-ups para imprimir o recibo.");
    const rows = receipt.items.map((item: ReceiptItem) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${money(item.unitPriceCents)}</td><td>${money(item.quantity * item.unitPriceCents)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${receipt.code}</title><style>body{font:14px Arial;max-width:760px;margin:40px auto;color:#172033}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:bold;text-align:right;margin-top:24px}</style></head><body><h1>RECIBO</h1><p><b>${receipt.code}</b><br>${new Date(receipt.createdAt).toLocaleDateString("pt-BR")}</p><p>Recebemos de <b>${receipt.client.name || "Cliente avulso"}</b>${receipt.client.document ? ` — ${receipt.client.document}` : ""}${receipt.client.email ? ` — ${receipt.client.email}` : ""}.</p><table><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total recebido: ${money(receipt.totalCents)}</p><p>Documento emitido pelo Sistema de Gestão Blu Tecnologias.</p><script>setTimeout(()=>window.print(),200)<\\/script></body></html>`);
    popup.document.close();
  };
  const save = async () => {
    if (!companyId) return;
    if (!client.name?.trim()) return setNotice("Selecione um cliente ou informe o nome do cliente avulso.");
    if (!items.length) return setNotice("Adicione pelo menos um produto ou serviço.");
    const createFinancialEntry = window.confirm("Deseja gerar também uma entrada no financeiro para este recibo?\n\nOK: gerar entrada financeira\nCancelar: salvar somente o recibo");
    setSaving(true); setNotice("");
    try {
      const receipt = { code: `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`, companyId, clientId: selectedClient?.id || "", client: { name: client.name.trim(), document: client.document || "", email: client.email || "" }, items, totalCents: total, status: "issued", createdAt: new Date().toISOString() };
      await createCompanyDoc("receipts", companyId, user?.id || "", receipt);
      if (createFinancialEntry) {
        const saved = await financialService.add({
          description: `Recibo ${receipt.code} · ${receipt.client.name}`,
          amount: receipt.totalCents / 100,
          type: "income",
          date: new Date().toISOString().slice(0, 10),
          company: user?.companyName || companyId,
          receiptId: receipt.code,
          origin: "receipt",
        } as any);
        if (!saved) throw new Error("O recibo foi salvo, mas não foi possível gerar a entrada no financeiro.");
      }
      setLastReceipt(receipt); setNotice("Recibo salvo com sucesso.");
    } catch (error: any) { setNotice(error?.message || "Não foi possível salvar o recibo."); } finally { setSaving(false); }
  };
  if (loading) return <div className="grid min-h-[500px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  return <div className="mx-auto max-w-6xl space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Documentos comerciais</p><h1 className="mt-2 text-3xl font-bold">Recibos</h1><p className="text-sm text-slate-500">Emita recibos para produtos, serviços, clientes cadastrados ou atendimentos avulsos.</p></div><button onClick={() => { setItems([]); setLastReceipt(null); setNotice(""); setFormOpen(true); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> Novo recibo</button></header>
    {notice && <div className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">{notice}</div>}
    <section className="rounded-2xl border bg-white"><div className="grid grid-cols-3 gap-4 p-5 text-sm"><div><span className="text-slate-500">Clientes cadastrados</span><b className="mt-1 block text-2xl">{clients.length}</b></div><div><span className="text-slate-500">Produtos e serviços</span><b className="mt-1 block text-2xl">{products.length + services.length}</b></div><div><span className="text-slate-500">Status</span><b className="mt-1 block text-2xl text-emerald-600">Pronto</b></div></div><div className="border-t p-10 text-center text-sm text-slate-500">Clique em <b>Novo recibo</b> para montar um documento.</div></section>
    {formOpen && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Novo documento</p><h2 className="text-2xl font-bold">Criar recibo</h2></div><button onClick={() => setFormOpen(false)} className="rounded-xl border px-4 py-2 font-bold">Fechar</button></div><section className="grid gap-5 lg:grid-cols-2"><div className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Cliente</h2><select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-xl border px-3 py-3"><option value="">Cliente avulso / preencher manualmente</option>{clients.map((item) => <option key={item.id} value={item.id}>{label(item)}{item.cnpj || item.cpf ? ` · ${item.cnpj || item.cpf}` : ""}</option>)}</select>{!clientId && <div className="grid gap-3 sm:grid-cols-3"><input placeholder="Nome / razão social" value={manualClient.name} onChange={(e) => setManualClient({ ...manualClient, name: e.target.value })} className="rounded-xl border px-3 py-3 sm:col-span-3" /><input placeholder="CPF/CNPJ" value={manualClient.document} onChange={(e) => setManualClient({ ...manualClient, document: e.target.value })} className="rounded-xl border px-3 py-3" /><input placeholder="E-mail" value={manualClient.email} onChange={(e) => setManualClient({ ...manualClient, email: e.target.value })} className="rounded-xl border px-3 py-3 sm:col-span-2" /></div>}</div><div className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Itens do recibo</h2><select defaultValue="" onChange={addCatalog} className="w-full rounded-xl border px-3 py-3"><option value="">Adicionar produto ou serviço do cadastro</option><optgroup label="Produtos">{products.map((item) => <option key={`product:${item.id}`} value={`product:${item.id}`}>{label(item)}</option>)}</optgroup><optgroup label="Serviços">{services.map((item) => <option key={`service:${item.id}`} value={`service:${item.id}`}>{label(item)}</option>)}</optgroup></select><div className="grid gap-2 sm:grid-cols-[1fr_90px_120px_auto]"><input placeholder="Item manual" value={manualItem.description} onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })} className="rounded-xl border px-3 py-2" /><input type="number" min="1" value={manualItem.quantity} onChange={(e) => setManualItem({ ...manualItem, quantity: Number(e.target.value) })} className="rounded-xl border px-3 py-2" /><input placeholder="Preço" value={manualItem.unitPrice} onChange={(e) => setManualItem({ ...manualItem, unitPrice: e.target.value })} className="rounded-xl border px-3 py-2" /><button onClick={addManual} className="rounded-xl bg-slate-900 px-3 py-2 text-white"><Plus size={18} /></button></div><div className="divide-y rounded-xl border">{items.map((item) => <div key={item.id} className="flex items-center gap-3 p-3 text-sm"><span className="min-w-0 flex-1"><b className="block truncate">{item.description}</b><small className="text-slate-500">{item.quantity} × {money(item.unitPriceCents)} · {item.type === "service" ? "Serviço" : "Produto"}</small></span><b>{money(item.quantity * item.unitPriceCents)}</b><button onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-rose-500"><Trash2 size={16} /></button></div>)}{!items.length && <p className="p-5 text-center text-sm text-slate-400">Nenhum item adicionado.</p>}</div><div className="flex items-center justify-between border-t pt-4 text-xl font-black"><span>Total</span><span>{money(total)}</span></div></div></section><div className="mt-5 flex flex-wrap justify-end gap-3"><button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Check size={18} />{saving ? "Salvando…" : "Salvar recibo"}</button>{lastReceipt && <button onClick={() => openDocument(lastReceipt)} className="flex items-center gap-2 rounded-xl border px-5 py-3 font-bold"><Printer size={18} />Imprimir / PDF</button>}</div></div></div>}
  </div>;
};
