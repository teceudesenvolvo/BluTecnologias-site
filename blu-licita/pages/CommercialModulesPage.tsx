import React from "react";
import {
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  Landmark,
  PackageCheck,
  PhoneCall,
  Plus,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { contactService, type ContactLead } from "../../services/firebase";
const stages = [
  ["Nova oportunidade", 20, "R$ 4,8 mi"],
  ["Analisando", 8, "R$ 1,9 mi"],
  ["Orçamento", 5, "R$ 980 mil"],
  ["Participação", 6, "R$ 1,4 mi"],
  ["Disputa", 3, "R$ 720 mil"],
  ["Habilitação", 2, "R$ 510 mil"],
  ["Homologação", 2, "R$ 384 mil"],
  ["Contrato", 10, "R$ 2,48 mi"],
  ["Execução", 8, "R$ 1,14 mi"],
  ["Recebimento", 7, "R$ 384 mil"],
  ["Encerrado", 24, "R$ 5,2 mi"],
] as const;
export const CrmPage = () => (
  <Module
    title="CRM Comercial"
    subtitle="Da oportunidade ao recebimento, acompanhe cada negociação com o governo."
    action="Nova negociação"
  >
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max gap-3">
        {stages.map(([name, count, value], index) => (
          <section
            key={name}
            className="w-64 rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{name}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                {count}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{value} no estágio</p>
            {index < 6 && (
              <div className="mt-4 space-y-2">
                {Array.from({ length: (index % 2) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-[10px] font-bold uppercase text-blue-600">
                      {i ? "Prefeitura de Natal" : "Secretaria de Saúde"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">
                      Fornecimento de materiais hospitalares
                    </p>
                    <div className="mt-3 flex justify-between text-xs text-slate-400">
                      <span>R$ {184 + i * 92} mil</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  </Module>
);
const orders = [
  [
    "OF 0031/2026",
    "Hospital Universitário do Ceará",
    "R$ 84.600",
    "Separação",
    "19 Jul",
  ],
  [
    "OF 0028/2026",
    "Prefeitura de Mossoró",
    "R$ 46.800",
    "Entrega atrasada",
    "16 Jul",
  ],
  [
    "AF 0184/2026",
    "Secretaria de Saúde de Natal",
    "R$ 128.400",
    "Em transporte",
    "22 Jul",
  ],
  [
    "OF 0019/2026",
    "Prefeitura de João Pessoa",
    "R$ 62.900",
    "Aguardando aceite",
    "25 Jul",
  ],
];
export const OrdersPage = () => (
  <Module
    title="Ordens"
    subtitle="Controle autorizações de fornecimento, entregas e saldo contratual."
    action="Nova ordem"
  >
    <Stats
      values={[
        ["15", "Ordens ativas"],
        ["4", "Entregas na semana"],
        ["R$ 322 mil", "Em execução"],
        ["1", "Entrega atrasada"],
      ]}
    />
    <Table
      headers={["Ordem", "Órgão", "Valor", "Situação", "Prazo"]}
      rows={orders}
    />
  </Module>
);
type SentCollection = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  contract: string;
  value: number;
  date: string;
  status: string;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const billingDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const CollectionsPage = () => {
  const [items, setItems] = React.useState<SentCollection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const clients = await contactService.getAll();
        const sent = clients.flatMap((client: ContactLead) =>
          (client.cobrancas || []).filter(Boolean).map((billing: any, index: number) => ({
            id: String(billing.id || `${client.id}-${index}`),
            clientId: client.id,
            clientName: client.razaoSocial || client.name || "Órgão não informado",
            title: billing.title || "Cobrança sem título",
            contract: billing.solutionSelect || client.solution || "Não informado",
            value: Number(billing.value || 0),
            date: billing.date || "",
            status: billing.status || "sent",
          }))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (active) setItems(sent);
      } catch (reason) {
        console.error("Erro ao carregar cobranças:", reason);
        if (active) setError("Não foi possível carregar as cobranças enviadas.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = items.filter(item => item.date.slice(0, 10) === today).length;
  const clients = new Set(items.map(item => item.clientId)).size;

  return (
    <Module title="Cobranças" subtitle="Cobranças enviadas no gerenciamento de clientes, reunidas em um único acompanhamento.">
      <Stats values={[
        [String(items.length), "Cobranças enviadas"],
        [money.format(total), "Valor total enviado"],
        [String(sentToday), "Enviadas hoje"],
        [String(clients), "Órgãos cobrados"],
      ]}/>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando cobranças...</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h3 className="font-bold text-slate-800">Nenhuma cobrança enviada</h3>
          <p className="mt-1 text-sm text-slate-500">As cobranças enviadas pelo gerenciamento de clientes aparecerão aqui.</p>
          <Link to="/admin/clientes" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">Ir para clientes <ArrowRight size={15}/></Link>
        </div>
      ) : (
        <Table
          headers={["Órgão", "Cobrança", "Valor", "Enviada em", "Situação"]}
          rows={items.map(item => [
            item.clientName,
            `${item.title} · ${item.contract}`,
            money.format(item.value),
            item.date ? billingDate.format(new Date(item.date)) : "Data não informada",
            item.status === "sent" ? "Enviada" : item.status,
          ])}
        />
      )}
    </Module>
  );
};
export const CalendarPage = () => (
  <Module
    title="Calendário"
    subtitle="Prazos comerciais, entregas, certidões, faturamento e cobranças em uma agenda única."
    action="Novo compromisso"
  >
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((x) => (
            <span key={x}>{x}</span>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className={`min-h-20 rounded-xl border p-2 text-left ${i === 18 ? "border-blue-300 bg-blue-50" : "border-slate-100"}`}
            >
              <span className="text-xs font-semibold">
                {i < 2 ? "" : i - 1}
              </span>
              {[17, 18, 21, 24, 28].includes(i) && (
                <span className="mt-2 block h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">Próximos eventos</h3>
        {[
          ["Hoje · 10:00", "Cobrar NF-e 00843"],
          ["Amanhã · 14:30", "Entrega OF 0028"],
          ["20 Jul · 09:00", "Sessão de disputa"],
          ["24 Jul", "Vencimento de certidão"],
        ].map(([date, title]) => (
          <div
            key={title}
            className="mt-3 rounded-xl border border-slate-100 p-3"
          >
            <p className="text-xs font-bold text-blue-600">{date}</p>
            <p className="mt-1 text-sm font-semibold">{title}</p>
          </div>
        ))}
      </div>
    </div>
  </Module>
);
export const ReportsPage = () => (
  <Module
    title="Relatórios"
    subtitle="Indicadores para decisões comerciais, contratuais e financeiras."
    action="Gerar relatório"
  >
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[
        [
          "Resultado comercial",
          "Taxa de vitória, propostas e vendas",
          TrendingUp,
        ],
        ["Contratos e saldo", "Execução, vigência e valores", Landmark],
        ["Contas a receber", "Previsões, atrasos e órgãos", CircleDollarSign],
        ["Ordens e entregas", "Prazos e desempenho operacional", PackageCheck],
        ["Cobranças", "Contatos, respostas e recuperação", PhoneCall],
        ["Relatório executivo", "Visão completa para diretoria", FileBarChart],
      ].map(([title, desc, icon]) => {
        const Icon = icon as React.ElementType;
        return (
          <button
            key={title as string}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-blue-200"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Icon size={19} />
            </span>
            <h3 className="mt-5 font-bold">{title as string}</h3>
            <p className="mt-1 text-sm text-slate-500">{desc as string}</p>
            <span className="mt-5 flex items-center gap-1 text-xs font-semibold text-blue-600">
              Abrir relatório <ArrowRight size={13} />
            </span>
          </button>
        );
      })}
    </div>
  </Module>
);
export const SettingsPage = () => (
  <Module
    title="Configurações"
    subtitle="Preferências da empresa, equipe, áreas de interesse e automações."
  >
    <div className="grid gap-4 md:grid-cols-2">
      {[
        [
          "Empresa e equipe",
          "Dados cadastrais, usuários e permissões",
          "/admin/perfil",
        ],
        [
          "Integrações e fontes",
          "PNCP, Compras.gov e portais parceiros",
          "/admin/integracoes",
        ],
        [
          "Notificações",
          "Canais, frequência e responsáveis",
          "/admin/configuracoes/areas-interesse",
        ],
      ].map(([title, desc, to]) => (
        <Link
          to={to}
          key={title}
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <Settings size={18} />
          </span>
          <div className="flex-1">
            <h3 className="font-bold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </div>
          <ChevronRight className="text-slate-300" size={18} />
        </Link>
      ))}
    </div>
  </Module>
);
const Module = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: string;
  children: React.ReactNode;
}) => (
  <div className="mx-auto max-w-[1500px] space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action && (
        <button className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          <Plus size={16} />
          {action}
        </button>
      )}
    </header>
    {children}
  </div>
);
const Stats = ({ values }: { values: string[][] }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {values.map(([value, label]) => (
      <article
        key={label}
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </article>
    ))}
  </div>
);
const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="hidden grid-cols-5 gap-4 bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-400 md:grid">
      {headers.map((x) => (
        <span key={x}>{x}</span>
      ))}
    </div>
    <div className="divide-y divide-slate-100">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-2 p-5 md:grid-cols-5 md:items-center md:gap-4"
        >
          {row.map((cell, j) => (
            <span
              key={j}
              className={
                j === 0 ? "text-sm font-bold" : "text-sm text-slate-600"
              }
            >
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  </section>
);
