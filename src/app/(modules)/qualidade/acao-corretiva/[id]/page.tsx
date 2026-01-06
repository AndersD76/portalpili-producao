'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AcaoCorretiva,
  STATUS_ACAO_CORRETIVA,
  ORIGENS_ACAO_CORRETIVA,
  METODOS_ANALISE,
  STATUS_ITEM_ACAO,
  StatusAcaoCorretiva,
  ItemAcao
} from '@/types/qualidade';

export default function DetalhesAcaoCorretivaPage() {
  const router = useRouter();
  const params = useParams();
  const [acao, setAcao] = useState<AcaoCorretiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<AcaoCorretiva>>({});
  const [showAddAcao, setShowAddAcao] = useState(false);
  const [novaAcaoItem, setNovaAcaoItem] = useState({
    descricao: '',
    responsavel: '',
    prazo: ''
  });

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchAcao();
  }, [params.id]);

  const fetchAcao = async () => {
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`);
      const data = await response.json();
      if (data.success) {
        // Parse acoes JSON if it's a string
        const acaoData = data.data;
        if (typeof acaoData.acoes === 'string') {
          acaoData.acoes = JSON.parse(acaoData.acoes);
        }
        if (typeof acaoData.equipe === 'string') {
          acaoData.equipe = JSON.parse(acaoData.equipe);
        }
        setAcao(acaoData);
        setEditData(acaoData);
      } else {
        router.push('/qualidade/acao-corretiva');
      }
    } catch (error) {
      console.error('Erro ao buscar ação corretiva:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      const result = await response.json();
      if (result.success) {
        // Parse acoes if string
        const acaoData = result.data;
        if (typeof acaoData.acoes === 'string') {
          acaoData.acoes = JSON.parse(acaoData.acoes);
        }
        if (typeof acaoData.equipe === 'string') {
          acaoData.equipe = JSON.parse(acaoData.equipe);
        }
        setAcao(acaoData);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: StatusAcaoCorretiva) => {
    setSaving(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'FECHADA') {
        updateData.data_conclusao = new Date().toISOString();
      }

      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      if (result.success) {
        const acaoData = result.data;
        if (typeof acaoData.acoes === 'string') {
          acaoData.acoes = JSON.parse(acaoData.acoes);
        }
        if (typeof acaoData.equipe === 'string') {
          acaoData.equipe = JSON.parse(acaoData.equipe);
        }
        setAcao(acaoData);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAcaoItem = async () => {
    if (!novaAcaoItem.descricao || !novaAcaoItem.responsavel) return;

    const newItem: ItemAcao = {
      id: Date.now().toString(),
      descricao: novaAcaoItem.descricao,
      responsavel: novaAcaoItem.responsavel,
      prazo: novaAcaoItem.prazo,
      status: 'PENDENTE',
      data_conclusao: null,
      evidencia: null,
      observacoes: null
    };

    const currentAcoes = acao?.acoes || [];
    const updatedAcoes = [...currentAcoes, newItem];

    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acoes: updatedAcoes })
      });

      const result = await response.json();
      if (result.success) {
        const acaoData = result.data;
        if (typeof acaoData.acoes === 'string') {
          acaoData.acoes = JSON.parse(acaoData.acoes);
        }
        if (typeof acaoData.equipe === 'string') {
          acaoData.equipe = JSON.parse(acaoData.equipe);
        }
        setAcao(acaoData);
        setNovaAcaoItem({ descricao: '', responsavel: '', prazo: '' });
        setShowAddAcao(false);
      }
    } catch (error) {
      console.error('Erro ao adicionar ação:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAcaoItemStatus = async (itemId: string, newStatus: string) => {
    if (!acao?.acoes) return;

    const updatedAcoes = acao.acoes.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: newStatus,
          data_conclusao: newStatus === 'CONCLUIDA' ? new Date().toISOString() : null
        };
      }
      return item;
    });

    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acoes: updatedAcoes })
      });

      const result = await response.json();
      if (result.success) {
        const acaoData = result.data;
        if (typeof acaoData.acoes === 'string') {
          acaoData.acoes = JSON.parse(acaoData.acoes);
        }
        if (typeof acaoData.equipe === 'string') {
          acaoData.equipe = JSON.parse(acaoData.equipe);
        }
        setAcao(acaoData);
      }
    } catch (error) {
      console.error('Erro ao atualizar ação:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta RAC? Esta ação não pode ser desfeita.')) return;

    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        router.push('/qualidade/acao-corretiva');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
      'AGUARDANDO_VERIFICACAO': 'bg-yellow-100 text-yellow-800',
      'FECHADA': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_ACAO_CORRETIVA[status as keyof typeof STATUS_ACAO_CORRETIVA] || status}
      </span>
    );
  };

  const getItemStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'PENDENTE': 'bg-gray-100 text-gray-800',
      'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
      'CONCLUIDA': 'bg-green-100 text-green-800',
      'CANCELADA': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_ITEM_ACAO[status as keyof typeof STATUS_ITEM_ACAO] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!acao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">RAC não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/qualidade/acao-corretiva"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{acao.numero}</h1>
                <p className="text-sm text-gray-600">Ação Corretiva</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(acao.status)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Ações */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            {acao.status !== 'FECHADA' && (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  {editMode ? 'Cancelar Edição' : 'Editar'}
                </button>
                {acao.status === 'ABERTA' && (
                  <button
                    onClick={() => handleStatusChange('EM_ANDAMENTO')}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    Iniciar Tratamento
                  </button>
                )}
                {acao.status === 'EM_ANDAMENTO' && (
                  <button
                    onClick={() => handleStatusChange('AGUARDANDO_VERIFICACAO')}
                    disabled={saving}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm disabled:opacity-50"
                  >
                    Aguardar Verificação
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange('FECHADA')}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                >
                  Fechar RAC
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm ml-auto"
            >
              Excluir
            </button>
          </div>
        </div>

        {/* Informações Gerais */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Informações Gerais</h2>
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Abertura</label>
                  <input
                    type="date"
                    value={editData.data_abertura?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, data_abertura: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Conclusão</label>
                  <input
                    type="date"
                    value={editData.prazo_conclusao?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, prazo_conclusao: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável Principal</label>
                  <input
                    type="text"
                    value={editData.responsavel_principal || ''}
                    onChange={(e) => setEditData({ ...editData, responsavel_principal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Análise</label>
                  <select
                    value={editData.metodo_analise || ''}
                    onChange={(e) => setEditData({ ...editData, metodo_analise: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(METODOS_ANALISE).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Problema</label>
                <textarea
                  value={editData.descricao_problema || ''}
                  onChange={(e) => setEditData({ ...editData, descricao_problema: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Análise de Causa Raiz</label>
                <textarea
                  value={editData.analise_causa_raiz || ''}
                  onChange={(e) => setEditData({ ...editData, analise_causa_raiz: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Causa Raiz Identificada</label>
                <textarea
                  value={editData.causa_raiz_identificada || ''}
                  onChange={(e) => setEditData({ ...editData, causa_raiz_identificada: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Data de Abertura</p>
                  <p className="font-medium">{formatDate(acao.data_abertura)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prazo de Conclusão</p>
                  <p className="font-medium">{formatDate(acao.prazo_conclusao)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Origem</p>
                  <p className="font-medium">{ORIGENS_ACAO_CORRETIVA[acao.origem_tipo] || acao.origem_tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Responsável Principal</p>
                  <p className="font-medium">{acao.responsavel_principal || '-'}</p>
                </div>
                {acao.metodo_analise && (
                  <div>
                    <p className="text-sm text-gray-500">Método de Análise</p>
                    <p className="font-medium">{METODOS_ANALISE[acao.metodo_analise]}</p>
                  </div>
                )}
                {acao.equipe && acao.equipe.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Equipe</p>
                    <p className="font-medium">{acao.equipe.join(', ')}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Descrição do Problema</p>
                <p className="bg-gray-50 p-3 rounded-lg">{acao.descricao_problema}</p>
              </div>

              {acao.analise_causa_raiz && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Análise de Causa Raiz</p>
                  <p className="bg-yellow-50 p-3 rounded-lg">{acao.analise_causa_raiz}</p>
                </div>
              )}

              {acao.causa_raiz_identificada && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Causa Raiz Identificada</p>
                  <p className="bg-red-50 p-3 rounded-lg font-medium">{acao.causa_raiz_identificada}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações Corretivas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Plano de Ações</h2>
            {acao.status !== 'FECHADA' && (
              <button
                onClick={() => setShowAddAcao(!showAddAcao)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                + Adicionar Ação
              </button>
            )}
          </div>

          {showAddAcao && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Ação *</label>
                <input
                  type="text"
                  value={novaAcaoItem.descricao}
                  onChange={(e) => setNovaAcaoItem({ ...novaAcaoItem, descricao: e.target.value })}
                  placeholder="O que precisa ser feito?"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável *</label>
                  <input
                    type="text"
                    value={novaAcaoItem.responsavel}
                    onChange={(e) => setNovaAcaoItem({ ...novaAcaoItem, responsavel: e.target.value })}
                    placeholder="Quem vai fazer?"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                  <input
                    type="date"
                    value={novaAcaoItem.prazo}
                    onChange={(e) => setNovaAcaoItem({ ...novaAcaoItem, prazo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddAcaoItem}
                  disabled={saving || !novaAcaoItem.descricao || !novaAcaoItem.responsavel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setShowAddAcao(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {acao.acoes && acao.acoes.length > 0 ? (
            <div className="space-y-3">
              {acao.acoes.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{index + 1}. {item.descricao}</p>
                      <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4">
                        <span>Responsável: {item.responsavel}</span>
                        {item.prazo && <span>Prazo: {formatDate(item.prazo)}</span>}
                        {item.data_conclusao && <span>Concluída em: {formatDate(item.data_conclusao)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getItemStatusBadge(item.status)}
                      {acao.status !== 'FECHADA' && item.status !== 'CONCLUIDA' && (
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateAcaoItemStatus(item.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="EM_ANDAMENTO">Em Andamento</option>
                          <option value="CONCLUIDA">Concluída</option>
                          <option value="CANCELADA">Cancelada</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhuma ação cadastrada ainda</p>
          )}
        </div>

        {/* Verificação de Eficácia */}
        {(acao.status === 'AGUARDANDO_VERIFICACAO' || acao.status === 'FECHADA') && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Verificação de Eficácia</h2>
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verificação de Eficácia</label>
                  <textarea
                    value={editData.verificacao_eficacia || ''}
                    onChange={(e) => setEditData({ ...editData, verificacao_eficacia: e.target.value })}
                    rows={3}
                    placeholder="Descreva como foi verificada a eficácia das ações..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data da Verificação</label>
                    <input
                      type="date"
                      value={editData.data_verificacao?.split('T')[0] || ''}
                      onChange={(e) => setEditData({ ...editData, data_verificacao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ação foi Eficaz?</label>
                    <select
                      value={editData.acao_eficaz === null ? '' : editData.acao_eficaz ? 'sim' : 'nao'}
                      onChange={(e) => setEditData({ ...editData, acao_eficaz: e.target.value === '' ? null : e.target.value === 'sim' })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {acao.verificacao_eficacia ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Verificação</p>
                      <p className="bg-gray-50 p-3 rounded-lg">{acao.verificacao_eficacia}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Data da Verificação</p>
                        <p className="font-medium">{formatDate(acao.data_verificacao)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Ação Eficaz?</p>
                        <p className={`font-medium ${acao.acao_eficaz ? 'text-green-600' : acao.acao_eficaz === false ? 'text-red-600' : ''}`}>
                          {acao.acao_eficaz === null ? '-' : acao.acao_eficaz ? 'Sim' : 'Não'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-4">Aguardando verificação de eficácia</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Informações do Sistema */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="pt-4 border-t text-sm text-gray-500">
            <p>Criado em: {formatDateTime(acao.created)}</p>
            <p>Atualizado em: {formatDateTime(acao.updated)}</p>
            {acao.data_conclusao && <p>Concluído em: {formatDateTime(acao.data_conclusao)}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
