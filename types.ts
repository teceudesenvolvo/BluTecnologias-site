export interface BlogPost {
  id: string;
  title: string;
  content: string;
  author_mascote: 'Homem' | 'Mulher';
  date: string;
  imagem_capa: string;
  category: string;
}

export interface Software {
  id: string;
  nome_produto: string;
  descricao_venda: string;
  icone_3d: string; // URL or Icon name
  link_demo: string;
  features: string[];
}

export type ViewMode = 'home' | 'products' | 'blog' | 'admin';
