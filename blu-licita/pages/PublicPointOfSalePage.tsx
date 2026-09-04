import React from "react";
import { Building2, CheckCircle2, CircleDollarSign, Copy, Download, FileText, Loader2, LockKeyhole, LogOut, Mail, Menu, Minus, Plus, Printer, QrCode, ReceiptText, RefreshCw, Scale, ScanLine, Search, Settings, Share2, ShieldCheck, ShoppingCart, Trash2, UserPlus, WalletCards, X } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useBluAuth } from "../contexts/BluAuthContext";
import { listCompanyDocs } from "../services/firestoreCompany";
import { auth, contactService, db, functions, type Company, type ContactLead } from "../../services/firebase";
import { lookupCnpjData } from "../../services/cnpjLookup";
import { commitOfflineRegister, commitOfflineSale, flushPosOutbox, getPosDeviceId, listLocalPosSales, listPendingPosEvents, readPosCache, readPosDraft, savePosDraft, writePosCache, type PosOutboxEvent } from "../services/posOfflineStore";
import { pdvAgentService, type PdvAgentDevices, type PdvAgentHealth } from "../services/pdvAgentService";

type Product = { id: string; type?: "product" | "service"; name: string; barcode?: string; sku?: string; unit?: string; salePriceCents: number; stockQuantity?: number; taxPercent?: number; active?: boolean };
type CartItem = Product & { quantityMilli: number };
type Sale = { id: string; saleNumber: string; clientName: string; netAmountCents: number; issueDate: string; status: string; items: Array<{ name: string; quantityMilli: number; unit: string; unitPriceCents: number; totalCents: number }> };
type CompleteResult = { id: string };
type RegisterMovement = { id: string; type: "supply" | "withdrawal"; amountCents: number; reason: string; operatorName: string; createdAt: string };
type RegisterSession = { id: string; companyId: string; operatorId: string; operatorName: string; status: "open" | "closed"; openingAmountCents: number; openedAt: string; closedAt?: string; countedCashCents?: number; saleCount?: number; paymentTotalsCents?: Record<string, number>; cashSalesCents?: number; supplyCents?: number; withdrawalCents?: number; expectedCashCents?: number; differenceCents?: number; temporarilyLocked?: boolean; movements?: RegisterMovement[] };
type PosPayment = { id: string; status: "pending" | "paid" | "failed"; qrCode: string; qrCodeUrl: string; expiresAt?: string | null; amountCents: number; bluFeeCents: number; saleNumber: string };
type PosPaymentSettings = { pagarmeRecipientId: string; tefEnabled: boolean; tefProvider: string; tefTerminalId: string; tefStatus: string; recipientStatus?: string; canManage: boolean };
type PosOperationalConfig = { focusMode: boolean; requireManagerToRemoveItem: boolean; requireManagerToCancelSale: boolean; requireManagerForDiscount: boolean; requireManagerForWithdrawal: boolean; requireManagerForReprint: boolean; requireManagerForTefAdmin: boolean; requireManagerForFiscalActions: boolean; maxDiscountPercent: number; printReceiptAfterSale: boolean; askCustomerDocument: boolean };
const emptyPaymentSettings = (): PosPaymentSettings => ({ pagarmeRecipientId: "", tefEnabled: false, tefProvider: "", tefTerminalId: "", tefStatus: "awaiting_homologation", recipientStatus: "not_started", canManage: false });
const defaultOperationalConfig = (): PosOperationalConfig => ({ focusMode: false, requireManagerToRemoveItem: true, requireManagerToCancelSale: true, requireManagerForDiscount: true, requireManagerForWithdrawal: true, requireManagerForReprint: false, requireManagerForTefAdmin: true, requireManagerForFiscalActions: true, maxDiscountPercent: 10, printReceiptAfterSale: false, askCustomerDocument: false });

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);
const escapeHtml = (value: unknown) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const today = () => new Date().toISOString().slice(0, 10);
const emptyClient = () => ({ kind: "company" as "company" | "person", document: "", name: "", email: "", phone: "", city: "", state: "", address: "", cep: "" });

const ConfigToggle: React.FC<{ label: string; description: string; checked: boolean; onChange: (value: boolean) => void }> = ({ label, description, checked, onChange }) => (
  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5"/>
    <span>
      <b className="block text-slate-900 dark:text-white">{label}</b>
      <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-300">{description}</span>
    </span>
  </label>
);

export const PublicPointOfSalePage: React.FC<{ mode?: "commerce" | "services" }> = ({ mode = "commerce" }) => {
  const servicePos = mode === "services";
  const { user } = useBluAuth();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [clients, setClients] = React.useState<ContactLead[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [scanBarcode, setScanBarcode] = React.useState("");
  const [scanQuantity, setScanQuantity] = React.useState(1);
  const [clientId, setClientId] = React.useState("");
  const [clientMode, setClientMode] = React.useState<"registered" | "anonymous">("anonymous");
  const [clientQuery, setClientQuery] = React.useState("");
  const [clientResultsOpen, setClientResultsOpen] = React.useState(false);
  const [contractId, setContractId] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(today());
  const [dueDate, setDueDate] = React.useState(today());
  const [discountCents, setDiscountCents] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState("invoice");
  const [cashReceivedCents, setCashReceivedCents] = React.useState(0);
  const [cardType, setCardType] = React.useState<"credit" | "debit">("credit");
  const [installments, setInstallments] = React.useState(1);
  const [paid, setPaid] = React.useState(false);
  const [pixPayment, setPixPayment] = React.useState<PosPayment | null>(null);
  const [pixModal, setPixModal] = React.useState(false);
  const [pixLoading, setPixLoading] = React.useState(false);
  const [paymentSettings, setPaymentSettings] = React.useState<PosPaymentSettings>(emptyPaymentSettings());
  const [paymentSettingsModal, setPaymentSettingsModal] = React.useState(false);
  const [paymentSettingsSaving, setPaymentSettingsSaving] = React.useState(false);
  const [agentHealth, setAgentHealth] = React.useState<PdvAgentHealth | null>(null);
  const [agentDevices, setAgentDevices] = React.useState<PdvAgentDevices | null>(null);
  const [agentChecking, setAgentChecking] = React.useState(false);
  const [pdvConfigModal, setPdvConfigModal] = React.useState(false);
  const [pdvConfig, setPdvConfig] = React.useState<PosOperationalConfig>(() => defaultOperationalConfig());
  const [fiscalRequested, setFiscalRequested] = React.useState(true);
  const [sendEmail, setSendEmail] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [lastSale, setLastSale] = React.useState<Sale | null>(null);
  const [receiptModal, setReceiptModal] = React.useState(false);
  const [clientModal, setClientModal] = React.useState(false);
  const [clientForm, setClientForm] = React.useState(emptyClient());
  const [clientSaving, setClientSaving] = React.useState(false);
  const [clientLookup, setClientLookup] = React.useState(false);
  const [register, setRegister] = React.useState<RegisterSession | null>(null);
  const [registerModal, setRegisterModal] = React.useState<"open" | "close" | null>(null);
  const [openingAmountCents, setOpeningAmountCents] = React.useState(0);
  const [countedCashCents, setCountedCashCents] = React.useState(0);
  const [registerNotes, setRegisterNotes] = React.useState("");
  const [registerSaving, setRegisterSaving] = React.useState(false);
  const [operationsModal, setOperationsModal] = React.useState(false);
  const [cashMovementModal, setCashMovementModal] = React.useState<"supply" | "withdrawal" | null>(null);
  const [movementAmountCents, setMovementAmountCents] = React.useState(0);
  const [movementReason, setMovementReason] = React.useState("");
  const [registerHistory, setRegisterHistory] = React.useState<RegisterSession[]>([]);
  const [historyModal, setHistoryModal] = React.useState(false);
  const [registerLocked, setRegisterLocked] = React.useState(false);
  const [online, setOnline] = React.useState(() => navigator.onLine);
  const [pendingSync, setPendingSync] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);
  const [draftHydrated, setDraftHydrated] = React.useState(false);
  const syncingRef = React.useRef(false);
  const barcodeInputRef = React.useRef<HTMLInputElement | null>(null);
  const productSearchRef = React.useRef<HTMLInputElement | null>(null);
  const pdvConfigKey = React.useMemo(() => `blu:pdv:config:${user?.companyId || "global"}:${servicePos ? "services" : "commerce"}`, [servicePos, user?.companyId]);

  const checkAgent = React.useCallback(async () => {
    setAgentChecking(true);
    try {
      const [health, devices] = await Promise.all([pdvAgentService.health(), pdvAgentService.devices()]);
      setAgentHealth(health);
      setAgentDevices(devices);
    } catch {
      setAgentHealth(null);
      setAgentDevices(null);
    } finally {
      setAgentChecking(false);
    }
  }, []);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(pdvConfigKey) || "null") as Partial<PosOperationalConfig> | null;
      const focusMode = window.localStorage.getItem("blu:pdv:focus-mode") === "true";
      setPdvConfig({ ...defaultOperationalConfig(), ...(saved || {}), focusMode });
    } catch {
      setPdvConfig({ ...defaultOperationalConfig(), focusMode: window.localStorage.getItem("blu:pdv:focus-mode") === "true" });
    }
  }, [pdvConfigKey]);

  const savePdvConfig = (next: PosOperationalConfig) => {
    setPdvConfig(next);
    window.localStorage.setItem(pdvConfigKey, JSON.stringify(next));
    window.localStorage.setItem("blu:pdv:focus-mode", String(next.focusMode));
    window.dispatchEvent(new Event("blu:pdv-focus-mode-changed"));
  };

  const updatePdvConfig = (patch: Partial<PosOperationalConfig>) => savePdvConfig({ ...pdvConfig, ...patch });

  const load = React.useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);
    setDraftHydrated(false);
    try {
      const [cachedProducts, cachedClients, cachedSales, cachedCompany, cachedRegister, draft, localSales, pending] = await Promise.all([
        readPosCache<Product[]>(user.companyId, "products"),
        readPosCache<ContactLead[]>(user.companyId, "clients"),
        readPosCache<Sale[]>(user.companyId, "sales"),
        readPosCache<Company | null>(user.companyId, "company"),
        readPosCache<RegisterSession | null>(user.companyId, "register"),
        readPosDraft<CartItem[]>(user.companyId),
        listLocalPosSales<Sale>(user.companyId),
        listPendingPosEvents(user.companyId),
      ]);
      if (cachedProducts) setProducts(cachedProducts.filter((item) => servicePos ? item.type === "service" : item.type !== "service"));
      if (cachedClients) setClients(cachedClients);
      if (cachedCompany !== undefined) setCompany(cachedCompany);
      if (cachedRegister !== undefined) setRegister(cachedRegister);
      if (draft) {
        setCart(Array.isArray(draft.cart) ? draft.cart : []);
        const checkout = draft.checkout;
        setClientId(String(checkout.clientId || "")); setClientMode(checkout.clientMode === "registered" ? "registered" : "anonymous"); setClientQuery(String(checkout.clientQuery || "")); setContractId(String(checkout.contractId || ""));
        setIssueDate(String(checkout.issueDate || today())); setDueDate(String(checkout.dueDate || today())); setDiscountCents(Number(checkout.discountCents || 0));
        setPaymentMethod(String(checkout.paymentMethod || "invoice")); setCashReceivedCents(Number(checkout.cashReceivedCents || 0)); setCardType(checkout.cardType === "debit" ? "debit" : "credit");
        setInstallments(Number(checkout.installments || 1)); setPaid(Boolean(checkout.paid)); setFiscalRequested(checkout.fiscalRequested !== false); setSendEmail(checkout.sendEmail !== false); setNotes(String(checkout.notes || ""));
      }
      const cachedLocalValues = localSales.map((item) => item.sale);
      const cachedValues = cachedSales || [];
      const cachedMerged = [...cachedLocalValues, ...cachedValues.filter((sale) => !cachedLocalValues.some((local) => local.id === sale.id))];
      if (cachedMerged.length) setSales(cachedMerged.slice(0, 20));
      setPendingSync(pending.length);
      setDraftHydrated(true);
      await getPosDeviceId();
      const registerCall = httpsCallable<Record<string, unknown>, RegisterSession | null>(functions, "managePointOfSaleRegister");
      const registerRequest = registerCall({ action: "status", companyId: user.companyId })
        .then((result) => ({ data: result.data, unavailable: false }))
        .catch((error) => {
          console.warn("Controle de caixa indisponível; o catálogo continuará carregando.", error);
          return { data: null, unavailable: true };
        });
      const [catalog, contacts, recent, companySnap, registerResult] = await Promise.all([
        listCompanyDocs<Product>("products", user.companyId), listCompanyDocs<ContactLead>("clients", user.companyId),
        listCompanyDocs<Sale>("pointOfSaleSales", user.companyId), getDoc(doc(db, "companies", user.companyId)), registerRequest,
      ]);
      const activeProducts = catalog.filter((item) => item.active !== false && (servicePos ? item.type === "service" : item.type !== "service"));
      const recentSales = recent.sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate))).slice(0, 20);
      const companyValue = companySnap.exists() ? companySnap.data() as Company : null;
      const pendingRegisterEvents = (await listPendingPosEvents(user.companyId)).filter((event) => event.type === "REGISTER_OPENED" || event.type === "REGISTER_CLOSED");
      const latestRegisterEvent = pendingRegisterEvents.at(-1);
      const effectiveRegister = latestRegisterEvent?.type === "REGISTER_OPENED" ? (cachedRegister || null) : latestRegisterEvent?.type === "REGISTER_CLOSED" ? null : (registerResult.data || null);
      setProducts(activeProducts);
      setClients(contacts);
      const localValues = (await listLocalPosSales<Sale>(user.companyId)).map((item) => item.sale);
      setSales([...localValues, ...recentSales.filter((sale) => !localValues.some((local) => local.id === sale.id))].slice(0, 20));
      setCompany(companyValue);
      setRegister(effectiveRegister);
      await Promise.all([
        writePosCache(user.companyId, "products", activeProducts), writePosCache(user.companyId, "clients", contacts),
        writePosCache(user.companyId, "sales", recentSales), writePosCache(user.companyId, "company", companyValue),
        writePosCache(user.companyId, "register", effectiveRegister),
      ]);
      if (registerResult.unavailable) setMessage("Produtos carregados. O controle de caixa aguarda a publicação da função no Firebase.");
    } catch (error) { console.error(error); setMessage(navigator.onLine ? "Não foi possível atualizar os dados do PDV. O cache local foi mantido." : "PDV offline: usando os dados salvos neste dispositivo."); }
    finally { setDraftHydrated(true); setLoading(false); }
  }, [user?.companyId, servicePos]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { setRegisterLocked(Boolean(register?.temporarilyLocked)); }, [register?.temporarilyLocked]);
  React.useEffect(() => {
    if (!user?.companyId || !auth.currentUser) return;
    const callable = httpsCallable<Record<string, unknown>, PosPaymentSettings>(functions, "managePointOfSalePaymentSettings");
    void callable({ action: "get", companyId: user.companyId }).then((result) => setPaymentSettings(result.data)).catch((error) => console.warn("Configuração de pagamentos do PDV indisponível.", error));
    void checkAgent();
  }, [checkAgent, user?.companyId]);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const selectedClient = clients.find((item) => item.id === clientId);
  const normalizedClientQuery = clientQuery.trim().toLocaleLowerCase("pt-BR");
  const clientQueryDigits = clientQuery.replace(/\D/g, "");
  const filteredClients = clients.filter((client) => {
    if (!normalizedClientQuery) return true;
    const document = String(client.cnpj || client.organizationCnpj || "").replace(/\D/g, "");
    const text = `${client.razaoSocial || ""} ${client.name || ""} ${client.email || ""}`.toLocaleLowerCase("pt-BR");
    return text.includes(normalizedClientQuery) || Boolean(clientQueryDigits && document.includes(clientQueryDigits));
  }).slice(0, 30);
  const selectedContract = selectedClient?.contracts?.find((item) => item.id === contractId);
  const filtered = products.filter((item) => `${item.name} ${item.barcode || ""} ${item.sku || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  const subtotal = cart.reduce((sum, item) => sum + Math.round(item.salePriceCents * item.quantityMilli / 1000), 0);
  const taxTotal = cart.reduce((sum, item) => sum + Math.round(item.salePriceCents * item.quantityMilli / 1000 * Number(item.taxPercent || 0) / 100), 0);
  const total = Math.max(0, subtotal - discountCents);
  const cashChangeCents = paymentMethod === "cash" ? Math.max(0, cashReceivedCents - total) : 0;

  React.useEffect(() => {
    if (!pixPayment) return;
    const changed = pixPayment.amountCents !== total || paymentMethod !== "pix";
    if (changed) { setPixPayment(null); setPixModal(false); setPaid(false); }
  }, [total, paymentMethod, pixPayment]);

  React.useEffect(() => {
    if (!user?.companyId || !draftHydrated) return;
    const timer = window.setTimeout(() => {
      void savePosDraft({
        companyId: user.companyId,
        cart,
        checkout: { clientId, clientMode, clientQuery, contractId, issueDate, dueDate, discountCents, paymentMethod, cashReceivedCents, cardType, installments, paid, fiscalRequested, sendEmail, notes },
        updatedAt: new Date().toISOString(),
      }).catch((error) => console.error("Não foi possível salvar o rascunho local do PDV.", error));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [user?.companyId, draftHydrated, cart, clientId, clientMode, clientQuery, contractId, issueDate, dueDate, discountCents, paymentMethod, cashReceivedCents, cardType, installments, paid, fiscalRequested, sendEmail, notes]);

  const registerErrorMessage = (error: unknown) => {
    const code = String((error as { code?: string })?.code || "");
    const message = error instanceof Error ? error.message : "";
    if (code.includes("internal") || code.includes("not-found") || /internal|404/i.test(message)) {
      return "O controle de caixa ainda não foi publicado no Firebase. O catálogo e as demais funções do PDV continuam disponíveis.";
    }
    return message || "Não foi possível atualizar o caixa.";
  };

  const callRegister = async (data: Record<string, unknown>) => {
    if (!auth.currentUser) throw new Error("Sua sessão expirou. Entre novamente para operar o caixa.");
    const token = await auth.currentUser.getIdToken(true);
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      const response = await fetch("/api/pdv-register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data }),
      });
      const payload = await response.json().catch(() => ({})) as { result?: RegisterSession | null; data?: RegisterSession | null; error?: { message?: string } };
      if (!response.ok || payload.error) throw new Error(payload.error?.message || `Não foi possível operar o caixa (HTTP ${response.status}).`);
      return { data: payload.result ?? payload.data ?? null };
    }
    const callable = httpsCallable<Record<string, unknown>, RegisterSession | null>(functions, "managePointOfSaleRegister");
    try {
      return await callable(data);
    } catch (error) {
      const code = String((error as { code?: string })?.code || "");
      if (!code.includes("internal") && !code.includes("unavailable") && !code.includes("not-found")) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      await auth.currentUser.getIdToken(true);
      return callable(data);
    }
  };

  const syncPendingOperations = React.useCallback(async (showFeedback = false) => {
    if (!user?.companyId || !navigator.onLine || syncingRef.current) return;
    syncingRef.current = true; setSyncing(true);
    try {
      const callable = httpsCallable<Record<string, unknown>, CompleteResult>(functions, "completePublicSale");
      const result = await flushPosOutbox(user.companyId, async (event: PosOutboxEvent) => {
        if (event.type === "SALE_COMPLETED") await callable(event.payload);
        else await callRegister(event.payload);
      });
      setPendingSync(result.pending);
      if (result.synced > 0) {
        window.dispatchEvent(new Event("blu:stock-updated"));
        if (showFeedback) setMessage(`${result.synced} operação(ões) sincronizada(s) com segurança.`);
        await load();
      }
    } catch (error) {
      console.error("Falha ao sincronizar o Outbox do PDV.", error);
      setPendingSync((await listPendingPosEvents(user.companyId)).length);
      if (showFeedback) setMessage("A venda permanece salva no dispositivo e será sincronizada automaticamente.");
    } finally { syncingRef.current = false; setSyncing(false); }
  }, [user?.companyId, load]);

  React.useEffect(() => {
    if (!user?.companyId) return;
    const run = () => { setOnline(navigator.onLine); if (navigator.onLine) void syncPendingOperations(); };
    window.addEventListener("online", run);
    const interval = window.setInterval(run, 15000);
    void listPendingPosEvents(user.companyId).then((events) => setPendingSync(events.length));
    if (navigator.onLine) void syncPendingOperations();
    return () => { window.removeEventListener("online", run); window.clearInterval(interval); };
  }, [user?.companyId, syncPendingOperations]);

  const refreshRegister = async () => {
    if (!user?.companyId) return null;
    try {
      const response = await callRegister({ action: "status", companyId: user.companyId });
      setRegister(response.data || null);
      return response.data || null;
    } catch (error) {
      console.error(error);
      setMessage(registerErrorMessage(error));
      return null;
    }
  };

  const submitRegister = async () => {
    if (!user?.companyId || !registerModal) return;
    setRegisterSaving(true);
    try {
      if (!navigator.onLine) {
        const now = new Date().toISOString();
        if (registerModal === "open") {
          const localRegister: RegisterSession = { id: crypto.randomUUID(), companyId: user.companyId, operatorId: user.id, operatorName: user.name || user.email || "Operador", status: "open", openingAmountCents, openedAt: now, saleCount: 0, paymentTotalsCents: {}, cashSalesCents: 0, expectedCashCents: openingAmountCents };
          await commitOfflineRegister({ companyId: user.companyId, userId: user.id, register: localRegister, action: "open", payload: { companyId: user.companyId, openingAmountCents } });
          setRegister(localRegister); setMessage("Caixa aberto offline e salvo neste dispositivo.");
        } else {
          if (!register) throw new Error("Nenhum caixa aberto para fechar.");
          const differenceCents = countedCashCents - Number(register.expectedCashCents || 0);
          await commitOfflineRegister({ companyId: user.companyId, userId: user.id, register: { ...register, status: "closed", countedCashCents, differenceCents }, action: "close", payload: { companyId: user.companyId, countedCashCents, notes: registerNotes } });
          setRegister(null); setCart([]); setMessage(`Fechamento salvo offline. Diferença provisória: ${money(differenceCents)}.`);
        }
        setPendingSync((await listPendingPosEvents(user.companyId)).length);
        setRegisterModal(null); setOpeningAmountCents(0); setCountedCashCents(0); setRegisterNotes("");
        return;
      }
      const response = await callRegister(registerModal === "open"
        ? { action: "open", companyId: user.companyId, openingAmountCents }
        : { action: "close", companyId: user.companyId, registerId: register?.id, countedCashCents, notes: registerNotes });
      if (!response.data) throw new Error("O Firebase não retornou os dados do caixa.");
      if (registerModal === "open") {
        setRegister(response.data);
        await writePosCache(user.companyId, "register", response.data);
        setMessage(`Caixa aberto por ${response.data.operatorName}.`);
      } else {
        setRegister(null); setCart([]);
        await writePosCache(user.companyId, "register", null);
        setMessage(`Caixa fechado. Diferença apurada: ${money(response.data.differenceCents || 0)}.`);
      }
      setRegisterModal(null); setOpeningAmountCents(0); setCountedCashCents(0); setRegisterNotes("");
    } catch (error) { console.error(error); setMessage(registerErrorMessage(error)); }
    finally { setRegisterSaving(false); }
  };

  const add = (product: Product) => setCart((current) => {
    const found = current.find((item) => item.id === product.id);
    return found ? current.map((item) => item.id === product.id ? { ...item, quantityMilli: item.quantityMilli + 1000 } : item) : [...current, { ...product, quantityMilli: 1000 }];
  });
  const addQuantity = (product: Product, amount: number) => setCart((current) => {
    const quantityMilli = Math.max(1, Math.trunc(amount || 1)) * 1000;
    const found = current.find((item) => item.id === product.id);
    return found ? current.map((item) => item.id === product.id ? { ...item, quantityMilli: item.quantityMilli + quantityMilli } : item) : [...current, { ...product, quantityMilli }];
  });
  const scanProduct = () => {
    const code = scanBarcode.replace(/\s/g, "").trim();
    if (!code) return;
    if (scanQuantity <= 0) { setMessage("Informe uma quantidade maior que zero antes de ler o código de barras."); setScanBarcode(""); window.requestAnimationFrame(() => barcodeInputRef.current?.focus()); return; }
    const product = products.find((item) => String(item.barcode || "").replace(/\s/g, "") === code || String(item.sku || "").replace(/\s/g, "") === code);
    if (!product) setMessage(`Nenhum produto encontrado para o código ${code}.`);
    else { addQuantity(product, scanQuantity); setMessage(`${scanQuantity}x ${product.name} adicionado à sacola.`); setScanQuantity(1); }
    setScanBarcode("");
    window.requestAnimationFrame(() => barcodeInputRef.current?.focus());
  };
  React.useEffect(() => {
    const code = scanBarcode.replace(/\s/g, "").trim();
    if (!code) return;
    const timer = window.setTimeout(() => {
      const hasMatch = products.some((item) => String(item.barcode || "").replace(/\s/g, "") === code || String(item.sku || "").replace(/\s/g, "") === code);
      if (hasMatch) scanProduct();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [products, scanBarcode]);
  React.useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [message]);
  const managerAuthorization = (reason: string) => {
    const approved = window.confirm(`Autorização gerencial necessária: ${reason}.\n\nConfirma que o gerente autorizou esta operação?`);
    if (!approved) setMessage("Operação cancelada: autorização gerencial não confirmada.");
    return approved;
  };
  const quantity = (id: string, amount: number) => setCart((current) => current.map((item) => item.id === id ? { ...item, quantityMilli: Math.max(1000, item.quantityMilli + amount) } : item));
  const removeCartItem = (item: CartItem) => {
    if (pdvConfig.requireManagerToRemoveItem && !managerAuthorization(`remover ${item.name} da sacola`)) return;
    if (!window.confirm(`Remover ${item.name} da sacola?`)) return;
    setCart((current) => current.filter((row) => row.id !== item.id));
    setMessage("Item removido da sacola.");
  };
  const cancelCurrentSale = () => {
    if (!cart.length) return;
    if (pdvConfig.requireManagerToCancelSale && !managerAuthorization("cancelar a venda atual")) return;
    if (!window.confirm("Cancelar a venda atual e limpar todos os itens da sacola?")) return;
    setCart([]); setDiscountCents(0); setOperationsModal(false); setMessage("Venda atual cancelada.");
  };
  const updateDiscount = (valueCents: number) => {
    const discountPercent = subtotal > 0 ? valueCents / subtotal * 100 : 0;
    if (pdvConfig.requireManagerForDiscount && discountPercent > pdvConfig.maxDiscountPercent && !managerAuthorization(`aplicar desconto de ${discountPercent.toFixed(1)}%`)) return;
    setDiscountCents(valueCents);
  };

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

  const downloadText = (name: string, content: string, type = "text/plain;charset=utf-8") => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportProducts = (target: "scale" | "price_terminal") => {
    const values = products.filter((product) => product.type !== "service");
    if (!values.length) return setMessage("Nenhum produto disponível para exportação.");
    if (target === "scale") {
      const lines = ["PLU;CODIGO_BARRAS;DESCRICAO;PRECO_CENTAVOS;UNIDADE", ...values.map((item, index) => `${index + 1};${item.barcode || item.sku || ""};${String(item.name).replace(/;/g, ",")};${item.salePriceCents};${item.unit || "un"}`)];
      downloadText(`produtos-balanca-${today()}.txt`, lines.join("\r\n"));
      setMessage(`${values.length} produto(s) exportado(s) para balança.`);
      return;
    }
    const lines = ["codigo_barras;sku;nome;preco", ...values.map((item) => `${item.barcode || ""};${item.sku || ""};${String(item.name).replace(/;/g, ",")};${(item.salePriceCents / 100).toFixed(2).replace(".", ",")}`)];
    downloadText(`terminal-consulta-preco-${today()}.csv`, lines.join("\r\n"), "text/csv;charset=utf-8");
    setMessage(`${values.length} produto(s) exportado(s) para o terminal de consulta.`);
  };

  const printRegisterDocument = (value: RegisterSession, thermal = true) => {
    const popup = window.open("", "_blank", "width=850,height=800");
    if (!popup) return setMessage("Permita pop-ups para imprimir ou gerar o PDF.");
    const movements = (value.movements || []).map((item) => `<tr><td>${new Date(item.createdAt).toLocaleString("pt-BR")}</td><td>${item.type === "supply" ? "Suprimento" : "Sangria"}</td><td>${escapeHtml(item.reason)}</td><td>${money(item.amountCents)}</td></tr>`).join("");
    const payments = Object.entries(value.paymentTotalsCents || {}).map(([method, amount]) => `<tr><td>${escapeHtml(method)}</td><td>${money(amount)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fechamento de caixa</title><style>@page{size:${thermal ? "80mm auto" : "A4"};margin:${thermal ? "4mm" : "14mm"}}body{font:12px Arial;margin:0;color:#111}h1{font-size:17px}table{width:100%;border-collapse:collapse}td,th{padding:5px 2px;border-bottom:1px dashed #999;text-align:left}.total{font-size:16px;font-weight:700}.muted{color:#555}button{padding:10px;margin-bottom:10px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Imprimir / Salvar PDF</button><h1>${escapeHtml((company as any)?.tradeName || (company as any)?.name || "Blu PDV")}</h1><p>FECHAMENTO DE CAIXA</p><p>Operador: ${escapeHtml(value.operatorName)}<br>Abertura: ${new Date(value.openedAt).toLocaleString("pt-BR")}<br>Fechamento: ${value.closedAt ? new Date(value.closedAt).toLocaleString("pt-BR") : "Caixa aberto"}</p><table><tr><td>Fundo inicial</td><td>${money(value.openingAmountCents)}</td></tr><tr><td>Vendas</td><td>${value.saleCount || 0}</td></tr><tr><td>Suprimentos</td><td>${money(value.supplyCents || 0)}</td></tr><tr><td>Sangrias</td><td>${money(value.withdrawalCents || 0)}</td></tr><tr class="total"><td>Dinheiro esperado</td><td>${money(value.expectedCashCents || 0)}</td></tr>${value.countedCashCents !== undefined ? `<tr><td>Dinheiro contado</td><td>${money(value.countedCashCents)}</td></tr><tr><td>Diferença</td><td>${money(value.differenceCents || 0)}</td></tr>` : ""}</table><h2>Por forma de pagamento</h2><table>${payments || "<tr><td>Sem vendas</td></tr>"}</table><h2>Movimentações</h2><table><tr><th>Data</th><th>Tipo</th><th>Motivo</th><th>Valor</th></tr>${movements || "<tr><td colspan=4>Sem movimentações</td></tr>"}</table><p class="muted">Sistema de Gestão Blu Tecnologias · ${new Date().toLocaleString("pt-BR")}</p><script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    popup.document.close();
  };

  const submitCashMovement = async () => {
    if (!user?.companyId || !register || !cashMovementModal) return;
    if (cashMovementModal === "withdrawal" && pdvConfig.requireManagerForWithdrawal && !managerAuthorization("registrar sangria no caixa")) return;
    setRegisterSaving(true);
    try {
      const result = await callRegister({ action: cashMovementModal, companyId: user.companyId, registerId: register.id, amountCents: movementAmountCents, reason: movementReason });
      const updated = (result.data as unknown as { register?: RegisterSession })?.register;
      if (updated) setRegister(updated); else await refreshRegister();
      setMessage(`${cashMovementModal === "supply" ? "Suprimento" : "Sangria"} registrado com sucesso.`);
      setCashMovementModal(null); setMovementAmountCents(0); setMovementReason("");
    } catch (error) { setMessage(registerErrorMessage(error)); }
    finally { setRegisterSaving(false); }
  };

  const temporaryExit = async (resume = false) => {
    if (!user?.companyId || !register) return;
    try {
      const result = await callRegister({ action: resume ? "resume" : "temporary_exit", companyId: user.companyId, registerId: register.id });
      if (result.data) setRegister(result.data);
      setRegisterLocked(!resume); setOperationsModal(false);
    } catch (error) { setMessage(registerErrorMessage(error)); }
  };

  const openRegisterHistory = async () => {
    if (!user?.companyId) return;
    if (pdvConfig.requireManagerForReprint && !managerAuthorization("reimprimir fechamento de caixa")) return;
    setRegisterSaving(true);
    try {
      const result = await callRegister({ action: "history", companyId: user.companyId });
      setRegisterHistory((result.data as unknown as RegisterSession[]) || []); setHistoryModal(true); setOperationsModal(false);
    } catch (error) { setMessage(registerErrorMessage(error)); }
    finally { setRegisterSaving(false); }
  };

  const printReceipt = (sale: Sale, fiscalPreview = false) => {
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) return setMessage("Permita pop-ups para imprimir o comprovante.");
    const legalName = (company as Company & { legalName?: string; razaoSocial?: string; cnpj?: string; phone?: string; email?: string; address?: string }).legalName || (company as Company & { razaoSocial?: string }).razaoSocial || "Empresa";
    const companyData = company as Company & { cnpj?: string; phone?: string; email?: string; address?: string; logo?: string; logoUrl?: string };
    const rows = sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantityMilli / 1000} ${escapeHtml(item.unit)}</td><td>${money(item.unitPriceCents)}</td><td>${money(item.totalCents)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sale.saleNumber)}</title><style>@page{size:A4;margin:14mm}body{font:14px Arial;color:#111;max-width:780px;margin:0 auto}header{display:flex;gap:20px;align-items:center;border-bottom:2px solid #0ea5e9;padding-bottom:16px}img{max-width:90px;max-height:70px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.warning{padding:12px;background:#fff7ed;color:#9a3412;text-align:center;font-weight:bold}.total{text-align:right;font-size:20px;font-weight:bold}footer{margin-top:50px;border-top:1px solid #ddd;padding-top:12px;text-align:center;color:#64748b;font-size:11px}</style></head><body><header>${companyData.logoUrl || companyData.logo ? `<img src="${escapeHtml(companyData.logoUrl || companyData.logo)}">` : ""}<div><h1>${escapeHtml(legalName)}</h1><div>${escapeHtml(companyData.cnpj)} · ${escapeHtml(companyData.phone)} · ${escapeHtml(companyData.email)}</div><div>${escapeHtml(companyData.address)}</div></div></header><h2>${fiscalPreview ? "Prévia do documento fiscal" : "Cupom não fiscal"} · ${escapeHtml(sale.saleNumber)}</h2>${fiscalPreview ? '<div class="warning">SEM VALIDADE FISCAL — AGUARDANDO AUTORIZAÇÃO DO PROVEDOR</div>' : '<div class="warning">CUPOM NÃO FISCAL</div>'}<p><b>Cliente:</b> ${escapeHtml(sale.clientName)}<br><b>Data:</b> ${new Date(`${sale.issueDate}T12:00:00`).toLocaleDateString("pt-BR")}</p><table><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: ${money(sale.netAmountCents)}</p><footer>CUPOM NÃO FISCAL · Sistema de Gestão Blu Tecnologias</footer><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const receiptPdf = (sale: Sale) => {
    const plain = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
    const pdfText = (value: unknown) => plain(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const companyName = (company as Company & { legalName?: string; razaoSocial?: string; tradeName?: string }).tradeName || (company as Company & { legalName?: string; razaoSocial?: string }).legalName || (company as Company & { razaoSocial?: string }).razaoSocial || "Empresa";
    const lines = [
      companyName,
      "CUPOM NAO FISCAL",
      `Venda: ${sale.saleNumber}`,
      `Data: ${new Date(`${sale.issueDate}T12:00:00`).toLocaleDateString("pt-BR")}`,
      `Cliente: ${sale.clientName}`,
      "",
      "ITENS",
      ...sale.items.flatMap((item) => [plain(item.name).slice(0, 72), `${item.quantityMilli / 1000} ${item.unit} x ${money(item.unitPriceCents)} = ${money(item.totalCents)}`]),
      "",
      `TOTAL: ${money(sale.netAmountCents)}`,
      "",
      "Este cupom nao substitui documento fiscal.",
      "Sistema de Gestao Blu Tecnologias",
    ];
    const content = [`BT /F1 15 Tf 48 790 Td (${pdfText(lines[0])}) Tj`, "/F1 11 Tf 0 -28 Td"];
    lines.slice(1).forEach((line) => content.push(`0 -18 Td (${pdfText(line)}) Tj`));
    content.push("ET");
    const stream = content.join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const shareReceipt = async (sale: Sale) => {
    const file = new File([receiptPdf(sale)], `cupom-${sale.saleNumber}.pdf`, { type: "application/pdf" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Cupom ${sale.saleNumber}`, text: "Cupom não fiscal da venda", files: [file] });
        return;
      }
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("O navegador não oferece compartilhamento de arquivos. O PDF foi baixado.");
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") setMessage("Não foi possível compartilhar o PDF. Tente baixar novamente.");
    }
  };

  const complete = async () => {
    if (!user || !register) return setMessage("Abra o seu caixa antes de concluir vendas.");
    if (!cart.length) return setMessage("Adicione pelo menos um item à venda.");
    if (clientMode === "registered" && !clientId) return setMessage("Selecione um cliente cadastrado ou use Consumidor final.");
    if (paymentMethod === "cash" && cashReceivedCents < total) return setMessage("O valor recebido em dinheiro é menor que o total da venda.");
    if (paymentMethod === "pix" && pixPayment?.status !== "paid") return setMessage("Confirme o pagamento PIX antes de concluir a venda.");
    setSaving(true); setMessage("");
    try {
      const saleId = crypto.randomUUID();
      const saleNumber = pixPayment?.saleNumber || `PDV-${Date.now()}`;
      const saleItems = cart.map((item) => ({ name: item.name, quantityMilli: item.quantityMilli, unit: item.unit || "un", unitPriceCents: item.salePriceCents, totalCents: Math.round(item.salePriceCents * item.quantityMilli / 1000) }));
      const anonymous = clientMode === "anonymous";
      const customerName = anonymous ? "Consumidor final" : selectedClient?.razaoSocial || selectedClient?.name || "Cliente";
      const localSale: Sale = { id: saleId, saleNumber, clientName: customerName, netAmountCents: total, issueDate, status: paymentMethod === "cash" || paymentMethod === "pix" || paid ? "completed" : "pending", items: saleItems };
      const payload = { companyId: user.companyId, registerId: register.id, saleChannel: servicePos ? "service_pos" : "commerce_pos", clientId: anonymous ? "" : clientId, anonymousCustomer: anonymous, customerName, contractId: anonymous ? "" : contractId, contractName: anonymous ? "" : selectedContract?.title || "", number: saleNumber, issueDate, dueDate, discountCents, paymentMethod, paymentIntentId: pixPayment?.id || "", cashReceivedCents: paymentMethod === "cash" ? cashReceivedCents : 0, cardType: paymentMethod === "card" ? cardType : null, installments: paymentMethod === "card" && cardType === "credit" ? installments : 1, paid: paymentMethod === "cash" || paymentMethod === "pix" ? true : paid, fiscalRequested, sendEmail: anonymous ? false : sendEmail, notes, issuerName: (company as Company & { razaoSocial?: string })?.razaoSocial || "", items: cart.map((item) => ({ productId: item.id, quantityMilli: item.quantityMilli, unitPriceCents: item.salePriceCents })) };
      await commitOfflineSale({ companyId: user.companyId, userId: user.id, sale: localSale, payload });
      setLastSale(localSale); setReceiptModal(true); if (pdvConfig.printReceiptAfterSale) window.setTimeout(() => printReceipt(localSale), 250); setSales((current) => [localSale, ...current.filter((sale) => sale.id !== saleId)].slice(0, 20));
      setCart([]); setDiscountCents(0); setCashReceivedCents(0); setNotes(""); setPixPayment(null); setPixModal(false);
      setPendingSync((await listPendingPosEvents(user.companyId)).length);
      if (navigator.onLine) {
        setMessage("Venda salva no dispositivo. Sincronizando com o servidor…");
        window.setTimeout(() => void syncPendingOperations(true), 0);
      } else setMessage("Venda concluída offline e salva neste dispositivo. A sincronização será automática quando a conexão voltar.");
    } catch (error) { console.error(error); setMessage(error instanceof Error ? error.message : "Não foi possível concluir a venda."); }
    finally { setSaving(false); }
  };

  const createPixPayment = async () => {
    if (!user || !register || !cart.length || total <= 0) return setMessage("Abra o caixa e adicione os itens antes de gerar o PIX.");
    if (clientMode === "registered" && !clientId) return setMessage("Selecione um cliente cadastrado ou use Consumidor final.");
    if (!navigator.onLine) return setMessage("A geração do PIX exige conexão com a internet.");
    setPixLoading(true); setMessage("");
    try {
      const saleNumber = `PDV-${Date.now()}`;
      const callable = httpsCallable<Record<string, unknown>, Omit<PosPayment, "saleNumber">>(functions, "createPointOfSalePayment");
      const result = await callable({ companyId: user.companyId, registerId: register.id, clientId: clientMode === "anonymous" ? "" : clientId, anonymousCustomer: clientMode === "anonymous", customerName: clientMode === "anonymous" ? "Consumidor final" : selectedClient?.razaoSocial || selectedClient?.name || "Cliente", saleNumber, paymentMethod: "pix", discountCents, items: cart.map((item) => ({ productId: item.id, quantityMilli: item.quantityMilli, unitPriceCents: item.salePriceCents })) });
      const payment = { ...result.data, saleNumber } as PosPayment;
      setPixPayment(payment); setPaid(payment.status === "paid"); setPixModal(true);
    } catch (error) { console.error(error); setMessage(error instanceof Error ? error.message : "Não foi possível gerar o PIX."); }
    finally { setPixLoading(false); }
  };

  const checkPixPayment = async () => {
    if (!pixPayment) return;
    setPixLoading(true);
    try {
      const callable = httpsCallable<{ paymentIntentId: string }, { id: string; status: PosPayment["status"]; amountCents: number }>(functions, "checkPointOfSalePayment");
      const result = await callable({ paymentIntentId: pixPayment.id });
      const status = result.data.status;
      setPixPayment((current) => current ? { ...current, status } : current); setPaid(status === "paid");
      setMessage(status === "paid" ? "Pagamento PIX confirmado. A venda já pode ser concluída." : status === "failed" ? "O pagamento falhou ou foi cancelado. Gere um novo PIX." : "Pagamento ainda não identificado pelo Pagar.me.");
      if (status === "paid") setPixModal(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível verificar o PIX."); }
    finally { setPixLoading(false); }
  };

  const savePaymentSettings = async () => {
    if (!user?.companyId) return;
    setPaymentSettingsSaving(true);
    try {
      const callable = httpsCallable<Record<string, unknown>, PosPaymentSettings>(functions, "managePointOfSalePaymentSettings");
      const result = await callable({ action: "save", companyId: user.companyId, value: paymentSettings });
      setPaymentSettings(result.data); setPaymentSettingsModal(false); setMessage("Configurações de pagamento do PDV salvas.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar as configurações do PDV."); }
    finally { setPaymentSettingsSaving(false); }
  };

  const prepareRecipient = async () => {
    if (!user?.companyId) return;
    setPaymentSettingsSaving(true);
    try {
      const callable = httpsCallable<Record<string, unknown>, PosPaymentSettings>(functions, "managePointOfSalePaymentSettings");
      const result = await callable({ action: "prepare_recipient", companyId: user.companyId });
      setPaymentSettings(result.data);
      setMessage(result.data.recipientStatus === "profile_incomplete" ? "Complete os dados da empresa em Perfil para ativar o recebedor Pagar.me." : "Recebedor preparado com os dados da empresa para PDV e e-commerce.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível preparar o recebedor Pagar.me."); }
    finally { setPaymentSettingsSaving(false); }
  };

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-sky-500" /></div>;
  return <div className="relative mx-auto max-w-[1800px] space-y-2 xl:h-[calc(100vh-112px)] xl:overflow-hidden">
    <button type="button" onClick={() => setPdvConfigModal(true)} title="Configurações do PDV" aria-label="Configurações do PDV" className="fixed bottom-5 right-5 z-[170] grid h-14 w-14 place-items-center rounded-2xl border border-white/70 bg-slate-950 text-white shadow-2xl shadow-slate-900/20 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-sky-600 dark:border-white/10 dark:bg-white dark:text-slate-950 dark:hover:bg-sky-100"><Settings className="h-5 w-5"/></button>
    {message && <div className="pointer-events-none fixed inset-x-4 top-24 z-[90] flex justify-center xl:left-[max(1rem,theme(space.72))] xl:right-6 xl:justify-start"><div className="max-w-3xl rounded-xl border border-sky-200 bg-sky-50/95 px-4 py-3 text-sm font-semibold text-sky-800 shadow-2xl backdrop-blur-xl dark:border-sky-400/20 dark:bg-sky-400/15 dark:text-sky-100">{message}</div></div>}
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/75 px-4 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[.07]"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${register ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10" : "bg-amber-50 text-amber-600 dark:bg-amber-400/10"}`}>{register ? <CircleDollarSign size={19}/> : <LockKeyhole size={18}/>}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900 dark:text-white">{register ? `Caixa aberto · ${register.operatorName}` : "Caixa fechado"}</p><p className="text-[11px] text-slate-500">{register ? `Aberto às ${new Date(register.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · Fundo ${money(register.openingAmountCents)}` : "Abra um caixa para iniciar as vendas"}</p></div></div><div className="ml-auto flex items-center gap-2"><button type="button" title="Menu de operações" onClick={() => setOperationsModal(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:text-white"><Menu className="h-4 w-4"/><span className="hidden sm:inline">Operações</span></button><button type="button" title="Configurar PIX e TEF" onClick={() => setPaymentSettingsModal(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-white/10 dark:text-white"><Settings className="h-4 w-4"/></button><a href={pdvAgentService.downloadUrl} download title="Baixar Blu PDV Agent" className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200"><Download className="h-4 w-4"/><span className="hidden sm:inline">Baixar agente</span></a><button type="button" onClick={() => void syncPendingOperations(true)} disabled={!online || syncing || pendingSync === 0} className={`rounded-full px-3 py-1.5 text-[11px] font-black disabled:cursor-default ${online ? pendingSync ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200" : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200"}`}>{syncing ? "Sincronizando…" : online ? pendingSync ? `${pendingSync} pendente(s)` : "Online · sincronizado" : `Offline · ${pendingSync} pendente(s)`}</button>{register ? <button onClick={async () => { const current = await refreshRegister(); if (!current) return; setCountedCashCents(Number(current.expectedCashCents || 0)); setRegisterModal("close"); }} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 dark:border-rose-400/20">Fechar caixa</button> : <button onClick={() => setRegisterModal("open")} className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-black text-white">Abrir caixa</button>}</div></div>
    <div className="grid gap-3 xl:h-[calc(100%_-_53px)] xl:grid-cols-[minmax(360px,1.15fr)_minmax(300px,.75fr)_minmax(360px,.85fr)]">
      <section className="flex min-h-0 flex-col rounded-3xl border border-white/70 bg-white/70 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07] xl:h-full xl:overflow-hidden">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><ShoppingCart className="h-5 w-5 text-sky-500"/>{servicePos ? "Serviços a adicionar" : "Produtos a adicionar"}</h2>
        <div className="mb-2 grid grid-cols-[92px_minmax(0,1fr)] gap-2"><label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Quantidade<input type="number" min="1" max="999" step="1" value={scanQuantity} onChange={(e) => setScanQuantity(Math.max(1, Math.min(999, Math.trunc(Number(e.target.value) || 1))))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-3 text-center text-sm font-black outline-none focus:border-sky-400 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Leitor de código de barras<div className="relative"><ScanLine className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-sky-500"/><input ref={barcodeInputRef} value={scanBarcode} onChange={(e) => setScanBarcode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scanProduct(); } }} placeholder="Leia ou digite o código para adicionar automaticamente" autoComplete="off" inputMode="numeric" className="mt-1 w-full rounded-xl border border-sky-200 bg-sky-50/70 py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-sky-500 dark:border-sky-400/20 dark:bg-sky-400/[.07] dark:text-white"/></div></label></div>
        <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"/><input ref={productSearchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, SKU ou código de barras" className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-12 pr-4 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-black/20 dark:text-white"/></div>
        <div className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{filtered.map((product) => <button key={product.id} onClick={() => add(product)} className="min-h-28 rounded-2xl border border-slate-200 bg-white/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300 dark:border-white/10 dark:bg-white/[.05]"><div className="flex justify-between"><span className="rounded-lg bg-sky-50 p-1.5 text-sky-600 dark:bg-sky-400/10"><ShoppingCart className="h-4 w-4"/></span><b className="text-sm text-slate-950 dark:text-white">{money(product.salePriceCents)}</b></div><h3 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{product.name}</h3><p className="mt-1 text-[11px] text-slate-500">{servicePos ? "Baixa automática dos insumos configurados" : `${product.barcode || product.sku || "Sem código"} · Est. ${product.stockQuantity || 0}`}</p></button>)}</div>
      </section>
      <section className="flex min-h-0 flex-col rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07] xl:h-full xl:overflow-hidden">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-slate-950 dark:text-white">Produtos na sacola</h2><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">{cart.length}</span></div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {!!cart.length && <div className="h-full space-y-1.5 overflow-y-auto pr-1">{cart.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/[.06]"><div className="min-w-0 flex-1"><b className="block truncate text-sm dark:text-white">{item.name}</b><span className="text-xs text-slate-500">{money(Math.round(item.salePriceCents * item.quantityMilli / 1000))}</span></div><button onClick={() => quantity(item.id, -1000)} className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10"><Minus className="h-4 w-4"/></button><span className="w-5 text-center text-sm font-bold dark:text-white">{item.quantityMilli / 1000}</span><button onClick={() => quantity(item.id, 1000)} className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10"><Plus className="h-4 w-4"/></button><button onClick={() => removeCartItem(item)} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-400/10"><Trash2 className="h-4 w-4"/></button></div>)}</div>}
          {!cart.length && <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">Adicione produtos ou serviços à venda.</div>}
        </div>
        <div className="mt-3 border-t pt-4 dark:border-white/10 xl:sticky xl:bottom-0 xl:bg-white/75 xl:pb-1 xl:backdrop-blur-2xl dark:xl:bg-slate-900 dark:xl:backdrop-blur-none"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500"><span>Tributos estimados</span><span>{money(taxTotal)}</span></div><div className="mt-2 flex justify-between text-2xl font-black dark:text-white"><span>Total</span><span>{money(total)}</span></div></div>
      </section>
      <aside className="space-y-2 overflow-auto rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07]">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><Building2 className="text-sky-500"/>Fechamento</h2><div className="flex gap-1">{lastSale && <><button title="Imprimir cupom" onClick={() => printReceipt(lastSale)} className="rounded-xl border p-2 text-slate-600 dark:border-white/15 dark:text-white"><Printer className="h-4 w-4"/></button><button title="Prévia fiscal" onClick={() => printReceipt(lastSale, true)} className="rounded-xl border p-2 text-slate-600 dark:border-white/15 dark:text-white"><ReceiptText className="h-4 w-4"/></button></>}<button onClick={() => setClientModal(true)} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"><UserPlus className="mr-1 inline h-4 w-4"/>Novo cliente</button></div></div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[.06]"><button type="button" onClick={() => { setClientMode("anonymous"); setClientId(""); setClientQuery(""); setContractId(""); setSendEmail(false); }} className={`rounded-lg px-2 py-2 text-xs font-black ${clientMode === "anonymous" ? "bg-white text-sky-700 shadow-sm dark:bg-white/10 dark:text-sky-200" : "text-slate-500"}`}>Consumidor final</button><button type="button" onClick={() => { setClientMode("registered"); setSendEmail(true); }} className={`rounded-lg px-2 py-2 text-xs font-black ${clientMode === "registered" ? "bg-white text-sky-700 shadow-sm dark:bg-white/10 dark:text-sky-200" : "text-slate-500"}`}>Cliente cadastrado</button></div>
        {clientMode === "anonymous" && <p className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/[.06] dark:text-emerald-300">Venda sem cadastro vinculada a “Consumidor final”.</p>}
        {clientMode === "registered" && <>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={clientQuery} onFocus={() => setClientResultsOpen(true)} onChange={(e) => { setClientQuery(e.target.value); setClientResultsOpen(true); if (clientId) { setClientId(""); setContractId(""); } }} placeholder="Buscar cliente por nome, CPF ou CNPJ" className="w-full rounded-xl border py-2.5 pl-10 pr-9 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"/>{clientQuery && <button type="button" title="Limpar cliente" onClick={() => { setClientQuery(""); setClientId(""); setContractId(""); setClientResultsOpen(true); }} className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4"/></button>}{clientResultsOpen && !clientId && <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-slate-900">{filteredClients.map((client) => { const document = String(client.cnpj || client.organizationCnpj || ""); return <button type="button" key={client.id} onClick={() => { setClientId(client.id); setContractId(""); setClientQuery(client.razaoSocial || client.name || document); setClientResultsOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-white/[.06]"><b className="block truncate text-sm text-slate-900 dark:text-white">{client.razaoSocial || client.name}</b><span className="text-xs text-slate-500">{document || "Documento não informado"}</span></button>})}{!filteredClients.length && <p className="px-3 py-5 text-center text-sm text-slate-400">Nenhum cliente encontrado.</p>}{clients.length > 30 && !normalizedClientQuery && <p className="border-t px-3 py-2 text-center text-[11px] text-slate-400 dark:border-white/10">Digite nome, CPF ou CNPJ para refinar a busca.</p>}</div>}</div>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} disabled={!selectedClient?.contracts?.length} className="w-full rounded-xl border p-3 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="">Sem contrato vinculado</option>{selectedClient?.contracts?.map((contract) => <option key={contract.id} value={contract.id}>{contract.title}</option>)}</select>
        </>}
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">EMISSÃO<input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">VENCIMENTO<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/></label></div>
        <div className="grid grid-cols-2 gap-3"><select value={paymentMethod} onChange={(e) => { const method = e.target.value; setPaymentMethod(method); setPaid(method === "cash"); }} className="rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="invoice">Faturado</option><option value="cash">Dinheiro</option><option value="bank_order">Ordem bancária</option><option value="pix">PIX integrado</option><option value="transfer">Transferência</option><option value="card">Cartão / TEF</option></select><input type="number" min="0" step="0.01" value={(discountCents / 100).toFixed(2)} onChange={(e) => updateDiscount(Math.round(Number(e.target.value || 0) * 100))} placeholder="Desconto" className="rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/></div>
        {paymentMethod === "cash" && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-400/15 dark:bg-emerald-400/[.06]"><label className="text-xs font-bold text-slate-500">VALOR RECEBIDO<input type="number" min="0" step="0.01" value={(cashReceivedCents / 100).toFixed(2)} onChange={(e) => setCashReceivedCents(Math.max(0, Math.round(Number(e.target.value || 0) * 100)))} className="mt-1 w-full rounded-xl border bg-white p-3 text-base font-black dark:border-white/10 dark:bg-slate-900 dark:text-white"/></label><div className="rounded-xl bg-white/80 p-3 dark:bg-white/[.06]"><p className="text-xs font-bold text-slate-500">TROCO</p><p className={`mt-2 text-xl font-black ${cashReceivedCents >= total ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500"}`}>{money(cashChangeCents)}</p></div></div>}
        {paymentMethod === "card" && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-400/15 dark:bg-sky-400/[.06]"><label className="text-xs font-bold text-slate-500">TIPO DO CARTÃO<select value={cardType} onChange={(e) => { const type = e.target.value as "credit" | "debit"; setCardType(type); if (type === "debit") setInstallments(1); }} className="mt-1 w-full rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="credit">Crédito</option><option value="debit">Débito</option></select></label><label className="text-xs font-bold text-slate-500">PARCELAS<select value={installments} disabled={cardType === "debit"} onChange={(e) => setInstallments(Number(e.target.value))} className="mt-1 w-full rounded-xl border bg-white p-3 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white">{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value === 1 ? "À vista" : `${value}x`}</option>)}</select></label><p className="col-span-2 text-[11px] text-slate-500">A captura pelo pinpad será usada quando uma integração ativa estiver configurada.</p></div>}
        {paymentMethod === "pix" && <div className={`rounded-2xl border p-3 ${pixPayment?.status === "paid" ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/[.07]" : "border-sky-200 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-400/[.07]"}`}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-500">PIX Pagar.me · split automático</p><p className="mt-1 text-sm font-bold dark:text-white">{pixPayment?.status === "paid" ? "Pagamento confirmado" : pixPayment ? "Aguardando pagamento" : "QR Code ainda não gerado"}</p></div><button type="button" disabled={pixLoading} onClick={() => pixPayment ? setPixModal(true) : void createPixPayment()} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{pixLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : pixPayment ? <><QrCode className="mr-1 inline h-4 w-4"/>Ver PIX</> : "Gerar QR Code"}</button></div>{pixPayment && <p className="mt-2 text-[11px] text-slate-500">Taxa Blu: {money(pixPayment.bluFeeCents)} · calculada no backend.</p>}</div>}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações, empenho, medição ou instruções" className="min-h-20 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-slate-900 dark:text-white"/>
        <div className="grid grid-cols-2 gap-1 text-xs dark:text-slate-200">{paymentMethod !== "pix" && <label className="flex items-center gap-2"><input type="checkbox" checked={paymentMethod === "cash" || paid} disabled={paymentMethod === "cash"} onChange={(e) => setPaid(e.target.checked)}/>Pagamento recebido</label>}<label className="flex items-center gap-2"><input type="checkbox" checked={fiscalRequested} onChange={(e) => setFiscalRequested(e.target.checked)}/>Preparar nota</label>{clientMode === "registered" && <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)}/>Enviar comprovante por e-mail</label>}</div>
        <button disabled={saving || !register || !cart.length || (clientMode === "registered" && !clientId) || (paymentMethod === "cash" && cashReceivedCents < total) || (paymentMethod === "pix" && pixPayment?.status !== "paid")} onClick={complete} className="w-full rounded-2xl bg-sky-500 py-4 font-black text-white shadow-lg shadow-sky-500/20 disabled:opacity-50">{saving ? <Loader2 className="mx-auto animate-spin"/> : <><CheckCircle2 className="mr-2 inline h-5 w-5"/>{register ? paymentMethod === "pix" && pixPayment?.status !== "paid" ? "Aguardando PIX" : "Concluir venda" : "Abra o caixa para vender"}</>}</button>
        {clientMode === "registered" && sendEmail && <p className="flex items-center justify-center gap-2 text-xs text-slate-400"><Mail className="h-3 w-3"/>Será usado o e-mail financeiro do cliente.</p>}
      </aside>
    </div>
    {receiptModal && lastSale && <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-xl rounded-3xl border border-white/60 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-500">Venda concluída</p><h2 className="mt-1 text-2xl font-black dark:text-white">Cupom não fiscal disponível</h2></div><button onClick={() => setReceiptModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X/></button></div><div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-white/[.06]"><div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Venda</span><b className="dark:text-white">{lastSale.saleNumber}</b></div><div className="mt-2 flex justify-between gap-4"><span className="text-sm text-slate-500">Cliente</span><b className="text-right dark:text-white">{lastSale.clientName}</b></div><div className="mt-4 flex justify-between border-t pt-4 text-xl font-black dark:border-white/10 dark:text-white"><span>Total</span><span>{money(lastSale.netAmountCents)}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Este comprovante é um cupom não fiscal e não substitui NF-e, NFC-e ou NFS-e.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => printReceipt(lastSale)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:text-white"><Printer className="mr-2 inline h-4 w-4"/>Imprimir em A4</button><button onClick={() => void shareReceipt(lastSale)} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white"><Share2 className="mr-2 inline h-4 w-4"/>Compartilhar PDF</button></div><button onClick={() => setReceiptModal(false)} className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Iniciar próxima venda</button></div></div>}
    {pdvConfigModal && <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/45 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-sky-500">Configuração operacional</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Configurações do PDV</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Defina o modo balcão e quais ações exigem autorização do gerente.</p></div><button type="button" onClick={() => setPdvConfigModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X/></button></div><section className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-400/20 dark:bg-sky-400/[.08]"><label className="flex items-start gap-3"><input type="checkbox" checked={pdvConfig.focusMode} onChange={(event) => updatePdvConfig({ focusMode: event.target.checked })} className="mt-1 h-5 w-5"/><span><b className="block text-slate-900 dark:text-white">Modo balcão em tela cheia</b><span className="mt-1 block text-sm text-slate-500 dark:text-slate-300">Oculta header e menu lateral somente no PDV. O botão fixo permanece no canto inferior direito.</span></span></label></section><section className="mt-5 grid gap-3 sm:grid-cols-2"><ConfigToggle label="Remover item da sacola" description="Exige autorização para excluir produtos/serviços antes de concluir." checked={pdvConfig.requireManagerToRemoveItem} onChange={(value) => updatePdvConfig({ requireManagerToRemoveItem: value })}/><ConfigToggle label="Cancelar venda" description="Protege o cancelamento total da sacola atual." checked={pdvConfig.requireManagerToCancelSale} onChange={(value) => updatePdvConfig({ requireManagerToCancelSale: value })}/><ConfigToggle label="Descontos e acréscimos" description="Use com o limite máximo de desconto permitido." checked={pdvConfig.requireManagerForDiscount} onChange={(value) => updatePdvConfig({ requireManagerForDiscount: value })}/><ConfigToggle label="Sangria do caixa" description="Exige autorização para retirada de dinheiro." checked={pdvConfig.requireManagerForWithdrawal} onChange={(value) => updatePdvConfig({ requireManagerForWithdrawal: value })}/><ConfigToggle label="Reimprimir fechamento" description="Controla segunda via de fechamento e comprovantes sensíveis." checked={pdvConfig.requireManagerForReprint} onChange={(value) => updatePdvConfig({ requireManagerForReprint: value })}/><ConfigToggle label="Administrativo TEF" description="Protege configurações de pinpad, transações e rotinas TEF." checked={pdvConfig.requireManagerForTefAdmin} onChange={(value) => updatePdvConfig({ requireManagerForTefAdmin: value })}/><ConfigToggle label="Ações fiscais" description="Reservado para NFC-e/SAT/MFE, cancelamento fiscal e inutilização." checked={pdvConfig.requireManagerForFiscalActions} onChange={(value) => updatePdvConfig({ requireManagerForFiscalActions: value })}/><ConfigToggle label="Imprimir após venda" description="Abre o comprovante automaticamente ao concluir a venda." checked={pdvConfig.printReceiptAfterSale} onChange={(value) => updatePdvConfig({ printReceiptAfterSale: value })}/></section><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="rounded-2xl border border-slate-200 p-4 text-xs font-black uppercase text-slate-500 dark:border-white/10">Limite de desconto sem gerente (%)<input type="number" min="0" max="100" value={pdvConfig.maxDiscountPercent} onChange={(event) => updatePdvConfig({ maxDiscountPercent: Math.max(0, Math.min(100, Number(event.target.value || 0))) })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-base font-black text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><ConfigToggle label="Solicitar CPF/CNPJ no balcão" description="Lembra o operador de identificar consumidor quando necessário." checked={pdvConfig.askCustomerDocument} onChange={(value) => updatePdvConfig({ askCustomerDocument: value })}/></div><div className="mt-6 rounded-2xl bg-slate-100 p-4 text-xs leading-5 text-slate-600 dark:bg-white/[.06] dark:text-slate-300"><b>Base operacional:</b> permissões por operador/gerente, aprovação para cancelamentos, descontos, sangrias, reimpressões e rotinas TEF/fiscais. Nesta versão a confirmação fica local; a próxima evolução pode validar senha/PIN do gerente no backend.</div><button type="button" onClick={() => { setPdvConfigModal(false); setMessage("Configurações do PDV salvas neste terminal."); }} className="mt-5 w-full rounded-2xl bg-sky-500 py-4 font-black text-white">Concluir</button></div></div>}
    {operationsModal && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-3xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-sky-500">Menu operacional</p><h2 className="text-2xl font-black dark:text-white">Operações do PDV</h2></div><button onClick={() => setOperationsModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X/></button></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><button onClick={() => { setPdvConfigModal(true); setOperationsModal(false); }} className="rounded-2xl border p-4 text-left dark:border-white/10"><Settings className="mb-3 text-slate-700 dark:text-white"/><b className="block dark:text-white">Configurar PDV</b><span className="text-xs text-slate-500">Modo balcão e autorizações</span></button><button disabled={!register} onClick={() => { setCashMovementModal("supply"); setOperationsModal(false); }} className="rounded-2xl border p-4 text-left disabled:opacity-40 dark:border-white/10"><Plus className="mb-3 text-emerald-500"/><b className="block dark:text-white">Suprimento</b><span className="text-xs text-slate-500">Entrada de dinheiro no caixa</span></button><button disabled={!register} onClick={() => { setCashMovementModal("withdrawal"); setOperationsModal(false); }} className="rounded-2xl border p-4 text-left disabled:opacity-40 dark:border-white/10"><Minus className="mb-3 text-rose-500"/><b className="block dark:text-white">Sangria</b><span className="text-xs text-slate-500">Retirada controlada</span></button><button disabled={!register} onClick={() => void temporaryExit()} className="rounded-2xl border p-4 text-left disabled:opacity-40 dark:border-white/10"><LogOut className="mb-3 text-amber-500"/><b className="block dark:text-white">Saída temporária</b><span className="text-xs text-slate-500">Bloqueia a operação atual</span></button><button onClick={() => exportProducts("scale")} className="rounded-2xl border p-4 text-left dark:border-white/10"><Scale className="mb-3 text-sky-500"/><b className="block dark:text-white">Exportar para balança</b><span className="text-xs text-slate-500">Arquivo PLU padronizado</span></button><button onClick={() => { if (pdvConfig.requireManagerForTefAdmin && !managerAuthorization("acessar o administrativo TEF")) return; setPaymentSettingsModal(true); setOperationsModal(false); }} className="rounded-2xl border p-4 text-left dark:border-white/10"><ShieldCheck className="mb-3 text-indigo-500"/><b className="block dark:text-white">Administrativo TEF</b><span className="text-xs text-slate-500">Provedor, terminal e homologação</span></button><button onClick={() => void openRegisterHistory()} className="rounded-2xl border p-4 text-left dark:border-white/10"><Printer className="mb-3 text-violet-500"/><b className="block dark:text-white">Reimprimir fechamento</b><span className="text-xs text-slate-500">Térmica ou salvar em PDF</span></button><button onClick={() => exportProducts("price_terminal")} className="rounded-2xl border p-4 text-left dark:border-white/10"><Download className="mb-3 text-cyan-500"/><b className="block dark:text-white">Terminal de preço</b><span className="text-xs text-slate-500">Exportação CSV</span></button><button onClick={() => { setOperationsModal(false); window.setTimeout(() => productSearchRef.current?.focus(), 50); }} className="rounded-2xl border p-4 text-left dark:border-white/10"><Search className="mb-3 text-sky-500"/><b className="block dark:text-white">Pesquisar produto</b><span className="text-xs text-slate-500">Nome, SKU ou código</span></button><button disabled={!cart.length} onClick={cancelCurrentSale} className="rounded-2xl border p-4 text-left disabled:opacity-40 dark:border-white/10"><Trash2 className="mb-3 text-rose-500"/><b className="block dark:text-white">Cancelar venda</b><span className="text-xs text-slate-500">Limpa a sacola atual</span></button></div></div></div>}
    {cashMovementModal && <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-sky-500">Movimentação de caixa</p><h2 className="text-2xl font-black dark:text-white">{cashMovementModal === "supply" ? "Suprimento" : "Sangria"}</h2></div><button onClick={() => setCashMovementModal(null)}><X className="text-slate-500"/></button></div><label className="mt-5 block text-xs font-black uppercase text-slate-500">Valor<input autoFocus type="number" min="0.01" step="0.01" value={(movementAmountCents / 100).toFixed(2)} onChange={(e) => setMovementAmountCents(Math.max(0, Math.round(Number(e.target.value || 0) * 100)))} className="mt-2 w-full rounded-2xl border p-4 text-xl font-black dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="mt-4 block text-xs font-black uppercase text-slate-500">Motivo<textarea value={movementReason} onChange={(e) => setMovementReason(e.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border p-4 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><button disabled={registerSaving || !movementAmountCents || !movementReason.trim()} onClick={() => void submitCashMovement()} className="mt-5 w-full rounded-2xl bg-sky-500 py-4 font-black text-white disabled:opacity-40">{registerSaving ? <Loader2 className="mx-auto animate-spin"/> : "Registrar e emitir comprovante"}</button></div></div>}
    {historyModal && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4"><div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-sky-500">Histórico</p><h2 className="text-2xl font-black dark:text-white">Fechamentos de caixa</h2></div><button onClick={() => setHistoryModal(false)}><X className="text-slate-500"/></button></div><div className="mt-5 space-y-3">{registerHistory.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-4 dark:border-white/10"><div className="min-w-0 flex-1"><b className="dark:text-white">{item.operatorName}</b><p className="text-xs text-slate-500">{new Date(item.openedAt).toLocaleString("pt-BR")} · {item.status === "closed" ? "Fechado" : "Aberto"}</p><p className="mt-1 text-sm font-bold dark:text-slate-200">Esperado {money(item.expectedCashCents || 0)} · Diferença {money(item.differenceCents || 0)}</p></div><button onClick={() => printRegisterDocument(item, true)} className="rounded-xl border px-3 py-2 text-xs font-black dark:border-white/10 dark:text-white"><Printer className="mr-1 inline h-4 w-4"/>Térmica</button><button onClick={() => printRegisterDocument(item, false)} className="rounded-xl border px-3 py-2 text-xs font-black dark:border-white/10 dark:text-white"><FileText className="mr-1 inline h-4 w-4"/>PDF</button></div>)}{!registerHistory.length && <p className="py-10 text-center text-slate-400">Nenhum fechamento encontrado.</p>}</div></div></div>}
    {registerLocked && register && <div className="fixed inset-0 z-[160] grid place-items-center bg-slate-950/90 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 text-center text-white shadow-2xl"><LockKeyhole className="mx-auto h-12 w-12 text-sky-400"/><h2 className="mt-4 text-2xl font-black">Caixa em saída temporária</h2><p className="mt-2 text-sm text-slate-400">Operador: {register.operatorName}. A venda permanece preservada neste dispositivo.</p><button onClick={() => void temporaryExit(true)} className="mt-6 w-full rounded-2xl bg-sky-500 py-4 font-black">Retornar ao caixa</button></div></div>}
    {paymentSettingsModal && <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/45 p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-sky-500">Meios de pagamento</p><h2 className="mt-1 text-2xl font-black dark:text-white">PIX, TEF e agente local</h2></div><button type="button" onClick={() => setPaymentSettingsModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X/></button></div><section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[.06]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-500">Blu PDV Agent</p><h3 className="mt-1 font-black dark:text-white">{agentHealth ? `Conectado · v${agentHealth.version}` : "Agente não encontrado"}</h3><p className="mt-1 text-xs text-slate-500">{agentHealth ? `${agentDevices?.printers?.length || 0} impressora(s) detectada(s) neste computador.` : "Instale para usar impressora térmica, gaveta, balança, TEF e fiscal local."}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${agentHealth ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{agentHealth ? "ONLINE" : "OFFLINE"}</span></div>{agentDevices?.printers?.length ? <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600 dark:bg-black/20 dark:text-slate-300">{agentDevices.printers.slice(0, 3).map((printer) => <p key={printer.id} className="truncate">Impressora: <b>{printer.name}</b></p>)}</div> : null}<div className="mt-4 grid gap-2 sm:grid-cols-2"><a href={pdvAgentService.downloadUrl} download className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950"><Download size={16}/>Baixar agente</a><button type="button" onClick={() => void checkAgent()} disabled={agentChecking} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-white">{agentChecking ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}Verificar conexão</button></div></section><label className="mt-5 block text-xs font-black uppercase text-slate-500">Recipient ID Pagar.me da empresa<input disabled={!paymentSettings.canManage} value={paymentSettings.pagarmeRecipientId} onChange={(event) => setPaymentSettings((current) => ({ ...current, pagarmeRecipientId: event.target.value }))} placeholder="rp_..." className="mt-2 w-full rounded-2xl border p-4 font-mono text-sm dark:border-white/10 dark:bg-black/20 dark:text-white disabled:opacity-60"/></label><section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-500">Recebedor Pagar.me</p><p className="mt-1 text-sm font-bold dark:text-white">{paymentSettings.pagarmeRecipientId ? "Pronto para PIX com split" : paymentSettings.recipientStatus === "profile_incomplete" ? "Dados da empresa incompletos" : paymentSettings.recipientStatus === "ready_for_onboarding" ? "Pronto para onboarding" : "Não iniciado"}</p></div><button type="button" disabled={!paymentSettings.canManage || paymentSettingsSaving} onClick={() => void prepareRecipient()} className="rounded-xl border border-sky-200 px-3 py-2 text-xs font-black text-sky-700 disabled:opacity-50 dark:border-sky-400/20 dark:text-sky-200">{paymentSettingsSaving ? "Aguarde…" : "Preparar"}</button></div><p className="mt-2 text-xs text-slate-500">Usa os dados da empresa em Perfil e sincroniza o status para PDV e e-commerce. O split de 0,15% é calculado no backend.</p></section><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/[.07]"><label className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200"><input type="checkbox" disabled={!paymentSettings.canManage} checked={paymentSettings.tefEnabled} onChange={(event) => setPaymentSettings((current) => ({ ...current, tefEnabled: event.target.checked }))}/>Preparar integração TEF/pinpad</label><div className="mt-3 grid grid-cols-2 gap-3"><input disabled={!paymentSettings.canManage} value={paymentSettings.tefProvider} onChange={(event) => setPaymentSettings((current) => ({ ...current, tefProvider: event.target.value }))} placeholder="Provedor TEF" className="rounded-xl border bg-white p-3 text-sm dark:border-white/10 dark:bg-black/20 dark:text-white"/><input disabled={!paymentSettings.canManage} value={paymentSettings.tefTerminalId} onChange={(event) => setPaymentSettings((current) => ({ ...current, tefTerminalId: event.target.value }))} placeholder="ID do terminal" className="rounded-xl border bg-white p-3 text-sm dark:border-white/10 dark:bg-black/20 dark:text-white"/></div><p className="mt-3 text-xs text-amber-700 dark:text-amber-200">Status: aguardando contratação, homologação do provedor e instalação do middleware local. Ativar esta opção não captura cartões sozinho.</p></div>{paymentSettings.canManage ? <button type="button" disabled={paymentSettingsSaving} onClick={() => void savePaymentSettings()} className="mt-5 w-full rounded-2xl bg-sky-500 py-4 font-black text-white disabled:opacity-50">{paymentSettingsSaving ? <Loader2 className="mx-auto animate-spin"/> : "Salvar configurações"}</button> : <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-500 dark:bg-white/[.06]">Somente o administrador da empresa pode alterar esta configuração.</p>}</div></div>}
    {pixModal && pixPayment && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-sky-500">Pagamento PIX</p><h2 className="mt-1 text-2xl font-black dark:text-white">{money(pixPayment.amountCents)}</h2></div><button type="button" onClick={() => setPixModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X/></button></div>{pixPayment.qrCodeUrl ? <img src={pixPayment.qrCodeUrl} alt="QR Code PIX" className="mx-auto my-5 h-64 w-64 rounded-2xl border bg-white p-3"/> : <div className="my-5 grid h-64 place-items-center rounded-2xl border border-dashed text-center text-sm text-slate-400"><QrCode className="mb-2 h-10 w-10"/><span>O gateway não retornou a imagem do QR Code.</span></div>}<div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[.06]"><p className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">{pixPayment.qrCode || "Código copia e cola indisponível"}</p></div><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" disabled={!pixPayment.qrCode} onClick={() => void navigator.clipboard.writeText(pixPayment.qrCode).then(() => setMessage("Código PIX copiado."))} className="rounded-2xl border py-3 text-sm font-black dark:border-white/10 dark:text-white disabled:opacity-40"><Copy className="mr-2 inline h-4 w-4"/>Copiar PIX</button><button type="button" disabled={pixLoading} onClick={() => void checkPixPayment()} className="rounded-2xl bg-sky-500 py-3 text-sm font-black text-white disabled:opacity-50">{pixLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin"/> : <><RefreshCw className="mr-2 inline h-4 w-4"/>Verificar</>}</button></div><p className="mt-4 text-center text-xs text-slate-500">A venda só será liberada após confirmação do Pagar.me.</p></div></div>}
    {registerModal && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-sky-500">Controle de caixa</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{registerModal === "open" ? "Abrir caixa" : "Fechar caixa"}</h2><p className="mt-1 text-sm text-slate-500">Operador: {register?.operatorName || user?.name || user?.email || "Usuário autenticado"}</p></div><button type="button" onClick={() => setRegisterModal(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X/></button></div>{registerModal === "open" ? <label className="mt-6 block text-xs font-black uppercase tracking-wide text-slate-500">Fundo inicial<input autoFocus type="number" min="0" step="0.01" value={(openingAmountCents / 100).toFixed(2)} onChange={(e) => setOpeningAmountCents(Math.max(0, Math.round(Number(e.target.value || 0) * 100)))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-xl font-black outline-none focus:border-sky-400 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label> : <><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.06]"><p className="text-xs font-black uppercase text-slate-500">Vendas</p><p className="mt-1 text-xl font-black dark:text-white">{register?.saleCount || 0}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.06]"><p className="text-xs font-black uppercase text-slate-500">Dinheiro esperado</p><p className="mt-1 text-xl font-black dark:text-white">{money(register?.expectedCashCents || 0)}</p></div></div><label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500">Dinheiro contado<input autoFocus type="number" min="0" step="0.01" value={(countedCashCents / 100).toFixed(2)} onChange={(e) => setCountedCashCents(Math.max(0, Math.round(Number(e.target.value || 0) * 100)))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-xl font-black outline-none focus:border-sky-400 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><div className={`mt-3 rounded-2xl p-4 ${countedCashCents - Number(register?.expectedCashCents || 0) === 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}`}><p className="text-xs font-black uppercase">Diferença de caixa</p><p className="mt-1 text-xl font-black">{money(countedCashCents - Number(register?.expectedCashCents || 0))}</p></div><textarea value={registerNotes} onChange={(e) => setRegisterNotes(e.target.value)} placeholder="Observações do fechamento" className="mt-3 min-h-20 w-full rounded-2xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></>}<button type="button" disabled={registerSaving} onClick={() => void submitRegister()} className={`mt-6 w-full rounded-2xl py-4 font-black text-white disabled:opacity-50 ${registerModal === "open" ? "bg-sky-500" : "bg-rose-500"}`}>{registerSaving ? <Loader2 className="mx-auto animate-spin"/> : registerModal === "open" ? "Confirmar abertura" : "Confirmar fechamento"}</button></div></div>}
    {clientModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4"><div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-500">Cadastro rápido</p><h2 className="text-2xl font-black dark:text-white">Novo cliente</h2></div><button onClick={() => setClientModal(false)} className="rounded-xl p-2 dark:text-white"><X/></button></div><div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/[.06]"><button onClick={() => setClientForm({ ...emptyClient(), kind: "person" })} className={`rounded-xl py-3 font-bold ${clientForm.kind === "person" ? "bg-white text-sky-700 shadow dark:bg-white/10 dark:text-sky-200" : "text-slate-500"}`}>Pessoa física</button><button onClick={() => setClientForm({ ...emptyClient(), kind: "company" })} className={`rounded-xl py-3 font-bold ${clientForm.kind === "company" ? "bg-white text-sky-700 shadow dark:bg-white/10 dark:text-sky-200" : "text-slate-500"}`}>Pessoa jurídica</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500">{clientForm.kind === "company" ? "CNPJ" : "CPF"}<div className="relative"><input value={clientForm.document} onChange={(e) => setClientForm({ ...clientForm, document: e.target.value })} onBlur={() => void lookupDocument()} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/>{clientLookup && <Loader2 className="absolute right-3 top-4 h-4 w-4 animate-spin text-sky-500"/>}</div></label><label className="text-xs font-bold text-slate-500">{clientForm.kind === "company" ? "RAZÃO SOCIAL" : "NOME COMPLETO"}<input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">E-MAIL FINANCEIRO<input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">TELEFONE<input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500 sm:col-span-2">ENDEREÇO<input value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">CIDADE<input value={clientForm.city} onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })} className="mt-1 w-full rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></label><label className="text-xs font-bold text-slate-500">UF / CEP<div className="mt-1 grid grid-cols-[80px_1fr] gap-2"><input value={clientForm.state} maxLength={2} onChange={(e) => setClientForm({ ...clientForm, state: e.target.value.toUpperCase() })} className="rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/><input value={clientForm.cep} onChange={(e) => setClientForm({ ...clientForm, cep: e.target.value })} className="rounded-xl border p-3 dark:border-white/10 dark:bg-black/20 dark:text-white"/></div></label></div><button disabled={clientSaving} onClick={() => void createClient()} className="mt-5 w-full rounded-2xl bg-sky-500 py-4 font-black text-white disabled:opacity-50">{clientSaving ? <Loader2 className="mx-auto animate-spin"/> : "Cadastrar e voltar ao PDV"}</button></div></div>}
    <details className="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[.07] dark:text-slate-200"><summary className="cursor-pointer font-bold">Vendas recentes ({sales.length})</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[700px] text-left"><tbody>{sales.map((sale) => <tr key={sale.id} className="border-t dark:border-white/10"><td className="p-2 font-bold">{sale.saleNumber}</td><td>{sale.clientName}</td><td>{new Date(`${sale.issueDate}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{sale.status === "completed" ? "Recebida" : "Pendente"}</td><td>{money(sale.netAmountCents)}</td><td><button onClick={() => printReceipt(sale)} className="p-2 text-sky-500"><Printer className="h-4 w-4"/></button></td></tr>)}</tbody></table></div></details>
  </div>;
};

export const ServicePointOfSalePage: React.FC = () => <PublicPointOfSalePage mode="services" />;
