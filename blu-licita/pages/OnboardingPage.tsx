import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Loader2, PartyPopper, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BluLogo } from '../components/BluLogo';
import { useBluAuth } from '../contexts/BluAuthContext';
import { subscriptionPlans, type PlanKey } from '../services/subscriptionPlanService';

const goals = ['Encontrar oportunidades melhores', 'Analisar editais com IA', 'Organizar documentos', 'Controlar contratos', 'Cobrar órgãos públicos', 'Acompanhar fluxo de caixa'];
const planPrices: Record<PlanKey, string> = { essential: 'R$ 197/mês', professional: 'R$ 497/mês', performance: 'R$ 997/mês', enterprise: 'Sob consulta' };

const Field = ({ label, value, onChange, placeholder, type = 'text', required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) => (
  <label className="text-sm font-semibold text-slate-700">
    {label}
    <input value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
  </label>
);

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<PlanKey>('professional');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [companyForm, setCompanyForm] = useState({ legalName: '', tradeName: '', document: '', segment: '', city: '', state: '' });
  const { createTrialAccount } = useBluAuth();
  const navigate = useNavigate();
  const currentPlan = useMemo(() => subscriptionPlans.find((item) => item.key === plan) || subscriptionPlans[1], [plan]);
  const progress = step * 25;

  const next = () => {
    setError('');
    if (step === 2 && (!userForm.name || !userForm.email || userForm.password.length < 6 || userForm.password !== userForm.confirmPassword)) {
      setError(userForm.password !== userForm.confirmPassword ? 'As senhas não conferem.' : 'Informe nome, e-mail e uma senha com no mínimo 6 caracteres.');
      return;
    }
    if (step === 3 && (!companyForm.legalName || !companyForm.document)) {
      setError('Informe pelo menos a razão social e o CNPJ da empresa.');
      return;
    }
    setStep((value) => Math.min(4, value + 1));
  };
  const back = () => setStep((value) => Math.max(1, value - 1));

  const finish = async () => {
    setLoading(true);
    setError('');
    try {
      await createTrialAccount({ plan, user: userForm, company: companyForm, goals: selectedGoals });
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
          <p className="mt-5 text-sm leading-7 text-slate-500">A jornada foi pensada para o dono da empresa: escolha a capacidade, cadastre sua empresa e entre direto no painel para organizar oportunidades, contratos, documentos e cobranças.</p>
          <div className="mt-10 grid gap-3">
            {['Sem cartão no cadastro', 'Todos os módulos liberados', 'Capacidade definida pelo plano', 'Pagamento confirmado por checkout seguro'].map((item) => (
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
                <StepTitle icon={<Sparkles />} title="Escolha seu plano para o teste" description="Todos os planos possuem as funcionalidades da Blu. O que muda é a capacidade operacional." />
                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  {subscriptionPlans.map((item) => (
                    <button key={item.key} type="button" onClick={() => setPlan(item.key)} className={`rounded-3xl border p-5 text-left transition ${plan === item.key ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="text-xl font-black">{item.name.replace('Plano ', '')}</h3><p className="mt-1 text-sm text-slate-500">{item.subtitle}</p></div>
                        {plan === item.key && <Check className="text-blue-600" />}
                      </div>
                      <p className="mt-5 text-2xl font-black">{planPrices[item.key]}</p>
                      <p className="mt-4 text-xs font-bold text-slate-500">{item.limits.companies ?? '∞'} empresa(s) · {item.limits.users ?? '∞'} usuário(s) · {item.limits.activeContracts ?? '∞'} contratos</p>
                    </button>
                  ))}
                </div>
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
                  <Field label="CNPJ" value={companyForm.document} onChange={(value) => setCompanyForm({ ...companyForm, document: value })} placeholder="00.000.000/0001-00" />
                  <Field label="Razão social" value={companyForm.legalName} onChange={(value) => setCompanyForm({ ...companyForm, legalName: value })} placeholder="Distribuidora Nordeste Ltda." />
                  <Field label="Nome fantasia" value={companyForm.tradeName} onChange={(value) => setCompanyForm({ ...companyForm, tradeName: value })} placeholder="Distribuidora Nordeste" required={false} />
                  <Field label="Segmento" value={companyForm.segment} onChange={(value) => setCompanyForm({ ...companyForm, segment: value })} placeholder="Produtos, serviços, tecnologia..." required={false} />
                  <Field label="Cidade" value={companyForm.city} onChange={(value) => setCompanyForm({ ...companyForm, city: value })} placeholder="Fortaleza" required={false} />
                  <Field label="Estado" value={companyForm.state} onChange={(value) => setCompanyForm({ ...companyForm, state: value.toUpperCase() })} placeholder="CE" required={false} />
                </div>
                <div className="mt-7">
                  <p className="text-sm font-semibold text-slate-700">O que você quer melhorar primeiro?</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {goals.map((goal) => {
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
                  <Summary label="Plano" value={currentPlan.name} />
                  <Summary label="Usuário" value={userForm.name || userForm.email} />
                  <Summary label="Empresa" value={companyForm.tradeName || companyForm.legalName} />
                  <Summary label="Teste" value="7 dias grátis" tone="text-emerald-600" />
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-between border-t border-slate-100 pt-6">
              <button onClick={back} disabled={step === 1 || loading} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 disabled:invisible"><ArrowLeft size={17} /> Voltar</button>
              <button onClick={step === 4 ? finish : next} disabled={loading} className="flex items-center gap-2 rounded-2xl bg-[#0877ff] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" /> : step === 4 ? <ShieldCheck size={17} /> : null}{step === 4 ? 'Criar conta e acessar' : 'Continuar'} <ArrowRight size={17} /></button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">Ao continuar, você concorda com os termos da Blu. O pagamento será feito somente pelo checkout seguro quando você decidir contratar.</p>
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
