import React from 'react';
import { ArrowRight } from 'lucide-react';

interface Card3DProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  features?: string[];
  onClick?: () => void;
  highlight?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({ title, description, icon, features, onClick, highlight }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative group cursor-pointer
        bg-slate-50 rounded-[2rem] p-8
        transition-all duration-500 ease-out
        border border-white/60
        shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]
        hover:shadow-[25px_25px_70px_#b0b0b0,-25px_-25px_70px_#ffffff]
        hover:-translate-y-2
        flex flex-col h-full justify-between
        ${highlight ? 'ring-2 ring-blue-400/30' : ''}
      `}
    >
      {/* Inner Gradient Overlay for Glass effect */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/60 to-transparent opacity-50 pointer-events-none" />

      <div className="relative z-10">
        {/* Icon Container */}
        <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white shadow-[inset_5px_5px_10px_#d1d5db,inset_-5px_-5px_10px_#ffffff] flex items-center justify-center text-blue-600">
          {icon}
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        
        <p className="text-slate-500 leading-relaxed mb-6">
          {description}
        </p>

        {features && (
          <ul className="space-y-2 mb-6">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center text-sm text-slate-600">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10 mt-auto pt-4 border-t border-slate-200/50">
        <span className="inline-flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
          Saiba mais <ArrowRight className="ml-2 w-4 h-4" />
        </span>
      </div>
    </div>
  );
};
