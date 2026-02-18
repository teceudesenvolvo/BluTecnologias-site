import React from 'react';
import { FileCheck } from 'lucide-react';

export const CRCs: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">CRCs</h3>
        <p className="text-slate-500">Gerencie os Certificados de Registro Cadastral.</p>
      </div>
      <div className="min-h-[400px] flex flex-col items-center justify-center py-20 text-slate-400">
        <FileCheck size={48} className="mb-4 opacity-20" />
        <p>Nenhum CRC encontrado.</p>
      </div>
    </div>
  );
};