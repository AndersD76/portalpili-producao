'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AcaoCorretiva,
  Anexo,
  STATUS_ACAO_CORRETIVA,
  PROCESSOS_ORIGEM,
  STATUS_ACOES_AC,
  ACOES_FINALIZADAS_AC,
  SITUACAO_FINAL_AC,
  StatusAcaoCorretiva,
  ProcessoOrigem,
  StatusAcoesAC,
  AcoesFinalizadasAC,
  SituacaoFinalAC
} from '@/types/qualidade';

export default function DetalhesAcaoCorretivaPage() {
  const router = useRouter();
  const params = useParams();
  const [acao, setAcao] = useState<AcaoCorretiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<AcaoCorretiva>>({});
  const [uploadingEvidencias, setUploadingEvidencias] = useState(false);
  const fileInputEvidenciasRef = useRef<HTMLInputElement>(null);

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
        const acaoData = data.data;
        // Parse JSON fields if they're strings
        if (typeof acaoData.processos_envolvidos === 'string') {
          acaoData.processos_envolvidos = JSON.parse(acaoData.processos_envolvidos);
        }
        if (typeof acaoData.registro_nc_anexos === 'string') {
          acaoData.registro_nc_anexos = JSON.parse(acaoData.registro_nc_anexos);
        }
        if (typeof acaoData.evidencias_anexos === 'string') {
          acaoData.evidencias_anexos = JSON.parse(acaoData.evidencias_anexos);
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

  const handleFileUploadEvidencias = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingEvidencias(true);
    try {
      const uploadedFiles: Anexo[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('tipo', 'acao_corretiva_evidencias');

        const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({ filename: result.filename, url: result.url, size: file.size });
        }
      }
      const currentEvidencias = editData.evidencias_anexos || [];
      setEditData({ ...editData, evidencias_anexos: [...currentEvidencias, ...uploadedFiles] });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadingEvidencias(false);
      if (fileInputEvidenciasRef.current) fileInputEvidenciasRef.current.value = '';
    }
  };

  const removeEvidencia = (index: number) => {
    const currentEvidencias = editData.evidencias_anexos || [];
    setEditData({ ...editData, evidencias_anexos: currentEvidencias.filter((_, i) => i !== index) });
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
        const acaoData = result.data;
        if (typeof acaoData.processos_envolvidos === 'string') {
          acaoData.processos_envolvidos = JSON.parse(acaoData.processos_envolvidos);
        }
        if (typeof acaoData.registro_nc_anexos === 'string') {
          acaoData.registro_nc_anexos = JSON.parse(acaoData.registro_nc_anexos);
        }
        if (typeof acaoData.evidencias_anexos === 'string') {
          acaoData.evidencias_anexos = JSON.parse(acaoData.evidencias_anexos);
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
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        const acaoData = result.data;
        if (typeof acaoData.processos_envolvidos === 'string') {
          acaoData.processos_envolvidos = JSON.parse(acaoData.processos_envolvidos);
        }
        if (typeof acaoData.registro_nc_anexos === 'string') {
          acaoData.registro_nc_anexos = JSON.parse(acaoData.registro_nc_anexos);
        }
        if (typeof acaoData.evidencias_anexos === 'string') {
          acaoData.evidencias_anexos = JSON.parse(acaoData.evidencias_anexos);
        }
        setAcao(acaoData);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
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

  const handlePrint = () => {
    if (!acao) return;

    const formatDatePrint = (dateString: string | null | undefined) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusLabel = (status: string) => {
      return STATUS_ACAO_CORRETIVA[status as keyof typeof STATUS_ACAO_CORRETIVA] || status;
    };

    const getProcessosLabel = () => {
      if (!acao.processos_envolvidos || acao.processos_envolvidos.length === 0) return '-';
      return acao.processos_envolvidos
        .map(p => PROCESSOS_ORIGEM[p] || p)
        .join(', ');
    };

    const getStatusAcoesLabel = () => {
      if (!acao.status_acoes) return '-';
      return STATUS_ACOES_AC[acao.status_acoes as keyof typeof STATUS_ACOES_AC] || acao.status_acoes;
    };

    const getAcoesFinalizadasLabel = () => {
      if (!acao.acoes_finalizadas) return '-';
      return ACOES_FINALIZADAS_AC[acao.acoes_finalizadas as keyof typeof ACOES_FINALIZADAS_AC] || acao.acoes_finalizadas;
    };

    const getSituacaoFinalLabel = () => {
      if (!acao.situacao_final) return '-';
      return SITUACAO_FINAL_AC[acao.situacao_final as keyof typeof SITUACAO_FINAL_AC] || acao.situacao_final;
    };

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RAC - ${acao.numero}</title>
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
            border-bottom: 3px solid #1e40af;
          }
          .header h1 {
            color: #1e40af;
            font-size: 22px;
            margin-bottom: 5px;
          }
          .header .subtitle {
            color: #64748b;
            font-size: 11px;
          }
          .header .rac-number {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 8px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: bold;
            margin-top: 8px;
          }
          .status-ABERTA { background-color: #fee2e2; color: #991b1b; }
          .status-EM_ANDAMENTO { background-color: #dbeafe; color: #1e40af; }
          .status-AGUARDANDO_VERIFICACAO { background-color: #fef3c7; color: #92400e; }
          .status-FECHADA { background-color: #dcfce7; color: #166534; }
          .section {
            margin-bottom: 18px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-header {
            background-color: #1e40af;
            color: white;
            padding: 8px 15px;
            font-weight: bold;
            font-size: 13px;
          }
          .section-content {
            padding: 15px;
            background-color: #f8fafc;
          }
          .field-row {
            display: flex;
            margin-bottom: 10px;
          }
          .field-row:last-child {
            margin-bottom: 0;
          }
          .field {
            flex: 1;
            padding-right: 15px;
          }
          .field-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
            font-weight: bold;
          }
          .field-value {
            font-size: 12px;
            color: #1e293b;
          }
          .text-block {
            background-color: white;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #e2e8f0;
            white-space: pre-wrap;
          }
          .text-block.falha { border-left: 4px solid #ef4444; }
          .text-block.causas { border-left: 4px solid #f59e0b; }
          .text-block.subcausas { border-left: 4px solid #f97316; }
          .text-block.acoes { border-left: 4px solid #3b82f6; }
          .processos-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
          }
          .processo-tag {
            background-color: #e2e8f0;
            color: #475569;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
          }
          .eficacia-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          .eficacia-EFICAZ { background-color: #dcfce7; color: #166534; }
          .eficacia-PARCIALMENTE_EFICAZ { background-color: #fef3c7; color: #92400e; }
          .eficacia-NAO_EFICAZ { background-color: #fee2e2; color: #991b1b; }
          .footer {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
          @media print {
            body { padding: 10px; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REGISTRO DE ACAO CORRETIVA</h1>
          <div class="subtitle">No 57-3 - REV. 01</div>
          <div class="rac-number">${acao.numero}</div>
          <span class="status-badge status-${acao.status}">${getStatusLabel(acao.status)}</span>
        </div>

        <div class="section">
          <div class="section-header">IDENTIFICACAO</div>
          <div class="section-content">
            <div class="field-row">
              <div class="field">
                <div class="field-label">E-mail</div>
                <div class="field-value">${acao.email || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Data de Emissao</div>
                <div class="field-value">${formatDatePrint(acao.data_emissao)}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <div class="field-label">Emitente</div>
                <div class="field-value">${acao.emitente || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">NC Relacionada</div>
                <div class="field-value">${acao.numero_nc_relacionada || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">ANALISE DAS CAUSAS</div>
          <div class="section-content">
            <div class="field-row">
              <div class="field" style="flex: 1; padding-right: 0;">
                <div class="field-label">Processos Envolvidos</div>
                <div class="field-value">${getProcessosLabel()}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field" style="flex: 1; padding-right: 0;">
                <div class="field-label">Falha</div>
                <div class="text-block falha">${acao.falha || '-'}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field" style="flex: 1; padding-right: 0;">
                <div class="field-label">Causas</div>
                <div class="text-block causas">${acao.causas || '-'}</div>
              </div>
            </div>
            ${acao.subcausas ? `
            <div class="field-row">
              <div class="field" style="flex: 1; padding-right: 0;">
                <div class="field-label">Subcausas</div>
                <div class="text-block subcausas">${acao.subcausas}</div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">ACOES PARA ELIMINAR AS CAUSAS</div>
          <div class="section-content">
            <div class="field-row">
              <div class="field" style="flex: 1; padding-right: 0;">
                <div class="field-label">Acoes</div>
                <div class="text-block acoes">${acao.acoes || '-'}</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <div class="field-label">Responsaveis</div>
                <div class="field-value">${acao.responsaveis || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Prazo</div>
                <div class="field-value">${formatDatePrint(acao.prazo)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">CONDICOES DAS ACOES</div>
          <div class="section-content">
            <div class="field-row">
              <div class="field">
                <div class="field-label">Status das Acoes</div>
                <div class="field-value">${getStatusAcoesLabel()}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">ANALISE DA EFICACIA</div>
          <div class="section-content">
            <div class="field-row">
              <div class="field">
                <div class="field-label">Acoes Finalizadas?</div>
                <div class="field-value">${getAcoesFinalizadasLabel()}</div>
              </div>
              <div class="field">
                <div class="field-label">Situacao Final</div>
                <div class="field-value">
                  ${acao.situacao_final ? `<span class="eficacia-badge eficacia-${acao.situacao_final}">${getSituacaoFinalLabel()}</span>` : '-'}
                </div>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <div class="field-label">Responsavel pela Analise</div>
                <div class="field-value">${acao.responsavel_analise || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Data da Analise</div>
                <div class="field-value">${formatDatePrint(acao.data_analise)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} | Portal Pili - Sistema de Gestao da Qualidade</p>
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

  const handleProcessoChange = (processo: ProcessoOrigem) => {
    const processos = editData.processos_envolvidos || [];
    const newProcessos = processos.includes(processo)
      ? processos.filter(p => p !== processo)
      : [...processos, processo];
    setEditData({ ...editData, processos_envolvidos: newProcessos });
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

  const getStatusAcoesBadge = (status: string | null | undefined) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
      'FINALIZADAS': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_ACOES_AC[status as keyof typeof STATUS_ACOES_AC] || status}
      </span>
    );
  };

  const getSituacaoFinalBadge = (situacao: string | null | undefined) => {
    if (!situacao) return null;
    const colors: Record<string, string> = {
      'EFICAZ': 'bg-green-100 text-green-800',
      'PARCIALMENTE_EFICAZ': 'bg-yellow-100 text-yellow-800',
      'NAO_EFICAZ': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[situacao] || 'bg-gray-100'}`}>
        {SITUACAO_FINAL_AC[situacao as keyof typeof SITUACAO_FINAL_AC] || situacao}
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
                <p className="text-sm text-gray-600">Nº 57-3 - REV. 01</p>
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

        {/* IDENTIFICAÇÃO */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">IDENTIFICAÇÃO</h2>
          {editMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão</label>
                <input
                  type="date"
                  value={editData.data_emissao?.split('T')[0] || ''}
                  onChange={(e) => setEditData({ ...editData, data_emissao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Emitente</label>
                <input
                  type="text"
                  value={editData.emitente || ''}
                  onChange={(e) => setEditData({ ...editData, emitente: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número NC Relacionada</label>
                <input
                  type="text"
                  value={editData.numero_nc_relacionada || ''}
                  onChange={(e) => setEditData({ ...editData, numero_nc_relacionada: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="font-medium">{acao.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de Emissão</p>
                <p className="font-medium">{formatDate(acao.data_emissao)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Emitente</p>
                <p className="font-medium">{acao.emitente || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">NC Relacionada</p>
                <p className="font-medium">{acao.numero_nc_relacionada || '-'}</p>
              </div>
              {acao.registro_nc_anexos && acao.registro_nc_anexos.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-500 mb-2">Anexos da NC</p>
                  <div className="flex flex-wrap gap-2">
                    {acao.registro_nc_anexos.map((anexo, index) => (
                      <a
                        key={index}
                        href={anexo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"
                      >
                        {anexo.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ANÁLISE DAS CAUSAS */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ANÁLISE DAS CAUSAS</h2>
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Processos Envolvidos</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(PROCESSOS_ORIGEM).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(editData.processos_envolvidos || []).includes(key as ProcessoOrigem)}
                        onChange={() => handleProcessoChange(key as ProcessoOrigem)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Falha</label>
                <textarea
                  value={editData.falha || ''}
                  onChange={(e) => setEditData({ ...editData, falha: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Causas</label>
                <textarea
                  value={editData.causas || ''}
                  onChange={(e) => setEditData({ ...editData, causas: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcausas</label>
                <textarea
                  value={editData.subcausas || ''}
                  onChange={(e) => setEditData({ ...editData, subcausas: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {acao.processos_envolvidos && acao.processos_envolvidos.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Processos Envolvidos</p>
                  <div className="flex flex-wrap gap-2">
                    {acao.processos_envolvidos.map((processo) => (
                      <span key={processo} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {PROCESSOS_ORIGEM[processo] || processo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Falha</p>
                <p className="bg-red-50 p-3 rounded-lg">{acao.falha || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Causas</p>
                <p className="bg-yellow-50 p-3 rounded-lg">{acao.causas || '-'}</p>
              </div>
              {acao.subcausas && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Subcausas</p>
                  <p className="bg-orange-50 p-3 rounded-lg">{acao.subcausas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AÇÕES PARA ELIMINAR AS CAUSAS */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">AÇÕES PARA ELIMINAR AS CAUSAS</h2>
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ações</label>
                <textarea
                  value={editData.acoes || ''}
                  onChange={(e) => setEditData({ ...editData, acoes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis</label>
                  <input
                    type="text"
                    value={editData.responsaveis || ''}
                    onChange={(e) => setEditData({ ...editData, responsaveis: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                  <input
                    type="date"
                    value={editData.prazo?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, prazo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Ações</p>
                <p className="bg-blue-50 p-3 rounded-lg whitespace-pre-wrap">{acao.acoes || '-'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Responsáveis</p>
                  <p className="font-medium">{acao.responsaveis || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prazo</p>
                  <p className="font-medium">{formatDate(acao.prazo)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONDIÇÕES DAS AÇÕES */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CONDIÇÕES DAS AÇÕES</h2>
          {editMode ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status das Ações</label>
              <select
                value={editData.status_acoes || ''}
                onChange={(e) => setEditData({ ...editData, status_acoes: e.target.value as StatusAcoesAC })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Selecione...</option>
                {Object.entries(STATUS_ACOES_AC).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Status das Ações</p>
              <div className="mt-1">{getStatusAcoesBadge(acao.status_acoes) || <span className="text-gray-400">-</span>}</div>
            </div>
          )}
        </div>

        {/* ANÁLISE DA EFICÁCIA */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ANÁLISE DA EFICÁCIA</h2>
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ações Finalizadas?</label>
                  <select
                    value={editData.acoes_finalizadas || ''}
                    onChange={(e) => setEditData({ ...editData, acoes_finalizadas: e.target.value as AcoesFinalizadasAC })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(ACOES_FINALIZADAS_AC).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Situação Final</label>
                  <select
                    value={editData.situacao_final || ''}
                    onChange={(e) => setEditData({ ...editData, situacao_final: e.target.value as SituacaoFinalAC })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(SITUACAO_FINAL_AC).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidências (Anexos)</label>
                <input
                  ref={fileInputEvidenciasRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  multiple
                  onChange={handleFileUploadEvidencias}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {uploadingEvidencias && <p className="text-sm text-gray-500 mt-1">Enviando...</p>}
                {editData.evidencias_anexos && editData.evidencias_anexos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {editData.evidencias_anexos.map((anexo, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{anexo.filename}</span>
                        <button type="button" onClick={() => removeEvidencia(index)} className="text-red-600 ml-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela Análise</label>
                  <input
                    type="text"
                    value={editData.responsavel_analise || ''}
                    onChange={(e) => setEditData({ ...editData, responsavel_analise: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Análise</label>
                  <input
                    type="date"
                    value={editData.data_analise?.split('T')[0] || ''}
                    onChange={(e) => setEditData({ ...editData, data_analise: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
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
                  <p className="text-sm text-gray-500">Ações Finalizadas?</p>
                  <p className="font-medium">{acao.acoes_finalizadas ? ACOES_FINALIZADAS_AC[acao.acoes_finalizadas] : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Situação Final</p>
                  <div className="mt-1">{getSituacaoFinalBadge(acao.situacao_final) || <span className="text-gray-400">-</span>}</div>
                </div>
              </div>
              {acao.evidencias_anexos && acao.evidencias_anexos.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Evidências</p>
                  <div className="flex flex-wrap gap-2">
                    {acao.evidencias_anexos.map((anexo, index) => (
                      <a
                        key={index}
                        href={anexo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100"
                      >
                        {anexo.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Responsável pela Análise</p>
                  <p className="font-medium">{acao.responsavel_analise || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data da Análise</p>
                  <p className="font-medium">{formatDate(acao.data_analise)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações do Sistema */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="pt-4 border-t text-sm text-gray-500">
            <p>Criado em: {formatDateTime(acao.created)}</p>
            <p>Atualizado em: {formatDateTime(acao.updated)}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
