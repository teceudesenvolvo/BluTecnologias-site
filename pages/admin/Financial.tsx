import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { financialService, Transaction } from '../../services/firebase';

export const Financial: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const data = await financialService.getAll();
    setTransactions(data);
    setLoading(false);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const filteredTransactions = transactions.filter(t => {
    const [year, month] = t.date.split('-').map(Number);
    return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
  });

  const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount) return;
    setSaving(true);

    const transaction = {
      description: newTransaction.description,
      amount: Number(newTransaction.amount),
      type: newTransaction.type as 'income' | 'expense',
      date: newTransaction.date || new Date().toISOString().split('T')[0],
    };

    const success = await financialService.add(transaction);
    if (success) {
      setIsModalOpen(false);
      setNewTransaction({ type: 'income', date: new Date().toISOString().split('T')[0], description: '', amount: 0 });
      loadTransactions();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      const success = await financialService.delete(id);
      if (success) loadTransactions();
    }
  };

  return (
    <div className="space-y-8">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-800 capitalize">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">Saldo Total</p>
              <h3 className={`text-3xl font-bold ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">Entradas</p>
              <h3 className="text-3xl font-bold text-green-600">
                {income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">Saídas</p>
              <h3 className="text-3xl font-bold text-red-600">
                {expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-slate-700">Fluxo de Caixa</h3>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} /> Nova Transação
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-sm">
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filteredTransactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-700">{t.description}</td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`p-4 font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma transação encontrada neste mês.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in-up">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 mb-6">Nova Transação</h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                  value={newTransaction.description}
                  onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                  placeholder="Ex: Pagamento de Fornecedor"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Valor (R$)</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                    value={newTransaction.amount}
                    onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                    value={newTransaction.date}
                    onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-xl flex-1 hover:bg-slate-50 transition-colors">
                    <input 
                      type="radio" 
                      name="type" 
                      value="income"
                      checked={newTransaction.type === 'income'}
                      onChange={() => setNewTransaction({...newTransaction, type: 'income'})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">Entrada</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-xl flex-1 hover:bg-slate-50 transition-colors">
                    <input 
                      type="radio" 
                      name="type" 
                      value="expense"
                      checked={newTransaction.type === 'expense'}
                      onChange={() => setNewTransaction({...newTransaction, type: 'expense'})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">Saída</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="animate-spin" size={18} />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
