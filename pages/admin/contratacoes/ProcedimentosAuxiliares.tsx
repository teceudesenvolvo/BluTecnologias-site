import React from 'react';
import { Layers } from 'lucide-react';

export const ProcedimentosAuxiliares: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Layers size={48} className="mb-4 opacity-20" />
      <p>Nenhum procedimento auxiliar encontrado.</p>
    </div>
  );
};