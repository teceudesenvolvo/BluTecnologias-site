import React, { useState, useEffect } from 'react';
import { FileBadge, Plus, Trash2, Calendar, AlertTriangle, CheckCircle, X, Loader2, FileText, AlertCircle, Edit2, Upload, Download } from 'lucide-react';
import { certificateService, Certificate } from '../../services/firebase';

export const Certificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('Todos');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [dateFilterType, setDateFilterType] = useState<'expiryDate' | 'issueDate'>('expiryDate');
  
  const [formData, setFormData] = useState({
    name: '',
    issueDate: '',
    expiryDate: '',
    fileUrl: ''
  });

  const docTypes = [
    'CND Federal',
    'CND Estadual',
    'CND Municipal',
    'CND FGTS',
    'CND Trabalhista',
    'CNPJ',
    'Contrato Social',
    'Alvará de Funcionamento',
    'Outros'
  ];

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    const data = await certificateService.getAll();
    setCertificates(data);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, fileUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let success = false;
    if (editingId) {
      success = await certificateService.update(editingId, formData);
    } else {
      success = await certificateService.create(formData);
    }

    if (success) {
      setIsModalOpen(false);
      setFormData({ name: '', issueDate: '', expiryDate: '', fileUrl: '' });
      setEditingId(null);
      loadCertificates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      const success = await certificateService.delete(id);
      if (success) loadCertificates();
    }
  };

  const handleEdit = (cert: Certificate) => {
    setEditingId(cert.id);
    setFormData({
      name: cert.name,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      fileUrl: cert.fileUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', issueDate: '', expiryDate: '', fileUrl: '' });
  };

  const getStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Vencido', color: 'text-red-600 bg-red-50', icon: AlertCircle, border: 'border-red-200' };
    if (diffDays <= 30) return { label: 'Vence em breve', color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle, border: 'border-yellow-200' };
    return { label: 'Vigente', color: 'text-green-600 bg-green-50', icon: CheckCircle, border: 'border-slate-200' };
  };

  const filteredByType = selectedType === 'Todos' 
    ? certificates 
    : certificates.filter(cert => cert.name === selectedType);

  const filteredCertificates = filteredByType.filter(cert => {
    if (!dateFilter.start && !dateFilter.end) {
      return true;
    }
    const dateToCompare = cert[dateFilterType];
    const startOk = !dateFilter.start || dateToCompare >= dateFilter.start;
    const endOk = !dateFilter.end || dateToCompare <= dateFilter.end;

    return startOk && endOk;
  });

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div> 
            <h3 className="text-xl font-bold text-slate-700">Gestão de Documentação</h3>
            <p className="text-slate-500 text-sm">Monitore a vigência de CNDs e documentos legais.</p>
          </div>
          <button 
            onClick={() => { setEditingId(null); setFormData({ name: '', issueDate: '', expiryDate: '', fileUrl: '' }); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} /> Novo Documento
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="font-medium text-sm text-slate-600">Filtrar por:</span>
          <select 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
              <option value="Todos">Todos os Tipos</option>
              {docTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
              ))}
          </select>
          <select 
              value={dateFilterType} 
              onChange={e => setDateFilterType(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
              <option value="expiryDate">Data de Vencimento</option>
              <option value="issueDate">Data de Emissão</option>
          </select>
          <label htmlFor="startDate" className="text-sm font-medium text-slate-600">De:</label>
          <input 
              type="date" 
              id="startDate"
              value={dateFilter.start}
              onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
          />
          <label htmlFor="endDate" className="text-sm font-medium text-slate-600">Até:</label>
          <input 
              type="date" 
              id="endDate"
              value={dateFilter.end}
              onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
          />
          <button onClick={() => { setDateFilter({ start: '', end: '' }); setSelectedType('Todos'); }} className="text-sm font-medium text-blue-600 hover:underline">Limpar Filtros</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full flex justify-center py-20 text-slate-400">
               <Loader2 className="animate-spin" />
             </div>
          ) : filteredCertificates.length === 0 ? (
             <div className="col-span-full text-center py-20 text-slate-400">Nenhum documento encontrado para os filtros aplicados.</div>
          ) : (
            filteredCertificates.map((cert) => {
              const status = getStatus(cert.expiryDate);
              return (
                <div key={cert.id} className={`border ${status.border} rounded-2xl p-6 hover:shadow-md transition-all relative group bg-white`}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                        <FileText size={24} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status.color}`}>
                        <status.icon size={12} /> {status.label}
                      </span>
                   </div>
                   
                   <h4 className="font-bold text-slate-800 mb-1">{cert.name}</h4>
                   <div className="text-sm text-slate-500 space-y-1">
                     <p>Emissão: {new Date(cert.issueDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                     <p className="font-medium">Vencimento: {new Date(cert.expiryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                   </div>

                   <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {cert.fileUrl && (
                        <a 
                          href={cert.fileUrl} 
                          download={`${cert.name}.pdf`}
                          className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Baixar PDF"
                        >
                          <Download size={18} />
                        </a>
                      )}
                      <button onClick={() => handleEdit(cert)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button 
                          onClick={() => handleDelete(cert.id)}
                          className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                          <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in-up">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            <h3 className="text-xl font-bold text-slate-800 mb-6">{editingId ? 'Editar Documento' : 'Novo Documento'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Documento</label>
                <input list="docTypes" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Selecione ou digite..." />
                <datalist id="docTypes">
                  {docTypes.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Data de Emissão</label>
                  <input type="date" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Data de Vencimento</label>
                  <input type="date" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all" 
                    value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Arquivo PDF</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Upload size={24} />
                      <span className="text-sm font-medium">{formData.fileUrl ? 'Arquivo selecionado (Clique para alterar)' : 'Clique para fazer upload do PDF'}</span>
                    </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 flex items-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={18} />} 
                  {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
