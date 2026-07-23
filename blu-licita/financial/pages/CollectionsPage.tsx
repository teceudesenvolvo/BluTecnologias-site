import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileWarning,
  Kanban,
  LayoutList,
  Loader2,
  Mail,
  Plus,
  Receipt,
  Search,
  Send,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { auth, certificateService, clientService, type Certificate, type Company, type ContactLead, type FinancialSettings } from "../../../services/firebase";
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
  solutionSelect: string;
  title: string;
  value: string;
  bankAccount: string;
  pixKey: string;
  invoiceFile: string;
  reportFile: string;
  selectedCertificates: string[];
  emailText: string;
  dueDate: string;
};

const emptyBilling = (): BillingForm => ({
  senderCompany: "",
  solutionSelect: "",
  title: "",
  value: "",
  bankAccount: "",
  pixKey: "",
  invoiceFile: "",
  reportFile: "",
  selectedCertificates: [],
  emailText: "",
  dueDate: today(),
});

export const CollectionsPage = () => {
  const data = useCollections();
  const [view, setView] = React.useState<"table" | "kanban" | "calendar">("table");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [billingOpen, setBillingOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<FinancialCollection | null>(null);
  const [receiving, setReceiving] = React.useState<FinancialCollection | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [certificates, setCertificates] = React.useState<Certificate[]>([]);
  const [financialSettings, setFinancialSettings] = React.useState<FinancialSettings | null>(null);

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
        <button onClick={() => setBillingOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
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

      {view === "table" ? <Table items={items} open={setDetail} receive={setReceiving} /> : view === "kanban" ? <Board items={items} open={setDetail} /> : <Calendar items={items} open={setDetail} />}

      {billingOpen && (
        <OfficialBillingForm
          aux={data.aux}
          companies={companies}
          certificates={certificates}
          financialSettings={financialSettings}
          saving={data.saving}
          close={() => setBillingOpen(false)}
          saveCollection={data.save}
          reload={data.reload}
        />
      )}
      {detail && <Detail item={detail} close={() => setDetail(null)} receive={() => { setReceiving(detail); setDetail(null); }} />}
      {receiving && <Receive item={receiving} accounts={data.aux.accounts} saving={data.saving} close={() => setReceiving(null)} save={async (amount, paymentDate, bank, reason) => { await data.receive(receiving.id, amount, paymentDate, bank, reason); setReceiving(null); }} />}
    </div>
  );
};

const OfficialBillingForm = ({
  aux,
  companies,
  certificates,
  financialSettings,
  saving,
  close,
  saveCollection,
  reload,
}: {
  aux: any;
  companies: Company[];
  certificates: Certificate[];
  financialSettings: FinancialSettings | null;
  saving: boolean;
  close: () => void;
  saveCollection: (value: CollectionInput) => Promise<void>;
  reload: () => Promise<void>;
}) => {
  const [form, setForm] = React.useState<BillingForm>(emptyBilling);
  const [clientId, setClientId] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const client = aux.clients.find((item: ContactLead) => item.id === clientId);
  const contracts = client?.contracts || [];
  const selectedCompany = companies.find((company) => company.razaoSocial === form.senderCompany);
  const selectedCertificates = certificates.filter((certificate) => form.selectedCertificates.includes(certificate.id));
  const validCertificates = certificates.filter((certificate) => {
    if (!form.senderCompany || (certificate as any).company !== form.senderCompany) return false;
    if (!certificate.expiryDate) return false;
    return certificate.expiryDate >= today();
  });

  const set = (key: keyof BillingForm, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const handleFile = async (file: File | undefined, key: "invoiceFile" | "reportFile") => {
    if (!file) return;
    const dataUrl = await readFile(file);
    set(key, dataUrl);
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
        userId: auth.currentUser?.uid,
      };

      const sent = await clientService.sendBilling(client.id, payload);
      if (!sent) throw new Error("Falha ao enviar o e-mail de cobrança.");

      const billingId = String(Date.now());
      const billingRecord = {
        id: billingId,
        date: new Date().toISOString(),
        ...form,
        status: "sent",
        userId: auth.currentUser?.uid,
      };
      await clientService.update(client.id, {
        cobrancas: [...(client.cobrancas || []), billingRecord],
      });

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
        attachmentUrls: [],
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
    <Drawer title="Nova cobrança oficial" close={close}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <Select label="Órgão / cliente" value={clientId} set={(value) => { setClientId(value); set("solutionSelect", ""); }} options={[["", "Selecione"], ...aux.clients.map((item: ContactLead) => [item.id, item.razaoSocial || item.name])]} />
          <Select label="Empresa emitente" value={form.senderCompany} set={(value) => setForm({ ...form, senderCompany: value, selectedCertificates: [] })} options={[["", "Empresa emitente"], ...companies.map((company) => [company.razaoSocial, company.razaoSocial])]} />
          <Select label="Contrato salvo do cliente" value={form.solutionSelect} set={(value) => set("solutionSelect", value)} options={[["", "Selecione o contrato"], ...contracts.map((contract: any) => [contract.title || contract.id, contract.title || contract.number || "Contrato"])]} />
          <Input label="Título da cobrança" value={form.title} set={(value) => set("title", value)} />
          <Input label="Valor (R$)" type="number" value={form.value} set={(value) => set("value", value)} />
          <Input label="Vencimento" type="date" value={form.dueDate} set={(value) => set("dueDate", value)} />
          <Select label="Conta bancária" value={form.bankAccount} set={(value) => set("bankAccount", value)} options={[["", "Selecione a conta"], ...(financialSettings?.bankAccounts || []).map((account: any) => [account.name || `${account.bankName} - Ag ${account.agency} CC ${account.accountNumber}`, account.name || `${account.bankName} - Ag ${account.agency} CC ${account.accountNumber}`])]} />
          <Select label="Chave PIX" value={form.pixKey} set={(value) => set("pixKey", value)} options={[["", "Selecione a chave PIX"], ...(financialSettings?.pixKeys || []).map((pix: any) => [`${pix.type?.toUpperCase?.() || "PIX"}: ${pix.key}`, `${pix.type?.toUpperCase?.() || "PIX"}: ${pix.key}`])]} />

          <FileInput label="Anexar nota fiscal" onChange={(file) => handleFile(file, "invoiceFile")} selected={Boolean(form.invoiceFile)} />
          <FileInput label="Anexar relatório / medição" onChange={(file) => handleFile(file, "reportFile")} selected={Boolean(form.reportFile)} />

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

          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Texto do e-mail<textarea value={form.emailText} onChange={(event) => set("emailText", event.target.value)} rows={4} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" placeholder="Mensagem que será enviada ao e-mail cadastrado do órgão." /></label>

          <p className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-700 sm:col-span-2">
            Fluxo oficial: a cobrança será enviada para <b>{client?.email || client?.financialContact || "o e-mail cadastrado do órgão"}</b> com nota fiscal, relatório/medição e certidões selecionadas.
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t p-5">
          <button type="button" onClick={close} className="rounded-xl border px-4 py-2">Cancelar</button>
          <button disabled={saving || sending || !clientId || !form.senderCompany || !form.title || !form.value} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white disabled:opacity-50">
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Enviar cobrança
          </button>
        </footer>
      </form>
    </Drawer>
  );
};

const Metric = ({ icon: Icon, label, value, tone = "" }: { icon: any; label: string; value: string; tone?: string }) => (
  <article className="rounded-2xl border bg-white p-4">
    <Icon size={17} className="text-slate-400" />
    <p className="mt-3 text-[11px] text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
  </article>
);

const Table = ({ items, open, receive }: { items: FinancialCollection[]; open: (item: FinancialCollection) => void; receive: (item: FinancialCollection) => void }) => (
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

const Detail = ({ item, close, receive }: { item: FinancialCollection; close: () => void; receive: () => void }) => (
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
      {item.balanceAmountCents > 0 && <button onClick={receive} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Marcar recebida</button>}
    </footer>
  </Drawer>
);

const Receive = ({ item, accounts, saving, close, save }: { item: FinancialCollection; accounts: any[]; saving: boolean; close: () => void; save: (amount: number, date: string, bank: string, reason?: string) => Promise<void> }) => {
  const [amount, setAmount] = React.useState(item.balanceAmountCents);
  const [paymentDate, setPaymentDate] = React.useState(today());
  const [bank, setBank] = React.useState("");
  const [reason, setReason] = React.useState("");
  return (
    <Drawer title="Registrar recebimento" close={close}>
      <form onSubmit={(event) => { event.preventDefault(); save(amount, paymentDate, bank, reason); }} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 p-6">
          <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">Saldo pendente: <b>{money(item.balanceAmountCents)}</b>.</p>
          <Input label="Valor recebido (centavos)" type="number" value={amount} set={(value) => setAmount(Number(value))} />
          <Input label="Data do recebimento" type="date" value={paymentDate} set={setPaymentDate} />
          <Select label="Conta bancária" value={bank} set={setBank} options={[["", "Selecione"], ...accounts.filter((item) => item.status === "active").map((item) => [item.id, item.name])]} />
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
  <div className="fixed inset-0 z-[150] flex justify-end bg-slate-950/55 backdrop-blur-sm">
    <section className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
      </header>
      {children}
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
