import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BluAuthProvider, useBluAuth } from "../contexts/BluAuthContext";
import { BluAppLayout } from "../layouts/BluAppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { BluLoginPage } from "../pages/LoginPage";
import { ModulePlaceholderPage } from "../pages/ModulePlaceholderPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { News } from "../../pages/admin/News";
import { FinancialData } from "../../pages/admin/FinancialData";
import { Tasks } from "../../pages/admin/Tasks";
import { Clients } from "../../pages/admin/Clients";
import { Certificates } from "../../pages/admin/Certificates";
import { Profile } from "../../pages/admin/Profile";
import { Quotes } from "../../pages/admin/Quotes";
import { Procurements } from "../../pages/admin/Procurements";
import { CRCs } from "../../pages/admin/CRCs";
import { ContractsPage } from "../../pages/admin/ContractsPage";
import { ARPs } from "../../pages/admin/ARPs";
import { InterestAreas } from "../../pages/admin/InterestAreas";
import { Webmail } from "../../pages/admin/Webmail";
import { PrivacyPolicyGenerator } from "../../pages/admin/PrivacyPolicyGenerator";
import { IntegrationsPage } from "../pages/IntegrationsPage";
import { OpportunitiesPage } from "../pages/OpportunitiesPage";
import { InterestSettingsPage } from "../pages/InterestSettingsPage";
import {
  SettingsPage,
} from "../pages/CommercialModulesPage";
import { CalendarPage } from "../pages/CalendarPage";
import { OrdersPage } from "../pages/OrdersPage";
import { ReportsPage } from "../pages/ReportsPage";
import { ProductsPage } from "../pages/ProductsPage";
import { SavedBiddingsPage } from "../pages/SavedBiddingsPage";
import { FinancialCenterPage } from "../pages/FinancialCenterPage";
import { FinancialPhaseOnePage, type FinancialCoreView } from "../financial/pages/FinancialPhaseOnePage";
import { FinancialSettingsPage } from "../financial/pages/FinancialSettingsPage";
import { BankAccountsPage } from "../financial/pages/BankAccountsPage";
import { CostCentersPage } from "../financial/pages/CostCentersPage";
import { FinancialProjectsPage } from "../financial/pages/FinancialProjectsPage";
import { CashFlowPage } from "../financial/pages/CashFlowPage";
import { CollectionsPage } from "../financial/pages/CollectionsPage"; // módulo financeiro unificado
import { FiscalDocumentsPage } from "../financial/pages/FiscalDocumentsPage"; // gestão fiscal
import { TaxManagementPage } from "../financial/pages/TaxManagementPage";
import { BankReconciliationPage } from "../financial/pages/BankReconciliationPage";
import { BudgetsPage } from "../financial/pages/BudgetsPage";
import { DreManagementPage } from "../financial/pages/DreManagementPage";
import { FinancialExecutiveOverviewPage } from "../financial/pages/FinancialExecutiveOverviewPage";
import { FinancialReportsPage } from "../financial/pages/FinancialReportsPage";
import { DocumentDrivePage } from "../pages/DocumentDrivePage";
import { CrmBoardPage } from "../pages/CrmBoardPage";
import { TeamPage } from "../pages/TeamPage";
import { MemberSignupPage } from "../pages/MemberSignupPage";
import { AccessSettingsPage } from "../pages/AccessSettingsPage";
import { PlansSettingsPage } from "../pages/PlansSettingsPage";
import { PlansPage } from "../billing/pages/PlansPage";
import { SubscriptionPage } from "../billing/pages/SubscriptionPage";
import { CheckoutReturnPage } from "../billing/pages/CheckoutReturnPage";
import { BluHqPage } from "../pages/BluHqPage";
import { SupportPage } from "../pages/SupportPage";
import { MigrationPage } from "../pages/MigrationPage";

const ProtectedLayout: React.FC = () => {
  const { user } = useBluAuth();
  const location = useLocation();
  return user ? (
    <BluAppLayout />
  ) : (
    <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  );
};

const PlatformAdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useBluAuth();
  const isBluPlatformAdmin = String(user?.email || "").toLowerCase() === "admin@blutecnologias.com.br";
  return isBluPlatformAdmin ? <>{children}</> : <Navigate to="/admin/dashboard" replace />;
};

const UnifiedFinancialRoute: React.FC = () => {
  type FinancialSection =
    | "financialOverview"
    | FinancialCoreView
    | "cashFlow"
    | "collections"
    | "taxes"
    | "invoices"
    | "banking"
    | "reconciliation"
    | "projects"
    | "costCenters"
    | "dre"
    | "reports"
    | "settings";
  const [section, setSection] = React.useState<FinancialSection>("financialOverview");
  const operational: Array<[FinancialSection, string]> = [
    ["financialOverview", "Visão financeira"],
    ["cashFlow", "Fluxo de Caixa"],
    ["collections", "Cobranças"],
    ["taxes", "Gestão tributária"],
    ["invoices", "Notas Fiscais"],
    ["banking", "Contas Bancárias"],
    ["reconciliation", "Conciliação"],
    ["projects", "Projetos"],
    ["costCenters", "Centro de Custo"],
    ["dre", "DRE Gerencial"],
    ["reports", "Relatórios"],
    ["settings", "Configurações"],
  ];
  const core:Array<[FinancialCoreView,string]>=[["overview","Visão Geral"],["receivables","Contas a Receber"],["payables","Contas a Pagar"],["movements","Movimentações"]];
  const allFinancialSections: Array<[FinancialSection | FinancialCoreView, string, string]> = [
    ...operational.map(([id, label]) => [id, label, "Sistema financeiro"] as [FinancialSection, string, string]),
    ...core.map(([id, label]) => [id, label, "Operação diária"] as [FinancialCoreView, string, string]),
  ];
  const planned = {
    cashFlow: [
      "Fluxo de Caixa",
      "Acompanhe entradas, saídas, saldo acumulado e projeções nos cenários previsto e realizado.",
    ],
    invoices: [
      "Notas Fiscais",
      "Organize notas de entrada e saída, documentos fiscais, valores, contratos e situação de pagamento.",
    ],
    banking: [
      "Contas Bancárias",
      "Administre contas, caixas, saldos e movimentações por empresa e CNPJ.",
    ],
    reconciliation: [
      "Conciliação",
      "Compare lançamentos financeiros com extratos importados e trate divergências.",
    ],
    projects: [
      "Projetos",
      "Acompanhe receita, custo, orçamento e margem de cada contrato ou operação.",
    ],
    costCenters: [
      "Centros de Custo",
      "Estruture áreas da empresa e analise despesas diretas, indiretas e orçamentos.",
    ],
    dre: [
      "DRE Gerencial",
      "Analise receita líquida, custos, despesas operacionais e resultado gerencial.",
    ],
    reports: [
      "Relatórios",
      "Gere análises financeiras por empresa, órgão, contrato, projeto e período.",
    ],
    settings: [
      "Configurações Financeiras",
      "Configure categorias, contas, preferências, permissões e parâmetros financeiros.",
    ],
  } as const;
  return (
    <div className="mx-auto grid max-w-[1700px] gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/65 bg-white/72 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl xl:hidden dark:border-white/10 dark:bg-white/[0.075] dark:shadow-black/20">
        <label className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 dark:text-slate-300">
          Seção financeira
          <select
            value={section}
            onChange={(event) => setSection(event.target.value as FinancialSection)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/8 dark:text-white"
          >
            {allFinancialSections.map(([id, label, group]) => (
              <option key={id} value={id}>{group} · {label}</option>
            ))}
          </select>
        </label>
      </section>
      <aside className="hidden h-fit rounded-2xl border border-white/65 bg-white/72 p-2 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl xl:sticky xl:top-24 xl:block dark:border-white/10 dark:bg-white/[0.075] dark:shadow-black/20">
        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 dark:text-slate-300">Sistema financeiro</p>
        {operational.map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${section===id?'bg-slate-950 text-white dark:bg-blue-500/[0.18] dark:text-blue-100 dark:ring-1 dark:ring-blue-300/20':'text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'}`}><span>{label}</span>{!['financialOverview','cashFlow','collections','taxes','invoices','banking','reconciliation','projects','costCenters','budgets','dre','reports','settings'].includes(id)&&<span className={`text-[8px] font-bold uppercase ${section===id?'text-slate-300 dark:text-blue-200':'text-slate-400 dark:text-slate-500'}`}>Em breve</span>}</button>)}
        <div className="my-3 border-t border-slate-100 dark:border-white/10"/>
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 dark:text-slate-300">Operação diária</p>
        {core.map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${section===id?'bg-blue-50 text-blue-700 dark:bg-blue-500/[0.18] dark:text-blue-100 dark:ring-1 dark:ring-blue-300/20':'text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'}`}>{label}</button>)}
      </aside>
      <main className="min-w-0">
        {section === "financialOverview" ? <FinancialExecutiveOverviewPage /> : core.some(([id])=>id===section) ? <FinancialPhaseOnePage view={section as FinancialCoreView} embedded /> : section === "collections" ? <CollectionsPage /> : section === "invoices" ? <FiscalDocumentsPage /> : section === "taxes" ? <TaxManagementPage /> : section === "reconciliation" ? <BankReconciliationPage /> : section === "settings" ? <FinancialSettingsPage /> : section === "banking" ? <BankAccountsPage /> : section === "costCenters" ? <CostCentersPage /> : section === "projects" ? <FinancialProjectsPage /> : section === "dre" ? <DreManagementPage /> : section === "reports" ? <FinancialReportsPage /> : section === "cashFlow" ? <CashFlowPage /> : <FinancialSectionLanding title={planned[section as keyof typeof planned][0]} description={planned[section as keyof typeof planned][1]} />}
      </main>
    </div>
  );
};

const FinancialSectionLanding: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div className="mx-auto max-w-[1500px] space-y-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">
        Módulo financeiro
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </header>
    <section className="rounded-2xl border border-white/65 bg-white/72 p-8 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.075] dark:shadow-black/20">
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600">
          b
        </div>
        <h2 className="mt-5 text-xl font-bold">{title} na Blu</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          A estrutura desta área já faz parte da central financeira. Os
          registros serão conectados por empresa, contrato, projeto, centro de
          custo e responsável.
        </p>
      </div>
    </section>
  </div>
);

export const BluRoutes: React.FC = () => (
  <BluAuthProvider>
    <Routes>
      <Route path="login" element={<BluLoginPage />} />
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route path="cadastro-membro" element={<MemberSignupPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="planos" element={<PlansPage />} />
        <Route path="assinatura" element={<SubscriptionPage />} />
        <Route path="assinatura/checkout" element={<PlansPage />} />
        <Route path="assinatura/retorno" element={<CheckoutReturnPage />} />
        <Route path="assinatura/cobrancas" element={<SubscriptionPage />} />
        <Route path="assinatura/pagamentos" element={<SubscriptionPage />} />
        <Route path="assinatura/uso" element={<SubscriptionPage />} />
        <Route path="suporte" element={<SupportPage />} />
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="crm" element={<CrmBoardPage />} />
        <Route path="equipe" element={<TeamPage />} />
        <Route path="licitacoes" element={<SavedBiddingsPage />} />
        <Route path="ordens" element={<OrdersPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route
          path="cobrancas"
          element={<Navigate to="/admin/financeiro/cobrancas" replace />}
        />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="integracoes" element={<IntegrationsPage />} />
        <Route
          path="certidoes"
          element={<Navigate to="/admin/documentos" replace />}
        />
        <Route path="novidades" element={<PlatformAdminOnly><News /></PlatformAdminOnly>} />
        <Route path="hq" element={<PlatformAdminOnly><BluHqPage /></PlatformAdminOnly>} />
        <Route path="migracao" element={<PlatformAdminOnly><MigrationPage /></PlatformAdminOnly>} />
        <Route path="orcamentos" element={<BudgetsPage />} />
        <Route path="financeiro" element={<UnifiedFinancialRoute />} />
        <Route path="financeiro/visao-geral" element={<FinancialExecutiveOverviewPage />} />
        <Route path="financeiro/configuracoes" element={<FinancialSettingsPage />} />
        <Route path="financeiro/contas-bancarias" element={<BankAccountsPage />} />
        <Route path="financeiro/centros-de-custo" element={<CostCentersPage />} />
        <Route path="financeiro/projetos" element={<FinancialProjectsPage />} />
        <Route path="financeiro/fluxo-de-caixa" element={<CashFlowPage />} />
        <Route
          path="financeiro/cobrancas"
          element={<CollectionsPage />}
        />
        <Route path="financeiro/notas-fiscais" element={<FiscalDocumentsPage />} />
        <Route path="financeiro/gestao-tributaria" element={<TaxManagementPage />} />
        <Route path="financeiro/conciliacao" element={<BankReconciliationPage />} />
        <Route path="financeiro/orcamentos" element={<Navigate to="/admin/orcamentos" replace />} />
        <Route path="financeiro/dre-gerencial" element={<DreManagementPage />} />
        <Route path="financeiro/relatorios" element={<FinancialReportsPage />} />
        <Route
          path="financeiro/tributos"
          element={<Navigate to="/admin/financeiro" replace />}
        />
        <Route path="dados-financeiros" element={<FinancialData />} />
        <Route path="tarefas" element={<Tasks />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="documentos" element={<DocumentDrivePage />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="cotacoes" element={<Quotes />} />
        <Route path="contratacoes" element={<Procurements />} />
        <Route path="crcs" element={<CRCs />} />
        <Route path="contratos" element={<ContractsPage />} />
        <Route path="arps" element={<ARPs />} />
        <Route path="areas-interesse" element={<InterestAreas />} />
        <Route path="webmail" element={<Webmail />} />
        <Route path="privacidade" element={<PrivacyPolicyGenerator />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route
          path="configuracoes/integracoes"
          element={<IntegrationsPage />}
        />
        <Route
          path="configuracoes/areas-interesse"
          element={<InterestSettingsPage />}
        />
        <Route
          path="configuracoes/niveis-acesso"
          element={<AccessSettingsPage />}
        />
        <Route
          path="configuracoes/planos"
          element={<PlansSettingsPage />}
        />
        <Route path="pipeline" element={<ModulePlaceholderPage />} />
      </Route>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </BluAuthProvider>
);
