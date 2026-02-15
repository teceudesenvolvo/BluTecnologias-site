import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3">
              <img
                className="h-10 w-auto rounded-lg"
                src={logo}
                alt="Blu Tecnologias"
              />
              <span className="font-bold text-xl text-blue-900 tracking-tight">
                Blu Tecnologias
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link to="/" className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Início</Link>
            <Link to="/products" className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Soluções</Link>
            <Link to="/blog" className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Blog</Link>
            <Link to="/admin" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">Área do Cliente</Link>
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-blue-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/" 
              className="block text-slate-600 hover:text-blue-600 hover:bg-slate-50 px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Início
            </Link>
            <Link 
              to="/products" 
              className="block text-slate-600 hover:text-blue-600 hover:bg-slate-50 px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Soluções
            </Link>
            <Link 
              to="/blog" 
              className="block text-slate-600 hover:text-blue-600 hover:bg-slate-50 px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Blog
            </Link>
            <Link 
              to="/admin" 
              className="block w-full text-left text-blue-600 font-medium hover:bg-blue-50 px-3 py-2 rounded-md text-base"
              onClick={() => setIsOpen(false)}
            >
              Área do Cliente
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};