import React from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { db } from '../services/firebase';

const DISMISS_KEY = 'blu-tools-lead-dismissed-v1';
export function FreeToolsLeadPopup() {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    setOpen(false);
    if (!location.pathname.startsWith('/ferramentas')) return;
    try { if (sessionStorage.getItem(DISMISS_KEY) === '1') return; } catch {}
    const timer = window.setTimeout(() => setOpen(true), 60_000);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);
  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };
  if (!open || !location.pathname.startsWith('/ferramentas')) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) { setError('Autorize o contato para enviar seus dados.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || phone.replace(/\D/g, '').length < 10) {
      setError('Confira o e-mail e o telefone com DDD.'); return;
    }
    setSending(true); setError('');
    try {
      await addDoc(collection(db, 'freeToolsLeads'), {
        name: name.trim().slice(0, 120), email: email.trim().toLowerCase().slice(0, 180),
        phone: phone.replace(/\D/g, '').slice(0, 15), source: 'blu-tools',
        toolPath: location.pathname, consent: true, consentTextVersion: '2026-11',
        createdAt: serverTimestamp(),
      });
      close();
    } catch {
      setError('Não foi possível registrar seu contato agora. Tente novamente mais tarde.');
    } finally { setSending(false); }
  };
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="blu-lead-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Blu Tecnologias</p><h2 id="blu-lead-title" className="mt-2 text-2xl font-bold">Quer conhecer nossas soluções?</h2></div><button onClick={close} aria-label="Fechar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button></div>
      <p className="mt-3 text-sm text-slate-600">As ferramentas continuam gratuitas. Se desejar conversar com nossa equipe, deixe seu contato.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block text-sm font-semibold">Nome<input required maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" /></label>
        <label className="block text-sm font-semibold">E-mail<input required type="email" maxLength={180} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" /></label>
        <label className="block text-sm font-semibold">Telefone com DDD<input required type="tel" maxLength={20} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" /></label>
        <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1" /><span>Autorizo a Blu Tecnologias a utilizar meus dados para entrar em contato sobre seus produtos e serviços. <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Política de Privacidade</a>.</span></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={sending || !consent} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50">{sending ? 'Enviando...' : 'Quero receber contato'}</button>
        <button type="button" onClick={close} className="w-full py-2 text-sm font-semibold text-slate-500">Continuar usando gratuitamente</button>
      </form>
    </section>
  </div>;
}
