import React from 'react';
import { ClipboardList } from 'lucide-react';

export const ARPs: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">ARPs</h3>
        <p className="text-slate-500">Gerencie as Atas de Registro de Preços.</p>
      </div>
      <div className="min-h-[400px] flex flex-col items-center justify-center py-20 text-slate-400">
        <ClipboardList size={48} className="mb-4 opacity-20" />
        <p>Nenhuma ARP encontrada.</p>
      </div>
    </div>
  );
};