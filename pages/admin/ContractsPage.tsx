import React from 'react';
import { FileSignature } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">Contratos</h3>
        <p className="text-slate-500">Gerencie todos os contratos.</p>
      </div>
      <div className="min-h-[400px] flex flex-col items-center justify-center py-20 text-slate-400">
        <FileSignature size={48} className="mb-4 opacity-20" />
        <p>Nenhum contrato encontrado.</p>
      </div>
    </div>
  );
};