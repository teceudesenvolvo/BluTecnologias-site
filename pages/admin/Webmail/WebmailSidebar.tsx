import React from 'react';
import { Inbox, Send, FileText, Trash2, PenBox } from 'lucide-react';

interface WebmailSidebarProps {
    currentFolder: string;
    setCurrentFolder: (folder: string) => void;
    onCompose: () => void;
}

export const WebmailSidebar: React.FC<WebmailSidebarProps> = ({ currentFolder, setCurrentFolder, onCompose }) => {
    const folders = [
        { id: 'inbox', label: 'Entrada', icon: Inbox },
        { id: 'sent', label: 'Enviados', icon: Send },
        { id: 'drafts', label: 'Rascunhos', icon: FileText },
        { id: 'trash', label: 'Lixeira', icon: Trash2 },
    ];

    return (
        <div className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col">
            <button
                onClick={onCompose}
                className="w-full mb-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
            >
                <PenBox size={18} />
                Nova Mensagem
            </button>

            <nav className="flex-1 space-y-1">
                {folders.map((folder) => {
                    const Icon = folder.icon;
                    const isActive = currentFolder === folder.id;
                    return (
                        <button
                            key={folder.id}
                            onClick={() => setCurrentFolder(folder.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                            {folder.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
