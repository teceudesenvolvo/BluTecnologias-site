import React from 'react';
import { Gavel } from 'lucide-react';

export const Licitacoes: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Gavel size={48} className="mb-4 opacity-20" />
      <p>Nenhuma licitação encontrada.</p>
    </div>
  );
};