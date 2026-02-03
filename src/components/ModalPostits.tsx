'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Postit {
  id: number;
  opd: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: string;
  criado_por: string;
  criado_em: string;
}

interface ModalPostitsProps {
  opd: string;
  onClose: () => void;
}

export default function ModalPostits({ opd, onClose }: ModalPostitsProps) {
  const [postits, setPostits] = useState<Postit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPostit, setEditingPostit] = useState<Postit | null>(null);
  const [formData, setFormData] = useState({
    descricao: '',
    responsavel: '',
    prazo: '',
    status: 'pendente'
  });

  useEffect(() => {
    loadPostits();
  }, [opd]);

  const loadPostits = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/postits/${encodeURIComponent(opd)}`);
      const data = await response.json();

      if (data.success) {
        setPostits(data.postits);
      }
    } catch (error) {
      console.error('Erro ao carregar post-its:', error);
      toast.error('Erro ao carregar post-its');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      if (editingPostit) {
        // Atualizar
        const response = await fetch(`/api/postits/${encodeURIComponent(opd)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPostit.id,
            ...formData
          })
        });

        const data = await response.json();
        if (data.success) {
          toast.success('Post-it atualizado com sucesso!');
          loadPostits();
          resetForm();
        }
      } else {
        // Criar
        const response = await fetch(`/api/postits/${encodeURIComponent(opd)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            criado_por: user?.nome || 'Sistema'
          })
        });

        const data = await response.json();
        if (data.success) {
          toast.success('Post-it criado com sucesso!');
          loadPostits();
          resetForm();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar post-it:', error);
      toast.error('Erro ao salvar post-it');
    }
  };

  const handleEdit = (postit: Postit) => {
    setEditingPostit(postit);
    setFormData({
      descricao: postit.descricao,
      responsavel: postit.responsavel,
      prazo: postit.prazo.split('T')[0], // Format date
      status: postit.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este post-it?')) return;

    try {
      const response = await fetch(`/api/postits/${encodeURIComponent(opd)}?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Post-it excluído com sucesso!');
        loadPostits();
      }
    } catch (error) {
      console.error('Erro ao excluir post-it:', error);
      toast.error('Erro ao excluir post-it');
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      responsavel: '',
      prazo: '',
      status: 'pendente'
    });
    setEditingPostit(null);
    setShowForm(false);
  };

  const getPostitColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-200 border-green-400';
      case 'em_andamento':
        return 'bg-yellow-200 border-yellow-400';
      default:
        return 'bg-orange-200 border-orange-400';
    }
  };

  const isPrazoVencido = (prazo: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataPrazo = new Date(prazo);
    return dataPrazo < hoje;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📌 Post-its de Pendências</h2>
            <p className="text-gray-700 mt-1">OPD: {opd}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-gray-600 transition"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              {/* Botão Adicionar */}
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mb-6 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar Post-it
                </button>
              )}

              {/* Formulário */}
              {showForm && (
                <div className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-orange-300">
                  <h3 className="text-lg font-bold mb-4 text-gray-800">
                    {editingPostit ? 'Editar Post-it' : 'Novo Post-it'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700">
                        Descrição da Pendência *
                      </label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        required
                        placeholder="Descreva a pendência..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">
                          Responsável *
                        </label>
                        <input
                          type="text"
                          value={formData.responsavel}
                          onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          required
                          placeholder="Nome do responsável"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">
                          Prazo *
                        </label>
                        <input
                          type="date"
                          value={formData.prazo}
                          onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          required
                        />
                      </div>
                    </div>

                    {editingPostit && (
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    )}

                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                      >
                        {editingPostit ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Grid de Post-its */}
              {postits.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">Nenhum post-it criado ainda</p>
                  <p className="text-sm mt-2">Clique em "Adicionar Post-it" para criar o primeiro</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {postits.map((postit) => (
                    <div
                      key={postit.id}
                      className={`${getPostitColor(postit.status)} rounded-lg p-4 shadow-md border-2 transform hover:scale-105 transition relative`}
                      style={{ minHeight: '200px' }}
                    >
                      {/* Pin no topo */}
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow"></div>

                      {/* Conteúdo */}
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap break-words">
                          {postit.descricao}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs text-gray-700 mb-12">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-semibold">{postit.responsavel}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${isPrazoVencido(postit.prazo) && postit.status !== 'concluido' ? 'text-red-600 font-bold' : ''}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {new Date(postit.prazo).toLocaleDateString('pt-BR')}
                            {isPrazoVencido(postit.prazo) && postit.status !== 'concluido' && ' ⚠️ VENCIDO'}
                          </span>
                        </div>
                        <div>
                          <span className="inline-block px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-semibold">
                            {postit.status === 'pendente' && '🔴 Pendente'}
                            {postit.status === 'em_andamento' && '🟡 Em Andamento'}
                            {postit.status === 'concluido' && '🟢 Concluído'}
                          </span>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(postit)}
                          className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100 transition"
                          title="Editar"
                        >
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(postit.id)}
                          className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100 transition"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
