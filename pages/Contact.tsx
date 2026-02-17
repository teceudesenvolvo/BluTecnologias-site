import React, { useEffect, useState } from 'react';
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { initialSoftwares } from '../services/mockData';
import { contactService } from '../services/firebase';

export const Contact: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    city: '',
    solution: '',
    message: ''
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await contactService.create(formData);
    
    if (result) {
      setSuccess(true);
      setFormData({
        name: '',
        role: '',
        email: '',
        phone: '',
        city: '',
        solution: '',
        message: ''
      });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white font-sans text-slate-900 pt-20">
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Fale Conosco</h1>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                Estamos prontos para modernizar a gestão pública da sua cidade. Entre em contato e agende uma demonstração.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <ScrollReveal delay={100}>
              <div className="bg-slate-50 p-10 rounded-[2.5rem]">
                <h3 className="text-2xl font-bold mb-8">Informações de Contato</h3>
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Email</h4>
                      <p className="text-slate-600">contato@blutecnologias.com.br</p>
                      <p className="text-slate-500 text-sm mt-1">Resposta em até 24h úteis.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Localização</h4>
                      <p className="text-slate-600">Fortaleza, Ceará</p>
                      <p className="text-slate-500 text-sm mt-1">Atendemos prefeituras em todo o Brasil.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Telefone</h4>
                      <p className="text-slate-600">(85) 99999-9999</p>
                      <p className="text-slate-500 text-sm mt-1">Segunda a Sexta, 8h às 18h.</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Form */}
            <ScrollReveal delay={200}>
              {success ? (
                <div className="bg-green-50 p-10 rounded-[2.5rem] h-full flex flex-col items-center justify-center text-center border border-green-100">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Mensagem Enviada!</h3>
                  <p className="text-slate-600 mb-8">Obrigado pelo contato. Nossa equipe retornará em breve.</p>
                  <button 
                    onClick={() => setSuccess(false)}
                    className="text-green-700 font-bold hover:underline"
                  >
                    Enviar nova mensagem
                  </button>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                    <input 
                      type="text" id="name" required 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                      placeholder="Seu nome"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-bold text-slate-700 mb-2">Cargo / Função</label>
                    <input 
                      type="text" id="role" required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                      placeholder="Ex: Secretário, Prefeito"
                      value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">Email Corporativo</label>
                      <input 
                        type="email" id="email" required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                        placeholder="seu@email.com.br"
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2">Telefone / WhatsApp</label>
                      <input 
                        type="tel" id="phone" required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                        placeholder="(00) 00000-0000"
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-bold text-slate-700 mb-2">Cidade / Estado</label>
                  <input 
                    type="text" id="city" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                    placeholder="Ex: Fortaleza - CE"
                    value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                  />
                </div>

                <div>
                  <label htmlFor="solution" className="block text-sm font-bold text-slate-700 mb-2">Solução de Interesse</label>
                  <select 
                    id="solution" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white appearance-none"
                    value={formData.solution} onChange={e => setFormData({...formData, solution: e.target.value})}
                  >
                    <option value="">Selecione a solução</option>
                    {initialSoftwares.map(software => (
                      <option key={software.id} value={software.nome_produto}>
                        {software.nome_produto}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2">Como podemos ajudar?</label>
                  <textarea 
                    id="message" rows={4} required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                    placeholder="Gostaria de saber mais sobre..."
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {loading ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
              )}
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
};