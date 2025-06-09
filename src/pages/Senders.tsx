import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';

interface Sender {
  id: string;
  name: string;
  email: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  createdAt: string;
}

export function Senders() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<Sender | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadSenders();
  }, []);

  const loadSenders = async () => {
    try {
      const response = await api.get('/senders');
      setSenders(response.data);
    } catch (error) {
      toast.error('Erro ao carregar remetentes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingSender) {
        await api.put(`/senders/${editingSender.id}`, formData);
        toast.success('Remetente atualizado com sucesso!');
      } else {
        await api.post('/senders', formData);
        toast.success('Remetente criado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingSender(null);
      resetForm();
      loadSenders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar remetente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (sender: Sender) => {
    setEditingSender(sender);
    setFormData({
      name: sender.name,
      email: sender.email,
      host: sender.host,
      port: sender.port,
      secure: sender.secure,
      username: sender.username,
      password: '' // Don't populate password for security
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (sender: Sender) => {
    if (!confirm(`Tem certeza que deseja excluir o remetente "${sender.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/senders/${sender.id}`);
      toast.success('Remetente excluído com sucesso!');
      loadSenders();
    } catch (error) {
      toast.error('Erro ao excluir remetente');
    }
  };

  const handleTest = async (sender: Sender) => {
    setTesting(sender.id);
    
    try {
      await api.post(`/senders/${sender.id}/test`);
      toast.success('Conexão testada com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Falha no teste de conexão');
    } finally {
      setTesting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      host: '',
      port: 587,
      secure: true,
      username: '',
      password: ''
    });
  };

  const openModal = () => {
    setEditingSender(null);
    resetForm();
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    { key: 'host', header: 'Servidor' },
    { 
      key: 'port', 
      header: 'Porta',
      render: (sender: Sender) => `${sender.port} ${sender.secure ? '(SSL)' : ''}`
    },
    { 
      key: 'createdAt', 
      header: 'Criado em',
      render: (sender: Sender) => new Date(sender.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (sender: Sender) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleTest(sender)}
            disabled={testing === sender.id}
            className="text-green-400 hover:text-green-300 disabled:opacity-50"
          >
            <TestTube className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(sender)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(sender)}
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
            <Settings className="h-6 w-6 mr-2 text-blue-500" />
            Remetentes
          </h1>
          <p className="text-gray-400">Configure suas contas de e-mail</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Remetente
        </Button>
      </div>

      {/* Table */}
      <Table
        data={senders}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhum remetente encontrado"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSender ? 'Editar Remetente' : 'Novo Remetente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Remetente"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome para identificação"
          />
          
          <Input
            label="E-mail"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@exemplo.com"
          />

          <Input
            label="Servidor SMTP"
            required
            value={formData.host}
            onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
            placeholder="smtp.gmail.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Porta"
              type="number"
              required
              value={formData.port}
              onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
              placeholder="587"
            />
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="secure"
                checked={formData.secure}
                onChange={(e) => setFormData(prev => ({ ...prev, secure: e.target.checked }))}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="secure" className="text-sm text-gray-300">
                Usar SSL/TLS
              </label>
            </div>
          </div>

          <Input
            label="Usuário"
            required
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Usuário para autenticação"
          />

          <Input
            label={editingSender ? "Nova Senha (deixe em branco para manter)" : "Senha"}
            type="password"
            required={!editingSender}
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Senha para autenticação"
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingSender ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}