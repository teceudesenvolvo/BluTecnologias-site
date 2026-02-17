import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithEmailAndPassword } from '../services/firebase';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      setError('Falha no login. Verifique suas credenciais.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden bg-[#f5f5f7]">
       {/* Colorful background blobs similar to iCloud but subtle */}
       <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-300/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
       <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-300/20 rounded-full blur-[120px] pointer-events-none" />

      <ScrollReveal>
        <div className="w-full max-w-[400px] z-10 flex flex-col items-center">
            <div className="mb-10">
                <img src={Logo} alt="Blu" className="h-24 w-auto object-contain" />
            </div>

            <h1 className="text-2xl font-medium text-slate-900 mb-2">
                Entrar na Blu
            </h1>
            <p className="text-slate-500 mb-10 text-center text-lg">
                Gerencie sua cidade inteligente.
            </p>

            <form className="w-full" onSubmit={handleLogin}>
                <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 text-sm flex items-center gap-2 border-b border-red-100">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}
                    <div className="relative border-b border-slate-100 group">
                        <input 
                        type="email"
                        placeholder="Email "
                        className="w-full pt-6 pb-2 px-4 outline-none text-slate-900 placeholder:text-transparent peer bg-transparent z-10 relative"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        />
                        <label 
                        htmlFor="email" 
                        className="absolute left-4 top-4 text-slate-400 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-valid:top-1 peer-valid:text-xs pointer-events-none"
                        >
                        Email ou CPF
                        </label>
                    </div>
                    <div className="relative group">
                        <input 
                        type="password"
                        placeholder="Senha"
                        className="w-full pt-6 pb-2 px-4 outline-none text-slate-900 placeholder:text-transparent peer bg-transparent z-10 relative"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        />
                        <label 
                        htmlFor="password" 
                        className="absolute left-4 top-4 text-slate-400 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-valid:top-1 peer-valid:text-xs pointer-events-none"
                        >
                        Senha
                        </label>
                        
                        <button type="submit" disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors z-20 disabled:opacity-50">
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center gap-6 w-full">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="remember" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="remember" className="text-sm text-slate-600">Manter conectado</label>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm font-medium text-blue-600">
                        <a href="#" className="hover:underline flex items-center gap-1">
                            Esqueceu a senha?
                            <ArrowRight size={12} className="rotate-[-45deg]" />
                        </a>
                        <a href="#" className="hover:underline flex items-center gap-1">
                            Criar conta
                            <ArrowRight size={12} className="rotate-[-45deg]" />
                        </a>
                    </div>
                </div>
            </form>
        </div>
       </ScrollReveal>

       <footer className="absolute bottom-6 w-full text-center text-xs text-slate-400">
          <div className="flex justify-center gap-6 mb-3">
             <a href="#" className="hover:text-slate-600 transition-colors">Privacidade</a>
             <span className="text-slate-300">|</span>
             <a href="#" className="hover:text-slate-600 transition-colors">Termos de Uso</a>
             <span className="text-slate-300">|</span>
             <a href="#" className="hover:text-slate-600 transition-colors">Ajuda</a>
          </div>
          <p>Copyright © 2024 Blu Tecnologias. Todos os direitos reservados.</p>
       </footer>
    </div>
  );
};
