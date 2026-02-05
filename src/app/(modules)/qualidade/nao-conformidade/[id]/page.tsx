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
  StatusNaoConformidade,
  TurnoTrabalho,
  UnidadeFabricacao,
  ProcessoOrigem,
  TarefaOrigem,
  GravidadeNaoConformidade,
  TipoNaoConformidade,
  DisposicaoNaoConformidade,
  Anexo
} from '@/types/qualidade';

export default function DetalhesNCPage() {
  const router = useRouter();
  const params = useParams();
  const [nc, setNc] = useState<NaoConformidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<NaoConformidade>>({});
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [analiseIA, setAnaliseIA] = useState<{
    analise: string;
    ncs_similares: Array<{ numero: string; descricao: string; causas?: string }>;
    insights: string;
  } | null>(null);

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

  const handleAnalisarCausasIA = async () => {
    if (!nc) return;
    setAnalisandoIA(true);
    try {
      const response = await fetch('/api/qualidade/ia/analisar-causas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nc_id: nc.id })
      });
      const result = await response.json();
      if (result.success) {
        setAnaliseIA(result.data);
      } else {
        alert(result.error || 'Erro ao analisar causas');
      }
    } catch (error) {
      console.error('Erro ao analisar causas:', error);
      alert('Erro ao conectar com o serviço de IA');
    } finally {
      setAnalisandoIA(false);
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

  // Helper para processar anexos
  const getAnexos = (): Anexo[] => {
    if (!nc) return [];
    try {
      const anexos = nc.anexos || nc.evidencias;
      if (!anexos) return [];
      if (typeof anexos === 'string') return JSON.parse(anexos);
      return anexos;
    } catch {
      return [];
    }
  };

  // Helper para URL de imagem
  const getImageUrl = (anexo: Anexo): string => {
    if (!anexo.url) return '';
    // Se for base64 data URL, retornar diretamente
    if (anexo.url.startsWith('data:')) return anexo.url;
    // Se for URL externa (http/https), retornar diretamente
    if (anexo.url.startsWith('http')) return anexo.url;
    // Se for caminho relativo, adicionar origem
    return `${window.location.origin}${anexo.url}`;
  };

  // Verificar se é imagem
  const isImage = (anexo: Anexo): boolean => {
    // Verificar se é base64 de imagem
    if (anexo.url?.startsWith('data:image/')) return true;
    // Verificar pela extensão do arquivo
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename || anexo.url || '');
  };

  const handlePrint = () => {
    if (!nc) return;

    const baseUrl = window.location.origin;

    // Processar anexos para exibição
    let anexosHtml = '';
    const anexos = getAnexos();
    if (anexos.length > 0) {
      anexosHtml = `
        <div class="section">
          <div class="section-header">ANEXOS / EVIDÊNCIAS</div>
          <div class="section-content">
            <div class="anexos-grid">
              ${anexos.map((anexo: Anexo, idx: number) => {
                const url = anexo.url?.startsWith('data:') ? anexo.url : (anexo.url?.startsWith('http') ? anexo.url : `${baseUrl}${anexo.url}`);
                const isImg = isImage(anexo);
                return isImg ? `
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
                <div class="field-value">${nc.unidade_fabricacao ? UNIDADES_FABRICACAO[nc.unidade_fabricacao as keyof typeof UNIDADES_FABRICACAO] || nc.unidade_fabricacao : (nc.local_ocorrencia ? UNIDADES_FABRICACAO[nc.local_ocorrencia as keyof typeof UNIDADES_FABRICACAO] || nc.local_ocorrencia : '-')}</div>
              </div>
              <div class="field">
                <div class="field-label">Processo de Origem</div>
                <div class="field-value">${nc.processo_origem ? PROCESSOS_ORIGEM[nc.processo_origem as keyof typeof PROCESSOS_ORIGEM] || nc.processo_origem : (nc.setor_responsavel ? PROCESSOS_ORIGEM[nc.setor_responsavel as keyof typeof PROCESSOS_ORIGEM] || nc.setor_responsavel : '-')}</div>
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
                <div class="field-value">${nc.tarefa_origem ? TAREFAS_ORIGEM[nc.tarefa_origem as keyof typeof TAREFAS_ORIGEM] || nc.tarefa_origem : (nc.origem ? TAREFAS_ORIGEM[nc.origem as keyof typeof TAREFAS_ORIGEM] || nc.origem : '-')}</div>
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
              <div class="text-box">${nc.evidencia_objetiva || (typeof nc.evidencias === 'string' ? nc.evidencias : '') || '-'}</div>
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

      // Aguardar carregamento das imagens antes de imprimir
      const images = printWindow.document.images;
      if (images.length > 0) {
        let loadedCount = 0;
        const checkAllLoaded = () => {
          loadedCount++;
          if (loadedCount >= images.length) {
            setTimeout(() => printWindow.print(), 300);
          }
        };

        for (let i = 0; i < images.length; i++) {
          if (images[i].complete) {
            checkAllLoaded();
          } else {
            images[i].onload = checkAllLoaded;
            images[i].onerror = checkAllLoaded; // Conta mesmo se falhar
          }
        }

        // Fallback: imprimir após 5 segundos se imagens não carregarem
        setTimeout(() => {
          if (loadedCount < images.length) {
            printWindow.print();
          }
        }, 5000);
      } else {
        setTimeout(() => printWindow.print(), 500);
      }
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

  const getGravidadeBadge = (gravidade: string) => {
    const colors: Record<string, string> = {
      'ALTA': 'bg-red-100 text-red-800',
      'MEDIA': 'bg-orange-100 text-orange-800',
      'BAIXA': 'bg-yellow-100 text-yellow-800',
      'NA': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[gravidade] || 'bg-gray-100'}`}>
        {GRAVIDADES_NAO_CONFORMIDADE[gravidade as GravidadeNaoConformidade] || gravidade}
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

  const anexos = getAnexos();

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
              {nc.gravidade && getGravidadeBadge(nc.gravidade)}
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
            // ========== MODO EDIÇÃO ==========
            <div className="space-y-8">
              {/* IDENTIFICAÇÃO */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">IDENTIFICAÇÃO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão</label>
                    <input
                      type="date"
                      value={(editData.data_emissao || editData.data_ocorrencia || '').split('T')[0]}
                      onChange={(e) => setEditData({ ...editData, data_emissao: e.target.value, data_ocorrencia: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsável Emissão</label>
                    <input
                      type="text"
                      value={editData.responsavel_emissao || editData.detectado_por || ''}
                      onChange={(e) => setEditData({ ...editData, responsavel_emissao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turno de Trabalho</label>
                    <select
                      value={editData.turno_trabalho || ''}
                      onChange={(e) => setEditData({ ...editData, turno_trabalho: e.target.value as TurnoTrabalho })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(TURNOS_TRABALHO).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Fabricação</label>
                    <select
                      value={editData.unidade_fabricacao || ''}
                      onChange={(e) => setEditData({ ...editData, unidade_fabricacao: e.target.value as UnidadeFabricacao })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(UNIDADES_FABRICACAO).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Processo de Origem</label>
                    <select
                      value={editData.processo_origem || ''}
                      onChange={(e) => setEditData({ ...editData, processo_origem: e.target.value as ProcessoOrigem })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(PROCESSOS_ORIGEM).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setor Responsável</label>
                    <input
                      type="text"
                      value={editData.setor_responsavel || ''}
                      onChange={(e) => setEditData({ ...editData, setor_responsavel: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* ORIGEM */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ORIGEM</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarefa de Origem</label>
                    <select
                      value={editData.tarefa_origem || ''}
                      onChange={(e) => setEditData({ ...editData, tarefa_origem: e.target.value as TarefaOrigem })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(TAREFAS_ORIGEM).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número OPD</label>
                    <input
                      type="text"
                      value={editData.numero_opd || ''}
                      onChange={(e) => setEditData({ ...editData, numero_opd: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código da Peça</label>
                    <input
                      type="text"
                      value={editData.codigo_peca || editData.produtos_afetados || ''}
                      onChange={(e) => setEditData({ ...editData, codigo_peca: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Itens</label>
                    <input
                      type="number"
                      value={editData.quantidade_itens || editData.quantidade_afetada || ''}
                      onChange={(e) => setEditData({ ...editData, quantidade_itens: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">DESCRIÇÃO DA NÃO CONFORMIDADE</h3>
                <div className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Evidência Objetiva</label>
                    <textarea
                      value={editData.evidencia_objetiva || ''}
                      onChange={(e) => setEditData({ ...editData, evidencia_objetiva: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ação Imediata</label>
                    <textarea
                      value={editData.acao_imediata || editData.acao_contencao || ''}
                      onChange={(e) => setEditData({ ...editData, acao_imediata: e.target.value, acao_contencao: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis pelas Ações</label>
                      <input
                        type="text"
                        value={editData.responsaveis_acoes || editData.responsavel_contencao || ''}
                        onChange={(e) => setEditData({ ...editData, responsaveis_acoes: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prazo das Ações</label>
                      <input
                        type="date"
                        value={(editData.prazo_acoes || editData.data_contencao || '').split('T')[0]}
                        onChange={(e) => setEditData({ ...editData, prazo_acoes: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ANÁLISE DAS CAUSAS - EDIÇÃO */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">ANÁLISE DAS CAUSAS</h3>
                  <button
                    type="button"
                    onClick={handleAnalisarCausasIA}
                    disabled={analisandoIA}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analisandoIA ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Analisando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Analisar com IA</span>
                      </>
                    )}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Causas Identificadas</label>
                  <textarea
                    value={analiseIA?.analise || editData.causas || ''}
                    onChange={(e) => setEditData({ ...editData, causas: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Clique em 'Analisar com IA' para gerar uma análise automática das causas ou digite manualmente..."
                  />
                </div>
                {analiseIA?.insights && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-purple-800 mb-1">Insights da IA:</p>
                    <p className="text-sm text-purple-700">{analiseIA.insights}</p>
                  </div>
                )}
              </div>

              {/* CLASSIFICAÇÃO E DISPOSIÇÃO */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CLASSIFICAÇÃO E DISPOSIÇÃO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
                    <select
                      value={editData.gravidade || ''}
                      onChange={(e) => setEditData({ ...editData, gravidade: e.target.value as GravidadeNaoConformidade })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(GRAVIDADES_NAO_CONFORMIDADE).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={editData.tipo || ''}
                      onChange={(e) => setEditData({ ...editData, tipo: e.target.value as TipoNaoConformidade })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(TIPOS_NAO_CONFORMIDADE).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disposição</label>
                    <select
                      value={editData.disposicao || ''}
                      onChange={(e) => setEditData({ ...editData, disposicao: e.target.value as DisposicaoNaoConformidade })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(DISPOSICOES_NAO_CONFORMIDADE).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsável Liberação</label>
                    <input
                      type="text"
                      value={editData.responsavel_liberacao || ''}
                      onChange={(e) => setEditData({ ...editData, responsavel_liberacao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                {(editData.disposicao === 'ACEITE_CONDICIONAL' || editData.disposicao === 'RETRABALHO') && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Disposição</label>
                    <textarea
                      value={editData.disposicao_descricao || ''}
                      onChange={(e) => setEditData({ ...editData, disposicao_descricao: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Descreva os detalhes da disposição..."
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          ) : (
            // ========== MODO VISUALIZAÇÃO ==========
            <div className="space-y-8">
              {/* IDENTIFICAÇÃO */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">IDENTIFICAÇÃO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Data de Emissão</p>
                    <p className="font-medium">{formatDate(nc.data_emissao || nc.data_ocorrencia)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Responsável Emissão</p>
                    <p className="font-medium">{nc.responsavel_emissao || nc.detectado_por || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Turno de Trabalho</p>
                    <p className="font-medium">{nc.turno_trabalho ? (TURNOS_TRABALHO[nc.turno_trabalho as keyof typeof TURNOS_TRABALHO] || nc.turno_trabalho) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Unidade de Fabricação</p>
                    <p className="font-medium">{(nc.unidade_fabricacao || nc.local_ocorrencia) ? (UNIDADES_FABRICACAO[(nc.unidade_fabricacao || nc.local_ocorrencia) as keyof typeof UNIDADES_FABRICACAO] || nc.unidade_fabricacao || nc.local_ocorrencia) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Processo de Origem</p>
                    <p className="font-medium">{(nc.processo_origem || nc.setor_responsavel) ? (PROCESSOS_ORIGEM[(nc.processo_origem || nc.setor_responsavel) as keyof typeof PROCESSOS_ORIGEM] || nc.processo_origem || nc.setor_responsavel) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Setor Responsável</p>
                    <p className="font-medium">{nc.setor_responsavel || nc.processo_origem || '-'}</p>
                  </div>
                </div>
              </div>

              {/* ORIGEM */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ORIGEM</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tarefa de Origem</p>
                    <p className="font-medium">{nc.tarefa_origem ? TAREFAS_ORIGEM[nc.tarefa_origem] || nc.tarefa_origem : (nc.origem ? TAREFAS_ORIGEM[nc.origem as keyof typeof TAREFAS_ORIGEM] || nc.origem : '-')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Número OPD</p>
                    <p className="font-medium">{nc.numero_opd || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Código da Peça</p>
                    <p className="font-medium">{nc.codigo_peca || nc.produtos_afetados || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quantidade de Itens</p>
                    <p className="font-medium">{nc.quantidade_itens || nc.quantidade_afetada || '-'}</p>
                  </div>
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">DESCRIÇÃO DA NÃO CONFORMIDADE</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Descrição</p>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{nc.descricao || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Evidência Objetiva</p>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{nc.evidencia_objetiva || (typeof nc.evidencias === 'string' ? nc.evidencias : '') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ação Imediata</p>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{nc.acao_imediata || nc.acao_contencao || '-'}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Responsáveis pelas Ações</p>
                      <p className="font-medium">{nc.responsaveis_acoes || nc.responsavel_contencao || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Prazo das Ações</p>
                      <p className="font-medium">{formatDate(nc.prazo_acoes) || formatDate(nc.data_contencao) || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ANÁLISE DAS CAUSAS */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">ANÁLISE DAS CAUSAS</h3>
                  {nc.status !== 'FECHADA' && (
                    <button
                      onClick={handleAnalisarCausasIA}
                      disabled={analisandoIA}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {analisandoIA ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Analisando...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Analisar com IA</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Causas</p>
                    <div className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap min-h-[60px]">
                      {analiseIA?.analise || nc.causas || '-'}
                    </div>
                  </div>

                  {analiseIA && (
                    <>
                      {analiseIA.ncs_similares && analiseIA.ncs_similares.length > 0 && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            NCs Similares Encontradas ({analiseIA.ncs_similares.length})
                          </p>
                          <div className="space-y-2">
                            {analiseIA.ncs_similares.slice(0, 3).map((ncSimilar, idx) => (
                              <div key={idx} className="text-sm text-blue-700 bg-white p-2 rounded border border-blue-100">
                                <strong>{ncSimilar.numero}</strong>: {ncSimilar.descricao?.substring(0, 100)}...
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analiseIA.insights && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Insights da IA
                          </p>
                          <p className="text-sm text-purple-700 whitespace-pre-wrap">{analiseIA.insights}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* CLASSIFICAÇÃO E DISPOSIÇÃO */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CLASSIFICAÇÃO E DISPOSIÇÃO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Gravidade</p>
                    <p className="font-medium">{nc.gravidade ? GRAVIDADES_NAO_CONFORMIDADE[nc.gravidade] : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium">{TIPOS_NAO_CONFORMIDADE[nc.tipo] || nc.tipo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Disposição</p>
                    <p className="font-medium">{nc.disposicao ? DISPOSICOES_NAO_CONFORMIDADE[nc.disposicao] : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Responsável Liberação</p>
                    <p className="font-medium">{nc.responsavel_liberacao || '-'}</p>
                  </div>
                </div>
                {nc.disposicao_descricao && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-1">Descrição da Disposição</p>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{nc.disposicao_descricao}</p>
                  </div>
                )}
              </div>

              {/* ANEXOS / EVIDÊNCIAS */}
              {anexos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ANEXOS / EVIDÊNCIAS</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {anexos.map((anexo, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden bg-gray-50">
                        {isImage(anexo) ? (
                          <a href={getImageUrl(anexo)} target="_blank" rel="noopener noreferrer">
                            <img
                              src={getImageUrl(anexo)}
                              alt={anexo.filename || `Anexo ${idx + 1}`}
                              className="w-full h-32 object-cover hover:opacity-80 transition"
                            />
                          </a>
                        ) : (
                          <a
                            href={getImageUrl(anexo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center h-32 bg-gray-100 hover:bg-gray-200 transition"
                          >
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        )}
                        <p className="text-xs text-gray-600 p-2 truncate">{anexo.filename || `Anexo ${idx + 1}`}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RAC VINCULADA */}
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

              {/* TIMESTAMPS */}
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
