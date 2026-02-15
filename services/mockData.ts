import { BlogPost, Software } from '../types';

export const initialSoftwares: Software[] = [
  {
    id: '1',
    nome_produto: 'Portal de Serviços',
    descricao_venda: 'Centralize todos os serviços públicos em um único lugar. Agilidade para o cidadão, eficiência para a gestão.',
    icone_3d: 'LayoutDashboard',
    link_demo: '#',
    features: ['Emissão de Guias', 'Protocolo Digital', 'Consulta de Processos']
  },
  {
    id: '2',
    nome_produto: 'Portal do Legislativo',
    descricao_venda: 'Transparência total para as Câmaras Municipais. Sessões ao vivo, pautas digitais e votação eletrônica.',
    icone_3d: 'Landmark',
    link_demo: '#',
    features: ['Transmissão Ao Vivo', 'Gestão de Pautas', 'Portal da Transparência']
  },
  {
    id: '3',
    nome_produto: 'App da Câmara',
    descricao_venda: 'O legislativo na palma da mão do cidadão. Inclui módulos exclusivos para PROCON e Procuradoria da Mulher.',
    icone_3d: 'Smartphone',
    link_demo: '#',
    features: ['Denúncias PROCON', 'Apoio à Mulher', 'Notificações Push']
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
