import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronUp, FileText, BarChart2, Hash, Layers, Globe, Copy, List, FileKey, AlertTriangle, HelpCircle } from 'lucide-react';

interface BiddingMockData {
  id: string;
  title: string;
  process: string;
  orgao: string;
  orgaoLocation: string;
  publicacao: string;
  abertura: string;
  situacao: string;
  sessao: string;
  modoDisputa: string;
  classificacao: string;
  criterioJulgamento: string;
  tipoApuracao: string;
  participacaoME: string;
  itens?: any[];
  documentos?: any[];
}

const mockData: BiddingMockData[] = [
  {
    id: '1',
    title: 'CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA A PRESTAÇÃO DE SERVIÇO CONTÍNUO DE COFFEE BREAK, COM FORNECIMENTO SOB DEMANDA DE KITS PADRONIZADOS NECESSÁRIOS AO ATENDIMENTO DOS EVENTOS INSTITUCIONAIS REALIZADOS PELA CÂMARA MUNICIPAL DE PARAGOMINAS E PELA OUVIDORIA ESPECIAL DE COMBATE À VIOLÊNCIA DOMÉSTICA CONTRA MULHERES, CRIANÇAS E IDOSOS.',
    process: 'Pregão Eletrônico - 002/2026-CMP',
    orgao: 'Câmara Municipal de Paragominas',
    orgaoLocation: 'Paragominas / PA',
    publicacao: '20/02/2026',
    abertura: '12/03/2026 ÀS 09:00',
    situacao: 'Recebendo propostas',
    sessao: 'A iniciar',
    modoDisputa: 'Aberto',
    classificacao: 'Serviços comuns',
    criterioJulgamento: 'Menor Preço',
    tipoApuracao: 'Item',
    participacaoME: 'Aberto',
    itens: [
      {
        id: '1',
        seq: '1',
        desc: 'Contratação de empresa para prestação de serviços técnicos especializados de consultoria e assessoria para o suporte técnico no gerenciamento e acompanhamento dos processos de captação de recursos, dos programas e dos pactos firmados com os Governos Federal e Estadual, com a disponibilização de sol',
        unid: 'Serviço',
        qtd: '12,0',
        intMin: 'R$ 0,01',
        valRefUnit: 'R$ 4.800,00',
        valRefTotal: 'R$ 57.600,00',
        partMe: 'Aberto'
      },
      {
        id: '2',
        seq: '2',
        desc: 'Contratação de empresa para prestação de serviços técnicos especializados de consultoria e assessoria para o suporte técnico no gerenciamento e acompanhamento dos processos de captação de recursos, dos programas e dos pactos firmados com os Governos Federal e Estadual',
        unid: 'Mês',
        qtd: '12,0',
        intMin: 'R$ 0,01',
        valRefUnit: 'R$ 4.800,00',
        valRefTotal: 'R$ 57.600,00',
        partMe: 'Aberto'
      }
    ],
    documentos: [
      { id: '1', nome: 'EDITAL DE PREGÃO ELETRÔNICO' },
      { id: '2', nome: 'Parecer Técnico da Prova de Conceito' }
    ]
  },
  {
    id: '2',
    title: 'REGISTRO DE PREÇOS PARA FUTURA AQUISIÇÃO DE MATERIAL GRÁFICO DESTINADO A SUPRIR AS NECESSIDADES DAS DIVERSAS SECRETARIAS DO GOVERNO MUNICIPAL DE NOVA RUSSAS',
    process: 'Pregão Eletrônico - GM-PE004/2026',
    orgao: 'Prefeitura Municipal de Nova Russas',
    orgaoLocation: 'Nova Russas / CE',
    publicacao: '12/02/2026',
    abertura: '11/03/2026 ÀS 09:00',
    situacao: 'Recebendo propostas',
    sessao: 'A iniciar',
    modoDisputa: 'Aberto',
    classificacao: 'Bens comuns',
    criterioJulgamento: 'Menor Preço',
    tipoApuracao: 'Lote',
    participacaoME: 'Exclusiva',
    itens: [],
    documentos: []
  }
];

export const Licitacoes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [situacao, setSituacao] = useState('Todos');
  const [credenciamento, setCredenciamento] = useState('Todos');
  const [regiao, setRegiao] = useState('Todos');
  const [uf, setUf] = useState('Todos');
  const [municipio, setMunicipio] = useState('Todos');
  const [dataPublicacao, setDataPublicacao] = useState('');
  const [dataAbertura, setDataAbertura] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Details Expansion State
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'itens' | 'documentos' | 'impugnacoes' | 'esclarecimentos'>('esclarecimentos');

  const toggleExpand = (id: string) => {
    if (expandedBidId === id) {
      setExpandedBidId(null);
    } else {
      setExpandedBidId(id);
      setActiveTab('esclarecimentos'); // Default tab when opening
    }
  };

  const filteredData = mockData.filter((bid) => {
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const match = bid.title.toLowerCase().includes(lower) ||
        bid.process.toLowerCase().includes(lower) ||
        bid.orgao.toLowerCase().includes(lower);
      if (!match) return false;
    }

    if (situacao !== 'Todos' && bid.situacao !== situacao) {
      return false;
    }

    if (uf !== 'Todos') {
      const bidUf = bid.orgaoLocation.split('/')[1]?.trim();
      if (bidUf !== uf) return false;
    }

    if (dataPublicacao) {
      const [year, month, day] = dataPublicacao.split('-');
      const formattedInput = `${day}/${month}/${year}`;
      if (bid.publicacao !== formattedInput) return false;
    }

    if (dataAbertura) {
      const [year, month, day] = dataAbertura.split('-');
      const formattedInput = `${day}/${month}/${year}`;
      if (!bid.abertura.startsWith(formattedInput)) return false;
    }

    return true;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, situacao, credenciamento, regiao, uf, municipio, dataPublicacao, dataAbertura]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contratações publicadas</h1>

        </div>

      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por:</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Digite aqui seu filtro..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-1 lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Situação:</label>
            <div className="relative">
              <select
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-700"
              >
                <option>Todos</option>
                <option>Recebendo propostas</option>
                <option>Em andamento</option>
                <option>Encerrado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Credenciamento:</label>
            <div className="relative">
              <select
                value={credenciamento}
                onChange={(e) => setCredenciamento(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-700"
              >
                <option>Todos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Second Row of Filters */}
          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Região:</label>
            <div className="relative">
              <select
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-700"
              >
                <option>Todos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Unidade federativa:</label>
            <div className="relative">
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-700"
              >
                <option value="Todos">Todos</option>
                <option value="CE">Ceará (CE)</option>
                <option value="PA">Pará (PA)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Município:</label>
            <div className="relative">
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-700"
              >
                <option>Todos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Data publicação :</label>
            <input
              type="date"
              value={dataPublicacao}
              onChange={(e) => setDataPublicacao(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-500"
            />
          </div>

          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Data abertura:</label>
            <input
              type="date"
              value={dataAbertura}
              onChange={(e) => setDataAbertura(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-500"
            />
          </div>

        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                className={`px-3 py-1 rounded text-sm font-medium ${currentPage === idx + 1 ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {idx + 1}
              </button>
            ))}
            {totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
            {totalPages > 5 && (
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`px-3 py-1 rounded text-sm font-medium ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded ml-1 bg-blue-50/50 disabled:opacity-50 flex items-center"
            >
              <ChevronRight size={16} />
            </button>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-slate-500">Ir para página</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= totalPages) setCurrentPage(val);
                }}
                className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm bg-blue-50/20 text-blue-700 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Exibindo</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none bg-blue-50/20 border border-slate-200 rounded-lg px-3 py-1 pr-8 text-blue-700 font-medium outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>de {totalItems} registros</span>
          </div>
        </div>
      </div>

      {/* Bidding Cards List */}
      <div className="space-y-4 pb-8">
        {paginatedData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-2">Nenhum resultado encontrado para os filtros selecionados.</div>
          </div>
        ) : (
          paginatedData.map((bid) => (
            <div key={bid.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <h3 className="text-[15px] font-bold text-blue-800 uppercase leading-snug flex-1">
                    {bid.title}
                  </h3>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => toggleExpand(bid.id)} className="text-slate-400 mb-2 cursor-pointer hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                      {expandedBidId === bid.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </button>
                    <button onClick={() => toggleExpand(bid.id)} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                      <FileText size={16} />
                      Detalhes do certame
                    </button>
                  </div>
                </div>

                {/* Grid Data */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
                  <div>
                    <span className="block text-xs font-bold text-slate-500 mb-2">Processo</span>
                    <div className="bg-amber-400 text-amber-900 text-sm font-semibold px-3 py-1.5 rounded-lg inline-block break-words max-w-full">
                      {bid.process}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <span className="block text-xs font-bold text-slate-500 mb-1">Órgão</span>
                    <div className="text-sm font-medium text-slate-800">{bid.orgao}</div>
                    <div className="text-xs font-bold text-blue-600 mt-0.5">{bid.orgaoLocation}</div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-500 mb-1">Publicação</span>
                    <div className="text-sm font-bold text-blue-600 border px-3 py-1 border-slate-100 rounded-lg inline-block bg-slate-50">{bid.publicacao}</div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-500 mb-1">Abertura da contratação</span>
                    <div className="text-sm font-bold text-emerald-600 border px-3 py-1 border-slate-100 rounded-lg inline-block bg-slate-50">{bid.abertura}</div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-500 mb-2">Situação</span>
                    <div className="bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg inline-block">
                      {bid.situacao}
                    </div>
                    <div className="mt-2">
                      <span className="block text-xs font-bold text-slate-500 mb-2">Sessão</span>
                      <div className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-lg inline-block">
                        {bid.sessao}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Features Strip */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center gap-x-12 gap-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-slate-400"><BarChart2 size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Modo de disputa</div>
                    <div className="text-sm font-bold text-slate-800">{bid.modoDisputa}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-slate-400"><Layers size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Classificação</div>
                    <div className="text-sm font-bold text-slate-800">{bid.classificacao}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-slate-400"><Hash size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Critério de julgamento</div>
                    <div className="text-sm font-bold text-slate-800">{bid.criterioJulgamento}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-slate-400"><Copy size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Tipo de apuração</div>
                    <div className="text-sm font-bold text-slate-800">{bid.tipoApuracao}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-slate-400"><Globe size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-slate-500">Participação ME/EPP/MEI</div>
                    <div className="text-sm font-bold text-slate-800">{bid.participacaoME}</div>
                  </div>
                </div>
              </div>

              {/* Expandable Tab Content */}
              {expandedBidId === bid.id && (
                <div className="border-t border-slate-200">
                  <div className="flex px-6 space-x-8 border-b border-slate-200 bg-white overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('itens')}
                      className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'itens' ? 'border-amber-400 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      <List size={18} className={activeTab === 'itens' ? 'text-amber-500' : 'text-slate-400'} />
                      Itens
                    </button>
                    <button
                      onClick={() => setActiveTab('documentos')}
                      className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documentos' ? 'border-blue-500 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      <FileKey size={18} className={activeTab === 'documentos' ? 'text-blue-500' : 'text-slate-400'} />
                      Documentos publicados
                    </button>
                    <button
                      onClick={() => setActiveTab('impugnacoes')}
                      className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'impugnacoes' ? 'border-red-500 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      <AlertTriangle size={18} className={activeTab === 'impugnacoes' ? 'text-red-500' : 'text-slate-400'} />
                      Impugnações
                    </button>
                    <button
                      onClick={() => setActiveTab('esclarecimentos')}
                      className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'esclarecimentos' ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      <HelpCircle size={18} className={activeTab === 'esclarecimentos' ? 'text-orange-500' : 'text-slate-400'} />
                      Esclarecimentos
                    </button>
                  </div>

                  {/* Tab Details Render */}
                  <div className="bg-slate-50 p-6">
                    {/* ITENS TAB */}
                    {activeTab === 'itens' && (
                      <div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por:</label>
                          <div className="relative max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="text"
                              placeholder="Digite aqui seu filtro..."
                              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3">Sequencial</th>
                                <th className="px-4 py-3 w-1/3">Descrição</th>
                                <th className="px-4 py-3">Unidade</th>
                                <th className="px-4 py-3 text-right">Quantidade</th>
                                <th className="px-4 py-3 text-right">Intervalo mínimo</th>
                                <th className="px-4 py-3 text-right">Valor referência unit.</th>
                                <th className="px-4 py-3 text-right">Valor referência total</th>
                                <th className="px-4 py-3 text-center">Participação ME/EPP/MEI</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {bid.itens && bid.itens.length > 0 ? bid.itens.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-slate-500 flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border border-blue-400 text-blue-500 flex items-center justify-center text-[10px] cursor-pointer hover:bg-blue-50">+</div>
                                    {item.seq}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 text-[13px]">{item.desc}</td>
                                  <td className="px-4 py-3 text-slate-600">{item.unid}</td>
                                  <td className="px-4 py-3 text-right text-slate-600">{item.qtd}</td>
                                  <td className="px-4 py-3 text-right text-slate-600">{item.intMin}</td>
                                  <td className="px-4 py-3 text-right text-slate-600">{item.valRefUnit}</td>
                                  <td className="px-4 py-3 text-right text-slate-600">{item.valRefTotal}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="bg-indigo-500/10 text-indigo-700 px-2 py-1 rounded text-xs font-semibold">{item.partMe}</span>
                                  </td>
                                </tr>
                              )) : (
                                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 bg-slate-50">Sem registros para exibição</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-slate-700"></div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button className="px-3 py-1 bg-blue-500/80 text-white rounded text-sm font-medium">1</button>
                              <span className="text-sm text-slate-500 ml-2">Ir para página</span>
                              <input type="number" defaultValue={1} className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm bg-blue-50/20 text-blue-700" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <select className="appearance-none bg-blue-50/20 border border-slate-200 rounded-lg px-3 py-1 pr-8 text-blue-700 font-medium">
                                <option>10</option>
                              </select>
                              <span>{bid.itens?.length || 0} registros</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DOCUMENTOS TAB */}
                    {activeTab === 'documentos' && (
                      <div>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3">Documento</th>
                                <th className="px-4 py-3 w-32 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {bid.documentos && bid.documentos.length > 0 ? bid.documentos.map((doc, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-4 text-slate-600 font-medium">{doc.nome}</td>
                                  <td className="px-4 py-3 text-center">
                                    <button className="text-emerald-500 border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded transition-colors inline-block">
                                      <FileText size={18} />
                                    </button>
                                  </td>
                                </tr>
                              )) : (
                                <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 bg-slate-50">Sem registros para exibição</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-slate-700"></div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium">1</button>
                              <span className="text-sm text-slate-500 ml-2">Ir para página</span>
                              <input type="number" defaultValue={1} className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm bg-blue-50/20 text-blue-700" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <select className="appearance-none bg-blue-50/20 border border-slate-200 rounded-lg px-3 py-1 pr-8 text-blue-700 font-medium">
                                <option>10</option>
                              </select>
                              <span>{bid.documentos?.length || 0} registros</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* IMPUGN/ESCLAREC TAB (EMPTY) */}
                    {(activeTab === 'impugnacoes' || activeTab === 'esclarecimentos') && (
                      <div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por:</label>
                          <div className="relative max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="text"
                              placeholder="Digite aqui seu filtro..."
                              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3">Proponente</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Título/{activeTab === 'impugnacoes' ? 'Impugnação' : 'Questionamento'}</th>
                                <th className="px-4 py-3">Data da resposta</th>
                                <th className="px-4 py-3">Título/Resposta</th>
                                <th className="px-4 py-3">Situação</th>
                                <th className="px-4 py-3 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr><td colSpan={7} className="px-4 py-3 text-center text-slate-500 bg-slate-50 border-t border-slate-200">Sem registros para exibição</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-slate-700">Nenhum registro encontrado</div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button className="px-3 py-1 bg-blue-500/80 text-white rounded text-sm font-medium opacity-80 cursor-not-allowed">1</button>
                              <span className="text-sm text-slate-500 ml-2">Ir para página</span>
                              <input type="number" defaultValue={1} className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm bg-blue-50/20 text-blue-700" disabled />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <select className="appearance-none bg-blue-50/20 border border-slate-200 rounded-lg px-3 py-1 pr-8 text-blue-700 font-medium" disabled>
                                <option>10</option>
                              </select>
                              <span>0 registro</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          )))}
      </div>

    </div>
  );
};