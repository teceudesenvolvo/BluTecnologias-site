import React from 'react';
import { DollarSign } from 'lucide-react';

export const Financial: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] flex flex-col items-center justify-center text-slate-400">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <DollarSign size={40} className="opacity-20" />
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-2">Módulo Financeiro</h3>
        <p>A funcionalidade de Financeiro estará disponível em breve.</p>
    </div>
  );
};
