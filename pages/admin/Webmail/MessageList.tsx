import React, { useState, useEffect } from 'react';
import { Search, MailOpen, Clock } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { rtdb, auth } from '../../../services/firebase';

interface MessageListProps {
    folder: string;
    onSelectEmail: (email: any) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ folder, onSelectEmail }) => {
    const [emails, setEmails] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        // Assuming we structure it as users/{uid}/emails
        const emailsRef = ref(rtdb, `users/${auth.currentUser.uid}/emails`);
        const q = query(emailsRef, orderByChild('folder'), equalTo(folder));

        const unsubscribe = onValue(q, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const fetchedEmails = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a: any, b: any) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    return timeB - timeA;
                });
                setEmails(fetchedEmails);
            } else {
                setEmails([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching emails:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [folder]);

    const filteredEmails = emails.filter(email =>
        email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.to?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Top Header / Search */}
            <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-lg font-semibold text-slate-800 capitalize">
                    {folder === 'inbox' ? 'Caixa de Entrada' :
                        folder === 'sent' ? 'Enviados' :
                            folder === 'drafts' ? 'Rascunhos' : 'Lixeira'}
                </h2>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar mensagens..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-colors outline-none border"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-slate-400">
                        <Clock className="animate-spin mr-2" size={20} />
                        Carregando mensagens...
                    </div>
                ) : filteredEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <MailOpen size={48} className="mb-4 text-slate-300" />
                        <p className="text-sm">Nenhuma mensagem encontrada.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredEmails.map((email) => (
                            <div
                                key={email.id}
                                onClick={() => onSelectEmail(email)}
                                className={`flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!email.read && folder === 'inbox' ? 'bg-blue-50/30' : ''}`}
                            >
                                <div className="w-1/4 pr-4">
                                    <p className={`text-sm truncate ${!email.read && folder === 'inbox' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                        {folder === 'sent' ? `Para: ${email.to}` : email.from || 'Desconhecido'}
                                    </p>
                                </div>
                                <div className="w-1/2 px-4 flex-1">
                                    <p className={`text-sm truncate ${!email.read && folder === 'inbox' ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                                        {email.subject || '(Sem assunto)'}
                                        <span className="font-normal text-slate-500 ml-2">
                                            - {email.body?.replace(/<[^>]+>/g, '').substring(0, 50)}...
                                        </span>
                                    </p>
                                </div>
                                <div className="w-24 text-right pl-4">
                                    <p className={`text-xs ${!email.read && folder === 'inbox' ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
                                        {formatDate(email.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
