import type {
  CashFlowAuxiliary,
  CashFlowDashboard,
  CashFlowFilters,
  CashFlowInput,
  CashFlowTransaction,
} from "../domain/cashFlowTypes";
import type { CashFlowContext, CashFlowRepository } from "../repositories/cashFlowRepository";

const settledStatuses = new Set(["paid", "received", "partiallyPaid", "partiallyReceived"]);
const forecastStatuses = new Set(["forecast", "pending", "overdue", "partiallyPaid", "partiallyReceived", "renegotiated"]);
const transferOrigins = new Set(["bankTransfer", "bank-transfer", "transfer", "internalTransfer", "bankAccountTransfer"]);

const transactionDate = (item: CashFlowTransaction) => item.settlementDate || item.dueDate || item.issueDate || "";
const isCancelled = (item: CashFlowTransaction) => item.status === "cancelled";
const isTransfer = (item: CashFlowTransaction) => transferOrigins.has(String(item.originType || ""));
const inRange = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date <= to);
const direction = (item: CashFlowTransaction) => (item.kind === "income" ? 1 : -1);
const realizedAmount = (item: CashFlowTransaction) => Math.max(0, Number(item.settledAmountCents || 0));
const forecastAmount = (item: CashFlowTransaction) => Math.max(0, Number(item.balanceAmountCents || 0));

export class CashFlowService {
  constructor(private repository: CashFlowRepository) {}

  async load(context: CashFlowContext): Promise<{ transactions: CashFlowTransaction[]; aux: CashFlowAuxiliary }> {
    const [transactions, aux] = await Promise.all([
      this.repository.list(context),
      this.repository.auxiliary(context),
    ]);

    return { transactions, aux };
  }

  filter(items: CashFlowTransaction[], filters: CashFlowFilters) {
    return items.filter((item) => {
      const date = filters.mode === "realized" ? transactionDate(item) : item.dueDate;
      return (
        (!filters.search || JSON.stringify(item).toLowerCase().includes(filters.search.toLowerCase())) &&
        (!filters.from || date >= filters.from) &&
        (!filters.to || date <= filters.to) &&
        (!filters.status || filters.status === "all" || item.status === filters.status) &&
        (!filters.kind || filters.kind === "all" || item.kind === filters.kind) &&
        (!filters.accountId || item.bankAccountId === filters.accountId) &&
        (!filters.projectId || item.projectId === filters.projectId) &&
        (!filters.contractId || item.contractId === filters.contractId) &&
        (!filters.costCenterId || item.costCenterId === filters.costCenterId) &&
        (filters.mode === "consolidated" ||
          (filters.mode === "forecast" && forecastStatuses.has(item.status) && forecastAmount(item) > 0) ||
          (filters.mode === "realized" && realizedAmount(item) > 0))
      );
    });
  }

  dashboard(allItems: CashFlowTransaction[], accounts: any[], filters: CashFlowFilters): CashFlowDashboard {
    const filteredAccounts = filters.accountId ? accounts.filter((account) => account.id === filters.accountId) : accounts;
    const openingFromAccounts = filteredAccounts.reduce((sum, account) => sum + Number(account.initialBalanceCents || 0), 0);

    const scopedItems = allItems.filter((item) => {
      if (isCancelled(item)) return false;
      if (filters.accountId && item.bankAccountId !== filters.accountId) return false;
      if (filters.projectId && item.projectId !== filters.projectId) return false;
      if (filters.contractId && item.contractId !== filters.contractId) return false;
      if (filters.costCenterId && item.costCenterId !== filters.costCenterId) return false;
      if (filters.kind && filters.kind !== "all" && item.kind !== filters.kind) return false;
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.search && !JSON.stringify(item).toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });

    const includeTransfers = Boolean(filters.accountId);

    const openingMovements = scopedItems
      .filter((item) => realizedAmount(item) > 0)
      .filter((item) => !filters.from || transactionDate(item) < filters.from)
      .filter((item) => includeTransfers || !isTransfer(item))
      .reduce((sum, item) => sum + direction(item) * realizedAmount(item), 0);

    const periodItems = scopedItems
      .filter((item) => inRange(filters.mode === "realized" ? transactionDate(item) : item.dueDate, filters.from, filters.to))
      .filter((item) => includeTransfers || !isTransfer(item));

    const realizedIncome = periodItems
      .filter((item) => item.kind === "income" && realizedAmount(item) > 0)
      .reduce((sum, item) => sum + realizedAmount(item), 0);

    const realizedExpense = periodItems
      .filter((item) => item.kind === "expense" && realizedAmount(item) > 0)
      .reduce((sum, item) => sum + realizedAmount(item), 0);

    const forecastIncome = periodItems
      .filter((item) => item.kind === "income" && forecastStatuses.has(item.status))
      .reduce((sum, item) => sum + forecastAmount(item), 0);

    const forecastExpense = periodItems
      .filter((item) => item.kind === "expense" && forecastStatuses.has(item.status))
      .reduce((sum, item) => sum + forecastAmount(item), 0);

    const opening = openingFromAccounts + openingMovements;
    const closing = opening + realizedIncome - realizedExpense;

    return {
      openingBalanceCents: opening,
      incomeCents: realizedIncome,
      expenseCents: realizedExpense,
      resultCents: realizedIncome - realizedExpense,
      closingBalanceCents: closing,
      forecastIncomeCents: forecastIncome,
      forecastExpenseCents: forecastExpense,
      forecastClosingCents: closing + forecastIncome - forecastExpense,
    };
  }

  create(context: CashFlowContext, value: CashFlowInput) {
    if (!value.description.trim() || !Number.isSafeInteger(value.grossAmountCents) || value.grossAmountCents <= 0) {
      throw new Error("Descrição e valor são obrigatórios.");
    }
    return this.repository.create(context, value);
  }

  settle(context: CashFlowContext, item: CashFlowTransaction, amount: number, date: string, account: string) {
    if (amount <= 0 || amount > item.balanceAmountCents) {
      throw new Error("A baixa deve ser positiva e não pode superar o saldo.");
    }
    return this.repository.settle(context, item.id, amount, date, account);
  }

  command = (
    context: CashFlowContext,
    id: string,
    action: "cancel" | "reverse" | "renegotiate" | "duplicate",
    reason: string,
  ) => this.repository.command(context, id, action, reason);

  importRows = (context: CashFlowContext, rows: CashFlowInput[]) => this.repository.importRows(context, rows);

  allocate(context: CashFlowContext, id: string, parts: Array<{ costCenterId: string; percentageBasisPoints: number }>) {
    if (parts.reduce((sum, item) => sum + item.percentageBasisPoints, 0) !== 10000) {
      throw new Error("O rateio deve fechar em 100%.");
    }
    return this.repository.allocate(context, id, parts);
  }
}
