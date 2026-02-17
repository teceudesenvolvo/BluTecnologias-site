import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged, signOut } from '../services/firebase';
import { 
  FileText, 
  LogOut,
  DollarSign,
  CheckSquare,
  Users,
  FileBadge
} from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';
import { News } from './admin/News';
import { Financial } from './admin/Financial';
import { Tasks } from './admin/Tasks';
import { Clients } from './admin/Clients';
import { Certificates } from './admin/Certificates';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'blog' | 'financial' | 'tasks' | 'clients' | 'certificates'>('blog');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const menuItems = [
    { id: 'blog', label: 'Novidades', icon: FileText, component: News },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, component: Financial },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare, component: Tasks },
    { id: 'clients', label: 'Clientes', icon: Users, component: Clients },
    { id: 'certificates', label: 'Documentos', icon: FileBadge, component: Certificates },
  ];

  const ActiveComponent = menuItems.find(item => item.id === activeTab)?.component || News;

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full flex flex-col z-20">
        <div className="p-8 border-b border-slate-100 flex flex-col items-center text-center">
            <img src={Logo} alt="Blu Admin" style={{ borderRadius: '20%' }} className="h-12 w-auto mb-3" />
            <p className="text-xs text-slate-400 mt-1">Painel de Gestão</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="px-4 py-3 mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Usuário</p>
              <p className="text-sm text-slate-700 truncate">{user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-medium text-sm"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 md:p-12">
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
              <h2 className="text-3xl font-bold text-slate-800">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-slate-500">Gerencie as informações do sistema.</p>
            </header>

            <ActiveComponent />
          </div>
      </main>
    </div>
  );
};
