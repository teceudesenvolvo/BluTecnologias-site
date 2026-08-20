import React from "react";
import type { Company } from "../../../services/firebase";
import { companySettingsService } from "../../../services/firestoreSettingsService";
import { useBluAuth } from "../../contexts/BluAuthContext";

type FinancialCompanyContextValue = {
  companies: Company[];
  selectedCompanyId: string;
  selectedCompany: Company | null;
  loading: boolean;
  setSelectedCompanyId: (id: string) => void;
};

const FinancialCompanyContext = React.createContext<FinancialCompanyContextValue>({
  companies: [], selectedCompanyId: "", selectedCompany: null, loading: true, setSelectedCompanyId: () => undefined,
});

export const FinancialCompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useBluAuth();
  const storageKey = `blu:financial-company:${user?.companyId || "tenant"}`;
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = React.useState(() => localStorage.getItem(storageKey) || "");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    companySettingsService.getAll()
      .then((items) => {
        if (!active) return;
        setCompanies(items);
        setSelectedCompanyIdState((current) => current && !items.some((item) => item.id === current) ? "" : current);
      })
      .catch((error) => console.error("Não foi possível carregar as empresas do financeiro.", error))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user?.companyId]);

  const setSelectedCompanyId = React.useCallback((id: string) => {
    setSelectedCompanyIdState(id);
    if (id) localStorage.setItem(storageKey, id);
    else localStorage.removeItem(storageKey);
  }, [storageKey]);

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId) || null;
  return <FinancialCompanyContext.Provider value={{ companies, selectedCompanyId, selectedCompany, loading, setSelectedCompanyId }}>{children}</FinancialCompanyContext.Provider>;
};

export const useFinancialCompany = () => React.useContext(FinancialCompanyContext);

export const FinancialCompanySelector = () => {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading } = useFinancialCompany();
  return (
    <label className="block min-w-[240px] text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 dark:text-slate-300">
      Empresa do financeiro
      <select value={selectedCompanyId} disabled={loading} onChange={(event) => setSelectedCompanyId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white">
        <option value="">Consolidado · todas as empresas</option>
        {companies.map((company) => <option key={company.id} value={company.id}>{company.razaoSocial || company.nomeFantasia || company.cnpj || company.id}</option>)}
      </select>
    </label>
  );
};
