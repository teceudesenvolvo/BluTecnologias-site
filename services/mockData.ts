import { BlogPost, Software } from '../types';

export const initialSoftwares: Software[] = [
  {
    id: '3',
    nome_produto: 'App da Câmara',
    descricao_venda: 'Um ecossistema digital integrado para Câmaras Municipais: aplicativo do cidadão, serviços públicos, transparência, gestão legislativa e rotinas administrativas em módulos configuráveis.',
    icone_3d: 'Smartphone',
    link_demo: '#',
    features: ['Atendimento ao cidadão', 'Legislativo e transparência', 'Serviços e módulos administrativos']
  },
  {
    id: '4',
    nome_produto: 'Portal Escolar',
    descricao_venda: 'Centralize matrículas, diário de classe e frequência, com reconhecimento facial e integração a catracas compatíveis, para acompanhar a educação municipal em um só lugar.',
    icone_3d: 'GraduationCap',
    link_demo: '#',
    features: ['Matrícula Online', 'Diário de Classe Digital', 'Frequência Facial e Catracas']
  },
  {
    id: '5',
    nome_produto: 'Cidades AI',
    descricao_venda: 'ERP municipal para integrar prefeitura e secretarias. Contrate por módulos, organize rotinas administrativas e amplie a plataforma conforme as prioridades do município.',
    icone_3d: 'Sparkles',
    link_demo: '#',
    features: ['ERP para prefeitura e secretarias', 'Módulos contratados por área', 'Gestão integrada e expansível']
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
