import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged, signOut } from '../services/firebase';
import { 
  FileText, 
  DollarSign,
  CheckSquare,
  Users,
  FileBadge,
  Landmark,
  User,
  ShoppingBag,
  Briefcase,
  FileCheck,
  FileSignature,
  ClipboardList,
  Target
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { News } from './admin/News';
import { Financial } from './admin/Financial';
import { FinancialData } from './admin/FinancialData';
import { Tasks } from './admin/Tasks';
import { Clients } from './admin/Clients';
import { Certificates } from './admin/Certificates';
import { Profile } from './admin/Profile';
import { Quotes } from './admin/Quotes';
import { Procurements } from './admin/Procurements';
import { CRCs } from './admin/CRCs';
import { ContractsPage } from './admin/ContractsPage';
import { ARPs } from './admin/ARPs';
import { InterestAreas } from './admin/InterestAreas';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('blog');
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

  const allTabs = [
    { id: 'blog', label: 'Novidades', icon: FileText, component: News, showInMenu: true },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, component: Financial, showInMenu: true },
    { id: 'financial-data', label: 'Dados Financeiros', icon: Landmark, component: FinancialData, showInMenu: false },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare, component: Tasks, showInMenu: true },
    { id: 'clients', label: 'Clientes', icon: Users, component: Clients, showInMenu: true },
    { id: 'certificates', label: 'Documentos', icon: FileBadge, component: Certificates, showInMenu: true },
    { id: 'quotes', label: 'Pedidos de Cotação', icon: ShoppingBag, component: Quotes, showInMenu: true },
    { id: 'procurements', label: 'Contratações', icon: Briefcase, component: Procurements, showInMenu: true },
    { id: 'crcs', label: 'CRCs', icon: FileCheck, component: CRCs, showInMenu: true },
    { id: 'contracts', label: 'Contratos', icon: FileSignature, component: ContractsPage, showInMenu: true },
    { id: 'arps', label: 'ARPs', icon: ClipboardList, component: ARPs, showInMenu: true },
    { id: 'interest-areas', label: 'Áreas de Interesse', icon: Target, component: InterestAreas, showInMenu: true },
    { id: 'profile', label: 'Meu Perfil', icon: User, component: Profile, showInMenu: true },
  ];

  const menuItems = allTabs.filter(tab => tab.showInMenu);
  const ActiveComponent = (allTabs.find(item => item.id === activeTab)?.component || News) as any;

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        handleLogout={handleLogout} 
        menuItems={menuItems} 
      />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 md:p-12">
        <div className="max-w-6xl mx-auto">
            <header className="mb-10">
              <h2 className="text-3xl font-bold text-slate-800 capitalize">
                {allTabs.find(i => i.id === activeTab)?.label.replace(/dados d(a|os) /i, '')}
              </h2>
              <p className="text-slate-500">Gerencie as informações do sistema.</p>
            </header>

            <ActiveComponent setActiveTab={setActiveTab} />
          </div>
      </main>
    </div>
  );
};
