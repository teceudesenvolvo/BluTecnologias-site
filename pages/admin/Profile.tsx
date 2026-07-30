import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Loader2, Shield, Building2, Users, FileText, Briefcase, Upload, Trash2, Plus, Search, MapPin, Send, Edit2, X } from 'lucide-react';
import { auth, Company, db, onAuthStateChanged, signOut, storageService } from '../../services/firebase';
import { companySettingsService, userSettingsService } from '../../services/firestoreSettingsService';
import { updateProfile, updatePassword, type User as FirebaseUser } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlanLimitWarning, usePlanLimits } from '../../blu-licita/hooks/usePlanLimits';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { lookupCepData } from '../../services/cepLookup';

export const Profile: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'personal' | 'company' | 'partners' | 'representatives' | 'activities' | 'financials' | 'access' | 'email'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // User Access State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalBilling, setPersonalBilling] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    telefone: '',
  });

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
  const plan = usePlanLimits();
  const navigate = useNavigate();
  const location = useLocation();
  const [billingCompletionHint, setBillingCompletionHint] = useState<string[]>([]);
  const [billingCompanyId, setBillingCompanyId] = useState('');
  const [currentCompanyFormData, setCurrentCompanyFormData] = useState<Partial<Company>>({ // Data for the modal form
    cnpj: '',
    razaoSocial: '',
    logoUrl: '',
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
  
  const onlyDigits = (value: string) => value.replace(/\D/g, '');
  const maskCpf = (value: string) => {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  };
  const maskCnpj = (value: string) => {
    const digits = onlyDigits(value).slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
  };
  const maskCep = (value: string) => onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
  const maskPhone = (value: string) => {
    const digits = onlyDigits(value).slice(0, 11);
    const first = digits.replace(/^(\d{2})(\d)/, '($1) $2');
    return digits.length > 10
      ? first.replace(/^(\(\d{2}\)\s\d{5})(\d)/, '$1-$2')
      : first.replace(/^(\(\d{2}\)\s\d{4})(\d)/, '$1-$2');
  };


  useEffect(() => {
    const stateTab = (location.state as { section?: typeof activeTab } | null)?.section;
    const searchTab = new URLSearchParams(location.search).get('tab') as typeof activeTab | null;
    const requestedTab = stateTab || searchTab || 'company';
    if (requestedTab) setActiveTab(requestedTab);

    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
        getDoc(doc(db, 'users', currentUser.uid))
          .then((snapshot) => {
            if (!snapshot.exists()) {
              loadCompanyData(currentUser);
              return;
            }
            const data = snapshot.data() as Record<string, any>;
            const savedBillingCompanyId = String(data.billingCompanyId || data.primaryBillingCompanyId || '');
            setDisplayName(String(data.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || ''));
            setPhone(String(data.phone || data.phoneNumber || ''));
            setDocument(String(data.document || data.cpf || ''));
            setBirthDate(String(data.birthDate || ''));
            setPersonalBilling({
              cep: String(data.billingCep || data.cep || data.companyCep || ''),
              logradouro: String(data.billingStreet || data.logradouro || data.companyStreet || ''),
              numero: String(data.billingNumber || data.numero || data.companyNumber || ''),
              complemento: String(data.billingComplement || data.complemento || ''),
              bairro: String(data.billingNeighborhood || data.bairro || data.companyNeighborhood || ''),
              municipio: String(data.billingCity || data.municipio || data.companyCity || ''),
              uf: String(data.billingState || data.uf || data.companyState || ''),
              telefone: String(data.billingPhone || data.phone || data.phoneNumber || ''),
            });
            setBillingCompanyId(savedBillingCompanyId);
            loadCompanyData(currentUser, savedBillingCompanyId);
          })
          .catch(() => loadCompanyData(currentUser));
        loadSmtpSettings();
      } else {
        setCompanies([]);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [location.search, location.state]);

  const loadSmtpSettings = async () => {
    try {
      const settings = await userSettingsService.getSmtp();
      if (settings) setSmtpSettings(previous => ({ ...previous, ...settings }));
    } catch (error) {
      console.error("Erro ao carregar configurações de e-mail:", error);
    }
  };

  const loadCompanyData = async (currentUser = user, selectedBillingCompanyId = billingCompanyId) => { // Renamed from loadCompanyData
    setLoading(true);
    try {
      const list = await companySettingsService.getAll();
      setCompanies(list);
      const selectedCompany = list.find((item) => String(item.id || '') === String(selectedBillingCompanyId || billingCompanyId || ''));
      if (selectedCompany) {
        setPersonalBilling({
          cep: String((selectedCompany as any).cep || (selectedCompany as any).companyCep || personalBilling.cep || ''),
          logradouro: String((selectedCompany as any).logradouro || (selectedCompany as any).companyStreet || personalBilling.logradouro || ''),
          numero: String((selectedCompany as any).numero || (selectedCompany as any).companyNumber || personalBilling.numero || ''),
          complemento: String((selectedCompany as any).complemento || personalBilling.complemento || ''),
          bairro: String((selectedCompany as any).bairro || (selectedCompany as any).companyNeighborhood || personalBilling.bairro || ''),
          municipio: String((selectedCompany as any).municipio || (selectedCompany as any).city || (selectedCompany as any).companyCity || personalBilling.municipio || ''),
          uf: String((selectedCompany as any).uf || (selectedCompany as any).state || (selectedCompany as any).companyState || personalBilling.uf || ''),
          telefone: String((selectedCompany as any).telefoneCelular || (selectedCompany as any).telefoneFixo || (selectedCompany as any).phone || personalBilling.telefone || ''),
        });
      }
      if (!selectedBillingCompanyId && list.length > 0) {
        const fallbackId = String(list[0].id || '');
        if (fallbackId) {
          setBillingCompanyId(fallbackId);
          try {
            if (currentUser) {
              const payload = {
                displayName,
                email: currentUser.email,
                phone,
                document,
                birthDate,
                billingCompanyId: fallbackId,
                primaryBillingCompanyId: fallbackId,
                updatedAt: new Date().toISOString(),
              };
              await userSettingsService.updateProfile(payload);
              await setDoc(doc(db, 'users', currentUser.uid), payload, { merge: true });
              try {
                const cached = JSON.parse(localStorage.getItem('blu-licita:user') || 'null');
                if (cached) {
                  localStorage.setItem('blu-licita:user', JSON.stringify({
                    ...cached,
                    billingCompanyId: fallbackId,
                    primaryBillingCompanyId: fallbackId,
                  }));
                }
              } catch {
                // ignore cache issues
              }
            }
          } catch (error) {
            console.warn('Não foi possível definir a empresa principal automaticamente.', error);
          }
        }
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
      let finalLogoUrl = currentCompanyFormData.logoUrl;

      // Se for uma imagem nova em base64 (preview), faz o upload real para o Storage
      if (finalLogoUrl && finalLogoUrl.startsWith('data:')) {
        if (!user?.uid) throw new Error('Usuário não autenticado.');
        const path = `profiles/${user.uid}/logos/${Date.now()}_logo.jpg`;
        const url = await storageService.uploadBase64(finalLogoUrl, path, 'image/jpeg');
        if (!url) throw new Error('Não foi possível enviar a logomarca. Verifique as regras do Firebase Storage.');
        finalLogoUrl = url;
      }

      const companyToSave = {
        ...currentCompanyFormData,
        logoUrl: finalLogoUrl,
        updatedBy: user?.uid,
        updatedAt: new Date().toISOString()
      };

      if (editingCompany) {
        // Update existing company
        await companySettingsService.update(editingCompany.id, companyToSave);
        setMessage({ type: 'success', text: 'Dados da empresa atualizados com sucesso!' });
      } else {
        // Add new company
        await companySettingsService.create(companyToSave as Omit<Company, 'id'>);
        setMessage({ type: 'success', text: 'Nova empresa adicionada com sucesso!' });
      }
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      setCurrentCompanyFormData({ // Reset form
        cnpj: '', razaoSocial: '', logoUrl: '', nomeFantasia: '', porte: '', naturezaJuridica: '',
        inscricaoEstadual: '', inscricaoMunicipal: '', email: '', telefoneFixo: '',
        telefoneCelular: '', cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', municipio: '', uf: '', socios: [], representantes: [], atividades: [], demonstrativos: []
      });
      loadCompanyData(); // Reload all companies
    } catch (error: any) {
      if (error?.code !== 'permission-denied') console.error(error);
      setMessage({
        type: 'error',
        text: error?.code === 'permission-denied'
          ? 'Sem permissão para salvar esta empresa. Publique as regras atualizadas do Firebase ou verifique o vínculo da empresa com o usuário.'
          : 'Erro ao salvar dados da empresa.'
      });
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
        await companySettingsService.delete(companyId);
        setMessage({ type: 'success', text: 'Empresa excluída com sucesso!' });
        loadCompanyData();
      } catch (error: any) {
        if (error?.code !== 'permission-denied') console.error(error);
        setMessage({
          type: 'error',
          text: error?.code === 'permission-denied'
            ? 'Sem permissão para excluir esta empresa. Publique as regras atualizadas do Firebase ou verifique o vínculo da empresa com o usuário.'
            : 'Erro ao excluir empresa.'
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddNewCompany = () => {
    if (!plan.allowed('companies', companies.length)) {
      setMessage({ type: 'error', text: plan.message('empresas/CNPJs', 'companies') });
      return;
    }
    setEditingCompany(null);
    setCurrentCompanyFormData({ // Reset form for new entry
      cnpj: '', razaoSocial: '', nomeFantasia: '', porte: '', naturezaJuridica: '',
      inscricaoEstadual: '', inscricaoMunicipal: '', email: '', telefoneFixo: '',
      telefoneCelular: '', cep: '', logradouro: '', numero: '', complemento: '',
      bairro: '', municipio: '', uf: '', socios: [], representantes: [], atividades: [], demonstrativos: []
    });
    setIsCompanyModalOpen(true);
  };

  const handleLookupPersonalCep = async (rawCep: string) => {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    try {
      const data = await lookupCepData(cep);
      setPersonalBilling((current) => ({
        ...current,
        cep: data.cep,
        logradouro: data.street || current.logradouro,
        bairro: data.neighborhood || current.bairro,
        municipio: data.city || current.municipio,
        uf: data.state || current.uf,
        complemento: data.complement || current.complemento,
      }));
    } catch (error) {
      console.warn('Não foi possível consultar o CEP do perfil.', error);
    }
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCurrentCompanyFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
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

  useEffect(() => {
    const company = companies.find((item) => item.id === billingCompanyId) || companies[0];
    if (!company) {
      setBillingCompletionHint([]);
      return;
    }
    const missing = [
      !company.cnpj && 'CNPJ',
      !company.email && 'E-mail da empresa',
      !company.telefoneCelular && !company.telefoneFixo && 'Telefone da empresa',
      !company.cep && 'CEP',
      !company.logradouro && 'Logradouro',
      !company.numero && 'Número',
      !company.bairro && 'Bairro',
      !company.municipio && 'Município',
      !company.uf && 'UF',
    ].filter(Boolean) as string[];
    setBillingCompletionHint(missing);
  }, [companies, billingCompanyId]);

  const persistBillingCompanySelection = async (companyId: string) => {
    setBillingCompanyId(companyId);
    try {
      if (!user) return;
      const payload = {
        displayName,
        email: user.email,
        phone,
        document,
        birthDate,
        billingCompanyId: companyId,
        primaryBillingCompanyId: companyId,
        updatedAt: new Date().toISOString(),
      };
      await userSettingsService.updateProfile(payload);
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      try {
        const cached = JSON.parse(localStorage.getItem('blu-licita:user') || 'null');
        if (cached) {
          localStorage.setItem('blu-licita:user', JSON.stringify({
            ...cached,
            billingCompanyId: companyId,
            primaryBillingCompanyId: companyId,
          }));
        }
      } catch {
        // ignore cache issues
      }
      window.dispatchEvent(new Event('blu:profile-updated'));
      setMessage({ type: 'success', text: 'Empresa principal para cobrança atualizada.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Não foi possível salvar a empresa principal de cobrança.' });
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
        await userSettingsService.updateProfile({
          displayName,
          email: user.email,
          phone,
          document,
          birthDate,
          updatedAt: new Date().toISOString()
        });
        await setDoc(doc(db, 'users', user.uid), {
          displayName,
          email: user.email,
          phone,
          document,
          birthDate,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        try {
          const cached = JSON.parse(localStorage.getItem('blu-licita:user') || 'null');
          if (cached) localStorage.setItem('blu-licita:user', JSON.stringify({ ...cached, name: displayName, billingCompanyId }));
          window.dispatchEvent(new Event('blu:profile-updated'));
        } catch {
          window.dispatchEvent(new Event('blu:profile-updated'));
        }

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
        await userSettingsService.saveSmtp(smtpSettings);
        setMessage({ type: 'success', text: 'Configurações de e-mail salvas com sucesso!' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações de e-mail.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (!user) throw new Error('Usuário não autenticado.');
      await updateProfile(user, { displayName });
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        email: user.email,
        phone,
        document,
        birthDate,
        billingCep: personalBilling.cep,
        billingStreet: personalBilling.logradouro,
        billingNumber: personalBilling.numero,
        billingComplement: personalBilling.complemento,
        billingNeighborhood: personalBilling.bairro,
        billingCity: personalBilling.municipio,
        billingState: personalBilling.uf,
        billingPhone: personalBilling.telefone,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await userSettingsService.updateProfile({
        displayName,
        email: user.email,
        phone,
        document,
        birthDate,
        billingCep: personalBilling.cep,
        billingStreet: personalBilling.logradouro,
        billingNumber: personalBilling.numero,
        billingComplement: personalBilling.complemento,
        billingNeighborhood: personalBilling.bairro,
        billingCity: personalBilling.municipio,
        billingState: personalBilling.uf,
        billingPhone: personalBilling.telefone,
        updatedAt: new Date().toISOString()
      });
      if (billingCompanyId) {
        const billingPayload = {
          cep: personalBilling.cep,
          zipCode: personalBilling.cep,
          logradouro: personalBilling.logradouro,
          street: personalBilling.logradouro,
          numero: personalBilling.numero,
          number: personalBilling.numero,
          complemento: personalBilling.complemento,
          bairro: personalBilling.bairro,
          neighborhood: personalBilling.bairro,
          municipio: personalBilling.municipio,
          city: personalBilling.municipio,
          uf: personalBilling.uf,
          state: personalBilling.uf,
          telefone: personalBilling.telefone,
          phone: personalBilling.telefone,
          telefoneCelular: personalBilling.telefone,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        };
        await companySettingsService.update(billingCompanyId, billingPayload);
        setCompanies((current) => current.map((company) =>
          company.id === billingCompanyId
            ? { ...company, ...billingPayload }
            : company
        ));
      }
      try {
        const cached = JSON.parse(localStorage.getItem('blu-licita:user') || 'null');
        if (cached) {
          localStorage.setItem('blu-licita:user', JSON.stringify({
            ...cached,
            name: displayName,
            billingCompanyId,
            billingCep: personalBilling.cep,
            billingStreet: personalBilling.logradouro,
            billingNumber: personalBilling.numero,
            billingComplement: personalBilling.complemento,
            billingNeighborhood: personalBilling.bairro,
            billingCity: personalBilling.municipio,
            billingState: personalBilling.uf,
            billingPhone: personalBilling.telefone,
          }));
        }
      } catch {
        // ignore cache issues
      }
      window.dispatchEvent(new Event('blu:profile-updated'));
      setMessage({ type: 'success', text: 'Dados pessoais atualizados com sucesso!' });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error?.message || 'Erro ao atualizar dados pessoais.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/70 p-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white shadow-sm dark:border-white/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[.22em] text-blue-200">Perfil e acesso</p>
            <h3 className="text-2xl font-black tracking-tight">Sua conta e as empresas vinculadas</h3>
            <p className="max-w-3xl text-sm leading-6 text-slate-300">Aqui você edita seu nome de exibição, senha, e-mails de saída e os dados cadastrais das empresas. Também pode sair da sessão com um clique.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-950 font-black">
                {(user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U')}
              </div>
              <div>
                <p className="text-sm font-bold">{user?.displayName || 'Usuário Blu'}</p>
                <p className="text-xs text-slate-300">{user?.email || 'E-mail não informado'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <X size={16} /> Sair do sistema
            </button>
          </div>
        </div>
        {billingCompletionHint.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-4 text-amber-900">
            <p className="text-[11px] font-black uppercase tracking-[.18em]">Dados de cobrança incompletos</p>
            <p className="mt-1 text-sm leading-6">Antes de pagar planos ou renovar a assinatura, complete em <b>Empresas</b>: {billingCompletionHint.join(', ')}.</p>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-500/10 dark:text-green-100 dark:border-green-400/20' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-500/10 dark:text-red-100 dark:border-red-400/20'}`}>
          {message.type === 'success' ? <Shield size={18} /> : <Lock size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
        {[
          { id: 'personal', label: 'Dados pessoais', icon: User },
          { id: 'company', label: 'Empresas', icon: Building2 }, // Changed label
          { id: 'access', label: 'Dados de Acesso', icon: Lock },
          { id: 'email', label: 'Configurações de E-mail', icon: Send },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
              ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white'
              : 'text-slate-500 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'personal' && (
          <form onSubmit={handleSavePersonalData} className="space-y-8 animate-fade-in-up max-w-3xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
              <h4 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-white">
                <User size={19} className="text-blue-600" /> Dados pessoais
              </h4>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Atualize seus dados para convite de equipe, assinatura e validações de cadastro.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Nome de Exibição</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">CPF</label>
                  <input
                    type="text"
                    value={document}
                    onChange={e => setDocument(maskCpf(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Data de nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(maskPhone(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    placeholder="(85) 99999-9999"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">O e-mail principal não pode ser alterado aqui.</p>
                </div>

                <div className="md:col-span-2 mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <h5 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
                    <MapPin size={17} className="text-blue-600" /> Endereço de cobrança da empresa principal
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Esses dados serão usados no checkout e podem ser preenchidos automaticamente pelo CEP.</p>
                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
                      CEP
                      <input
                        type="text"
                        value={maskCep(personalBilling.cep)}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, cep: maskCep(e.target.value) }))}
                        onBlur={(e) => handleLookupPersonalCep(e.target.value)}
                        placeholder="00000-000"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
                      Logradouro
                      <input
                        type="text"
                        value={personalBilling.logradouro}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, logradouro: e.target.value }))}
                        placeholder="Rua, avenida..."
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Número
                      <input
                        type="text"
                        value={personalBilling.numero}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, numero: e.target.value }))}
                        placeholder="123"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Complemento
                      <input
                        type="text"
                        value={personalBilling.complemento}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, complemento: e.target.value }))}
                        placeholder="Sala, bloco..."
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Bairro
                      <input
                        type="text"
                        value={personalBilling.bairro}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, bairro: e.target.value }))}
                        placeholder="Centro"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Município
                      <input
                        type="text"
                        value={personalBilling.municipio}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, municipio: e.target.value }))}
                        placeholder="Fortaleza"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      UF
                      <input
                        type="text"
                        value={personalBilling.uf}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, uf: e.target.value.toUpperCase() }))}
                        placeholder="CE"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        maxLength={2}
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
                      Telefone da empresa
                      <input
                        type="tel"
                        value={personalBilling.telefone}
                        onChange={(e) => setPersonalBilling((current) => ({ ...current, telefone: maskPhone(e.target.value) }))}
                        placeholder="(85) 99999-9999"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar dados pessoais
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'company' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <h4 className="font-black text-slate-800 dark:text-white">Minhas Empresas</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Selecione qual empresa será usada como base para cobrança, planos e checkout.
                  </p>
                </div>
                <button onClick={handleAddNewCompany} disabled={!plan.allowed('companies', companies.length)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus size={18} /> Adicionar Empresa
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Empresa principal para cobrança</label>
                  <select
                    value={billingCompanyId}
                    onChange={(e) => persistBillingCompanySelection(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    disabled={!companies.length}
                  >
                    {companies.length === 0 ? (
                      <option value="">Nenhuma empresa cadastrada</option>
                    ) : (
                      companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.razaoSocial || company.nomeFantasia || company.cnpj || company.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                  A cobrança e o checkout usarão os dados da empresa selecionada.
                </div>
              </div>
            </div>

          <p className="text-xs font-semibold text-slate-400">Uso do plano: {companies.length}/{plan.label('companies')} empresa(s)</p>
          {!plan.allowed('companies', companies.length) && (
            <PlanLimitWarning>{plan.message('empresas/CNPJs', 'companies')} Você ainda pode editar empresas já cadastradas.</PlanLimitWarning>
          )}

          {companies.length === 0 && !loading ? (
            <div className="text-center py-20 text-slate-400">Nenhuma empresa cadastrada.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(company => (
                <div key={company.id} className={`border rounded-2xl p-6 transition-colors flex flex-col justify-between relative group ${billingCompanyId === company.id ? 'border-blue-300 bg-blue-50/70 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10' : 'border-slate-100 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}`}>
                  <div>
                    {company.logoUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 border border-slate-200 bg-white">
                        <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    {billingCompanyId === company.id && (
                      <div className="mb-3 inline-flex rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-white">
                        Principal para cobrança
                      </div>
                    )}
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
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm">
            <div className="flex h-full w-full items-stretch justify-stretch p-0 md:p-4">
              <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl md:rounded-[2rem] dark:bg-slate-950">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 dark:border-white/10 dark:bg-slate-950">
                <h3 className="text-xl font-bold text-slate-800">{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</h3>
                <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleSaveCompany} className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                {/* Seletor de Logomarca */}
                <div className="flex justify-center mb-6">
                  <div className="relative group cursor-pointer">
                    <div className={`w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${currentCompanyFormData.logoUrl ? 'border-blue-500 bg-white' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'}`}>
                      {currentCompanyFormData.logoUrl ? (
                        <img src={currentCompanyFormData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <Upload size={32} className="mx-auto mb-2" />
                          <span className="text-xs font-bold uppercase">Logomarca</span>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleLogoChange}
                    />
                    {currentCompanyFormData.logoUrl && (
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); setCurrentCompanyFormData({...currentCompanyFormData, logoUrl: ''}); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

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
                          onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, cnpj: maskCnpj(e.target.value) })}
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
                      <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.telefoneFixo} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, telefoneFixo: maskPhone(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Telefone Celular</label>
                      <input type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.telefoneCelular} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, telefoneCelular: maskPhone(e.target.value) })} />
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><MapPin size={18} /> Localização</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-1">CEP *</label>
                      <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.cep} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, cep: maskCep(e.target.value) })} onBlur={e => handleCepBlur(e.target.value)} />
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
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={currentCompanyFormData.complemento} onChange={e => setCurrentCompanyFormData({ ...currentCompanyFormData, complemento: e.target.value })} />
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

                <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-white/10">
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex items-center gap-2">
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Empresa
                  </button>
                </div>
              </form>
            </div>
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
