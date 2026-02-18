import React, { useState } from 'react';
import { User, Mail, Lock, Save, Loader2, Shield } from 'lucide-react';
import { auth, rtdb } from '../../services/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { ref, update } from 'firebase/database';

export const Profile: React.FC = () => {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (user) {
        // Atualizar Nome
        if (displayName !== user.displayName) {
             await updateProfile(user, { displayName });
        }
        
        // Atualizar Senha
        if (newPassword) {
            if (newPassword.length < 6) {
                throw new Error('A senha deve ter pelo menos 6 caracteres.');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('As senhas não conferem.');
            }
            await updatePassword(user, newPassword);
        }

        // Salvar dados do usuário na coleção 'users'
        await update(ref(rtdb, `users/${user.uid}`), {
          displayName,
          email: user.email,
          updatedAt: new Date().toISOString()
        });
        
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error(error);
      let msg = 'Erro ao atualizar perfil.';
      if (error.code === 'auth/requires-recent-login') {
          msg = 'Para alterar a senha, faça login novamente.';
      } else if (error.message) {
          msg = error.message;
      }
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-700">Meu Perfil</h3>
        <p className="text-slate-500">Gerencie suas informações pessoais e segurança.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.type === 'success' ? <Shield size={18} /> : <Lock size={18} />}
            {message.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-8">
        {/* Cabeçalho do Usuário */}
        <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-sm border border-slate-200">
                {displayName ? displayName.charAt(0).toUpperCase() : <User size={32} />}
            </div>
            <div>
                <h4 className="font-bold text-slate-800 text-xl">{displayName || 'Usuário'}</h4>
                <p className="text-slate-500">{user?.email}</p>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mt-2 uppercase tracking-wide">
                    {user?.email === 'admin@blutecnologias.com.br' ? 'Administrador' : 'Usuário'}
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
            {/* Nome de Exibição */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome de Exibição</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white"
                        placeholder="Seu nome completo"
                    />
                </div>
            </div>

            {/* Email (Read-only) */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="email" 
                        value={user?.email || ''}
                        disabled
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1">O endereço de email não pode ser alterado.</p>
            </div>

            {/* Alteração de Senha */}
            <div className="pt-8 mt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-blue-600" /> Alterar Senha
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nova Senha</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Nova Senha</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                            placeholder="Repita a nova senha"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-100">
            <button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 flex items-center gap-2"
            >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Salvar Alterações
            </button>
        </div>
      </form>
    </div>
  );
};