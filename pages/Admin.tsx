import React, { useState } from 'react';
import { initialBlogPosts, initialSoftwares } from '../services/mockData';
import { BlogPost, Software } from '../types';
import { Plus, Edit2, Trash2, FileText, Box } from 'lucide-react';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blog' | 'software'>('blog');
  const [posts, setPosts] = useState<BlogPost[]>(initialBlogPosts);
  const [softwares, setSoftwares] = useState<Software[]>(initialSoftwares);

  // Simple delete handlers to demonstrate interactivity
  const handleDeletePost = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este post?')) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  const handleDeleteSoftware = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este software?')) {
      setSoftwares(softwares.filter(s => s.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Painel Administrativo</h1>
            <p className="text-slate-500">Gerencie o conteúdo do portal Blu.</p>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button 
              onClick={() => setActiveTab('blog')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${activeTab === 'blog' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2"><FileText className="w-4 h-4"/> Blog</span>
            </button>
            <button 
              onClick={() => setActiveTab('software')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${activeTab === 'software' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2"><Box className="w-4 h-4"/> Softwares</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] p-8 border border-white/50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-slate-700">
              {activeTab === 'blog' ? 'Gerenciar Postagens' : 'Catálogo de Softwares'}
            </h2>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
              <Plus className="w-4 h-4" /> Novo {activeTab === 'blog' ? 'Post' : 'Software'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-4 text-slate-500 font-medium text-sm">ID</th>
                  <th className="p-4 text-slate-500 font-medium text-sm">
                    {activeTab === 'blog' ? 'Título' : 'Nome do Produto'}
                  </th>
                  <th className="p-4 text-slate-500 font-medium text-sm">
                    {activeTab === 'blog' ? 'Autor' : 'Ícone'}
                  </th>
                  <th className="p-4 text-slate-500 font-medium text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'blog' ? (
                  posts.map((post) => (
                    <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-400 text-sm">#{post.id}</td>
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
                ) : (
                  softwares.map((software) => (
                    <tr key={software.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-400 text-sm">#{software.id}</td>
                      <td className="p-4 font-medium text-slate-700">{software.nome_produto}</td>
                      <td className="p-4 text-slate-600">{software.icone_3d}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSoftware(software.id)}
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
            
            {((activeTab === 'blog' && posts.length === 0) || (activeTab === 'software' && softwares.length === 0)) && (
              <div className="text-center py-12 text-slate-400">
                Nenhum item encontrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
