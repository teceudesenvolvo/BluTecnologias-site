import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { privacyPolicyService, PrivacyPolicy } from '../services/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

export const PrivacyPolicyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPolicy = async () => {
      if (id) {
        const data = await privacyPolicyService.getById(id);
        setPolicy(data);
      }
      setLoading(false);
    };
    loadPolicy();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 text-slate-500">
        <ShieldAlert size={48} className="mb-4 text-slate-300" />
        <h2 className="text-xl font-bold mb-2">Política não encontrada</h2>
        <p>Verifique o link e tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
           <img src={Logo} alt="Blu Tecnologias" className="h-12 w-auto mx-auto mb-4 brightness-0 invert opacity-80" />
           <h1 className="text-2xl font-bold text-white mb-1">{policy.appName}</h1>
           <p className="text-slate-400 text-sm">Política de Privacidade</p>
        </div>
        
        <div className="p-8 md:p-12">
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-600 leading-relaxed font-normal">
            {policy.content}
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Desenvolvido por {policy.companyName}</p>
            <p>Última atualização: {new Date(policy.lastUpdated).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};