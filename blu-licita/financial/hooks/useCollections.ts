import React from "react";
import { useBluAuth } from "../../contexts/BluAuthContext";
import { FirebaseCollectionAdapter } from "../adapters/FirebaseCollectionAdapter";
import type { CollectionEvent, CollectionInput, FinancialCollection } from "../domain/collectionTypes";
import { CollectionService } from "../services/CollectionService";

const service = new CollectionService(new FirebaseCollectionAdapter());

export const useCollections = () => {
  const { user } = useBluAuth();
  const context = React.useMemo(
    () => ({
      companyId: user?.companyId || "",
      userId: user?.id || "",
    }),
    [user],
  );

  const [items, setItems] = React.useState<FinancialCollection[]>([]);
  const [events, setEvents] = React.useState<CollectionEvent[]>([]);
  const [aux, setAux] = React.useState<any>({
    clients: [],
    contracts: [],
    projects: [],
    centers: [],
    accounts: [],
    paymentMethods: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    if (!context.companyId) {
      setItems([]);
      setEvents([]);
      setAux({
        clients: [],
        contracts: [],
        projects: [],
        centers: [],
        accounts: [],
        paymentMethods: [],
      });
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [loadedItems, loadedEvents, loadedAux] = await service.load(context);
      setItems(loadedItems);
      setEvents(loadedEvents);
      setAux(loadedAux);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar as cobranças.");
    } finally {
      setLoading(false);
    }
  }, [context]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const run = async (fn: () => Promise<any>) => {
    setSaving(true);
    setError("");
    try {
      await fn();
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
    events,
    aux,
    loading,
    saving,
    error,
    dashboard: service.dashboard(items),
    reload,
    save: (value: CollectionInput, id?: string) => run(() => service.save(context, value, id)),
    receive: (id: string, amount: number, date: string, bank: string, reason?: string) =>
      run(() => service.receive(context, id, amount, date, bank, reason)),
    event: (id: string, type: any, date: string, extra?: Record<string, unknown>) =>
      run(() => service.event(context, id, type, date, extra)),
    command: (id: string, action: any, reason?: string) =>
      run(() => service.command(context, id, action, reason)),
  };
};
