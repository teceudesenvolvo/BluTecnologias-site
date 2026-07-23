import React from 'react';
import { Copy, Loader2, Mail, Phone, UserPlus, Users, X } from 'lucide-react';
import { teamService, type TeamMember } from '../services/teamService';
import { PlanLimitWarning, usePlanLimits } from '../hooks/usePlanLimits';

export const TeamPage: React.FC = () => {
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [link, setLink] = React.useState('');
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', role: 'Analista', department: '' });
  const plan = usePlanLimits();
  const load = React.useCallback(() => teamService.list().then(setMembers).finally(() => setLoading(false)), []);
  React.useEffect(() => { load(); }, [load]);
  const activeSeats = Math.max(1, members.filter((member) => member.status !== 'inactive').length || 1);
  const canInvite = plan.allowed('users', activeSeats);
  const openInvite = () => {
    if (!canInvite) {
      setError(plan.message('usuários da equipe', 'users'));
      return;
    }
    setOpen(true);
  };
  if (loading) return <div className="grid min-h-[500px] place-items-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  return <div className="mx-auto max-w-[1400px] space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Pessoas e acesso</p><h1 className="mt-2 text-3xl font-bold">Equipe</h1><p className="mt-1 text-sm text-slate-500">Convide membros e organize responsabilidades na Blu.</p><p className="mt-2 text-xs font-semibold text-slate-400">Uso do plano: {activeSeats}/{plan.label('users')} usuário(s)</p></div><button onClick={openInvite} disabled={!canInvite} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><UserPlus size={17}/>Inserir membro</button></header>
    {!canInvite && <PlanLimitWarning>{plan.message('usuários da equipe', 'users')} Faça upgrade do plano para convidar novos membros.</PlanLimitWarning>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{members.map((member) => <article key={member.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-full bg-slate-950 font-bold text-white">{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{member.status === 'active' ? 'Ativo' : 'Convite enviado'}</span></div><h2 className="mt-4 font-bold">{member.name}</h2><p className="text-sm text-slate-500">{member.role}{member.department ? ` · ${member.department}` : ''}</p><p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Mail size={14}/>{member.email}</p>{member.phone && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Phone size={14}/>{member.phone}</p>}</article>)}
      {!members.length && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center"><Users className="mx-auto text-slate-300" size={48}/><h2 className="mt-4 font-bold">Nenhum membro cadastrado</h2><p className="mt-1 text-sm text-slate-500">Envie o primeiro convite para montar sua equipe.</p></div>}
    </div>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><form onSubmit={async (event) => { event.preventDefault(); if (!canInvite) { setError(plan.message('usuários da equipe', 'users')); return; } setSaving(true); setError(''); try { setLink(await teamService.invite(form)); await load(); } catch (reason: any) { setError(reason.message || 'Não foi possível enviar o convite.'); } finally { setSaving(false); } }} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Convidar membro</h2><button type="button" onClick={() => { setOpen(false); setLink(''); setError(''); }}><X className="text-slate-400"/></button></div>
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {link ? <div className="mt-6 rounded-xl bg-emerald-50 p-5"><p className="font-bold text-emerald-800">Convite enviado</p><p className="mt-1 text-sm text-emerald-700">O link também pode ser compartilhado manualmente:</p><div className="mt-3 flex gap-2"><input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 text-xs"/><button type="button" onClick={() => navigator.clipboard.writeText(link)} className="rounded-lg bg-emerald-700 p-2 text-white"><Copy size={16}/></button></div></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><input required placeholder="Nome completo" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"/><input required type="email" placeholder="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"/><input placeholder="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"/><input placeholder="Departamento" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"/><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:col-span-2"><option>Diretor</option><option>Financeiro</option><option>Gestor de contratos</option><option>Contador</option><option>Analista</option><option>Somente leitura</option></select><button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white sm:col-span-2">{saving ? <Loader2 className="animate-spin" size={17}/> : <Mail size={17}/>}Enviar convite</button></div>}
    </form></div>}
  </div>;
};
