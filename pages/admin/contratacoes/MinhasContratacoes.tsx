import React, { useState, useMemo, useEffect } from 'react';
import { Briefcase, Loader2, Eye, FileText, CheckSquare, MessageSquare, AlertTriangle, Download, Plus, X, Save, ExternalLink, DollarSign, List, TrendingUp, FileCheck, FileSignature, Award, ArrowLeft } from 'lucide-react';
import { certificateService, Certificate } from '../../../services/firebase';

interface Procurement {
  id: string;
  situacao: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado' | 'finalizado';
  regiao: string;
  unidadeFederativa: string;
  municipio: string;
  dataPublicacao: string;
  dataAbertura: string;
  objeto: string;
  processo: string;
  orgao: string;
  publicacao: string;
  sessao: string;
  valorProposta?: number;
}

// Mock data for demonstration
const mockProcurements: Procurement[] = [
  { id: '1', situacao: 'finalizado', regiao: 'Nordeste', unidadeFederativa: 'CE', municipio: 'São Gonçalo do Amarante', dataPublicacao: '2025-03-14', dataAbertura: '2025-03-14', objeto: 'Aquisição de material de expediente.', processo: 'Dispensa Eletrônica - 2025.03.14.01DE', orgao: 'Câmara Municipal de São Gonçalo do Amarante', publicacao: 'Abertura da contratação', sessao: 'Finalizada' },
  { id: '2', situacao: 'em_andamento', regiao: 'Sudeste', unidadeFederativa: 'SP', municipio: 'São Paulo', dataPublicacao: '2024-04-20', dataAbertura: '2024-05-10', objeto: 'Contratação de serviços de limpeza urbana.', processo: 'Pregão Eletrônico - 2024.04.20.02PE', orgao: 'Prefeitura de São Paulo', publicacao: 'Aviso de Licitação', sessao: 'Em andamento' },
  { id: '3', situacao: 'concluido', regiao: 'Sul', unidadeFederativa: 'RS', municipio: 'Porto Alegre', dataPublicacao: '2024-03-15', dataAbertura: '2024-04-01', objeto: 'Construção de nova unidade de saúde.', processo: 'Concorrência - 2024.03.15.03CC', orgao: 'Secretaria de Saúde de Porto Alegre', publicacao: 'Homologação', sessao: 'Encerrada' },
  { id: '4', situacao: 'cancelado', regiao: 'Norte', unidadeFederativa: 'AM', municipio: 'Manaus', dataPublicacao: '2024-05-01', dataAbertura: '2024-05-15', objeto: 'Reforma do teatro municipal.', processo: 'Tomada de Preços - 2024.05.01.04TP', orgao: 'Secretaria de Cultura de Manaus', publicacao: 'Cancelamento', sessao: 'Cancelada' },
];

const mockDeclarations = [
  { id: '1', title: 'DECLARAÇÃO RESERVA DE CARGOS', text: 'Declaro que, conforme disposto no art. 93 a Lei nº 8.213, de 24 de julho de 1991, estou ciente do cumprimento da reserva de cargos prevista em lei para pessoas com deficiência ou para reabilitado da Previdência Social e que, se aplicado ao número de funcionários da minha empresa, atendo as regras de acessibilidade nos termos estabelecidos no art. 429 da CLT.', accepted: true },
  { id: '2', title: 'DECLARAÇÃO QUE CUMPRE PLENAMENTE OS REQUISITOS DE HABILITAÇÃO', text: 'Declaro que estou ciente e concordo com as condições contidas no edital e seus anexos, bem como de que cumpro plenamente os requisitos de habilitação definidos no edital.', accepted: true },
  { id: '3', title: 'DECLARAÇÃO ENQUADRAMENTO ME/EPP', text: 'Declaramos que , no ano-calendário de realização do certame licitatório, ainda não celebramos contratos com a Administração Pública cujos valores somados extrapolem a receita bruta máxima admitida para fins de enquadramento como empresa de pequeno porte.', accepted: true },
];

const mockReadjustedItems = [
    { seq: 1, desc: 'Implantação e personalização do site oficial do PROCON da Câmara Municipal, com funcionalidades destinadas ao registro de reclamações, consultas públicas e divulgação de informações e orientações aos consumidores.', unidade: 'SRV', qtd: 1.0, valorRef: 12250.00, marca: '--', valorOfertado: 12000.00, valorTotal: 12000.00, situacao: 'Recebida' },
    { seq: 2, desc: 'Licença de uso, manutenção e suporte do site oficial do PROCON da Câmara Municipal, com funcionalidades destinadas ao registro de reclamações, consultas públicas e divulgação de informações e orientações aos consumidores.', unidade: 'SRV', qtd: 12.0, valorRef: 4181.11, marca: '--', valorOfertado: 4160.00, valorTotal: 49920.00, situacao: 'Recebida' }
];

export const MinhasContratacoes: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [filters, setFilters] = useState({
    situacao: 'todos',
    regiao: '',
    unidadeFederativa: '',
    municipio: '',
    dataPublicacaoStart: '',
    dataPublicacaoEnd: '',
    dataAberturaStart: '',
    dataAberturaEnd: '',
  });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProcurement, setSelectedProcurement] = useState<Procurement | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [viewingParticipantDetails, setViewingParticipantDetails] = useState<any | null>(null);
  const [accessModalTab, setAccessModalTab] = useState<'all_items' | 'bidding_phase' | 'feasibility' | 'readjusted_proposal' | 'result' | 'contracts' | 'published_docs'>('all_items');
  const [modalTab, setModalTab] = useState<'items' | 'documents' | 'published_docs' | 'declarations' | 'clarifications' | 'impugnations'>('items');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [declarations, setDeclarations] = useState(mockDeclarations);

  useEffect(() => {
    setTimeout(() => {
      setProcurements(mockProcurements);
      setLoading(false);
    }, 1000);

    loadCertificates();
  }, []);

  const filteredProcurements = useMemo(() => {
    return procurements.filter(p => {
      return (filters.situacao === 'todos' || p.situacao === filters.situacao) &&
             (p.regiao.toLowerCase().includes(filters.regiao.toLowerCase())) &&
             (p.unidadeFederativa.toLowerCase().includes(filters.unidadeFederativa.toLowerCase())) &&
             (p.municipio.toLowerCase().includes(filters.municipio.toLowerCase())) &&
             (!filters.dataPublicacaoStart || p.dataPublicacao >= filters.dataPublicacaoStart) &&
             (!filters.dataPublicacaoEnd || p.dataPublicacao <= filters.dataPublicacaoEnd) &&
             (!filters.dataAberturaStart || p.dataAbertura >= filters.dataAberturaStart) &&
             (!filters.dataAberturaEnd || p.dataAbertura <= filters.dataAberturaEnd);
    });
  }, [procurements, filters]);

  const loadCertificates = async () => {
    const data = await certificateService.getAll();
    setCertificates(data);
  };

  const getStatusBadge = (status: Procurement['situacao']) => {
    switch (status) {
      case 'aberto': return 'bg-blue-100 text-blue-700';
      case 'em_andamento': return 'bg-yellow-100 text-yellow-700';
      case 'concluido': return 'bg-green-100 text-green-700';
      case 'cancelado': return 'bg-red-100 text-red-700';
      case 'finalizado': return 'bg-gray-100 text-gray-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleViewProposal = (procurement: Procurement) => {
    setSelectedProcurement(procurement);
    setIsModalOpen(true);
  };

  const handleAccessProcurement = (procurement: Procurement) => {
    setSelectedProcurement(procurement);
    setViewingParticipantDetails(null);
    setIsAccessModalOpen(true);
  };

  const handleToggleDeclaration = (id: string) => {
    setDeclarations(prev => prev.map(d => d.id === id ? { ...d, accepted: !d.accepted } : d));
  };

  return (
    <div className="animate-fade-in-up">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <select value={filters.situacao} onChange={e => setFilters({...filters, situacao: e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full">
          <option value="todos">Todas as Situações</option>
          <option value="aberto">Aberto</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
          <option value="finalizado">Finalizado</option>
        </select>
        <input type="text" placeholder="Região" value={filters.regiao} onChange={e => setFilters({...filters, regiao: e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full" />
        <input type="text" placeholder="UF" value={filters.unidadeFederativa} onChange={e => setFilters({...filters, unidadeFederativa: e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full" />
        <input type="text" placeholder="Município" value={filters.municipio} onChange={e => setFilters({...filters, municipio: e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full" />
        <div className="lg:col-span-2">
          <label className="text-xs font-bold text-slate-500">Data de Publicação</label>
          <div className="flex items-center gap-2">
            <input type="date" value={filters.dataPublicacaoStart} onChange={e => setFilters({...filters, dataPublicacaoStart: e.target.value})} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm w-full" />
            <span className="text-slate-500">-</span>
            <input type="date" value={filters.dataPublicacaoEnd} onChange={e => setFilters({...filters, dataPublicacaoEnd: e.target.value})} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm w-full" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <label className="text-xs font-bold text-slate-500">Data de Abertura</label>
          <div className="flex items-center gap-2">
            <input type="date" value={filters.dataAberturaStart} onChange={e => setFilters({...filters, dataAberturaStart: e.target.value})} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm w-full" />
            <span className="text-slate-500">-</span>
            <input type="date" value={filters.dataAberturaEnd} onChange={e => setFilters({...filters, dataAberturaEnd: e.target.value})} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm w-full" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-sm">
              <th className="p-4 font-medium">Objeto</th>
              <th className="p-4 font-medium">Processo / Órgão</th>
              <th className="p-4 font-medium">Município / UF</th>
              <th className="p-4 font-medium">Publicação / Sessão</th>
              <th className="p-4 font-medium">Situação</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto" /></td></tr>
            ) : filteredProcurements.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma contratação encontrada.</td></tr>
            ) : (
              filteredProcurements.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600 text-sm line-clamp-2 max-w-sm">{p.objeto}</td>
                  <td className="p-4 text-sm">
                    <div className="font-medium text-slate-700">{p.processo}</div>
                    <div className="text-slate-500 text-xs">{p.orgao}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {p.municipio} / {p.unidadeFederativa}
                  </td>
                  <td className="p-4 text-sm">
                    <div className="text-slate-700">{p.publicacao}</div>
                    <div className="text-slate-500 text-xs">Sessão: {p.sessao}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${getStatusBadge(p.situacao)}`}>
                      {p.situacao.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleViewProposal(p)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                        <DollarSign size={14} /> Ver Proposta
                      </button>
                      <button onClick={() => handleAccessProcurement(p)} className="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                        <ExternalLink size={14} /> Acessar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Proposta de Preço */}
      {isModalOpen && selectedProcurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{selectedProcurement.processo}</h3>
                <p className="text-sm text-slate-500 max-w-3xl">{selectedProcurement.objeto}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
                   <span className="font-medium"><span className="text-slate-400">Entidade:</span> {selectedProcurement.orgao}</span>
                   <span className="font-medium"><span className="text-slate-400">Local:</span> {selectedProcurement.municipio} / {selectedProcurement.unidadeFederativa}</span>
                   <span className="font-medium"><span className="text-slate-400">Situação:</span> <span className="capitalize">{selectedProcurement.situacao.replace('_', ' ')}</span></span>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white border-b border-slate-100 text-sm">
               <div>
                 <p className="text-slate-400 text-xs">Modalidade</p>
                 <p className="font-medium text-slate-700">Dispensa Eletrônica</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Lei</p>
                 <p className="font-medium text-slate-700">Lei nº 14.133/2021</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Modo de Disputa</p>
                 <p className="font-medium text-slate-700">Sem disputa</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Critério de Julgamento</p>
                 <p className="font-medium text-slate-700">Menor Preço</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Valor da Proposta</p>
                 <p className="font-bold text-green-600 text-lg">R$ 61.920,00</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Data Publicação</p>
                 <p className="font-medium text-slate-700">{new Date(selectedProcurement.dataPublicacao).toLocaleDateString('pt-BR')}</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Abertura</p>
                 <p className="font-medium text-slate-700">{new Date(selectedProcurement.dataAbertura).toLocaleDateString('pt-BR')} às 09:00</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Declaração ME/EPP</p>
                 <p className="font-medium text-slate-700">SIM</p>
               </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto bg-white">
               {[
                 { id: 'items', label: 'Itens da Proposta', icon: Briefcase },
                 { id: 'documents', label: 'Documentos Habilitatórios', icon: FileText },
                 { id: 'declarations', label: 'Declarações', icon: CheckSquare },
                 { id: 'clarifications', label: 'Esclarecimentos', icon: MessageSquare },
                 { id: 'impugnations', label: 'Impugnações', icon: AlertTriangle },
               ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${modalTab === tab.id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
                 >
                    <tab.icon size={16} /> {tab.label}
                 </button>
               ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               {modalTab === 'items' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                       <tr>
                         <th className="p-4 font-medium">Item</th>
                         <th className="p-4 font-medium">Especificação</th>
                         <th className="p-4 font-medium">Marca/Modelo</th>
                         <th className="p-4 font-medium">Qtd.</th>
                         <th className="p-4 font-medium">Valor Ref.</th>
                         <th className="p-4 font-medium">Valor Ofertado</th>
                         <th className="p-4 font-medium">Total</th>
                       </tr>
                     </thead>
                     <tbody>
                       <tr className="border-b border-slate-50">
                         <td className="p-4">1</td>
                         <td className="p-4 max-w-xs">Desenvolvimento de site oficial do PROCON...</td>
                         <td className="p-4">Própria / v1.0</td>
                         <td className="p-4">1 UN</td>
                         <td className="p-4">R$ 35.000,00</td>
                         <td className="p-4 font-bold text-blue-600">R$ 30.960,00</td>
                         <td className="p-4 font-bold">R$ 30.960,00</td>
                       </tr>
                       <tr>
                         <td className="p-4">2</td>
                         <td className="p-4 max-w-xs">Manutenção mensal e suporte técnico...</td>
                         <td className="p-4">Própria / v1.0</td>
                         <td className="p-4">12 Mês</td>
                         <td className="p-4">R$ 3.000,00</td>
                         <td className="p-4 font-bold text-blue-600">R$ 2.580,00</td>
                         <td className="p-4 font-bold">R$ 30.960,00</td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
               )}

               {modalTab === 'documents' && (
                 <div className="space-y-4">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <h4 className="font-bold text-slate-700 mb-4">Documentos Habilitatórios Exigidos</h4>
                     <div className="space-y-3">
                       {['CND Federal', 'CND Estadual', 'CND Municipal', 'CND Trabalhista', 'FGTS'].map((doc, idx) => (
                         <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                           <span className="text-sm font-medium text-slate-700">{doc}</span>
                           <select className="text-sm border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                             <option value="">Selecione um documento...</option>
                             {certificates.filter(c => c.name.includes(doc) || c.name === doc).map(c => (
                               <option key={c.id} value={c.id}>{c.name} - Vence: {new Date(c.expiryDate).toLocaleDateString()}</option>
                             ))}
                           </select>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

               {modalTab === 'published_docs' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                       <tr>
                         <th className="p-4 font-medium">Documento</th>
                         <th className="p-4 font-medium text-right">Ações</th>
                       </tr>
                     </thead>
                     <tbody>
                       {['AVISO DE CONTRATAÇÃO DIRETA', 'ANEXO I - PROJETO BÁSICO', 'ANEXO II - MINUTA DE CONTRATO', 'AVISO DE PUBLICAÇÃO'].map((doc, idx) => (
                         <tr key={idx} className="border-b border-slate-50 last:border-0">
                           <td className="p-4 font-medium text-slate-700">{doc}</td>
                           <td className="p-4 text-right">
                             <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Download size={18}/></button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}

               {modalTab === 'declarations' && (
                 <div className="space-y-4">
                   {declarations.map(decl => (
                     <div key={decl.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                       <div className="flex justify-between items-start gap-4">
                         <div>
                           <h5 className="font-bold text-slate-800 mb-2">{decl.title}</h5>
                           <p className="text-sm text-slate-600 leading-relaxed">{decl.text}</p>
                         </div>
                         <button 
                           onClick={() => handleToggleDeclaration(decl.id)}
                           className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${decl.accepted ? 'bg-green-500' : 'bg-slate-300'}`}
                         >
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${decl.accepted ? 'left-7' : 'left-1'}`} />
                         </button>
                       </div>
                       <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                         <span className={`text-xs font-bold px-2 py-1 rounded-md ${decl.accepted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                           {decl.accepted ? 'ACEITO' : 'PENDENTE'}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}

               {(modalTab === 'clarifications' || modalTab === 'impugnations') && (
                 <div className="space-y-6">
                   {selectedProcurement.situacao === 'aberto' && (
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                       <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                         <Plus size={16}/> Adicionar {modalTab === 'clarifications' ? 'Esclarecimento' : 'Impugnação'}
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <input type="text" placeholder="Título / Assunto" className="px-4 py-2 rounded-lg border border-slate-200 w-full" />
                         <input type="date" className="px-4 py-2 rounded-lg border border-slate-200 w-full" />
                         <textarea rows={3} placeholder="Descrição detalhada..." className="px-4 py-2 rounded-lg border border-slate-200 w-full md:col-span-2 resize-none" />
                       </div>
                       <div className="flex justify-end">
                         <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
                           <Save size={16} /> Enviar
                         </button>
                       </div>
                     </div>
                   )}

                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                         <tr>
                           <th className="p-4 font-medium">Proponente</th>
                           <th className="p-4 font-medium">Data</th>
                           <th className="p-4 font-medium">Título/Questionamento</th>
                           <th className="p-4 font-medium">Data Resposta</th>
                           <th className="p-4 font-medium">Situação</th>
                           <th className="p-4 font-medium text-right">Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         <tr className="border-b border-slate-50 last:border-0">
                           <td className="p-4 text-slate-700">Empresa Exemplo LTDA</td>
                           <td className="p-4 text-slate-500">22/03/2025</td>
                           <td className="p-4 text-slate-600">Dúvida sobre item 2</td>
                           <td className="p-4 text-slate-500">-</td>
                           <td className="p-4"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-bold">Pendente</span></td>
                           <td className="p-4 text-right">
                             <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Eye size={18}/></button>
                           </td>
                         </tr>
                       </tbody>
                     </table>
                     {selectedProcurement.situacao !== 'aberto' && (
                       <div className="p-8 text-center text-slate-400 bg-slate-50 border-t border-slate-100">
                         <p>O prazo para {modalTab === 'clarifications' ? 'esclarecimentos' : 'impugnações'} está encerrado ou a licitação não está aberta.</p>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acessar Contratação */}
      {isAccessModalOpen && selectedProcurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{selectedProcurement.processo}</h3>
                <p className="text-sm text-slate-500 max-w-3xl">{selectedProcurement.objeto}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
                   <span className="font-medium"><span className="text-slate-400">Entidade:</span> {selectedProcurement.orgao}</span>
                   <span className="font-medium"><span className="text-slate-400">Local:</span> {selectedProcurement.municipio} / {selectedProcurement.unidadeFederativa}</span>
                   <span className="font-medium"><span className="text-slate-400">Situação:</span> <span className="capitalize">{selectedProcurement.situacao.replace('_', ' ')}</span></span>
                   <span className="font-medium"><span className="text-slate-400">Sessão:</span> {selectedProcurement.sessao}</span>
                </div>
              </div>
              <button onClick={() => setIsAccessModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-white border-b border-slate-100 text-sm">
               <div>
                 <p className="text-slate-400 text-xs">Modo de disputa</p>
                 <p className="font-medium text-slate-700">Sem disputa</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Classificação</p>
                 <p className="font-medium text-slate-700">Serviços comuns</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Critério de julgamento</p>
                 <p className="font-medium text-slate-700">Menor Preço</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Tipo de apuração</p>
                 <p className="font-medium text-slate-700">Item</p>
               </div>
               <div>
                 <p className="text-slate-400 text-xs">Itens</p>
                 <p className="font-medium text-slate-700">2</p>
               </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto bg-white">
               {[
                 { id: 'all_items', label: 'Todos os itens', icon: List },
                 { id: 'bidding_phase', label: 'Fase de lances', icon: TrendingUp },
                 { id: 'feasibility', label: 'Exequibilidades', icon: FileCheck },
                 { id: 'readjusted_proposal', label: 'Proposta readequada', icon: FileText },
                 { id: 'result', label: 'Resultado', icon: Award },
                 { id: 'contracts', label: 'Contratos', icon: FileSignature },
               ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => {
                      setAccessModalTab(tab.id as any);
                      // Reset sub-view when changing main tabs
                      setViewingParticipantDetails(null);
                    }}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${accessModalTab === tab.id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
                 >
                    <tab.icon size={16} /> {tab.label}
                 </button>
               ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               {accessModalTab === 'all_items' && (
                 <div className="space-y-6">
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                         <tr>
                           <th className="p-4 font-medium">Item</th>
                           <th className="p-4 font-medium">Qtd.</th>
                           <th className="p-4 font-medium">Unidade</th>
                           <th className="p-4 font-medium">Valor ofertado</th>
                           <th className="p-4 font-medium">Sua situação / classificação</th>
                           <th className="p-4 font-medium">Situação geral</th>
                           <th className="p-4 font-medium text-right">Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         <tr className="border-b border-slate-50">
                           <td className="p-4 max-w-xs">1 - Implantação e personalização do site oficial do PROCON...</td>
                           <td className="p-4">1,0</td>
                           <td className="p-4">Serviço</td>
                           <td className="p-4 font-bold">R$ 12.000,00</td>
                           <td className="p-4">
                             <span className="block text-green-600 font-bold">Declarado vencedor</span>
                             <span className="text-xs text-slate-500">2° Lugar</span>
                           </td>
                           <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">Homologado</span></td>
                           <td className="p-4 text-right">
                             <button className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                               Visualizar Detalhes
                             </button>
                           </td>
                         </tr>
                       </tbody>
                     </table>
                   </div>

                   {/* Detalhes do Item (Simulação de visualização expandida) */}
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">Detalhes do Item 1</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div>
                         <p className="text-xs text-slate-400">Especificação</p>
                         <p className="text-sm text-slate-700">Implantação e personalização do site oficial do PROCON da Câmara Municipal, com funcionalidades destinadas ao registro de reclamações, consultas públicas e divulgação de informações e orientações aos consumidores.</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <p className="text-xs text-slate-400">Valor referência</p>
                           <p className="text-sm font-bold text-slate-700">R$ 12.250,00</p>
                         </div>
                         <div>
                           <p className="text-xs text-slate-400">Melhor lance</p>
                           <p className="text-sm font-bold text-green-600">R$ 12.000,00</p>
                         </div>
                         <div>
                           <p className="text-xs text-slate-400">Situação</p>
                           <p className="text-sm font-bold text-slate-700">Homologado</p>
                         </div>
                       </div>
                     </div>

                     <h5 className="font-bold text-slate-700 mb-2 text-sm">Histórico de Classificação</h5>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm border border-slate-100 rounded-lg">
                         <thead className="bg-slate-50 text-slate-500">
                           <tr>
                             <th className="p-2 font-medium">Colocação</th>
                             <th className="p-2 font-medium">Participante</th>
                             <th className="p-2 font-medium">Porte</th>
                             <th className="p-2 font-medium">Valor ofertado</th>
                             <th className="p-2 font-medium">Situação</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr className="border-b border-slate-50">
                             <td className="p-2">1º</td>
                             <td className="p-2">PREMIUM PUBLICIDADES & SERVICOS LTDA</td>
                             <td className="p-2">SIM</td>
                             <td className="p-2">R$ 9.290,00</td>
                             <td className="p-2 text-red-500 font-medium">Desclassificado</td>
                           </tr>
                           <tr>
                             <td className="p-2">2º</td>
                             <td className="p-2 font-bold">LAVORO - SEGUROS, SERVICOS TERCEIRIZADOS...</td>
                             <td className="p-2">SIM</td>
                             <td className="p-2 font-bold text-green-600">R$ 12.000,00</td>
                             <td className="p-2 text-green-600 font-bold">Declarado vencedor</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </div>
               )}

               {accessModalTab === 'bidding_phase' && (
                 <div className="space-y-4">
                   <div className="flex gap-2 mb-4">
                     <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm border border-blue-100">Em disputa</button>
                     <button className="px-4 py-2 bg-white text-slate-500 rounded-lg font-medium text-sm border border-slate-200 hover:bg-slate-50">Em negociação</button>
                   </div>
                   <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                     <p>Nenhum item em disputa no momento.</p>
                   </div>
                 </div>
               )}

               {accessModalTab === 'feasibility' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                       <tr>
                         <th className="p-4 font-medium">Participante</th>
                         <th className="p-4 font-medium">Motivo</th>
                         <th className="p-4 font-medium">Itens</th>
                         <th className="p-4 font-medium">Prazo</th>
                         <th className="p-4 font-medium">Situação</th>
                         <th className="p-4 font-medium text-right">Ações</th>
                       </tr>
                     </thead>
                     <tbody>
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma exequibilidade registrada.</td></tr>
                     </tbody>
                   </table>
                 </div>
               )}

               {accessModalTab === 'readjusted_proposal' && (
                 <div className="space-y-6">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <h4 className="font-bold text-slate-700 mb-4">Proposta Readequada</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                       <div>
                         <p className="text-slate-400 text-xs">Data da solicitação</p>
                         <p className="font-medium text-slate-700">27/03/2025 às 11:13:46</p>
                       </div>
                       <div>
                         <p className="text-slate-400 text-xs">Data final da apresentação</p>
                         <p className="font-medium text-slate-700">27/03/2025 às 11:13:46</p>
                       </div>
                       <div>
                         <p className="text-slate-400 text-xs">Valor total da referência</p>
                         <p className="font-medium text-slate-700">R$ 62.423,32</p>
                       </div>
                       <div>
                         <p className="text-slate-400 text-xs">Valor total de lance</p>
                         <p className="font-medium text-slate-700">R$ 61.920,00</p>
                       </div>
                       <div>
                         <p className="text-slate-400 text-xs">Valor da readequação</p>
                         <p className="font-bold text-green-600">R$ 61.920,00</p>
                       </div>
                       <div>
                         <p className="text-slate-400 text-xs">Situação</p>
                         <p className="font-medium text-blue-600">Enviado</p>
                       </div>
                     </div>
                   </div>
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                         <tr>
                           <th className="p-4 font-medium">Sequencial</th>
                           <th className="p-4 font-medium">Descrição</th>
                           <th className="p-4 font-medium">Qtd.</th>
                           <th className="p-4 font-medium">Valor ref.</th>
                           <th className="p-4 font-medium">Valor ofertado</th>
                           <th className="p-4 font-medium">Valor total</th>
                           <th className="p-4 font-medium">Situação</th>
                         </tr>
                       </thead>
                       <tbody>
                         {mockReadjustedItems.map(item => (
                           <tr key={item.seq} className="border-b border-slate-50 last:border-0">
                             <td className="p-4">{item.seq}</td>
                             <td className="p-4 max-w-xs">{item.desc}</td>
                             <td className="p-4">{item.qtd.toFixed(1)} {item.unidade}</td>
                             <td className="p-4">{item.valorRef.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                             <td className="p-4 font-bold text-blue-600">{item.valorOfertado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                             <td className="p-4 font-bold">{item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                             <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">{item.situacao}</span></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {accessModalTab === 'contracts' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                       <tr>
                         <th className="p-4 font-medium">Participante</th>
                         <th className="p-4 font-medium">Convocação</th>
                         <th className="p-4 font-medium">Contrato/ARP</th>
                         <th className="p-4 font-medium">Situação</th>
                         <th className="p-4 font-medium text-right">Ações</th>
                       </tr>
                     </thead>
                     <tbody>
                       <tr className="border-b border-slate-50">
                         <td className="p-4 font-medium">
                           LAVORO - SEGUROS, SERVICOS TERCEIRIZADOS E COMERCIO LTDA
                         </td>
                         <td className="p-4 text-slate-600">28/03/2025 às 08:44</td>
                         <td className="p-4 text-slate-600">28/03/2025 às 08:45</td>
                         <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">Assinado</span></td>
                         <td className="p-4 text-right">
                           <div className="flex justify-end gap-2 flex-wrap">
                             <button className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors">Visualizar Termo de Convocação Assinado</button>
                             <button className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors">Visualizar Contrato Assinado</button>
                           </div>
                         </td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
               )}

               {accessModalTab === 'result' && (
                 <div className="animate-fade-in-up">
                   {viewingParticipantDetails ? (
                     <div className="space-y-6">
                       <button onClick={() => setViewingParticipantDetails(null)} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
                         <ArrowLeft size={16} /> Voltar para Resultado
                       </button>
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <h4 className="font-bold text-slate-700 mb-4">Detalhes de: {viewingParticipantDetails.name}</h4>
                         
                         <h5 className="font-semibold text-slate-600 mb-2 mt-6">Documentos</h5>
                         <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-500">Nenhum documento anexado.</div>

                         <h5 className="font-semibold text-slate-600 mb-2 mt-6">Lotes</h5>
                         <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                             <thead className="bg-slate-50 text-slate-500">
                               <tr>
                                 <th className="p-2 font-medium">Item</th>
                                 <th className="p-2 font-medium">Valor lance</th>
                                 <th className="p-2 font-medium">Situação</th>
                                 <th className="p-2 font-medium text-right">Ações</th>
                               </tr>
                             </thead>
                             <tbody>
                               <tr className="border-t border-slate-100">
                                 <td className="p-2 max-w-md">1 - Implantação e personalização do site...</td>
                                 <td className="p-2">R$ 9.290,00</td>
                                 <td className="p-2 text-red-500 font-bold">Desclassificado</td>
                                 <td className="p-2 text-right">
                                   <div className="flex justify-end gap-2">
                                     <button className="text-xs font-medium text-red-600 hover:underline">Motivo</button>
                                     <button className="text-xs font-medium text-blue-600 hover:underline">Proposta Inicial</button>
                                     <button className="text-xs font-medium text-blue-600 hover:underline">Proposta Readequada</button>
                                   </div>
                                 </td>
                               </tr>
                             </tbody>
                           </table>
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                           <tr>
                             <th className="p-4 font-medium">#</th>
                             <th className="p-4 font-medium">Participante</th>
                             <th className="p-4 font-medium">Situação aceitação</th>
                             <th className="p-4 font-medium">Situação habilitação</th>
                             <th className="p-4 font-medium text-right">Ações</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr className="border-b border-slate-50">
                             <td className="p-4">1</td>
                             <td className="p-4 font-medium">PREMIUM PUBLICIDADES & SERVICOS LTDA</td>
                             <td className="p-4 text-red-500 font-bold">Desclassificado</td>
                             <td className="p-4">--</td>
                             <td className="p-4 text-right">
                               <div className="flex justify-end gap-2 flex-wrap">
                                 <button onClick={() => setViewingParticipantDetails({ name: 'PREMIUM PUBLICIDADES & SERVICOS LTDA' })} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors">Ver Detalhes</button>
                                 <button className="text-slate-500 hover:bg-slate-100 px-2 py-1 rounded text-xs font-bold transition-colors">Ver proposta inicial</button>
                                 <button className="text-slate-500 hover:bg-slate-100 px-2 py-1 rounded text-xs font-bold transition-colors">Ver proposta readequada</button>
                               </div>
                             </td>
                           </tr>
                           <tr className="border-b border-slate-50">
                             <td className="p-4">2</td>
                             <td className="p-4 font-medium">LAVORO - SEGUROS, SERVICOS TERCEIRIZADOS E COMERCIO LTDA</td>
                             <td className="p-4 text-green-600 font-bold">Proposta aceita</td>
                             <td className="p-4 text-green-600 font-bold">Declarado vencedor</td>
                             <td className="p-4 text-right">
                               <div className="flex justify-end gap-2 flex-wrap">
                                 <button onClick={() => setViewingParticipantDetails({ name: 'LAVORO - SEGUROS, SERVICOS TERCEIRIZADOS E COMERCIO LTDA' })} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors">Ver Detalhes</button>
                                 <button className="text-slate-500 hover:bg-slate-100 px-2 py-1 rounded text-xs font-bold transition-colors">Ver proposta inicial</button>
                                 <button className="text-slate-500 hover:bg-slate-100 px-2 py-1 rounded text-xs font-bold transition-colors">Ver proposta readequada</button>
                               </div>
                             </td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};