// pages/admin/PrivacyPolicyGenerator.tsx
import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, FileText, Check, Save, Trash2, Edit2, Plus, X, Loader2, ExternalLink, Upload } from 'lucide-react';
import { privacyPolicyService, PrivacyPolicy } from '../../services/firebase';

export const PrivacyPolicyGenerator: React.FC<{ setActiveTab?: (tab: string) => void }> = () => {
  const [policies, setPolicies] = useState<PrivacyPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    appName: '',
    companyName: '',
    iconUrl: '',
    email: '',
    location: false,
    camera: false,
    storage: false,
    contacts: false,
    cookies: false,
  });

  const [policy, setPolicy] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  // Gera o texto automaticamente sempre que os dados do formulário mudam
  useEffect(() => {
    generateText();
  }, [formData]);

  const loadPolicies = async () => {
    setLoading(true);
    const data = await privacyPolicyService.getAll();
    setPolicies(data);
    setLoading(false);
  };

  const handleOpenModal = (policyToEdit?: PrivacyPolicy) => {
    if (policyToEdit) {
      setEditingId(policyToEdit.id);
      setFormData({
        appName: policyToEdit.appName,
        companyName: policyToEdit.companyName,
        iconUrl: policyToEdit.iconUrl || '',
        email: policyToEdit.email,
        location: policyToEdit.permissions.location,
        camera: policyToEdit.permissions.camera,
        storage: policyToEdit.permissions.storage,
        contacts: policyToEdit.permissions.contacts,
        cookies: policyToEdit.permissions.cookies,
      });
    } else {
      setEditingId(null);
      setFormData({ 
        appName: '', companyName: '', email: '', iconUrl: '',
        location: false, camera: false, storage: false, contacts: false, cookies: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, iconUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateText = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    let text = `Política de Privacidade\n\n`;
    text += `Última atualização: ${today}\n\n`;
    text += `A ${formData.companyName} construiu o aplicativo ${formData.appName} como um aplicativo Comercial. Este SERVIÇO é fornecido pela ${formData.companyName} e deve ser usado no estado em que se encontra.\n\n`;
    text += `Esta página é usada para informar os visitantes sobre nossas políticas de coleta, uso e divulgação de Informações Pessoais, caso alguém decida usar nosso Serviço.\n\n`;
    text += `Se você optar por usar nosso Serviço, concorda com a coleta e uso de informações relacionadas a esta política. As Informações Pessoais que coletamos são usadas para fornecer e melhorar o Serviço. Não usaremos ou compartilharemos suas informações com ninguém, exceto conforme descrito nesta Política de Privacidade.\n\n`;
    
    text += `Coleta e Uso de Informações\n\n`;
    text += `Para uma melhor experiência ao usar nosso Serviço, podemos exigir que você nos forneça certas informações de identificação pessoal. As informações que solicitamos serão retidas por nós e usadas conforme descrito nesta política de privacidade.\n\n`;
    
    let permissions = [];
    if (formData.location) permissions.push('Localização');
    if (formData.camera) permissions.push('Câmera');
    if (formData.storage) permissions.push('Armazenamento');
    if (formData.contacts) permissions.push('Contatos');
    
    if (permissions.length > 0) {
        text += `O aplicativo pode solicitar as seguintes permissões: ${permissions.join(', ')}.\n\n`;
    }

    if (formData.cookies) {
        text += `Cookies\n\n`;
        text += `Cookies são arquivos com pequena quantidade de dados que são comumente usados como identificadores exclusivos anônimos. Eles são enviados para o seu navegador a partir do site que você visita e são armazenados na memória interna do seu dispositivo.\n\n`;
        text += `Este Serviço não usa esses “cookies” explicitamente. No entanto, o aplicativo pode usar código de terceiros e bibliotecas que usam “cookies” para coletar informações e melhorar seus serviços. Você tem a opção de aceitar ou recusar esses cookies.\n\n`;
    }

    text += `Segurança\n\n`;
    text += `Valorizamos sua confiança em nos fornecer suas Informações Pessoais, portanto, estamos nos esforçando para usar meios comercialmente aceitáveis de protegê-las.\n\n`;

    text += `Contato\n\n`;
    text += `Se você tiver alguma dúvida ou sugestão sobre nossa Política de Privacidade, não hesite em nos contatar em ${formData.email}.\n`;

    setPolicy(text);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const policyData = {
      appName: formData.appName,
      companyName: formData.companyName,
      iconUrl: formData.iconUrl,
      email: formData.email,
      content: policy,
      lastUpdated: new Date().toISOString(),
      permissions: {
        location: formData.location,
        camera: formData.camera,
        storage: formData.storage,
        contacts: formData.contacts,
        cookies: formData.cookies,
      }
    };

    const success = await privacyPolicyService.save(policyData, editingId || undefined);
    if (success) {
      setIsModalOpen(false);
      loadPolicies();
    }
    setSaving(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(policy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-700">Políticas de Privacidade</h3>
          <p className="text-slate-500 text-sm">Gerencie os termos legais dos seus aplicativos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
        >
          <Plus size={18} /> Nova Política
        </button>
      </div>

      {/* Lista de Políticas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-sm">
              <th className="p-4 font-medium">Aplicativo</th>
              <th className="p-4 font-medium">Empresa</th>
              <th className="p-4 font-medium">Última Atualização</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto"/></td></tr>
            ) : policies.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma política cadastrada.</td></tr>
            ) : (
              policies.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-700">{p.appName}</td>
                  <td className="p-4 text-slate-600">{p.companyName}</td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(p.lastUpdated).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`#/privacy/${p.id}`} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Página Pública">
                        <ExternalLink size={18} />
                      </a>
                      <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Política' : 'Nova Política'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <form onSubmit={handleSave} className="space-y-4">
                  
                  {/* Upload do Ícone */}
                  <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                        <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${formData.iconUrl ? 'border-blue-500 bg-white' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'}`}>
                            {formData.iconUrl ? (
                                <img src={formData.iconUrl} alt="Ícone" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-2 text-slate-400">
                                    <Upload size={24} className="mx-auto mb-1" />
                                    <span className="text-[10px] font-bold uppercase">Ícone</span>
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleIconChange}
                        />
                        {formData.iconUrl && (
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); setFormData({...formData, iconUrl: ''}); }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome do App</label>
                      <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" value={formData.appName} onChange={e => setFormData({...formData, appName: e.target.value})} required placeholder="Ex: Meu App" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Empresa/Desenvolvedor</label>
                      <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required placeholder="Ex: Minha Empresa Ltda" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Email de Contato</label>
                      <input type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="contato@empresa.com" />
                  </div>
                  
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Permissões e Recursos</label>
                      <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.location} onChange={e => setFormData({...formData, location: e.target.checked})} /> 
                              <span className="text-slate-700 text-sm">Acesso à Localização</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.camera} onChange={e => setFormData({...formData, camera: e.target.checked})} />
                              <span className="text-slate-700 text-sm">Acesso à Câmera</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.storage} onChange={e => setFormData({...formData, storage: e.target.checked})} />
                              <span className="text-slate-700 text-sm">Armazenamento de Arquivos</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.contacts} onChange={e => setFormData({...formData, contacts: e.target.checked})} />
                              <span className="text-slate-700 text-sm">Acesso aos Contatos</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={formData.cookies} onChange={e => setFormData({...formData, cookies: e.target.checked})} />
                              <span className="text-slate-700 text-sm">Utiliza Cookies</span>
                          </label>
                      </div>
                  </div>
                </form>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative flex flex-col h-full">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={18}/> Pré-visualização Automática</h4>
                  {policy ? (
                    <>
                      <textarea 
                          className="w-full flex-1 p-4 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none mb-4 font-mono leading-relaxed"
                          value={policy}
                          readOnly
                      />
                      <button 
                          onClick={copyToClipboard} 
                          className={`w-full font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                              copied 
                              ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' 
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                          {copied ? <Check size={18} /> : <Copy size={18} />} 
                          {copied ? 'Copiado!' : 'Copiar Texto'}
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>Preencha o formulário para gerar.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !formData.appName}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {editingId ? 'Salvar Alterações' : 'Criar e Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
