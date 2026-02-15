import React from 'react';
import { initialBlogPosts } from '../services/mockData';
import { Calendar, User } from 'lucide-react';

export const Blog: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Blog Blu
          </h1>
          <p className="text-slate-500">
            Notícias, inovações e atualizações sobre tecnologia no setor público.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialBlogPosts.map((post) => (
            <article 
              key={post.id}
              className="bg-white rounded-3xl overflow-hidden shadow-[10px_10px_30px_#d1d5db,-10px_-10px_30px_#ffffff] hover:shadow-[15px_15px_40px_#d1d5db,-15px_-15px_40px_#ffffff] transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={post.imagem_capa} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                  {post.category}
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {post.author_mascote}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-3 leading-tight">
                  {post.title}
                </h2>
                
                <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-grow">
                  {post.content}
                </p>

                <button className="text-blue-600 font-semibold text-sm hover:underline self-start">
                  Ler mais
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
