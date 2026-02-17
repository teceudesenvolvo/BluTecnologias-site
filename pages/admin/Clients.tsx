import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, MapPin, Calendar, Loader2, CheckCircle, X, Phone } from 'lucide-react';
import { contactService, clientService, ContactLead } from '../../services/firebase';
import { initialSoftwares } from '../../services/mockData';

export const Clients: React.FC = () => {
  const [contacts, setContacts] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lead' | 'active'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    city: '',
    solution: '',
    message: ''
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const data = await contactService.getAll();
    setContacts(data);
    setLoading(false);
  };

  const handleConvert = async (id: string) => {
    if (confirm('Deseja converter este Lead em Cliente Ativo?')) {
      const success = await clientService.updateStatus(id, 'active');
      if (success) loadContacts();
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await clientService.create(formData);
    if (success) {
      setIsModalOpen(false);
      setFormData({
        name: '',
        role: '',
        email: '',
        phone: '',
        city: '',
        solution: '',
        message: ''
      });
      loadContacts();
    }
    setSaving(false);
  };

  const filteredContacts = filter === 'all' 
    ? contacts 
    : contacts.filter(c => c.status === filter);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
        <div className="flex justify-end mb-6">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
            >
              <UserPlus size={18} /> Novo Cliente
            </button>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h3 className="text-xl font-bold text-slate-700">Gestão de Clientes e Leads</h3>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Clientes Ativos
            </button>
            <button 
              onClick={() => setFilter('lead')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'lead' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Leads (Fale Conosco)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="flex justify-center py-20 text-slate-400">
               <Loader2 className="animate-spin" />
             </div>
          ) : filteredContacts.length === 0 ? (
             <div className="text-center py-20 text-slate-400">Nenhum contato encontrado.</div>
          ) : (
            filteredContacts.map((contact) => (
              <div key={contact.id} className="border border-slate-100 rounded-2xl p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between gap-6">
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-slate-800 text-lg">{contact.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${contact.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {contact.status === 'active' ? 'Cliente' : 'Lead'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mb-4">{contact.role} • {contact.solution}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1"><Mail size={14}/> {contact.email}</div>
                      <div className="flex items-center gap-1"><Phone size={14}/> {contact.phone}</div>
                      <div className="flex items-center gap-1"><MapPin size={14}/> {contact.city}</div>
                      <div className="flex items-center gap-1"><Calendar size={14}/> {new Date(contact.date).toLocaleDateString('pt-BR')}</div>
                    </div>
                 </div>
                 
                 {contact.message && (
                   <div className="md:w-1/3 bg-slate-100 p-4 rounded-xl text-sm text-slate-600 italic">
                     "{contact.message}" <br/>
                     {contact.status === 'lead' && (
                        <button 
                          onClick={() => handleConvert(contact.id)}
                          className="mt-2 text-blue-600 font-bold text-xs flex items-center gap-1 hover:underline"
                        >
                          <CheckCircle size={12} /> Converter em Cliente
                        </button>
                     )}
                   </div>
                 )}
              </div>
            ))
          )}
        </div>

        {/* Modal de Novo Cliente */}
        {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">Novo Cliente</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cargo / Função</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
              </div>

              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Corporativo</label>
                    <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Telefone / WhatsApp</label>
                    <input type="tel" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cidade / Estado</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Solução Contratada</label>
                <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white"
                  value={formData.solution} onChange={e => setFormData({...formData, solution: e.target.value})}>
                  <option value="">Selecione a solução</option>
                  {initialSoftwares.map(s => <option key={s.id} value={s.nome_produto}>{s.nome_produto}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Observações</label>
                <textarea rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all resize-none" 
                  value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
