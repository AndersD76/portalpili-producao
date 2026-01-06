'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  NaoConformidade,
  STATUS_NAO_CONFORMIDADE,
  TIPOS_NAO_CONFORMIDADE,
  ORIGENS_NAO_CONFORMIDADE,
  GRAVIDADES_NAO_CONFORMIDADE,
  DISPOSICOES_NAO_CONFORMIDADE,
  StatusNaoConformidade
} from '@/types/qualidade';

export default function DetalhesNCPage() {
  const router = useRouter();
  const params = useParams();
  const [nc, setNc] = useState<NaoConformidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<NaoConformidade>>({});

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchNC();
  }, [params.id]);

  const fetchNC = async () => {
    try {
      const response = await fetch(`/api/qualidade/nao-conformidade/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setNc(data.data);
        setEditData(data.data);
      } else {
        router.push('/qualidade/nao-conformidade');
      }
    } catch (error) {
      console.error('Erro ao buscar NC:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/nao-conformidade/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      const result = await response.json();
      if (result.success) {
        setNc(result.data);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: StatusNaoConformidade) => {
    setSaving(true);
    try {
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const updateData: any = { status: newStatus };
      if (newStatus === 'FECHADA') {
        updateData.closed_by = user?.id || null;
        updateData.closed_at = new Date().toISOString();
      }

      const response = await fetch(`/api/qualidade/nao-conformidade/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      if (result.success) {
        setNc(result.data);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta NC? Esta ação não pode ser desfeita.')) return;

    try {
      const response = await fetch(`/api/qualidade/nao-conformidade/${params.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        router.push('/qualidade/nao-conformidade');
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
      'EM_ANALISE': 'bg-yellow-100 text-yellow-800',
      'PENDENTE_ACAO': 'bg-orange-100 text-orange-800',
      'FECHADA': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_NAO_CONFORMIDADE[status as keyof typeof STATUS_NAO_CONFORMIDADE] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  if (!nc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">NC não encontrada</p>
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
                href="/qualidade/nao-conformidade"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{nc.numero}</h1>
                <p className="text-sm text-gray-600">Não Conformidade</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(nc.status)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Ações */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            {nc.status !== 'FECHADA' && (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  {editMode ? 'Cancelar Edição' : 'Editar'}
                </button>
                {nc.status === 'ABERTA' && (
                  <button
                    onClick={() => handleStatusChange('EM_ANALISE')}
                    disabled={saving}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm disabled:opacity-50"
                  >
                    Iniciar Análise
                  </button>
                )}
                {nc.status === 'EM_ANALISE' && (
                  <button
                    onClick={() => handleStatusChange('PENDENTE_ACAO')}
                    disabled={saving}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm disabled:opacity-50"
                  >
                    Pendente Ação
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange('FECHADA')}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                >
                  Fechar NC
                </button>
              </>
            )}
            {!nc.acao_corretiva_id && nc.status !== 'FECHADA' && (
              <Link
                href={`/qualidade/acao-corretiva/nova?origem_tipo=NAO_CONFORMIDADE&origem_id=${nc.id}&origem_descricao=${encodeURIComponent(nc.numero + ' - ' + nc.descricao.substring(0, 50))}`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
              >
                Criar RAC
              </Link>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm ml-auto"
            >
              Excluir
            </button>
          </div>
        </div>

        {/* Detalhes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {editMode ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Ocorrência</label>
                  <input
                    type="date"
                    value={editData.data_ocorrencia?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, data_ocorrencia: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <input
                    type="text"
                    value={editData.local_ocorrencia || ''}
                    onChange={(e) => setEditData({ ...editData, local_ocorrencia: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={editData.tipo || ''}
                    onChange={(e) => setEditData({ ...editData, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {Object.entries(TIPOS_NAO_CONFORMIDADE).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
                  <select
                    value={editData.gravidade || ''}
                    onChange={(e) => setEditData({ ...editData, gravidade: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(GRAVIDADES_NAO_CONFORMIDADE).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={editData.descricao || ''}
                  onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ação de Contenção</label>
                <textarea
                  value={editData.acao_contencao || ''}
                  onChange={(e) => setEditData({ ...editData, acao_contencao: e.target.value })}
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Data da Ocorrência</p>
                  <p className="font-medium">{formatDate(nc.data_ocorrencia)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Local</p>
                  <p className="font-medium">{nc.local_ocorrencia || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{TIPOS_NAO_CONFORMIDADE[nc.tipo] || nc.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Origem</p>
                  <p className="font-medium">{nc.origem ? ORIGENS_NAO_CONFORMIDADE[nc.origem] : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gravidade</p>
                  <p className="font-medium">{nc.gravidade ? GRAVIDADES_NAO_CONFORMIDADE[nc.gravidade] : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Setor Responsável</p>
                  <p className="font-medium">{nc.setor_responsavel || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Detectado Por</p>
                  <p className="font-medium">{nc.detectado_por || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Produtos Afetados</p>
                  <p className="font-medium">{nc.produtos_afetados || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Descrição</p>
                <p className="bg-gray-50 p-3 rounded-lg">{nc.descricao}</p>
              </div>

              {nc.disposicao && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Disposição</p>
                    <p className="font-medium">{DISPOSICOES_NAO_CONFORMIDADE[nc.disposicao]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Responsável Contenção</p>
                    <p className="font-medium">{nc.responsavel_contencao || '-'}</p>
                  </div>
                </div>
              )}

              {nc.acao_contencao && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ação de Contenção</p>
                  <p className="bg-gray-50 p-3 rounded-lg">{nc.acao_contencao}</p>
                </div>
              )}

              {nc.acao_corretiva_id && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 font-medium">
                    RAC vinculada:
                    <Link href={`/qualidade/acao-corretiva/${nc.acao_corretiva_id}`} className="ml-2 underline">
                      Ver Ação Corretiva
                    </Link>
                  </p>
                </div>
              )}

              <div className="pt-4 border-t text-sm text-gray-500">
                <p>Criado em: {formatDateTime(nc.created)}</p>
                <p>Atualizado em: {formatDateTime(nc.updated)}</p>
                {nc.closed_at && <p>Fechado em: {formatDateTime(nc.closed_at)}</p>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
