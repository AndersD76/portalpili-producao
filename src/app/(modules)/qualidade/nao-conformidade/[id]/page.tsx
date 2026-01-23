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

  const handlePrint = () => {
    if (!nc) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Registro de Não Conformidade - ${nc.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .info-item { margin-bottom: 10px; }
          .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 14px; color: #333; margin-top: 3px; }
          .description { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-ABERTA { background: #fee2e2; color: #991b1b; }
          .status-EM_ANALISE { background: #fef3c7; color: #92400e; }
          .status-PENDENTE_ACAO { background: #ffedd5; color: #9a3412; }
          .status-FECHADA { background: #dcfce7; color: #166534; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Registro de Não Conformidade</h1>
          <span class="status-badge status-${nc.status}">${STATUS_NAO_CONFORMIDADE[nc.status as keyof typeof STATUS_NAO_CONFORMIDADE] || nc.status}</span>
        </div>

        <h2>Identificação</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="label">Número</div>
            <div class="value">${nc.numero}</div>
          </div>
          <div class="info-item">
            <div class="label">Data da Ocorrência</div>
            <div class="value">${formatDate(nc.data_ocorrencia)}</div>
          </div>
          <div class="info-item">
            <div class="label">Local</div>
            <div class="value">${nc.local_ocorrencia || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Tipo</div>
            <div class="value">${TIPOS_NAO_CONFORMIDADE[nc.tipo] || nc.tipo}</div>
          </div>
          <div class="info-item">
            <div class="label">Origem</div>
            <div class="value">${nc.origem ? ORIGENS_NAO_CONFORMIDADE[nc.origem as keyof typeof ORIGENS_NAO_CONFORMIDADE] || nc.origem : '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Gravidade</div>
            <div class="value">${nc.gravidade ? GRAVIDADES_NAO_CONFORMIDADE[nc.gravidade] : '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Setor Responsável</div>
            <div class="value">${nc.setor_responsavel || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Detectado Por</div>
            <div class="value">${nc.detectado_por || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Produtos Afetados</div>
            <div class="value">${nc.produtos_afetados || '-'}</div>
          </div>
        </div>

        <h2>Descrição da Não Conformidade</h2>
        <div class="description">${nc.descricao}</div>

        ${nc.disposicao ? `
        <h2>Disposição</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="label">Disposição</div>
            <div class="value">${DISPOSICOES_NAO_CONFORMIDADE[nc.disposicao]}</div>
          </div>
          <div class="info-item">
            <div class="label">Responsável Contenção</div>
            <div class="value">${nc.responsavel_contencao || '-'}</div>
          </div>
        </div>
        ` : ''}

        ${nc.acao_contencao ? `
        <h2>Ação de Contenção</h2>
        <div class="description">${nc.acao_contencao}</div>
        ` : ''}

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - Portal Pili</p>
          <p>Criado em: ${formatDateTime(nc.created)} | Atualizado em: ${formatDateTime(nc.updated)}${nc.closed_at ? ` | Fechado em: ${formatDateTime(nc.closed_at)}` : ''}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null | undefined) => {
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
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
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
                  <p className="font-medium">{nc.origem ? ORIGENS_NAO_CONFORMIDADE[nc.origem as keyof typeof ORIGENS_NAO_CONFORMIDADE] || nc.origem : '-'}</p>
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
