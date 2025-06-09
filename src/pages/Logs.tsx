import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Table } from '../components/Table';

interface Log {
  id: string;
  action: string;
  details?: string;
  createdAt: string;
}

const actionOptions = [
  { value: '', label: 'Todas as ações' },
  { value: 'login', label: 'Login' },
  { value: 'register', label: 'Registro' },
  { value: 'create_client', label: 'Criar Cliente' },
  { value: 'update_client', label: 'Atualizar Cliente' },
  { value: 'delete_client', label: 'Excluir Cliente' },
  { value: 'import_clients', label: 'Importar Clientes' },
  { value: 'export_clients', label: 'Exportar Clientes' },
  { value: 'create_template', label: 'Criar Template' },
  { value: 'update_template', label: 'Atualizar Template' },
  { value: 'delete_template', label: 'Excluir Template' },
  { value: 'create_campaign', label: 'Criar Campanha' },
  { value: 'complete_campaign', label: 'Concluir Campanha' },
  { value: 'create_schedule', label: 'Criar Agendamento' },
  { value: 'update_schedule', label: 'Atualizar Agendamento' },
  { value: 'delete_schedule', label: 'Excluir Agendamento' },
  { value: 'execute_schedule', label: 'Executar Agendamento' },
  { value: 'create_sender', label: 'Criar Remetente' },
  { value: 'update_sender', label: 'Atualizar Remetente' },
  { value: 'delete_sender', label: 'Excluir Remetente' },
  { value: 'test_sender', label: 'Testar Remetente' }
];

export function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadLogs();
  }, [filters, pagination.currentPage]);

  const loadLogs = async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: 50,
        ...filters
      };

      const response = await api.get('/logs', { params });
      setLogs(response.data.logs);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.pages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const getActionLabel = (action: string) => {
    const option = actionOptions.find(opt => opt.value === action);
    return option ? option.label : action;
  };

  const columns = [
    {
      key: 'action',
      header: 'Ação',
      render: (log: Log) => (
        <span className="font-medium text-blue-400">
          {getActionLabel(log.action)}
        </span>
      )
    },
    { 
      key: 'details', 
      header: 'Detalhes',
      render: (log: Log) => (
        <span className="text-gray-300 max-w-md truncate">
          {log.details || '-'}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Data/Hora',
      render: (log: Log) => (
        <span className="text-sm">
          {new Date(log.createdAt).toLocaleString('pt-BR')}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Activity className="h-6 w-6 mr-2 text-blue-500" />
          Logs do Sistema
        </h1>
        <p className="text-gray-400">Histórico de atividades e operações</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <Select
              label="Ação"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              options={actionOptions}
            />
            <Input
              label="Data Inicial"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label="Data Final"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-400">
          Total de registros: <span className="text-white font-medium">{pagination.total}</span>
        </div>
      </div>

      {/* Table */}
      <Table
        data={logs}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhum log encontrado"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
            disabled={pagination.currentPage === 1}
            className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Anterior
          </button>
          <span className="px-3 py-2 text-gray-300">
            Página {pagination.currentPage} de {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}