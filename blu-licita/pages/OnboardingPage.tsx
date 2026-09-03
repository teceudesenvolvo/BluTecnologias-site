import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Building2, CalendarDays, Check, CheckCircle2, CreditCard, Loader2, PartyPopper, ReceiptText, ShieldCheck, ShoppingCart, Sparkles, UserRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BluLogo } from '../components/BluLogo';
import { useBluAuth } from '../contexts/BluAuthContext';
import { billingClient, formatCents, type BillingPlanView } from '../billing/services/billingClient';
import { lookupCnpjData } from '../../services/cnpjLookup';
import { lookupCepData } from '../../services/cepLookup';
import { defaultVisiblePublicPlans } from '../services/publicPlanCatalog';
import { useFeedbackMessage } from '../components/GlobalFeedback';

const goalsByBusinessType = {
  comercio: ['Vender no PDV', 'Criar minha loja online', 'Controlar produtos e estoque', 'Organizar compras e fornecedores', 'Melhorar o financeiro', 'Integrar meu contador'],
  servicos: ['Organizar minha agenda', 'Receber agendamentos online', 'Gerir profissionais e comissões', 'Controlar insumos e recursos', 'Melhorar o financeiro', 'Integrar meu contador'],
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');
const maskCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
};

const isVisibleSignupPlan = (item: BillingPlanView) => item.public !== false && item.active !== false && item.slug !== 'enterprise' && item.slug !== 'test-1-real';

const Field = ({ label, value, onChange, placeholder, type = 'text', required = true, onBlur }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean; onBlur?: (value: string) => void }) => (
  <label className="text-sm font-semibold text-slate-700">
    {label}
    <input value={value} onChange={(event) => onChange(event.target.value)} onBlur={(event) => onBlur?.(event.target.value)} type={type} required={required} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
  </label>
);

export const OnboardingPage: React.FC = () => {
  const [params] = useSearchParams();
  const requestedBusinessType = params.get('tipo') === 'servicos' ? 'servicos' : 'comercio';
  const [businessType, setBusinessType] = useState<'comercio'|'servicos'>(requestedBusinessType);
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('');
  const [publicPlans, setPublicPlans] = useState<BillingPlanView[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false);
  const [error, setError] = useState('');
  useFeedbackMessage(error);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'boleto' | 'debit_card'>('credit_card');
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [companyForm, setCompanyForm] = useState({
    legalName: '',
    tradeName: '',
    document: '',
    segment: requestedBusinessType === 'servicos' ? 'Serviços' : 'Comércio',
    companySize: '',
    companyLegalNature: '',
    city: '',
    state: '',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
  });
  const { createTrialAccount } = useBluAuth();
  const navigate = useNavigate();
  const partnerCode = params.get('ref') || '';
  const preferredPlan = params.get('plano') || params.get('plan') || '';
  const selectablePlans = useMemo(
    () => publicPlans.filter((item) =>
      isVisibleSignupPlan(item) &&
      (!item.businessTypes?.length || item.businessTypes.includes(businessType))
    ),
    [publicPlans, businessType],
  );
  const currentPlan = useMemo(() => selectablePlans.find((item) => item.id === plan) || selectablePlans[0] || null, [plan, selectablePlans]);
  const isBillingTestPlan = plan === 'test-1-real';
  const isFreePlan = Number(currentPlan?.priceInCents || 0) <= 0;
  const progress = step * 25;

  React.useEffect(() => {
    billingClient.publicPlans()
      .then(({ plans }) => {
        const normalizedPlans = plans.filter(isVisibleSignupPlan);
        setPublicPlans(normalizedPlans);
        setPlan((current) => {
          if (current && normalizedPlans.some((item) => item.id === current || item.slug === current)) return current;
          const preferred = normalizedPlans.find((item) => item.id === preferredPlan || item.slug === preferredPlan);
          return preferred?.id || normalizedPlans[0]?.id || '';
        });
      })
      .catch(() => {
        const fallbackPlans = defaultVisiblePublicPlans() as BillingPlanView[];
        setPublicPlans(fallbackPlans);
        setPlan((current) => {
          if (current && fallbackPlans.some((item) => item.id === current || item.slug === current)) return current;
          const preferred = fallbackPlans.find((item) => item.id === preferredPlan || item.slug === preferredPlan);
          return preferred?.id || fallbackPlans[0]?.id || '';
        });
      })
      .finally(() => setPlansLoading(false));
  }, [preferredPlan]);

  React.useEffect(() => {
    if (!selectablePlans.length) return;
    setPlan((current) => {
      if (selectablePlans.some((item) => item.id === current || item.slug === current)) return current;
      const preferred = selectablePlans.find((item) => item.id === preferredPlan || item.slug === preferredPlan);
      return preferred?.id || selectablePlans[0].id;
    });
  }, [preferredPlan, selectablePlans]);

  const next = () => {
    setError('');
    if (step === 1 && !plan) {
      setError('Selecione um plano para continuar.');
      return;
    }
    if (step === 2 && (!userForm.name || !userForm.email || userForm.password.length < 6 || userForm.password !== userForm.confirmPassword)) {
      setError(userForm.password !== userForm.confirmPassword ? 'As senhas não conferem.' : 'Informe nome, e-mail e uma senha com no mínimo 6 caracteres.');
      return;
    }
    if (step === 3 && (!companyForm.legalName || !companyForm.document)) {
      setError('Informe pelo menos a razão social e o CNPJ da empresa.');
      return;
    }
    if (step === 3 && isBillingTestPlan) {
      const requiredBillingFields = [
        companyForm.phone,
        companyForm.email,
        companyForm.cep,
        companyForm.street,
        companyForm.number,
        companyForm.neighborhood,
        companyForm.city,
        companyForm.state,
      ];
      if (requiredBillingFields.some((value) => !String(value || '').trim())) {
        setError('Para o plano de teste com pagamento, preencha também telefone, e-mail, endereço, CEP e número da empresa.');
        return;
      }
    }
    setStep((value) => Math.min(4, value + 1));
  };
  const back = () => setStep((value) => Math.max(1, value - 1));

  const lookupCompanyByDocument = async (rawDocument: string) => {
    const cnpj = onlyDigits(rawDocument);
    if (cnpj.length !== 14) return;
    setCompanyLookupLoading(true);
    try {
      const data = await lookupCnpjData(cnpj);
      setCompanyForm((current) => ({
        ...current,
        document: data.cnpj,
        legalName: data.razaoSocial || current.legalName,
        tradeName: data.fantasyName || current.tradeName,
        companySize: data.porte || current.companySize,
        companyLegalNature: data.naturezaJuridica || current.companyLegalNature,
        email: data.email || current.email,
        phone: data.phone || current.phone,
        city: data.city || current.city,
        state: data.state || current.state,
        cep: data.cep || current.cep,
        street: data.street || (data.address ? String(data.address).split(',')[0] || current.street : current.street),
        number: data.number || current.number,
        neighborhood: data.neighborhood || current.neighborhood,
        complement: data.complement || current.complement,
      }));
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível consultar o CNPJ informado.');
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  const lookupCompanyByCep = async (rawCep: string) => {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCompanyLookupLoading(true);
    try {
      const data = await lookupCepData(cep);
      setCompanyForm((current) => ({
        ...current,
        cep: data.cep,
        street: data.street || current.street,
        neighborhood: data.neighborhood || current.neighborhood,
        city: data.city || current.city,
        state: data.state || current.state,
        complement: data.complement || current.complement,
      }));
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível consultar o CEP informado.');
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  const finish = async () => {
    setLoading(true);
    setError('');
    try {
      await createTrialAccount({ plan, user: userForm, company: companyForm, goals: selectedGoals, partnerCode });
      if (!isFreePlan && plan === 'test-1-real') {
        navigate('/admin/assinatura/checkout', {
          state: {
            planId: plan,
            paymentMethod,
            billingOrderType: 'FIRST_SUBSCRIPTION',
            planName: selectablePlans.find((item) => item.id === plan)?.name || 'Plano teste Blu',
            amountInCents: selectablePlans.find((item) => item.id === plan)?.priceInCents || 100,
            source: 'onboarding',
          },
        });
        return;
      }
      navigate('/admin/dashboard');
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível criar sua conta. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-slate-200 bg-white/85 px-5 backdrop-blur-xl md:px-10">
        <BluLogo />
        <span className="ml-auto text-sm text-slate-500">Já tem uma conta? <button onClick={() => navigate('/admin/login')} className="font-semibold text-blue-600">Entrar</button></span>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
        <aside className="hidden rounded-[2rem] border border-white/70 bg-white/65 p-8 shadow-sm backdrop-blur-2xl lg:block">
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Teste gratuito Blu</p>
          <h1 className="mt-5 text-5xl font-black tracking-[-0.06em]">Comece em 7 dias. Contrate quando fizer sentido.</h1>
          <p className="mt-5 text-sm leading-7 text-slate-500">Escolha o tipo da operação, selecione o plano, cadastre sua empresa e entre em um ambiente preparado para comércio ou serviços.</p>
          <div className="mt-10 grid gap-3">
            {['Sem cartão no cadastro', 'Módulos adequados ao seu plano', 'Jornada para comércio ou serviços', 'Pagamento confirmado por checkout seguro'].map((item) => (
              <p key={item} className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={17} className="text-emerald-600" />{item}</p>
            ))}
          </div>
        </aside>

        <section>
          <div className="mb-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-blue-600">Etapa {step} de 4</span>
              <span className="text-slate-400">{progress}% concluído</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0877ff] transition-all" style={{ width: `${progress}%` }} /></div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            {error && <p className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}

            {step === 1 && (
              <>
                <StepTitle icon={<Sparkles />} title="Configure sua jornada" description="Escolha o tipo da empresa e o plano que libera os recursos adequados para sua operação." />
                <div className="mt-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
                  <button type="button" onClick={()=>{setBusinessType('comercio');setSelectedGoals([]);setCompanyForm(current=>({...current,segment:'Comércio'}));}} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black ${businessType==='comercio'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><ShoppingCart size={17}/>Comércio</button>
                  <button type="button" onClick={()=>{setBusinessType('servicos');setSelectedGoals([]);setCompanyForm(current=>({...current,segment:'Serviços'}));}} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black ${businessType==='servicos'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><CalendarDays size={17}/>Serviços</button>
                </div>
                {plansLoading ? (
                  <div className="mt-7 grid min-h-[200px] place-items-center rounded-3xl border border-slate-200 bg-slate-50">
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                  </div>
                ) : (
                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                  {selectablePlans.map((item) => (
                    <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`rounded-3xl border p-5 text-left transition ${plan === item.id ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black">{item.name.replace('Plano ', '')}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.description || `Recursos e capacidade para empresas de ${businessType === 'comercio' ? 'comércio' : 'serviços'}.`}</p>
                        </div>
                        {plan === item.id && <Check className="text-blue-600" />}
                      </div>
                      <p className="mt-5 text-2xl font-black">{formatCents(item.priceInCents)}</p>
                      <p className="mt-4 text-xs font-bold text-slate-500">{item.limits.companies ?? '∞'} empresa(s) · {item.limits.users ?? '∞'} usuário(s) · {item.limits.activeContracts ?? '∞'} contratos</p>
                      {item.slug === 'test-1-real' && <p className="mt-3 text-xs font-bold text-amber-600">Plano de cobrança de teste — não inclui 7 dias grátis.</p>}
                    </button>
                  ))}
                </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <StepTitle icon={<UserRound />} title="Crie seu acesso" description="Esse usuário será o proprietário inicial da conta e poderá convidar a equipe depois." />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  <Field label="Nome de exibição" value={userForm.name} onChange={(value) => setUserForm({ ...userForm, name: value })} placeholder="Leonardo Luiz" />
                  <Field label="E-mail profissional" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} placeholder="voce@empresa.com.br" type="email" />
                  <Field label="WhatsApp" value={userForm.phone} onChange={(value) => setUserForm({ ...userForm, phone: value })} placeholder="(85) 99999-9999" required={false} />
                  <div />
                  <Field label="Senha" value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} placeholder="Mínimo 6 caracteres" type="password" />
                  <Field label="Confirmar senha" value={userForm.confirmPassword} onChange={(value) => setUserForm({ ...userForm, confirmPassword: value })} placeholder="Repita a senha" type="password" />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <StepTitle icon={<Building2 />} title="Cadastre a primeira empresa" description="Essa será a empresa principal do ambiente. Depois você poderá adicionar outras conforme o plano." />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    CNPJ
                    <input
                      value={companyForm.document}
                      onChange={(event) => setCompanyForm({ ...companyForm, document: maskCnpj(event.target.value) })}
                      onBlur={(event) => lookupCompanyByDocument(event.target.value)}
                      placeholder="00.000.000/0001-00"
                      inputMode="numeric"
                      maxLength={18}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                      {companyLookupLoading && <span className="mt-2 block text-xs font-semibold text-blue-600">Buscando dados da empresa…</span>}
                  </label>
                  <Field label="Razão social" value={companyForm.legalName} onChange={(value) => setCompanyForm({ ...companyForm, legalName: value })} placeholder="Distribuidora Nordeste Ltda." />
                  <Field label="Nome fantasia" value={companyForm.tradeName} onChange={(value) => setCompanyForm({ ...companyForm, tradeName: value })} placeholder="Distribuidora Nordeste" required={false} />
                  <Field label="Tipo de operação" value={companyForm.segment} onChange={(value) => setCompanyForm({ ...companyForm, segment: value })} placeholder="Comércio ou Serviços" required={false} />
                  <Field label="Porte" value={companyForm.companySize} onChange={(value) => setCompanyForm({ ...companyForm, companySize: value })} placeholder="ME, EPP, LTDA..." required={false} />
                  <Field label="Natureza jurídica" value={companyForm.companyLegalNature} onChange={(value) => setCompanyForm({ ...companyForm, companyLegalNature: value })} placeholder="Sociedade Empresária Limitada" required={false} />
                  <Field label="Cidade" value={companyForm.city} onChange={(value) => setCompanyForm({ ...companyForm, city: value })} placeholder="Fortaleza" required={false} />
                  <Field label="Estado" value={companyForm.state} onChange={(value) => setCompanyForm({ ...companyForm, state: value.toUpperCase() })} placeholder="CE" required={false} />
                  <Field label="E-mail da empresa" value={companyForm.email} onChange={(value) => setCompanyForm({ ...companyForm, email: value })} placeholder="financeiro@empresa.com.br" required={false} />
                  <Field label="Telefone da empresa" value={companyForm.phone} onChange={(value) => setCompanyForm({ ...companyForm, phone: value })} placeholder="(85) 99999-9999" required={false} />
                  <Field label="CEP" value={companyForm.cep} onChange={(value) => setCompanyForm({ ...companyForm, cep: value })} onBlur={(value) => lookupCompanyByCep(value)} placeholder="60000-000" required={false} />
                  <Field label="Logradouro" value={companyForm.street} onChange={(value) => setCompanyForm({ ...companyForm, street: value })} placeholder="Rua ..." required={false} />
                  <Field label="Número" value={companyForm.number} onChange={(value) => setCompanyForm({ ...companyForm, number: value })} placeholder="123" required={false} />
                  <Field label="Bairro" value={companyForm.neighborhood} onChange={(value) => setCompanyForm({ ...companyForm, neighborhood: value })} placeholder="Centro" required={false} />
                  <Field label="Complemento" value={companyForm.complement} onChange={(value) => setCompanyForm({ ...companyForm, complement: value })} placeholder="Sala 2" required={false} />
                </div>
                <div className="mt-7">
                  <p className="text-sm font-semibold text-slate-700">O que você quer melhorar primeiro?</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {goalsByBusinessType[businessType].map((goal) => {
                      const active = selectedGoals.includes(goal);
                      return <button key={goal} type="button" onClick={() => setSelectedGoals(active ? selectedGoals.filter((item) => item !== goal) : [...selectedGoals, goal])} className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}><span className={`grid h-5 w-5 place-items-center rounded-md border ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{active && <Check size={13} />}</span>{goal}</button>;
                    })}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="py-5 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><PartyPopper size={30} /></div>
                <h1 className="mt-6 text-3xl font-black tracking-tight">Seu teste está pronto</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">Vamos criar sua conta, liberar 7 dias gratuitos e abrir o painel executivo da Blu. Você poderá fechar o plano pela página Assinatura quando quiser.</p>
                <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-slate-50 p-5 text-left">
                  <Summary label="Plano" value={currentPlan?.name || '—'} />
                  <Summary label="Usuário" value={userForm.name || userForm.email} />
                  <Summary label="Empresa" value={companyForm.tradeName || companyForm.legalName} />
                  <Summary label="Porte" value={companyForm.companySize || 'Não informado'} />
                  <Summary label="Natureza jurídica" value={companyForm.companyLegalNature || 'Não informada'} />
                  <Summary
                    label={isFreePlan ? "Acesso" : isBillingTestPlan ? "Validação de pagamento" : "Teste"}
                    value={isFreePlan ? "Liberado sem cobrança" : isBillingTestPlan ? "Cobrança simbólica de R$ 1,00" : "7 dias grátis"}
                    tone={isFreePlan ? "text-blue-600" : isBillingTestPlan ? "text-amber-600" : "text-emerald-600"}
                  />
                </div>
                {!isFreePlan && isBillingTestPlan && (
                  <div className="mx-auto mt-6 max-w-xl">
                    <p className="text-sm font-semibold text-slate-700">Como você quer pagar a cobrança de teste?</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {[
                        ['boleto', 'Boleto', ReceiptText],
                        ['credit_card', 'Cartão de crédito', CreditCard],
                        ['debit_card', 'Cartão de débito', Banknote],
                      ].map(([value, label, Icon]) => {
                        const active = paymentMethod === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                            className={`rounded-2xl border p-4 text-left transition ${active ? 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <Icon size={18} />
                            <p className="mt-3 text-sm font-black">{label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{value === 'boleto' ? 'Geração de boleto para pagar depois.' : value === 'debit_card' ? 'Pagamento no débito pinless, sem parcelamento.' : 'Pagamento no cartão de crédito.'}</p>
                            {active && <p className="mt-3 text-xs font-black uppercase tracking-[.18em] text-blue-600">Selecionado</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-10 flex justify-between border-t border-slate-100 pt-6">
              <button onClick={back} disabled={step === 1 || loading} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 disabled:invisible"><ArrowLeft size={17} /> Voltar</button>
              <button onClick={step === 4 ? finish : next} disabled={loading} className="flex items-center gap-2 rounded-2xl bg-[#0877ff] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" /> : step === 4 ? <ShieldCheck size={17} /> : null}{step === 4 ? 'Criar conta e acessar' : 'Continuar'} <ArrowRight size={17} /></button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">Ao continuar, você concorda com os termos da Blu. O pagamento será feito dentro da Blu, pelo checkout seguro, quando você decidir contratar — ou pela cobrança de teste, caso selecione esse plano.</p>
        </section>
      </main>
    </div>
  );
};

const StepTitle = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <span className="rounded-2xl bg-blue-50 p-3 text-blue-600">{icon}</span>
    <div><h1 className="text-2xl font-black tracking-tight">{title}</h1><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>
  </div>
);

const Summary = ({ label, value, tone = 'text-slate-950' }: { label: string; value: string; tone?: string }) => (
  <div className="flex justify-between gap-4 border-b border-slate-200 py-3 text-sm last:border-b-0">
    <span className="text-slate-500">{label}</span>
    <strong className={`text-right ${tone}`}>{value || '—'}</strong>
  </div>
);
