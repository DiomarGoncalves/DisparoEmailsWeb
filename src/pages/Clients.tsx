import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Upload, Download, Search, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';

interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClients();
  }, [searchTerm]);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', {
        params: { search: searchTerm, limit: 100 }
      });
      setClients(response.data.clients);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clients', formData);
        toast.success('Cliente criado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({ name: '', email: '' });
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ name: client.name, email: client.email });
    setIsModalOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Tem certeza que deseja excluir ${client.name}?`)) {
      return;
    }

    try {
      await api.delete(`/clients/${client.id}`);
      toast.success('Cliente excluído com sucesso!');
      loadClients();
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        if (typeof data === 'string') {
          const base64 = data.split(',')[1];
          const response = await api.post('/clients/import', { data: base64 });
          
          toast.success(
            `Importação concluída! ${response.data.imported} clientes importados, ${response.data.skipped} ignorados`
          );
          
          if (response.data.errors?.length > 0) {
            console.log('Import errors:', response.data.errors);
          }
          
          loadClients();
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao importar clientes');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/clients/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clientes.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Clientes exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar clientes');
    }
  };

  const openModal = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '' });
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    { 
      key: 'createdAt', 
      header: 'Criado em',
      render: (client: Client) => new Date(client.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (client: Client) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(client)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(client)}
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
            <Users className="h-6 w-6 mr-2 text-blue-500" />
            Clientes
          </h1>
          <p className="text-gray-400">Gerencie sua base de clientes</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
              loading={importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
          <Button onClick={openModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Table
        data={clients}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhum cliente encontrado"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do cliente"
          />
          <Input
            label="E-mail"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@exemplo.com"
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
              {editingClient ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}