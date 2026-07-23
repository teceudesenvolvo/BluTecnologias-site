import React from "react";
import { CalendarClock, Loader2, Plus, Save, X } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { createCompanyDoc, listCompanyDocs } from "../services/firestoreCompany";

type Event = { id: string; title: string; type: string; date: string; time?: string; source?: string };
const today = () => new Date().toISOString().slice(0, 10);
const brDate = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export const CalendarPage: React.FC = () => {
  const { user } = useBluAuth();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [manual, orders, collections, documents] = await Promise.all([
        listCompanyDocs<Event>("calendarEvents", user.companyId).catch(() => []),
        listCompanyDocs<any>("serviceOrders", user.companyId).catch(() => []),
        listCompanyDocs<any>("collections", user.companyId).catch(() => []),
        listCompanyDocs<any>("companyDocuments", user.companyId).catch(() => []),
      ]);
      const generated: Event[] = [
        ...orders.filter((item) => item.dueDate).map((item) => ({ id: `order-${item.id}`, title: item.description || item.number, type: item.kind === "supply" ? "Ordem de fornecimento" : "Ordem de serviço", date: item.dueDate, source: "serviceOrders" })),
        ...collections.filter((item) => item.dueDate).map((item) => ({ id: `collection-${item.id}`, title: item.description || item.number, type: "Cobrança", date: item.dueDate, source: "collections" })),
        ...documents.filter((item) => item.expiryDate).map((item) => ({ id: `document-${item.id}`, title: item.name, type: "Vencimento de documento", date: item.expiryDate, source: "companyDocuments" })),
      ];
      setEvents([...manual, ...generated].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 80));
    } finally { setLoading(false); }
  }, [user]);
  React.useEffect(() => { load(); }, [load]);
  const upcoming = events.filter((event) => event.date >= today()).slice(0, 12);
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + index);
    return date.toISOString().slice(0, 10);
  });
  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Agenda operacional</p><h1 className="mt-2 text-3xl font-bold">Calendário</h1><p className="mt-1 text-sm text-slate-500">Eventos manuais, ordens, cobranças e vencimentos integrados ao banco de dados.</p></div><button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Plus size={17}/>Novo compromisso</button></header>
    {loading ? <div className="grid h-96 place-items-center rounded-2xl border bg-white"><Loader2 className="animate-spin text-blue-600"/></div> : <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]"><section className="rounded-2xl border bg-white p-5"><div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400">{["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((item) => <span key={item}>{item}</span>)}{days.map((day) => { const dayEvents = events.filter((event) => event.date === day); return <div key={day} className={`min-h-24 rounded-xl border p-2 text-left ${day === today() ? "border-blue-300 bg-blue-50" : "border-slate-100"}`}><span className="text-xs font-bold">{new Date(`${day}T12:00:00`).getDate()}</span>{dayEvents.slice(0, 3).map((event) => <span key={event.id} title={event.title} className="mt-2 block truncate rounded bg-blue-100 px-1.5 py-1 text-[10px] font-bold text-blue-700">{event.type}</span>)}</div>; })}</div></section><section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><CalendarClock size={18}/><h2 className="font-bold">Próximos eventos</h2></div><div className="mt-4 space-y-3">{upcoming.map((event) => <article key={event.id} className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-bold uppercase text-blue-600">{event.type} · {brDate(event.date)} {event.time || ""}</p><p className="mt-1 text-sm font-semibold">{event.title}</p><p className="mt-1 text-[10px] text-slate-400">{event.source === "calendarEvents" || !event.source ? "Evento manual" : "Gerado automaticamente"}</p></article>)}{!upcoming.length && <p className="py-10 text-center text-sm text-slate-400">Nenhum evento próximo.</p>}</div></section></div>}
    {open && <EventForm close={() => setOpen(false)} save={async (value) => { if (!user) return; await createCompanyDoc("calendarEvents", user.companyId, user.id, { ...value, source: "calendarEvents" }); setOpen(false); await load(); }}/>}
  </div>;
};

const EventForm = ({ close, save }: { close: () => void; save: (value: Omit<Event, "id">) => Promise<void> }) => {
  const [form, setForm] = React.useState<Omit<Event, "id">>({ title: "", type: "Compromisso", date: today(), time: "" });
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4"><section className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><h2 className="font-bold">Novo compromisso</h2><button onClick={close}><X/></button></header><form onSubmit={(event) => { event.preventDefault(); save(form); }} className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Título" value={form.title} set={(v) => setForm({ ...form, title: v })}/><Field label="Tipo" value={form.type} set={(v) => setForm({ ...form, type: v })}/><Field label="Data" type="date" value={form.date} set={(v) => setForm({ ...form, date: v })}/><Field label="Hora" type="time" value={form.time || ""} set={(v) => setForm({ ...form, time: v })}/><footer className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={close} className="rounded-xl border px-4 py-2 font-bold">Cancelar</button><button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white"><Save size={16}/>Salvar</button></footer></form></section></div>;
};
const Field = ({ label, value, set, type = "text" }: { label: string; value: string; set: (value: string) => void; type?: string }) => <label className="text-xs font-bold text-slate-600">{label}<input required type={type} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal"/></label>;
