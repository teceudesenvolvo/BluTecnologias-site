import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, X, Loader2, User } from 'lucide-react';
import { taskService, Task, auth } from '../../services/firebase';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Desenvolvimento');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    team: 'Desenvolvimento',
    assignee: ''
  }); 

  const teams = ['Desenvolvimento', 'Marketing', 'Vendas', 'Suporte', 'Financeiro'];

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await taskService.getAll();
    setTasks(data);
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const taskData = { 
      ...formData, 
      team: formData.team || selectedTeam,
      userId: auth.currentUser?.uid
    } as Omit<Task, 'id'>;
    
    const success = await taskService.create(taskData);
    if (success) {
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        team: selectedTeam,
        assignee: ''
      });
      loadTasks();
    }
    setSaving(false);
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    await taskService.update(task.id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if(confirm('Excluir tarefa?')) {
        await taskService.delete(id);
        loadTasks();
    }
  }

  const filteredTasks = tasks.filter(t => t.team === selectedTeam);

  const columns = [
    { id: 'todo', title: 'A Fazer', color: 'bg-slate-100', border: 'border-slate-200' },
    { id: 'in_progress', title: 'Em Progresso', color: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'done', title: 'Concluído', color: 'bg-green-50', border: 'border-green-100' }
  ];

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-700">Gestão de Tarefas</h3>
            <p className="text-slate-500 text-sm">Organize o fluxo de trabalho da equipe.</p>
          </div>

          <div className="flex gap-4 items-center">
             <select 
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-blue-500 outline-none"
             >
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
             </select>

             <button 
              onClick={() => {
                  setFormData({ ...formData, team: selectedTeam });
                  setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} /> Nova Tarefa
            </button>
          </div>
       </div>

       {/* Kanban Board */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
          {columns.map(col => (
              <div key={col.id} className={`rounded-2xl p-4 ${col.color} border ${col.border} min-h-[400px] flex flex-col`}>
                  <h4 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
                      {col.title}
                      <span className="bg-white px-2 py-1 rounded-lg text-xs text-slate-500 shadow-sm">
                          {filteredTasks.filter(t => t.status === col.id).length}
                      </span>
                  </h4>
                  
                  <div className="space-y-3 flex-1">
                      {filteredTasks.filter(t => t.status === col.id).map(task => (
                          <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{task.team}</span>
                                  <button onClick={() => handleDelete(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X size={14} />
                                  </button>
                              </div>
                              <h5 className="font-bold text-slate-800 mb-1">{task.title}</h5>
                              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{task.description}</p>
                              
                              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                      <User size={12} /> {task.assignee || 'Sem responsável'}
                                  </div>
                                  
                                  <div className="flex gap-1">
                                      {col.id !== 'todo' && (
                                          <button 
                                            onClick={() => handleStatusChange(task, col.id === 'done' ? 'in_progress' : 'todo')}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                                            title="Mover para trás"
                                          >
                                              ←
                                          </button>
                                      )}
                                      {col.id !== 'done' && (
                                          <button 
                                            onClick={() => handleStatusChange(task, col.id === 'todo' ? 'in_progress' : 'done')}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                                            title="Mover para frente"
                                          >
                                              →
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                      {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                          <div className="text-center py-10 text-slate-400 text-sm italic">
                              Nenhuma tarefa
                          </div>
                      )}
                  </div>
              </div>
          ))}
        </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in-up">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 mb-6">Nova Tarefa</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Título</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Atualizar Homepage"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Detalhes da tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Equipe</label>
                    <select 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white"
                        value={formData.team}
                        onChange={e => setFormData({...formData, team: e.target.value})}
                    >
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Responsável</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all"
                      value={formData.assignee}
                      onChange={e => setFormData({...formData, assignee: e.target.value})}
                      placeholder="Nome"
                    />
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="animate-spin" size={18} />}
                  {saving ? 'Salvando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
