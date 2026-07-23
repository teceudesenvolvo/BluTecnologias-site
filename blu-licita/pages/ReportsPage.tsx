import React from "react";
import { Download, Eye, FileBarChart, FileSpreadsheet, Loader2, X } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { listCompanyDocs } from "../services/firestoreCompany";

type Row = Record<string, any>;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value || 0) / 100);
const reports = [
  { id: "receivables", title: "Contas a receber", desc: "Cobranças, vencimentos e valores pendentes" },
  { id: "orders", title: "Ordens e entregas", desc: "Ordens de serviço e fornecimento por contrato" },
  { id: "budgets", title: "Orçamentos", desc: "Orçado, custos, impostos e margem" },
  { id: "contracts", title: "Contratos e clientes", desc: "Contratos cadastrados na página de clientes" },
  { id: "products", title: "Produtos e serviços", desc: "Catálogo comercial para propostas" },
  { id: "executive", title: "Relatório executivo", desc: "Resumo consolidado para diretoria" },
];

export const ReportsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [selected, setSelected] = React.useState(reports[0]);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modal, setModal] = React.useState(false);
  const load = React.useCallback(async (report = selected) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await buildReport(report.id, user.companyId);
      setRows(data);
    } finally { setLoading(false); }
  }, [selected, user]);
  React.useEffect(() => { load(); }, [load]);
  const open = (report: typeof reports[number]) => { setSelected(report); setModal(true); void load(report); };
  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Central de inteligência</p><h1 className="mt-2 text-3xl font-bold">Relatórios</h1><p className="mt-1 text-sm text-slate-500">Abra, revise e baixe relatórios em CSV, Excel ou PDF simples.</p></header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <button key={report.id} onClick={() => open(report)} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><FileBarChart size={19}/></span><h3 className="mt-5 font-bold">{report.title}</h3><p className="mt-1 text-sm text-slate-500">{report.desc}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Eye size={14}/> Abrir relatório</span></button>)}</section>
    {modal && <ReportModal report={selected} rows={rows} loading={loading} close={() => setModal(false)}/>}
  </div>;
};

const buildReport = async (id: string, companyId: string): Promise<Row[]> => {
  if (id === "receivables") return (await listCompanyDocs<any>("collections", companyId)).map((item) => ({ Data: item.dueDate, Descrição: item.description || item.number, Órgão: item.organizationName, Status: item.status, Valor: money(item.balanceAmountCents || item.originalAmountCents || 0) }));
  if (id === "orders") return (await listCompanyDocs<any>("serviceOrders", companyId)).map((item) => ({ Prazo: item.dueDate, Ordem: item.number, Tipo: item.kind === "supply" ? "Fornecimento" : "Serviço", Cliente: item.clientName, Contrato: item.contractName, Status: item.status, Valor: money(item.amountCents || 0) }));
  if (id === "budgets") return (await listCompanyDocs<any>("budgets", companyId)).map((item) => ({ Código: item.code, Nome: item.name, Tipo: item.type, Status: item.status, Total: money(item.totalBudgetedCents || 0), Margem: money(item.totalMarginCents || 0) }));
  if (id === "products") return (await listCompanyDocs<any>("products", companyId)).map((item) => ({ Item: item.name, SKU: item.sku, Categoria: item.category, Unidade: item.unit, Venda: money(item.salePriceCents || 0), Custo: money(item.costCents || 0), Impostos: `${item.taxPercent || 0}%` }));
  if (id === "contracts") {
    const clients = await listCompanyDocs<any>("clients", companyId);
    return clients.flatMap((client) => (client.contracts || []).map((contract: any) => ({ Cliente: client.razaoSocial || client.name, Contrato: contract.title || contract.name, Início: contract.startDate, Fim: contract.endDate, Valor: money(Math.round(Number(contract.value || contract.amount || 0) * (Number(contract.value || contract.amount || 0) > 100000 ? 1 : 100))) })));
  }
  const [collections, orders, budgets, products] = await Promise.all(["collections", "serviceOrders", "budgets", "products"].map((name) => listCompanyDocs<any>(name, companyId).catch(() => [])));
  return [
    { Indicador: "Cobranças", Valor: String(collections.length) },
    { Indicador: "Ordens", Valor: String(orders.length) },
    { Indicador: "Orçamentos", Valor: String(budgets.length) },
    { Indicador: "Produtos/serviços", Valor: String(products.length) },
    { Indicador: "Total orçado", Valor: money(budgets.reduce((sum, item) => sum + Number(item.totalBudgetedCents || 0), 0)) },
  ];
};

const ReportModal = ({ report, rows, loading, close }: { report: any; rows: Row[]; loading: boolean; close: () => void }) => {
  const headers = Object.keys(rows[0] || { Status: "Sem dados" });
  const download = (format: "csv" | "xlsx" | "pdf") => {
    if (format === "pdf") return downloadPdf(report.title, rows);
    const sep = format === "csv" ? "," : "\t";
    const content = [headers.join(sep), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(sep))].join("\n");
    const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8" });
    saveBlob(blob, `${report.id}.${format === "csv" ? "csv" : "xls"}`);
  };
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4"><section className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><div><p className="text-xs font-bold uppercase text-blue-600">Relatório</p><h2 className="text-xl font-bold">{report.title}</h2></div><button onClick={close}><X/></button></header><div className="flex flex-wrap gap-2 border-b bg-slate-50 p-4"><button onClick={() => download("csv")} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">CSV</button><button onClick={() => download("xlsx")} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"><FileSpreadsheet size={16}/>Excel</button><button onClick={() => download("pdf")} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Download size={16}/>PDF</button></div><div className="flex-1 overflow-auto">{loading ? <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-blue-600"/></div> : <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index}>{headers.map((header) => <td key={header} className="px-4 py-3">{row[header]}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="p-12 text-center text-slate-400">Nenhum dado encontrado.</td></tr>}</tbody></table>}</div></section></div>;
};

const saveBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); };
const cleanPdfText = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[()\\]/g, " ").slice(0, 115);
const makePdf = (lines: string[]) => {
  const content = ["BT", "/F1 10 Tf", "40 800 Td", ...lines.flatMap((line, index) => [index ? "0 -15 Td" : "", `(${cleanPdfText(line)}) Tj`]).filter(Boolean), "ET"].join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; }); return `${pdf}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
};
const downloadPdf = (title: string, rows: Row[]) => {
  const lines = [title, `Gerado em ${new Date().toLocaleString("pt-BR")}`, "", ...rows.slice(0, 45).map((row) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(" | "))];
  saveBlob(new Blob([makePdf(lines)], { type: "application/pdf" }), `${title.replace(/[^\w]+/g, "-")}.pdf`);
};
