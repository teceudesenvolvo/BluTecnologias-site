import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png'; 
export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Soluções', path: '/products' },
    { name: 'Novidades', path: '/blog' },
    { name: 'Entrar', path: '/admin' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl shadow-lg px-6 py-3 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            {/* Using the provided logo image. Ensure 'logo.png' is in the public folder. */}
            <img 
              src={Logo} 
              alt="Blu Tecnologias" 
              className="h-12 w-auto object-contain group-hover:scale-105 transition-transform rounded-xl" 
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-all duration-300 hover:text-blue-600 ${
                  isActive(link.path) ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 active:translate-y-0">
              Fale com a gente
            </button>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden text-slate-600"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-24 left-6 right-6 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 md:hidden animate-fade-in-down">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`text-lg font-medium ${
                  isActive(link.path) ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg">
              Agendar Demo
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};