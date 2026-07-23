import React from 'react';
import { CheckCircle2, Headphones, LifeBuoy, Loader2, MessageCircle, Plus, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useBluAuth } from '../contexts/BluAuthContext';
import { supportService, type NewSupportTicket, type SupportMessage, type SupportTicket, type SupportTicketCategory, type SupportTicketPriority, type SupportTicketStatus } from '../services/supportService';

const statusLabels: Record<SupportTicketStatus, string> = {
  open: 'Aberto',
  waiting_support: 'Aguardando suporte',
  waiting_customer: 'Aguardando cliente',
  resolved: 'Resolvido',
};
const categoryLabels: Record<SupportTicketCategory, string> = {
  support: 'Suporte',
  billing: 'Financeiro',
  technical: 'Técnico',
  suggestion: 'Sugestão',
  training: 'Treinamento',
  sac: 'SAC',
};
const priorityLabels: Record<SupportTicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const emptyTicket: NewSupportTicket = { subject: '', category: 'support', priority: 'medium', description: '', requesterName: '', requesterEmail: '' };

export const SupportPage: React.FC = () => {
  const { user } = useBluAuth();
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<NewSupportTicket>(() => ({ ...emptyTicket, requesterName: user?.name || '', requesterEmail: user?.email || '' }));
  const [reply, setReply] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const selectedTicket = tickets.find((item) => item.id === selectedId) || tickets[0];
  const ticketMessages = selectedTicket ? messages.filter((item) => item.ticketId === selectedTicket.id) : [];

  const load = React.useCallback(async () => {
    setLoading(true);
    const data = await supportService.list();
    setTickets(data.tickets);
    setMessages(data.messages);
    setSelectedId((current) => current || data.tickets[0]?.id || '');
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    setSaving(true);
    const id = await supportService.createTicket({ ...form, requesterName: form.requesterName || user?.name || '', requesterEmail: form.requesterEmail || user?.email || '' });
    setForm({ ...emptyTicket, requesterName: user?.name || '', requesterEmail: user?.email || '' });
    setModalOpen(false);
    await load();
    setSelectedId(id);
    setSaving(false);
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    setSaving(true);
    await supportService.sendMessage(selectedTicket, reply.trim());
    setReply('');
    await load();
    setSelectedId(selectedTicket.id);
    setSaving(false);
  };

  const updateStatus = async (status: SupportTicketStatus) => {
    if (!selectedTicket) return;
    setSaving(true);
    await supportService.updateStatus(selectedTicket, status);
    await load();
    setSelectedId(selectedTicket.id);
    setSaving(false);
  };

  if (loading) return <div className="grid min-h-[520px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between dark:border-white/10 dark:bg-white/8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600 dark:text-blue-300">Atendimento Blu</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Suporte, chamados e SAC</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">Abra chamados, converse com o suporte e acompanhe o histórico de atendimento da sua empresa em um só lugar.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20"><Plus size={17} />Novo chamado</button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<LifeBuoy />} label="Chamados abertos" value={String(tickets.filter((item) => item.status !== 'resolved').length)} />
        <Metric icon={<MessageCircle />} label="Aguardando suporte" value={String(tickets.filter((item) => item.status === 'waiting_support' || item.status === 'open').length)} />
        <Metric icon={<CheckCircle2 />} label="Resolvidos" value={String(tickets.filter((item) => item.status === 'resolved').length)} />
        <Metric icon={<ShieldCheck />} label="SAC" value="Ativo" detail="Canais oficiais centralizados" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
            <h2 className="font-black">Chamados</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{tickets.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {tickets.map((ticket) => (
              <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedTicket?.id === ticket.id ? 'border-blue-300 bg-blue-50 dark:border-blue-300/30 dark:bg-blue-500/10' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/8'}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 text-sm font-black">{ticket.subject}</h3>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{ticket.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <span>{categoryLabels[ticket.category]}</span>
                  <span>•</span>
                  <span>{priorityLabels[ticket.priority]}</span>
                </div>
              </button>
            ))}
            {!tickets.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/10"><Headphones className="mx-auto text-slate-300" size={42} /><p className="mt-3 text-sm font-bold">Nenhum chamado aberto</p><p className="mt-1 text-xs text-slate-400">Clique em “Novo chamado” para iniciar atendimento.</p></div>}
          </div>
        </aside>

        <main className="min-h-[620px] rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/8">
          {selectedTicket ? (
            <div className="flex h-full min-h-[620px] flex-col">
              <div className="border-b border-slate-100 p-5 dark:border-white/10">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selectedTicket.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{categoryLabels[selectedTicket.category]}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{priorityLabels[selectedTicket.priority]}</span></div>
                    <h2 className="mt-3 text-2xl font-black tracking-tight">{selectedTicket.subject}</h2>
                    <p className="mt-1 text-xs text-slate-400">Aberto por {selectedTicket.requesterName} · {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.status !== 'resolved' && <button onClick={() => updateStatus('resolved')} disabled={saving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-60">Marcar resolvido</button>}
                    {selectedTicket.status === 'resolved' && <button onClick={() => updateStatus('waiting_support')} disabled={saving} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-60">Reabrir</button>}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {ticketMessages.map((message) => (
                  <article key={message.id} className={`flex ${message.authorType === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-3xl p-4 ${message.authorType === 'customer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100'}`}>
                      <p className="text-xs font-bold opacity-70">{message.authorName || (message.authorType === 'support' ? 'Suporte Blu' : 'Cliente')}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                      <p className="mt-3 text-[10px] font-semibold opacity-60">{new Date(message.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t border-slate-100 p-4 dark:border-white/10">
                <div className="flex gap-3">
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} placeholder="Escreva uma mensagem para o suporte..." className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/8" />
                  <button onClick={sendReply} disabled={saving || !reply.trim()} className="grid h-[52px] w-[52px] place-items-center rounded-2xl bg-blue-600 text-white disabled:opacity-50"><Send size={18} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[620px] place-items-center p-10 text-center">
              <div><Sparkles className="mx-auto text-blue-500" size={44} /><h2 className="mt-4 text-2xl font-black">Como podemos ajudar?</h2><p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-300">Abra um chamado para suporte técnico, financeiro, treinamento, SAC ou sugestões do produto.</p><button onClick={() => setModalOpen(true)} className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Abrir chamado</button></div>
            </div>
          )}
        </main>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form onSubmit={createTicket} className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
            <header className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/10">
              <div><h2 className="text-xl font-black">Novo chamado</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Descreva sua solicitação para o time Blu.</p></div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Fechar</button>
            </header>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Input label="Nome" value={form.requesterName} onChange={(value) => setForm({ ...form, requesterName: value })} placeholder="Seu nome" />
              <Input label="E-mail" type="email" value={form.requesterEmail} onChange={(value) => setForm({ ...form, requesterEmail: value })} placeholder="seu@email.com" />
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Categoria<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as SupportTicketCategory })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal dark:border-white/10 dark:bg-white/8">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as SupportTicketPriority })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal dark:border-white/10 dark:bg-white/8">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="md:col-span-2"><Input label="Assunto" value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} placeholder="Ex.: Não consigo anexar um documento" /></div>
              <label className="text-xs font-bold text-slate-600 md:col-span-2 dark:text-slate-300">Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required rows={5} placeholder="Conte o que aconteceu, onde estava no sistema e qual resultado esperava." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/8" /></label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 p-5 dark:border-white/10">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-white/10">Cancelar</button>
              <button disabled={saving} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}Abrir chamado</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
};

const Metric = ({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">{icon}</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
    {detail && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{detail}</p>}
  </article>
);

const StatusBadge = ({ status }: { status: SupportTicketStatus }) => {
  const tone = status === 'resolved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : status === 'waiting_customer' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone}`}>{statusLabels[status]}</span>;
};

const Input = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) => (
  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/8" /></label>
);
