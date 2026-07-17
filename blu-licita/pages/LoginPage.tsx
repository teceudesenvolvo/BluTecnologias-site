import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';
import { useBluAuth } from '../contexts/BluAuthContext';

export const BluLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signInDemo } = useBluAuth();
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/admin/dashboard');
    } catch {
      setError('Falha no login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const demo = async () => {
    setLoading(true);
    setError('');
    try {
      await signInDemo();
      navigate('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#f5f5f7] px-5 py-24 font-sans">
    <div className="pointer-events-none absolute -left-[18%] -top-[35%] h-[75vw] max-h-[850px] w-[75vw] max-w-[850px] rounded-full bg-blue-300/20 blur-[120px]"/>
    <div className="pointer-events-none absolute -bottom-[38%] -right-[20%] h-[80vw] max-h-[900px] w-[80vw] max-w-[900px] rounded-full bg-cyan-300/20 blur-[130px]"/>

    <main className="relative z-10 flex w-full max-w-[400px] flex-col items-center">
      <img src={Logo} alt="Blu Tecnologias" className="mb-9 h-24 w-auto object-contain"/>
      <h1 className="text-2xl font-medium tracking-tight text-slate-900">Entrar na Blu</h1>
      <p className="mb-9 mt-2 text-center text-lg text-slate-500">Sua operação de licitações em um só lugar.</p>

      <form className="w-full" onSubmit={submit}>
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {error&&<div className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 p-3 text-sm text-rose-600"><AlertCircle size={16}/>{error}</div>}
          <div className="group relative border-b border-slate-100">
            <input id="blu-email" type="email" placeholder="E-mail" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} required className="peer relative z-10 w-full bg-transparent px-4 pb-2 pt-6 text-slate-900 outline-none placeholder:text-transparent"/>
            <label htmlFor="blu-email" className="pointer-events-none absolute left-4 top-4 text-base text-slate-400 transition-all peer-focus:top-1 peer-focus:text-xs peer-valid:top-1 peer-valid:text-xs">E-mail</label>
          </div>
          <div className="group relative">
            <input id="blu-password" type="password" placeholder="Senha" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} required className="peer relative z-10 w-full bg-transparent px-4 pb-2 pt-6 pr-14 text-slate-900 outline-none placeholder:text-transparent"/>
            <label htmlFor="blu-password" className="pointer-events-none absolute left-4 top-4 text-base text-slate-400 transition-all peer-focus:top-1 peer-focus:text-xs peer-valid:top-1 peer-valid:text-xs">Senha</label>
            <button type="submit" disabled={loading} className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50" aria-label="Entrar">{loading?<Loader2 size={23} className="animate-spin"/>:<ArrowRight size={23}/>}</button>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={remember} onChange={(event)=>setRemember(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>Manter conectado</label>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-blue-600">
            <button type="button" className="hover:underline">Esqueceu a senha?</button>
            <Link to="/admin/onboarding" className="hover:underline">Criar conta</Link>
          </div>
          <button type="button" onClick={demo} disabled={loading} className="text-sm font-medium text-slate-500 transition hover:text-blue-600 disabled:opacity-50">Explorar ambiente de demonstração</button>
        </div>
      </form>
    </main>

    <footer className="absolute bottom-5 z-10 w-full px-4 text-center text-xs text-slate-400">
      <div className="mb-2 flex justify-center gap-4"><Link to="/politica-de-privacidade" className="hover:text-slate-600">Privacidade</Link><span className="text-slate-300">|</span><span>Termos de Uso</span><span className="text-slate-300">|</span><span>Ajuda</span></div>
      <p>Copyright © 2026 Blu Tecnologias. Todos os direitos reservados.</p>
    </footer>
  </div>;
};
