import React from "react";
import { AlertTriangle, Download, Loader2, Package2, Plus, RotateCcw, Save, Search, Trash2, Warehouse, X } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, deleteCompanyDoc, listCompanyDocs, updateCompanyDoc } from "../services/firestoreCompany";
import { db, type Company } from "../../services/firebase";

type Product = {
  id: string;
  type: "product" | "service";
  name: string;
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
  active: boolean;
  stockQuantity?: number;
  minStock?: number;
  stockLocation?: string;
  stockNotes?: string;
  lastStockUpdateAt?: string;
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
  active: true,
  stockQuantity: 0,
  minStock: 0,
  stockLocation: "",
  stockNotes: "",
  lastStockUpdateAt: "",
});

export const ProductsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [items, setItems] = React.useState<Product[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<PageTab>("catalog");
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

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await listCompanyDocs<Product>("products", user.companyId));
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

  const visible = items.filter((item) =>
    `${item.type} ${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query.toLowerCase()),
  );

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
    if (editingItem) {
      await updateCompanyDoc("products", editingItem.id, user.id, value);
    } else {
      await createCompanyDoc("products", user.companyId, user.id, value);
    }
    setOpen(false);
    setEditingItem(null);
    await load();
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
          <h1 className="mt-2 text-3xl font-bold">Produtos e serviços</h1>
          <p className="mt-1 text-sm text-slate-500">
            Agora com gestão comercial e uma aba dedicada para controle de estoque dos itens físicos.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={17} />
          Novo item
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Itens ativos" value={String(items.filter((item) => item.active).length)} />
        <Metric label="Produtos" value={String(items.filter((item) => (item.type || "product") === "product").length)} />
        <Metric label="Serviços" value={String(items.filter((item) => item.type === "service").length)} />
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
            placeholder={tab === "catalog" ? "Buscar produto, serviço, categoria ou SKU" : "Buscar item por nome, SKU ou categoria"}
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
                      <b>{item.name}</b>
                      <small className="block text-slate-400">
                        {item.sku || "Sem código"} · {item.active ? "Ativo" : "Inativo"}
                      </small>
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
    </div>
  );
};

const ProductForm = ({
  initialValue,
  close,
  save,
}: {
  initialValue: Product | null;
  close: () => void;
  save: (value: ProductFormValue) => Promise<void>;
}) => {
  const [form, setForm] = React.useState<ProductFormValue>(initialValue ? { ...defaultForm(), ...initialValue } : defaultForm());
  const isEditing = Boolean(initialValue);

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="font-bold">{isEditing ? "Editar produto ou serviço" : "Novo produto ou serviço"}</h2>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(form);
          }}
          className="flex max-h-[calc(92vh-72px)] flex-col"
        >
          <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
            <section className="grid gap-4 rounded-2xl border bg-slate-50 p-4 md:col-span-2 md:grid-cols-4">
              <label className="text-xs font-bold text-slate-600">
                Tipo
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value as Product["type"], unit: event.target.value === "service" ? "serv" : "un" })
                  }
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal"
                >
                  <option value="product">Produto</option>
                  <option value="service">Serviço</option>
                </select>
              </label>
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
              {form.type === "service" ? (
                <Field label="Código de serviço / LC 116" value={form.serviceCode || ""} set={(v) => setForm({ ...form, serviceCode: v })} />
              ) : (
                <Field label="NCM" value={form.ncm || ""} set={(v) => setForm({ ...form, ncm: v })} />
              )}
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
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Observações comerciais
              <textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 w-full rounded-xl border p-3 text-sm font-normal" />
            </label>
          </div>
          <footer className="flex justify-end gap-2 border-t p-5">
            <button type="button" onClick={close} className="rounded-xl border px-4 py-2 font-bold">
              Cancelar
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white">
              <Save size={16} />
              Salvar
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
