import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import type { ExternalOpportunity } from "../integrations/core/integrationTypes";
import type { PncpOpportunityBundle } from "../integrations/pncp/pncpTypes";
import { useBluAuth } from "../contexts/BluAuthContext";
import { opportunityFavoritesService } from "../services/opportunityFavoritesService";
import { integrationOpportunityService } from "../services/integrationOpportunityService";
import { companyProfileService } from "../services/companyProfileService";
import {
  certificateService,
  type Certificate,
  type Company,
} from "../../services/firebase";
const money = (value?: number) =>
  value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value)
    : "Valor não informado";
export const SavedBiddingsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [items, setItems] = useState<ExternalOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ExternalOpportunity | null>(null);
  const load = async () => {
    if (!user) return;
    setLoading(true);
    setItems(await opportunityFavoritesService.listItems(user.companyId));
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, [user]);
  const visible = items.filter((item) =>
    `${item.object} ${item.organizationName} ${item.processNumber || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Workspace comercial
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Licitações</h2>
          <p className="mt-1 text-sm text-slate-500">
            Processos favoritados para análise, proposta, habilitação e
            acompanhamento.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={16}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nos favoritos"
              className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none"
            />
          </label>
          <button
            onClick={load}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Favoritadas", String(items.length)],
          ["Em análise", String(items.length)],
          ["Propostas em preparação", "0"],
          ["Aguardando habilitação", "0"],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </article>
        ))}
      </section>
      {loading ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : visible.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Bookmark className="mx-auto text-slate-300" />
          <h3 className="mt-3 font-bold">Nenhuma licitação favoritada</h3>
          <p className="mt-1 text-sm text-slate-500">
            Salve processos em Oportunidades para começar a trabalhar neles
            aqui.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {visible.map((item) => (
              <article
                key={`${item.source}:${item.externalId}`}
                className="p-5 hover:bg-slate-50"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                        {item.source}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {item.organizationName}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-semibold">
                      {item.object}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>
                        {item.processNumber ||
                          item.procurementNumber ||
                          item.externalId}
                      </span>
                      <strong>{money(item.estimatedValue)}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      Análise pendente
                    </span>
                    <button
                      onClick={() => setSelected(item)}
                      className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Abrir workspace <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {selected && (
        <BiddingWorkspace item={selected} close={() => setSelected(null)} />
      )}
    </div>
  );
};

const tabs = [
  "Resumo",
  "Edital e IA",
  "Habilitação",
  "Peças e propostas",
] as const;
type Tab = (typeof tabs)[number];
const BiddingWorkspace = ({
  item,
  close,
}: {
  item: ExternalOpportunity;
  close: () => void;
}) => {
  const [tab, setTab] = useState<Tab>("Resumo");
  const [bundle, setBundle] = useState<PncpOpportunityBundle | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    Promise.all([
      item.source === "tce-ce"
        ? Promise.resolve(null)
        : integrationOpportunityService.getDetails(item.externalId),
      certificateService.getAll(),
      companyProfileService.list(),
    ])
      .then(([details, certs, availableCompanies]) => {
        setBundle(details);
        setCertificates(certs);
        setCompanies(availableCompanies);
      })
      .finally(() => setLoading(false));
    return () => {
      document.body.style.overflow = previous;
    };
  }, [item]);
  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/60 backdrop-blur-[2px] md:items-center md:p-5">
      <section className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:h-[90vh] md:rounded-3xl">
        <header className="flex items-start gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-blue-600">
              {item.organizationName}
            </p>
            <h2 className="mt-2 line-clamp-2 text-lg font-bold">
              {item.object}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {item.processNumber || item.externalId}
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-xl border border-slate-200 p-2"
          >
            <X size={19} />
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 md:px-5">
          {tabs.map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${tab === name ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
            >
              {name}
            </button>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-5 md:p-7">
          {loading ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : tab === "Resumo" ? (
            <Summary item={item} bundle={bundle} />
          ) : tab === "Edital e IA" ? (
            <AiAnalysis bundle={bundle} />
          ) : tab === "Habilitação" ? (
            <Qualification certificates={certificates} />
          ) : (
            <Proposal item={item} companies={companies} />
          )}
        </main>
      </section>
    </div>
  );
  return createPortal(modal, document.body);
};
const Summary = ({
  item,
  bundle,
}: {
  item: ExternalOpportunity;
  bundle: PncpOpportunityBundle | null;
}) => (
  <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold">Objeto</h3>
      <p className="mt-3 text-sm leading-7 text-slate-700">{item.object}</p>
    </section>
    <div className="grid gap-3 md:grid-cols-3">
      {[
        ["Valor estimado", money(item.estimatedValue)],
        ["Arquivos oficiais", String(bundle?.documents.length || 0)],
        ["Itens", String(bundle?.items.length || 0)],
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  </div>
);
const AiAnalysis = ({ bundle }: { bundle: PncpOpportunityBundle | null }) => (
  <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <Sparkles className="text-blue-600" />
        <div>
          <h3 className="font-bold">Análise do edital</h3>
          <p className="text-xs text-slate-500">
            {bundle?.documents.length || 0} arquivo(s) oficial(is)
            disponível(is)
          </p>
        </div>
      </div>
      <button
        disabled
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white opacity-60"
      >
        <BrainCircuit size={17} />
        Analisar com IA
      </button>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        A ação será habilitada quando o serviço seguro de IA estiver conectado.
        Nenhum parecer fictício é gerado.
      </p>
    </section>
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <FileCheck2 className="mx-auto text-slate-300" />
      <h3 className="mt-3 font-bold">Parecer ainda não gerado</h3>
      <p className="mt-1 text-sm text-slate-500">
        O parecer apresentará riscos, prazos, exigências e recomendação
        assistida para decisão humana.
      </p>
    </section>
  </div>
);
const requiredTypes = [
  "CND Federal",
  "CND Estadual",
  "CND Municipal",
  "CND FGTS",
  "CND Trabalhista",
  "CNPJ",
  "Contrato Social",
];
const Qualification = ({ certificates }: { certificates: Certificate[] }) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle className="mr-2 inline" size={17} />
      As exigências específicas serão preenchidas após a análise real do edital.
      A lista abaixo mostra a prontidão documental básica.
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <h3 className="font-bold">Documentação da empresa</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {requiredTypes.map((type) => {
          const cert = certificates.find(
            (item) =>
              item.name === type ||
              (item as Certificate & { type?: string }).type === type,
          );
          const valid =
            cert &&
            (!cert.expiryDate ||
              new Date(`${cert.expiryDate}T23:59:59`) >= new Date());
          return (
            <div key={type} className="flex items-center gap-3 p-4">
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl ${valid ? "bg-emerald-50 text-emerald-600" : cert ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}
              >
                {valid ? <CheckCircle2 size={17} /> : <ShieldAlert size={17} />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{type}</p>
                <p className="text-xs text-slate-400">
                  {valid
                    ? "Documento disponível e vigente"
                    : cert
                      ? "Documento vencido"
                      : "Documento não cadastrado"}
                </p>
              </div>
              {cert?.fileUrl && (
                <a
                  href={cert.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-blue-600"
                >
                  <Download size={17} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  </div>
);
type DocumentKind = "proposal" | "challenge" | "feasibility" | "clarification";
const documentKinds: {
  id: DocumentKind;
  label: string;
  description: string;
}[] = [
  {
    id: "proposal",
    label: "Proposta comercial",
    description: "Condições comerciais, validade e prazo de entrega.",
  },
  {
    id: "challenge",
    label: "Impugnação ao edital",
    description: "Questionamento fundamentado de cláusulas do instrumento.",
  },
  {
    id: "feasibility",
    label: "Demonstração de exequibilidade",
    description: "Memória de custos e justificativa da viabilidade da oferta.",
  },
  {
    id: "clarification",
    label: "Pedido de esclarecimento",
    description: "Dúvidas objetivas encaminhadas ao órgão ou pregoeiro.",
  },
];
const initialText = (
  kind: DocumentKind,
  item: ExternalOpportunity,
  fields: {
    company: string;
    subject: string;
    facts: string;
    grounds: string;
    request: string;
    value: string;
    validity: string;
    delivery: string;
  },
) => {
  const process =
    item.processNumber || item.procurementNumber || item.externalId;
  const heading =
    kind === "proposal"
      ? "PROPOSTA COMERCIAL"
      : kind === "challenge"
        ? "IMPUGNAÇÃO AO EDITAL"
        : kind === "feasibility"
          ? "DEMONSTRAÇÃO DE EXEQUIBILIDADE DA PROPOSTA"
          : "PEDIDO DE ESCLARECIMENTO";
  return `${heading}\n\nÀ ${item.organizationName}\nProcesso: ${process}\nObjeto: ${item.object}\n\n${fields.company || "[RAZÃO SOCIAL DA EMPRESA]"}, vem apresentar o presente documento.\n\n1. ASSUNTO\n${fields.subject || "[Informe o assunto principal]"}\n\n2. CONTEXTO E FATOS\n${fields.facts || "[Descreva os fatos, condições comerciais ou dúvida]"}\n\n3. FUNDAMENTAÇÃO / COMPOSIÇÃO\n${fields.grounds || "[Inclua a fundamentação legal, técnica ou memória de custos aplicável]"}${kind === "proposal" ? `\n\n4. CONDIÇÕES COMERCIAIS\nValor proposto: ${fields.value || "[informar]"}\nValidade: ${fields.validity || "60"} dias\nPrazo de entrega: ${fields.delivery || "Conforme edital"}` : ""}\n\n${kind === "proposal" ? "5" : "4"}. PEDIDO / DECLARAÇÃO FINAL\n${fields.request || "[Informe objetivamente o pedido, declaração ou conclusão]"}\n\n[Município], ${new Date().toLocaleDateString("pt-BR")}\n\n__________________________________\nRepresentante legal`;
};
const Proposal = ({
  item,
  companies,
}: {
  item: ExternalOpportunity;
  companies: Company[];
}) => {
  const storageKey = `blu:bidding-documents:${item.source}:${item.externalId}`;
  const [kind, setKind] = useState<DocumentKind>("proposal");
  const [fields, setFields] = useState({
    company: "",
    subject: "",
    facts: "",
    grounds: "",
    request: "",
    value: "",
    validity: "60",
    delivery: "Conforme edital",
  });
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (stored) {
        setKind(stored.kind || "proposal");
        setFields(stored.fields || fields);
        setText(stored.text || "");
      }
    } catch {
      /* Rascunho local inválido. */
    }
  }, [storageKey]);
  useEffect(() => {
    if (!fields.company && companies[0]) {
      setFields((current) => ({
        ...current,
        company: companies[0].razaoSocial,
      }));
    }
  }, [companies, fields.company]);
  const generate = () => setText(initialText(kind, item, fields));
  const save = () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        kind,
        fields,
        text,
        updatedAt: new Date().toISOString(),
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const download = () => {
    const content = text || initialText(kind, item, fields);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${kind}-${(item.processNumber || item.externalId).replace(/[^a-z0-9]/gi, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-blue-600" />
          <div>
            <h3 className="font-bold">Elaboração de documentos</h3>
            <p className="text-xs text-slate-500">
              Crie peças vinculadas ao processo e revise o conteúdo antes do
              protocolo.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {documentKinds.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setKind(option.id);
                setText("");
              }}
              className={`rounded-xl border p-4 text-left ${kind === option.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <p className="text-sm font-bold">{option.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="font-bold">Informações do documento</h4>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-slate-600">
              Empresa
              <select
                value={fields.company}
                onChange={(event) =>
                  setFields({ ...fields, company: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.razaoSocial}>
                    {company.razaoSocial}
                    {company.cnpj ? ` · ${company.cnpj}` : ""}
                  </option>
                ))}
              </select>
              {companies.length === 0 && (
                <span className="mt-1 block font-normal text-amber-600">
                  Cadastre uma empresa em Meu Perfil para elaborar documentos.
                </span>
              )}
            </label>
            <FieldInput
              label="Assunto"
              value={fields.subject}
              change={(value) => setFields({ ...fields, subject: value })}
              placeholder="Síntese do documento"
            />
            <FieldArea
              label={
                kind === "proposal"
                  ? "Condições e diferenciais"
                  : "Contexto e fatos"
              }
              value={fields.facts}
              change={(value) => setFields({ ...fields, facts: value })}
            />
            <FieldArea
              label={
                kind === "feasibility"
                  ? "Memória de custos e composição"
                  : "Fundamentação técnica ou jurídica"
              }
              value={fields.grounds}
              change={(value) => setFields({ ...fields, grounds: value })}
            />
            {kind === "proposal" && (
              <div className="grid grid-cols-3 gap-2">
                <FieldInput
                  label="Valor"
                  value={fields.value}
                  change={(value) => setFields({ ...fields, value })}
                />
                <FieldInput
                  label="Validade"
                  value={fields.validity}
                  change={(value) => setFields({ ...fields, validity: value })}
                />
                <FieldInput
                  label="Entrega"
                  value={fields.delivery}
                  change={(value) => setFields({ ...fields, delivery: value })}
                />
              </div>
            )}
            <FieldArea
              label={
                kind === "clarification"
                  ? "Perguntas ao órgão"
                  : "Pedido ou conclusão"
              }
              value={fields.request}
              change={(value) => setFields({ ...fields, request: value })}
            />
            <button
              onClick={generate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"
            >
              <Sparkles size={16} />
              Montar rascunho
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold">Texto para revisão</h4>
              <p className="mt-1 text-xs text-slate-500">
                O conteúdo deve ser validado pelo responsável antes do envio.
              </p>
            </div>
            <FileText className="text-slate-300" />
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Preencha as informações e clique em Montar rascunho."
            className="mt-5 min-h-[480px] w-full rounded-xl border border-slate-200 p-4 font-mono text-xs leading-6 outline-none focus:border-blue-500"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              onClick={save}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              {saved ? "Rascunho salvo" : "Salvar rascunho"}
            </button>
            <button
              onClick={download}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Download size={15} />
              Exportar texto
            </button>
          </div>
        </div>
      </section>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        <AlertTriangle className="mr-2 inline" size={15} />A Blu auxilia na
        elaboração, mas não substitui revisão jurídica, técnica, contábil ou
        assinatura do representante responsável.
      </div>
    </div>
  );
};
const FieldInput = ({
  label,
  value,
  change,
  placeholder,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  placeholder?: string;
}) => (
  <label className="block text-xs font-bold text-slate-600">
    {label}
    <input
      value={value}
      onChange={(event) => change(event.target.value)}
      placeholder={placeholder}
      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
    />
  </label>
);
const FieldArea = ({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
}) => (
  <label className="block text-xs font-bold text-slate-600">
    {label}
    <textarea
      value={value}
      onChange={(event) => change(event.target.value)}
      rows={3}
      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
    />
  </label>
);
