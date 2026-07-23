import React from "react";
import { useBluAuth } from "../../contexts/BluAuthContext";
import { FirebaseBudgetAdapter } from "../adapters/FirebaseBudgetAdapter";

const adapter = new FirebaseBudgetAdapter();

export const useBudgets = () => {
  const { user } = useBluAuth();
  const companyId = user?.companyId || "";
  const [data, setData] = React.useState<any>({ budgets: [], items: [], projects: [], costCenters: [], transactions: [], clients: [], members: [], companies: [] });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setData(await adapter.load(companyId));
      setError("");
    } catch (error: any) {
      setError(error.message || "Não foi possível carregar os orçamentos.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const command = async (value: any) => {
    setSaving(true);
    try {
      await adapter.command({ ...value, companyId, userId: user?.id });
      await reload();
    } catch (error: any) {
      setError(error.message || "Operação não concluída.");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { ...data, loading, saving, error, command };
};
