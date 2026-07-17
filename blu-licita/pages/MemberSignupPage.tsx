import React from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { teamService } from '../services/teamService';
import { BluLogo } from '../components/BluLogo';

export const MemberSignupPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({ name: '', email: '', password: '', confirm: '' });
  const token = params.get('token') || '';
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><form onSubmit={async (event) => { event.preventDefault(); if (form.password !== form.confirm) { setError('As senhas não conferem.'); return; } setLoading(true); setError(''); try { await teamService.accept(token, form.name, form.email, form.password); navigate('/admin/login'); } catch (reason: any) { setError(reason.message || 'Não foi possível aceitar o convite.'); } finally { setLoading(false); } }} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
    <BluLogo/><div className="mt-8"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><UserPlus size={20}/></span><h1 className="mt-4 text-2xl font-bold">Faça parte da equipe</h1><p className="mt-1 text-sm text-slate-500">Crie sua conta para acessar o ambiente da empresa na Blu.</p></div>
    {!token && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">O link de convite está incompleto.</p>}{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 space-y-3"><input required placeholder="Nome completo" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3"/><input required type="email" placeholder="E-mail do convite" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3"/><input required minLength={6} type="password" placeholder="Senha" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3"/><input required type="password" placeholder="Confirme a senha" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3"/><button disabled={loading || !token} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50">{loading && <Loader2 className="animate-spin" size={17}/>}Criar conta</button></div>
  </form></main>;
};
