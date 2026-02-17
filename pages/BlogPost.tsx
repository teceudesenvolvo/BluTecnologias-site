import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogService } from '../services/firebase';
import { BlogPost as BlogPostType } from '../types';
import { Calendar, User, ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';

export const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const images = (post as any).images || [post.imagem_capa];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
              <span className="font-medium">{(post as any).author || 'Equipe Blu'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              <span>{post.date}</span>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl mb-12 aspect-video relative group">
            <img src={images[currentImageIndex]} alt={post.title} className="w-full h-full object-cover transition-all duration-500" />
            
            {images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div 
            className="prose prose-lg max-w-none text-slate-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </ScrollReveal>
      </article>
    </div>
  );
};