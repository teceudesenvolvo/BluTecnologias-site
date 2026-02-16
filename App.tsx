import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Blog } from './pages/Blog';
import { Admin } from './pages/Admin';
import { PortalServicos } from './pages/softwares/PortalServicos';
import { PortalLegislativo } from './pages/softwares/PortalLegislativo';
import { AppCamara } from './pages/softwares/AppCamara';
import { Login } from './pages/Login';

const App: React.FC = () => {
  return (
    <Router>
      <div className="font-sans text-slate-900 bg-slate-100 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/1" element={<PortalServicos />} />
            <Route path="/products/2" element={<PortalLegislativo />} />
            <Route path="/products/3" element={<AppCamara />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};
 
export default App;
