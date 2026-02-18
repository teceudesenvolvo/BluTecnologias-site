import React from 'react';
import { LogOut } from 'lucide-react';
import Logo from '../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component?: React.FC<any>;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: any;
  handleLogout: () => void;
  menuItems: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, handleLogout, menuItems }) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 fixed h-full flex flex-col z-20">
      <div className="p-8 border-b border-slate-100 flex flex-col items-center text-center">
          <img src={Logo} alt="Blu Admin" style={{ borderRadius: '20%' }} className="h-12 w-auto mb-3" />
          <p className="text-xs text-slate-400 mt-1">Painel de Gestão</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
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
  );
};