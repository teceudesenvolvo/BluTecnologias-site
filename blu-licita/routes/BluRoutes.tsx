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
  CalendarPage,
  OrdersPage,
  ReportsPage,
  SettingsPage,
} from "../pages/CommercialModulesPage";
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

const ProtectedLayout: React.FC = () => {
  const { user } = useBluAuth();
  const location = useLocation();
  return user ? (
    <BluAppLayout />
  ) : (
    <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  );
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
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 xl:sticky xl:top-24">
        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Sistema financeiro</p>
        {operational.map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${section===id?'bg-slate-950 text-white':'text-slate-600 hover:bg-slate-50'}`}><span>{label}</span>{!['financialOverview','cashFlow','collections','taxes','invoices','banking','reconciliation','projects','costCenters','budgets','dre','reports','settings'].includes(id)&&<span className={`text-[8px] font-bold uppercase ${section===id?'text-slate-300':'text-slate-400'}`}>Em breve</span>}</button>)}
        <div className="my-3 border-t border-slate-100"/>
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Operação diária</p>
        {core.map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${section===id?'bg-blue-50 text-blue-700':'text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
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
    <section className="rounded-2xl border border-slate-200 bg-white p-8">
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
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="crm" element={<CrmBoardPage />} />
        <Route path="equipe" element={<TeamPage />} />
        <Route path="licitacoes" element={<SavedBiddingsPage />} />
        <Route path="ordens" element={<OrdersPage />} />
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
        <Route path="novidades" element={<News />} />
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
        <Route path="pipeline" element={<ModulePlaceholderPage />} />
      </Route>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </BluAuthProvider>
);
