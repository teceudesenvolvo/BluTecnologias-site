import React from "react";
import { Building2, CheckCircle2, Loader2, Mail, Minus, Plus, Printer, ReceiptText, Search, ShoppingCart, Trash2, UserPlus, X } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useBluAuth } from "../contexts/BluAuthContext";
import { listCompanyDocs } from "../services/firestoreCompany";
import { contactService, db, functions, type Company, type ContactLead } from "../../services/firebase";
import { lookupCnpjData } from "../../services/cnpjLookup";

type Product = { id: string; type?: "product" | "service"; name: string; barcode?: string; sku?: string; unit?: string; salePriceCents: number; stockQuantity?: number; taxPercent?: number; active?: boolean };
type CartItem = Product & { quantityMilli: number };
type Sale = { id: string; saleNumber: string; clientName: string; netAmountCents: number; issueDate: string; status: string; items: Array<{ name: string; quantityMilli: number; unit: string; unitPriceCents: number; totalCents: number }> };
type CompleteResult = { id: string };

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);
const escapeHtml = (value: unknown) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const today = () => new Date().toISOString().slice(0, 10);
const emptyClient = () => ({ kind: "company" as "company" | "person", document: "", name: "", email: "", phone: "", city: "", state: "", address: "", cep: "" });

export const PublicPointOfSalePage: React.FC = () => {
  const { user } = useBluAuth();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [clients, setClients] = React.useState<ContactLead[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [contractId, setContractId] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(today());
  const [dueDate, setDueDate] = React.useState(today());
  const [discountCents, setDiscountCents] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState("invoice");
  const [cardType, setCardType] = React.useState<"credit" | "debit">("credit");
  const [installments, setInstallments] = React.useState(1);
  const [paid, setPaid] = React.useState(false);
  const [fiscalRequested, setFiscalRequested] = React.useState(true);
  const [sendEmail, setSendEmail] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [lastSale, setLastSale] = React.useState<Sale | null>(null);
  const [clientModal, setClientModal] = React.useState(false);
  const [clientForm, setClientForm] = React.useState(emptyClient());
  const [clientSaving, setClientSaving] = React.useState(false);
  const [clientLookup, setClientLookup] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const [catalog, contacts, recent, companySnap] = await Promise.all([
        listCompanyDocs<Product>("products", user.companyId), listCompanyDocs<ContactLead>("clients", user.companyId),
        listCompanyDocs<Sale>("pointOfSaleSales", user.companyId), getDoc(doc(db, "companies", user.companyId)),
      ]);
      setProducts(catalog.filter((item) => item.active !== false));
      setClients(contacts);
      setSales(recent.sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate))).slice(0, 20));
      setCompany(companySnap.exists() ? companySnap.data() as Company : null);
    } catch (error) { console.error(error); setMessage("Não foi possível carregar os dados do PDV."); }
    finally { setLoading(false); }
  }, [user?.companyId]);

  React.useEffect(() => { void load(); }, [load]);
  const selectedClient = clients.find((item) => item.id === clientId);
  const selectedContract = selectedClient?.contracts?.find((item) => item.id === contractId);
  const filtered = products.filter((item) => `${item.name} ${item.barcode || ""} ${item.sku || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  const subtotal = cart.reduce((sum, item) => sum + Math.round(item.salePriceCents * item.quantityMilli / 1000), 0);
  const taxTotal = cart.reduce((sum, item) => sum + Math.round(item.salePriceCents * item.quantityMilli / 1000 * Number(item.taxPercent || 0) / 100), 0);
  const total = Math.max(0, subtotal - discountCents);

  const add = (product: Product) => setCart((current) => {
    const found = current.find((item) => item.id === product.id);
    return found ? current.map((item) => item.id === product.id ? { ...item, quantityMilli: item.quantityMilli + 1000 } : item) : [...current, { ...product, quantityMilli: 1000 }];
  });
  const quantity = (id: string, amount: number) => setCart((current) => current.map((item) => item.id === id ? { ...item, quantityMilli: Math.max(1000, item.quantityMilli + amount) } : item));

  const lookupDocument = async () => {
    if (clientForm.kind !== "company" || clientForm.document.replace(/\D/g, "").length !== 14) return;
    setClientLookup(true);
    try {
      const data = await lookupCnpjData(clientForm.document);
      setClientForm((current) => ({ ...current, name: data.razaoSocial || data.fantasyName || current.name, city: data.city || current.city, state: data.state || current.state, address: data.address || current.address, cep: data.cep || current.cep, phone: data.phone || current.phone, email: data.email || current.email }));
    } catch { setMessage("Não foi possível preencher o CNPJ automaticamente. Continue manualmente."); }
    finally { setClientLookup(false); }
  };

  const createClient = async () => {
    const digits = clientForm.document.replace(/\D/g, "");
    if (!clientForm.name || !clientForm.email || (clientForm.kind === "company" ? digits.length !== 14 : digits.length !== 11)) return setMessage("Preencha documento, nome e e-mail corretamente.");
    setClientSaving(true);
    try {
      const ok = await contactService.create({ name: clientForm.name, razaoSocial: clientForm.kind === "company" ? clientForm.name : undefined, cnpj: clientForm.kind === "company" ? digits : undefined, organizationCnpj: digits, role: clientForm.kind === "company" ? "Pessoa jurídica" : "Pessoa física", email: clientForm.email, financialContact: clientForm.email, phone: clientForm.phone, city: clientForm.city, state: clientForm.state, address: clientForm.address, cep: clientForm.cep, complement: "", solution: "Cliente do PDV", message: "Cadastro rápido pelo PDV" });
      if (!ok) throw new Error("Não foi possível cadastrar o cliente.");
      await load(); setClientModal(false); setClientForm(emptyClient()); setMessage("Cliente cadastrado. Selecione-o para continuar a venda.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente."); }
    finally { setClientSaving(false); }
  };

  const printReceipt = (sale: Sale, fiscalPreview = false) => {
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) return setMessage("Permita pop-ups para imprimir o comprovante.");
    const legalName = (company as Company & { legalName?: string; razaoSocial?: string; cnpj?: string; phone?: string; email?: string; address?: string }).legalName || (company as Company & { razaoSocial?: string }).razaoSocial || "Empresa";
    const companyData = company as Company & { cnpj?: string; phone?: string; email?: string; address?: string; logo?: string; logoUrl?: string };
    const rows = sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantityMilli / 1000} ${escapeHtml(item.unit)}</td><td>${money(item.unitPriceCents)}</td><td>${money(item.totalCents)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(sale.saleNumber)}</title><style>body{font:14px Arial;color:#111;max-width:780px;margin:32px auto}header{display:flex;gap:20px;align-items:center;border-bottom:2px solid #0ea5e9;padding-bottom:16px}img{max-width:90px;max-height:70px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.warning{padding:12px;background:#fff7ed;color:#9a3412;text-align:center;font-weight:bold}.total{text-align:right;font-size:20px;font-weight:bold}footer{margin-top:50px;border-top:1px solid #ddd;padding-top:12px;text-align:center;color:#64748b;font-size:11px}</style></head><body><header>${companyData.logoUrl || companyData.logo ? `<img src="${escapeHtml(companyData.logoUrl || companyData.logo)}">` : ""}<div><h1>${escapeHtml(legalName)}</h1><div>${escapeHtml(companyData.cnpj)} · ${escapeHtml(companyData.phone)} · ${escapeHtml(companyData.email)}</div><div>${escapeHtml(companyData.address)}</div></div></header><h2>${fiscalPreview ? "Prévia do documento fiscal" : "Cupom não fiscal"} · ${escapeHtml(sale.saleNumber)}</h2>${fiscalPreview ? '<div class="warning">SEM VALIDADE FISCAL — AGUARDANDO AUTORIZAÇÃO DO PROVEDOR</div>' : '<div class="warning">CUPOM NÃO FISCAL</div>'}<p><b>Órgão/cliente:</b> ${escapeHtml(sale.clientName)}<br><b>Data:</b> ${new Date(`${sale.issueDate}T12:00:00`).toLocaleDateString("pt-BR")}</p><table><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: ${money(sale.netAmountCents)}</p><footer>Sistema de Gestão Blu Tecnologias</footer><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const complete = async () => {
    if (!user || !clientId || !cart.length) return setMessage("Selecione o órgão/cliente e adicione pelo menos um item.");
    setSaving(true); setMessage("");
    try {
      const callable = httpsCallable<Record<string, unknown>, CompleteResult>(functions, "completePublicSale");
      const idempotencyKey = crypto.randomUUID();
      const response = await callable({ clientId, contractId, contractName: selectedContract?.title || "", issueDate, dueDate, discountCents, paymentMethod, cardType: paymentMethod === "card" ? cardType : null, installments: paymentMethod === "card" && cardType === "credit" ? installments : 1, paid, fiscalRequested, sendEmail, notes, issuerName: (company as Company & { razaoSocial?: string })?.razaoSocial || "", idempotencyKey, items: cart.map((item) => ({ productId: item.id, quantityMilli: item.quantityMilli, unitPriceCents: item.salePriceCents })) });
      const saleSnap = await getDoc(doc(db, "pointOfSaleSales", response.data.id));
      const saved = { id: saleSnap.id, ...saleSnap.data() } as Sale;
      setLastSale(saved); setCart([]); setDiscountCents(0); setNotes(""); setMessage(sendEmail ? "Venda concluída e e-mail colocado na fila de envio." : "Venda concluída com sucesso."); await load();
    } catch (error) { console.error(error); setMessage(error instanceof Error ? error.message : "Não foi possível concluir a venda."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-sky-500" /></div>;
  return <div className="mx-auto max-w-[1800px] space-y-2 xl:h-[calc(100vh-112px)] xl:overflow-hidden">
    {message && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">{message}</div>}
    <div className="grid gap-3 xl:h-full xl:grid-cols-[minmax(360px,1.15fr)_minmax(300px,.75fr)_minmax(360px,.85fr)]">
      <section className="flex min-h-0 flex-col rounded-3xl border border-white/70 bg-white/70 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07] xl:overflow-hidden">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><ShoppingCart className="h-5 w-5 text-sky-500"/>Produtos a adicionar</h2>
        <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, SKU ou código de barras" className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-12 pr-4 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-black/20 dark:text-white"/></div>
        <div className="mt-3 grid min-h-0 flex-1 gap-2 overflow-auto pr-1 sm:grid-cols-2">{filtered.map((product) => <button key={product.id} onClick={() => add(product)} className="min-h-28 rounded-2xl border border-slate-200 bg-white/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300 dark:border-white/10 dark:bg-white/[.05]"><div className="flex justify-between"><span className="rounded-lg bg-sky-50 p-1.5 text-sky-600 dark:bg-sky-400/10"><ShoppingCart className="h-4 w-4"/></span><b className="text-sm text-slate-950 dark:text-white">{money(product.salePriceCents)}</b></div><h3 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{product.name}</h3><p className="mt-1 text-[11px] text-slate-500">{product.barcode || product.sku || "Sem código"} · Est. {product.type === "service" ? "N/A" : product.stockQuantity || 0}</p></button>)}</div>
      </section>
      <section className="flex min-h-0 flex-col rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07]">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-slate-950 dark:text-white">Produtos na sacola</h2><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">{cart.length}</span></div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-auto">{cart.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/[.06]"><div className="min-w-0 flex-1"><b className="block truncate text-sm dark:text-white">{item.name}</b><span className="text-xs text-slate-500">{money(Math.round(item.salePriceCents * item.quantityMilli / 1000))}</span></div><button onClick={() => quantity(item.id, -1000)} className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10"><Minus className="h-4 w-4"/></button><span className="w-5 text-center text-sm font-bold dark:text-white">{item.quantityMilli / 1000}</span><button onClick={() => quantity(item.id, 1000)} className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10"><Plus className="h-4 w-4"/></button><button onClick={() => setCart((current) => current.filter((row) => row.id !== item.id))} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-400/10"><Trash2 className="h-4 w-4"/></button></div>)}</div>
        {!cart.length && <div className="flex min-h-48 flex-1 items-center justify-center rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">Adicione produtos ou serviços à venda.</div>}
        <div className="mt-3 border-t pt-4 dark:border-white/10"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500"><span>Tributos estimados</span><span>{money(taxTotal)}</span></div><div className="mt-2 flex justify-between text-2xl font-black dark:text-white"><span>Total</span><span>{money(total)}</span></div></div>
      </section>
      <aside className="space-y-2 overflow-auto rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07]">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><Building2 className="text-sky-500"/>Fechamento</h2><div className="flex gap-1">{lastSale && <><button title="Imprimir cupom" onClick={() => printReceipt(lastSale)} className="rounded-xl border p-2 text-slate-600 dark:border-white/15 dark:text-white"><Printer className="h-4 w-4"/></button><button title="Prévia fiscal" onClick={() => printReceipt(lastSale, true)} className="rounded-xl border p-2 text-slate-600 dark:border-white/15 dark:text-white"><ReceiptText className="h-4 w-4"/></button></>}<button onClick={() => setClientModal(true)} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"><UserPlus className="mr-1 inline h-4 w-4"/>Novo cliente</button></div></div>
        <select value={clientId} onChange={(e) => { setClientId(e.target.value); setContractId(""); }} className="w-full rounded-xl border p-2.5 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="">Selecione o órgão/cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.razaoSocial || client.name}</option>)}</select>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} disabled={!selectedClient?.contracts?.length} className="w-full rounded-xl border p-3 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="">Sem contrato vinculado</option>{selectedClient?.contracts?.map((contract) => <option key={contract.id} value={contract.id}>{contract.title}</option>)}</select>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">EMISSÃO<input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">VENCIMENTO<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/></label></div>
        <div className="grid grid-cols-2 gap-3"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="invoice">Faturado</option><option value="bank_order">Ordem bancária</option><option value="pix">PIX</option><option value="transfer">Transferência</option><option value="card">Cartão</option></select><input type="number" min="0" step="0.01" value={(discountCents / 100).toFixed(2)} onChange={(e) => setDiscountCents(Math.round(Number(e.target.value || 0) * 100))} placeholder="Desconto" className="rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/></div>
        {paymentMethod === "card" && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-400/15 dark:bg-sky-400/[.06]"><label className="text-xs font-bold text-slate-500">TIPO DO CARTÃO<select value={cardType} onChange={(e) => { const type = e.target.value as "credit" | "debit"; setCardType(type); if (type === "debit") setInstallments(1); }} className="mt-1 w-full rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="credit">Crédito</option><option value="debit">Débito</option></select></label><label className="text-xs font-bold text-slate-500">PARCELAS<select value={installments} disabled={cardType === "debit"} onChange={(e) => setInstallments(Number(e.target.value))} className="mt-1 w-full rounded-xl border bg-white p-3 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white">{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value === 1 ? "À vista" : `${value}x`}</option>)}</select></label><p className="col-span-2 text-[11px] text-slate-500">A captura pelo pinpad será usada quando uma integração ativa estiver configurada.</p></div>}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações, empenho, medição ou instruções" className="min-h-20 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/>
        <div className="grid grid-cols-2 gap-1 text-xs dark:text-slate-200"><label className="flex items-center gap-2"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)}/>Pagamento recebido</label><label className="flex items-center gap-2"><input type="checkbox" checked={fiscalRequested} onChange={(e) => setFiscalRequested(e.target.checked)}/>Preparar nota</label><label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)}/>Enviar comprovante por e-mail</label></div>
        <button disabled={saving || !cart.length || !clientId} onClick={complete} className="w-full rounded-2xl bg-sky-500 py-4 font-black text-white shadow-lg shadow-sky-500/20 disabled:opacity-50">{saving ? <Loader2 className="mx-auto animate-spin"/> : <><CheckCircle2 className="mr-2 inline h-5 w-5"/>Concluir venda</>}</button>
        {sendEmail && <p className="flex items-center justify-center gap-2 text-xs text-slate-400"><Mail className="h-3 w-3"/>Será usado o e-mail financeiro do cliente.</p>}
      </aside>
    </div>
    {clientModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4"><div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-500">Cadastro rápido</p><h2 className="text-2xl font-black dark:text-white">Novo cliente</h2></div><button onClick={() => setClientModal(false)} className="rounded-xl p-2 dark:text-white"><X/></button></div><div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/[.06]"><button onClick={() => setClientForm({ ...emptyClient(), kind: "person" })} className={`rounded-xl py-3 font-bold ${clientForm.kind === "person" ? "bg-white text-sky-700 shadow dark:bg-white/10 dark:text-sky-200" : "text-slate-500"}`}>Pessoa física</button><button onClick={() => setClientForm({ ...emptyClient(), kind: "company" })} className={`rounded-xl py-3 font-bold ${clientForm.kind === "company" ? "bg-white text-sky-700 shadow dark:bg-white/10 dark:text-sky-200" : "text-slate-500"}`}>Pessoa jurídica</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500">{clientForm.kind === "company" ? "CNPJ" : "CPF"}<div className="relative"><input value={clientForm.document} onChange={(e) => setClientForm({ ...clientForm, document: e.target.value })} onBlur={() => void lookupDocument()} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/>{clientLookup && <Loader2 className="absolute right-3 top-4 h-4 w-4 animate-spin text-sky-500"/>}</div></label><label className="text-xs font-bold text-slate-500">{clientForm.kind === "company" ? "RAZÃO SOCIAL" : "NOME COMPLETO"}<input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">E-MAIL FINANCEIRO<input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">TELEFONE<input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500 sm:col-span-2">ENDEREÇO<input value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">CIDADE<input value={clientForm.city} onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">UF / CEP<div className="mt-1 grid grid-cols-[80px_1fr] gap-2"><input value={clientForm.state} maxLength={2} onChange={(e) => setClientForm({ ...clientForm, state: e.target.value.toUpperCase() })} className="rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/><input value={clientForm.cep} onChange={(e) => setClientForm({ ...clientForm, cep: e.target.value })} className="rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></div></label></div><button disabled={clientSaving} onClick={() => void createClient()} className="mt-5 w-full rounded-2xl bg-sky-500 py-4 font-black text-white disabled:opacity-50">{clientSaving ? <Loader2 className="mx-auto animate-spin"/> : "Cadastrar e voltar ao PDV"}</button></div></div>}
    <details className="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07] dark:text-slate-200"><summary className="cursor-pointer font-bold">Vendas recentes ({sales.length})</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[700px] text-left"><tbody>{sales.map((sale) => <tr key={sale.id} className="border-t dark:border-white/10"><td className="p-2 font-bold">{sale.saleNumber}</td><td>{sale.clientName}</td><td>{new Date(`${sale.issueDate}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{sale.status === "completed" ? "Recebida" : "Pendente"}</td><td>{money(sale.netAmountCents)}</td><td><button onClick={() => printReceipt(sale)} className="p-2 text-sky-500"><Printer className="h-4 w-4"/></button></td></tr>)}</tbody></table></div></details>
  </div>;
};
