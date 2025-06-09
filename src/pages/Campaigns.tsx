import React, { useState, useEffect } from 'react';
import { Send, Plus, Eye, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';

interface Campaign {
  id: string;
  name: string;
  status: string;
  sender: { name: string; email: string };
  template: { name: string };
  stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  createdAt: string;
  sentAt?: string;
}

interface Sender {
  id: string;
  name: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    senderId: '',
    templateId: '',
    selectedClients: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, sendersRes, templatesRes, clientsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/senders'),
        api.get('/templates'),
        api.get('/clients?limit=1000')
      ]);

      setCampaigns(campaignsRes.data);
      setSenders(sendersRes.data);
      setTemplates(templatesRes.data);
      setClients(clientsRes.data.clients);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/campaigns', {
        ...formData,
        clientIds: formData.selectedClients
      });
      
      toast.success('Campanha criada e envio iniciado!');
      setIsModalOpen(false);
      setFormData({
        name: '',
        senderId: '',
        templateId: '',
        selectedClients: []
      });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar campanha');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientToggle = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClients: prev.selectedClients.includes(clientId)
        ? prev.selectedClients.filter(id => id !== clientId)
        : [...prev.selectedClients, clientId]
    }));
  };

  const selectAllClients = () => {
    setFormData(prev => ({
      ...prev,
      selectedClients: clients.map(c => c.id)
    }));
  };

  const deselectAllClients = () => {
    setFormData(prev => ({
      ...prev,
      selectedClients: []
    }));
  };

  const viewCampaignDetails = async (campaign: Campaign) => {
    try {
      const response = await api.get(`/campaigns/${campaign.id}`);
      setSelectedCampaign(response.data);
      setIsDetailsOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes da campanha');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'sending':
        return 'bg-blue-500/20 text-blue-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'sending':
        return 'Enviando';
      case 'failed':
        return 'Falhou';
      default:
        return 'Rascunho';
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { 
      key: 'sender', 
      header: 'Remetente',
      render: (campaign: Campaign) => `${campaign.sender.name} (${campaign.sender.email})`
    },
    { 
      key: 'template', 
      header: 'Template',
      render: (campaign: Campaign) => campaign.template.name
    },
    {
      key: 'stats',
      header: 'Progresso',
      render: (campaign: Campaign) => (
        <div className="text-sm">
          <div>{campaign.stats.sent}/{campaign.stats.total} enviados</div>
          {campaign.stats.failed > 0 && (
            <div className="text-red-400">{campaign.stats.failed} falharam</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (campaign: Campaign) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
          {getStatusText(campaign.status)}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (campaign: Campaign) => new Date(campaign.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (campaign: Campaign) => (
        <button
          onClick={() => viewCampaignDetails(campaign)}
          className="text-blue-400 hover:text-blue-300"
        >
          <Eye className="h-4 w-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Send className="h-6 w-6 mr-2 text-blue-500" />
            Campanhas
          </h1>
          <p className="text-gray-400">Gerencie seus envios de e-mail</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Table */}
      <Table
        data={campaigns}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhuma campanha encontrada"
      />

      {/* Create Campaign Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Campanha"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Campanha"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome da campanha"
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Destinatários ({formData.selectedClients.length} selecionados)
              </label>
              <div className="space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={selectAllClients}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={deselectAllClients}
                >
                  Limpar
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto bg-gray-700 rounded-md p-3 space-y-2">
              {clients.map(client => (
                <label key={client.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selectedClients.includes(client.id)}
                    onChange={() => handleClientToggle(client.id)}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    {client.name} ({client.email})
                  </span>
                </label>
              ))}
            </div>
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
              Criar e Enviar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Campaign Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Detalhes da Campanha"
        size="lg"
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300">Nome</h3>
                <p className="text-white">{selectedCampaign.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300">Status</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCampaign.status)}`}>
                  {getStatusText(selectedCampaign.status)}
                </span>
              </div>
            </div>
          {selectedCampaign.stats && (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-2xl font-bold text-white">{selectedCampaign.stats.total}</div>
                <div className="text-sm text-gray-400">Total</div>
              </div>
              <div className="bg-green-500/20 p-3 rounded">
                <div className="text-2xl font-bold text-green-400">{selectedCampaign.stats.sent}</div>
                <div className="text-sm text-gray-400">Enviados</div>
              </div>
              <div className="bg-red-500/20 p-3 rounded">
                <div className="text-2xl font-bold text-red-400">{selectedCampaign.stats.failed}</div>
                <div className="text-sm text-gray-400">Falharam</div>
              </div>
              <div className="bg-blue-500/20 p-3 rounded">
                <div className="text-2xl font-bold text-blue-400">{selectedCampaign.stats.pending}</div>
                <div className="text-sm text-gray-400">Pendentes</div>
              </div>
            </div>
          )}

            {selectedCampaign.campaignClients && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Destinatários</h3>
                <div className="max-h-60 overflow-y-auto bg-gray-700 rounded p-3">
                  {selectedCampaign.campaignClients.map((cc: any) => (
                    <div key={cc.id} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-300">
                        {cc.client.name} ({cc.client.email})
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        cc.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                        cc.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {cc.status === 'sent' ? 'Enviado' :
                         cc.status === 'failed' ? 'Falhou' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}