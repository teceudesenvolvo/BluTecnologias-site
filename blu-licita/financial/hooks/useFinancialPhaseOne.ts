import React from "react";
import { useBluAuth } from "../../contexts/BluAuthContext";
import { FirebaseFinancialAdapter } from "../adapters/FirebaseFinancialAdapter";
import { useFinancialCompany } from "../contexts/FinancialCompanyContext";
import type { AccountsPayable, AccountsReceivable, FinancialFilters, FinancialMovement } from "../domain/financialTypes";
import { FinancialPhaseOneService } from "../services/FinancialPhaseOneService";

const service = new FinancialPhaseOneService(new FirebaseFinancialAdapter());
const normalize = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

export const useFinancialPhaseOne = () => {
  const { user } = useBluAuth();
  const { selectedCompanyId, selectedCompany } = useFinancialCompany();
  const [allReceivables, setAllReceivables] = React.useState<AccountsReceivable[]>([]);
  const [allPayables, setAllPayables] = React.useState<AccountsPayable[]>([]);
  const [allMovements, setAllMovements] = React.useState<FinancialMovement[]>([]);
  const [demonstration, setDemonstration] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [filters, setFilters] = React.useState<FinancialFilters>({ status: "all" });
  const context = React.useMemo(() => ({ companyId: user?.companyId || "demo-company", userId: user?.id || "demo-user" }), [user]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await service.load(context, filters);
      setAllReceivables(data.receivables);
      setAllPayables(data.payables);
      setAllMovements(data.movements);
      setDemonstration(data.demonstration);
    } catch (reason) {
      console.error(reason);
      setError("Não foi possível carregar o financeiro.");
    } finally {
      setLoading(false);
    }
  }, [context, filters]);

  React.useEffect(() => { void reload(); }, [reload]);

  const belongs = React.useCallback((item: any) => {
    if (!selectedCompanyId) return true;
    if (!selectedCompany) return false;
    const expected = [selectedCompanyId, selectedCompany.razaoSocial, selectedCompany.nomeFantasia, selectedCompany.cnpj].filter(Boolean).map(normalize);
    const references = [item?.issuerCompanyId, item?.issuerCompanyName, item?.issuerCompanyDocument, item?.senderCompanyId, item?.senderCompany, item?.companyName, item?.legalEntityId].filter(Boolean).map(normalize);
    return references.some((reference) => expected.includes(reference));
  }, [selectedCompany, selectedCompanyId]);

  const receivables = React.useMemo(() => allReceivables.filter(belongs), [allReceivables, belongs]);
  const payables = React.useMemo(() => allPayables.filter(belongs), [allPayables, belongs]);
  const movements = React.useMemo(() => allMovements.filter(belongs), [allMovements, belongs]);

  return {
    receivables,
    payables,
    movements,
    dashboard: service.dashboard(receivables, payables, movements),
    demonstration,
    loading,
    error,
    filters,
    setFilters,
    reload,
    receive: (item: AccountsReceivable, amount: number) => service.receive(context, item, amount).then(reload),
    pay: (item: AccountsPayable, amount: number) => service.pay(context, item, amount).then(reload),
  };
};
