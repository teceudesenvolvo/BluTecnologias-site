import React from 'react';
import { Bold, Clock3, GripVertical, Italic, LayoutDashboard, List, Loader2, MessageSquare, MoreHorizontal, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { auth } from '../../services/firebase';
import { crmBoardService, type CrmBoard, type CrmCard, type CrmColumn } from '../services/crmBoardService';

const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];
const emptyCard = { title: '', organization: '', description: '', dueDate: '', labels: '' };

const RichTextEditor: React.FC<{ value: string; onChange: (value: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const editor = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value; }, [value]);
  const command = (name: string) => { document.execCommand(name); editor.current?.focus(); onChange(editor.current?.innerHTML || ''); };
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100">
    <div className="flex gap-1 border-b border-slate-100 bg-slate-50 p-2">
      <button type="button" title="Negrito" onClick={() => command('bold')} className="rounded p-1.5 hover:bg-white"><Bold size={15}/></button>
      <button type="button" title="Itálico" onClick={() => command('italic')} className="rounded p-1.5 hover:bg-white"><Italic size={15}/></button>
      <button type="button" title="Lista" onClick={() => command('insertUnorderedList')} className="rounded p-1.5 hover:bg-white"><List size={15}/></button>
    </div>
    <div ref={editor} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={(event) => onChange(event.currentTarget.innerHTML)} className="min-h-28 px-3 py-2.5 text-sm leading-6 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"/>
  </div>;
};

export const CrmBoardPage: React.FC = () => {
  const [boards, setBoards] = React.useState<CrmBoard[]>([]);
  const [columns, setColumns] = React.useState<CrmColumn[]>([]);
  const [cards, setCards] = React.useState<CrmCard[]>([]);
  const [boardId, setBoardId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [newCardColumn, setNewCardColumn] = React.useState<string | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<CrmCard | null>(null);
  const [boardModal, setBoardModal] = React.useState(false);
  const [form, setForm] = React.useState(emptyCard);
  const [boardForm, setBoardForm] = React.useState({ name: '', description: '' });
  const [comment, setComment] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [nextBoards, nextColumns, nextCards] = await Promise.all([crmBoardService.boards(), crmBoardService.columns(), crmBoardService.cards()]);
      setBoards(nextBoards); setColumns(nextColumns); setCards(nextCards);
      setBoardId((current) => current && nextBoards.some((board) => board.id === current) ? current : nextBoards[0]?.id || '');
    } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const currentBoard = boards.find((board) => board.id === boardId);
  const boardColumns = columns.filter((column) => column.boardId === boardId).sort((a, b) => a.position - b.position);
  const openBoard = () => { setBoardForm({ name: currentBoard?.name || '', description: currentBoard?.description || '' }); setBoardModal(true); };
  const openCard = (card: CrmCard) => { setSelectedCard(card); setForm({ title: card.title, organization: card.organization || '', description: card.description || '', dueDate: card.dueDate || '', labels: (card.labels || []).join(', ') }); setComment(''); };
  const drop = async (event: React.DragEvent, columnId: string) => { event.preventDefault(); const id = event.dataTransfer.getData('cardId'); if (id) { await crmBoardService.moveCard(id, columnId, Date.now()); await load(); } };

  if (loading) return <div className="grid min-h-[500px] place-items-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  return <div className="mx-auto max-w-[1700px] space-y-5">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Pipeline comercial</p><h1 className="mt-2 text-3xl font-bold">CRM</h1><p className="mt-1 text-sm text-slate-500">Gerencie quadros, atividades, responsáveis e prazos.</p></div>
      <div className="flex flex-wrap gap-2">
        {!!boards.length && <><select value={boardId} onChange={(event) => setBoardId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold">{boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}</select><button onClick={openBoard} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><Pencil size={16}/>Editar quadro</button></>}
        <button onClick={() => { setBoardId(''); setBoardForm({ name: '', description: '' }); setBoardModal(true); }} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><LayoutDashboard size={17}/>Novo quadro</button>
      </div>
    </header>
    {currentBoard?.description && <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sobre este quadro</p><div className="prose prose-sm mt-2 max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: currentBoard.description }}/></section>}
    {!boards.length ? <section className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><div><LayoutDashboard className="mx-auto text-slate-300" size={52}/><h2 className="mt-4 text-xl font-bold">Crie seu primeiro quadro</h2><p className="mt-2 text-sm text-slate-500">Monte um fluxo comercial para licitações, contratos ou atividades.</p><button onClick={() => { setBoardForm({ name: 'Pipeline Comercial', description: '' }); setBoardModal(true); }} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Criar Pipeline Comercial</button></div></section> :
      <div className="overflow-x-auto pb-4"><div className="flex min-w-max items-start gap-4">
        {boardColumns.map((column, index) => <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, column.id)} className="w-72 rounded-2xl bg-slate-100 p-3">
          <header className="group flex items-center gap-2 px-1"><i className={`h-2.5 w-2.5 rounded-full ${colors[index % colors.length]}`}/><h2 className="flex-1 text-sm font-bold">{column.name}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{cards.filter((card) => card.columnId === column.id).length}</span><button onClick={async () => { const name = prompt('Novo nome da coluna', column.name); if (name?.trim()) { await crmBoardService.updateColumn(column.id, name.trim()); load(); } }} className="text-slate-400 opacity-0 group-hover:opacity-100"><MoreHorizontal size={16}/></button></header>
          <div className="mt-3 space-y-3">{cards.filter((card) => card.columnId === column.id).sort((a, b) => a.position - b.position).map((card) => <article key={card.id} draggable onDragStart={(event) => event.dataTransfer.setData('cardId', card.id)} onClick={() => openCard(card)} className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start gap-2"><GripVertical className="mt-0.5 cursor-grab text-slate-300" size={15}/><div className="min-w-0 flex-1">{card.organization && <p className="truncate text-[10px] font-bold uppercase text-blue-600">{card.organization}</p>}<h3 className="mt-1 text-sm font-semibold">{card.title}</h3>{card.description && <div className="mt-2 line-clamp-2 text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: card.description }}/>}</div></div>
            <div className="mt-3 flex flex-wrap gap-1">{card.labels?.map((label, labelIndex) => <span key={label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${colors[labelIndex % colors.length]}`}>{label}</span>)}</div>
            <div className="mt-3 flex items-center gap-3">{card.dueDate && <p className={`flex items-center gap-1 text-xs font-semibold ${card.dueDate < new Date().toISOString().slice(0, 10) ? 'text-rose-600' : 'text-slate-400'}`}><Clock3 size={13}/>{new Date(`${card.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</p>}{!!card.comments?.length && <p className="flex items-center gap-1 text-xs text-slate-400"><MessageSquare size={13}/>{card.comments.length}</p>}</div>
          </article>)}<button onClick={() => { setForm(emptyCard); setNewCardColumn(column.id); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-white"><Plus size={16}/>Adicionar cartão</button></div>
        </section>)}
        <button onClick={async () => { const name = prompt('Nome da nova coluna'); if (name?.trim()) { await crmBoardService.createColumn(boardId, name.trim(), boardColumns.length); load(); } }} className="flex w-64 items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600"><Plus size={17}/>Adicionar coluna</button>
      </div></div>}

    {boardModal && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><form onSubmit={async (event) => { event.preventDefault(); if (currentBoard && boardForm.name === currentBoard.name || currentBoard && boardModal && boardForm.name) { await crmBoardService.updateBoard(currentBoard.id, boardForm); } else { await crmBoardService.createBoard(boardForm.name, boardForm.description); } setBoardModal(false); await load(); }} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{currentBoard && boardForm.name === currentBoard.name ? 'Editar quadro' : 'Novo quadro'}</h2><button type="button" onClick={() => setBoardModal(false)}><X className="text-slate-400"/></button></div><label className="mt-5 block text-xs font-bold text-slate-500">Nome<input required value={boardForm.name} onChange={(event) => setBoardForm({ ...boardForm, name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="mt-4 block text-xs font-bold text-slate-500">Descrição do quadro</label><div className="mt-1"><RichTextEditor value={boardForm.description} onChange={(description) => setBoardForm({ ...boardForm, description })} placeholder="Objetivo, regras e orientações deste quadro..."/></div><button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"><Save size={16}/>Salvar quadro</button></form></div>}

    {newCardColumn && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><form onSubmit={async (event) => { event.preventDefault(); await crmBoardService.createCard({ boardId, columnId: newCardColumn, title: form.title, organization: form.organization, description: form.description, dueDate: form.dueDate, labels: form.labels.split(',').map((item) => item.trim()).filter(Boolean), comments: [] }); setNewCardColumn(null); setForm(emptyCard); await load(); }} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><CardFields form={form} setForm={setForm} title="Novo cartão" close={() => setNewCardColumn(null)}/><button className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">Criar cartão</button></form></div>}

    {selectedCard && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><CardFields form={form} setForm={setForm} title="Editar cartão" close={() => setSelectedCard(null)}/><div className="mt-5 flex gap-2"><button onClick={async () => { await crmBoardService.updateCard(selectedCard.id, { title: form.title, organization: form.organization, description: form.description, dueDate: form.dueDate, labels: form.labels.split(',').map((item) => item.trim()).filter(Boolean) }); setSelectedCard(null); await load(); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"><Save size={16}/>Salvar alterações</button><button onClick={async () => { if (confirm('Excluir este cartão?')) { await crmBoardService.deleteCard(selectedCard.id); setSelectedCard(null); load(); } }} className="rounded-xl border border-rose-200 px-4 text-rose-600"><Trash2 size={17}/></button></div><section className="mt-7 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 font-bold"><MessageSquare size={17}/>Comentários</h3><div className="mt-4"><RichTextEditor value={comment} onChange={setComment} placeholder="Escreva um comentário ou atualização..."/></div><button disabled={!comment.replace(/<[^>]*>/g, '').trim()} onClick={async () => { const comments = [...(selectedCard.comments || []), { id: crypto.randomUUID(), content: comment, author: auth.currentUser?.displayName || auth.currentUser?.email || 'Usuário Blu', createdAt: new Date().toISOString() }]; await crmBoardService.updateCard(selectedCard.id, { comments }); setSelectedCard({ ...selectedCard, comments }); setComment(''); await load(); }} className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Adicionar comentário</button><div className="mt-5 space-y-3">{selectedCard.comments?.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-bold">{item.author}</p><time className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString('pt-BR')}</time></div><div className="prose prose-sm mt-2 max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: item.content }}/></article>)}</div></section></div></div>}
  </div>;
};

const CardFields: React.FC<{ form: typeof emptyCard; setForm: React.Dispatch<React.SetStateAction<typeof emptyCard>>; title: string; close: () => void }> = ({ form, setForm, title, close }) => <><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={close}><X className="text-slate-400"/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500 sm:col-span-2">Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-bold text-slate-500">Órgão ou cliente<input value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-bold text-slate-500">Prazo<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-bold text-slate-500 sm:col-span-2">Etiquetas<input placeholder="Urgente, Edital, Contrato" value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><div className="sm:col-span-2"><label className="text-xs font-bold text-slate-500">Descrição</label><div className="mt-1"><RichTextEditor value={form.description} onChange={(description) => setForm({ ...form, description })} placeholder="Detalhes, checklist e orientações da atividade..."/></div></div></div></>;
