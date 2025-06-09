import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';

interface Schedule {
  id: string;
  name: string;
  cronPattern: string;
  isActive: boolean;
  sender: { name: string; email: string };
  template: { name: string };
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

interface Sender {
  id: string;
  name: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
}

const cronPresets = [
  { value: '0 9 * * 1', label: 'Toda segunda-feira às 9h' },
  { value: '0 9 * * 2', label: 'Toda terça-feira às 9h' },
  { value: '0 9 * * 3', label: 'Toda quarta-feira às 9h' },
  { value: '0 9 * * 4', label: 'Toda quinta-feira às 9h' },
  { value: '0 9 * * 5', label: 'Toda sexta-feira às 9h' },
  { value: '0 9 * * 1-5', label: 'Dias úteis às 9h' },
  { value: '0 9 1 * *', label: 'Todo dia 1 do mês às 9h' },
  { value: '0 9 * * 0', label: 'Todo domingo às 9h' },
  { value: 'custom', label: 'Personalizado' }
];

export function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    senderId: '',
    templateId: '',
    cronPattern: '',
    customCron: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesRes, sendersRes, templatesRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/senders'),
        api.get('/templates')
      ]);

      setSchedules(schedulesRes.data);
      setSenders(sendersRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const cronPattern = formData.cronPattern === 'custom' ? formData.customCron : formData.cronPattern;

    if (!cronPattern) {
      toast.error('Selecione ou digite um padrão de agendamento');
      setSubmitting(false);
      return;
    }

    try {
      const data = {
        name: formData.name,
        senderId: formData.senderId,
        templateId: formData.templateId,
        cronPattern,
        isActive: formData.isActive
      };

      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, data);
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        await api.post('/schedules', data);
        toast.success('Agendamento criado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingSchedule(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    
    const preset = cronPresets.find(p => p.value === schedule.cronPattern);
    
    setFormData({
      name: schedule.name,
      senderId: schedule.sender ? schedule.senderId : '',
      templateId: schedule.template ? schedule.templateId : '',
      cronPattern: preset ? schedule.cronPattern : 'custom',
      customCron: preset ? '' : schedule.cronPattern,
      isActive: schedule.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`Tem certeza que deseja excluir o agendamento "${schedule.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/schedules/${schedule.id}`);
      toast.success('Agendamento excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir agendamento');
    }
  };

  const toggleSchedule = async (schedule: Schedule) => {
    try {
      await api.put(`/schedules/${schedule.id}`, {
        ...schedule,
        isActive: !schedule.isActive
      });
      toast.success(`Agendamento ${!schedule.isActive ? 'ativado' : 'desativado'} com sucesso!`);
      loadData();
    } catch (error) {
      toast.error('Erro ao alterar status do agendamento');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      senderId: '',
      templateId: '',
      cronPattern: '',
      customCron: '',
      isActive: true
    });
  };

  const openModal = () => {
    setEditingSchedule(null);
    resetForm();
    setIsModalOpen(true);
  };

  const formatCronDescription = (cronPattern: string) => {
    const preset = cronPresets.find(p => p.value === cronPattern);
    return preset ? preset.label : cronPattern;
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { 
      key: 'sender', 
      header: 'Remetente',
      render: (schedule: Schedule) => schedule.sender ? `${schedule.sender.name}` : 'N/A'
    },
    { 
      key: 'template', 
      header: 'Template',
      render: (schedule: Schedule) => schedule.template ? schedule.template.name : 'N/A'
    },
    {
      key: 'cronPattern',
      header: 'Agendamento',
      render: (schedule: Schedule) => (
        <span className="text-sm">{formatCronDescription(schedule.cronPattern)}</span>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (schedule: Schedule) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          schedule.isActive 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {schedule.isActive ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'lastRun',
      header: 'Última execução',
      render: (schedule: Schedule) => 
        schedule.lastRun 
          ? new Date(schedule.lastRun).toLocaleString('pt-BR')
          : 'Nunca'
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (schedule: Schedule) => (
        <div className="flex space-x-2">
          <button
            onClick={() => toggleSchedule(schedule)}
            className={`${schedule.isActive ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}
          >
            {schedule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => handleEdit(schedule)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(schedule)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-500" />
            Agendamentos
          </h1>
          <p className="text-gray-400">Configure envios automáticos</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Table */}
      <Table
        data={schedules}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhum agendamento encontrado"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Agendamento"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do agendamento"
          />
          
          <Select
            label="Remetente"
            required
            value={formData.senderId}
            onChange={(e) => setFormData(prev => ({ ...prev, senderId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione um remetente' },
              ...senders.map(sender => ({
                value: sender.id,
                label: `${sender.name} (${sender.email})`
              }))
            ]}
          />

          <Select
            label="Template"
            required
            value={formData.templateId}
            onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione um template' },
              ...templates.map(template => ({
                value: template.id,
                label: template.name
              }))
            ]}
          />

          <Select
            label="Frequência"
            required
            value={formData.cronPattern}
            onChange={(e) => setFormData(prev => ({ ...prev, cronPattern: e.target.value }))}
            options={cronPresets}
          />

          {formData.cronPattern === 'custom' && (
            <Input
              label="Padrão Cron Personalizado"
              required
              value={formData.customCron}
              onChange={(e) => setFormData(prev => ({ ...prev, customCron: e.target.value }))}
              placeholder="0 9 * * 1"
              helperText="Formato: minuto hora dia mês dia-da-semana"
            />
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-300">
              Agendamento ativo
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingSchedule ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}