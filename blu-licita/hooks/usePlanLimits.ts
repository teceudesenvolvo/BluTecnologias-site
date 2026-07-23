import React from "react";
import { auth } from "../../services/firebase";
import { useOptionalBluAuth } from "../contexts/BluAuthContext";
import { subscriptionPlanService, type CompanySubscription, type PlanLimits } from "../services/subscriptionPlanService";

const currentCompanyId = (bluCompanyId?: string) => {
  if (bluCompanyId) return bluCompanyId;
  try {
    const storedUser = JSON.parse(localStorage.getItem("blu-licita:user") || "null");
    if (storedUser?.companyId) return storedUser.companyId;
  } catch {
    // ignore corrupted local state
  }
  return auth.currentUser?.uid ? `company-${auth.currentUser.uid}` : "";
};

export const usePlanLimits = () => {
  const authContext = useOptionalBluAuth();
  const companyId = currentCompanyId(authContext?.user?.companyId);
  const [subscription, setSubscription] = React.useState<CompanySubscription>({ plan: "essential", status: "active" });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    subscriptionPlanService.get(companyId).then(setSubscription).finally(() => setLoading(false));
  }, [companyId]);

  const limits = React.useMemo(() => subscriptionPlanService.effectiveLimits(subscription), [subscription]);
  const allowed = React.useCallback((key: keyof PlanLimits, current: number) => {
    const limit = limits[key];
    if (typeof limit !== "number") return true;
    return current < limit;
  }, [limits]);
  const label = React.useCallback((key: keyof PlanLimits) => {
    const limit = limits[key];
    return limit === null ? "Ilimitado" : String(limit);
  }, [limits]);
  const message = React.useCallback((resource: string, key: keyof PlanLimits) => {
    const limit = limits[key];
    return limit === null ? "" : `Limite do plano atingido: ${resource}. Limite atual: ${limit}.`;
  }, [limits]);

  return { subscription, limits, loading, allowed, label, message };
};

export const PlanLimitWarning = ({ children }: { children: React.ReactNode }) => (
  React.createElement(
    "div",
    { className: "flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 sm:flex-row sm:items-center sm:justify-between" },
    React.createElement("span", null, children),
    React.createElement(
      "a",
      { href: "#/admin/planos", className: "inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-amber-700" },
      "Fazer upgrade",
    ),
  )
);
