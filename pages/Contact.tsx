import React, { useEffect } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { initialSoftwares } from '../services/mockData';

export const Contact: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                    <input type="text" id="name" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="Seu nome" />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-bold text-slate-700 mb-2">Cargo / Função</label>
                    <input type="text" id="role" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="Ex: Secretário, Prefeito" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">Email Corporativo</label>
                  <input type="email" id="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="seu@email.com.br" />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-bold text-slate-700 mb-2">Cidade / Estado</label>
                  <input type="text" id="city" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="Ex: Fortaleza - CE" />
                </div>

                <div>
                  <label htmlFor="solution" className="block text-sm font-bold text-slate-700 mb-2">Solução de Interesse</label>
                  <select id="solution" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white appearance-none">
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
                  <textarea id="message" rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="Gostaria de saber mais sobre..." />
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2">
                  Enviar Mensagem <Send size={20} />
                </button>
              </form>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
};