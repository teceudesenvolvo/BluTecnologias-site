import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import {
  CalendarDays,
  Bold,
  CheckCircle2,
  Clock3,
  FileWarning,
  Kanban,
  LayoutList,
  Loader2,
  Mail,
  Eye,
  Plus,
  Receipt,
  Search,
  Send,
  Italic,
  Underline,
  List,
  ListOrdered,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { auth, certificateService, clientService, db, storageService, type Certificate, type Company, type ContactLead, type FinancialSettings } from "../../../services/firebase";
import { companySettingsService, financialSettingsService } from "../../../services/firestoreSettingsService";
import { useCollections } from "../hooks/useCollections";
import type { CollectionInput, CollectionStatus, FinancialCollection } from "../domain/collectionTypes";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);
const date = (value: string) => (value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const today = () => new Date().toISOString().slice(0, 10);

const labels: Record<CollectionStatus, string> = {
  draft: "Rascunho",
  awaitingInvoice: "Aguardando nota fiscal",
  issued: "Emitida",
  sent: "Enviada",
  viewed: "Visualizada",
  awaitingPayment: "Aguardando pagamento",
  partiallyReceived: "Parcialmente recebida",
  received: "Recebida",
  overdue: "Vencida",
  disputed: "Contestada",
  renegotiated: "Renegociada",
  cancelled: "Cancelada",
};
const statuses = Object.keys(labels) as CollectionStatus[];

type BillingForm = {
  senderCompany: string;
  senderCompanyId: string;
  solutionSelect: string;
  clientEmail: string;
  clientName: string;
  clientDocument: string;
  title: string;
  value: string;
  bankAccount: string;
  pixKey: string;
  invoiceFile: string;
  reportFile: string;
  reportHtml: string;
  reportSubject: string;
  selectedCertificates: string[];
  emailText: string;
  dueDate: string;
  attachmentUrls: string[];
};

const emptyBilling = (): BillingForm => ({
  senderCompany: "",
  senderCompanyId: "",
  solutionSelect: "",
  clientEmail: "",
  clientName: "",
  clientDocument: "",
  title: "",
  value: "",
  bankAccount: "",
  pixKey: "",
  invoiceFile: "",
  reportFile: "",
  reportHtml: "<p>Descreva aqui a medição, relatório ou observações da cobrança.</p>",
  reportSubject: "Relatório de medição / cobrança",
  selectedCertificates: [],
  emailText: "",
  dueDate: today(),
  attachmentUrls: [],
});

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const companyDisplayName = (company?: Company | null) => company?.razaoSocial || company?.nomeFantasia || company?.name || company?.displayName || "Blu Tecnologias";
const companyFooter = (company?: Company | null) =>
  [company?.email, company?.telefoneCelular || company?.telefoneFixo, company?.address || company?.endereco].filter(Boolean).join(" · ");
const companyLogo = (company?: Company | null) => company?.logoUrl || "";

const buildBillingReportHtml = ({
  company,
  client,
  contract,
  form,
  selectedCertificates,
}: {
  company?: Company | null;
  client: ContactLead | undefined;
  contract: any;
  form: BillingForm;
  selectedCertificates: Certificate[];
}) => {
  const title = form.reportSubject || "Relatório de medição / cobrança";
  const intro = form.emailText?.trim() || "Apresentamos o relatório consolidado da cobrança, com base nas informações do contrato e dos documentos anexados.";
  const extra = form.reportHtml?.trim() || "";
  const rows = selectedCertificates.length
    ? selectedCertificates
        .map(
          (certificate) => `
            <tr>
              <td>${escapeHtml(certificate.name || certificate.id)}</td>
              <td>${escapeHtml(certificate.issueDate ? date(certificate.issueDate) : "—")}</td>
              <td>${escapeHtml(certificate.expiryDate ? date(certificate.expiryDate) : "Vigente")}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="3">Nenhuma certidão selecionada.</td></tr>`;
  const logo = companyLogo(company);
  const total = money(Number(form.value || 0) * 100);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>
    @page{size:A4;margin:16mm}
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,Arial,sans-serif;color:#0f172a;background:#eef2f7}
    .page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:20mm 18mm;position:relative}
    .head{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:3px solid #0877ff;padding-bottom:16px}
    .brand{display:flex;align-items:center;gap:14px}
    .logo{width:62px;height:62px;border-radius:16px;object-fit:contain;border:1px solid #e2e8f0;padding:6px}
    .fallback{display:grid;place-items:center;width:62px;height:62px;border-radius:16px;background:#0877ff;color:#fff;font-size:28px;font-weight:900}
    .muted{color:#64748b}
    .title{text-align:right}
    .title p{margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0877ff}
    .title h1{margin:6px 0 0;font-size:22px;line-height:1.2}
    .box{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:22px 0}
    .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}
    .info small{display:block;text-transform:uppercase;font-weight:800;color:#64748b;font-size:9px}
    .info strong{display:block;margin-top:6px;font-size:13px}
    .text{font-size:13px;line-height:1.7;color:#334155;margin:18px 0}
    .text p{margin:0 0 10px}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
    th{background:#f8fafc;text-align:left;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    th,td{border-bottom:1px solid #e2e8f0;padding:10px;vertical-align:top}
    .total{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-top:22px;background:#eff6ff;border-radius:16px;padding:18px;color:#172554}
    .thanks{max-width:430px;font-size:13px;line-height:1.6}
    .amount{text-align:right}
    .amount small{display:block;text-transform:uppercase;font-weight:800;color:#2563eb;font-size:10px}
    .amount strong{font-size:28px}
    .foot{position:absolute;left:18mm;right:18mm;bottom:12mm;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;line-height:1.45;color:#64748b}
    @media print{body{background:#fff}.page{margin:0;padding-top:10mm}}
  </style></head><body><main class="page">
    <header class="head"><div class="brand">${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="Logo"/>` : `<div class="fallback">b</div>`}<div><h2>${escapeHtml(companyDisplayName(company))}</h2><p class="muted">CNPJ ${escapeHtml(company?.document || company?.cnpj || "não informado")}</p></div></div><div class="title"><p>${escapeHtml(title)}</p><h1>${escapeHtml(form.title || contract?.title || "Cobrança")}</h1></div></header>
    <section class="box"><div class="info"><small>Cliente/órgão</small><strong>${escapeHtml(client?.razaoSocial || client?.name || "Não informado")}</strong></div><div class="info"><small>Contrato</small><strong>${escapeHtml(contract?.title || contract?.number || "Não informado")}</strong></div><div class="info"><small>Validade</small><strong>${escapeHtml(form.dueDate ? date(form.dueDate) : "Não informada")}</strong></div></section>
    <section class="text"><p>${escapeHtml(intro)}</p>${extra ? `<p>${escapeHtml(extra.replace(/<[^>]*>/g, ""))}</p>` : ""}<p>Valor da cobrança: <strong>${escapeHtml(total)}</strong></p></section>
    <table><thead><tr><th>Certidão</th><th>Emissão</th><th>Validade</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="total"><div class="thanks">Agradecemos a oportunidade de apresentar este relatório. Permanecemos à disposição para esclarecimentos e próximos passos.</div><div class="amount"><small>Valor total</small><strong>${escapeHtml(total)}</strong></div></section>
    <footer class="foot"><strong>${escapeHtml(companyDisplayName(company))}</strong><br/>${escapeHtml(companyFooter(company)) || "Dados de contato da empresa"}<br/>Cliente: ${escapeHtml(client?.email || client?.financialContact || "não informado")}</footer>
  </main></body></html>`;
};

export const CollectionsPage = () => {
  const data = useCollections();
  const [view, setView] = React.useState<"table" | "kanban" | "calendar">("table");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [billingOpen, setBillingOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<FinancialCollection | null>(null);
  const [detail, setDetail] = React.useState<FinancialCollection | null>(null);
  const [receiving, setReceiving] = React.useState<FinancialCollection | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [certificates, setCertificates] = React.useState<Certificate[]>([]);
  const [financialSettings, setFinancialSettings] = React.useState<FinancialSettings | null>(null);
  const handleDelete = async (item: FinancialCollection) => {
    const confirmed = confirm(`Excluir a cobrança ${item.number}? Esta ação a ocultará da lista e manterá o histórico.`);
    if (!confirmed) return;
    const now = new Date().toISOString();
    try {
      if (item.id.startsWith("legacy:")) {
        const [, clientId, billingId] = item.id.split(":");
        const client = data.aux.clients.find((entry: ContactLead) => entry.id === clientId);
        if (!client) throw new Error("Cliente da cobrança não encontrado.");
        const updatedBillings = (client.cobrancas || []).map((billing: any, index: number) =>
          String(billing.id || index) === billingId
            ? { ...billing, status: "cancelled", deletedAt: now, deletedBy: auth.currentUser?.uid || "", cancellationReason: "Exclusão solicitada pelo usuário.", updatedAt: now, updatedBy: auth.currentUser?.uid || "" }
            : billing,
        );
        await clientService.update(client.id, { cobrancas: updatedBillings });
        await data.reload();
        return;
      }
      await updateDoc(doc(db, "collections", item.id), {
        status: "cancelled",
        deletedAt: now,
        deletedBy: auth.currentUser?.uid || "",
        cancellationReason: "Exclusão solicitada pelo usuário.",
        updatedAt: now,
        updatedBy: auth.currentUser?.uid || "",
      });
      await data.reload();
    } catch (error) {
      console.error(error);
      try {
        await data.command(item.id, "delete", "Exclusão solicitada pelo usuário.");
      } finally {
        await data.reload();
      }
    }
  };

  React.useEffect(() => {
    Promise.all([
      companySettingsService.getAll(),
      certificateService.getAll(),
      financialSettingsService.get(),
    ])
      .then(([companyList, certList, settings]) => {
        setCompanies(companyList);
        setCertificates(certList);
        setFinancialSettings(settings);
      })
      .catch((error) => console.error("Não foi possível carregar dados oficiais de cobrança.", error));
  }, []);

  const items = data.items.filter((item) => (status === "all" || item.status === status) && (!search || JSON.stringify(item).toLowerCase().includes(search.toLowerCase())));

  if (data.loading) {
    return (
      <div className="grid min-h-[560px] place-items-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Recebimentos oficiais</p>
          <h1 className="mt-2 text-3xl font-bold">Cobranças</h1>
          <p className="text-sm text-slate-500">Envie a cobrança oficial ao órgão com contrato, nota fiscal, relatório e certidões vigentes.</p>
        </div>
        <button type="button" onClick={() => setBillingOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
          <Plus size={17} /> Nova cobrança
        </button>
      </header>

      {data.error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{data.error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <Metric icon={WalletCards} label="Total a receber" value={money(data.dashboard.receivable)} />
        <Metric icon={FileWarning} label="Cobranças vencidas" value={String(data.dashboard.overdueCount)} tone="text-rose-600" />
        <Metric icon={Clock3} label="A vencer" value={String(data.dashboard.upcomingCount)} />
        <Metric icon={CheckCircle2} label="Recebidas no mês" value={money(data.dashboard.receivedMonth)} tone="text-emerald-600" />
        <Metric icon={TrendingUp} label="Valor em atraso" value={money(data.dashboard.late)} tone="text-rose-600" />
        <Metric icon={CalendarDays} label="Prazo médio" value={`${data.dashboard.averageDays} dias`} />
        <Metric icon={Receipt} label="Inadimplência" value={`${data.dashboard.defaultRate.toFixed(1)}%`} />
        <Metric icon={FileWarning} label="Sem nota fiscal" value={String(data.dashboard.withoutInvoice)} />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar número, cliente, contrato ou descrição" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border bg-white px-3 text-sm">
          <option value="all">Todos os status</option>
          {statuses.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
        </select>
        <div className="flex rounded-xl border p-1">
          {([
            ["table", LayoutList],
            ["kanban", Kanban],
            ["calendar", CalendarDays],
          ] as const).map(([id, Icon]) => (
            <button key={id} onClick={() => setView(id)} className={`rounded-lg p-2 ${view === id ? "bg-blue-50 text-blue-600" : "text-slate-400"}`}>
              <Icon size={17} />
            </button>
          ))}
        </div>
      </section>

      {view === "table" ? <Table items={items} open={setDetail} edit={setEditing} remove={handleDelete} receive={setReceiving} /> : view === "kanban" ? <Board items={items} open={setDetail} /> : <Calendar items={items} open={setDetail} />}

      {billingOpen && (
        <OfficialBillingForm
          aux={data.aux}
          companies={companies}
          certificates={certificates}
          financialSettings={financialSettings}
          previewHtml={previewHtml}
          saving={data.saving}
          close={() => setBillingOpen(false)}
          saveCollection={data.save}
          reload={data.reload}
          setPreviewHtml={setPreviewHtml}
        />
      )}
      {editing && (
        <CollectionEditForm
          aux={data.aux}
          item={editing}
          saving={data.saving}
          close={() => setEditing(null)}
          saveCollection={data.save}
        />
      )}
      {detail && (
        <Detail
          item={detail}
          close={() => setDetail(null)}
          edit={() => { setEditing(detail); setDetail(null); }}
          remove={async () => { await handleDelete(detail); setDetail(null); }}
          receive={() => { setReceiving(detail); setDetail(null); }}
        />
      )}
      {receiving && <Receive item={receiving} accounts={data.aux.accounts} saving={data.saving} close={() => setReceiving(null)} save={async (amount, paymentDate, bank, reason) => { await data.receive(receiving.id, amount, paymentDate, bank, reason); setReceiving(null); }} />}
    </div>
  );
};

const OfficialBillingForm = ({
  aux,
  companies,
  certificates,
  financialSettings,
  previewHtml,
  saving,
  close,
  saveCollection,
  reload,
  setPreviewHtml,
}: {
  aux: any;
  companies: Company[];
  certificates: Certificate[];
  financialSettings: FinancialSettings | null;
  previewHtml: string | null;
  saving: boolean;
  close: () => void;
  saveCollection: (value: CollectionInput) => Promise<void>;
  reload: () => Promise<void>;
  setPreviewHtml: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const [form, setForm] = React.useState<BillingForm>(emptyBilling);
  const [clientId, setClientId] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const client = aux.clients.find((item: ContactLead) => item.id === clientId);
  const contracts = client?.contracts || [];
  const selectedCompany = companies.find((company) => company.razaoSocial === form.senderCompany || company.id === form.senderCompanyId);
  const selectedCertificates = certificates.filter((certificate) => form.selectedCertificates.includes(certificate.id));
  const validCertificates = certificates.filter((certificate) => {
    if (!form.senderCompany || (certificate as any).company !== form.senderCompany) return false;
    if (!certificate.expiryDate) return false;
    return certificate.expiryDate >= today();
  });
  const selectedContract = contracts.find((item: any) => String(item.id || item.title) === form.solutionSelect);

  const set = (key: keyof BillingForm, value: any) => setForm((current) => ({ ...current, [key]: value }));

  React.useEffect(() => {
    if (!selectedContract) return;
    const contractValue = Number(selectedContract.value || selectedContract.amount || selectedContract.total || 0);
    setForm((current) => ({
      ...current,
      value: contractValue ? String(contractValue) : current.value,
      title: current.title || `${selectedContract.title || selectedContract.number || "Contrato"} · ${client?.razaoSocial || client?.name || "Cliente"}`,
      dueDate: current.dueDate || selectedContract.endDate || current.dueDate,
      reportSubject: `Medição referente ao ${selectedContract.title || selectedContract.number || "contrato"}`,
    }));
  }, [selectedContract?.id]);

  const handleFile = async (file: File | undefined, key: "invoiceFile" | "reportFile") => {
    if (!file) return;
    const dataUrl = await readFile(file);
    set(key, dataUrl);
  };

  const exec = (command: string, value?: string) => {
    const editor = document.getElementById("collection-report-editor") as HTMLElement | null;
    editor?.focus();
    document.execCommand(command, false, value);
    const html = editor?.innerHTML || form.reportHtml;
    set("reportHtml", html);
  };

  const syncEditor = () => {
    const editor = document.getElementById("collection-report-editor") as HTMLElement | null;
    if (!editor) return;
    set("reportHtml", editor.innerHTML);
  };

  const reportPreviewHtml = React.useMemo(() => buildBillingReportHtml({
    company: selectedCompany,
    client,
    contract: selectedContract,
    form,
    selectedCertificates,
  }), [selectedCompany, client, selectedContract, form, selectedCertificates]);

  const openReportPreview = () => {
    setPreviewHtml(reportPreviewHtml);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) throw new Error("Selecione o órgão/cliente.");
    setSending(true);
    try {
      const amount = Number(form.value || 0);
      const certificateFiles = selectedCertificates
        .filter((certificate) => certificate.fileUrl)
        .map((certificate) => ({
          filename: `${(certificate.name || certificate.id).replace(/[^a-z0-9._-]/gi, "_")}.pdf`,
          fileUrl: certificate.fileUrl,
          name: certificate.name,
        }));
      const selectedCertificatesDetails = selectedCertificates.map((certificate) => ({
        name: certificate.name,
        issueDate: certificate.issueDate ? date(certificate.issueDate) : "",
        expiryDate: certificate.expiryDate ? date(certificate.expiryDate) : "",
      }));
      const contract = contracts.find((item: any) => item.title === form.solutionSelect || item.id === form.solutionSelect);
      const payload = {
        ...form,
        certificateFiles,
        selectedCertificatesDetails,
        clientEmail: client.email || client.financialContact || "",
        clientName: client.razaoSocial || client.name || "",
        clientDocument: client.cnpj || "",
        reportHtml: form.reportHtml,
        reportSubject: form.reportSubject,
        userId: auth.currentUser?.uid,
      };

      const sent = await clientService.sendBilling(client.id, payload);
      if (!sent) throw new Error("Falha ao enviar o e-mail de cobrança.");

      const billingId = String(Date.now());
      await saveCollection({
        number: `COB-${billingId}`,
        description: form.title || `Cobrança ${client.razaoSocial || client.name}`,
        organizationId: client.id,
        organizationName: client.razaoSocial || client.name || "Órgão público",
        contractId: contract?.id || "",
        contractName: contract?.title || form.solutionSelect || "",
        invoiceNumber: "",
        issueDate: today(),
        dueDate: form.dueDate,
        originalAmountCents: Math.round(amount * 100),
        discountCents: 0,
        interestCents: 0,
        fineCents: 0,
        paymentMethodId: "",
        paymentMethodName: "",
        bankAccountId: "",
        bankAccountName: form.bankAccount,
        responsibleId: auth.currentUser?.uid || "",
        responsibleName: auth.currentUser?.displayName || "",
                notes: form.emailText,
                attachmentUrls: uploadedAttachments,
                reportHtml: form.reportHtml,
                reportSubject: form.reportSubject,
                status: "sent",
                originType: "officialBilling",
                originId: client.id,
        protocol: "",
        financialDepartment: client.financialContact || client.email || "",
      });

      await reload();
      alert("Cobrança enviada com sucesso para o e-mail cadastrado do órgão.");
      close();
    } catch (error: any) {
      alert(error?.message || "Não foi possível enviar a cobrança.");
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <Drawer title="Nova cobrança oficial" close={close}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <Select label="Órgão / cliente" value={clientId} set={(value) => {
            setClientId(value);
            const selected = aux.clients.find((item: ContactLead) => item.id === value);
            setForm((current) => ({
              ...current,
              solutionSelect: "",
              clientEmail: selected?.email || selected?.financialContact || "",
              clientName: selected?.razaoSocial || selected?.name || "",
              clientDocument: selected?.cnpj || "",
            }));
          }} options={[["", "Selecione"], ...aux.clients.map((item: ContactLead) => [item.id, item.razaoSocial || item.name])]} />
          <Select label="Empresa emitente" value={form.senderCompany} set={(value) => {
            const company = companies.find((item) => item.razaoSocial === value || item.id === value);
            setForm((current) => ({ ...current, senderCompany: company?.razaoSocial || value, senderCompanyId: company?.id || "", selectedCertificates: [] }));
          }} options={[["", "Empresa emitente"], ...companies.map((company) => [company.razaoSocial, company.razaoSocial])]} />
          <Select
            label="Contrato salvo do cliente"
            value={form.solutionSelect}
            set={(value) => {
              const contract = contracts.find((item: any) => String(item.id || item.title) === value);
              const rawValue = contract?.valueCents ?? contract?.value ?? contract?.amount ?? contract?.valor ?? "";
              const normalizedValue = typeof rawValue === "number" ? String((rawValue > 100000 ? rawValue / 100 : rawValue).toFixed?.(2) ?? rawValue) : String(rawValue || "");
              setForm({
                ...form,
                solutionSelect: value,
                value: normalizedValue || form.value,
                title: `${contract?.title || contract?.number || "Contrato"} · ${client?.razaoSocial || client?.name || "Cliente"}`,
                dueDate: contract?.endDate || form.dueDate,
              });
            }}
            options={[["", "Selecione o contrato"], ...contracts.map((contract: any) => [String(contract.id || contract.title), contract.title || contract.number || "Contrato"])]}
          />
          <Input label="Título da cobrança" value={form.title} set={(value) => set("title", value)} />
          <Input label="Valor (R$)" type="number" value={form.value} set={(value) => set("value", value)} />
          <Input label="Vencimento" type="date" value={form.dueDate} set={(value) => set("dueDate", value)} />
          <Select label="Conta bancária" value={form.bankAccount} set={(value) => set("bankAccount", value)} options={[["", "Selecione a conta"], ...(financialSettings?.bankAccounts || []).map((account: any) => [account.name || `${account.bankName} - Ag ${account.agency} CC ${account.accountNumber}`, account.name || `${account.bankName} - Ag ${account.agency} CC ${account.accountNumber}`])]} />
          <Select label="Chave PIX" value={form.pixKey} set={(value) => set("pixKey", value)} options={[["", "Selecione a chave PIX"], ...(financialSettings?.pixKeys || []).map((pix: any) => [`${pix.type?.toUpperCase?.() || "PIX"}: ${pix.key}`, `${pix.type?.toUpperCase?.() || "PIX"}: ${pix.key}`])]} />

          <FileInput label="Anexar nota fiscal" onChange={(file) => handleFile(file, "invoiceFile")} selected={Boolean(form.invoiceFile)} />
          <FileInput label="Anexar relatório / medição" onChange={(file) => handleFile(file, "reportFile")} selected={Boolean(form.reportFile)} />
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Anexos extras
            <input
              type="file"
              multiple
              accept="application/pdf,image/*,.xml,.txt"
              onChange={async (event) => {
                const files = Array.from(event.target.files || []);
                if (!files.length) return;
                const urls = await Promise.all(files.map(async (file) => readFile(file)));
                set("attachmentUrls", [...form.attachmentUrls, ...urls]);
                event.target.value = "";
              }}
              className="mt-2 block w-full rounded-xl border p-3 text-sm font-normal"
            />
            {form.attachmentUrls.length > 0 && <span className="mt-1 block text-[10px] text-emerald-600">{form.attachmentUrls.length} arquivo(s) anexado(s)</span>}
          </label>

          <section className="sm:col-span-2">
            <p className="text-sm font-bold text-slate-700">Certidões vigentes da empresa {selectedCompany?.razaoSocial || ""}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!form.senderCompany ? (
                <p className="text-sm italic text-slate-400">Selecione uma empresa para filtrar as certidões.</p>
              ) : validCertificates.length === 0 ? (
                <p className="text-sm italic text-slate-400">Nenhuma certidão vigente encontrada para esta empresa.</p>
              ) : validCertificates.map((certificate) => {
                const active = form.selectedCertificates.includes(certificate.id);
                return (
                  <button key={certificate.id} type="button" onClick={() => set("selectedCertificates", active ? form.selectedCertificates.filter((id) => id !== certificate.id) : [...form.selectedCertificates, certificate.id])} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {active ? <CheckCircle2 size={16} /> : <span className="h-4 w-4 rounded-full border bg-white" />}
                    {certificate.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border bg-slate-50 p-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Editor profissional</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{form.reportSubject}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => exec("bold")} className="rounded-lg border bg-white p-2 text-slate-700" title="Negrito"><Bold size={15} /></button>
                <button type="button" onClick={() => exec("italic")} className="rounded-lg border bg-white p-2 text-slate-700" title="Itálico"><Italic size={15} /></button>
                <button type="button" onClick={() => exec("underline")} className="rounded-lg border bg-white p-2 text-slate-700" title="Sublinhado"><Underline size={15} /></button>
                <button type="button" onClick={() => exec("insertUnorderedList")} className="rounded-lg border bg-white p-2 text-slate-700" title="Lista"><List size={15} /></button>
                <button type="button" onClick={() => exec("insertOrderedList")} className="rounded-lg border bg-white p-2 text-slate-700" title="Lista numerada"><ListOrdered size={15} /></button>
                <button type="button" onClick={openReportPreview} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><Eye size={15} className="inline" /> Pré-visualizar PDF</button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-3">
                <input value={form.reportSubject} onChange={(event) => set("reportSubject", event.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium" placeholder="Título do relatório" />
                <div
                  id="collection-report-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncEditor}
                  dangerouslySetInnerHTML={{ __html: form.reportHtml }}
                  className="min-h-[220px] rounded-2xl border bg-white p-4 text-sm leading-7 text-slate-700 outline-none"
                />
                <label className="text-xs font-bold text-slate-600">Texto personalizado para o relatório
                  <textarea value={form.emailText} onChange={(event) => set("emailText", event.target.value)} rows={4} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" placeholder="Mensagem, contextualização ou observações que irão no documento." />
                </label>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Prévia timbrada</p>
                  <p className="mt-2 text-sm font-bold">{selectedCompany?.razaoSocial || "Empresa emitente"}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedCompany?.email || "Email da empresa"} · {selectedCompany?.telefoneCelular || selectedCompany?.telefoneFixo || "Telefone"}</p>
                  <p className="mt-4 text-xs text-slate-400">Cliente: <b className="text-slate-700">{client?.razaoSocial || client?.name || "—"}</b></p>
                  <p className="mt-1 text-xs text-slate-400">Contrato: <b className="text-slate-700">{selectedContract?.title || selectedContract?.number || "—"}</b></p>
                  <p className="mt-1 text-xs text-slate-400">Valor: <b className="text-slate-700">{money(Number(form.value || 0) * 100)}</b></p>
                </div>
                <div className="rounded-2xl border bg-slate-950 p-4 text-white">
                  <p className="text-[11px] font-black uppercase tracking-[.18em] text-blue-300">Resumo do arquivo</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{form.reportHtml.replace(/<[^>]*>/g, "").slice(0, 180) || "O conteúdo do relatório será mostrado aqui em versão resumida."}</p>
                </div>
              </div>
            </div>
          </section>

          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Texto do e-mail<textarea value={form.emailText} onChange={(event) => set("emailText", event.target.value)} rows={4} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" placeholder="Mensagem que será enviada ao e-mail cadastrado do órgão." /></label>

          <p className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-700 sm:col-span-2">
            Fluxo oficial: a cobrança será enviada para <b>{client?.email || client?.financialContact || "o e-mail cadastrado do órgão"}</b> com nota fiscal, relatório/medição e certidões selecionadas.
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t p-5">
          <button type="button" onClick={close} className="rounded-xl border px-4 py-2">Cancelar</button>
          <button type="button" onClick={async () => {
            if (!client) return;
            setSending(true);
            try {
              const amount = Number(form.value || 0);
              const uploadedAttachments = await uploadAttachments(form.attachmentUrls, `collections/${client.id}/${Date.now()}`);
              const contract = contracts.find((item: any) => String(item.id || item.title) === form.solutionSelect);
              await saveCollection({
                number: `COB-${Date.now()}`,
                description: form.title || `Cobrança ${client.razaoSocial || client.name}`,
                organizationId: client.id,
                organizationName: client.razaoSocial || client.name || "Órgão público",
                contractId: contract?.id || "",
                contractName: contract?.title || form.solutionSelect || "",
                invoiceNumber: "",
                issueDate: today(),
                dueDate: form.dueDate,
                originalAmountCents: Math.round(amount * 100),
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                paymentMethodId: "",
                paymentMethodName: "",
                bankAccountId: "",
                bankAccountName: form.bankAccount,
                responsibleId: auth.currentUser?.uid || "",
                responsibleName: auth.currentUser?.displayName || "",
                notes: form.emailText,
                attachmentUrls: uploadedAttachments,
                status: "draft",
                originType: "officialBilling",
                originId: client.id,
                protocol: "",
                financialDepartment: client.financialContact || client.email || "",
              });
              await reload();
              alert("Cobrança salva no financeiro.");
              close();
            } catch (error: any) {
              alert(error?.message || "Não foi possível salvar a cobrança.");
              console.error(error);
            } finally {
              setSending(false);
            }
          }} disabled={saving || sending || !clientId || !form.senderCompany || !form.title || !form.value} className="rounded-xl border border-blue-200 px-5 py-2 font-bold text-blue-700 disabled:opacity-50">
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />} Salvar no financeiro
          </button>
          <button onClick={async () => {
            if (!client) return;
            setSending(true);
            try {
              const amount = Number(form.value || 0);
              const uploadedAttachments = await uploadAttachments(form.attachmentUrls, `collections/${client.id}/${Date.now()}`);
              const certificateFiles = selectedCertificates
                .filter((certificate) => certificate.fileUrl)
                .map((certificate) => ({
                  filename: `${(certificate.name || certificate.id).replace(/[^a-z0-9._-]/gi, "_")}.pdf`,
                  fileUrl: certificate.fileUrl,
                  name: certificate.name,
                }));
              const selectedCertificatesDetails = selectedCertificates.map((certificate) => ({
                name: certificate.name,
                issueDate: certificate.issueDate ? date(certificate.issueDate) : "",
                expiryDate: certificate.expiryDate ? date(certificate.expiryDate) : "",
              }));
              const contract = contracts.find((item: any) => String(item.id || item.title) === form.solutionSelect);
              const payload = {
                ...form,
                attachmentUrls: uploadedAttachments,
                certificateFiles,
                selectedCertificatesDetails,
                userId: auth.currentUser?.uid,
              };
              const sent = await clientService.sendBilling(client.id, payload);
              if (!sent) throw new Error("Falha ao enviar o e-mail de cobrança.");
              const billingId = String(Date.now());
              await saveCollection({
                number: `COB-${billingId}`,
                description: form.title || `Cobrança ${client.razaoSocial || client.name}`,
                organizationId: client.id,
                organizationName: client.razaoSocial || client.name || "Órgão público",
                contractId: contract?.id || "",
                contractName: contract?.title || form.solutionSelect || "",
                invoiceNumber: "",
                issueDate: today(),
                dueDate: form.dueDate,
                originalAmountCents: Math.round(amount * 100),
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                paymentMethodId: "",
                paymentMethodName: "",
                bankAccountId: "",
                bankAccountName: form.bankAccount,
                responsibleId: auth.currentUser?.uid || "",
                responsibleName: auth.currentUser?.displayName || "",
                notes: form.emailText,
                attachmentUrls: uploadedAttachments,
                status: "sent",
                originType: "officialBilling",
                originId: client.id,
                protocol: "",
                financialDepartment: client.financialContact || client.email || "",
              });
              await reload();
              alert("Cobrança enviada com sucesso para o e-mail cadastrado do órgão.");
              close();
            } catch (error: any) {
              alert(error?.message || "Não foi possível enviar a cobrança.");
              console.error(error);
            } finally {
              setSending(false);
            }
          }} disabled={saving || sending || !clientId || !form.senderCompany || !form.title || !form.value} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white disabled:opacity-50">
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Enviar por e-mail
          </button>
        </footer>
      </form>
    </Drawer>
    {previewHtml && <ModalPreview html={previewHtml} close={() => setPreviewHtml(null)} />}
    </>
  );
};

const uploadAttachments = async (files: string[], pathBase: string) => {
  const urls: string[] = [];
  for (const [index, file] of files.entries()) {
    if (!file?.startsWith?.("data:")) {
      urls.push(file);
      continue;
    }
    const [header, data] = file.split(",");
    const mimeType = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
    const path = `${pathBase}/attachment-${index + 1}`;
    const uploaded = await storageService.uploadBase64(data || file, path, mimeType);
    if (uploaded) urls.push(uploaded);
  }
  return urls;
};

const Metric = ({ icon: Icon, label, value, tone = "" }: { icon: any; label: string; value: string; tone?: string }) => (
  <article className="rounded-2xl border bg-white p-4">
    <Icon size={17} className="text-slate-400" />
    <p className="mt-3 text-[11px] text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
  </article>
);

const Table = ({ items, open, edit, remove, receive }: { items: FinancialCollection[]; open: (item: FinancialCollection) => void; edit: (item: FinancialCollection) => void; remove: (item: FinancialCollection) => void; receive: (item: FinancialCollection) => void }) => (
  <div className="overflow-x-auto rounded-2xl border bg-white">
    <table className="w-full min-w-[1050px] text-left text-sm">
      <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
        <tr>{["Número", "Órgão/cliente", "Contrato", "Vencimento", "Valor", "Saldo", "Status", "Ações"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
      </thead>
      <tbody className="divide-y">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-4 py-4 font-bold">{item.number}</td>
            <td className="px-4 py-4">{item.organizationName}</td>
            <td className="px-4 py-4 text-slate-500">{item.contractName || "—"}</td>
            <td className="px-4 py-4">{date(item.dueDate)}</td>
            <td className="px-4 py-4 font-bold">{money(item.originalAmountCents)}</td>
            <td className="px-4 py-4">{money(item.balanceAmountCents)}</td>
            <td className="px-4 py-4"><Badge status={item.status} /></td>
            <td className="px-4 py-4">
              <div className="flex gap-2">
                <button onClick={() => open(item)} className="rounded-lg border px-3 py-2 text-xs font-bold">Detalhar</button>
                {item.status !== "received" && <button onClick={() => edit(item)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700">Editar</button>}
                {item.status !== "received" && <button onClick={() => remove(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">Excluir</button>}
                {item.balanceAmountCents > 0 && <button onClick={() => receive(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Receber</button>}
              </div>
            </td>
          </tr>
        ))}
        {!items.length && <tr><td colSpan={8} className="p-12 text-center text-slate-400">Nenhuma cobrança encontrada.</td></tr>}
      </tbody>
    </table>
  </div>
);

const Board = ({ items, open }: { items: FinancialCollection[]; open: (item: FinancialCollection) => void }) => (
  <div className="grid gap-3 xl:grid-cols-4">
    {statuses.slice(0, 8).map((status) => (
      <section key={status} className="rounded-2xl border bg-white p-3">
        <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">{labels[status]}</h3>
        <div className="space-y-2">
          {items.filter((item) => item.status === status).map((item) => (
            <button key={item.id} onClick={() => open(item)} className="w-full rounded-xl border p-3 text-left hover:bg-slate-50">
              <p className="text-sm font-bold">{item.description}</p>
              <p className="mt-1 text-xs text-slate-400">{item.organizationName} · {money(item.balanceAmountCents)}</p>
            </button>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const Calendar = ({ items, open }: { items: FinancialCollection[]; open: (item: FinancialCollection) => void }) => (
  <div className="rounded-2xl border bg-white p-5">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((item) => (
        <button key={item.id} onClick={() => open(item)} className="rounded-xl border p-4 text-left hover:bg-slate-50">
          <p className="text-xs font-bold text-blue-600">{date(item.dueDate)}</p>
          <p className="mt-1 font-bold">{item.description}</p>
          <p className="mt-1 text-xs text-slate-500">{item.organizationName} · {money(item.balanceAmountCents)}</p>
        </button>
      ))}
    </div>
  </div>
);

const Detail = ({ item, close, edit, remove, receive }: { item: FinancialCollection; close: () => void; edit: () => void; remove: () => void; receive: () => void }) => (
  <Drawer title={item.description} close={close}>
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Mini label="Valor original" value={money(item.originalAmountCents)} />
        <Mini label="Recebido" value={money(item.receivedAmountCents)} />
        <Mini label="Saldo" value={money(item.balanceAmountCents)} />
      </div>
      <section className="mt-5 rounded-2xl border p-5">
        <Badge status={item.status} />
        <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${item.status === "received" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          Situação do recebimento: {item.status === "received" ? "Recebida" : "Não recebida"}
        </p>
        <p className="mt-4 text-sm text-slate-600">Órgão/cliente: <b>{item.organizationName}</b></p>
        <p className="mt-2 text-sm text-slate-600">Contrato: <b>{item.contractName || "—"}</b></p>
        <p className="mt-2 text-sm text-slate-600">Vencimento: <b>{date(item.dueDate)}</b></p>
        {item.updatedAt && <p className="mt-2 text-sm text-slate-600">Última atualização: <b>{date(item.updatedAt)}</b></p>}
        <p className="mt-2 text-sm text-slate-600">Setor financeiro/e-mail: <b>{item.financialDepartment || "—"}</b></p>
        {item.notes && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{item.notes}</p>}
      </section>
    </div>
    <footer className="flex justify-end gap-2 border-t p-5">
      <button onClick={close} className="rounded-xl border px-4 py-2">Fechar</button>
      {item.status !== "received" && <button onClick={edit} className="rounded-xl border border-blue-200 px-4 py-2 font-bold text-blue-700">Editar</button>}
      {item.status !== "received" && <button onClick={remove} className="rounded-xl border border-rose-200 px-4 py-2 font-bold text-rose-600">Excluir</button>}
      {item.balanceAmountCents > 0 && <button onClick={receive} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Marcar recebida</button>}
    </footer>
  </Drawer>
);

const CollectionEditForm = ({
  aux,
  item,
  saving,
  close,
  saveCollection,
}: {
  aux: any;
  item: FinancialCollection;
  saving: boolean;
  close: () => void;
  saveCollection: (value: CollectionInput, id?: string) => Promise<void>;
}) => {
  const [form, setForm] = React.useState({
    number: item.number || "",
    description: item.description || "",
    organizationId: item.organizationId || "",
    organizationName: item.organizationName || "",
    contractId: item.contractId || "",
    contractName: item.contractName || "",
    commitmentId: item.commitmentId || "",
    serviceOrderId: item.serviceOrderId || "",
    supplyOrderId: item.supplyOrderId || "",
    measurementId: item.measurementId || "",
    invoiceId: item.invoiceId || "",
    invoiceNumber: item.invoiceNumber || "",
    projectId: item.projectId || "",
    projectName: item.projectName || "",
    costCenterId: item.costCenterId || "",
    costCenterName: item.costCenterName || "",
    issueDate: item.issueDate || today(),
    dueDate: item.dueDate || today(),
    originalAmountCents: item.originalAmountCents || 0,
    discountCents: item.discountCents || 0,
    interestCents: item.interestCents || 0,
    fineCents: item.fineCents || 0,
    paymentMethodId: item.paymentMethodId || "",
    paymentMethodName: item.paymentMethodName || "",
    bankAccountId: item.bankAccountId || "",
    bankAccountName: item.bankAccountName || "",
    responsibleId: item.responsibleId || "",
    responsibleName: item.responsibleName || "",
    notes: item.notes || "",
    attachmentUrls: item.attachmentUrls || [],
    status: item.status,
    originType: item.originType || "manual",
    originId: item.originId || "",
    commitmentStatus: item.commitmentStatus || "",
    liquidationDate: item.liquidationDate || "",
    bankOrder: item.bankOrder || "",
    contractInspector: item.contractInspector || "",
    contractManager: item.contractManager || "",
    financialDepartment: item.financialDepartment || "",
    protocol: item.protocol || "",
  });

  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const selectedContract = aux.contracts.find((contract: any) => contract.id === form.contractId);
  const selectedClient = aux.clients.find((client: any) => client.id === form.organizationId);
  const selectedProject = aux.projects.find((project: any) => project.id === form.projectId);
  const selectedCenter = aux.centers.find((center: any) => center.id === form.costCenterId);
  const selectedBank = aux.accounts.find((account: any) => account.id === form.bankAccountId);
  const selectedMethod = aux.paymentMethods.find((method: any) => method.id === form.paymentMethodId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveCollection({
      ...form,
      organizationName: selectedClient?.razaoSocial || selectedClient?.name || form.organizationName,
      contractName: selectedContract?.title || selectedContract?.number || form.contractName,
      projectName: selectedProject?.name || form.projectName,
      costCenterName: selectedCenter?.name || form.costCenterName,
      bankAccountName: selectedBank?.name || selectedBank?.institution || form.bankAccountName,
      paymentMethodName: selectedMethod?.name || form.paymentMethodName,
      originalAmountCents: Number(form.originalAmountCents || 0),
      discountCents: Number(form.discountCents || 0),
      interestCents: Number(form.interestCents || 0),
      fineCents: Number(form.fineCents || 0),
      attachmentUrls: Array.isArray(form.attachmentUrls) ? form.attachmentUrls : [],
    } as CollectionInput, item.id);
    close();
  };
  return (
    <Drawer title={`Editar cobrança · ${item.number}`} close={close}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <Input label="Número" value={form.number} set={(value) => set("number", value)} />
          <Select label="Status" value={form.status} set={(value) => set("status", value)} options={statuses.map((value) => [value, labels[value]])} />
          <Select label="Órgão / cliente" value={form.organizationId} set={(value) => { const client = aux.clients.find((item: any) => item.id === value); setForm({ ...form, organizationId: value, organizationName: client?.razaoSocial || client?.name || "" }); }} options={[["", "Selecione"], ...aux.clients.map((item: any) => [item.id, item.razaoSocial || item.name])]}/>
          <Select label="Contrato" value={form.contractId} set={(value) => { const contract = aux.contracts.find((item: any) => item.id === value); setForm({ ...form, contractId: value, contractName: contract?.title || contract?.number || "" }); }} options={[["", "Selecione"], ...aux.contracts.map((item: any) => [item.id, item.title || item.number])]}/>
          <Input label="Título / descrição" value={form.description} set={(value) => set("description", value)} />
          <Input label="Emissão" type="date" value={form.issueDate} set={(value) => set("issueDate", value)} />
          <Input label="Vencimento" type="date" value={form.dueDate} set={(value) => set("dueDate", value)} />
          <Input label="Valor original (centavos)" type="number" value={form.originalAmountCents} set={(value) => set("originalAmountCents", Number(value))} />
          <Input label="Desconto (centavos)" type="number" value={form.discountCents} set={(value) => set("discountCents", Number(value))} />
          <Input label="Juros (centavos)" type="number" value={form.interestCents} set={(value) => set("interestCents", Number(value))} />
          <Input label="Multa (centavos)" type="number" value={form.fineCents} set={(value) => set("fineCents", Number(value))} />
          <Select label="Projeto" value={form.projectId} set={(value) => { const project = aux.projects.find((item: any) => item.id === value); setForm({ ...form, projectId: value, projectName: project?.name || "" }); }} options={[["", "Nenhum"], ...aux.projects.map((item: any) => [item.id, item.name])]} />
          <Select label="Centro de custo" value={form.costCenterId} set={(value) => { const center = aux.centers.find((item: any) => item.id === value); setForm({ ...form, costCenterId: value, costCenterName: center?.name || "" }); }} options={[["", "Nenhum"], ...aux.centers.map((item: any) => [item.id, item.name])]} />
          <Select label="Conta bancária" value={form.bankAccountId} set={(value) => { const bank = aux.accounts.find((item: any) => item.id === value); setForm({ ...form, bankAccountId: value, bankAccountName: bank?.name || bank?.institution || "" }); }} options={[["", "Nenhuma"], ...aux.accounts.map((item: any) => [item.id, item.name || item.institution || item.bankName || "Conta bancária"])]} />
          <Select label="Forma de pagamento" value={form.paymentMethodId} set={(value) => { const method = aux.paymentMethods.find((item: any) => item.id === value); setForm({ ...form, paymentMethodId: value, paymentMethodName: method?.name || "" }); }} options={[["", "Nenhuma"], ...aux.paymentMethods.map((item: any) => [item.id, item.name || item.label || "Forma de pagamento"])]} />
          <Input label="Responsável" value={form.responsibleName} set={(value) => set("responsibleName", value)} />
          <Input label="Protocolo" value={form.protocol} set={(value) => set("protocol", value)} />
          <Input label="Medição" value={form.measurementId} set={(value) => set("measurementId", value)} />
          <Input label="Empenho" value={form.commitmentId} set={(value) => set("commitmentId", value)} />
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Observações<textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" /></label>
        </div>
        <footer className="flex justify-end gap-2 border-t p-5">
          <button type="button" onClick={close} className="rounded-xl border px-4 py-2">Cancelar</button>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white disabled:opacity-50">Salvar alterações</button>
        </footer>
      </form>
    </Drawer>
  );
};

const Receive = ({ item, accounts, saving, close, save }: { item: FinancialCollection; accounts: any[]; saving: boolean; close: () => void; save: (amount: number, date: string, bank: string, reason?: string) => Promise<void> }) => {
  const [amount, setAmount] = React.useState(item.balanceAmountCents);
  const [paymentDate, setPaymentDate] = React.useState(today());
  const [bank, setBank] = React.useState("");
  const [reason, setReason] = React.useState("");
  const activeAccounts = accounts
    .filter((account) => account.status !== "inactive" && account.status !== "blocked")
    .map((account) => {
      const name = account.name || account.institution || account.bankName || "Conta bancária";
      const details = [account.agency && `Ag ${account.agency}`, account.accountNumber && `CC ${account.accountNumber}`].filter(Boolean).join(" · ");
      return [account.id || name, details && !String(name).includes(details) ? `${name} · ${details}` : name];
    });
  return (
    <Drawer title="Registrar recebimento" close={close}>
      <form onSubmit={(event) => { event.preventDefault(); save(amount, paymentDate, bank, reason); }} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 p-6">
          <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">Saldo pendente: <b>{money(item.balanceAmountCents)}</b>.</p>
          <Input label="Valor recebido (centavos)" type="number" value={amount} set={(value) => setAmount(Number(value))} />
          <Input label="Data do recebimento" type="date" value={paymentDate} set={setPaymentDate} />
          <Select label="Conta bancária" value={bank} set={setBank} options={[["", activeAccounts.length ? "Selecione" : "Nenhuma conta cadastrada"], ...activeAccounts]} />
          {!activeAccounts.length && <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">Cadastre uma conta bancária em Financeiro › Contas Bancárias ou Dados financeiros para registrar o recebimento.</p>}
          {amount > item.balanceAmountCents && <Input label="Autorização para exceder saldo" value={reason} set={setReason} />}
        </div>
        <footer className="flex justify-end gap-2 border-t p-5">
          <button type="button" onClick={close} className="rounded-xl border px-4 py-2">Cancelar</button>
          <button disabled={saving || !bank || amount <= 0} className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white disabled:opacity-50">Confirmar</button>
        </footer>
      </form>
    </Drawer>
  );
};

const Drawer = ({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[220] flex justify-end bg-slate-950/60 backdrop-blur-md">
    <section className="relative z-[221] flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
      </header>
      {children}
    </section>
  </div>
);

const ModalPreview = ({ html, close }: { html: string; close: () => void }) => (
  <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
    <button aria-label="Fechar pré-visualização" onClick={close} className="absolute inset-0" />
    <section className="relative z-[241] flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Pré-visualização</p>
          <h2 className="mt-1 text-lg font-bold">PDF timbrado da cobrança</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => {
            const win = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
            if (!win) return;
            win.document.open();
            win.document.write(html);
            win.document.close();
          }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Abrir em nova aba</button>
          <button type="button" onClick={close} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Fechar</button>
        </div>
      </header>
      <iframe title="Prévia do PDF" srcDoc={html} className="h-full w-full bg-white" />
    </section>
  </div>
);

const Input = ({ label, value, set, type = "text" }: { label: string; value: any; set: (value: string) => void; type?: string }) => (
  <label className="text-xs font-bold text-slate-600">{label}<input required type={type} value={value ?? ""} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label>
);
const Select = ({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: any[] }) => (
  <label className="text-xs font-bold text-slate-600">{label}<select value={value || ""} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
);
const FileInput = ({ label, selected, onChange }: { label: string; selected: boolean; onChange: (file?: File) => void }) => (
  <label className="text-xs font-bold text-slate-600">{label}<input type="file" accept="application/pdf,image/*" onChange={(event) => onChange(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border p-3 text-sm font-normal" />{selected && <span className="mt-1 block text-[10px] text-emerald-600">Arquivo anexado</span>}</label>
);
const Badge = ({ status }: { status: CollectionStatus }) => <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === "received" ? "bg-emerald-50 text-emerald-700" : status === "overdue" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>{labels[status]}</span>;
const Mini = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
const readFile = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
