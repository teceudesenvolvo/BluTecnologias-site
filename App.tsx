import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Sem Login
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Blog } from './pages/Blog';
import { Login } from './pages/Login';

// Produtos
import { BluGov } from './pages/softwares/BluGov';
import { PortalServicos } from './pages/softwares/PortalServicos';
import { PortalLegislativo } from './pages/softwares/PortalLegislativo';
import { AppCamara } from './pages/softwares/AppCamara';
import { BluEscolar } from './pages/softwares/BluEscolar';
import { Contact } from './pages/Contact';
import { ProductDetails } from './pages/softwares/ProductDetails';
import { BlogPost } from './pages/BlogPost';

// Com Login
import { Admin } from './pages/Admin';


const AppContent: React.FC = () => {
  const location = useLocation();
  const hideFooter = ['/login', '/admin'].includes(location.pathname);
  const hideNavbar = ['/login', '/admin'].includes(location.pathname);

  return (
      <div className="font-sans text-slate-900 bg-slate-100 min-h-screen flex flex-col">
        {!hideNavbar && <Navbar />}
        <main className="flex-grow">
          <Routes>
            {/* Sem Login */}
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/contact" element={<Contact />} />
           {/* Produtos */}
            <Route path="/products" element={<Products />} />
            <Route path="/products/1" element={<PortalServicos />} />
            <Route path="/products/2" element={<PortalLegislativo />} />
            <Route path="/products/3" element={<AppCamara />} />
            <Route path="/products/4" element={<BluEscolar />} />
            <Route path="/products/5" element={<BluGov />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            {/* Com Login */}
            <Route path="/admin" element={<Admin />} />
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
