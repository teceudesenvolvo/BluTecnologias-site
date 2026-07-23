import React from 'react';
import { HashRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Sem Login
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Blog } from './pages/Blog';

// Produtos
import { BluGov } from './pages/softwares/BluGov';
import { PortalServicos } from './pages/softwares/PortalServicos';
import { PortalLegislativo } from './pages/softwares/PortalLegislativo';
import { AppCamara } from './pages/softwares/AppCamara';
import { BluEscolar } from './pages/softwares/BluEscolar';
import { Contact } from './pages/Contact';
import { ProductDetails } from './pages/softwares/ProductDetails';
import { BlogPost } from './pages/BlogPost';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { PlansPage } from './blu-licita/billing/pages/PlansPage';
import { OnboardingPage } from './blu-licita/pages/OnboardingPage';

// Com Login
import { BluRoutes } from './blu-licita/routes/BluRoutes';


const AppContent: React.FC = () => {
  const location = useLocation();
  const isSystem = location.pathname.startsWith('/admin') || location.pathname.startsWith('/blu');
  const isLanding = location.pathname === '/';
  const hideFooter = location.pathname === '/login' || isSystem || isLanding;
  const hideNavbar = location.pathname === '/login' || isSystem || isLanding;

  return (
      <div className={`font-sans text-slate-900 min-h-screen flex flex-col ${isLanding ? 'bg-white' : 'bg-slate-100'}`}>
        {!hideNavbar && <Navbar />}
        <main className="flex-grow">
          <Routes>
            {/* Sem Login */}
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/planos" element={<PlansPage />} />
            <Route path="/cadastro" element={<OnboardingPage />} />
            <Route path="/contact" element={<Contact />} />
           {/* Produtos */}
            <Route path="/products" element={<Products />} />
            <Route path="/products/1" element={<PortalServicos />} />
            <Route path="/products/2" element={<PortalLegislativo />} />
            <Route path="/products/3" element={<AppCamara />} />
            <Route path="/products/4" element={<BluEscolar />} />
            <Route path="/products/5" element={<BluGov />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/privacy/:id" element={<PrivacyPolicyPage />} />
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
    <Router>
      <AppContent />
    </Router>
  );
};
 
export default App;
