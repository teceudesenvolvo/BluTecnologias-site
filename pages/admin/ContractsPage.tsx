import React from 'react';
import { Building2, CalendarClock, FileSignature, Loader2, Plus, Search, X } from 'lucide-react';
import { auth, clientService, contactService, type ClientContract, type ContactLead } from '../../services/firebase';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const date = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const first = (...values: any[]) => values.find((value) => value !== undefined && value !== null && value !== '') || '';
const contractTitle = (contract: any) => String(first(contract.title, contract.name, contract.description, contract.object, contract.numeroContrato, contract.number, 'Contrato'));
const contractValue = (contract: any) => Number(first(contract.value, contract.amount, contract.totalValue, contract.valor, contract.valorContrato, 0));
const contractStart = (contract: any) => String(first(contract.startDate, contract.initialDate, contract.dateStart, contract.dataInicio, contract.vigenciaInicio, contract.date, ''));
const contractEnd = (contract: any) => String(first(contract.endDate, contract.finalDate, contract.dateEnd, contract.dataFim, contract.vigenciaFim, ''));

type ContractRow = ClientContract & {
  clientId: string;
  clientName: string;
  clientCnpj?: string;
  clientEmail?: string;
};

const emptyForm = () => ({
  clientMode: 'existing' as 'existing' | 'new',
  clientId: '',
  razaoSocial: '',
  cnpj: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  address: '',
  cep: '',
  complement: '',
  financialContact: '',
  title: '',
  processNumber: '',
  procurementNumber: '',
  startDate: today(),
  endDate: '',
  value: '',
});

export const ContractsPage: React.FC = () => {
  const [clients, setClients] = React.useState<ContactLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [cnpjLoading, setCnpjLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [contractStep, setContractStep] = React.useState<1 | 2 | 3>(1);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState(emptyForm);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setClients(await contactService.getAll());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const contracts = React.useMemo<ContractRow[]>(() => clients.flatMap((client) =>
    (client.contracts || []).filter(Boolean).map((contract: any, index: number) => ({
      ...contract,
      id: contract.id || `${client.id}-${index}`,
      title: contractTitle(contract),
      startDate: contractStart(contract),
      endDate: contractEnd(contract),
      value: contractValue(contract),
      processNumber: first(contract.processNumber, contract.processo, contract.process, contract.numeroProcesso),
      procurementNumber: first(contract.procurementNumber, contract.licitacao, contract.numeroLicitacao, contract.number),
      clientId: client.id,
      clientName: client.razaoSocial || client.name || 'Cliente',
      clientCnpj: client.cnpj,
      clientEmail: client.email || client.financialContact,
    })),
  ), [clients]);

  const filtered = contracts.filter((item) =>
    !search || `${item.title} ${item.clientName} ${item.clientCnpj || ''} ${item.processNumber || ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  const active = contracts.filter((item) => !item.status || !['closed', 'cancelled', 'completed'].includes(String(item.status)));
  const endingThisMonth = active.filter((item) => item.endDate?.slice(0, 7) === today().slice(0, 7));
  const totalValue = active.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const step1Valid = form.clientMode === 'existing' ? Boolean(form.clientId) : Boolean(form.cnpj && form.razaoSocial && form.email);
  const step2Valid = Boolean(form.title && form.value);

  const update = (key: keyof ReturnType<typeof emptyForm>, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const fetchCnpjData = async () => {
    const cleanCnpj = form.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      alert('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    setCnpjLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      const data = await response.json();
      if (!response.ok || data.message) throw new Error(data.message || 'CNPJ não encontrado.');
      const phone = data.ddd_telefone_1 || data.telefone || '';
      const address = [data.logradouro, data.numero, data.bairro].filter(Boolean).join(', ');
      setForm((current) => ({
        ...current,
        cnpj: cleanCnpj,
        razaoSocial: data.razao_social || current.razaoSocial,
        email: data.email || current.email,
        phone: phone || current.phone,
        city: data.municipio || current.city,
        state: data.uf || current.state,
        address: address || current.address,
        cep: data.cep || current.cep,
        complement: data.complemento || current.complement,
        financialContact: current.financialContact || data.email || '',
      }));
    } catch (error: any) {
      alert(error?.message || 'Não foi possível buscar os dados do CNPJ.');
    } finally {
      setCnpjLoading(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let targetClient = clients.find((client) => client.id === form.clientId);

      if (form.clientMode === 'new') {
        const created = await clientService.create({
          name: form.razaoSocial,
          razaoSocial: form.razaoSocial,
          cnpj: form.cnpj,
          role: 'Órgão contratante',
          email: form.email,
          phone: form.phone,
          city: form.city,
          state: form.state,
          address: form.address,
          cep: form.cep,
          complement: form.complement,
          financialContact: form.financialContact,
          solution: 'Contrato público',
          message: 'Cliente cadastrado a partir do módulo de Contratos.',
          contracts: [],
          userId: auth.currentUser?.uid,
        } as any);
        if (!created) throw new Error('Não foi possível cadastrar o cliente.');
        const refreshed = await contactService.getAll();
        setClients(refreshed);
        targetClient = refreshed.find((client) => client.cnpj && client.cnpj === form.cnpj) || refreshed.find((client) => (client.razaoSocial || client.name) === form.razaoSocial);
      }

      if (!targetClient) throw new Error('Selecione ou cadastre o cliente do contrato.');

      const contract: ClientContract = {
        id: crypto.randomUUID(),
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate,
        value: Number(form.value || 0),
        source: 'manual',
        processNumber: form.processNumber,
        procurementNumber: form.procurementNumber,
        importedAt: new Date().toISOString(),
      };

      const updated = await clientService.update(targetClient.id, {
        contracts: [...(targetClient.contracts || []), contract],
      } as any);
      if (!updated) throw new Error('Não foi possível salvar o contrato.');

      setForm(emptyForm());
      setFormOpen(false);
      await load();
    } catch (error: any) {
      alert(error?.message || 'Não foi possível criar o contrato.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-[500px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Gestão contratual</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Contratos</h1>
          <p className="mt-1 text-sm text-slate-500">Contratos salvos em Clientes, centralizados para acompanhamento comercial e financeiro.</p>
        </div>
        <button onClick={() => { setContractStep(1); setFormOpen(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
          <Plus size={17} /> Novo contrato
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Contratos ativos" value={String(active.length)} />
        <Metric label="Vencem este mês" value={String(endingThisMonth.length)} warning />
        <Metric label="Valor contratado" value={money(totalValue)} />
        <Metric label="Clientes com contrato" value={String(new Set(contracts.map((item) => item.clientId)).size)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por contrato, cliente, CNPJ ou processo" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>{['Contrato', 'Cliente/órgão', 'Processo', 'Vigência', 'Valor', 'Contato'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={`${item.clientId}-${item.id}`}>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.source === 'pncp' ? 'Importado do PNCP' : 'Manual'}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{item.clientName}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.clientCnpj || 'CNPJ não informado'}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{item.processNumber || item.procurementNumber || '—'}</td>
                  <td className="px-4 py-4">{date(item.startDate)} até {date(item.endDate)}</td>
                  <td className="px-4 py-4 font-bold">{money(Number(item.value || 0))}</td>
                  <td className="px-4 py-4 text-slate-500">{item.clientEmail || '—'}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <FileSignature className="mx-auto mb-3 opacity-20" size={44} />
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="max-h-[calc(100vh-32px)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Contratos</p>
                <h2 className="text-xl font-bold">Novo contrato</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl p-2 hover:bg-slate-100"><X size={20} /></button>
            </header>

            <div className="border-b border-slate-100 px-5 py-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  [1, 'Dados do cliente'],
                  [2, 'Dados e valores do contrato'],
                  [3, 'Vigência do contrato'],
                ].map(([step, label]) => (
                  <button key={step} type="button" onClick={() => setContractStep(step as 1 | 2 | 3)} className={`rounded-2xl border px-4 py-3 text-left text-xs font-bold ${contractStep === step ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <span className="mb-1 block text-[10px] uppercase tracking-[.14em]">Etapa {step}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {contractStep === 1 && (
                <>
                  <section className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                    <p className="mb-3 text-sm font-bold text-slate-700">1 &gt; Dados do cliente</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => update('clientMode', 'existing')} className={`rounded-xl px-3 py-2 text-xs font-bold ${form.clientMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Cliente existente</button>
                      <button type="button" onClick={() => update('clientMode', 'new')} className={`rounded-xl px-3 py-2 text-xs font-bold ${form.clientMode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Cadastrar cliente</button>
                    </div>
                  </section>

                  {form.clientMode === 'existing' ? (
                    <Select label="Cliente/órgão" required value={form.clientId} set={(value) => update('clientId', value)} options={[['', 'Selecione'], ...clients.map((client) => [client.id, client.razaoSocial || client.name])]} />
                  ) : (
                    <>
                      <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                        CNPJ
                        <div className="mt-2 flex gap-2">
                          <input value={form.cnpj} onChange={(event) => update('cnpj', event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" />
                          <button type="button" onClick={fetchCnpjData} disabled={cnpjLoading || form.cnpj.replace(/\D/g, '').length !== 14} className="shrink-0 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 disabled:opacity-50">
                            {cnpjLoading ? <Loader2 className="animate-spin" size={15} /> : 'Buscar CNPJ'}
                          </button>
                        </div>
                      </label>
                      <Input label="Razão social / órgão" required value={form.razaoSocial} set={(value) => update('razaoSocial', value)} />
                      <Input label="Email Financeiro" required value={form.email} set={(value) => update('email', value)} />
                      <Input label="Contato financeiro" value={form.financialContact} set={(value) => update('financialContact', value)} />
                      <Input label="Telefone" value={form.phone} set={(value) => update('phone', value)} />
                      <Input label="Município" value={form.city} set={(value) => update('city', value)} />
                      <Input label="UF" value={form.state} set={(value) => update('state', value)} />
                      <Input label="Endereço" value={form.address} set={(value) => update('address', value)} />
                      <Input label="CEP" value={form.cep} set={(value) => update('cep', value)} />
                      <Input label="Complemento" value={form.complement} set={(value) => update('complement', value)} />
                    </>
                  )}
                </>
              )}

              {contractStep === 2 && (
                <>
                  <section className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                    <p className="text-sm font-bold text-slate-700">2 &gt; Dados e Valores do Contrato</p>
                  </section>
                  <Input label="Título do contrato" required value={form.title} set={(value) => update('title', value)} />
                  <Input label="Valor do contrato (R$)" type="number" required value={form.value} set={(value) => update('value', value)} />
                  <Input label="Processo" value={form.processNumber} set={(value) => update('processNumber', value)} />
                  <Input label="Número da licitação/contratação" value={form.procurementNumber} set={(value) => update('procurementNumber', value)} />
                </>
              )}

              {contractStep === 3 && (
                <>
                  <section className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                    <p className="text-sm font-bold text-slate-700">3 &gt; Vigência do contrato</p>
                  </section>
                  <Input label="Data inicial" type="date" required value={form.startDate} set={(value) => update('startDate', value)} />
                  <Input label="Data final" type="date" required value={form.endDate} set={(value) => update('endDate', value)} />
                </>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t p-5">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">Cancelar</button>
              {contractStep > 1 && <button type="button" onClick={() => setContractStep((contractStep - 1) as 1 | 2 | 3)} className="rounded-xl border px-4 py-2 text-sm font-bold">Voltar</button>}
              {contractStep < 3 ? (
                <button type="button" disabled={(contractStep === 1 && !step1Valid) || (contractStep === 2 && !step2Valid)} onClick={() => setContractStep((contractStep + 1) as 1 | 2 | 3)} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">Continuar</button>
              ) : (
              <button disabled={saving || !step1Valid || !step2Valid || !form.startDate || !form.endDate} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
                {saving && <Loader2 className="animate-spin" size={16} />}
                Salvar contrato
              </button>
              )}
            </footer>
          </form>
        </div>
      )}
    </div>
  );
};

const Metric = ({ label, value, warning }: { label: string; value: string; warning?: boolean }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4">
    {warning ? <CalendarClock className="text-amber-500" size={18} /> : <Building2 className="text-slate-400" size={18} />}
    <p className="mt-3 text-xs text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-bold ${warning ? 'text-amber-600' : 'text-slate-950'}`}>{value}</p>
  </article>
);

const Input = ({ label, value, set, type = 'text', required = false }: { label: string; value: string; set: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="text-xs font-bold text-slate-600">
    {label}
    <input required={required} type={type} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" />
  </label>
);

const Select = ({ label, value, set, options, required = false }: { label: string; value: string; set: (value: string) => void; options: string[][]; required?: boolean }) => (
  <label className="text-xs font-bold text-slate-600">
    {label}
    <select required={required} value={value} onChange={(event) => set(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500">
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  </label>
);
