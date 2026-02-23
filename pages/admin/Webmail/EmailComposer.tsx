import React, { useState } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { rtdb, auth } from '../../../services/firebase';

interface EmailComposerProps {
    onClose: () => void;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({ onClose }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState<{ name: string, dataUrl: string }[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setAttachments(prev => [...prev, { name: file.name, dataUrl: event.target!.result as string }]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!to || !subject || !body) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        setSending(true);
        setError('');

        try {
            if (!auth.currentUser) throw new Error("Usuário não autenticado");

            // Save to 'emails' collection in 'sent' folder for local UI
            const emailsRef = ref(rtdb, `users/${auth.currentUser.uid}/emails`);
            const newEmailRef = push(emailsRef);
            await set(newEmailRef, {
                to,
                from: auth.currentUser.email || 'Eu',
                subject,
                body,
                folder: 'sent',
                read: true,
                attachments: attachments,
                timestamp: new Date().toISOString()
            });

            // Optional: If using Firebase Trigger Email extension via RTDB, also write to 'mail_queue'
            const mailQueueRef = ref(rtdb, 'mail_queue');
            const newQueueRef = push(mailQueueRef);
            await set(newQueueRef, {
                to: [to],
                userId: auth.currentUser.uid,
                message: {
                    subject: subject,
                    text: body,
                    html: body.replace(/\n/g, '<br>'),
                    attachments: attachments.map(a => ({
                        filename: a.name,
                        path: a.dataUrl
                    }))
                }
            });

            onClose();
        } catch (err: any) {
            console.error("Erro ao enviar email:", err);
            setError('Erro ao enviar o e-mail: ' + err.message);
            setSending(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white z-10 relative">
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                        title="Descartar"
                    >
                        <X size={20} />
                    </button>
                    <span className="font-medium text-slate-800">Nova Mensagem</span>
                </div>

                <button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 flex items-center gap-2 font-medium transition-colors text-sm shadow-sm"
                >
                    {sending ? 'Enviando...' : (
                        <>
                            <Send size={16} />
                            Enviar
                        </>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 text-sm text-center border-b border-red-100">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSend} className="flex flex-col h-full max-w-5xl mx-auto w-full">
                    <div className="px-8 py-4 border-b border-slate-100 flex items-center">
                        <label className="text-slate-500 w-20 text-sm font-medium">Para:</label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="flex-1 outline-none text-slate-800"
                            placeholder="destinatario@exemplo.com"
                        />
                    </div>

                    <div className="px-8 py-4 border-b border-slate-100 flex items-center">
                        <label className="text-slate-500 w-20 text-sm font-medium">Assunto:</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="flex-1 outline-none text-slate-800 font-medium"
                            placeholder="Assunto da mensagem"
                        />
                    </div>

                    <div className="flex-1 p-8 h-full">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full h-full outline-none text-slate-800 resize-none font-sans"
                            placeholder="Escreva sua mensagem aqui..."
                        />
                    </div>
                </form>

                {attachments.length > 0 && (
                    <div className="px-8 py-2 flex gap-2 flex-wrap">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="bg-slate-100 text-sm flex items-center gap-2 px-3 py-1 rounded-full text-slate-700">
                                <span className="truncate max-w-[150px]">{att.name}</span>
                                <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="h-14 border-t border-slate-200 px-6 flex items-center bg-slate-50 shrink-0">
                <label className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 text-sm flex items-center gap-2 cursor-pointer">
                    <Paperclip size={18} /> Anexar arquivos
                    <input type="file" className="hidden" multiple onChange={handleFileChange} />
                </label>
            </div>
        </div>
    );
};
