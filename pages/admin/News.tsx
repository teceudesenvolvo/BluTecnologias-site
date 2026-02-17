import React, { useState, useEffect } from 'react';
import { blogService } from '../../services/firebase';
import { BlogPost } from '../../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const News: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const data = await blogService.getAll();
    setPosts(data);
    setLoading(false);
  };

  const handleDeletePost = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este post?')) {
      const success = await blogService.delete(id);
      if (success) loadPosts();
    }
  };

  const handleCreatePost = async () => {
    const newPost = {
      title: 'Nova Notícia Exemplo',
      content: 'Este é um conteúdo de exemplo criado via painel administrativo integrado ao Firebase.',
      author_mascote: 'Homem',
      date: new Date().toISOString().split('T')[0],
      imagem_capa: 'https://picsum.photos/800/400?random=' + Math.random(),
      category: 'Geral'
    };
    const success = await blogService.create(newPost);
    if (success) loadPosts();
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px]">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-700">Gerenciar Postagens</h3>
        <button 
          onClick={handleCreatePost}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Novo Post
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="p-4 text-slate-400 font-medium text-sm">ID</th>
              <th className="p-4 text-slate-400 font-medium text-sm">Título</th>
              <th className="p-4 text-slate-400 font-medium text-sm">Autor</th>
              <th className="p-4 text-slate-400 font-medium text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando...</td></tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-400 text-sm">#{post.id.substring(0, 6)}...</td>
                  <td className="p-4 font-medium text-slate-700">{post.title}</td>
                  <td className="p-4 text-slate-600">
                    <span className={`px-2 py-1 rounded-md text-xs ${post.author_mascote === 'Homem' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {post.author_mascote}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {posts.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-400">
            Nenhum post encontrado.
          </div>
        )}
      </div>
    </div>
  );
};
