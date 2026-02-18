import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Loader2, Shield, Building2, Users, FileText, Briefcase, Upload, Trash2, Plus, Search, MapPin } from 'lucide-react';
import { auth, rtdb } from '../../services/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';

export const Profile: React.FC = () => {
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState<'company' | 'partners' | 'representatives' | 'activities' | 'financials' | 'access'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // User Access State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Company Data State
  const [companyData, setCompanyData] = useState<any>({
    cnpj: '',
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
    socios: [],
    representantes: [],
    atividades: [],
    demonstrativos: []
  });

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(rtdb, 'settings/company'));
      if (snapshot.exists()) {
        setCompanyData({ ...companyData, ...snapshot.val() });
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await update(ref(rtdb, 'settings/company'), {
        ...companyData,
        updatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: 'Dados da empresa salvos com sucesso!' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar dados da empresa.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCepBlur = async () => {
    const cleanCep = companyData.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCompanyData((prev: any) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            municipio: `${data.localidade} - ${data.uf}`
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      }
    }
  };

  // Generic List Handlers (Socios, Representantes, Atividades)
  const addItem = (field: string, item: any) => {
    setCompanyData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || []), { ...item, id: Date.now().toString() }]
    }));
  };

  const removeItem = (field: string, id: string) => {
    setCompanyData((prev: any) => ({
      ...prev,
      [field]: (prev[field] || []).filter((i: any) => i.id !== id)
    }));
  };

  const handleFileToBase64 = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string, fileName: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
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
          { id: 'company', label: 'Dados da Empresa', icon: Building2 },
          { id: 'partners', label: 'Dados dos Sócios', icon: Users },
          { id: 'representatives', label: 'Representantes', icon: User },
          { id: 'activities', label: 'Atividades Econômicas', icon: Briefcase },
          { id: 'financials', label: 'Demonstrativos Contábeis', icon: FileText },
          { id: 'access', label: 'Dados de Acesso', icon: Lock },
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

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'company' && (
          <form onSubmit={handleSaveCompanyData} className="space-y-8 animate-fade-in-up">
            {/* Dados Gerais */}
            <div>
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Building2 size={18}/> Dados Gerais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CNPJ *</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.cnpj} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Razão Social *</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.razaoSocial} onChange={e => setCompanyData({...companyData, razaoSocial: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome Fantasia</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.nomeFantasia} onChange={e => setCompanyData({...companyData, nomeFantasia: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Porte da Empresa *</label>
                  <select required className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white" value={companyData.porte} onChange={e => setCompanyData({...companyData, porte: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="MEI">MEI</option>
                    <option value="ME">ME</option>
                    <option value="EPP">EPP</option>
                    <option value="Demais">Demais</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Natureza Jurídica *</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.naturezaJuridica} onChange={e => setCompanyData({...companyData, naturezaJuridica: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Inscrição Estadual</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.inscricaoEstadual} onChange={e => setCompanyData({...companyData, inscricaoEstadual: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Inscrição Municipal</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.inscricaoMunicipal} onChange={e => setCompanyData({...companyData, inscricaoMunicipal: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div>
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Mail size={18}/> Contato</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">E-mail *</label>
                  <input type="email" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Telefone Fixo</label>
                  <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.telefoneFixo} onChange={e => setCompanyData({...companyData, telefoneFixo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Telefone Celular</label>
                  <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.telefoneCelular} onChange={e => setCompanyData({...companyData, telefoneCelular: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Localização */}
            <div>
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><MapPin size={18}/> Localização</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 mb-1">CEP *</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.cep} onChange={e => setCompanyData({...companyData, cep: e.target.value})} onBlur={handleCepBlur} />
                  <Search size={14} className="absolute right-3 top-8 text-slate-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Logradouro</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.logradouro} onChange={e => setCompanyData({...companyData, logradouro: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.numero} onChange={e => setCompanyData({...companyData, numero: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Complemento</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.complemento} onChange={e => setCompanyData({...companyData, complemento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bairro</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.bairro} onChange={e => setCompanyData({...companyData, bairro: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Município - UF</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={companyData.municipio} onChange={e => setCompanyData({...companyData, municipio: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Dados
              </button>
            </div>
          </form>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-700">Sócios</h4>
              <button onClick={() => addItem('socios', { tipo: 'pf', numeroInscricao: '', nome: '', email: '', qualificacao: '', dataEntrada: '', ativo: true })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"><Plus size={16}/> Adicionar Sócio</button>
            </div>
            {(companyData.socios || []).map((socio: any, idx: number) => (
              <div key={socio.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo *</label>
                    <select required className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white" value={socio.tipo} onChange={e => {
                      const list = [...companyData.socios];
                      list[idx].tipo = e.target.value;
                      setCompanyData({...companyData, socios: list});
                    }}>
                      <option value="pf">Pessoa Física</option>
                      <option value="pj">Pessoa Jurídica</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nº de Inscrição (CPF/CNPJ) *</label>
                    <input type="text" required placeholder="CPF ou CNPJ" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.numeroInscricao} onChange={e => {
                      const list = [...companyData.socios];
                      list[idx].numeroInscricao = e.target.value;
                      setCompanyData({...companyData, socios: list});
                    }} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome / Razão Social *</label>
                    <input type="text" required placeholder="Nome completo ou Razão Social" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.nome} onChange={e => {
                      const list = [...companyData.socios];
                      list[idx].nome = e.target.value;
                      setCompanyData({...companyData, socios: list});
                    }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email *</label>
                    <input type="email" required placeholder="Email de contato" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.email} onChange={e => {
                      const list = [...companyData.socios];
                      list[idx].email = e.target.value;
                      setCompanyData({...companyData, socios: list});
                    }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Qualificação *</label>
                    <input type="text" required placeholder="Ex: Sócio-Administrador" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.qualificacao} onChange={e => {
                      const list = [...companyData.socios];
                      list[idx].qualificacao = e.target.value;
                      setCompanyData({...companyData, socios: list});
                    }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Data de Entrada *</label>
                    <input type="date" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={socio.dataEntrada} onChange={e => {
                      const list = [...companyData.socios];
                      list[idx].dataEntrada = e.target.value;
                      setCompanyData({...companyData, socios: list});
                    }} />
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
                        <input type="checkbox" checked={!!socio.ativo} onChange={e => {
                            const list = [...companyData.socios];
                            list[idx].ativo = e.target.checked;
                            setCompanyData({...companyData, socios: list});
                        }} className="rounded text-blue-600 h-4 w-4" />
                        Sócio Ativo
                    </label>
                    <button onClick={() => removeItem('socios', socio.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveCompanyData} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Sócios
              </button>
            </div>
          </div>
        )}

        {activeTab === 'representatives' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-700">Representantes</h4>
              <button onClick={() => addItem('representantes', { nome: '', cpf: '', cargo: '' })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"><Plus size={16}/> Adicionar</button>
            </div>
            {(companyData.representantes || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                <input type="text" placeholder="Nome Completo" className="px-4 py-2 rounded-lg border border-slate-200" value={item.nome} onChange={e => {
                  const list = [...(companyData.representantes || [])];
                  list[idx].nome = e.target.value;
                  setCompanyData({...companyData, representantes: list});
                }} />
                <input type="text" placeholder="CPF" className="px-4 py-2 rounded-lg border border-slate-200" value={item.cpf} onChange={e => {
                  const list = [...(companyData.representantes || [])];
                  list[idx].cpf = e.target.value;
                  setCompanyData({...companyData, representantes: list});
                }} />
                <input type="text" placeholder="Cargo/Função" className="px-4 py-2 rounded-lg border border-slate-200" value={item.cargo} onChange={e => {
                  const list = [...(companyData.representantes || [])];
                  list[idx].cargo = e.target.value;
                  setCompanyData({...companyData, representantes: list});
                }} />
                <button onClick={() => removeItem('representantes', item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveCompanyData} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Representantes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-700">Atividades Econômicas (CNAE)</h4>
              <button onClick={() => addItem('atividades', { codigo: '', descricao: '' })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"><Plus size={16}/> Adicionar</button>
            </div>
            {(companyData.atividades || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                <input type="text" placeholder="CNAE" className="px-4 py-2 rounded-lg border border-slate-200" value={item.codigo} onChange={e => {
                  const list = [...(companyData.atividades || [])];
                  list[idx].codigo = e.target.value;
                  setCompanyData({...companyData, atividades: list});
                }} />
                <input type="text" placeholder="Descrição da Atividade" className="px-4 py-2 rounded-lg border border-slate-200 md:col-span-3" value={item.descricao} onChange={e => {
                  const list = [...(companyData.atividades || [])];
                  list[idx].descricao = e.target.value;
                  setCompanyData({...companyData, atividades: list});
                }} />
                <button onClick={() => removeItem('atividades', item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveCompanyData} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Atividades
              </button>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-700">Demonstrativos Contábeis</h4>
              <button onClick={() => addItem('demonstrativos', { titulo: '', ano: '', fileUrl: '' })} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"><Plus size={16}/> Adicionar</button>
            </div>
            {(companyData.demonstrativos || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 relative group items-center">
                <input type="text" placeholder="Título (Ex: Balanço Patrimonial)" className="px-4 py-2 rounded-lg border border-slate-200" value={item.titulo} onChange={e => {
                  const list = [...(companyData.demonstrativos || [])];
                  list[idx].titulo = e.target.value;
                  setCompanyData({...companyData, demonstrativos: list});
                }} />
                <input type="number" placeholder="Ano" className="px-4 py-2 rounded-lg border border-slate-200" value={item.ano} onChange={e => {
                  const list = [...(companyData.demonstrativos || [])];
                  list[idx].ano = e.target.value;
                  setCompanyData({...companyData, demonstrativos: list});
                }} />
                <div className="relative">
                   <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => handleFileToBase64(e, (base64) => {
                      const list = [...(companyData.demonstrativos || [])];
                      list[idx].fileUrl = base64;
                      setCompanyData({...companyData, demonstrativos: list});
                   })} />
                   <div className={`px-4 py-2 rounded-lg border border-dashed flex items-center justify-center gap-2 text-sm ${item.fileUrl ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-slate-500'}`}>
                      <Upload size={16} /> {item.fileUrl ? 'Arquivo Anexado' : 'Upload PDF'}
                   </div>
                </div>
                <button onClick={() => removeItem('demonstrativos', item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveCompanyData} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Demonstrativos
              </button>
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
      </div>
    </div>
  );
};