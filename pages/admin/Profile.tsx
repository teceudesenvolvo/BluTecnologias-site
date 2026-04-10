import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Loader2, Shield, Building2, Users, FileText, Briefcase, Upload, Trash2, Plus, Search, MapPin, Send, Edit2, X } from 'lucide-react';
import { auth, rtdb, Company } from '../../services/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { ref, get, update, push, remove, set } from 'firebase/database';

export const Profile: React.FC = () => {
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState<'company' | 'partners' | 'representatives' | 'activities' | 'financials' | 'access' | 'email'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // User Access State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Email Configuration State
  const [smtpSettings, setSmtpSettings] = useState<any>({
    host: '',
    port: '',
    user: '',
    pass: ''
  });

  // Company Data State
  const [companies, setCompanies] = useState<Company[]>([]); // Array to hold multiple companies
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null); // Company being edited
  const [currentCompanyFormData, setCurrentCompanyFormData] = useState<Partial<Company>>({ // Data for the modal form
    razaoSocial: '',
    nomeFantasia: '',
    porte: '',
    naturezaJuridica: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    email: '',
    telefoneFixo: '',
    telefoneCelular: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    socios: [],
    representantes: [],
    atividades: [],
    demonstrativos: []
  });
  

  useEffect(() => {
    loadCompanyData();
    if (user) loadSmtpSettings();
  }, [user]);

  const loadSmtpSettings = async () => {
    try {
      const snapshot = await get(ref(rtdb, `users/${user?.uid}/smtpSettings`));
      if (snapshot.exists()) {
        setSmtpSettings({ ...smtpSettings, ...snapshot.val() });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de e-mail:", error);
    }
  };

  const loadCompanyData = async () => { // Renamed from loadCompanyData
    setLoading(true);
    try {
      const snapshot = await get(ref(rtdb, 'settings/companies')); // Changed path to 'companies'
      if (snapshot.exists()) {
        const companiesObj = snapshot.val();
        const loadedCompanies: Company[] = Object.keys(companiesObj).map(key => ({
          id: key,
          ...companiesObj[key]
        }));
        setCompanies(loadedCompanies);
      } else {
        setCompanies([]); // No companies found
      }
    } catch (error) {
      console.error("Erro ao carregar dados das empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => { // Renamed from handleSaveCompanyData
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const companyToSave = {
        ...currentCompanyFormData,
        updatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      };

      if (editingCompany) {
        // Update existing company
        await update(ref(rtdb, `settings/companies/${editingCompany.id}`), companyToSave);
        setMessage({ type: 'success', text: 'Dados da empresa atualizados com sucesso!' });
      } else {
        // Add new company
        const newCompanyRef = push(ref(rtdb, 'settings/companies'));
        await set(newCompanyRef, { ...companyToSave, id: newCompanyRef.key });
        setMessage({ type: 'success', text: 'Nova empresa adicionada com sucesso!' });
      }
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      setCurrentCompanyFormData({ // Reset form
        cnpj: '', razaoSocial: '', nomeFantasia: '', porte: '', naturezaJuridica: '',
        inscricaoEstadual: '', inscricaoMunicipal: '', email: '', telefoneFixo: '',
        telefoneCelular: '', cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', municipio: '', uf: '', socios: [], representantes: [], atividades: [], demonstrativos: []
      });
      loadCompanyData(); // Reload all companies
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar dados da empresa.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCurrentCompanyFormData(company);
    setIsCompanyModalOpen(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      setSaving(true);
      setMessage(null);
      try {
        await remove(ref(rtdb, `settings/companies/${companyId}`));
        setMessage({ type: 'success', text: 'Empresa excluída com sucesso!' });
        loadCompanyData();
      } catch (error) {
        console.error(error);
        setMessage({ type: 'error', text: 'Erro ao excluir empresa.' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddNewCompany = () => {
    setEditingCompany(null);
    setCurrentCompanyFormData({ // Reset form for new entry
      cnpj: '', razaoSocial: '', nomeFantasia: '', porte: '', naturezaJuridica: '',
      inscricaoEstadual: '', inscricaoMunicipal: '', email: '', telefoneFixo: '',
      telefoneCelular: '', cep: '', logradouro: '', numero: '', complemento: '',
      bairro: '', municipio: '', uf: '', socios: [], representantes: [], atividades: [], demonstrativos: []
    });
    setIsCompanyModalOpen(true);
  };

  const fetchCnpjData = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length === 14) {
      setMessage(null);
      setSaving(true); // Indicate loading for API call
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        const data = await res.json();
        if (res.ok && !data.message) { // BrasilAPI returns { message: "CNPJ not found" } on error
          setCurrentCompanyFormData(prev => ({
            ...prev,
            razaoSocial: data.razao_social || '',
            nomeFantasia: data.nome_fantasia || '',
            porte: data.porte || '',
            naturezaJuridica: data.cnae_fiscal_descricao || '', // Using CNAE description for nature
            inscricaoEstadual: data.inscricao_estadual || '',
            email: data.email || '',
            telefoneFixo: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : '',
            telefoneCelular: data.ddd_telefone_2 ? `(${data.ddd_telefone_2}) ${data.telefone_2}` : '',
            cep: data.cep || '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            municipio: data.municipio || '',
            uf: data.uf || '',
            // Populate socios, representantes, atividades, demonstrativos if available in API, otherwise keep existing or empty
            socios: data.qsa?.map((s: any) => ({
              id: Date.now().toString() + Math.random().toString(36).substring(7), // Unique ID
              tipo: s.tipo_socio?.includes('Pessoa Fisica') ? 'pf' : 'pj',
              numeroInscricao: s.cnpj_cpf_socio || '',
              nome: s.nome_socio || '',
              email: '', // Not usually in CNPJ API
              qualificacao: s.qualificacao_socio || '',
              dataEntrada: s.data_entrada_sociedade || ''
            })) || [],
            atividades: data.cnaes_secundarios?.map((cnae: any) => ({
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              codigo: cnae.codigo,
              descricao: cnae.descricao
            })) || []
          }));
          setMessage({ type: 'success', text: 'Dados do CNPJ preenchidos com sucesso!' });
        } else {
          setMessage({ type: 'error', text: data.message || 'CNPJ não encontrado ou inválido.' });
        }
      } catch (error) {
        console.error('Erro ao buscar dados do CNPJ:', error);
        setMessage({ type: 'error', text: 'Erro ao buscar dados do CNPJ. Tente novamente.' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCepBlur = async (cep: string) => { // Modified to take cep as argument
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCurrentCompanyFormData((prev: any) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            municipio: data.localidade,
            uf: data.uf // Added UF
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      }
    }
  };

  // Generic List Handlers (Socios, Representantes, Atividades)
  const addItem = (field: string, item: any) => {
    setCurrentCompanyFormData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || []), { ...item, id: Date.now().toString() + Math.random().toString(36).substring(7) }] // Ensure unique ID
    }));
  };

  const removeItem = (field: string, id: string) => {
    setCurrentCompanyFormData((prev: any) => ({
      ...prev,
      [field]: (prev[field] || []).filter((i: any) => i.id !== id)
    }));
  };

  const handleFileToBase64 = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string, fileName: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader(); // This function is not used anymore, it's replaced by the one below
      reader.onload = () => callback(reader.result as string, file.name);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (user) {
        // Atualizar Nome
        if (displayName !== user.displayName) {
          await updateProfile(user, { displayName });
        }

        // Atualizar Senha
        if (newPassword) {
          if (newPassword.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres.');
          }
          if (newPassword !== confirmPassword) {
            throw new Error('As senhas não conferem.');
          }
          await updatePassword(user, newPassword);
        }

        // Salvar dados do usuário na coleção 'users'
        await update(ref(rtdb, `users/${user.uid}`), {
          displayName,
          email: user.email,
          updatedAt: new Date().toISOString()
        });

        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error(error);
      let msg = 'Erro ao atualizar perfil.';
      if (error.code === 'auth/requires-recent-login') {
        msg = 'Para alterar a senha, faça login novamente.';
      } else if (error.message) {
        msg = error.message;
      }
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (user) {
        await update(ref(rtdb, `users/${user.uid}/smtpSettings`), smtpSettings);
        setMessage({ type: 'success', text: 'Configurações de e-mail salvas com sucesso!' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações de e-mail.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-700">Dados da Empresa</h3>
          <p className="text-slate-500">Gerencie as informações cadastrais e societárias.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            {user?.displayName?.charAt(0).toUpperCase() || <User size={16} />}
          </div>
          <span className="text-sm font-medium text-slate-700">{user?.email}</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <Shield size={18} /> : <Lock size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto mb-8">
        {[
          { id: 'company', label: 'Empresas', icon: Building2 }, // Changed label
          { id: 'access', label: 'Dados de Acesso', icon: Lock },
          { id: 'email', label: 'Configurações de E-mail', icon: Send },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id
              ? 'text-blue-600 border-blue-600 bg-blue-50/50'
              : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'company' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-700">Minhas Empresas</h4>
            <button onClick={handleAddNewCompany} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
              <Plus size={18} /> Adicionar Empresa
            </button>
          </div>

          {companies.length === 0 && !loading ? (
            <div className="text-center py-20 text-slate-400">Nenhuma empresa cadastrada.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(company => (
                <div key={company.id} className="border border-slate-100 rounded-2xl p-6 hover:bg-slate-50 transition-colors flex flex-col justify-between relative group">
                  <div>
                    <h5 className="font-bold text-slate-800 text-lg mb-1">{company.razaoSocial}</h5>
                    <p className="text-sm text-slate-500">{company.nomeFantasia}</p>
                    <p className="text-xs text-slate-400 mt-2">CNPJ: {company.cnpj}</p>
                    <p className="text-xs text-slate-400">{company.municipio} - {company.uf}</p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditCompany(company)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteCompany(company.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Company Modal (for Add/Edit) */}
        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-slate-800">{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</h3>
                <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleSaveCompany} className="p-6 space-y-6">
                {/* Dados Gerais */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Building2 size={18} /> Dados Gerais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">CNPJ *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 pr-10"
                          value={currentCompanyFormData.cnpj}
                          onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, cnpj: e.target.value })}
                          onBlur={e => fetchCnpjData(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => fetchCnpjData(currentCompanyFormData.cnpj || '')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                          title="Buscar dados do CNPJ"
                          disabled={saving}
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Razão Social *</label>
                      <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.razaoSocial} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, razaoSocial: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Nome Fantasia</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.nomeFantasia} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, nomeFantasia: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Porte da Empresa *</label>
                      <select required className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white" value={currentCompanyFormData.porte} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, porte: e.target.value })}>
                        <option value="">Selecione</option>
                        <option value="MEI">MEI</option>
                        <option value="ME">ME</option>
                        <option value="EPP">EPP</option>
                        <option value="Demais">Demais</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Natureza Jurídica *</label>
                      <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.naturezaJuridica} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, naturezaJuridica: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Inscrição Estadual</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.inscricaoEstadual} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, inscricaoEstadual: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Inscrição Municipal</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.inscricaoMunicipal} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, inscricaoMunicipal: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Mail size={18} /> Contato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">E-mail *</label>
                      <input type="email" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.email} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Telefone Fixo</label>
                      <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.telefoneFixo} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, telefoneFixo: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Telefone Celular</label>
                      <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.telefoneCelular} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, telefoneCelular: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><MapPin size={18} /> Localização</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">CEP *</label>
                      <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.cep} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, cep: e.target.value })} onBlur={e => handleCepBlur(e.target.value)} />
                      <Search size={14} className="absolute right-3 top-8 text-slate-400" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Logradouro</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.logradouro} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, logradouro: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.numero} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, numero: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Complemento</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.complemento} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, complement: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Bairro</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.bairro} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, bairro: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Município - UF</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={`${currentCompanyFormData.municipio || ''} - ${currentCompanyFormData.uf || ''}`} onChange={e => {
                        const [municipio, uf] = e.target.value.split(' - ');
                        setCurrentCompanyFormData({ ...currentCompanyFormData, municipio: municipio || '', uf: uf || '' });
                      }} />
                    </div>
                  </div>
                </div>

                {/* Socios */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Users size={18} /> Sócios</h4>
                  <button type="button" onClick={() => addItem('socios', { tipo: 'pf', numeroInscricao: '', nome: '', email: '', qualificacao: '', dataEntrada: '', ativo: true })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors mb-4"><Plus size={16} /> Adicionar Sócio</button>
                  {(currentCompanyFormData.socios || []).map((socio: any, idx: number) => (
                    <div key={socio.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Tipo *</label>
                          <select required className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white" value={socio.tipo} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].tipo = e.target.value;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }}>
                            <option value="pf">Pessoa Física</option>
                            <option value="pj">Pessoa Jurídica</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Nº de Inscrição (CPF/CNPJ) *</label>
                          <input type="text" required placeholder="CPF ou CNPJ" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.numeroInscricao} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].numeroInscricao = e.target.value;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }} />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Nome / Razão Social *</label>
                          <input type="text" required placeholder="Nome completo ou Razão Social" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.nome} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].nome = e.target.value;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Email *</label>
                          <input type="email" required placeholder="Email de contato" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.email} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].email = e.target.value;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Qualificação *</label>
                          <input type="text" required placeholder="Ex: Sócio-Administrador" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.qualificacao} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].qualificacao = e.target.value;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Data de Entrada *</label>
                          <input type="date" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.dataEntrada} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].dataEntrada = e.target.value;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }} />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
                          <input type="checkbox" checked={!!socio.ativo} onChange={e => {
                            const list = [...(currentCompanyFormData.socios || [])];
                            list[idx].ativo = e.target.checked;
                            setCurrentCompanyFormData({ ...currentCompanyFormData, socios: list });
                          }} className="rounded text-blue-600 h-4 w-4" />
                          Sócio Ativo
                        </label>
                        <button type="button" onClick={() => removeItem('socios', socio.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Representantes */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><User size={18} /> Representantes</h4>
                  <button type="button" onClick={() => addItem('representantes', { nome: '', cpf: '', cargo: '' })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors mb-4"><Plus size={16} /> Adicionar Representante</button>
                  {(currentCompanyFormData.representantes || []).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 relative group mb-4">
                      <input type="text" placeholder="Nome Completo" className="px-4 py-2 rounded-lg border border-slate-200" value={item.nome} onChange={e => {
                        const list = [...(currentCompanyFormData.representantes || [])];
                        list[idx].nome = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, representantes: list });
                      }} />
                      <input type="text" placeholder="CPF" className="px-4 py-2 rounded-lg border border-slate-200" value={item.cpf} onChange={e => {
                        const list = [...(currentCompanyFormData.representantes || [])];
                        list[idx].cpf = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, representantes: list });
                      }} />
                      <input type="text" placeholder="Cargo/Função" className="px-4 py-2 rounded-lg border border-slate-200" value={item.cargo} onChange={e => {
                        const list = [...(currentCompanyFormData.representantes || [])];
                        list[idx].cargo = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, representantes: list });
                      }} />
                      <button type="button" onClick={() => removeItem('representantes', item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                {/* Atividades Econômicas */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Briefcase size={18} /> Atividades Econômicas (CNAE)</h4>
                  <button type="button" onClick={() => addItem('atividades', { codigo: '', descricao: '' })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors mb-4"><Plus size={16} /> Adicionar Atividade</button>
                  {(currentCompanyFormData.atividades || []).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 relative group mb-4">
                      <input type="text" placeholder="CNAE" className="px-4 py-2 rounded-lg border border-slate-200" value={item.codigo} onChange={e => {
                        const list = [...(currentCompanyFormData.atividades || [])];
                        list[idx].codigo = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, atividades: list });
                      }} />
                      <input type="text" placeholder="Descrição da Atividade" className="px-4 py-2 rounded-lg border border-slate-200 md:col-span-3" value={item.descricao} onChange={e => {
                        const list = [...(currentCompanyFormData.atividades || [])];
                        list[idx].descricao = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, atividades: list });
                      }} />
                      <button type="button" onClick={() => removeItem('atividades', item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                {/* Demonstrativos Contábeis */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={18} /> Demonstrativos Contábeis</h4>
                  <button type="button" onClick={() => addItem('demonstrativos', { titulo: '', ano: '', fileUrl: '' })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors mb-4"><Plus size={16} /> Adicionar Demonstrativo</button>
                  {(currentCompanyFormData.demonstrativos || []).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 relative group items-center mb-4">
                      <input type="text" placeholder="Título (Ex: Balanço Patrimonial)" className="px-4 py-2 rounded-lg border border-slate-200" value={item.titulo} onChange={e => {
                        const list = [...(currentCompanyFormData.demonstrativos || [])];
                        list[idx].titulo = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, demonstrativos: list });
                      }} />
                      <input type="number" placeholder="Ano" className="px-4 py-2 rounded-lg border border-slate-200" value={item.ano} onChange={e => {
                        const list = [...(currentCompanyFormData.demonstrativos || [])];
                        list[idx].ano = e.target.value;
                        setCurrentCompanyFormData({ ...currentCompanyFormData, demonstrativos: list });
                      }} />
                      <div className="relative">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => handleFileToBase64(e, `demonstrativos[${idx}].fileUrl`)} />
                        <div className={`px-4 py-2 rounded-lg border border-dashed flex items-center justify-center gap-2 text-sm ${item.fileUrl ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-slate-500'}`}>
                          <Upload size={16} /> {item.fileUrl ? 'Arquivo Anexado' : 'Upload PDF'}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeItem('demonstrativos', item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex items-center gap-2">
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Empresa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <form onSubmit={handleUpdateProfile} className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome de Exibição</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1">O endereço de email não pode ser alterado.</p>
              </div>

              <div className="pt-8 mt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <Lock size={20} className="text-blue-600" /> Alterar Senha
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 flex items-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Salvar Acesso
              </button>
            </div>
          </form>
        )}

        {activeTab === 'email' && (
          <form onSubmit={handleSaveSmtpSettings} className="space-y-8 animate-fade-in-up max-w-2xl">
            <div>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Send size={18} /> Servidor de Saída (SMTP)</h4>
              <p className="text-sm text-slate-500 mb-6">Configure os dados do seu provedor de e-mail (SendGrid, Mailgun, Locaweb, Hostinger, Gmail) para habilitar o envio pelo Webmail.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Servidor SMTP (Host) *</label>
                  <input type="text" required placeholder="Ex: smtp.sendgrid.net" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={smtpSettings.host} onChange={e => setSmtpSettings({ ...smtpSettings, host: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Porta *</label>
                  <input type="number" required placeholder="Ex: 465 ou 587" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={smtpSettings.port} onChange={e => setSmtpSettings({ ...smtpSettings, port: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Criptografia</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white" disabled>
                    <option>Automático (SSL/TLS)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Usuário / E-mail de Autenticação *</label>
                  <input type="text" required placeholder="E-mail ou nome de usuário do provedor" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={smtpSettings.user} onChange={e => setSmtpSettings({ ...smtpSettings, user: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Senha / Chave de API *</label>
                  <input type="password" required placeholder="Insira a senha do e-mail ou a chave da API" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={smtpSettings.pass} onChange={e => setSmtpSettings({ ...smtpSettings, pass: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Configurações
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};