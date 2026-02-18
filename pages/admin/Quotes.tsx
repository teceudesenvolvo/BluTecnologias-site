import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Plus, Eye, Loader2, X } from 'lucide-react';
import { quoteService, Quote } from '../../services/firebase';

export const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  const [filters, setFilters] = useState({
    status: 'todos',
    entity: '',
    description: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    const data = await quoteService.getAll();
    setQuotes(data);
    setLoading(false);
  };

  const handleViewQuote = (quote: Quote) => {
    setViewingQuote(quote);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setViewingQuote(null);
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const statusMatch = filters.status === 'todos' || quote.status === filters.status;
      const entityMatch = !filters.entity || quote.requestingEntity.toLowerCase().includes(filters.entity.toLowerCase());
      const descriptionMatch = !filters.description || quote.description.toLowerCase().includes(filters.description.toLowerCase());
      
      const requestDate = new Date(quote.requestDate);
      const startDateMatch = !filters.startDate || requestDate >= new Date(filters.startDate);
      const endDateMatch = !filters.endDate || requestDate <= new Date(filters.endDate);

      return statusMatch && entityMatch && descriptionMatch && startDateMatch && endDateMatch;
    });
  }, [quotes, filters]);

  const getStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'aberto':
        return 'bg-blue-100 text-blue-700';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-700';
      case 'concluido':
        return 'bg-green-100 text-green-700';
      case 'cancelado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-700">Pedidos de Cotação</h3>
          <p className="text-slate-500 text-sm">Gerencie e acompanhe os pedidos de cotação.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <select
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full"
        >
          <option value="todos">Todas as Situações</option>
          <option value="aberto">Aberto</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <input
          type="text"
          placeholder="Filtrar por entidade..."
          value={filters.entity}
          onChange={e => setFilters(prev => ({ ...prev, entity: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full"
        />
        <input
          type="text"
          placeholder="Filtrar por descrição..."
          value={filters.description}
          onChange={e => setFilters(prev => ({ ...prev, description: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-full"
        />
        <div className="flex items-center gap-2">
            <input 
                type="date" 
                value={filters.startDate}
                onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm w-full"
            />
            <span className="text-slate-500">-</span>
            <input 
                type="date" 
                value={filters.endDate}
                onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm w-full"
            />
        </div>
      </div>

      {/* Quotes List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-sm">
              <th className="p-4 font-medium">Entidade Solicitante</th>
              <th className="p-4 font-medium">Descrição</th>
              <th className="p-4 font-medium">Data do Pedido</th>
              <th className="p-4 font-medium">Data da Solicitação</th>
              <th className="p-4 font-medium">Situação</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto" /></td></tr>
            ) : filteredQuotes.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum pedido de cotação encontrado.</td></tr>
            ) : (
              filteredQuotes.map(quote => (
                <tr key={quote.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-700">{quote.requestingEntity}</td>
                  <td className="p-4 text-slate-600 text-sm line-clamp-1">{quote.description}</td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(quote.requestDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(quote.creationDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${getStatusBadge(quote.status)}`}>
                      {quote.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleViewQuote(quote)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                      title="Visualizar"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {isModalOpen && viewingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">Detalhes da Cotação</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p><strong>Entidade:</strong> {viewingQuote.requestingEntity}</p>
              <p><strong>Descrição:</strong> {viewingQuote.description}</p>
              <p><strong>Data do Pedido:</strong> {new Date(viewingQuote.requestDate).toLocaleDateString('pt-BR')}</p>
              <p><strong>Status:</strong> <span className={`capitalize font-medium ${getStatusBadge(viewingQuote.status).replace('bg-', 'text-')}`}>{viewingQuote.status.replace('_', ' ')}</span></p>
              <h4 className="font-bold pt-4 border-t mt-4">Itens:</h4>
              <ul>
                {viewingQuote.items.map((item, index) => (
                  <li key={index} className="border-b py-2">{item.quantity} {item.unit} - {item.description}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};