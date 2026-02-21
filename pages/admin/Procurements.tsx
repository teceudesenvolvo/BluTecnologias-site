import React, { useState } from 'react';
import { Briefcase, Gavel, Handshake, Layers } from 'lucide-react';
import { MinhasContratacoes } from './contratacoes/MinhasContratacoes';
import { Licitacoes } from './contratacoes/Licitacoes';
import { ContratacoesDiretas } from './contratacoes/ContratacoesDiretas';
import { ProcedimentosAuxiliares } from './contratacoes/ProcedimentosAuxiliares';

export const Procurements: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'my_procurements' | 'biddings' | 'direct_contracting' | 'auxiliary_procedures'>('my_procurements');

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">Contratações</h3>
        <p className="text-slate-500">Gerencie seus processos de contratação e licitações.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto mb-8">
        {[
          { id: 'my_procurements', label: 'Minhas contratações', icon: Briefcase },
          { id: 'biddings', label: 'Licitações', icon: Gavel },
          { id: 'direct_contracting', label: 'Contratações diretas', icon: Handshake },
          { id: 'auxiliary_procedures', label: 'Procedimentos auxiliares', icon: Layers },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'text-blue-600 border-blue-600 bg-blue-50/50' 
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'my_procurements' && <MinhasContratacoes />}
        {activeTab === 'biddings' && <Licitacoes />}
        {activeTab === 'direct_contracting' && <ContratacoesDiretas />}
        {activeTab === 'auxiliary_procedures' && <ProcedimentosAuxiliares />}
      </div>
    </div>
  );
};