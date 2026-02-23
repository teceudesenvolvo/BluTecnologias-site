import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { auth, rtdb } from '../../../services/firebase';
import { WebmailSidebar } from './WebmailSidebar';
import { MessageList } from './MessageList';
import { EmailViewer } from './EmailViewer';
import { EmailComposer } from './EmailComposer';
import { Settings, AlertCircle, Loader2 } from 'lucide-react';

export const Webmail: React.FC = () => {
    const [currentFolder, setCurrentFolder] = useState('inbox');
    const [selectedEmail, setSelectedEmail] = useState<any>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [hasSmtpSettings, setHasSmtpSettings] = useState<boolean | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSmtpSettings = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const snapshot = await get(ref(rtdb, `users/${user.uid}/smtpSettings`));
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        if (data.host && data.port && data.user && data.pass) {
                            setHasSmtpSettings(true);
                        } else {
                            setHasSmtpSettings(false);
                        }
                    } else {
                        setHasSmtpSettings(false);
                    }
                } catch (error) {
                    console.error("Erro ao verificar SMTP:", error);
                    setHasSmtpSettings(false);
                }
            } else {
                setHasSmtpSettings(false);
            }
        };
        checkSmtpSettings();
    }, []);

    if (hasSmtpSettings === null) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-12rem)] min-h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (!hasSmtpSettings) {
        return (
            <div className="flex flex-col justify-center items-center h-[calc(100vh-12rem)] min-h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={40} className="text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure seu E-mail</h2>
                <p className="text-slate-500 max-w-md mb-8">
                    Para acessar o Webmail e enviar/receber mensagens, você precisa configurar sua conta de e-mail (SMTP) no seu Perfil.
                </p>
                <button
                    onClick={() => navigate('/admin/profile')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                    <Settings size={20} />
                    Ir para Configurações
                </button>
            </div>
        );
    }

    return (
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 h-[calc(100vh-12rem)] min-h-[600px] overflow-hidden">
            <WebmailSidebar
                currentFolder={currentFolder}
                setCurrentFolder={(folder: string) => {
                    setCurrentFolder(folder);
                    setSelectedEmail(null);
                    setIsComposing(false);
                }}
                onCompose={() => {
                    setIsComposing(true);
                    setSelectedEmail(null);
                }}
            />

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                {isComposing ? (
                    <EmailComposer onClose={() => setIsComposing(false)} />
                ) : selectedEmail ? (
                    <EmailViewer email={selectedEmail} onBack={() => setSelectedEmail(null)} />
                ) : (
                    <MessageList
                        folder={currentFolder}
                        onSelectEmail={setSelectedEmail}
                    />
                )}
            </div>
        </div>
    );
};
