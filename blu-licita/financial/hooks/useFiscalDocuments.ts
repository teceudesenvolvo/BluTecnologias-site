import React from "react";
import { useBluAuth } from "../../contexts/BluAuthContext";
import { FirebaseFiscalDocumentAdapter } from "../adapters/FirebaseFiscalDocumentAdapter";
import type { FiscalDocument, FiscalDocumentInput } from "../domain/fiscalDocumentTypes";
import { FiscalDocumentService } from "../services/FiscalDocumentService";

const service = new FiscalDocumentService(new FirebaseFiscalDocumentAdapter());

export const useFiscalDocuments = () => {
  const { user } = useBluAuth();
  const context = React.useMemo(
    () => ({ companyId: user?.companyId || "", userId: user?.id || "" }),
    [user],
  );
  const [items, setItems] = React.useState<FiscalDocument[]>([]);
  const [aux, setAux] = React.useState<any>({
    clients: [],
    contracts: [],
    collections: [],
    projects: [],
    centers: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    if (!context.companyId) {
      setItems([]);
      setAux({ clients: [], contracts: [], collections: [], projects: [], centers: [] });
      setError("Sua conta não está vinculada a uma empresa. Selecione ou vincule uma empresa para acessar as notas fiscais.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [loadedItems, loadedAux] = await service.load(context);
      setItems(loadedItems);
      setAux(loadedAux);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar as notas fiscais.");
    } finally {
      setLoading(false);
    }
  }, [context]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const run = async (operation: () => Promise<any>) => {
    setSaving(true);
    setError("");
    try {
      await operation();
      await reload();
    } catch (reason: any) {
      setError(reason?.message || "Operação não concluída.");
      throw reason;
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    aux,
    loading,
    saving,
    error,
    dashboard: service.dashboard(items),
    reload,
    save: (value: FiscalDocumentInput, id?: string) => run(() => service.save(context, value, id)),
    command: (id: string, action: any, value?: Record<string, unknown>) =>
      run(() => service.command(context, id, action, value)),
  };
};
