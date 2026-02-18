import React, { useState, useEffect } from 'react';
import { Save, Banknote, KeyRound, Plus, Trash2, Loader2, Search, MapPin, Building2 } from 'lucide-react';
import { auth, FinancialSettings, rtdb } from '../../services/firebase';
import { ref, get, update } from 'firebase/database';

const initialSettings: any = {
  bankAccounts: [],
  pixKeys: [],
  billingAddresses: []
};

export const FinancialData: React.FC = () => {
  const [settings, setSettings] = useState<any>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
    fetchBanks();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(rtdb, 'settings/financial'));
      const data = snapshot.exists() ? snapshot.val() : null;
      if (data) setSettings({ ...initialSettings, ...data });
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch('https://brasilapi.com.br/api/banks/v1');
      const data = await response.json();
      setBanks(data);
    } catch (error) {
      console.error("Erro ao carregar lista de bancos:", error);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    const settingsToSave = { ...settings, updatedBy: auth.currentUser?.uid, updatedAt: new Date().toISOString() };
    await update(ref(rtdb, 'settings/financial'), settingsToSave);
    setSaving(false);
    alert('Configurações salvas com sucesso!');
  };

  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const addBankAccount = () => {
    const newAccount = { id: Date.now().toString(), bankCode: '', bankName: '', agency: '', accountNumber: '' };
    handleSettingsChange('bankAccounts', [...(settings.bankAccounts || []), newAccount]);
  };

  const removeBankAccount = (id: string) => {
    handleSettingsChange('bankAccounts', settings.bankAccounts.filter((acc: any) => acc.id !== id));
  };

  const addPixKey = () => {
    const newKey = { id: Date.now().toString(), type: 'cnpj', key: '' };
    handleSettingsChange('pixKeys', [...(settings.pixKeys || []), newKey]);
  };

  const removePixKey = (id: string) => {
    handleSettingsChange('pixKeys', settings.pixKeys.filter((pix: any) => pix.id !== id));
  };

  const addBillingAddress = () => {
    const newAddress = { 
      id: Date.now().toString(), 
      cep: '', 
      street: '', 
      number: '', 
      neighborhood: '', 
      city: '', 
      state: '' 
    };
    handleSettingsChange('billingAddresses', [...(settings.billingAddresses || []), newAddress]);
  };

  const removeBillingAddress = (id: string) => {
    handleSettingsChange('billingAddresses', settings.billingAddresses.filter((addr: any) => addr.id !== id));
  };

  const handleCepBlur = async (index: number, cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const updatedAddresses = [...(settings.billingAddresses || [])];
          updatedAddresses[index] = {
            ...updatedAddresses[index],
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          };
          handleSettingsChange('billingAddresses', updatedAddresses);
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      }
    }
  };

  // Validações para habilitar/desabilitar botões
  const isBankValid = settings.bankAccounts && settings.bankAccounts.length > 0 && settings.bankAccounts.every((acc: any) => 
    acc.bankName?.trim() && acc.agency?.trim() && acc.accountNumber?.trim()
  );

  const isPixValid = settings.pixKeys && settings.pixKeys.length > 0 && settings.pixKeys.every((pix: any) => 
    pix.key?.trim() && pix.type
  );

  const isAddressValid = settings.billingAddresses && settings.billingAddresses.length > 0 && settings.billingAddresses.every((addr: any) => 
    addr.cep?.trim() && addr.street?.trim() && addr.number?.trim() && addr.neighborhood?.trim() && addr.city?.trim() && addr.state?.trim()
  );

  const isGlobalValid = isBankValid || isPixValid || isAddressValid;

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">Dados Financeiros</h3>
        <p className="text-slate-500">Gerencie contas bancárias, chaves PIX e endereço de cobrança.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Contas Bancárias */}
        <div>
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Banknote size={18} /> Contas Bancárias para Recebimento</h4>
          <div className="space-y-4">
            {(settings.bankAccounts || []).map((account: any, index: number) => (
              <div key={account.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="col-span-2 relative">
                  <input 
                    list={`banks-${account.id}`} 
                    type="text" 
                    placeholder="Pesquisar Banco (Nome ou Código)" 
                    value={account.bankName} 
                    onChange={e => {
                      const val = e.target.value;
                      const updated = [...settings.bankAccounts];
                      updated[index].bankName = val;
                      
                      // Tenta encontrar o código do banco baseado no input
                      const selectedBank = banks.find(b => b.fullName === val || b.name === val || `${b.code} - ${b.name}` === val);
                      if (selectedBank) {
                        updated[index].bankCode = selectedBank.code;
                        updated[index].bankName = `${selectedBank.code} - ${selectedBank.name}`;
                      }
                      
                      handleSettingsChange('bankAccounts', updated);
                    }} 
                    className="w-full px-3 py-2 rounded-md border border-slate-200" 
                  />
                  <datalist id={`banks-${account.id}`}>
                    {banks.map(b => <option key={b.ispb} value={`${b.code} - ${b.name}`} />)}
                  </datalist>
                </div>
                <input type="text" placeholder="Agência" value={account.agency} onChange={e => {
                  const updated = [...settings.bankAccounts];
                  updated[index].agency = e.target.value;
                  handleSettingsChange('bankAccounts', updated);
                }} className="px-3 py-2 rounded-md border border-slate-200" />
                <input type="text" placeholder="Conta" value={account.accountNumber} onChange={e => {
                  const updated = [...settings.bankAccounts];
                  updated[index].accountNumber = e.target.value;
                  handleSettingsChange('bankAccounts', updated);
                }} className="px-3 py-2 rounded-md border border-slate-200" />
                <div className="col-span-full flex justify-end">
                  <button type="button" onClick={() => removeBankAccount(account.id)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"><Trash2 size={14}/> Remover</button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button type="button" onClick={addBankAccount} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2">
                <Plus size={16} /> Adicionar Conta
              </button>
              <button 
                type="button" 
                onClick={() => handleSaveSettings()} 
                disabled={!isBankValid || saving}
                className="text-sm font-bold text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={16} /> Salvar Contas
              </button>
            </div>
          </div>
        </div>

        {/* Chaves PIX */}
        <div>
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><KeyRound size={18} /> Chaves PIX para Recebimento</h4>
          <div className="space-y-4">
            {(settings.pixKeys || []).map((pix: any, index: number) => (
              <div key={pix.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <select value={pix.type} onChange={e => {
                  const updated = [...settings.pixKeys];
                  updated[index].type = e.target.value as any;
                  handleSettingsChange('pixKeys', updated);
                }} className="px-3 py-2 rounded-md border border-slate-200 bg-white">
                  <option value="cnpj">CNPJ</option>
                  <option value="email">Email</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Aleatória</option>
                </select>
                <input type="text" placeholder="Chave PIX" value={pix.key} onChange={e => {
                  const updated = [...settings.pixKeys];
                  updated[index].key = e.target.value;
                  handleSettingsChange('pixKeys', updated);
                }} className="px-3 py-2 rounded-md border border-slate-200 col-span-2" />
                <div className="col-span-full flex justify-end">
                  <button type="button" onClick={() => removePixKey(pix.id)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"><Trash2 size={14}/> Remover</button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button type="button" onClick={addPixKey} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2">
                <Plus size={16} /> Adicionar Chave PIX
              </button>
              <button 
                type="button" 
                onClick={() => handleSaveSettings()} 
                disabled={!isPixValid || saving}
                className="text-sm font-bold text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={16} /> Salvar Chaves PIX
              </button>
            </div>
          </div>
        </div>

        {/* Endereço de Cobrança */}
        <div>
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><MapPin size={18} /> Endereços de Cobrança</h4>
          <div className="space-y-4">
            {(settings.billingAddresses || []).map((address: any, index: number) => (
              <div key={address.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="CEP" 
                      value={address.cep} 
                      onChange={e => {
                        const updated = [...settings.billingAddresses];
                        updated[index].cep = e.target.value;
                        handleSettingsChange('billingAddresses', updated);
                      }}
                      onBlur={e => handleCepBlur(index, e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-200" 
                    />
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <input type="text" placeholder="Logradouro" value={address.street} onChange={e => {
                    const updated = [...settings.billingAddresses];
                    updated[index].street = e.target.value;
                    handleSettingsChange('billingAddresses', updated);
                  }} className="px-3 py-2 rounded-md border border-slate-200 md:col-span-2" />
                  <input type="text" placeholder="Número" value={address.number} onChange={e => {
                    const updated = [...settings.billingAddresses];
                    updated[index].number = e.target.value;
                    handleSettingsChange('billingAddresses', updated);
                  }} className="px-3 py-2 rounded-md border border-slate-200" />
                  <input type="text" placeholder="Bairro" value={address.neighborhood} onChange={e => {
                    const updated = [...settings.billingAddresses];
                    updated[index].neighborhood = e.target.value;
                    handleSettingsChange('billingAddresses', updated);
                  }} className="px-3 py-2 rounded-md border border-slate-200" />
                  <input type="text" placeholder="Cidade" value={address.city} onChange={e => {
                    const updated = [...settings.billingAddresses];
                    updated[index].city = e.target.value;
                    handleSettingsChange('billingAddresses', updated);
                  }} className="px-3 py-2 rounded-md border border-slate-200 md:col-span-2" />
                  <input type="text" placeholder="UF" maxLength={2} value={address.state} onChange={e => {
                    const updated = [...settings.billingAddresses];
                    updated[index].state = e.target.value.toUpperCase();
                    handleSettingsChange('billingAddresses', updated);
                  }} className="px-3 py-2 rounded-md border border-slate-200" />
                </div>
                <button type="button" onClick={() => removeBillingAddress(address.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button type="button" onClick={addBillingAddress} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2">
                <Plus size={16} /> Adicionar Endereço
              </button>
              <button 
                type="button" 
                onClick={() => handleSaveSettings()} 
                disabled={!isAddressValid || saving}
                className="text-sm font-bold text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={16} /> Salvar Endereços
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button type="submit" disabled={saving || !isGlobalValid} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
};