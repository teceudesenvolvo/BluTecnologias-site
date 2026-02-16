import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png'; 

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={Logo} alt="Blu Tecnologias" className="h-12 w-auto rounded-xl" />
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Soluções inteligentes para gestão pública. Conectando cidadãos e governo com transparência e eficiência.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 mb-4">Produtos</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/products" className="hover:text-blue-600">Portal de Serviços</Link></li>
              <li><Link to="/products" className="hover:text-blue-600">Portal do Legislativo</Link></li>
              <li><Link to="/products" className="hover:text-blue-600">App da Câmara</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/blog" className="hover:text-blue-600">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-blue-600">Fale Conosco</Link></li>
              <li><a href="#" className="hover:text-blue-600">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-blue-600">Carreiras</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>contato@blutecnologias.com.br</li>
              <li>Fortaleza, CE</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
          <p>&copy; 2024 Blu Tecnologias. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-blue-600">Privacidade</a>
            <a href="#" className="hover:text-blue-600">Termos</a>
          </div>
        </div>
      </div>
    </footer>
  );
};