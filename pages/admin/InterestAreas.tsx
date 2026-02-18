import React from 'react';
import { Target } from 'lucide-react';

export const InterestAreas: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">Áreas de Interesse</h3>
        <p className="text-slate-500">Gerencie as áreas de interesse para licitações.</p>
      </div>
      <div className="min-h-[400px] flex flex-col items-center justify-center py-20 text-slate-400">
        <Target size={48} className="mb-4 opacity-20" />
        <p>Nenhuma área de interesse configurada.</p>
      </div>
    </div>
  );
};