import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, MapPin, Calendar, Loader2, CheckCircle, X, Phone, Plus, FileText, Trash2, Download, Edit2, Save, Upload } from 'lucide-react';
import { contactService, clientService, prospectService, ContactLead, Prospect, ProspectFile } from '../../services/firebase';
import { initialSoftwares } from '../../services/mockData';

export const Clients: React.FC = () => {
  const [contacts, setContacts] = useState<ContactLead[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lead' | 'active' | 'prospecting'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProspectModalOpen, setIsProspectModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
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

  const [prospectFormData, setProspectFormData] = useState<Omit<Prospect, 'id'>>({
    municipio: '',
    estado: '',
    sessaoOrdinaria: '',
    endereco: '',
    presidente: '',
    files: []
  });

  useEffect(() => {
    loadContacts();
    loadProspects();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const data = await contactService.getAll();
    setContacts(data);
    setLoading(false);
  };

  const loadProspects = async () => {
    setLoading(true);
    const data = await prospectService.getAll();
    setProspects(data);
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

  const handleProspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let success = false;
    if (editingProspect) {
      success = await prospectService.update(editingProspect.id, prospectFormData);
    } else {
      success = await prospectService.create(prospectFormData);
    }

    if (success) {
      setIsProspectModalOpen(false);
      setEditingProspect(null);
      loadProspects();
    }
    setSaving(false);
  };

  const handleProspectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const promises = files.map(file => {
        return new Promise<{ name: string, base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, base64: reader.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(newFiles => {
        setProspectFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
      });
    }
  };

  const removeProspectFile = (index: number) => {
    setProspectFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const openProspectModal = (prospect?: Prospect) => {
    if (prospect) {
      setEditingProspect(prospect);
      setProspectFormData({
        municipio: prospect.municipio,
        estado: prospect.estado,
        sessaoOrdinaria: prospect.sessaoOrdinaria,
        endereco: prospect.endereco,
        presidente: prospect.presidente,
        files: prospect.files || []
      });
    } else {
      setEditingProspect(null);
      setProspectFormData({
        municipio: '',
        estado: '',
        sessaoOrdinaria: '',
        endereco: '',
        presidente: '',
        files: []
      });
    }
    setIsProspectModalOpen(true);
  };

  const filteredContacts = filter === 'all' 
    ? contacts 
    : contacts.filter(c => c.status === filter);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
        <div className="flex justify-end mb-6 gap-4">
            {filter === 'prospecting' && (
              <button onClick={() => openProspectModal()} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
                <Plus size={18} /> Nova Prospecção
              </button>
            )}
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
            <button 
              onClick={() => setFilter('prospecting')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'prospecting' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Prospecção
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading && filter !== 'prospecting' ? (
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

        {filter === 'prospecting' && (
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : prospects.length === 0 ? (
              <div className="text-center py-20 text-slate-400">Nenhuma prospecção encontrada.</div>
            ) : (
              prospects.map((prospect) => (
                <div key={prospect.id} className="border border-slate-100 rounded-2xl p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{prospect.municipio} - {prospect.estado}</h4>
                      <p className="text-slate-500 text-sm mb-2">Presidente/Prefeito: {prospect.presidente}</p>
                      <p className="text-slate-500 text-sm">Endereço: {prospect.endereco}</p>
                    </div>
                    <button onClick={() => openProspectModal(prospect)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  </div>
                  {prospect.files && prospect.files.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h5 className="text-sm font-bold text-slate-600 mb-2">Arquivos</h5>
                      <div className="flex flex-wrap gap-2">
                        {prospect.files.map((file, idx) => (
                          <a key={idx} href={file.base64} download={file.name} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs hover:bg-slate-200">
                            <FileText size={12} /> {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

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

      {/* Modal de Prospecção */}
      {isProspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">{editingProspect ? 'Editar Prospecção' : 'Nova Prospecção'}</h3>
              <button onClick={() => setIsProspectModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleProspectSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Município</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.municipio} onChange={e => setProspectFormData({...prospectFormData, municipio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.estado} onChange={e => setProspectFormData({...prospectFormData, estado: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sessão Ordinária (Info)</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.sessaoOrdinaria} onChange={e => setProspectFormData({...prospectFormData, sessaoOrdinaria: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Endereço (Sede)</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.endereco} onChange={e => setProspectFormData({...prospectFormData, endereco: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Presidente/Prefeito (Atual)</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.presidente} onChange={e => setProspectFormData({...prospectFormData, presidente: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Arquivos</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input type="file" multiple onChange={handleProspectFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Upload size={24} />
                    <span className="text-sm font-medium">Adicionar arquivos</span>
                  </div>
                </div>
                {prospectFormData.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {prospectFormData.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-sm">
                        <span className="text-slate-700 truncate">{file.name}</span>
                        <button type="button" onClick={() => removeProspectFile(idx)} className="text-red-500 p-1 hover:bg-red-100 rounded-full"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsProspectModalOpen(false)} className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-green-600/20 transition-all disabled:opacity-70 flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
