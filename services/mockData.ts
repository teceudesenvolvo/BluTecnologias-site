import { BlogPost, Software } from '../types';

export const initialSoftwares: Software[] = [
  {
    id: '1',
    nome_produto: 'Portal de Serviços',
    descricao_venda: 'Otimize a prestação de serviços e reduza custos. Uma plataforma única para centralizar o atendimento ao cidadão e digitalizar processos.',
    icone_3d: 'LayoutDashboard',
    link_demo: '#',
    features: ['Emissão de Guias', 'Protocolo Digital', 'Consulta de Processos']
  },
  {
    id: '2',
    nome_produto: 'Portal do Legislativo',
    descricao_venda: 'Modernize a gestão legislativa e cumpra as leis de transparência com facilidade. Ofereça sessões ao vivo, pautas digitais e votação eletrônica segura.',
    icone_3d: 'Landmark',
    link_demo: '#',
    features: ['Transmissão Ao Vivo', 'Gestão de Pautas', 'Portal da Transparência']
  },
  {
    id: '3',
    nome_produto: 'App da Câmara',
    descricao_venda: 'Engaje o cidadão e fortaleça o mandato. Um canal direto de comunicação que oferece dados valiosos para a tomada de decisão e inclui módulos de serviços essenciais.',
    icone_3d: 'Smartphone',
    link_demo: '#',
    features: ['Denúncias PROCON', 'Apoio à Mulher', 'Notificações Push']
  },
  {
    id: '4',
    nome_produto: 'Blu Escolar',
    descricao_venda: 'Modernize a gestão educacional do seu município. Matrículas 100% online, diário de classe digital e controle de frequência em tempo real.',
    icone_3d: 'GraduationCap',
    link_demo: '#',
    features: ['Matrícula Online', 'Diário Digital', 'Gestão de Transportes']
  },
  {
    id: '5',
    nome_produto: 'Governança 360°',
    descricao_venda: 'Uma solução completa de ERP e Fintech para órgãos públicos que buscam eficiência máxima e risco zero.',
    icone_3d: 'Sparkles',
    link_demo: '#',
    features: ['Análise de Editais com IA', 'Gestão de Contratos', 'Automação de Pagamentos']
  }
];

export const initialBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'A Transformação Digital nas Prefeituras',
    content: 'Como a tecnologia está reduzindo filas e aumentando a arrecadação municipal através de processos automatizados.',
    author_mascote: 'Homem',
    date: '2023-10-24',
    imagem_capa: 'https://picsum.photos/800/400?random=1',
    category: 'Inovação'
  },
  {
    id: '2',
    title: 'O Papel da Procuradoria da Mulher Digital',
    content: 'Ferramentas digitais que garantem sigilo e agilidade no atendimento às mulheres vítimas de violência.',
    author_mascote: 'Mulher',
    date: '2023-10-20',
    imagem_capa: 'https://picsum.photos/800/400?random=2',
    category: 'Social'
  },
  {
    id: '3',
    title: 'Smart Cities: O Futuro é Agora',
    content: 'Implementando conceitos de cidades inteligentes em municípios de pequeno e médio porte.',
    author_mascote: 'Homem',
    date: '2023-10-15',
    imagem_capa: 'https://picsum.photos/800/400?random=3',
    category: 'Tecnologia'
  }
];
