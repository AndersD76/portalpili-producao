'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ReclamacaoCliente,
  STATUS_RECLAMACAO,
  TIPOS_RECLAMACAO,
  IMPACTOS_RECLAMACAO,
  StatusReclamacao
} from '@/types/qualidade';

export default function DetalhesReclamacaoPage() {
  const router = useRouter();
  const params = useParams();
  const [reclamacao, setReclamacao] = useState<ReclamacaoCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<ReclamacaoCliente>>({});

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchReclamacao();
  }, [params.id]);

  const fetchReclamacao = async () => {
    try {
      const response = await fetch(`/api/qualidade/reclamacao-cliente/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setReclamacao(data.data);
        setEditData(data.data);
      } else {
        router.push('/qualidade/reclamacao-cliente');
      }
    } catch (error) {
      console.error('Erro ao buscar reclamação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/reclamacao-cliente/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      const result = await response.json();
      if (result.success) {
        setReclamacao(result.data);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: StatusReclamacao) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/reclamacao-cliente/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        setReclamacao(result.data);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleProcedencia = async (procedente: boolean) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/reclamacao-cliente/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedencia: procedente,
          status: 'EM_ANALISE'
        })
      });

      const result = await response.json();
      if (result.success) {
        setReclamacao(result.data);
      }
    } catch (error) {
      console.error('Erro ao definir procedência:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta reclamação? Esta ação não pode ser desfeita.')) return;

    try {
      const response = await fetch(`/api/qualidade/reclamacao-cliente/${params.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        router.push('/qualidade/reclamacao-cliente');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handlePrint = () => {
    if (!reclamacao) return;

    const tipoReclamacao = reclamacao.tipo_reclamacao
      ? TIPOS_RECLAMACAO[reclamacao.tipo_reclamacao as keyof typeof TIPOS_RECLAMACAO] || reclamacao.tipo_reclamacao
      : '-';
    const impacto = reclamacao.impacto
      ? IMPACTOS_RECLAMACAO[reclamacao.impacto as keyof typeof IMPACTOS_RECLAMACAO] || reclamacao.impacto
      : '-';
    const status = STATUS_RECLAMACAO[reclamacao.status as keyof typeof STATUS_RECLAMACAO] || reclamacao.status;
    const procedencia = reclamacao.procedencia === null ? 'Não definida' : (reclamacao.procedencia ? 'Procedente' : 'Improcedente');

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reclamação ${reclamacao.numero}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #ea580c;
          }
          .header h1 {
            color: #ea580c;
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header .numero {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          .header .subtitle {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          .status-row {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 10px;
          }
          .status-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 11px;
          }
          .status-aberta { background: #fee2e2; color: #991b1b; }
          .status-em_analise { background: #fef3c7; color: #92400e; }
          .status-respondida { background: #dbeafe; color: #1e40af; }
          .status-fechada { background: #d1fae5; color: #065f46; }
          .procedente { background: #fee2e2; color: #991b1b; }
          .improcedente { background: #f3f4f6; color: #374151; }
          .nao-definida { background: #f3f4f6; color: #6b7280; }
          .section {
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-title {
            background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
            color: white;
            padding: 10px 15px;
            font-size: 14px;
            font-weight: bold;
          }
          .section-content {
            padding: 15px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .grid-full {
            grid-column: span 2;
          }
          .field {
            margin-bottom: 10px;
          }
          .field-label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .field-value {
            font-size: 12px;
            color: #111827;
            font-weight: 500;
          }
          .text-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-top: 5px;
            white-space: pre-wrap;
          }
          .text-box.resposta {
            background: #eff6ff;
            border-color: #bfdbfe;
          }
          .text-box.acao {
            background: #ecfdf5;
            border-color: #a7f3d0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
          }
          @media print {
            body { padding: 10px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RECLAMACAO DE CLIENTE</h1>
          <div class="numero">${reclamacao.numero}</div>
          <div class="subtitle">Data: ${formatDate(reclamacao.data_reclamacao)}</div>
          <div class="status-row">
            <span class="status-badge status-${reclamacao.status.toLowerCase()}">${status}</span>
            <span class="status-badge ${reclamacao.procedencia === null ? 'nao-definida' : (reclamacao.procedencia ? 'procedente' : 'improcedente')}">${procedencia}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">INFORMACOES DO CLIENTE</div>
          <div class="section-content">
            <div class="grid">
              <div class="grid-full">
                <div class="field">
                  <div class="field-label">Nome do Cliente</div>
                  <div class="field-value">${reclamacao.cliente_nome}</div>
                </div>
              </div>
              <div>
                <div class="field">
                  <div class="field-label">Contato</div>
                  <div class="field-value">${reclamacao.cliente_contato || '-'}</div>
                </div>
              </div>
              <div>
                <div class="field">
                  <div class="field-label">E-mail</div>
                  <div class="field-value">${reclamacao.cliente_email || '-'}</div>
                </div>
              </div>
              <div>
                <div class="field">
                  <div class="field-label">Telefone</div>
                  <div class="field-value">${reclamacao.cliente_telefone || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">DETALHES DA RECLAMACAO</div>
          <div class="section-content">
            <div class="grid">
              <div>
                <div class="field">
                  <div class="field-label">Tipo de Reclamacao</div>
                  <div class="field-value">${tipoReclamacao}</div>
                </div>
              </div>
              <div>
                <div class="field">
                  <div class="field-label">Impacto</div>
                  <div class="field-value">${impacto}</div>
                </div>
              </div>
              <div>
                <div class="field">
                  <div class="field-label">OPD Relacionada</div>
                  <div class="field-value">${reclamacao.numero_opd || '-'}</div>
                </div>
              </div>
              ${reclamacao.numero_serie ? `
              <div>
                <div class="field">
                  <div class="field-label">Numero de Serie</div>
                  <div class="field-value">${reclamacao.numero_serie}</div>
                </div>
              </div>
              ` : ''}
            </div>
            <div class="field grid-full">
              <div class="field-label">Descricao da Reclamacao</div>
              <div class="text-box">${reclamacao.descricao}</div>
            </div>
            ${reclamacao.resposta_cliente ? `
            <div class="field grid-full">
              <div class="field-label">Resposta ao Cliente</div>
              <div class="text-box resposta">${reclamacao.resposta_cliente}</div>
            </div>
            ` : ''}
            ${reclamacao.acao_tomada ? `
            <div class="field grid-full">
              <div class="field-label">Acao Tomada</div>
              <div class="text-box acao">${reclamacao.acao_tomada}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - Portal Pili - Gestao da Qualidade</p>
          <p>Criado em: ${formatDateTime(reclamacao.created)} | Atualizado em: ${formatDateTime(reclamacao.updated)}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
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
      'RESPONDIDA': 'bg-blue-100 text-blue-800',
      'FECHADA': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_RECLAMACAO[status as keyof typeof STATUS_RECLAMACAO] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600"></div>
      </div>
    );
  }

  if (!reclamacao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Reclamação não encontrada</p>
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
                href="/qualidade/reclamacao-cliente"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{reclamacao.numero}</h1>
                <p className="text-sm text-gray-600">Reclamação de Cliente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(reclamacao.status)}
              {reclamacao.procedencia !== null && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${reclamacao.procedencia ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {reclamacao.procedencia ? 'Procedente' : 'Improcedente'}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Ações */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            {reclamacao.status !== 'FECHADA' && (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  {editMode ? 'Cancelar Edição' : 'Editar'}
                </button>
                {reclamacao.procedencia === null && (
                  <>
                    <button
                      onClick={() => handleProcedencia(true)}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50"
                    >
                      Marcar Procedente
                    </button>
                    <button
                      onClick={() => handleProcedencia(false)}
                      disabled={saving}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-50"
                    >
                      Marcar Improcedente
                    </button>
                  </>
                )}
                {reclamacao.status === 'EM_ANALISE' && (
                  <button
                    onClick={() => handleStatusChange('RESPONDIDA')}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    Marcar Respondida
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange('FECHADA')}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                >
                  Fechar
                </button>
              </>
            )}
            {!reclamacao.acao_corretiva_id && reclamacao.procedencia === true && (
              <Link
                href={`/qualidade/acao-corretiva/nova?origem_tipo=RECLAMACAO&origem_id=${reclamacao.id}&origem_descricao=${encodeURIComponent(reclamacao.numero + ' - ' + reclamacao.cliente_nome)}`}
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

        {/* Informações do Cliente */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Informações do Cliente</h2>
          {editMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={editData.cliente_nome || ''}
                  onChange={(e) => setEditData({ ...editData, cliente_nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                <input
                  type="text"
                  value={editData.cliente_contato || ''}
                  onChange={(e) => setEditData({ ...editData, cliente_contato: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={editData.cliente_email || ''}
                  onChange={(e) => setEditData({ ...editData, cliente_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editData.cliente_telefone || ''}
                  onChange={(e) => setEditData({ ...editData, cliente_telefone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-medium text-lg">{reclamacao.cliente_nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contato</p>
                <p className="font-medium">{reclamacao.cliente_contato || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="font-medium">{reclamacao.cliente_email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="font-medium">{reclamacao.cliente_telefone || '-'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Detalhes da Reclamação */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Detalhes da Reclamação</h2>
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={editData.data_reclamacao?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, data_reclamacao: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={editData.tipo_reclamacao || ''}
                    onChange={(e) => setEditData({ ...editData, tipo_reclamacao: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(TIPOS_RECLAMACAO).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
                  <select
                    value={editData.impacto || ''}
                    onChange={(e) => setEditData({ ...editData, impacto: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(IMPACTOS_RECLAMACAO).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OPD Relacionada</label>
                  <input
                    type="text"
                    value={editData.numero_opd || ''}
                    onChange={(e) => setEditData({ ...editData, numero_opd: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Resposta ao Cliente</label>
                <textarea
                  value={editData.resposta_cliente || ''}
                  onChange={(e) => setEditData({ ...editData, resposta_cliente: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ação Tomada</label>
                <textarea
                  value={editData.acao_tomada || ''}
                  onChange={(e) => setEditData({ ...editData, acao_tomada: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Data da Reclamação</p>
                  <p className="font-medium">{formatDate(reclamacao.data_reclamacao)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{reclamacao.tipo_reclamacao ? TIPOS_RECLAMACAO[reclamacao.tipo_reclamacao as keyof typeof TIPOS_RECLAMACAO] || reclamacao.tipo_reclamacao : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Impacto</p>
                  <p className="font-medium">{reclamacao.impacto ? IMPACTOS_RECLAMACAO[reclamacao.impacto as keyof typeof IMPACTOS_RECLAMACAO] || reclamacao.impacto : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">OPD Relacionada</p>
                  <p className="font-medium">{reclamacao.numero_opd || '-'}</p>
                </div>
                {reclamacao.numero_serie && (
                  <div>
                    <p className="text-sm text-gray-500">Número de Série</p>
                    <p className="font-medium">{reclamacao.numero_serie}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Descrição</p>
                <p className="bg-gray-50 p-3 rounded-lg">{reclamacao.descricao}</p>
              </div>

              {reclamacao.resposta_cliente && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Resposta ao Cliente</p>
                  <p className="bg-blue-50 p-3 rounded-lg">{reclamacao.resposta_cliente}</p>
                </div>
              )}

              {reclamacao.acao_tomada && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ação Tomada</p>
                  <p className="bg-green-50 p-3 rounded-lg">{reclamacao.acao_tomada}</p>
                </div>
              )}

              {reclamacao.acao_corretiva_id && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 font-medium">
                    RAC vinculada:
                    <Link href={`/qualidade/acao-corretiva/${reclamacao.acao_corretiva_id}`} className="ml-2 underline">
                      Ver Ação Corretiva
                    </Link>
                  </p>
                </div>
              )}

              <div className="pt-4 border-t text-sm text-gray-500">
                <p>Criado em: {formatDateTime(reclamacao.created)}</p>
                <p>Atualizado em: {formatDateTime(reclamacao.updated)}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
