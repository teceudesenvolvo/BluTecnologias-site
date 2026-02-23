import React, { useEffect } from 'react';
import { ArrowLeft, Reply, Trash2, Clock, User } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { rtdb, auth } from '../../../services/firebase';

interface EmailViewerProps {
    email: any;
    onBack: () => void;
}

export const EmailViewer: React.FC<EmailViewerProps> = ({ email, onBack }) => {

    useEffect(() => {
        // Mark as read when opened
        const markAsRead = async () => {
            if (email && !email.read && auth.currentUser) {
                try {
                    const emailRef = ref(rtdb, `users/${auth.currentUser.uid}/emails/${email.id}`);
                    await update(emailRef, { read: true });
                } catch (error) {
                    console.error("Error marking email as read:", error);
                }
            }
        };
        markAsRead();
    }, [email]);

    const handleDelete = async () => {
        if (!auth.currentUser || !email) return;
        try {
            const emailRef = ref(rtdb, `users/${auth.currentUser.uid}/emails/${email.id}`);
            await update(emailRef, { folder: 'trash' });
            onBack(); // Go back to list after deleting
        } catch (error) {
            console.error("Error deleting email:", error);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!email) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                        title="Voltar"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2"></div>

                    <button
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                        title="Responder"
                    >
                        <Reply size={20} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors text-slate-500"
                        title="Excluir"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Email Header */}
                    <h1 className="text-2xl font-bold text-slate-900 mb-6">{email.subject || '(Sem assunto)'}</h1>

                    <div className="flex items-start justify-between mb-8 pb-8 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <User size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900">{email.from}</p>
                                </div>
                                <p className="text-sm text-slate-500">para {email.to}</p>
                            </div>
                        </div>
                        <div className="flex items-center text-sm text-slate-500">
                            <Clock size={16} className="mr-2" />
                            {formatDate(email.timestamp)}
                        </div>
                    </div>

                    {/* Email Body */}
                    <div
                        className="prose max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: email.body || '' }}
                    />
                </div>
            </div>
        </div>
    );
};
