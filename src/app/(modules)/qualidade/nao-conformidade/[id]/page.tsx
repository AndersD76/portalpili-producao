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
  TURNOS_TRABALHO,
  UNIDADES_FABRICACAO,
  PROCESSOS_ORIGEM,
  TAREFAS_ORIGEM,
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
    // Validar se pode fechar NC com gravidade ALTA sem AC vinculada
    if (newStatus === 'FECHADA' && nc?.gravidade === 'ALTA' && !nc?.acao_corretiva_id) {
      alert('Não é possível fechar uma NC com gravidade ALTA sem uma Ação Corretiva vinculada.\n\nCrie uma RAC antes de fechar esta NC.');
      return;
    }

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
      } else if (result.error) {
        alert(result.error);
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

    const baseUrl = window.location.origin;

    // Processar anexos para exibição
    let anexosHtml = '';
    if (nc.anexos) {
      try {
        const anexos = typeof nc.anexos === 'string' ? JSON.parse(nc.anexos) : nc.anexos;
        if (Array.isArray(anexos) && anexos.length > 0) {
          anexosHtml = `
            <div class="section">
              <div class="section-header">ANEXOS / EVIDÊNCIAS</div>
              <div class="section-content">
                <div class="anexos-grid">
                  ${anexos.map((anexo: any, idx: number) => {
                    const url = anexo.url?.startsWith('http') ? anexo.url : `${baseUrl}${anexo.url}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename || anexo.url || '');
                    return isImage ? `
                      <div class="anexo-item">
                        <img src="${url}" alt="Anexo ${idx + 1}" crossorigin="anonymous" />
                        <p class="anexo-name">${anexo.filename || `Anexo ${idx + 1}`}</p>
                      </div>
                    ` : `
                      <div class="anexo-item anexo-file">
                        <div class="file-icon">📎</div>
                        <p class="anexo-name">${anexo.filename || `Anexo ${idx + 1}`}</p>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `;
        }
      } catch (e) {
        console.log('Erro ao processar anexos:', e);
      }
    }

    // Gerar nome do arquivo: rnc_ano_numero
    const numeroPartes = nc.numero.split('-');
    const ano = numeroPartes[1] || new Date().getFullYear();
    const num = numeroPartes[2] || nc.id;
    const nomeArquivo = `RNC_${ano}_${num}`;

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${nomeArquivo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; padding: 15px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 3px solid #dc2626; }
          .header h1 { color: #dc2626; font-size: 20px; margin-bottom: 3px; }
          .header .numero { font-size: 16px; font-weight: bold; color: #333; }
          .header .subtitle { font-size: 10px; color: #666; }
          .status-row { display: flex; justify-content: center; gap: 15px; margin-top: 8px; }
          .status-badge { padding: 4px 12px; border-radius: 15px; font-weight: bold; font-size: 10px; }
          .status-ABERTA { background: #fee2e2; color: #991b1b; }
          .status-EM_ANALISE { background: #fef3c7; color: #92400e; }
          .status-PENDENTE_ACAO { background: #ffedd5; color: #9a3412; }
          .status-FECHADA { background: #dcfce7; color: #166534; }
          .gravidade-ALTA { background: #fee2e2; color: #991b1b; }
          .gravidade-MEDIA { background: #ffedd5; color: #9a3412; }
          .gravidade-BAIXA { background: #fef9c3; color: #854d0e; }
          .section { margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
          .section-header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 6px 12px; font-size: 12px; font-weight: bold; }
          .section-content { padding: 10px; background: #fafafa; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .grid-full { grid-column: span 2; }
          .field { margin-bottom: 6px; }
          .field-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 1px; font-weight: bold; }
          .field-value { font-size: 11px; color: #111827; }
          .text-box { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; margin-top: 3px; white-space: pre-wrap; min-height: 30px; }
          .anexos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .anexo-item { text-align: center; }
          .anexo-item img { max-width: 100%; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; }
          .anexo-name { font-size: 9px; color: #666; margin-top: 3px; word-break: break-all; }
          .anexo-file { background: #f3f4f6; padding: 15px; border-radius: 4px; }
          .file-icon { font-size: 24px; }
          .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af; }
          @media print {
            body { padding: 10px; }
            .section { break-inside: avoid; }
            .anexos-grid { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REGISTRO DE NÃO CONFORMIDADE</h1>
          <div class="numero">${nc.numero}</div>
          <div class="subtitle">Nº 57-1 - REV. 01</div>
          <div class="status-row">
            <span class="status-badge status-${nc.status}">${STATUS_NAO_CONFORMIDADE[nc.status as keyof typeof STATUS_NAO_CONFORMIDADE] || nc.status}</span>
            ${nc.gravidade ? `<span class="status-badge gravidade-${nc.gravidade}">${GRAVIDADES_NAO_CONFORMIDADE[nc.gravidade]}</span>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">IDENTIFICAÇÃO</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Data de Emissão</div>
                <div class="field-value">${formatDate(nc.data_emissao || nc.data_ocorrencia)}</div>
              </div>
              <div class="field">
                <div class="field-label">Responsável Emissão</div>
                <div class="field-value">${nc.responsavel_emissao || nc.detectado_por || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Turno de Trabalho</div>
                <div class="field-value">${nc.turno_trabalho ? TURNOS_TRABALHO[nc.turno_trabalho as keyof typeof TURNOS_TRABALHO] || nc.turno_trabalho : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Unidade de Fabricação</div>
                <div class="field-value">${nc.unidade_fabricacao ? UNIDADES_FABRICACAO[nc.unidade_fabricacao as keyof typeof UNIDADES_FABRICACAO] || nc.unidade_fabricacao : nc.local_ocorrencia || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Processo de Origem</div>
                <div class="field-value">${nc.processo_origem ? PROCESSOS_ORIGEM[nc.processo_origem as keyof typeof PROCESSOS_ORIGEM] || nc.processo_origem : nc.origem || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Setor Responsável</div>
                <div class="field-value">${nc.setor_responsavel || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">ORIGEM</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Tarefa de Origem</div>
                <div class="field-value">${nc.tarefa_origem ? TAREFAS_ORIGEM[nc.tarefa_origem as keyof typeof TAREFAS_ORIGEM] || nc.tarefa_origem : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Número OPD</div>
                <div class="field-value">${nc.numero_opd || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Código da Peça</div>
                <div class="field-value">${nc.codigo_peca || nc.produtos_afetados || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Quantidade de Itens</div>
                <div class="field-value">${nc.quantidade_itens || nc.quantidade_afetada || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">DESCRIÇÃO DA NÃO CONFORMIDADE</div>
          <div class="section-content">
            <div class="field grid-full">
              <div class="field-label">Descrição</div>
              <div class="text-box">${nc.descricao || '-'}</div>
            </div>
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Evidência Objetiva</div>
              <div class="text-box">${nc.evidencia_objetiva || '-'}</div>
            </div>
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Ação Imediata</div>
              <div class="text-box">${nc.acao_imediata || nc.acao_contencao || '-'}</div>
            </div>
            <div class="grid" style="margin-top: 8px;">
              <div class="field">
                <div class="field-label">Responsáveis pelas Ações</div>
                <div class="field-value">${nc.responsaveis_acoes || nc.responsavel_contencao || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Prazo das Ações</div>
                <div class="field-value">${formatDate(nc.prazo_acoes) || formatDate(nc.data_contencao) || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">CLASSIFICAÇÃO E DISPOSIÇÃO</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Gravidade</div>
                <div class="field-value">${nc.gravidade ? GRAVIDADES_NAO_CONFORMIDADE[nc.gravidade] : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Tipo</div>
                <div class="field-value">${TIPOS_NAO_CONFORMIDADE[nc.tipo as keyof typeof TIPOS_NAO_CONFORMIDADE] || nc.tipo || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Disposição</div>
                <div class="field-value">${nc.disposicao ? DISPOSICOES_NAO_CONFORMIDADE[nc.disposicao] : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Responsável Liberação</div>
                <div class="field-value">${nc.responsavel_liberacao || '-'}</div>
              </div>
            </div>
            ${nc.disposicao_descricao ? `
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Descrição da Disposição</div>
              <div class="text-box">${nc.disposicao_descricao}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${nc.acao_corretiva_id ? `
        <div class="section">
          <div class="section-header">AÇÃO CORRETIVA VINCULADA</div>
          <div class="section-content">
            <div class="field">
              <div class="field-label">RAC Vinculada</div>
              <div class="field-value">RAC ID: ${nc.acao_corretiva_id}</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${anexosHtml}

        ${nc.disposicao === 'ACEITE_CONDICIONAL' ? `
        <div class="section" style="margin-top: 20px;">
          <div class="section-header" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">LIBERAÇÃO CONDICIONAL</div>
          <div class="section-content">
            <p style="font-size: 10px; color: #666; margin-bottom: 15px;">
              O produto/material descrito nesta NC foi liberado condicionalmente conforme disposição indicada acima.
              A assinatura abaixo confirma a ciência e responsabilidade pela liberação condicional.
            </p>
            <div class="grid">
              <div class="field">
                <div class="field-label">Responsável pela Liberação</div>
                <div class="field-value">${nc.responsavel_liberacao || '___________________________'}</div>
              </div>
              <div class="field">
                <div class="field-label">Data da Liberação</div>
                <div class="field-value">${formatDate(nc.updated) || '____/____/________'}</div>
              </div>
            </div>
            <div style="margin-top: 30px; display: flex; justify-content: space-between;">
              <div style="text-align: center; width: 45%;">
                <div style="border-top: 1px solid #333; padding-top: 5px; margin-top: 40px;">
                  <div class="field-label">Assinatura do Responsável Técnico</div>
                </div>
              </div>
              <div style="text-align: center; width: 45%;">
                <div style="border-top: 1px solid #333; padding-top: 5px; margin-top: 40px;">
                  <div class="field-label">Assinatura do Responsável Qualidade</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - Portal Pili - Sistema Integrado de Gestão</p>
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
      setTimeout(() => printWindow.print(), 500);
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

              {nc.acao_corretiva_id ? (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 font-medium">
                    RAC vinculada:
                    <Link href={`/qualidade/acao-corretiva/${nc.acao_corretiva_id}`} className="ml-2 underline">
                      Ver Ação Corretiva
                    </Link>
                  </p>
                </div>
              ) : nc.gravidade === 'ALTA' && nc.status !== 'FECHADA' && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-300">
                  <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    AÇÃO CORRETIVA OBRIGATÓRIA: Esta NC tem gravidade ALTA e requer uma RAC vinculada antes de ser fechada.
                  </p>
                  <Link
                    href={`/qualidade/acao-corretiva/nova?origem_tipo=NAO_CONFORMIDADE&origem_id=${nc.id}&origem_descricao=${encodeURIComponent(nc.numero + ' - ' + nc.descricao.substring(0, 50))}`}
                    className="inline-block mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                  >
                    Criar RAC Agora
                  </Link>
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
