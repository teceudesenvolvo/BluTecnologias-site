import React from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Download, FileUp, Loader2, Package2, Plus, RotateCcw, Save, Search, Trash2, Warehouse, X } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, deleteCompanyDoc, listCompanyDocs, updateCompanyDoc } from "../services/firestoreCompany";
import { db, functions, storageService, type Company } from "../../services/firebase";

type Product = {
  id: string;
  type: "product" | "service";
  name: string;
  barcode?: string;
  sku?: string;
  category: string;
  unit: string;
  salePriceCents: number;
  costCents: number;
  taxPercent: number;
  taxRegime?: string;
  taxCode?: string;
  serviceCode?: string;
  ncm?: string;
  cfop?: string;
  issPercent?: number;
  icmsPercent?: number;
  pisPercent?: number;
  cofinsPercent?: number;
  notes?: string;
  description?: string;
  features?: string[];
  sizes?: string[];
  colors?: string[];
  numbers?: string[];
  relatedProductIds?: string[];
  active: boolean;
  stockQuantity?: number;
  minStock?: number;
  stockLocation?: string;
  stockNotes?: string;
  lastStockUpdateAt?: string;
  images?: string[];
  publicationStatus?: "draft" | "published";
};

type ProductFormValue = Omit<Product, "id">;
type PageTab = "catalog" | "stock";
type StockStatusFilter = "all" | "healthy" | "low" | "empty";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const defaultForm = (): ProductFormValue => ({
  type: "product",
  name: "",
  barcode: "",
  sku: "",
  category: "",
  unit: "un",
  salePriceCents: 0,
  costCents: 0,
  taxPercent: 0,
  taxRegime: "",
  taxCode: "",
  serviceCode: "",
  ncm: "",
  cfop: "",
  issPercent: 0,
  icmsPercent: 0,
  pisPercent: 0,
  cofinsPercent: 0,
  notes: "",
  description: "",
  features: [],
  sizes: [],
  colors: [],
  numbers: [],
  relatedProductIds: [],
  active: false,
  publicationStatus: "draft",
  stockQuantity: 0,
  minStock: 0,
  stockLocation: "",
  stockNotes: "",
  lastStockUpdateAt: "",
  images: [],
});

const MAX_PRODUCT_IMAGES = 3;
const MAX_PRODUCT_IMAGE_SIZE = 2 * 1024 * 1024;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ProductsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = React.useState<Product[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<PageTab>(() => searchParams.get("aba") === "estoque" ? "stock" : "catalog");
  const [editingItem, setEditingItem] = React.useState<Product | null>(null);
  const [stockItem, setStockItem] = React.useState<Product | null>(null);
  const [savingStock, setSavingStock] = React.useState(false);
  const [stockStatusFilter, setStockStatusFilter] = React.useState<StockStatusFilter>("all");
  const [stockCategoryFilter, setStockCategoryFilter] = React.useState("all");
  const [stockLocationFilter, setStockLocationFilter] = React.useState("all");
  const [stockActiveFilter, setStockActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [stockMinQuantityFilter, setStockMinQuantityFilter] = React.useState("");
  const [stockMaxQuantityFilter, setStockMaxQuantityFilter] = React.useState("");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const records = await listCompanyDocs<Product>("products", user.companyId);
      setItems(records.filter((item) => (item.type || "product") === "product"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const loadCompany = async () => {
      if (!user?.companyId) return;
      const snapshot = await getDoc(doc(db, "companies", user.companyId)).catch(() => null);
      if (snapshot?.exists()) {
        setCompany({ id: snapshot.id, ...(snapshot.data() as Omit<Company, "id">) });
      }
    };
    void loadCompany();
  }, [user?.companyId]);

  const normalizedQuery = query.trim().toLowerCase();
  const numericQuery = query.replace(/\D/g, "");
  const visible = items.filter((item) => {
    const textualMatch = `${item.type} ${item.name} ${item.barcode || ""} ${item.sku || ""} ${item.category}`.toLowerCase().includes(normalizedQuery);
    const barcodeMatch = Boolean(numericQuery && String(item.barcode || "").replace(/\D/g, "").includes(numericQuery));
    return textualMatch || barcodeMatch;
  });

  const stockProducts = visible.filter((item) => (item.type || "product") === "product");
  const stockCategories = React.useMemo(
    () => Array.from(new Set(stockProducts.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [stockProducts],
  );
  const stockLocations = React.useMemo(
    () => Array.from(new Set(stockProducts.map((item) => item.stockLocation).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [stockProducts],
  );
  const filteredStockProducts = React.useMemo(() => {
    const minQuantity = stockMinQuantityFilter === "" ? null : Number(stockMinQuantityFilter);
    const maxQuantity = stockMaxQuantityFilter === "" ? null : Number(stockMaxQuantityFilter);
    return stockProducts.filter((item) => {
      const quantity = item.stockQuantity || 0;
      const minimum = item.minStock || 0;
      const low = quantity <= minimum;
      const empty = quantity <= 0;
      if (stockStatusFilter === "healthy" && low) return false;
      if (stockStatusFilter === "low" && !low) return false;
      if (stockStatusFilter === "empty" && !empty) return false;
      if (stockCategoryFilter !== "all" && item.category !== stockCategoryFilter) return false;
      if (stockLocationFilter !== "all" && (item.stockLocation || "") !== stockLocationFilter) return false;
      if (stockActiveFilter === "active" && !item.active) return false;
      if (stockActiveFilter === "inactive" && item.active) return false;
      if (minQuantity !== null && quantity < minQuantity) return false;
      if (maxQuantity !== null && quantity > maxQuantity) return false;
      return true;
    });
  }, [stockProducts, stockStatusFilter, stockCategoryFilter, stockLocationFilter, stockActiveFilter, stockMinQuantityFilter, stockMaxQuantityFilter]);
  const lowStockItems = filteredStockProducts.filter((item) => (item.stockQuantity || 0) <= (item.minStock || 0));
  const totalStockUnits = filteredStockProducts.reduce((sum, item) => sum + (item.stockQuantity || 0), 0);
  const stockValueCents = filteredStockProducts.reduce((sum, item) => sum + (item.stockQuantity || 0) * (item.costCents || 0), 0);

  const resetStockFilters = () => {
    setStockStatusFilter("all");
    setStockCategoryFilter("all");
    setStockLocationFilter("all");
    setStockActiveFilter("all");
    setStockMinQuantityFilter("");
    setStockMaxQuantityFilter("");
  };

  const buildStockRows = () =>
    filteredStockProducts.map((item) => {
      const quantity = item.stockQuantity || 0;
      const minimum = item.minStock || 0;
      const low = quantity <= minimum;
      return {
        produto: item.name,
        sku: item.sku || "",
        categoria: item.category || "",
        unidade: item.unit || "",
        ativo: item.active ? "Sim" : "Não",
        saldo: String(quantity),
        estoque_minimo: String(minimum),
        status_estoque: quantity <= 0 ? "Sem estoque" : low ? "Abaixo do mínimo" : "Saudável",
        localizacao: item.stockLocation || "",
        custo_unitario: (item.costCents / 100).toFixed(2).replace(".", ","),
        valor_total_estoque: (((item.costCents || 0) * quantity) / 100).toFixed(2).replace(".", ","),
        ultima_atualizacao: item.lastStockUpdateAt ? new Date(item.lastStockUpdateAt).toLocaleString("pt-BR") : "",
        observacoes: item.stockNotes || "",
      };
    });

  const exportStockCsv = () => {
    const rows = buildStockRows();
    const header = Object.keys(rows[0] || {
      produto: "",
      sku: "",
      categoria: "",
      unidade: "",
      ativo: "",
      saldo: "",
      estoque_minimo: "",
      status_estoque: "",
      localizacao: "",
      custo_unitario: "",
      valor_total_estoque: "",
      ultima_atualizacao: "",
      observacoes: "",
    });
    const csv = [
      header.join(";"),
      ...rows.map((row) =>
        header
          .map((key) => `"${String((row as Record<string, string>)[key] || "").replace(/"/g, '""')}"`)
          .join(";"),
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `estoque-blu-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportStockXls = () => {
    const rows = buildStockRows();
    const header = Object.keys(rows[0] || {
      produto: "",
      sku: "",
      categoria: "",
      unidade: "",
      ativo: "",
      saldo: "",
      estoque_minimo: "",
      status_estoque: "",
      localizacao: "",
      custo_unitario: "",
      valor_total_estoque: "",
      ultima_atualizacao: "",
      observacoes: "",
    });
    const xls = [
      header.join("\t"),
      ...rows.map((row) => header.map((key) => String((row as Record<string, string>)[key] || "")).join("\t")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${xls}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    downloadBlob(blob, `estoque-blu-${new Date().toISOString().slice(0, 10)}.xls`);
  };

  const exportStock = (format: "csv" | "xls" | "pdf") => {
    if (format === "pdf") {
      exportStockPdf();
      return;
    }
    if (format === "xls") {
      exportStockXls();
      return;
    }
    exportStockCsv();
  };

  const exportStockPdf = () => {
    const companyName = company?.razaoSocial || company?.nomeFantasia || user?.companyName || "Minha empresa";
    const companyContact = [company?.email, company?.telefoneCelular || company?.telefoneFixo].filter(Boolean).join(" • ");
    const companyAddress = [
      [company?.logradouro, company?.numero].filter(Boolean).join(", "),
      company?.bairro,
      [company?.municipio, company?.uf].filter(Boolean).join(" / "),
      company?.cep,
    ]
      .filter(Boolean)
      .join(" • ");
    const printedAt = new Date().toLocaleString("pt-BR");
    const rowsHtml = filteredStockProducts
      .map((item) => {
        const quantity = item.stockQuantity || 0;
        const minimum = item.minStock || 0;
        const totalValue = (item.costCents || 0) * quantity;
        const status = quantity <= 0 ? "Sem estoque" : quantity <= minimum ? "Abaixo do mínimo" : "Saudável";
        return `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.sku || "—")}</td>
            <td>${escapeHtml(item.category || "—")}</td>
            <td>${escapeHtml(item.stockLocation || "—")}</td>
            <td class="right">${quantity}</td>
            <td class="right">${minimum}</td>
            <td>${status}</td>
            <td class="right">${money(item.costCents || 0)}</td>
            <td class="right">${money(totalValue)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Relatório de estoque</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 20mm 16mm; }
      .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; }
      .brand { display: flex; gap: 14px; align-items: flex-start; }
      .brand img { width: 72px; height: 72px; object-fit: contain; border-radius: 18px; border: 1px solid #e2e8f0; padding: 6px; background: #fff; }
      .eyebrow { margin: 0 0 6px; color: #2563eb; font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
      h1 { margin: 0; font-size: 28px; line-height: 1.1; }
      .company-line { margin-top: 6px; color: #475569; font-size: 12px; line-height: 1.5; }
      .meta-box { min-width: 180px; padding: 12px 14px; border: 1px solid #dbeafe; border-radius: 18px; background: #f8fbff; }
      .meta-label { display: block; color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
      .meta-value { display: block; margin-top: 8px; font-size: 14px; font-weight: 700; }
      .meta-line { margin-top: 6px; color: #64748b; font-size: 11px; line-height: 1.4; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 20px; }
      .summary-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; background: #f8fafc; }
      .summary-card span { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
      .summary-card strong { display: block; margin-top: 8px; font-size: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #eff6ff; color: #334155; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; text-align: left; padding: 10px 8px; }
      td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; font-size: 12px; vertical-align: top; }
      .right { text-align: right; }
      .empty { margin-top: 20px; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 32px 20px; text-align: center; color: #64748b; }
      .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px; }
      @media print {
        body { background: #fff; }
        .page { width: auto; min-height: auto; margin: 0; padding: 16mm 14mm; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <div class="brand">
          ${company?.logoUrl ? `<img src="${escapeHtml(company.logoUrl)}" alt="Logomarca da empresa" />` : ""}
          <div>
            <p class="eyebrow">Gestão de estoque</p>
            <h1>Relatório de estoque</h1>
            <div class="company-line">${escapeHtml(companyName)}</div>
            ${companyContact ? `<div class="company-line">${escapeHtml(companyContact)}</div>` : ""}
            ${companyAddress ? `<div class="company-line">${escapeHtml(companyAddress)}</div>` : ""}
          </div>
        </div>
        <div class="meta-box">
          <span class="meta-label">Emitido em</span>
          <span class="meta-value">${escapeHtml(printedAt)}</span>
          <div class="meta-line">Exportação baseada nos filtros ativos da tela de estoque.</div>
        </div>
      </header>
      <section class="summary-grid">
        <div class="summary-card"><span>Produtos filtrados</span><strong>${filteredStockProducts.length}</strong></div>
        <div class="summary-card"><span>Unidades totais</span><strong>${totalStockUnits}</strong></div>
        <div class="summary-card"><span>Valor em estoque</span><strong>${money(stockValueCents)}</strong></div>
        <div class="summary-card"><span>Abaixo do mínimo</span><strong>${lowStockItems.length}</strong></div>
      </section>
      ${
        filteredStockProducts.length
          ? `<table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Categoria</th>
                  <th>Localização</th>
                  <th>Saldo</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th>Custo unitário</th>
                  <th>Valor total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>`
          : `<div class="empty">Nenhum item encontrado para os filtros atuais.</div>`
      }
      <footer class="footer">Sistema de Gestão Blu Tecnologias</footer>
    </main>
  </body>
</html>`;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
    if (!popup) {
      alert("Não foi possível abrir a visualização do PDF.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 450);
  };

  const saveItem = async (value: ProductFormValue) => {
    if (!user) return;
    const barcode = String(value.barcode || "").replace(/\D/g, "");
    if (barcode && items.some((item) => item.id !== editingItem?.id && String(item.barcode || "").replace(/\D/g, "") === barcode)) {
      alert("Já existe um produto cadastrado com este código de barras.");
      return;
    }
    const imageUrls: string[] = [];
    for (const image of value.images || []) {
      if (image.startsWith("data:")) {
        const [meta, data] = image.split(",");
        const mimeType = meta.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
        const extension = mimeType.split("/")[1] || "jpg";
        const uploaded = await storageService.uploadBase64(
          data,
          `products/${user.companyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`,
          mimeType,
        );
        if (!uploaded) throw new Error("Não foi possível salvar uma das imagens no Storage. Verifique sua conexão e tente novamente.");
        imageUrls.push(uploaded);
      } else if (image) {
        imageUrls.push(image);
      }
    }
    value = { ...value, barcode, images: imageUrls.slice(0, MAX_PRODUCT_IMAGES) };
    if (editingItem) {
      await updateCompanyDoc("products", editingItem.id, user.id, value);
    } else {
      await createCompanyDoc("products", user.companyId, user.id, value);
    }
    setOpen(false);
    setEditingItem(null);
    await load();
  };

  const importProducts = async (products: ProductFormValue[]) => {
    if (!user) return { created: 0, updated: 0 };
    let created = 0;
    let updated = 0;
    const current = [...items];
    for (const incoming of products) {
      const barcode = String(incoming.barcode || "").replace(/\D/g, "");
      const sku = String(incoming.sku || "").trim().toLowerCase();
      const existing = current.find((item) =>
        (barcode && String(item.barcode || "").replace(/\D/g, "") === barcode) ||
        (sku && String(item.sku || "").trim().toLowerCase() === sku),
      );
      const payload = { ...incoming, barcode, lastStockUpdateAt: incoming.lastStockUpdateAt || new Date().toISOString() };
      if (existing) {
        const merged = Object.fromEntries(
          Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined && value !== null),
        );
        await updateCompanyDoc("products", existing.id, user.id, merged);
        Object.assign(existing, merged);
        updated += 1;
      } else {
        const reference = await createCompanyDoc("products", user.companyId, user.id, payload);
        current.push({ id: reference.id, ...payload });
        created += 1;
      }
    }
    await load();
    return { created, updated };
  };

  const removeItem = async (item: Product) => {
    if (!confirm(`Excluir ${item.name} do catálogo?`)) return;
    await deleteCompanyDoc("products", item.id);
    await load();
  };

  const saveStock = async (payload: { stockQuantity: number; minStock: number; stockLocation: string; stockNotes: string }) => {
    if (!user || !stockItem) return;
    setSavingStock(true);
    try {
      await updateCompanyDoc("products", stockItem.id, user.id, {
        stockQuantity: payload.stockQuantity,
        minStock: payload.minStock,
        stockLocation: payload.stockLocation,
        stockNotes: payload.stockNotes,
        lastStockUpdateAt: new Date().toISOString(),
      });
      setStockItem(null);
      await load();
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Catálogo comercial</p>
          <h1 className="mt-2 text-3xl font-bold">Produtos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo físico, variações, conteúdo comercial e controle de estoque.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700">
            <FileUp size={17} /> Importar lote
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Novo produto
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Itens ativos" value={String(items.filter((item) => item.active).length)} />
        <Metric label="Produtos" value={String(items.filter((item) => (item.type || "product") === "product").length)} />
        <Metric label="Com imagens" value={String(items.filter((item) => item.images?.length).length)} />
        <Metric
          label="Margem média"
          value={`${Math.round(items.reduce((sum, item) => sum + (item.salePriceCents ? ((item.salePriceCents - item.costCents) / item.salePriceCents) * 100 : 0), 0) / Math.max(1, items.length))}%`}
        />
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border bg-white p-2">
        <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")} icon={<Package2 size={16} />}>
          Catálogo
        </TabButton>
        <TabButton active={tab === "stock"} onClick={() => setTab("stock")} icon={<Warehouse size={16} />}>
          Estoque
        </TabButton>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "catalog" ? "Buscar por nome, código de barras, SKU ou categoria" : "Buscar por nome, código de barras, SKU ou categoria"}
            className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"
          />
        </label>
      </section>

      {tab === "catalog" ? (
        <section className="overflow-x-auto rounded-2xl border bg-white">
          {loading ? (
            <div className="grid h-72 place-items-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
                <tr>
                  {["Item", "Tipo", "Categoria", "Unidade", "Preço venda", "Custo", "Tributação", "Margem", ""].map((item) => (
                    <th key={item} className="px-4 py-3">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                          {item.images?.[0] ? <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" /> : <Package2 size={18} className="text-slate-400" />}
                        </div>
                        <div>
                          <b>{item.name}</b>
                          <small className="block text-slate-400">
                            {item.sku || item.barcode || "Sem código"} · {item.active ? "Ativo" : "Inativo"}
                            {item.images?.length ? ` · ${item.images.length} imagem(ns)` : ""}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="px-4">{item.type === "service" ? "Serviço" : "Produto"}</td>
                    <td className="px-4">{item.category || "—"}</td>
                    <td className="px-4">{item.unit}</td>
                    <td className="px-4 font-bold">{money(item.salePriceCents)}</td>
                    <td className="px-4">{money(item.costCents)}</td>
                    <td className="px-4">
                      {item.taxPercent}%
                      <small className="block text-slate-400">
                        {item.type === "service" ? item.serviceCode || "Sem código serviço" : item.ncm || "Sem NCM"}
                      </small>
                    </td>
                    <td className="px-4 font-bold text-emerald-600">
                      {item.salePriceCents ? Math.round(((item.salePriceCents - item.costCents) / item.salePriceCents) * 100) : 0}%
                    </td>
                    <td className="px-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setOpen(true);
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        <button onClick={() => removeItem(item)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      Nenhum item cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Metric label="Produtos com estoque" value={String(filteredStockProducts.length)} />
            <Metric label="Unidades totais" value={String(totalStockUnits)} />
            <Metric label="Valor em estoque" value={money(stockValueCents)} />
            <Metric label="Abaixo do mínimo" value={String(lowStockItems.length)} />
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Filtros do estoque</p>
                  <p className="text-xs text-slate-500">Use os filtros para analisar e exportar exatamente a visão desejada.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={resetStockFilters} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <RotateCcw size={15} />
                    Limpar filtros
                  </button>
                  <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">
                    <Download size={15} />
                    Exportar estoque
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <SelectField
                  label="Status"
                  value={stockStatusFilter}
                  onChange={setStockStatusFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "healthy", label: "Saudável" },
                    { value: "low", label: "Abaixo do mínimo" },
                    { value: "empty", label: "Sem estoque" },
                  ]}
                />
                <SelectField
                  label="Situação"
                  value={stockActiveFilter}
                  onChange={setStockActiveFilter}
                  options={[
                    { value: "all", label: "Ativos e inativos" },
                    { value: "active", label: "Somente ativos" },
                    { value: "inactive", label: "Somente inativos" },
                  ]}
                />
                <SelectField
                  label="Categoria"
                  value={stockCategoryFilter}
                  onChange={setStockCategoryFilter}
                  options={[{ value: "all", label: "Todas" }, ...stockCategories.map((value) => ({ value, label: value }))]}
                />
                <SelectField
                  label="Localização"
                  value={stockLocationFilter}
                  onChange={setStockLocationFilter}
                  options={[{ value: "all", label: "Todas" }, ...stockLocations.map((value) => ({ value, label: value }))]}
                />
                <Field label="Saldo mínimo" type="number" value={stockMinQuantityFilter} set={setStockMinQuantityFilter} required={false} />
                <Field label="Saldo máximo" type="number" value={stockMaxQuantityFilter} set={setStockMaxQuantityFilter} required={false} />
              </div>
            </div>
          </section>

          <section className="overflow-x-auto rounded-2xl border bg-white">
            {loading ? (
              <div className="grid h-72 place-items-center">
                <Loader2 className="animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
                  <tr>
                    {["Produto", "SKU", "Categoria", "Saldo", "Mínimo", "Status", "Localização", "Última atualização", ""].map((item) => (
                      <th key={item} className="px-4 py-3">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStockProducts.map((item) => {
                    const low = (item.stockQuantity || 0) <= (item.minStock || 0);
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <b>{item.name}</b>
                          <small className="block text-slate-400">{item.unit}</small>
                        </td>
                        <td className="px-4">{item.sku || "—"}</td>
                        <td className="px-4">{item.category || "—"}</td>
                        <td className="px-4 font-bold">{item.stockQuantity || 0}</td>
                        <td className="px-4">{item.minStock || 0}</td>
                        <td className="px-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {low ? "Atenção" : "Saudável"}
                          </span>
                        </td>
                        <td className="px-4">{item.stockLocation || "Sem localização"}</td>
                        <td className="px-4">{formatDateTime(item.lastStockUpdateAt)}</td>
                        <td className="px-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => setStockItem(item)}
                              className="rounded-lg px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                            >
                              Ajustar estoque
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredStockProducts.length && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        Nenhum produto encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>

          {!!lowStockItems.length && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5" />
                <div>
                  <p className="font-bold">Produtos com estoque em atenção</p>
                  <p className="mt-1 text-sm">
                    {lowStockItems.map((item) => item.name).join(", ")}
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {open && (
        <ProductForm
          initialValue={editingItem}
          products={items}
          close={() => {
            setOpen(false);
            setEditingItem(null);
          }}
          save={saveItem}
        />
      )}

      {stockItem && (
        <StockAdjustModal
          item={stockItem}
          saving={savingStock}
          close={() => setStockItem(null)}
          save={saveStock}
        />
      )}

      {exportOpen && (
        <ExportFormatModal
          close={() => setExportOpen(false)}
          exportFile={(format) => {
            exportStock(format);
            setExportOpen(false);
          }}
        />
      )}

      {importOpen && <ProductImportModal close={() => setImportOpen(false)} importProducts={importProducts} />}
    </div>
  );
};

const normalizeImportKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const parseCsvRows = (text: string) => {
  const delimiter = (text.split(/\r?\n/, 1)[0].match(/;/g) || []).length > (text.split(/\r?\n/, 1)[0].match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeImportKey);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
};

const importNumber = (value: unknown) => {
  const raw = String(value ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const result = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(result) ? result : 0;
};

const valueFrom = (row: Record<string, string>, aliases: string[]) => aliases.map(normalizeImportKey).map((key) => row[key]).find((value) => String(value || "").trim()) || "";

const rowToProduct = (row: Record<string, string>): ProductFormValue => ({
  ...defaultForm(),
  type: normalizeImportKey(valueFrom(row, ["tipo"])) === "servico" ? "service" : "product",
  name: valueFrom(row, ["nome", "produto", "descricao", "xProd"]),
  barcode: valueFrom(row, ["codigo de barras", "codigo_barras", "gtin", "ean", "cEAN"]).replace(/\D/g, ""),
  sku: valueFrom(row, ["sku", "codigo", "codigo interno", "cProd"]),
  category: valueFrom(row, ["categoria", "grupo"]),
  unit: valueFrom(row, ["unidade", "un", "uCom"]) || "un",
  salePriceCents: Math.round(importNumber(valueFrom(row, ["preco de venda", "preco", "valor unitario", "vUnCom"])) * 100),
  costCents: Math.round(importNumber(valueFrom(row, ["custo", "preco de custo"])) * 100),
  taxPercent: importNumber(valueFrom(row, ["impostos", "imposto percentual", "tributos"])),
  taxRegime: valueFrom(row, ["regime tributario", "regra tributaria"]),
  taxCode: valueFrom(row, ["codigo fiscal", "codigo tributario"]),
  serviceCode: valueFrom(row, ["codigo de servico", "servico lc116"]),
  ncm: valueFrom(row, ["ncm"]),
  cfop: valueFrom(row, ["cfop"]),
  issPercent: importNumber(valueFrom(row, ["iss", "iss percentual"])),
  icmsPercent: importNumber(valueFrom(row, ["icms", "icms percentual"])),
  pisPercent: importNumber(valueFrom(row, ["pis", "pis percentual"])),
  cofinsPercent: importNumber(valueFrom(row, ["cofins", "cofins percentual"])),
  stockQuantity: importNumber(valueFrom(row, ["estoque", "quantidade", "saldo", "qCom"])),
  minStock: importNumber(valueFrom(row, ["estoque minimo", "minimo"])),
  stockLocation: valueFrom(row, ["localizacao", "local"]),
  notes: valueFrom(row, ["observacoes", "notas"]),
  active: !["nao", "false", "0", "inativo"].includes(normalizeImportKey(valueFrom(row, ["ativo", "status"]) || "sim")),
});

const parseXmlProducts = (text: string) => {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("O XML está inválido ou corrompido.");
  let nodes = Array.from(xml.querySelectorAll("det"));
  if (!nodes.length) nodes = Array.from(xml.querySelectorAll("produto, product, item"));
  const read = (node: Element, names: string[]) => {
    for (const name of names) {
      const value = node.querySelector(name)?.textContent?.trim();
      if (value) return value;
    }
    return "";
  };
  return nodes.map((node) => rowToProduct({
    nome: read(node, ["xProd", "nome", "name", "descricao"]),
    codigodebarras: read(node, ["cEANTrib", "cEAN", "gtin", "ean", "barcode"]),
    sku: read(node, ["cProd", "sku", "codigo"]),
    categoria: read(node, ["categoria", "category"]),
    unidade: read(node, ["uCom", "unidade", "unit"]),
    precodevenda: read(node, ["vUnCom", "preco", "price"]),
    ncm: read(node, ["NCM", "ncm"]),
    cfop: read(node, ["CFOP", "cfop"]),
    estoque: read(node, ["qCom", "quantidade", "quantity"]),
  }));
};

const ProductImportModal = ({ close, importProducts }: { close: () => void; importProducts: (products: ProductFormValue[]) => Promise<{ created: number; updated: number }> }) => {
  const [rows, setRows] = React.useState<ProductFormValue[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [error, setError] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState("");
  const updateRow = (index: number, changes: Partial<ProductFormValue>) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, ...changes } : item));
  const cellClass = "w-full min-w-[110px] rounded-lg border bg-white px-2 py-2 text-xs text-slate-800 outline-none focus:border-blue-500";

  const readFile = async (file?: File) => {
    if (!file) return;
    setError(""); setResult(""); setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".xml") ? parseXmlProducts(text) : parseCsvRows(text).map(rowToProduct);
      const valid = parsed.filter((item) => item.name.trim());
      const unique = new Map<string, ProductFormValue>();
      valid.forEach((item, index) => {
        const key = item.barcode || item.sku?.trim().toLowerCase() || `row-${index}`;
        unique.set(key, { ...(unique.get(key) || {}), ...item });
      });
      setRows(Array.from(unique.values()));
      if (!valid.length) setError("Nenhum produto válido foi identificado. Confira os cabeçalhos ou a estrutura do XML.");
    } catch (reason) {
      setRows([]);
      setError(reason instanceof Error ? reason.message : "Não foi possível ler o arquivo.");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/55 p-4">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Importação inteligente</p><h2 className="mt-1 text-xl font-bold">Importar produtos em lote</h2></div>
          <button onClick={close}><X /></button>
        </header>
        <div className="overflow-y-auto p-5">
          <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed bg-slate-50 p-8 text-center">
            <FileUp className="mb-3 text-blue-600" />
            <b>{fileName || "Selecione um arquivo CSV ou XML"}</b>
            <span className="mt-1 text-xs text-slate-500">CSV: nome, código de barras, SKU, categoria, unidade, preço, custo, estoque, NCM e CFOP. XML de NF-e também é reconhecido.</span>
            <input type="file" accept=".csv,text/csv,.xml,text/xml,application/xml" className="hidden" onChange={(event) => void readFile(event.target.files?.[0])} />
          </label>
          {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
          {result && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{result}</p>}
          {rows.length > 0 && <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><b>{rows.length} produto(s) identificado(s)</b><p className="text-xs text-slate-500">Revise e edite as células antes de importar. A tabela pode ser rolada horizontalmente.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Tabela editável</span></div>
            <div className="max-h-[45vh] overflow-auto rounded-xl border">
              <table className="min-w-[3650px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 uppercase text-slate-500"><tr>{["Tipo", "Nome *", "GTIN/EAN", "SKU", "Categoria", "Unidade", "Venda (R$)", "Custo (R$)", "Impostos %", "Regime tributário", "Código fiscal", "Código serviço", "NCM", "CFOP", "ISS %", "ICMS %", "PIS %", "COFINS %", "Estoque", "Mínimo", "Localização", "Ativo", "Observações", ""].map((label) => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
                <tbody className="divide-y bg-white">{rows.map((item, index) => <tr key={`${item.barcode}-${item.sku}-${index}`} className={!item.name.trim() ? "bg-rose-50" : ""}>
                  <td className="p-2"><select className={cellClass} value={item.type} onChange={(event) => updateRow(index, { type: event.target.value as Product["type"] })}><option value="product">Produto</option><option value="service">Serviço</option></select></td>
                  <td className="p-2"><input className={`${cellClass} min-w-[220px] ${!item.name.trim() ? "border-rose-400" : ""}`} value={item.name} onChange={(event) => updateRow(index, { name: event.target.value })} /></td>
                  <td className="p-2"><input inputMode="numeric" maxLength={14} className={cellClass} value={item.barcode || ""} onChange={(event) => updateRow(index, { barcode: event.target.value.replace(/\D/g, "") })} /></td>
                  <td className="p-2"><input className={cellClass} value={item.sku || ""} onChange={(event) => updateRow(index, { sku: event.target.value })} /></td>
                  <td className="p-2"><input className={`${cellClass} min-w-[170px]`} value={item.category} onChange={(event) => updateRow(index, { category: event.target.value })} /></td>
                  <td className="p-2"><input className={`${cellClass} min-w-[75px]`} value={item.unit} onChange={(event) => updateRow(index, { unit: event.target.value })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.salePriceCents / 100} onChange={(event) => updateRow(index, { salePriceCents: Math.round(Number(event.target.value) * 100) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.costCents / 100} onChange={(event) => updateRow(index, { costCents: Math.round(Number(event.target.value) * 100) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.taxPercent} onChange={(event) => updateRow(index, { taxPercent: Number(event.target.value) })} /></td>
                  <td className="p-2"><input className={`${cellClass} min-w-[150px]`} value={item.taxRegime || ""} onChange={(event) => updateRow(index, { taxRegime: event.target.value })} /></td>
                  <td className="p-2"><input className={cellClass} value={item.taxCode || ""} onChange={(event) => updateRow(index, { taxCode: event.target.value })} /></td>
                  <td className="p-2"><input className={cellClass} value={item.serviceCode || ""} onChange={(event) => updateRow(index, { serviceCode: event.target.value })} /></td>
                  <td className="p-2"><input className={cellClass} value={item.ncm || ""} onChange={(event) => updateRow(index, { ncm: event.target.value })} /></td>
                  <td className="p-2"><input className={cellClass} value={item.cfop || ""} onChange={(event) => updateRow(index, { cfop: event.target.value })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.issPercent || 0} onChange={(event) => updateRow(index, { issPercent: Number(event.target.value) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.icmsPercent || 0} onChange={(event) => updateRow(index, { icmsPercent: Number(event.target.value) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.pisPercent || 0} onChange={(event) => updateRow(index, { pisPercent: Number(event.target.value) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className={cellClass} value={item.cofinsPercent || 0} onChange={(event) => updateRow(index, { cofinsPercent: Number(event.target.value) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.001" className={cellClass} value={item.stockQuantity || 0} onChange={(event) => updateRow(index, { stockQuantity: Number(event.target.value) })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.001" className={cellClass} value={item.minStock || 0} onChange={(event) => updateRow(index, { minStock: Number(event.target.value) })} /></td>
                  <td className="p-2"><input className={`${cellClass} min-w-[150px]`} value={item.stockLocation || ""} onChange={(event) => updateRow(index, { stockLocation: event.target.value })} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={item.active} onChange={(event) => updateRow(index, { active: event.target.checked })} /></td>
                  <td className="p-2"><input className={`${cellClass} min-w-[200px]`} value={item.notes || ""} onChange={(event) => updateRow(index, { notes: event.target.value })} /></td>
                  <td className="p-2"><button type="button" title="Remover linha" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t p-5"><p className="text-xs text-slate-500">Duplicidades são identificadas por GTIN/EAN ou SKU e atualizadas automaticamente.</p><div className="flex gap-2"><button onClick={close} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button disabled={!rows.length || importing || rows.some((item) => !item.name.trim())} onClick={async () => { setImporting(true); setError(""); try { const summary = await importProducts(rows); setResult(`${summary.created} produto(s) criado(s) e ${summary.updated} atualizado(s).`); setRows([]); } catch (reason) { setError(reason instanceof Error ? reason.message : "A importação não pôde ser concluída."); } finally { setImporting(false); } }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white disabled:opacity-50">{importing && <Loader2 size={16} className="animate-spin" />} Importar {rows.length || ""}</button></div></footer>
      </section>
    </div>
  );
};

const ProductForm = ({
  initialValue,
  products,
  close,
  save,
}: {
  initialValue: Product | null;
  products: Product[];
  close: () => void;
  save: (value: ProductFormValue) => Promise<void>;
}) => {
  const [form, setForm] = React.useState<ProductFormValue>(initialValue ? { ...defaultForm(), ...initialValue } : defaultForm());
  const [lookingUpBarcode, setLookingUpBarcode] = React.useState(false);
  const [barcodeMessage, setBarcodeMessage] = React.useState("");
  const [imageMessage, setImageMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const isEditing = Boolean(initialValue);
  const persist = async (mode: "draft" | "published") => {
    setSaving(true);
    setSaveError("");
    try {
      if (mode === "published" && !form.name.trim()) throw new Error("Informe o nome antes de publicar.");
      await save({ ...form, publicationStatus: mode, active: mode === "published" });
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  const addImages = async (files?: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const currentImages = form.images || [];
    const remainingSlots = MAX_PRODUCT_IMAGES - currentImages.length;
    if (remainingSlots <= 0) {
      setImageMessage(`Você pode enviar no máximo ${MAX_PRODUCT_IMAGES} imagens por produto.`);
      return;
    }
    const accepted = selected.slice(0, remainingSlots);
    const oversized = accepted.find((file) => file.size > MAX_PRODUCT_IMAGE_SIZE);
    if (oversized) {
      setImageMessage(`A imagem ${oversized.name} excede o limite de 2 MB.`);
      return;
    }
    try {
      const dataUrls = await Promise.all(accepted.map((file) => fileToDataUrl(file)));
      setForm((current) => ({ ...current, images: [...(current.images || []), ...dataUrls].slice(0, MAX_PRODUCT_IMAGES) }));
      setImageMessage(`${Math.min(accepted.length, remainingSlots)} imagem(ns) pronta(s) para salvar.`);
    } catch {
      setImageMessage("Não foi possível carregar as imagens selecionadas.");
    }
  };

  const lookupBarcode = async () => {
    const barcode = String(form.barcode || "").replace(/\D/g, "");
    setForm((current) => ({ ...current, barcode }));
    if (![8, 12, 13, 14].includes(barcode.length)) {
      setBarcodeMessage("Informe um GTIN/EAN válido com 8, 12, 13 ou 14 dígitos.");
      return;
    }
    setLookingUpBarcode(true);
    setBarcodeMessage("");
    try {
      const callable = httpsCallable<{ barcode: string }, { found: boolean; product?: { name?: string; brand?: string; category?: string; quantity?: string; imageUrl?: string }; source?: string }>(functions, "lookupProductBarcode");
      const response = await callable({ barcode });
      if (!response.data.found || !response.data.product) {
        setBarcodeMessage("Produto não encontrado na base pública. Você pode preencher os dados manualmente.");
        return;
      }
      const product = response.data.product;
      setForm((current) => ({
        ...current,
        barcode,
        name: product.name || current.name,
        category: product.category || current.category,
        notes: [current.notes, product.brand ? `Marca: ${product.brand}` : "", product.quantity ? `Apresentação: ${product.quantity}` : ""].filter(Boolean).join("\n"),
      }));
      setBarcodeMessage(`Dados localizados e preenchidos pela ${response.data.source || "base de produtos"}. Revise antes de salvar.`);
    } catch (error) {
      console.error("Erro ao consultar código de barras:", error);
      const code = String((error as { code?: string })?.code || "");
      const message = String((error as { message?: string })?.message || "");
      if (code.includes("unauthenticated")) {
        setBarcodeMessage("Sua sessão expirou. Entre novamente para consultar o código de barras.");
      } else if (code.includes("invalid-argument")) {
        setBarcodeMessage("O código informado não é um GTIN/EAN válido.");
      } else {
        setBarcodeMessage(message || "Não foi possível consultar o código agora. Tente novamente ou preencha manualmente.");
      }
    } finally {
      setLookingUpBarcode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="font-bold">{isEditing ? "Editar produto" : "Novo produto"}</h2>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await persist("published");
          }}
          className="flex max-h-[calc(92vh-72px)] flex-col"
        >
          <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
            <section className="grid gap-4 rounded-2xl border bg-slate-50 p-4 md:col-span-2 md:grid-cols-4">
              <input type="hidden" value="product" />
              {(
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Código de barras (GTIN/EAN)
                  <div className="mt-2 flex gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={14}
                      value={form.barcode || ""}
                      onChange={(event) => setForm({ ...form, barcode: event.target.value.replace(/\D/g, "") })}
                      onBlur={() => { if (form.barcode && !form.name) void lookupBarcode(); }}
                      placeholder="Ex.: 7891234567890"
                      className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"
                    />
                    <button type="button" disabled={lookingUpBarcode} onClick={lookupBarcode} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                      {lookingUpBarcode ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      Buscar
                    </button>
                  </div>
                  {barcodeMessage && <span className="mt-2 block text-xs font-medium text-slate-500">{barcodeMessage}</span>}
                </label>
              )}
              <Field label="Nome" value={form.name} set={(v) => setForm({ ...form, name: v })} />
              <Field label="SKU/Código interno" value={form.sku || ""} set={(v) => setForm({ ...form, sku: v })} />
              <Field label="Categoria comercial" value={form.category} set={(v) => setForm({ ...form, category: v })} />
              <Field label="Unidade" value={form.unit} set={(v) => setForm({ ...form, unit: v })} />
              <Field label="Preço de venda (R$)" type="number" value={String(form.salePriceCents / 100)} set={(v) => setForm({ ...form, salePriceCents: Math.round(Number(v) * 100) })} />
              <Field label="Custo estimado (R$)" type="number" value={String(form.costCents / 100)} set={(v) => setForm({ ...form, costCents: Math.round(Number(v) * 100) })} />
              <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                Ativo para propostas
              </label>
            </section>
            <section className="grid gap-4 rounded-2xl border bg-white p-4 md:col-span-2 md:grid-cols-4">
              <h3 className="font-bold md:col-span-4">Tributação gerencial</h3>
              <Field label="Regime/regra tributária" value={form.taxRegime || ""} set={(v) => setForm({ ...form, taxRegime: v })} />
              <Field label="Código fiscal interno" value={form.taxCode || ""} set={(v) => setForm({ ...form, taxCode: v })} />
              <Field label="NCM" value={form.ncm || ""} set={(v) => setForm({ ...form, ncm: v })} />
              <Field label="CFOP" value={form.cfop || ""} set={(v) => setForm({ ...form, cfop: v })} />
              <Field label="Impostos totais (%)" type="number" value={String(form.taxPercent)} set={(v) => setForm({ ...form, taxPercent: Number(v) })} />
              <Field label="ISS (%)" type="number" value={String(form.issPercent || 0)} set={(v) => setForm({ ...form, issPercent: Number(v) })} />
              <Field label="ICMS (%)" type="number" value={String(form.icmsPercent || 0)} set={(v) => setForm({ ...form, icmsPercent: Number(v) })} />
              <Field label="PIS (%)" type="number" value={String(form.pisPercent || 0)} set={(v) => setForm({ ...form, pisPercent: Number(v) })} />
              <Field label="COFINS (%)" type="number" value={String(form.cofinsPercent || 0)} set={(v) => setForm({ ...form, cofinsPercent: Number(v) })} />
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700 md:col-span-3">
                Esses dados são usados para formação de preço e gestão gerencial. A validação fiscal final deve ser feita pela contabilidade.
              </p>
            </section>
            {form.type === "product" && (
              <section className="grid gap-4 rounded-2xl border bg-white p-4 md:col-span-2 md:grid-cols-4">
                <h3 className="font-bold md:col-span-4">Configuração inicial de estoque</h3>
                <Field label="Quantidade inicial" type="number" value={String(form.stockQuantity || 0)} set={(v) => setForm({ ...form, stockQuantity: Number(v) })} />
                <Field label="Estoque mínimo" type="number" value={String(form.minStock || 0)} set={(v) => setForm({ ...form, minStock: Number(v) })} />
                <Field label="Localização" value={form.stockLocation || ""} set={(v) => setForm({ ...form, stockLocation: v })} />
                <label className="text-xs font-bold text-slate-600 md:col-span-4">
                  Observações de estoque
                  <textarea
                    value={form.stockNotes || ""}
                    onChange={(event) => setForm({ ...form, stockNotes: event.target.value })}
                    className="mt-2 w-full rounded-xl border p-3 text-sm font-normal"
                  />
                </label>
              </section>
            )}
            <section className="grid gap-4 rounded-2xl border bg-white p-4 md:col-span-2 md:grid-cols-2">
              <h3 className="font-bold md:col-span-2">Conteúdo da página do produto</h3>
              <label className="text-xs font-bold text-slate-600 md:col-span-2">Descrição detalhada<textarea rows={5} value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" placeholder="Benefícios, materiais, uso e informações importantes." /></label>
              <ListField label="Características" value={form.features || []} set={(features) => setForm({ ...form, features })} placeholder="Ex.: Material resistente" />
              <ListField label="Tamanhos" value={form.sizes || []} set={(sizes) => setForm({ ...form, sizes })} placeholder="P, M, G" />
              <ListField label="Cores" value={form.colors || []} set={(colors) => setForm({ ...form, colors })} placeholder="Azul, Preto" />
              <ListField label="Numerações" value={form.numbers || []} set={(numbers) => setForm({ ...form, numbers })} placeholder="36, 38, 40" />
              <fieldset className="md:col-span-2">
                <legend className="text-xs font-bold text-slate-600">Produtos relacionados</legend>
                <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-xl border bg-slate-50 p-3 sm:grid-cols-2">
                  {products.filter((item) => item.id !== initialValue?.id).map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={(form.relatedProductIds || []).includes(item.id)} onChange={(event) => setForm({ ...form, relatedProductIds: event.target.checked ? [...(form.relatedProductIds || []), item.id] : (form.relatedProductIds || []).filter((id) => id !== item.id) })} />
                      <span className="truncate">{item.name}</span>
                    </label>
                  ))}
                  {!products.filter((item) => item.id !== initialValue?.id).length && <span className="text-xs text-slate-400">Cadastre outro produto para criar recomendações.</span>}
                </div>
              </fieldset>
            </section>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Observações comerciais
              <textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" />
            </label>
            <section className="grid gap-4 rounded-2xl border bg-white p-4 md:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">Imagens do produto</h3>
                  <p className="mt-1 text-xs text-slate-500">Envie até {MAX_PRODUCT_IMAGES} imagens de até 2 MB cada.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
                  <FileUp size={16} />
                  Adicionar imagens
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void addImages(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {imageMessage && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{imageMessage}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                {(form.images || []).map((image, index) => (
                  <article key={`${image.slice(0, 20)}-${index}`} className="overflow-hidden rounded-2xl border bg-slate-50">
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <img src={image} alt={`Imagem ${index + 1} do produto`} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-semibold text-slate-500">Imagem {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, images: (current.images || []).filter((_, imageIndex) => imageIndex !== index) }))}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Remover imagem"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
                {Array.from({ length: Math.max(0, MAX_PRODUCT_IMAGES - (form.images || []).length) }).map((_, index) => (
                  <div key={`placeholder-${index}`} className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed bg-slate-50 text-xs font-medium text-slate-400">
                    Slot disponível
                  </div>
                ))}
              </div>
            </section>
          </div>
          {saveError && <p className="mx-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{saveError}</p>}
          <footer className="flex justify-end gap-2 border-t p-5">
            <button type="button" onClick={close} className="rounded-xl border px-4 py-2 font-bold">
              Cancelar
            </button>
            <button type="button" formNoValidate disabled={saving} onClick={() => void persist("draft")} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2 font-bold text-blue-700 disabled:opacity-50">
              Salvar rascunho
            </button>
            <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Publicar"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

const StockAdjustModal = ({
  item,
  saving,
  close,
  save,
}: {
  item: Product;
  saving: boolean;
  close: () => void;
  save: (value: { stockQuantity: number; minStock: number; stockLocation: string; stockNotes: string }) => Promise<void>;
}) => {
  const [stockQuantity, setStockQuantity] = React.useState<number>(item.stockQuantity || 0);
  const [minStock, setMinStock] = React.useState<number>(item.minStock || 0);
  const [stockLocation, setStockLocation] = React.useState(item.stockLocation || "");
  const [stockNotes, setStockNotes] = React.useState(item.stockNotes || "");

  return (
    <div className="fixed inset-0 z-[135] grid place-items-center bg-slate-950/55 p-4">
      <section className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-bold">Ajustar estoque</h2>
            <p className="mt-1 text-sm text-slate-500">{item.name}</p>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await save({ stockQuantity, minStock, stockLocation, stockNotes });
          }}
          className="space-y-4 p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Saldo em estoque" type="number" value={String(stockQuantity)} set={(value) => setStockQuantity(Number(value))} />
            <Field label="Estoque mínimo" type="number" value={String(minStock)} set={(value) => setMinStock(Number(value))} />
            <Field label="Localização" value={stockLocation} set={setStockLocation} />
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Última atualização</p>
              <p className="mt-2 text-sm font-bold text-slate-700">{formatDateTime(item.lastStockUpdateAt)}</p>
            </div>
          </div>
          <label className="block text-xs font-bold text-slate-600">
            Observações do estoque
            <textarea value={stockNotes} onChange={(event) => setStockNotes(event.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" />
          </label>
          <footer className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={close} className="rounded-xl border px-4 py-2 font-bold">
              Cancelar
            </button>
            <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar estoque
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <article className="rounded-2xl border bg-white p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-2 text-xl font-black">{value}</p>
  </article>
);

const TabButton = ({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
      active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    {icon}
    {children}
  </button>
);

const ListField = ({ label, value, set, placeholder }: { label: string; value: string[]; set: (value: string[]) => void; placeholder?: string }) => (
  <label className="text-xs font-bold text-slate-600">
    {label}
    <input
      value={value.join(", ")}
      onChange={(event) => set(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
      placeholder={placeholder}
      className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal"
    />
    <span className="mt-1 block text-[10px] font-normal text-slate-400">Separe as opções por vírgulas.</span>
  </label>
);

const Field = ({
  label,
  value,
  set,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  type?: string;
  required?: boolean;
}) => (
  <label className="text-xs font-bold text-slate-600">
    {label}
    <input
      required={required}
      type={type}
      step={type === "number" ? "0.01" : undefined}
      value={value}
      onChange={(event) => set(event.target.value)}
      className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal"
    />
  </label>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: any) => void;
  options: Array<{ value: string; label: string }>;
}) => (
  <label className="text-xs font-bold text-slate-600">
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ExportFormatModal = ({
  close,
  exportFile,
}: {
  close: () => void;
  exportFile: (format: "pdf" | "xls" | "csv") => void;
}) => (
  <div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/55 p-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Exportação</p>
          <h2 className="mt-2 text-xl font-bold">Escolha o formato</h2>
        </div>
        <button onClick={close}>
          <X />
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        O relatório será gerado com os filtros ativos da tela de estoque.
      </p>
      <div className="mt-5 grid gap-3">
        <button onClick={() => exportFile("pdf")} className="rounded-xl border px-4 py-3 text-left text-sm font-bold hover:bg-slate-50">
          PDF
          <span className="mt-1 block text-xs font-normal text-slate-500">Visual com cabeçalho da empresa, data e rodapé da Blu.</span>
        </button>
        <button onClick={() => exportFile("xls")} className="rounded-xl border px-4 py-3 text-left text-sm font-bold hover:bg-slate-50">
          XLS
          <span className="mt-1 block text-xs font-normal text-slate-500">Ideal para abrir rapidamente no Excel.</span>
        </button>
        <button onClick={() => exportFile("csv")} className="rounded-xl border px-4 py-3 text-left text-sm font-bold hover:bg-slate-50">
          CSV
          <span className="mt-1 block text-xs font-normal text-slate-500">Formato leve para integrações e planilhas.</span>
        </button>
      </div>
    </section>
  </div>
);
