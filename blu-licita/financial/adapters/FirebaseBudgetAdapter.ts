import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import { companySettingsService } from "../../../services/firestoreSettingsService";
import type { BudgetInput } from "../domain/budgetTypes";

const list = async (name: string, companyId: string) => {
  const snapshot = await getDocs(query(collection(db, name), where("companyId", "==", companyId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};

const now = () => new Date().toISOString();
const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replaceAll("/", "-");

const normalizeItem = (item: any, position: number, budgetId: string, companyId: string, userId: string) => {
  const quantity = Number(item.quantityMilliUnits || 0) / 1000;
  const subtotalCents = Math.round(Number(item.unitPriceCents || 0) * quantity);
  const taxPercent = Number(item.taxPercent || 0);
  const taxCents = Math.round((subtotalCents * taxPercent) / 100);
  const logisticsCents = Number(item.logisticsCents || 0);
  const additionalExpensesCents = Number(item.additionalExpensesCents || 0);
  const totalCents = subtotalCents + taxCents + logisticsCents + additionalExpensesCents;
  const costCents = Math.round(Number(item.unitCostCents || 0) * quantity) + taxCents + logisticsCents + additionalExpensesCents;

    return {
      itemType: item.itemType || "product",
      catalogItemId: item.catalogItemId || "",
      productService: item.productService || "",
      description: item.description || "",
      quantityMilliUnits: Number(item.quantityMilliUnits || 0),
      unit: item.unit || "un",
      unitCostCents: Number(item.unitCostCents || 0),
      unitPriceCents: Number(item.unitPriceCents || 0),
      taxPercent,
      taxCents,
      taxRegime: item.taxRegime || "",
      taxCode: item.taxCode || "",
      serviceCode: item.serviceCode || "",
      ncm: item.ncm || "",
      cfop: item.cfop || "",
      issPercent: Number(item.issPercent || 0),
      icmsPercent: Number(item.icmsPercent || 0),
      pisPercent: Number(item.pisPercent || 0),
      cofinsPercent: Number(item.cofinsPercent || 0),
      logisticsCents,
      additionalExpensesCents,
    totalCents,
    marginCents: totalCents - costCents,
    position,
    budgetId,
    companyId,
    updatedAt: now(),
    updatedBy: userId,
  };
};

const totals = (items: any[]) => {
  const totalBudgetedCents = items.reduce((sum, item) => sum + Number(item.totalCents || 0), 0);
  const totalCostCents = items.reduce((sum, item) => {
    const quantity = Number(item.quantityMilliUnits || 0) / 1000;
    return sum + Math.round(Number(item.unitCostCents || 0) * quantity) + Number(item.taxCents || 0) + Number(item.logisticsCents || 0) + Number(item.additionalExpensesCents || 0);
  }, 0);
  return { totalBudgetedCents, totalCostCents, totalMarginCents: totalBudgetedCents - totalCostCents };
};

export class FirebaseBudgetAdapter {
  async load(companyId: string) {
    const [budgets, items, projects, costCenters, transactions, clients, members, products, serviceOrders, companies] = await Promise.all(
      [
        ...["budgets", "budgetItems", "projects", "costCenters", "financialTransactions", "clients", "teamMembers", "products", "serviceOrders"].map((name) => list(name, companyId)),
        companySettingsService.getAll().catch(() => []),
      ],
    );
    return { budgets, items, projects, costCenters, transactions, clients, members, products, serviceOrders, companies };
  }

  async command(value: any) {
    const { action, budgetId, companyId, userId } = value;
    if (!companyId || !userId) throw new Error("Empresa ou usuário não identificado para salvar o orçamento.");

    if (action === "save") return this.saveBudget(value.input, budgetId, companyId, userId);
    if (action === "approve") return updateDoc(doc(db, "budgets", budgetId), { status: "approved", approvedAt: now(), approvedBy: userId, updatedAt: now(), updatedBy: userId });
    if (action === "reject") return updateDoc(doc(db, "budgets", budgetId), { status: "rejected", rejectedReason: value.reason || "", updatedAt: now(), updatedBy: userId });
    if (action === "duplicate") return this.duplicateBudget(budgetId, companyId, userId);
    if (action === "delete") return this.deleteBudget(budgetId, companyId);
    throw new Error("Ação de orçamento não suportada.");
  }

  private async saveBudget(input: BudgetInput, budgetId: string | undefined, companyId: string, userId: string) {
    const id = budgetId || makeId();
    const items = (input.items || []).map((item, index) => normalizeItem(item, index, id, companyId, userId));
    const computed = totals(items);
    const budgetRef = doc(db, "budgets", id);
    const previousItems = budgetId ? await getDocs(query(collection(db, "budgetItems"), where("companyId", "==", companyId), where("budgetId", "==", budgetId))) : undefined;
    const budgetPayload = {
      ...input,
      items: undefined,
      ...computed,
      realizedCents: 0,
      rootBudgetId: budgetId || id,
      companyId,
      createdAt: (input as any).createdAt || now(),
      createdBy: (input as any).createdBy || userId,
      updatedAt: now(),
      updatedBy: userId,
    };

    delete (budgetPayload as any).items;

    const batch = writeBatch(db);
    if (previousItems) previousItems.docs.forEach((item) => batch.delete(item.ref));
    batch.set(budgetRef, budgetPayload, { merge: true });
    items.forEach((item) => batch.set(doc(collection(db, "budgetItems")), { ...item, createdAt: now(), createdBy: userId }));
    await batch.commit();
  }

  private async duplicateBudget(budgetId: string, companyId: string, userId: string) {
    const budgets = await list("budgets", companyId);
    const original = budgets.find((item: any) => item.id === budgetId) as any;
    if (!original) throw new Error("Orçamento original não encontrado.");
    const items = await list("budgetItems", companyId);
    const originalItems = items.filter((item: any) => item.budgetId === budgetId).sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));
    const newId = makeId();
    const nextVersion = Number(original.versionNumber || 1) + 1;
    const normalizedItems = originalItems.map((item: any, index: number) => normalizeItem(item, index, newId, companyId, userId));
    const computed = totals(normalizedItems);

    const batch = writeBatch(db);
    batch.update(doc(db, "budgets", budgetId), { status: "replaced", updatedAt: now(), updatedBy: userId });
    const { id: _ignoredId, ...originalWithoutId } = original;
    batch.set(doc(db, "budgets", newId), {
      ...originalWithoutId,
      ...computed,
      status: "draft",
      versionNumber: nextVersion,
      previousVersionId: budgetId,
      rootBudgetId: original.rootBudgetId || budgetId,
      companyId,
      createdAt: now(),
      createdBy: userId,
      updatedAt: now(),
      updatedBy: userId,
    });
    normalizedItems.forEach((item) => batch.set(doc(collection(db, "budgetItems")), { ...item, createdAt: now(), createdBy: userId }));
    await batch.commit();
  }

  private async deleteBudget(budgetId: string, companyId: string) {
    if (!budgetId) throw new Error("Orçamento não informado.");
    const items = await getDocs(query(collection(db, "budgetItems"), where("companyId", "==", companyId), where("budgetId", "==", budgetId)));
    const batch = writeBatch(db);
    items.docs.forEach((item) => batch.delete(item.ref));
    batch.delete(doc(db, "budgets", budgetId));
    await batch.commit();
  }
}
