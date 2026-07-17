import React from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileDown,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useFinancialPhaseOne } from "../hooks/useFinancialPhaseOne";
import type {
  AccountsPayable,
  AccountsReceivable,
  FinancialMovement,
} from "../domain/financialTypes";
export type FinancialCoreView = "overview" | "receivables" | "payables" | "movements";
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
export const FinancialPhaseOnePage: React.FC<{view?:FinancialCoreView;embedded?:boolean}> = ({view="overview",embedded=false}) => {
  const data = useFinancialPhaseOne();
  const [search, setSearch] = React.useState("");
  if (data.loading)
    return (
      <div className="grid min-h-[560px] place-items-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  const filter = <T extends Record<string, any>>(items: T[]) =>
    items.filter(
      (item) =>
        !search ||
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {!embedded&&<header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">
            Saúde financeira da empresa
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Realizado e previsto, conectado à operação comercial com o governo.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold">
            <FileDown size={16} />
            Exportar
          </button>
          <button
            onClick={() =>
              alert(
                "O cadastro guiado será aberto a partir da lista correspondente.",
              )
            }
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Novo lançamento
          </button>
        </div>
      </header>}
      {data.demonstration && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <CircleDollarSign size={18} />
          <span>
            <strong>Ambiente demonstrativo.</strong> Cadastre lançamentos para
            substituir os cenários da Distribuidora Nordeste Ltda.
          </span>
        </div>
      )}
      {data.error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {data.error}
        </p>
      )}
      <div>
        <main className="min-w-0 space-y-5">
          {view === "overview" && <Overview {...data} />}{" "}
          {view !== "overview" && (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por descrição, órgão, contrato ou categoria"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={data.filters.status}
                  onChange={(e) =>
                    data.setFilters({
                      ...data.filters,
                      status: e.target.value as any,
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="all">Todos os status</option>
                  <option value="pending">Pendentes</option>
                  <option value="overdue">Vencidos</option>
                  <option value="received">Recebidos</option>
                  <option value="paid">Pagos</option>
                </select>
              </div>
              {view === "receivables" && (
                <Receivables
                  items={filter(data.receivables)}
                  receive={data.receive}
                />
              )}{" "}
              {view === "payables" && (
                <Payables items={filter(data.payables)} pay={data.pay} />
              )}{" "}
              {view === "movements" && (
                <Movements items={filter(data.movements)} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
const Overview = (data: ReturnType<typeof useFinancialPhaseOne>) => {
  const d = data.dashboard;
  const cards = [
    [WalletCards, "Saldo disponível", d.availableBalance, ""],
    [TrendingUp, "Saldo previsto", d.forecastBalance, ""],
    [ArrowUpRight, "A receber", d.receivable, "text-emerald-600"],
    [Clock3, "Recebíveis vencidos", d.receivableOverdue, "text-rose-600"],
    [ArrowDownRight, "Contas a pagar", d.payable, "text-amber-600"],
    [AlertTriangle, "Pagamentos vencidos", d.payableOverdue, "text-rose-600"],
  ];
  const max = Math.max(...data.movements.slice(0, 12).map((x) => x.amount), 1);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {cards.map(([Icon, label, value, tone]: any) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-600">
                <Icon size={19} />
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Atualizado agora
              </span>
            </div>
            <p className="mt-5 text-sm text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${tone}`}>
              {brl.format(value)}
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Entradas e saídas</h2>
              <p className="text-xs text-slate-400">
                Movimentações mais recentes
              </p>
            </div>
            <BarChart3 className="text-slate-300" />
          </div>
          <div className="mt-6 flex h-52 items-end gap-2">
            {data.movements
              .slice(0, 12)
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <div
                    title={brl.format(item.amount)}
                    style={{
                      height: `${Math.max(8, (item.amount / max) * 165)}px`,
                    }}
                    className={`w-full rounded-t-md ${item.kind === "income" ? "bg-blue-500" : "bg-rose-300"}`}
                  />
                  <span className="text-[9px] text-slate-400">
                    {item.date.slice(8, 10)}
                  </span>
                </div>
              ))}
          </div>
          <div className="mt-4 flex gap-5 text-xs">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-blue-500" />
              Entradas
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-rose-300" />
              Saídas
            </span>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Alertas financeiros</h2>
          <div className="mt-4 space-y-3">
            {[
              [
                `${data.receivables.filter((x) => x.status === "overdue").length} recebíveis vencidos`,
                brl.format(d.receivableOverdue),
                "rose",
              ],
              [
                `${data.payables.filter((x) => x.status === "overdue").length} contas vencidas`,
                brl.format(d.payableOverdue),
                "amber",
              ],
              [`${d.unreconciled} movimentações`, "Sem conciliação", "blue"],
              [`${d.unclassified} lançamentos`, "Sem categoria", "slate"],
            ].map(([title, meta, tone]) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <span className={`h-2.5 w-2.5 rounded-full bg-${tone}-500`} />
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-slate-400">{meta}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};
const statusLabel = (status: string) =>
  ({
    pending: "Pendente",
    forecast: "Prevista",
    overdue: "Vencida",
    received: "Recebida",
    paid: "Paga",
    partial: "Parcial",
    approved: "Aprovada",
    scheduled: "Agendada",
    cancelled: "Cancelada",
  })[status] || status;
const Badge = ({ status }: { status: string }) => (
  <span
    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${status === "overdue" ? "bg-rose-50 text-rose-700" : status === "received" || status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
  >
    {statusLabel(status)}
  </span>
);
const Receivables = ({
  items,
  receive,
}: {
  items: AccountsReceivable[];
  receive: (x: AccountsReceivable, a: number) => Promise<void>;
}) => (
  <Table
    headers={[
      "Recebível",
      "Órgão / contrato",
      "Vencimento",
      "Saldo",
      "Status",
      "Ação",
    ]}
  >
    {items.map((item) => (
      <tr key={item.id}>
        <Cell strong>
          {item.description}
          <small>{item.invoiceNumber || item.documentNumber}</small>
        </Cell>
        <Cell>
          {item.organizationName}
          <small>{item.contractName}</small>
        </Cell>
        <Cell>{formatDate(item.dueDate)}</Cell>
        <Cell strong>{brl.format(item.balance)}</Cell>
        <Cell>
          <Badge status={item.status} />
        </Cell>
        <Cell>
          {!["received", "cancelled"].includes(item.status) && (
            <button
              onClick={() => {
                const value = Number(
                  prompt("Valor recebido", String(item.balance)),
                );
                if (value > 0) receive(item, value);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
            >
              Registrar recebimento
            </button>
          )}
        </Cell>
      </tr>
    ))}
  </Table>
);
const Payables = ({
  items,
  pay,
}: {
  items: AccountsPayable[];
  pay: (x: AccountsPayable, a: number) => Promise<void>;
}) => (
  <Table
    headers={[
      "Conta",
      "Fornecedor / categoria",
      "Vencimento",
      "Saldo",
      "Status",
      "Ação",
    ]}
  >
    {items.map((item) => (
      <tr key={item.id}>
        <Cell strong>
          {item.description}
          <small>{item.documentNumber}</small>
        </Cell>
        <Cell>
          {item.supplierName}
          <small>{item.category}</small>
        </Cell>
        <Cell>{formatDate(item.dueDate)}</Cell>
        <Cell strong>{brl.format(item.balance)}</Cell>
        <Cell>
          <Badge status={item.status} />
        </Cell>
        <Cell>
          {!["paid", "cancelled"].includes(item.status) && (
            <button
              onClick={() => {
                const value = Number(
                  prompt("Valor pago", String(item.balance)),
                );
                if (value > 0) pay(item, value);
              }}
              className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
            >
              Registrar pagamento
            </button>
          )}
        </Cell>
      </tr>
    ))}
  </Table>
);
const Movements = ({ items }: { items: FinancialMovement[] }) => (
  <Table
    headers={[
      "Movimentação",
      "Data",
      "Categoria / contrato",
      "Valor",
      "Conciliação",
    ]}
  >
    {items.map((item) => (
      <tr key={item.id}>
        <Cell strong>
          {item.description}
          <small>{item.kind}</small>
        </Cell>
        <Cell>{formatDate(item.date)}</Cell>
        <Cell>
          {item.category}
          <small>{item.contractName}</small>
        </Cell>
        <Cell
          strong
          className={
            item.kind === "income" ? "text-emerald-600" : "text-rose-600"
          }
        >
          {item.kind === "income" ? "+ " : "− "}
          {brl.format(item.amount)}
        </Cell>
        <Cell>
          {item.reconciled ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 size={14} />
              Conciliado
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-600">
              Pendente
            </span>
          )}
        </Cell>
      </tr>
    ))}
  </Table>
);
const Table = ({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) => (
  <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full min-w-[900px] border-collapse">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50">
          {headers.map((x) => (
            <th
              key={x}
              className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400"
            >
              {x}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </section>
);
const Cell = ({
  children,
  strong,
  className = "",
}: {
  children: React.ReactNode;
  strong?: boolean;
  className?: string;
}) => (
  <td
    className={`px-4 py-3 text-sm ${strong ? "font-semibold" : "text-slate-600"} ${className}`}
  >
    {children}
  </td>
);
