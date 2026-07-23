import React from "react";
import { CheckCircle2, Download, Edit2, File, FileText, Filter, Loader2, Search, Upload, X, XCircle } from "lucide-react";
import { documentDriveService, downloadDocumentsZip, type DriveDocument } from "../services/documentDriveService";
import { useBluAuth } from "../contexts/BluAuthContext";
import { auth, certificateService, storageService, type Company } from "../../services/firebase";
import { companySettingsService } from "../../services/firestoreSettingsService";
import { PlanLimitWarning, usePlanLimits } from "../hooks/usePlanLimits";

const today = () => new Date().toISOString().slice(0, 10);
const date = (value?: string) => (value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const normalize = (value?: string) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const documentType = (item: DriveDocument) => {
  const explicit = String((item as any).type || "").trim();
  if (explicit) return explicit;
  const name = normalize(item.name);
  if (name.includes("fgts")) return "CND FGTS";
  if (name.includes("federal")) return "CND Federal";
  if (name.includes("estadual")) return "CND Estadual";
  if (name.includes("municipal")) return "CND Municipal";
  if (name.includes("falencia")) return "Falência";
  if (name.includes("contrato")) return "Contrato";
  if (name.includes("proposta")) return "Proposta";
  if (name.includes("nota")) return "Nota Fiscal";
  return "Documento";
};

const statusOf = (item: DriveDocument) => {
  if (!item.expiryDate) return "valido";
  const diff = Math.ceil((new Date(`${item.expiryDate}T12:00:00`).getTime() - new Date(`${today()}T12:00:00`).getTime()) / 86400000);
  if (diff < 0) return "vencido";
  if (diff <= 7) return "vence-em-7-dias";
  return "valido";
};

const documentTypes = [
  "CND Federal",
  "CND Estadual",
  "CND Municipal",
  "CND FGTS",
  "CND Trabalhista",
  "CNPJ",
  "Contrato Social",
  "Alvará de Funcionamento",
  "Nota Fiscal",
  "Contrato",
  "Proposta",
  "Relatório",
  "Outros",
];

const readBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const safeFileName = (name: string) => name.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();

export const DocumentDrivePage: React.FC = () => {
  const { user } = useBluAuth();
  const [documents, setDocuments] = React.useState<DriveDocument[]>([]);
  const [legalEntities, setLegalEntities] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [zipping, setZipping] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState<DriveDocument | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState({
    search: "",
    company: "",
    status: "valido",
    type: "",
    from: "",
    to: "",
  });
  const plan = usePlanLimits();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await documentDriveService.listDocuments(user?.companyId));
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    companySettingsService.getAll().then(setLegalEntities).catch(() => setLegalEntities([]));
  }, []);

  const companies = React.useMemo(
    () => [...new Set(documents.map((item) => String((item as any).company || (item as any).companyName || "").trim()).filter(Boolean))].sort(),
    [documents],
  );
  const types = React.useMemo(() => [...new Set(documents.map(documentType))].sort(), [documents]);
  const filtered = documents.filter((item) => {
    const company = String((item as any).company || (item as any).companyName || "");
    const itemStatus = statusOf(item);
    const itemType = documentType(item);
    const expiry = item.expiryDate || "";
    return (
      (!filters.search || `${item.name} ${company} ${itemType}`.toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.company || company === filters.company) &&
      (filters.status === "all" || itemStatus === filters.status) &&
      (!filters.type || itemType === filters.type) &&
      (!filters.from || expiry >= filters.from) &&
      (!filters.to || expiry <= filters.to)
    );
  });
  const selectedDocuments = documents.filter((item) => selected.includes(item.id) && item.fileUrl);
  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id));

  const openNewDocumentForm = () => {
    if (!plan.allowed("documents", documents.length)) {
      alert(plan.message("documentos cadastrados", "documents"));
      return;
    }
    setEditingDocument(null);
    setFormOpen(true);
  };

  const openEditDocumentForm = (document: DriveDocument) => {
    setEditingDocument(document);
    setFormOpen(true);
  };

  const saveDocument = async (form: DocumentFormValues, editingId?: string) => {
    if (!editingId && !plan.allowed("documents", documents.length)) {
      alert(plan.message("documentos cadastrados", "documents"));
      return;
    }
    if (!form.file && !form.fileUrl) {
      alert("Selecione um arquivo PDF para enviar.");
      return;
    }
    setUploading(true);
    try {
      let fileUrl = form.fileUrl;
      let size = form.size || form.file?.size || 0;
      let mimeType = form.mimeType || form.file?.type || "application/pdf";
      let originalName = form.originalName || form.file?.name || "";

      if (form.file) {
        const dataUrl = await readBase64(form.file);
        const base64 = dataUrl.split(",")[1] || dataUrl;
        const path = `documents/${auth.currentUser?.uid}/${Date.now()}_${safeFileName(form.file.name)}`;
        const uploadedUrl = await storageService.uploadBase64(base64, path, mimeType);
        if (!uploadedUrl) throw new Error("O Firebase Storage recusou o envio. Verifique as regras de Storage e tente novamente.");
        fileUrl = uploadedUrl;
      }

      const payload = {
        name: form.name,
        type: form.type,
        company: form.company,
        legalEntityId: form.legalEntityId,
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        fileUrl,
        size,
        mimeType,
        originalName,
        userId: auth.currentUser?.uid,
      };
      const success = editingId
        ? await certificateService.update(editingId, payload as any)
        : await certificateService.create({ ...payload, createdAt: new Date().toISOString() } as any);
      if (!success) throw new Error("Não foi possível salvar o documento no Firestore.");
      await load();
      setFormOpen(false);
      setEditingDocument(null);
    } catch (error: any) {
      alert(error.message || "Não foi possível salvar o documento.");
    } finally {
      setUploading(false);
    }
  };

  const downloadSelectedZip = async () => {
    if (!selectedDocuments.length || zipping) return;
    setZipping(true);
    try {
      await downloadDocumentsZip(`documentos-selecionados-${today()}`, selectedDocuments);
    } catch (error: any) {
      alert(error?.message || "Não foi possível baixar o ZIP.");
    } finally {
      setZipping(false);
    }
  };

  const toggleAllVisible = () => {
    setSelected((current) => {
      const visibleIds = filtered.map((item) => item.id);
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return [...new Set([...current, ...visibleIds])];
    });
  };

  if (loading) {
    return (
      <div className="grid min-h-[500px] place-items-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Central de documentos</p>
            <h1 className="mt-2 text-3xl font-bold">Documentos</h1>
            <p className="mt-1 text-sm text-slate-500">Filtre certidões, contratos e arquivos por empresa, tipo, validade e período.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadSelectedZip}
              disabled={selectedDocuments.length === 0 || zipping}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold disabled:opacity-40"
            >
              {zipping ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
              {zipping ? "Gerando ZIP..." : `Baixar ZIP (${selectedDocuments.length})`}
            </button>
            <button onClick={openNewDocumentForm} disabled={!plan.allowed("documents", documents.length)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {uploading ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}
              Novo documento
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-400">Uso do plano: {documents.length}/{plan.label("documents")} documento(s)</p>
        {!plan.allowed("documents", documents.length) && (
          <div className="mt-3">
            <PlanLimitWarning>{plan.message("documentos cadastrados", "documents")} Você ainda pode editar e baixar os documentos existentes.</PlanLimitWarning>
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar por nome, empresa ou tipo" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <Select value={filters.company} set={(value) => setFilters({ ...filters, company: value })} options={[["", "Todas as empresas"], ...companies.map((item) => [item, item])]} />
          <Select value={filters.status} set={(value) => setFilters({ ...filters, status: value })} options={[["all", "Todas as situações"], ["valido", "Válidas"], ["vence-em-7-dias", "Vencem em 7 dias"], ["vencido", "Vencidas"]]} />
          <Select value={filters.type} set={(value) => setFilters({ ...filters, type: value })} options={[["", "Todos os tipos"], ...types.map((item) => [item, item])]} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Quick label="Válidas" active={filters.status === "valido"} onClick={() => setFilters({ ...filters, status: "valido" })} />
          <Quick label="Vencidas" active={filters.status === "vencido"} onClick={() => setFilters({ ...filters, status: "vencido" })} />
          <Quick label="Vencem em 7 dias" active={filters.status === "vence-em-7-dias"} onClick={() => setFilters({ ...filters, status: "vence-em-7-dias" })} />
          <Quick label="Limpar filtros" active={false} onClick={() => setFilters({ search: "", company: "", status: "valido", type: "", from: "", to: "" })} />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total" value={documents.length} />
        <Metric label="Válidos" value={documents.filter((item) => statusOf(item) === "valido").length} ok />
        <Metric label="Vencidos" value={documents.filter((item) => statusOf(item) === "vencido").length} danger />
        <Metric label="Vencem em 7 dias" value={documents.filter((item) => statusOf(item) === "vence-em-7-dias").length} warning />
        <Metric label="Selecionados" value={selected.length} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <button onClick={toggleAllVisible} className="flex items-center gap-2 text-sm font-bold text-blue-600">
            <span className={`grid h-5 w-5 place-items-center rounded border ${allVisibleSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{allVisibleSelected ? "✓" : ""}</span>
            Selecionar visíveis
          </button>
          <p className="text-xs text-slate-400"><Filter className="mr-1 inline" size={13} />{filtered.length} arquivo(s) encontrados</p>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((item) => {
            const checked = selected.includes(item.id);
            const status = statusOf(item);
            const company = String((item as any).company || (item as any).companyName || "Empresa não informada");
            return (
              <article key={item.id} className="grid gap-4 p-4 hover:bg-slate-50 md:grid-cols-[32px_1fr_190px_150px_150px_96px] md:items-center">
                <button onClick={() => setSelected((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`grid h-5 w-5 place-items-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>{checked ? "✓" : ""}</button>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">{item.mimeType?.includes("pdf") || item.name?.toLowerCase().endsWith(".pdf") ? <FileText size={19} /> : <File size={19} />}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{company}</p>
                  </div>
                </div>
                <span className="text-sm text-slate-600">{documentType(item)}</span>
                <span className="text-sm text-slate-600">{date(item.expiryDate)}</span>
                <Status status={status} />
                <div className="flex justify-end gap-1">
                  <button onClick={() => openEditDocumentForm(item)} title="Editar documento" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Edit2 size={17} /></button>
                  {item.fileUrl && <a href={item.fileUrl} download target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Download size={17} /></a>}
                </div>
              </article>
            );
          })}
          {!filtered.length && (
            <div className="grid place-items-center py-20 text-center">
              <FileText className="text-slate-200" size={52} />
              <p className="mt-4 font-semibold text-slate-500">Nenhum documento encontrado</p>
              <p className="mt-1 text-sm text-slate-400">Ajuste os filtros ou envie novos arquivos.</p>
            </div>
          )}
        </div>
      </section>

      {formOpen && <DocumentForm document={editingDocument} companies={legalEntities} saving={uploading} close={() => { setFormOpen(false); setEditingDocument(null); }} submit={saveDocument} />}
    </div>
  );
};

type DocumentFormValues = {
  name: string;
  type: string;
  company: string;
  legalEntityId: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  size: number;
  mimeType: string;
  originalName: string;
  file: File | null;
};

const emptyDocumentForm = (document?: DriveDocument | null): DocumentFormValues => ({
  name: document?.name || "",
  type: String((document as any)?.type || ""),
  company: String((document as any)?.company || (document as any)?.companyName || ""),
  legalEntityId: String((document as any)?.legalEntityId || ""),
  issueDate: today(),
  ...(document ? { issueDate: document.issueDate || today() } : {}),
  expiryDate: document?.expiryDate || "",
  fileUrl: document?.fileUrl || "",
  size: document?.size || 0,
  mimeType: document?.mimeType || "application/pdf",
  originalName: document?.originalName || document?.name || "",
  file: null,
});

const DocumentForm = ({ document, companies, saving, close, submit }: { document: DriveDocument | null; companies: Company[]; saving: boolean; close: () => void; submit: (form: DocumentFormValues, editingId?: string) => Promise<void> }) => {
  const [form, setForm] = React.useState<DocumentFormValues>(() => emptyDocumentForm(document));
  const [fileName, setFileName] = React.useState("");
  const isEditing = Boolean(document?.id);
  const selectedType = normalize(form.type);
  const requiresExpiry = selectedType.includes("cnd") || selectedType.includes("certidao") || selectedType.includes("alvara");

  const selectCompany = (value: string) => {
    const company = companies.find((item) => item.id === value);
    setForm({
      ...form,
      legalEntityId: value,
      company: company?.razaoSocial || company?.nomeFantasia || "",
    });
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit(form, document?.id);
  };

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Documentos</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{isEditing ? "Editar documento" : "Novo documento"}</h2>
          </div>
          <button onClick={close} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={22} /></button>
        </div>

        <form onSubmit={send} className="max-h-[calc(100vh-120px)] overflow-y-auto p-5">
          <div className="grid gap-4">
            <Field label="Nome do documento" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Ex: CND Municipal Lavoro" />

            <label className="text-sm font-bold text-slate-700">
              Tipo de documento
              <input
                list="blu-document-types"
                required
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                placeholder="Selecione ou digite..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500"
              />
              <datalist id="blu-document-types">
                {documentTypes.map((type) => <option key={type} value={type} />)}
              </datalist>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Empresa
              {companies.length ? (
                <select required={!form.company} value={form.legalEntityId} onChange={(event) => selectCompany(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500">
                  <option value="">{form.company ? `Manter: ${form.company}` : "Selecione a empresa"}</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.razaoSocial || company.nomeFantasia}</option>)}
                </select>
              ) : (
                <input required value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Razão social da empresa" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
              )}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data de emissão" required type="date" value={form.issueDate} onChange={(value) => setForm({ ...form, issueDate: value })} />
              <Field label="Data de vencimento" required={requiresExpiry} type="date" value={form.expiryDate} onChange={(value) => setForm({ ...form, expiryDate: value })} />
            </div>

            <label className="text-sm font-bold text-slate-700">
              Arquivo PDF
              <div className="relative mt-2 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:bg-blue-50">
                <input
                  type="file"
                  accept="application/pdf"
                  required={!isEditing && !form.fileUrl}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setFileName(file?.name || "");
                    setForm({ ...form, file });
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <Upload className="text-blue-600" size={26} />
                <span className="mt-2 text-sm font-semibold text-slate-600">{fileName || (form.fileUrl ? "Arquivo atual mantido — clique para trocar o PDF" : "Clique para anexar o PDF")}</span>
                <span className="mt-1 text-xs font-normal text-slate-400">{isEditing ? "Se não escolher outro arquivo, o PDF atual será preservado." : "O arquivo será salvo no Firebase Storage."}</span>
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">
              {saving && <Loader2 className="animate-spin" size={17} />}
              {saving ? "Salvando..." : "Salvar documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) => (
  <label className="text-sm font-bold text-slate-700">
    {label}
    <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
  </label>
);

const Select = ({ value, set, options }: { value: string; set: (value: string) => void; options: string[][] }) => (
  <select value={value} onChange={(event) => set(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
    {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
  </select>
);

const Quick = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{label}</button>
);

const Metric = ({ label, value, ok, danger, warning }: { label: string; value: number; ok?: boolean; danger?: boolean; warning?: boolean }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${ok ? "text-emerald-600" : danger ? "text-rose-600" : warning ? "text-amber-600" : ""}`}>{value}</p>
  </article>
);

const Status = ({ status }: { status: string }) => {
  if (status === "valido") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} />Válido</span>;
  if (status === "vence-em-7-dias") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><XCircle size={13} />Vence em 7 dias</span>;
  if (status === "vencido") return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"><XCircle size={13} />Vencido</span>;
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Sem vencimento</span>;
};
