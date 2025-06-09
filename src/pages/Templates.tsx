import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    subject: '', 
    content: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, formData);
        toast.success('Template atualizado com sucesso!');
      } else {
        await api.post('/templates', formData);
        toast.success('Template criado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', content: '' });
      loadTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ 
      name: template.name, 
      subject: template.subject, 
      content: template.content 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Tem certeza que deseja excluir o template "${template.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/templates/${template.id}`);
      toast.success('Template excluído com sucesso!');
      loadTemplates();
    } catch (error) {
      toast.error('Erro ao excluir template');
    }
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const openModal = () => {
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', content: '' });
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'subject', header: 'Assunto' },
    { 
      key: 'updatedAt', 
      header: 'Atualizado em',
      render: (template: Template) => new Date(template.updatedAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (template: Template) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handlePreview(template)}
            className="text-green-400 hover:text-green-300"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(template)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(template)}
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
            <FileText className="h-6 w-6 mr-2 text-blue-500" />
            Templates
          </h1>
          <p className="text-gray-400">Gerencie seus modelos de e-mail</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Table */}
      <Table
        data={templates}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhum template encontrado"
      />

      {/* Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Editar Template' : 'Novo Template'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Template"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do template"
          />
          <Input
            label="Assunto do E-mail"
            required
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Assunto do e-mail (use {{nome}}, {{email}} para campos dinâmicos)"
            helperText="Use {{nome}}, {{email}} para inserir dados dos clientes"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conteúdo do E-mail
            </label>
            <div className="bg-white rounded-md">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                modules={quillModules}
                style={{ height: '300px' }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Use {`{{nome}}`}, {`{{email}}`} para inserir dados dos clientes automaticamente
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-12">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingTemplate ? 'Atualizar' : 'Criar'}
            </Button>
            </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Preview do Template"
        size="lg"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Assunto:</h3>
              <p className="text-white bg-gray-700 p-3 rounded">{previewTemplate.subject}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Conteúdo:</h3>
              <div 
                className="text-white bg-gray-700 p-4 rounded prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}