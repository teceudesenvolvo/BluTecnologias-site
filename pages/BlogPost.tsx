import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogService } from '../services/firebase';
import { BlogPost as BlogPostType } from '../types';
import { Calendar, User, ArrowLeft, Loader2 } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';

export const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (id) {
        const data = await blogService.getById(id);
        setPost(data);
      }
      setLoading(false);
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center pt-20">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center pt-20 text-slate-600">
        <h2 className="text-2xl font-bold mb-4">Post não encontrado</h2>
        <Link to="/blog" className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft size={20} /> Voltar para o Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6 font-sans text-slate-900">
      <article className="max-w-4xl mx-auto">
        <ScrollReveal>
          <Link to="/blog" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 transition-colors font-medium">
            <ArrowLeft size={20} /> Voltar para novidades
          </Link>

          <div className="mb-6">
            <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase">
              {post.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight text-slate-900">
            {post.title}
          </h1>

          <div className="flex items-center gap-6 text-slate-500 mb-12 border-b border-slate-100 pb-8">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${post.author_mascote === 'Homem' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                <User size={20} />
              </div>
              <span className="font-medium">Equipe Blu</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              <span>{post.date}</span>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl mb-12 aspect-video relative">
            <img src={post.imagem_capa} alt={post.title} className="w-full h-full object-cover" />
          </div>

          <div className="prose prose-lg max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        </ScrollReveal>
      </article>
    </div>
  );
};