import React from "react";
import { Check, Download, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, listCompanyDocs } from "../services/firestoreCompany";
import { serviceSchedulingService } from "../services/serviceSchedulingService";
import { financialService } from "../../services/firebase";
import { companySettingsService } from "../../services/firestoreSettingsService";

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
  const [receipts, setReceipts] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [filterCompanyId, setFilterCompanyId] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [companyChooserOpen, setCompanyChooserOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [senderCompanyId, setSenderCompanyId] = React.useState("");

  React.useEffect(() => {
    if (!companyId) return;
    Promise.all([
      listCompanyDocs<any>("clients", companyId),
      listCompanyDocs<any>("products", companyId),
      serviceSchedulingService.load(companyId).catch(() => ({ services: [] })),
      listCompanyDocs<any>("receipts", companyId),
    ]).then(async ([c, p, foundation, savedReceipts]) => { setClients(c); setProducts(p.filter((x) => x.active !== false)); setServices((foundation?.services || []).filter((x: any) => x.active !== false).map((x: any) => ({ ...x, name: x.product?.name || "Serviço", priceCents: x.product?.salePriceCents || 0 }))); setReceipts(savedReceipts.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))); setCompanies(await companySettingsService.getAll().catch(() => [])); })
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
    const company = receipt.company || {};
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${receipt.code}</title><style>body{font:14px Arial;max-width:760px;margin:40px auto;color:#172033}header{border-bottom:3px solid #0ea5e9;padding-bottom:16px;margin-bottom:24px}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:bold;text-align:right;margin-top:24px}.muted{color:#64748b}</style></head><body><header><h2>${company.razaoSocial || company.nomeFantasia || "Empresa emissora"}</h2><p class="muted">CNPJ: ${company.cnpj || company.document || "não informado"} · ${company.email || ""}</p></header><h1>RECIBO</h1><p><b>${receipt.code}</b><br>${new Date(receipt.createdAt).toLocaleDateString("pt-BR")}</p><p>Recebemos de <b>${receipt.client.name || "Cliente avulso"}</b>${receipt.client.document ? ` — ${receipt.client.document}` : ""}${receipt.client.email ? ` — ${receipt.client.email}` : ""}.</p><table><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total recebido: ${money(receipt.totalCents)}</p><p>Documento emitido pelo Sistema de Gestão Blu Tecnologias.</p><script>setTimeout(()=>window.print(),200)<\\/script></body></html>`);
    popup.document.close();
  };
  const save = async () => {
    if (!companyId) return;
    if (!client.name?.trim()) return setNotice("Selecione um cliente ou informe o nome do cliente avulso.");
    if (!items.length) return setNotice("Adicione pelo menos um produto ou serviço.");
    if (!senderCompanyId) return setNotice("Selecione a empresa que emitirá o recibo.");
    const createFinancialEntry = window.confirm("Deseja gerar também uma entrada no financeiro para este recibo?\n\nOK: gerar entrada financeira\nCancelar: salvar somente o recibo, sem alterar o financeiro.");
    const receivedNow = createFinancialEntry ? window.confirm("O recibo já foi recebido?\n\nOK: marcar como recebido agora\nCancelar: registrar como recebimento futuro") : false;
    setSaving(true); setNotice("");
    try {
      const senderCompany = companies.find((item) => item.id === senderCompanyId);
      const receipt = { code: `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`, companyId, senderCompanyId, company: senderCompany || {}, clientId: selectedClient?.id || "", client: { name: client.name.trim(), document: client.document || "", email: client.email || "" }, items, totalCents: total, status: "issued", financialStatus: createFinancialEntry ? (receivedNow ? "received" : "pending") : "none", createdAt: new Date().toISOString() };
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
          status: receivedNow ? "received" : "pending",
          receivedAt: receivedNow ? new Date().toISOString() : "",
        } as any);
        if (!saved) throw new Error("O recibo foi salvo, mas não foi possível gerar a entrada no financeiro.");
      }
      setLastReceipt(receipt); setReceipts((current) => [receipt, ...current]); setNotice(createFinancialEntry ? `Recibo salvo e lançamento financeiro registrado como ${receivedNow ? "recebido" : "recebimento futuro"}.` : "Recibo salvo sem alteração no financeiro.");
    } catch (error: any) { setNotice(error?.message || "Não foi possível salvar o recibo."); } finally { setSaving(false); }
  };
  if (loading) return <div className="grid min-h-[500px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  const filteredReceipts = receipts.filter((receipt) => {
    const haystack = `${receipt.code} ${receipt.client?.name || ""} ${receipt.client?.document || ""}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (filterCompanyId === "all" || receipt.senderCompanyId === filterCompanyId) && (statusFilter === "all" || (statusFilter === "received" ? receipt.financialStatus === "received" : receipt.financialStatus === "pending"));
  });
  return <div className="mx-auto max-w-[1600px] space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Planejamento comercial</p><h1 className="mt-2 text-3xl font-bold">Recibos</h1><p className="text-sm text-slate-500">Emita, organize e acompanhe recibos de produtos e serviços.</p><p className="mt-2 text-xs font-semibold text-slate-400">Clientes cadastrados ou avulsos, com opção de lançamento financeiro.</p></div><button onClick={() => { setItems([]); setLastReceipt(null); setNotice(""); setCompanyChooserOpen(true); setFormOpen(true); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> Novo recibo</button></header>
    {notice && <div className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">{notice}</div>}
    {companyChooserOpen && <div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/55 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Novo recibo</p><h2 className="mt-2 text-2xl font-bold">Escolha a empresa emissora</h2><p className="mt-2 text-sm text-slate-500">O timbrado e os dados desta empresa serão usados no recibo.</p><select value={senderCompanyId} onChange={(e) => setSenderCompanyId(e.target.value)} className="mt-5 w-full rounded-xl border px-3 py-3"><option value="">Selecione a empresa geradora</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial || item.nomeFantasia || item.name}{item.cnpj ? ` · ${item.cnpj}` : ""}</option>)}</select><div className="mt-5 flex justify-end gap-2"><button onClick={() => { setCompanyChooserOpen(false); setFormOpen(false); }} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button disabled={!senderCompanyId} onClick={() => setCompanyChooserOpen(false)} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">Continuar</button></div></div></div>}
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-bold text-amber-800">Os recibos podem ser salvos sem lançamento financeiro ou registrados como recebidos e recebimentos futuros.</div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border bg-white p-5"><span className="text-sm text-slate-500">Recibos emitidos</span><b className="mt-2 block text-3xl">{receipts.length}</b></div><div className="rounded-2xl border bg-white p-5"><span className="text-sm text-slate-500">Valor total</span><b className="mt-2 block text-3xl">{money(receipts.reduce((sum, item) => sum + Number(item.totalCents || 0), 0))}</b></div><div className="rounded-2xl border bg-white p-5"><span className="text-sm text-slate-500">Recebidos</span><b className="mt-2 block text-3xl text-emerald-600">{receipts.filter((item) => item.financialStatus === "received").length}</b></div><div className="rounded-2xl border bg-white p-5"><span className="text-sm text-slate-500">Recebimentos futuros</span><b className="mt-2 block text-3xl text-amber-600">{receipts.filter((item) => item.financialStatus === "pending").length}</b></div></section>
    <section className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Recibos emitidos</h2><span className="text-sm text-slate-500">{filteredReceipts.length} resultado(s)</span></div><div className="grid gap-3 md:grid-cols-[1fr_220px_220px]"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, cliente ou CPF/CNPJ" className="rounded-xl border px-3 py-2.5 text-sm"/><select value={filterCompanyId} onChange={(e) => setFilterCompanyId(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="all">Todas as empresas</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial || item.nomeFantasia || item.name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="all">Todos os lançamentos</option><option value="received">Recebidos</option><option value="pending">Recebimentos futuros</option></select></div><div className="divide-y">{filteredReceipts.map((receipt) => <div key={receipt.id || receipt.code} className="flex flex-wrap items-center gap-3 py-4"><div className="min-w-0 flex-1"><b>{receipt.code}</b><p className="text-sm text-slate-500">{receipt.client?.name || "Cliente avulso"} · {new Date(receipt.createdAt).toLocaleDateString("pt-BR")}</p></div><strong>{money(receipt.totalCents)}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${receipt.financialStatus === "received" ? "bg-emerald-50 text-emerald-700" : receipt.financialStatus === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{receipt.financialStatus === "received" ? "Recebido" : receipt.financialStatus === "pending" ? "Recebimento futuro" : "Sem lançamento financeiro"}</span><button onClick={() => openDocument(receipt)} className="rounded-xl border px-3 py-2 text-xs font-bold"><Printer size={14} className="mr-1 inline"/>PDF</button></div>)}{!filteredReceipts.length && <p className="py-8 text-center text-sm text-slate-400">Nenhum recibo encontrado.</p>}</div></section>
    {formOpen && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Novo documento</p><h2 className="text-2xl font-bold">Criar recibo</h2></div><button onClick={() => setFormOpen(false)} className="rounded-xl border px-4 py-2 font-bold">Fechar</button></div><section className="grid gap-5 lg:grid-cols-2"><div className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Cliente</h2><select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-xl border px-3 py-3"><option value="">Cliente avulso / preencher manualmente</option>{clients.map((item) => <option key={item.id} value={item.id}>{label(item)}{item.cnpj || item.cpf ? ` · ${item.cnpj || item.cpf}` : ""}</option>)}</select>{!clientId && <div className="grid gap-3 sm:grid-cols-3"><input placeholder="Nome / razão social" value={manualClient.name} onChange={(e) => setManualClient({ ...manualClient, name: e.target.value })} className="rounded-xl border px-3 py-3 sm:col-span-3" /><input placeholder="CPF/CNPJ" value={manualClient.document} onChange={(e) => setManualClient({ ...manualClient, document: e.target.value })} className="rounded-xl border px-3 py-3" /><input placeholder="E-mail" value={manualClient.email} onChange={(e) => setManualClient({ ...manualClient, email: e.target.value })} className="rounded-xl border px-3 py-3 sm:col-span-2" /></div>}</div><div className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Itens do recibo</h2><select defaultValue="" onChange={addCatalog} className="w-full rounded-xl border px-3 py-3"><option value="">Adicionar produto ou serviço do cadastro</option><optgroup label="Produtos">{products.map((item) => <option key={`product:${item.id}`} value={`product:${item.id}`}>{label(item)}</option>)}</optgroup><optgroup label="Serviços">{services.map((item) => <option key={`service:${item.id}`} value={`service:${item.id}`}>{label(item)}</option>)}</optgroup></select><div className="grid gap-2 sm:grid-cols-[1fr_90px_120px_auto]"><input placeholder="Item manual" value={manualItem.description} onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })} className="rounded-xl border px-3 py-2" /><input type="number" min="1" value={manualItem.quantity} onChange={(e) => setManualItem({ ...manualItem, quantity: Number(e.target.value) })} className="rounded-xl border px-3 py-2" /><input placeholder="Preço" value={manualItem.unitPrice} onChange={(e) => setManualItem({ ...manualItem, unitPrice: e.target.value })} className="rounded-xl border px-3 py-2" /><button onClick={addManual} className="rounded-xl bg-slate-900 px-3 py-2 text-white"><Plus size={18} /></button></div><div className="divide-y rounded-xl border">{items.map((item) => <div key={item.id} className="flex items-center gap-3 p-3 text-sm"><span className="min-w-0 flex-1"><b className="block truncate">{item.description}</b><small className="text-slate-500">{item.quantity} × {money(item.unitPriceCents)} · {item.type === "service" ? "Serviço" : "Produto"}</small></span><b>{money(item.quantity * item.unitPriceCents)}</b><button onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-rose-500"><Trash2 size={16} /></button></div>)}{!items.length && <p className="p-5 text-center text-sm text-slate-400">Nenhum item adicionado.</p>}</div><div className="flex items-center justify-between border-t pt-4 text-xl font-black"><span>Total</span><span>{money(total)}</span></div></div></section><div className="mt-5 flex flex-wrap justify-end gap-3"><button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Check size={18} />{saving ? "Salvando…" : "Salvar recibo"}</button>{lastReceipt && <button onClick={() => openDocument(lastReceipt)} className="flex items-center gap-2 rounded-xl border px-5 py-3 font-bold"><Printer size={18} />Imprimir / PDF</button>}</div></div></div>}
  </div>;
};
