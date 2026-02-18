import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, MapPin, Calendar, Loader2, CheckCircle, X, Phone, Plus, FileText, Trash2, Download, Edit2, Save, Upload, Settings, DollarSign, FileBarChart, TrendingUp, Paperclip, Send, FileCheck } from 'lucide-react';
import { auth, contactService, clientService, prospectService, certificateService, ContactLead, Prospect, ProspectFile, Certificate, ClientInvoice, FinancialSettings, rtdb } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { initialSoftwares } from '../../services/mockData';

export const Clients: React.FC = () => {
  const [contacts, setContacts] = useState<ContactLead[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lead' | 'active' | 'prospecting'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProspectModalOpen, setIsProspectModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [managingClient, setManagingClient] = useState<ContactLead | null>(null);
  const [manageTab, setManageTab] = useState<'contracts' | 'adjustments' | 'invoices' | 'proposals' | 'reports' | 'billing'>('contracts');
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<ContactLead | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    razaoSocial: '',
    cnpj: '',
    inscricaoMunicipal: '',
    role: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    cep: '',
    complement: '',
    financialContact: '',
    solution: '',
    message: ''
  });

  const [prospectFormData, setProspectFormData] = useState<Omit<Prospect, 'id'>>({
    municipio: '',
    estado: '',
    tipoOrgao: 'camara',
    sessaoOrdinaria: '',
    endereco: '',
    presidente: '',
    files: []
  });

  const [billingForm, setBillingForm] = useState({
    value: '',
    title: '',
    bankAccount: '',
    pixKey: '',
    invoiceFile: '',
    reportFile: '',
    selectedCertificates: [] as string[],
    emailText: '',
    solutionSelect: ''
  });

  // State for sub-items forms
  const [subItemForm, setSubItemForm] = useState<any>({});

  const resetSubItemForm = () => {
    setSubItemForm({});
  };

  useEffect(() => {
    loadContacts();
    loadProspects();
    loadCertificates();
    loadFinancialSettings();
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

  const loadCertificates = async () => {
    const data = await certificateService.getAll();
    setCertificates(data);
  };

  const loadFinancialSettings = async () => {
    try {
      const snapshot = await get(ref(rtdb, 'settings/financial'));
      if (snapshot.exists()) setFinancialSettings(snapshot.val());
    } catch (error) {
      console.error('Erro ao carregar configurações financeiras:', error);
    }
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
    
    const payload = { ...formData, userId: auth.currentUser?.uid };
    let success = false;
    if (editingClient) {
      success = await clientService.update(editingClient.id, payload);
    } else {
      success = await clientService.create(payload);
    }

    if (success) {
      setIsModalOpen(false);
      setFormData({
        name: '',
        razaoSocial: '',
        cnpj: '',
        inscricaoMunicipal: '',
        role: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        address: '',
        cep: '',
        complement: '',
        financialContact: '',
        solution: '',
        message: ''
      });
      setEditingClient(null);
      loadContacts();
    }
    setSaving(false);
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      const success = await clientService.delete(id);
      if (success) loadContacts();
    }
  };

  const handleProspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...prospectFormData, userId: auth.currentUser?.uid };
    let success = false;
    if (editingProspect) {
      success = await prospectService.update(editingProspect.id, payload);
    } else {
      success = await prospectService.create(payload);
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
        tipoOrgao: prospect.tipoOrgao || 'camara',
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
        tipoOrgao: 'camara',
        sessaoOrdinaria: '',
        endereco: '',
        presidente: '',
        files: []
      });
    }
    setIsProspectModalOpen(true);
  };

  const handleAddSubItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingClient) return;
    setSaving(true);

    const type = manageTab;
    const currentList = managingClient[type] || [];
    const newItem = { ...subItemForm, id: Date.now().toString(), userId: auth.currentUser?.uid };
    const newList = [...currentList, newItem];

    const success = await clientService.update(managingClient.id, { [type]: newList });
    
    if (success) {
      const updatedClient = { ...managingClient, [type]: newList };
      setManagingClient(updatedClient);
      setContacts(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      resetSubItemForm();
    }
    setSaving(false);
  };

  const handleSendBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingClient) return;
    setSaving(true);
    // Prepare invoice object
    const newInvoice: any = {
      id: Date.now().toString(),
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: Number(billingForm.value),
      status: 'sent',
      fileUrl: billingForm.invoiceFile,
      date: new Date().toISOString(),
      userId: auth.currentUser?.uid
    };

    // Prepare cobranca object (full history)
    const newCobranca: any = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...billingForm,
      status: 'sent',
      userId: auth.currentUser?.uid
    };

    try {
      // If the user selected certificate IDs, fetch their file URLs and
      // convert to data URLs so they can be attached to the email.
      let certificateFiles: { filename: string; dataUrl: string; path: string }[] = [];
      let selectedCertificatesDetails: { name: string; issueDate: string; expiryDate: string; }[] = [];
      if (billingForm.selectedCertificates && billingForm.selectedCertificates.length > 0) {
        const selectedCerts = certificates.filter(c => billingForm.selectedCertificates.includes(c.id));
        console.log('Certidões selecionadas para envio:', selectedCerts);
        selectedCertificatesDetails = selectedCerts.map(cert => ({
          name: cert.name,
          issueDate: new Date(cert.issueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          expiryDate: new Date(cert.expiryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        }));

        const fetchToDataUrl = async (url: string) => {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.error('Erro ao baixar certidão para anexo (verifique CORS):', url, e);
            return null;
          }
        };

        const promises = selectedCerts.map(async cert => {
          if (cert.fileUrl) {
            let dataUrl = '';
            if (cert.fileUrl.startsWith('data:')) {
              dataUrl = cert.fileUrl;
            } else if (cert.fileUrl.startsWith('http')) {
              const fetched = await fetchToDataUrl(cert.fileUrl);
              if (fetched) dataUrl = fetched;
            } else {
              dataUrl = `data:application/pdf;base64,${cert.fileUrl}`;
            }

            if (dataUrl) {
              const safeName = cert.name ? cert.name.replace(/[^a-z0-9\.\-\_]/gi, '_') : `cert_${cert.id}`;
              // Enviamos tanto dataUrl quanto path para garantir compatibilidade com o backend (Nodemailer usa 'path' para data URIs)
              return { filename: `${safeName}.pdf`, dataUrl, path: dataUrl };
            }
          }
          return null;
        });

        const results = await Promise.all(promises);
        certificateFiles = results.filter((r): r is { filename: string; dataUrl: string; path: string } => r !== null);
        console.log('Certidões processadas e prontas para envio:', certificateFiles);
      }

      // Build payload including any certificateFiles
      const payload = { ...billingForm, certificateFiles, selectedCertificatesDetails, userId: auth.currentUser?.uid };

      // First, attempt to send the billing email via Cloud Function
      const sent = await clientService.sendBilling(managingClient.id, payload);
      if (!sent) {
        throw new Error('Falha ao enviar o e-mail de cobrança.');
      }

      // Only persist the invoice if the email was sent
      const currentInvoices = managingClient.invoices || [];
      const newInvoicesList = [...currentInvoices, newInvoice];

      const currentCobrancas = managingClient.cobrancas || [];
      const newCobrancasList = [...currentCobrancas, newCobranca];

      const updates: any = { 
        invoices: newInvoicesList,
        cobrancas: newCobrancasList
      };
      let newReportsList = managingClient.reports || [];

      if (billingForm.reportFile) {
        const newReport = {
          id: Date.now().toString(),
          title: billingForm.title ? `Relatório - ${billingForm.title}` : 'Relatório',
          month: new Date().toISOString().slice(0, 7),
          fileUrl: billingForm.reportFile,
          date: new Date().toISOString(),
          userId: auth.currentUser?.uid
        };
        newReportsList = [...newReportsList, newReport];
        updates.reports = newReportsList;
      }

      const updated = await clientService.update(managingClient.id, updates);
      if (!updated) throw new Error('Falha ao salvar a cobrança no banco de dados.');

      alert('Cobrança enviada com sucesso!');
      setManageTab('invoices');
      setManagingClient({ ...managingClient, invoices: newInvoicesList, reports: newReportsList, cobrancas: newCobrancasList });
    } catch (err: any) {
      console.error('Erro ao enviar cobrança:', err);
      alert(err?.message || 'Erro ao enviar cobrança. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const openClientModal = (client?: ContactLead) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        razaoSocial: client.razaoSocial || '',
        cnpj: client.cnpj || '',
        inscricaoMunicipal: client.inscricaoMunicipal || '',
        role: client.role,
        email: client.email,
        phone: client.phone,
        city: client.city,
        state: client.state || '',
        address: client.address || '',
        cep: client.cep || '',
        complement: client.complement || '',
        financialContact: client.financialContact || '',
        solution: client.solution,
        message: client.message
      });
    } else {
      setEditingClient(null);
      // Reset form data... (already done in handleCreateClient success or initial state)
    }
    setIsModalOpen(true);
  };

  const handleFileToBase64 = (e: React.ChangeEvent<HTMLInputElement>, field: string = 'fileUrl') => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => setSubItemForm((prev: any) => ({ ...prev, [field]: reader.result as string }));
      reader.readAsDataURL(e.target.files[0]);
    }
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
              <UserPlus size={18} /> {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
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
          ) : (
            filteredContacts.map((contact) => (
              <div key={contact.id} className="border border-slate-100 rounded-2xl p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between gap-6">
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-lg">{contact.razaoSocial}</h4>
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

                    {contact.status === 'active' && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => { setManagingClient(contact); setManageTab('contracts'); resetSubItemForm(); }} className="text-blue-600 font-bold text-sm flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors w-fit">
                          <Settings size={16} /> Gerenciar
                        </button>
                        <button onClick={() => openClientModal(contact)} className="text-slate-500 font-bold text-sm flex items-center gap-2 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors w-fit">
                          <Edit2 size={16} /> Editar
                        </button>
                        <button onClick={() => handleDeleteClient(contact.id)} className="text-red-500 font-bold text-sm flex items-center gap-2 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors w-fit">
                          <Trash2 size={16} /> Excluir
                        </button>
                      </div>
                    )}
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
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-slate-800 text-lg">{prospect.municipio} - {prospect.estado}</h4>
                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-gray-100 text-gray-700 capitalize">{prospect.tipoOrgao}</span>
                      </div>
                      <p className="text-slate-500 text-sm mb-2 capitalize">{prospect.tipoOrgao === 'prefeitura' ? 'Prefeito(a)' : prospect.tipoOrgao === 'secretaria' ? 'Secretário(a)' : 'Presidente'}: {prospect.presidente}</p>
                      <p className="text-slate-500 text-sm">Sede: {prospect.endereco}</p>
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
              <h3 className="text-xl font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Razão Social / Nome do Órgão</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.razaoSocial} onChange={e => setFormData({...formData, razaoSocial: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Inscrição Municipal</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.inscricaoMunicipal} onChange={e => setFormData({...formData, inscricaoMunicipal: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Gestor (Prefeito/Presidente)</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cargo / Função</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    placeholder="Ex: Prefeito, Presidente, Secretário"
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
                <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Endereço e Localização</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Município</label>
                    <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                    <input type="text" required maxLength={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Endereço (Logradouro, Número)</label>
                    <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">CEP</label>
                    <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Complemento</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                      value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} />
                  </div>
                </div>
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Responsável Financeiro (Nome/Contato)</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                  value={formData.financialContact} onChange={e => setFormData({...formData, financialContact: e.target.value})} />
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
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Órgão</label>
                <select required className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white" value={prospectFormData.tipoOrgao} onChange={e => setProspectFormData({...prospectFormData, tipoOrgao: e.target.value as any})}>
                    <option value="camara">Câmara Municipal</option>
                    <option value="prefeitura">Prefeitura</option>
                    <option value="secretaria">Secretaria Municipal</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Município</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.municipio} onChange={e => setProspectFormData({...prospectFormData, municipio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                  <input type="text" required maxLength={2} className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.estado} onChange={e => setProspectFormData({...prospectFormData, estado: e.target.value.toUpperCase()})} />
                </div>
              </div>
              {prospectFormData.tipoOrgao === 'camara' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sessão Ordinária (Info)</label>
                  <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.sessaoOrdinaria} onChange={e => setProspectFormData({...prospectFormData, sessaoOrdinaria: e.target.value})} />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Endereço (Sede)</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200" value={prospectFormData.endereco} onChange={e => setProspectFormData({...prospectFormData, endereco: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {prospectFormData.tipoOrgao === 'prefeitura' ? 'Prefeito(a)' : prospectFormData.tipoOrgao === 'secretaria' ? 'Secretário(a)' : 'Presidente'} (Atual)
                </label>
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

      {/* Modal de Gestão do Cliente */}
      {managingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{managingClient.razaoSocial}</h3>
                <p className="text-sm text-slate-500">Gestão de Cliente</p>
              </div>
              <button onClick={() => setManagingClient(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="flex border-b border-slate-200 overflow-x-auto">
               {[
                 { id: 'contracts', label: 'Contratos', icon: FileText },
                 { id: 'adjustments', label: 'Reajustes', icon: TrendingUp },
                 { id: 'invoices', label: 'Notas Fiscais', icon: DollarSign },
                 { id: 'proposals', label: 'Propostas', icon: Paperclip },
                 { id: 'reports', label: 'Relatórios', icon: FileBarChart },
                 { id: 'billing', label: 'Enviar Cobrança', icon: Send },
               ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => { setManageTab(tab.id as any); resetSubItemForm(); }}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${manageTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                 >
                    <tab.icon size={16} /> {tab.label}
                 </button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               {/* Formulário de Adição */}
               {manageTab !== 'billing' && (
               <form onSubmit={handleAddSubItem} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Plus size={16}/> Adicionar Novo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                     {manageTab === 'contracts' && (
                       <>
                         <input type="text" placeholder="Título do Contrato" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.title || ''} onChange={e => setSubItemForm({...subItemForm, title: e.target.value})} />
                         <input type="date" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.startDate || ''} onChange={e => setSubItemForm({...subItemForm, startDate: e.target.value})} />
                         <input type="date" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.endDate || ''} onChange={e => setSubItemForm({...subItemForm, endDate: e.target.value})} />
                         <input type="number" placeholder="Valor (R$)" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.value || ''} onChange={e => setSubItemForm({...subItemForm, value: Number(e.target.value)})} />
                       </>
                     )}
                     {manageTab === 'adjustments' && (
                       <>
                         <input type="date" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.date || ''} onChange={e => setSubItemForm({...subItemForm, date: e.target.value})} />
                         <input type="number" placeholder="Porcentagem (%)" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.percentage || ''} onChange={e => setSubItemForm({...subItemForm, percentage: Number(e.target.value)})} />
                         <input type="number" placeholder="Novo Valor (R$)" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.newValue || ''} onChange={e => setSubItemForm({...subItemForm, newValue: Number(e.target.value)})} />
                         <input type="text" placeholder="Observação" className="px-4 py-2 rounded-lg border border-slate-200 md:col-span-3" value={subItemForm.observation || ''} onChange={e => setSubItemForm({...subItemForm, observation: e.target.value})} />
                       </>
                     )}
                     {manageTab === 'invoices' && (
                       <>
                         <input type="month" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.month || ''} onChange={e => setSubItemForm({...subItemForm, month: e.target.value})} />
                         <input type="number" placeholder="Valor (R$)" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.amount || ''} onChange={e => setSubItemForm({...subItemForm, amount: Number(e.target.value)})} />
                         <select className="px-4 py-2 rounded-lg border border-slate-200 bg-white" value={subItemForm.status || 'sent'} onChange={e => setSubItemForm({...subItemForm, status: e.target.value})}>
                           <option value="sent">Enviada</option>
                           <option value="pending">Pendente</option>
                           <option value="paid">Paga</option>
                         </select>
                       </>
                     )}
                     {manageTab === 'proposals' && (
                       <>
                         <input type="date" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.date || ''} onChange={e => setSubItemForm({...subItemForm, date: e.target.value})} />
                         <input type="text" placeholder="Título" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.title || ''} onChange={e => setSubItemForm({...subItemForm, title: e.target.value})} />
                         <input type="number" placeholder="Valor (R$)" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.value || ''} onChange={e => setSubItemForm({...subItemForm, value: Number(e.target.value)})} />
                         <select className="px-4 py-2 rounded-lg border border-slate-200 bg-white" value={subItemForm.status || 'sent'} onChange={e => setSubItemForm({...subItemForm, status: e.target.value})}>
                           <option value="sent">Enviada</option>
                           <option value="accepted">Aceita</option>
                           <option value="rejected">Rejeitada</option>
                         </select>
                       </>
                     )}
                     {manageTab === 'reports' && (
                       <>
                         <input type="month" required className="px-4 py-2 rounded-lg border border-slate-200" value={subItemForm.month || ''} onChange={e => setSubItemForm({...subItemForm, month: e.target.value})} />
                         <input type="text" placeholder="Título do Relatório" required className="px-4 py-2 rounded-lg border border-slate-200 md:col-span-2" value={subItemForm.title || ''} onChange={e => setSubItemForm({...subItemForm, title: e.target.value})} />
                       </>
                     )}
                     
                     {/* File Upload for all tabs except adjustments (optional) */}
                     {manageTab !== 'adjustments' && (
                       <div className="md:col-span-3">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Anexar Arquivo (PDF/Imagem)</label>
                         <input type="file" onChange={e => handleFileToBase64(e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                       </div>
                     )}
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all disabled:opacity-70 flex items-center gap-2">
                      {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar
                    </button>
                  </div>
               </form>
               )}

               {/* Formulário de Cobrança */}
               {manageTab === 'billing' && (
                 <form onSubmit={handleSendBilling} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 space-y-4">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><DollarSign size={16}/> Nova Cobrança</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select 
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white"
                        value={billingForm.solutionSelect}
                        onChange={e => setBillingForm({...billingForm, solutionSelect: e.target.value})}
                      >
                        <option value="">Selecione o Contrato</option>
                        {managingClient.contracts?.map((c: any) => (
                          <option key={c.id} value={c.title}>{c.title}</option>
                        ))}
                      </select>
                      <input type="text" placeholder="Título da Cobrança" required className="px-4 py-2 rounded-lg border border-slate-200" value={billingForm.title} onChange={e => setBillingForm({...billingForm, title: e.target.value})} />
                      <input type="number" placeholder="Valor (R$)" required className="px-4 py-2 rounded-lg border border-slate-200" value={billingForm.value} onChange={e => setBillingForm({...billingForm, value: e.target.value})} />
                      
                      <select className="px-4 py-2 rounded-lg border border-slate-200 bg-white" value={billingForm.bankAccount} onChange={e => setBillingForm({...billingForm, bankAccount: e.target.value})}>
                        <option value="">Selecione a Conta Bancária</option>
                        {financialSettings?.bankAccounts?.map((acc: any) => (
                          <option key={acc.id} value={`${acc.bankName} - Ag ${acc.agency} CC ${acc.accountNumber}`}>
                            {acc.bankName} - Ag {acc.agency} CC {acc.accountNumber}
                          </option>
                        ))}
                      </select>
                      <select className="px-4 py-2 rounded-lg border border-slate-200 bg-white" value={billingForm.pixKey} onChange={e => setBillingForm({...billingForm, pixKey: e.target.value})}>
                        <option value="">Selecione a Chave PIX</option>
                        {financialSettings?.pixKeys?.map((pix: any) => (
                          <option key={pix.id} value={`${pix.type.toUpperCase()}: ${pix.key}`}>
                            {pix.type.toUpperCase()}: ${pix.key}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Upload Nota Fiscal</label>
                        <input type="file" onChange={e => {
                           if (e.target.files && e.target.files[0]) {
                             const reader = new FileReader();
                             reader.onload = () => setBillingForm(prev => ({ ...prev, invoiceFile: reader.result as string }));
                             reader.readAsDataURL(e.target.files[0]);
                           }
                        }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Upload Relatório</label>
                        <input type="file" onChange={e => {
                           if (e.target.files && e.target.files[0]) {
                             const reader = new FileReader();
                             reader.onload = () => setBillingForm(prev => ({ ...prev, reportFile: reader.result as string }));
                             reader.readAsDataURL(e.target.files[0]);
                           }
                        }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Anexar Documentação (Certidões Vigentes)</label>
                      <div className="flex flex-wrap gap-2">
                        {certificates.filter(cert => {
                          if (!cert.expiryDate) return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const [year, month, day] = cert.expiryDate.split('-').map(Number);
                          const expiry = new Date(year, month - 1, day);
                          return expiry >= today;
                        }).map(cert => {
                          const isSelected = billingForm.selectedCertificates.includes(cert.id);
                          return (
                            <button
                              key={cert.id}
                              type="button"
                              onClick={() => {
                                setBillingForm(prev => ({
                                  ...prev,
                                  selectedCertificates: isSelected
                                    ? prev.selectedCertificates.filter(id => id !== cert.id)
                                    : [...prev.selectedCertificates, cert.id]
                                }));
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                isSelected 
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {isSelected ? <CheckCircle size={16} className="text-blue-600" /> : <div className="w-4 h-4 rounded-full border border-slate-300 bg-white" />}
                              <span className="text-sm font-medium">{cert.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <textarea rows={4} placeholder="Texto do Email" className="w-full px-4 py-2 rounded-lg border border-slate-200 resize-none" value={billingForm.emailText} onChange={e => setBillingForm({...billingForm, emailText: e.target.value})} />

                    <div className="flex justify-end">
                      <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all disabled:opacity-70 flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Enviar Cobrança
                      </button>
                    </div>
                 </form>
               )}

               {/* Lista de Cobranças Enviadas (Histórico) */}
               {manageTab === 'billing' && (
                 <div className="mt-8">
                   <h4 className="font-bold text-slate-700 mb-4">Histórico de Cobranças Enviadas</h4>
                   <div className="space-y-3">
                     {(managingClient.cobrancas || []).slice().reverse().map((item: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                           <div className="flex justify-between items-start">
                             <div>
                                <h5 className="font-bold text-slate-800">{item.title}</h5>
                                <p className="text-sm text-slate-500">Contrato: {item.solutionSelect || 'N/A'}</p>
                                <p className="text-sm text-slate-500">Valor: R$ {Number(item.value).toFixed(2)}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(item.date).toLocaleDateString('pt-BR')} às {new Date(item.date).toLocaleTimeString('pt-BR')}</p>
                             </div>
                             <span className="text-xs px-2 py-1 rounded-full font-bold uppercase bg-green-100 text-green-700 flex items-center gap-1">
                               <CheckCircle size={12} /> Enviada
                             </span>
                           </div>
                        </div>
                     ))}
                     {(!managingClient.cobrancas || managingClient.cobrancas.length === 0) && (
                       <p className="text-center text-slate-400 py-4">Nenhuma cobrança enviada ainda.</p>
                     )}
                   </div>
                 </div>
               )}

               {/* Lista de Itens */}
               {manageTab !== 'billing' && (
               <div className="space-y-3">
                 {(managingClient[manageTab] || []).length === 0 ? (
                   <p className="text-center text-slate-400 py-8">Nenhum registro encontrado.</p>
                 ) : (
                   (managingClient[manageTab] as any[]).map((item, idx) => (
                     <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                          {manageTab === 'contracts' && (
                            <div>
                              <h5 className="font-bold text-slate-800">{item.title}</h5>
                              <p className="text-sm text-slate-500">{new Date(item.startDate).toLocaleDateString()} até {new Date(item.endDate).toLocaleDateString()} • R$ {item.value}</p>
                            </div>
                          )}
                          {manageTab === 'adjustments' && (
                            <div>
                              <h5 className="font-bold text-slate-800">{new Date(item.date).toLocaleDateString()}</h5>
                              <p className="text-sm text-slate-500">{item.percentage}% de aumento • Novo Valor: R$ {item.newValue}</p>
                              {item.observation && <p className="text-xs text-slate-400 mt-1">Obs: {item.observation}</p>}
                            </div>
                          )}
                          {manageTab === 'invoices' && (
                            <div className="flex items-center gap-3">
                              <div>
                                <h5 className="font-bold text-slate-800">{item.month}</h5>
                                <p className="text-sm text-slate-500">R$ {item.amount}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${item.status === 'paid' ? 'bg-green-100 text-green-700' : item.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {item.status === 'paid' ? 'Paga' : item.status === 'sent' ? 'Enviada' : 'Pendente'}
                              </span>
                            </div>
                          )}
                          {manageTab === 'proposals' && (
                            <div>
                              <h5 className="font-bold text-slate-800">{item.title}</h5>
                              <p className="text-sm text-slate-500">{new Date(item.date).toLocaleDateString()} • R$ {item.value}</p>
                              <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase mt-1 inline-block ${item.status === 'accepted' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.status === 'accepted' ? 'Aceita' : item.status === 'rejected' ? 'Rejeitada' : 'Enviada'}
                              </span>
                            </div>
                          )}
                          {manageTab === 'reports' && (
                            <div>
                              <h5 className="font-bold text-slate-800">{item.title}</h5>
                              <p className="text-sm text-slate-500">Referência: {item.month}</p>
                            </div>
                          )}
                        </div>

                        {item.fileUrl && (
                          <a href={item.fileUrl} download className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                            <Download size={16} /> Baixar Anexo
                          </a>
                        )}
                     </div>
                   ))
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
