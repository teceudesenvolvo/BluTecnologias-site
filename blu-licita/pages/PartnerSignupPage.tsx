import React from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CreditCard, Loader2, PartyPopper, ShieldCheck, Sparkles, Copy, Check, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BluLogo } from '../components/BluLogo';
import { partnerService } from '../services/partnerService';
import { lookupCnpjData } from '../../services/cnpjLookup';
import { useBluAuth } from '../contexts/BluAuthContext';
import { useFeedbackMessage } from '../components/GlobalFeedback';

const steps = ['Dados pessoais', 'Dados comerciais', 'Dados bancários', 'Conferência'];

const onlyDigits = (value: string) => value.replace(/\D/g, '');
const maskCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};
const maskCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4').replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
};
const maskDocumentByType = (value: string, partnerType: 'pf' | 'pj') => (partnerType === 'pf' ? maskCpf(value) : maskCnpj(value));
const documentMaxLength = (partnerType: 'pf' | 'pj') => (partnerType === 'pf' ? 14 : 18);
const maskPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};
const maskAgency = (value: string) => onlyDigits(value).slice(0, 6).replace(/^(\d{4})(\d)/, '$1-$2');
const maskAccount = (value: string) => value.replace(/[^0-9\-]/g, '').slice(0, 15);
const cleanRef = (value: string) => value.trim().replace(/[^a-z0-9-_]/gi, '').toUpperCase();

const Field = ({ label, value, onChange, placeholder, type = 'text', required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) => (
  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
    {label}
    <input value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white" />
  </label>
);

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) => (
  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
    {label}
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  </label>
);

export const PartnerSignupPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { createPartnerAccount } = useBluAuth();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  useFeedbackMessage(error);
  const [copied, setCopied] = React.useState(false);
  const [form, setForm] = React.useState({
    partnerType: 'pj',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    document: '',
    birthDate: '',
    legalName: '',
    tradeName: '',
    companyDocument: '',
    city: '',
    state: '',
    segment: '',
    website: '',
    bankName: '',
    agency: '',
    accountNumber: '',
    pixKey: '',
    pixType: 'cpf',
    gatewayFeePercent: '2.99',
    taxPercent: '10',
    partnerCode: '',
    acceptTerms: false,
  });

  const referral = params.get('ref') || '';
  React.useEffect(() => {
    if (referral) setForm((current) => ({ ...current, partnerCode: referral }));
  }, [referral]);

  const estimatedCommission = React.useMemo(() => {
    const monthly = 49700;
    const gatewayFee = monthly * (Number(form.gatewayFeePercent || 0) / 100);
    const tax = monthly * (Number(form.taxPercent || 0) / 100);
    return Math.max(0, monthly - gatewayFee - tax);
  }, [form.gatewayFeePercent, form.taxPercent]);

  const fetchCompanyData = async (rawDocument: string) => {
    const cnpj = onlyDigits(rawDocument);
    if (form.partnerType !== 'pj' || cnpj.length !== 14) return;
    setLookupLoading(true);
    try {
      const data = await lookupCnpjData(cnpj);
      setForm((current) => ({
        ...current,
        companyDocument: data.cnpj,
        legalName: data.razaoSocial || current.legalName,
        tradeName: data.fantasyName || current.tradeName,
        city: data.city || current.city,
        state: data.state || current.state,
        website: current.website,
      }));
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível consultar o CNPJ informado.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDocumentBlur = async (value: string, target: 'primary' | 'company') => {
    const digits = onlyDigits(value);
    if (form.partnerType !== 'pj') return;
    const formatted = maskCnpj(digits);
    if (target === 'primary' && formatted !== form.document) {
      setForm((current) => ({ ...current, document: formatted }));
    }
    if (target === 'company' && formatted !== form.companyDocument) {
      setForm((current) => ({ ...current, companyDocument: formatted }));
    }
    if (digits.length === 14) {
      await fetchCompanyData(digits);
    }
  };

  const selectPartnerType = (partnerType: 'pf' | 'pj') => {
    setForm((current) => ({
      ...current,
      partnerType,
      legalName: partnerType === 'pf' ? (current.legalName || current.name) : current.legalName,
      tradeName: partnerType === 'pf' ? (current.tradeName || current.name) : current.tradeName,
    }));
  };

  const next = () => {
    setError('');
    if (step === 1 && (!form.name || !form.email || form.password.length < 6 || form.password !== form.confirmPassword)) {
      setError(form.password !== form.confirmPassword ? 'As senhas não conferem.' : 'Preencha nome, e-mail e uma senha com no mínimo 6 caracteres.');
      return;
    }
    if (step === 2 && !form.document) {
      setError('Informe o CPF/CNPJ e os dados da operação comercial.');
      return;
    }
    if (step === 3 && (!form.bankName || !form.pixKey)) {
      setError('Informe o banco e a chave Pix para o cadastro do parceiro.');
      return;
    }
    setStep((value) => Math.min(4, value + 1));
  };
  const back = () => setStep((value) => Math.max(1, value - 1));

  const finish = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await createPartnerAccount({
        partnerType: form.partnerType as 'pf' | 'pj' | 'revendedor',
        user: {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          document: form.document,
          birthDate: form.birthDate,
        },
        company: {
          legalName: form.legalName,
          tradeName: form.tradeName,
          document: form.companyDocument,
          city: form.city,
          state: form.state,
          segment: form.segment,
          website: form.website,
        },
        financial: {
          bankName: form.bankName,
          agency: form.agency,
          accountNumber: form.accountNumber,
          pixKey: form.pixKey,
          pixType: form.pixType as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random',
        },
        paymentProfile: {
          gatewayFeePercent: Number(form.gatewayFeePercent || 2.99),
          taxPercent: Number(form.taxPercent || 10),
        },
        partnerCode: referral,
        acceptTerms: form.acceptTerms,
      });
      navigate('/admin/parceiros', { state: { createdPartner: user } });
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível criar seu cadastro de parceiro.');
    } finally {
      setLoading(false);
    }
  };

  const salesLink = React.useMemo(() => partnerService.buildSalesLink(cleanRef(form.partnerCode || referral || 'PARCEIRO')), [form.partnerCode, referral]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(salesLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-slate-200 bg-white/85 px-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 md:px-10">
        <BluLogo />
        <span className="ml-auto text-sm text-slate-500 dark:text-slate-300">Já é parceiro? <Link to="/admin/login" className="font-semibold text-blue-600">Entrar</Link></span>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <aside className="hidden rounded-[2rem] border border-white/70 bg-white/65 p-8 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] lg:block">
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Portal do parceiro</p>
          <h1 className="mt-5 text-5xl font-black tracking-[-0.06em]">Vendas recorrentes com controle e comissão clara.</h1>
          <p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-300">Cadastre-se como parceiro Blu, informe seus dados bancários e crie seu link de vendas para indicar clientes sem expor a linha de revenda.</p>
          <div className="mt-10 grid gap-3">
            {['Cadastro independente dos clientes', 'Comissão calculada na primeira mensalidade', 'Link de indicação com rastreio interno', 'Parceiro entra no portal após aprovar o cadastro'].map((item) => <p key={item} className="flex items-center gap-3 text-sm font-bold"><BadgeCheck size={17} className="text-emerald-600" />{item}</p>)}
          </div>
        </aside>

        <section>
          <div className="mb-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-blue-600">Etapa {step} de 4</span>
              <span className="text-slate-400">{Math.round((step / 4) * 100)}% concluído</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-[#0877ff] transition-all" style={{ width: `${(step / 4) * 100}%` }} /></div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:p-8">
            {error && <p className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100">{error}</p>}
            {step === 1 && (
              <>
                <StepTitle icon={<Sparkles />} title="Comece seu cadastro de parceiro" description="Diga quem você é e crie seu acesso ao portal do parceiro." />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de parceiro</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {[
                        { value: 'pf', label: 'Pessoa Física', description: 'Cadastro individual com CPF.' },
                        { value: 'pj', label: 'Pessoa Jurídica', description: 'Cadastro empresarial com CNPJ.' },
                      ].map((item) => {
                        const active = form.partnerType === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => selectPartnerType(item.value as 'pf' | 'pj')}
                            className={`rounded-3xl border p-4 text-left transition ${
                              active
                                ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20'
                                : 'border-slate-200 bg-white hover:border-blue-200 dark:border-white/10 dark:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-950 dark:text-white">{item.label}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.description}</p>
                              </div>
                              <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-white/20'}`}>
                                ✓
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Field
                    label={form.partnerType === 'pj' ? 'CNPJ' : 'CPF'}
                    value={form.document}
                    onChange={(value) => {
                      const nextDocument = maskDocumentByType(value, form.partnerType as 'pf' | 'pj');
                      setForm({ ...form, document: nextDocument });
                    }}
                    onBlur={(event) => { void handleDocumentBlur(event.target.value, 'primary'); }}
                    placeholder={form.partnerType === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'}
                  />
                  <Field label="Nome completo / razão social" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Nome do parceiro" />
                  <Field label="E-mail" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="parceiro@empresa.com.br" type="email" />
                  <Field label="WhatsApp" value={form.phone} onChange={(value) => setForm({ ...form, phone: maskPhone(value) })} placeholder="(85) 99999-9999" required={false} />
                  <Field label="Senha" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="Mínimo 6 caracteres" type="password" />
                  <Field label="Confirmar senha" value={form.confirmPassword} onChange={(value) => setForm({ ...form, confirmPassword: value })} placeholder="Repita a senha" type="password" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <StepTitle
                  icon={<Building2 />}
                  title={form.partnerType === 'pf' ? 'Dados pessoais' : 'Dados comerciais'}
                  description={form.partnerType === 'pf'
                    ? 'Precisamos dos seus dados pessoais para organizar o cadastro de parceiro.'
                    : 'Precisamos das informações da operação para organizar seu cadastro e suas indicações.'}
                />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  <Field
                    label={form.partnerType === 'pj' ? 'CNPJ da operação' : 'CPF do parceiro'}
                    value={form.companyDocument}
                    onChange={(value) => setForm({ ...form, companyDocument: maskDocumentByType(value, form.partnerType as 'pf' | 'pj') })}
                    onBlur={(event) => { void handleDocumentBlur(event.target.value, 'company'); }}
                    placeholder={form.partnerType === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'}
                  />
                  <Field
                    label={form.partnerType === 'pf' ? 'Nome completo' : 'Nome da empresa'}
                    value={form.legalName}
                    onChange={(value) => setForm({ ...form, legalName: value })}
                    placeholder={form.partnerType === 'pf' ? 'Seu nome completo' : 'Razão social'}
                  />
                  <Field
                    label={form.partnerType === 'pf' ? 'Nome de exibição' : 'Nome de exibição / fantasia'}
                    value={form.tradeName}
                    onChange={(value) => setForm({ ...form, tradeName: value })}
                    placeholder={form.partnerType === 'pf' ? 'Nome para apresentação' : 'Nome comercial'}
                    required={false}
                  />
                  <Field label="Data de nascimento" value={form.birthDate} onChange={(value) => setForm({ ...form, birthDate: value })} placeholder="" type="date" required={false} />
                  <Field label="Cidade" value={form.city} onChange={(value) => setForm({ ...form, city: value })} placeholder="Fortaleza" required={false} />
                  <Field label="Estado" value={form.state} onChange={(value) => setForm({ ...form, state: value.toUpperCase() })} placeholder="CE" required={false} />
                  <Field label="Segmento" value={form.segment} onChange={(value) => setForm({ ...form, segment: value })} placeholder="Tecnologia, representação..." required={false} />
                  <Field label="Site / perfil comercial" value={form.website} onChange={(value) => setForm({ ...form, website: value })} placeholder="https://..." required={false} />
                  {form.partnerType === 'pj' && (
                    <button type="button" onClick={() => fetchCompanyData(form.document || form.companyDocument)} disabled={lookupLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                      {lookupLoading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
                      Buscar dados no CNPJ
                    </button>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <StepTitle icon={<CreditCard />} title="Dados bancários e Pix" description="A comissão precisa de conta bancária para repasse e validação financeira." />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  <Field label="Banco" value={form.bankName} onChange={(value) => setForm({ ...form, bankName: value })} placeholder="Banco do Brasil" />
                  <Field label="Agência" value={form.agency} onChange={(value) => setForm({ ...form, agency: maskAgency(value) })} placeholder="0000-0" />
                  <Field label="Conta" value={form.accountNumber} onChange={(value) => setForm({ ...form, accountNumber: maskAccount(value) })} placeholder="00000-0" />
                  <SelectField label="Tipo de chave Pix" value={form.pixType} onChange={(value) => setForm({ ...form, pixType: value })} options={[['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['email', 'E-mail'], ['phone', 'Telefone'], ['random', 'Aleatória']]} />
                  <Field label="Chave Pix" value={form.pixKey} onChange={(value) => setForm({ ...form, pixKey: value })} placeholder="Sua chave Pix" />
                  <Field label="Fee do gateway (%)" value={form.gatewayFeePercent} onChange={(value) => setForm({ ...form, gatewayFeePercent: value })} placeholder="2.99" />
                  <Field label="Impostos (%)" value={form.taxPercent} onChange={(value) => setForm({ ...form, taxPercent: value })} placeholder="10" />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Comissão estimada</p>
                    <p className="mt-2 text-2xl font-black text-emerald-600">R$ {(estimatedCommission / 100).toFixed(2)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Base: {currentPlan.name}. Comissão = primeira mensalidade - gateway - 10% de impostos.</p>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="py-5 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200"><PartyPopper size={30} /></div>
                <h1 className="mt-6 text-3xl font-black tracking-tight">Seu portal de parceiro está pronto</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-300">Vamos criar seu acesso, registrar sua operação comercial e liberar seu link de vendas interno.</p>
                <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-slate-50 p-5 text-left dark:bg-white/[0.04]">
                  <Summary label="Tipo" value={form.partnerType === 'revendedor' ? 'Revendedor' : form.partnerType === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
                  <Summary label="Parceiro" value={form.name || form.email} />
                  <Summary label="Plano referência" value="Plano base Blu" />
                  <Summary label="Link de vendas" value={salesLink} tone="text-blue-600 break-all" />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {copied ? <Check size={17} className="text-emerald-600" /> : <Copy size={17} />}
                    {copied ? 'Link copiado' : 'Copiar link'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-between border-t border-slate-100 pt-6 dark:border-white/10">
              <button onClick={back} disabled={step === 1 || loading} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 disabled:invisible dark:text-slate-400"><ArrowLeft size={17} /> Voltar</button>
              <button onClick={step === 4 ? finish : next} disabled={loading} className="flex items-center gap-2 rounded-2xl bg-[#0877ff] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" /> : step === 4 ? <ShieldCheck size={17} /> : null}{step === 4 ? 'Criar parceiro e acessar' : 'Continuar'} <ArrowRight size={17} /></button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400 dark:text-slate-500">Ao criar o cadastro, você concorda com a política comercial da Blu e com o uso dos seus dados para repasses e comissionamento.</p>
        </section>
      </main>
    </div>
  );
};

const StepTitle = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <span className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">{icon}</span>
    <div><h1 className="text-2xl font-black tracking-tight">{title}</h1><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p></div>
  </div>
);

const Summary = ({ label, value, tone = 'text-slate-950' }: { label: string; value: string; tone?: string }) => (
  <div className="flex justify-between gap-4 border-b border-slate-200 py-3 text-sm last:border-b-0 dark:border-white/10">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <strong className={`text-right ${tone}`}>{value || '—'}</strong>
  </div>
);
