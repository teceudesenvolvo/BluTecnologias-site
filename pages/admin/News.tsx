import React, { useState, useEffect, useRef } from 'react';
import { blogService, auth } from '../../services/firebase';
import { BlogPost } from '../../types';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Loader2, Upload, 
  Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, Type, Link as LinkIcon
} from 'lucide-react';

const RichTextEditor = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-200 transition-all">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 flex-wrap">
        <button type="button" onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Negrito"><Bold size={18} /></button>
        <button type="button" onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Itálico"><Italic size={18} /></button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
        <button type="button" onClick={() => execCommand('formatBlock', 'H2')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Título"><Type size={18} /></button>
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Lista"><List size={18} /></button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
        <button type="button" onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Esquerda"><AlignLeft size={18} /></button>
        <button type="button" onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Centro"><AlignCenter size={18} /></button>
        <button type="button" onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Direita"><AlignRight size={18} /></button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
        <button type="button" onClick={() => {
          const url = prompt('Digite a URL:');
          if (url) execCommand('createLink', url);
        }} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Link"><LinkIcon size={18} /></button>
      </div>
      <div
        ref={editorRef}
        className="p-4 min-h-[200px] outline-none prose prose-sm max-w-none"
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
};

export const News: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    imagem_capa: '',
    author_mascote: 'Homem' as 'Homem' | 'Mulher'
  });

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

  const handleOpenModal = (post?: BlogPost) => {
    if (post) {
      setImages((post as any).images || [post.imagem_capa]);
      setEditingId(post.id);
      setFormData({
        title: post.title,
        content: post.content,
        category: post.category,
        imagem_capa: '', // Não usado diretamente no form, gerenciado pelo state images
        author_mascote: post.author_mascote as 'Homem' | 'Mulher'
      });
    } else {
      setImages([]);
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        category: '',
        imagem_capa: '',
        author_mascote: 'Homem'
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const promises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(base64Images => {
        setImages(prev => [...prev, ...base64Images]);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const imageUrl = images.length > 0 ? images[0] : '';

    const user = auth.currentUser;
    let authorName = 'Equipe Blu';
    if (user?.email === 'admin@blutecnologias.com.br') {
      authorName = 'Admin';
    } else if (user?.email) {
      authorName = user.email.split('@')[0]; // Usa a parte antes do @ como nome
    }

    const postData = {
      ...formData,
      imagem_capa: imageUrl,
      images: images,
      author: authorName,
      date: new Date().toISOString().split('T')[0]
    };

    const success = editingId 
      ? await blogService.update(editingId, postData)
      : await blogService.create(postData);

    if (success) {
      setIsModalOpen(false);
      loadPosts();
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-700">Gerenciar Postagens</h3>
        <button 
          onClick={() => handleOpenModal()}
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
                      <button 
                        onClick={() => handleOpenModal(post)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
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

      {/* Modal de Edição/Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Editar Postagem' : 'Nova Postagem'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Título</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Digite o título da notícia"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="Ex: Educação, Saúde"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Autor (Mascote)</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    value={formData.author_mascote}
                    onChange={e => setFormData({...formData, author_mascote: e.target.value as 'Homem' | 'Mulher'})}
                  >
                    <option value="Homem">Homem (Azul)</option>
                    <option value="Mulher">Mulher (Rosa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Imagens (Carrossel)</label>
                
                <div className="space-y-4">
                  {/* Opção de Upload */}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Upload size={32} />
                      <span className="font-medium">Clique para adicionar imagens</span>
                      <span className="text-xs">ou arraste e solte aqui</span>
                    </div>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                        {idx === 0 && <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">Capa</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Conteúdo</label>
                <RichTextEditor 
                  value={formData.content}
                  onChange={(val) => setFormData({...formData, content: val})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {editingId ? 'Salvar Alterações' : 'Publicar Notícia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
