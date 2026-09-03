import React from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';
import { useBluAuth } from '../contexts/BluAuthContext';
import { notifyFeedback } from '../components/GlobalFeedback';

type Referral = { id: string; companyId: string; name: string; email: string; status: string; cnpj?: string; businessType?: 'comercio' | 'servicos'; referralCode?: string };
export const CustomerReferralsPage = () => {
  const { user } = useBluAuth();
  const [data, setData] = React.useState<{ items: Referral[]; discountPercent: number }>({ items: [], discountPercent: 0 });
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [cnpj, setCnpj] = React.useState('');
  const [businessType, setBusinessType] = React.useState<'comercio' | 'servicos'>('comercio');
  const referralLink = (item: Referral) => `${window.location.origin}/empresas/${item.businessType || 'comercio'}?indicacao=${encodeURIComponent(item.referralCode || '')}`;
  const copyLink = async (item: Referral) => {
    try { await navigator.clipboard.writeText(referralLink(item)); notifyFeedback('Link de indicação copiado.', 'success'); }
    catch { notifyFeedback('Não foi possível copiar. Selecione o link exibido e copie manualmente.'); }
  };
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const run = async (action: string, extra = {}) => {
    setBusy(true); setError('');
    try {
      const response = await httpsCallable<object, typeof data>(functions, 'customerReferralProgram')({ companyId: user?.companyId, action, ...extra });
      setData(response.data);
      if (action === 'register') { setName(''); setEmail(''); notifyFeedback('Indicação registrada com sucesso.', 'success'); }
    } catch (reason: any) { setError(['functions/internal', 'functions/not-found', 'functions/unavailable'].includes(reason.code) ? 'Não foi possível acessar a API de indicações. A publicação da função customerReferralProgram precisa ser verificada pela Blu.' : reason.message || 'Não foi possível carregar o programa.'); }
    finally { setBusy(false); }
  };
  React.useEffect(() => { setData({ items: [], discountPercent: 0 }); if (user?.companyId) void run('list'); }, [user?.companyId]);
  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-3xl bg-blue-600 p-8 text-white"><p className="text-sm font-bold">Programa de indicação Blu</p><h1 className="mt-3 text-3xl font-black">Indique e ganhe</h1><p className="mt-3 max-w-2xl leading-7">Indique outras empresas e transforme suas indicações em desconto na mensalidade. A primeira contratação fechada vale 5%. Cada nova contratação acrescenta 1 ponto percentual, até 100%.</p><p className="mt-6 text-5xl font-black">{data.discountPercent}%</p><p className="mt-2 text-sm">Desconto conquistado · aplicado em novas cobranças mensais após confirmação do fechamento pela Blu.</p></section>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => run('list')}>Tentar novamente</button></div>}
    <form onSubmit={event => { event.preventDefault(); void run('register', { name, email, cnpj, businessType }); }} className="rounded-2xl border bg-white p-6 dark:bg-slate-900 dark:border-white/10"><h2 className="text-xl font-bold">Indicar uma empresa</h2><p className="mt-2 text-sm text-slate-500">Informe um contato que autorizou o compartilhamento dos dados com a Blu. O cadastro da indicação não concede desconto antes do fechamento.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label>CNPJ da empresa<input required inputMode="numeric" maxLength={18} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label><label>Segmento<select value={businessType} onChange={e => setBusinessType(e.target.value as 'comercio' | 'servicos')} className="mt-2 w-full rounded-xl border bg-transparent p-3"><option value="comercio">Comércio</option><option value="servicos">Serviços</option></select></label><label>Empresa ou responsável<input required maxLength={150} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label><label>E-mail de contato<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label></div><button disabled={busy} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Aguarde...' : 'Registrar indicação'}</button></form>
    <section className="rounded-2xl border bg-white p-6 dark:bg-slate-900 dark:border-white/10"><h2 className="text-xl font-bold">Minhas indicações</h2><div className="mt-4 divide-y">{data.items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold">{item.name}</p><p className="text-sm text-slate-500">{item.email} · CNPJ: {item.cnpj || 'Não informado (cadastro antigo)'}</p>{item.referralCode && <div className="mt-2"><a className="block break-all text-xs text-blue-600" href={referralLink(item)} target="_blank" rel="noreferrer">{referralLink(item)}</a><button onClick={() => copyLink(item)} className="mt-2 text-sm font-bold text-blue-600">Copiar link de {item.businessType === 'servicos' ? 'serviços' : 'comércio'}</button></div>}</div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">{item.status === 'closed' ? 'Fechamento confirmado' : 'Aguardando fechamento'}</span>{user?.email === 'admin@blutecnologias.com.br' && item.status !== 'closed' && <button disabled={busy} onClick={() => { const targetCompanyId = prompt('ID da empresa contratante para confirmar o fechamento:'); if (targetCompanyId) void run('close', { id: item.id, targetCompanyId, companyId: item.companyId }); }} className="text-sm font-bold text-blue-600">Confirmar fechamento</button>}</div>)}</div>{!data.items.length && <p className="mt-5 text-slate-500">Nenhuma indicação registrada.</p>}</section>
  </div>;
};
