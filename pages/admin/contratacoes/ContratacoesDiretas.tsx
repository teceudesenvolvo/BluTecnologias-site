import React from 'react';
import { Handshake } from 'lucide-react';

export const ContratacoesDiretas: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Handshake size={48} className="mb-4 opacity-20" />
      <p>Nenhuma contratação direta encontrada.</p>
    </div>
  );
};