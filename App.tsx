import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Sem Login
import { Home } from './pages/Home';
import { BusinessLanding } from './pages/BusinessLanding';
import { AudienceGateway } from './pages/AudienceGateway';
import { Products } from './pages/Products';
import { Blog } from './pages/Blog';
import { BluToolsPage } from './pages/BluToolsPage';
import { ElectionResultsPage } from './pages/ElectionResults';
import { ElectionEconomyPage } from './pages/ElectionEconomyPage';
import { FpmCearaPage } from './pages/FpmCearaPage';

// Produtos
import { CidadesAI } from './pages/softwares/CidadesAI';
import { AppCamara } from './pages/softwares/AppCamara';
import { BluEscolar } from './pages/softwares/BluEscolar';
import { Contact } from './pages/Contact';
import { ProductDetails } from './pages/softwares/ProductDetails';
import { BlogPost } from './pages/BlogPost';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { PlansPage } from './blu-licita/billing/pages/PlansPage';
import { OnboardingPage } from './blu-licita/pages/OnboardingPage';
import { PartnerProgramPage } from './pages/PartnerProgramPage';
import { PublicStorePage } from './blu-licita/ecommerce/PublicStorePage';
import { GlobalFeedback } from './blu-licita/components/GlobalFeedback';
import { trackPageView } from './services/analytics';

// Com Login
import { BluRoutes } from './blu-licita/routes/BluRoutes';


const AppContent: React.FC = () => {
  const location = useLocation();
  React.useEffect(() => {
    const path = location.pathname;
    void trackPageView(path, document.title || 'Blu Tecnologias');
  }, [location.pathname]);
  const isSystem = location.pathname.startsWith('/admin') || location.pathname.startsWith('/blu');
  const isLanding = location.pathname === '/' || location.pathname === '/empresas' || location.pathname.startsWith('/empresas/');
  const isElectionResults = location.pathname === '/eleicoes/apuracao';
  const firstSegment = location.pathname.split('/').filter(Boolean)[0] || '';
  const institutionalRoots = new Set([
    'blog', 'login', 'planos', 'parceria', 'cadastro', 'contact', 'products', 'empresas',
    'privacy', 'admin', 'blu', 'eleicoes', 'ferramentas', 'economia', 'gestao-publica',
  ]);
  const isStorefront = Boolean(firstSegment) && !institutionalRoots.has(firstSegment);
  const hideFooter = location.pathname === '/login' || isSystem || isLanding || isStorefront || isElectionResults;
  const hideNavbar = location.pathname === '/login' || location.pathname === '/products' || isSystem || isLanding || isStorefront || isElectionResults;

  return (
      <div className={`font-sans text-slate-900 min-h-screen flex flex-col ${isLanding ? 'bg-white' : 'bg-slate-100'}`}>
        <GlobalFeedback />
        {!hideNavbar && <Navbar />}
        <main className="flex-grow">
          <Routes>
            {/* Sem Login */}
            <Route path="/" element={<AudienceGateway />} />
            <Route path="/empresas" element={<Home />} />
            <Route path="/empresas/comercio" element={<BusinessLanding type="comercio" />} />
            <Route path="/empresas/servicos" element={<BusinessLanding type="servicos" />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/ferramentas" element={<BluToolsPage />} />
            <Route path="/ferramentas/:slug" element={<BluToolsPage />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/eleicoes/apuracao" element={<ElectionResultsPage />} />
            <Route path="/economia/pos-eleicao-2026" element={<ElectionEconomyPage />} />
            <Route path="/gestao-publica/fpm-ceara" element={<FpmCearaPage />} />
            <Route path="/login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/planos" element={<PlansPage />} />
            <Route path="/parceria" element={<PartnerProgramPage />} />
            <Route path="/cadastro" element={<OnboardingPage />} />
            <Route path="/contact" element={<Contact />} />
           {/* Produtos */}
            <Route path="/products" element={<Products />} />
            <Route path="/products/1" element={<Navigate to="/products/3" replace />} />
            <Route path="/products/2" element={<Navigate to="/products/3" replace />} />
            <Route path="/products/3" element={<AppCamara />} />
            <Route path="/products/4" element={<BluEscolar />} />
            <Route path="/products/5" element={<CidadesAI />} />
            <Route path="/products/cidades-ai" element={<CidadesAI />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/privacy/:id" element={<PrivacyPolicyPage />} />
            <Route path="/:storeSlug/produto/:productSlug" element={<PublicStorePage product />} />
            <Route path="/:storeSlug/carrinho" element={<PublicStorePage cart />} />
            <Route path="/:storeSlug/checkout" element={<PublicStorePage checkout />} />
            <Route path="/:storeSlug" element={<PublicStorePage />} />
            {/* Com Login */}
            <Route path="/admin/*" element={<BluRoutes />} />
            <Route path="/blu/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
        {!hideFooter && <Footer />}
      </div>
  );
};

const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
};
 
export default App;
