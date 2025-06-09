import React, { useState, useEffect } from 'react';
import { Users, FileText, Send, Calendar, Activity, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface DashboardStats {
  clients: number;
  templates: number;
  campaigns: number;
  schedules: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    stats: {
      total: number;
      sent: number;
      failed: number;
    };
    createdAt: string;
  }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clientsRes, templatesRes, campaignsRes, schedulesRes] = await Promise.all([
        api.get('/clients?limit=1'),
        api.get('/templates'),
        api.get('/campaigns'),
        api.get('/schedules')
      ]);

      setStats({
        clients: clientsRes.data.total || 0,
        templates: templatesRes.data.length || 0,
        campaigns: campaignsRes.data.length || 0,
        schedules: schedulesRes.data.length || 0,
        recentCampaigns: campaignsRes.data.slice(0, 5) || []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Clientes',
      value: stats?.clients || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      name: 'Templates',
      value: stats?.templates || 0,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      name: 'Campanhas',
      value: stats?.campaigns || 0,
      icon: Send,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      name: 'Agendamentos',
      value: stats?.schedules || 0,
      icon: Calendar,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Visão geral do seu sistema de e-mail marketing</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent campaigns */}
      <div className="bg-gray-800 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            Campanhas Recentes
          </h2>
        </div>
        <div className="p-6">
          {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
            <div className="space-y-4">
              {stats.recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-white">{campaign.name}</h3>
                    <p className="text-xs text-gray-400">
                      {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-white">
                        {campaign.stats.sent}/{campaign.stats.total}
                      </div>
                      <div className="text-xs text-gray-400">enviados</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400'
                        : campaign.status === 'sending'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {campaign.status === 'completed' ? 'Concluída' :
                       campaign.status === 'sending' ? 'Enviando' : 'Rascunho'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Send className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma campanha encontrada</p>
              <p className="text-sm text-gray-500 mt-1">
                Crie sua primeira campanha para começar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}