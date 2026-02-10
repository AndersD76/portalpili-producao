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
import AssistenteIAQualidade from '@/components/qualidade/AssistenteIAQualidade';
import { useAuth } from '@/contexts/AuthContext';

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

  // Modal para Iniciar Tratamento
  const [showModalTratamento, setShowModalTratamento] = useState(false);
  const [tratamentoData, setTratamentoData] = useState({
    acoes: '',
    responsaveis: '',
    prazo: ''
  });

  // Modal para Análise de Eficácia
  const [showModalEficacia, setShowModalEficacia] = useState(false);
  const [eficaciaData, setEficaciaData] = useState({
    acoes_finalizadas: '' as AcoesFinalizadasAC | '',
    situacao_final: '' as SituacaoFinalAC | '',
    responsavel_analise: '',
    data_analise: ''
  });

  const { authenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchAcao();
  }, [authLoading, authenticated, params.id]);

  const fetchAcao = async () => {
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`);
      const data = await response.json();
      if (data.success) {
        const acaoData = data.data;
        // Parse JSON fields if they're strings - with safe handling
        const parseJsonField = (field: any) => {
          if (!field) return null;
          if (typeof field === 'string') {
            try {
              return JSON.parse(field);
            } catch {
              return null;
            }
          }
          return field;
        };

        acaoData.processos_envolvidos = parseJsonField(acaoData.processos_envolvidos) || [];
        acaoData.registro_nc_anexos = parseJsonField(acaoData.registro_nc_anexos) || [];
        acaoData.evidencias_anexos = parseJsonField(acaoData.evidencias_anexos) || [];
        acaoData.subcausas = typeof acaoData.subcausas === 'string' ? acaoData.subcausas : (acaoData.subcausas ? JSON.stringify(acaoData.subcausas) : '');

        // O campo 'acoes' pode ser um array de ItemAcao (legado) ou uma string
        // Se for array, converter para string de descrições para exibição
        if (Array.isArray(acaoData.acoes)) {
          const acoesArray = acaoData.acoes as any[];
          acaoData.acoes = acoesArray.map((a: any) => a.descricao || a).join('\n');
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
        const parseJsonField = (field: any) => {
          if (!field) return null;
          if (typeof field === 'string') {
            try { return JSON.parse(field); } catch { return null; }
          }
          return field;
        };
        acaoData.processos_envolvidos = parseJsonField(acaoData.processos_envolvidos) || [];
        acaoData.registro_nc_anexos = parseJsonField(acaoData.registro_nc_anexos) || [];
        acaoData.evidencias_anexos = parseJsonField(acaoData.evidencias_anexos) || [];
        if (Array.isArray(acaoData.acoes)) {
          acaoData.acoes = (acaoData.acoes as any[]).map((a: any) => a.descricao || a).join('\n');
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

  const handleStatusChange = async (newStatus: StatusAcaoCorretiva, additionalData?: Partial<AcaoCorretiva>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalData })
      });

      const result = await response.json();
      if (result.success) {
        const acaoData = result.data;
        const parseJsonField = (field: any) => {
          if (!field) return null;
          if (typeof field === 'string') {
            try { return JSON.parse(field); } catch { return null; }
          }
          return field;
        };
        acaoData.processos_envolvidos = parseJsonField(acaoData.processos_envolvidos) || [];
        acaoData.registro_nc_anexos = parseJsonField(acaoData.registro_nc_anexos) || [];
        acaoData.evidencias_anexos = parseJsonField(acaoData.evidencias_anexos) || [];
        if (Array.isArray(acaoData.acoes)) {
          acaoData.acoes = (acaoData.acoes as any[]).map((a: any) => a.descricao || a).join('\n');
        }
        setAcao(acaoData);
        setEditData(acaoData);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSaving(false);
    }
  };

  // Iniciar Tratamento - abre modal
  const handleIniciarTratamento = () => {
    setTratamentoData({
      acoes: acao?.acoes || '',
      responsaveis: acao?.responsaveis || acao?.responsavel_principal || '',
      prazo: (acao?.prazo || acao?.prazo_conclusao || '').split('T')[0]
    });
    setShowModalTratamento(true);
  };

  // Confirmar início do tratamento
  const handleConfirmarTratamento = async () => {
    if (!tratamentoData.acoes.trim()) {
      alert('Por favor, descreva as ações que serão realizadas.');
      return;
    }
    await handleStatusChange('EM_ANDAMENTO', {
      acoes: tratamentoData.acoes,
      responsaveis: tratamentoData.responsaveis,
      responsavel_principal: tratamentoData.responsaveis,
      prazo: tratamentoData.prazo,
      prazo_conclusao: tratamentoData.prazo,
      status_acoes: 'EM_ANDAMENTO'
    });
    setShowModalTratamento(false);
  };

  // Aguardar Verificação - abre modal de eficácia
  const handleAguardarVerificacao = () => {
    setEficaciaData({
      acoes_finalizadas: '',
      situacao_final: '',
      responsavel_analise: '',
      data_analise: new Date().toISOString().split('T')[0]
    });
    setShowModalEficacia(true);
  };

  // Confirmar análise de eficácia
  const handleConfirmarEficacia = async () => {
    if (!eficaciaData.acoes_finalizadas) {
      alert('Por favor, informe se as ações foram finalizadas.');
      return;
    }
    await handleStatusChange('AGUARDANDO_VERIFICACAO', {
      acoes_finalizadas: eficaciaData.acoes_finalizadas as AcoesFinalizadasAC,
      situacao_final: eficaciaData.situacao_final as SituacaoFinalAC || null,
      responsavel_analise: eficaciaData.responsavel_analise,
      data_analise: eficaciaData.data_analise,
      status_acoes: 'FINALIZADAS'
    });
    setShowModalEficacia(false);
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

    const baseUrl = window.location.origin;

    const formatDatePrint = (dateString: string | null | undefined) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatDateTimePrint = (dateString: string | null | undefined) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('pt-BR');
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

    // Processar evidências para exibição
    let evidenciasHtml = '';
    if (acao.evidencias_anexos) {
      try {
        const evidencias = typeof acao.evidencias_anexos === 'string' ? JSON.parse(acao.evidencias_anexos) : acao.evidencias_anexos;
        if (Array.isArray(evidencias) && evidencias.length > 0) {
          evidenciasHtml = `
            <div class="section">
              <div class="section-header">EVIDÊNCIAS</div>
              <div class="section-content">
                <div class="anexos-grid">
                  ${evidencias.map((anexo: any, idx: number) => {
                    const url = anexo.url?.startsWith('data:') ? anexo.url : (anexo.url?.startsWith('http') ? anexo.url : `${baseUrl}${anexo.url}`);
                    const isImage = anexo.url?.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename || anexo.url || '');
                    return isImage ? `
                      <div class="anexo-item">
                        <img src="${url}" alt="Evidência ${idx + 1}" />
                        <p class="anexo-name">${anexo.filename || `Evidência ${idx + 1}`}</p>
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
        console.log('Erro ao processar evidências:', e);
      }
    }

    // Gerar nome do arquivo: RAC_ano_numero
    const numeroPartes = acao.numero.split('-');
    const ano = numeroPartes[1] || new Date().getFullYear();
    const num = numeroPartes[2] || acao.id;
    const nomeArquivo = `RAC_${ano}_${num}`;

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${nomeArquivo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; padding: 15px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 3px solid #1e40af; }
          .header h1 { color: #1e40af; font-size: 18px; margin-bottom: 3px; }
          .header .subtitle { color: #64748b; font-size: 10px; }
          .header .rac-number { font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 5px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 15px; font-size: 10px; font-weight: bold; margin-top: 5px; }
          .status-ABERTA { background-color: #fee2e2; color: #991b1b; }
          .status-EM_ANDAMENTO { background-color: #dbeafe; color: #1e40af; }
          .status-AGUARDANDO_VERIFICACAO { background-color: #fef3c7; color: #92400e; }
          .status-FECHADA { background-color: #dcfce7; color: #166534; }
          .section { margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
          .section-header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 6px 12px; font-weight: bold; font-size: 12px; }
          .section-content { padding: 10px; background-color: #f8fafc; }
          .field-row { display: flex; margin-bottom: 8px; }
          .field-row:last-child { margin-bottom: 0; }
          .field { flex: 1; padding-right: 10px; }
          .field-label { font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; font-weight: bold; }
          .field-value { font-size: 11px; color: #1e293b; }
          .text-block { background-color: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; white-space: pre-wrap; min-height: 25px; }
          .text-block.falha { border-left: 3px solid #ef4444; }
          .text-block.causas { border-left: 3px solid #f59e0b; }
          .text-block.subcausas { border-left: 3px solid #f97316; }
          .text-block.acoes { border-left: 3px solid #3b82f6; }
          .eficacia-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .eficacia-EFICAZ { background-color: #dcfce7; color: #166534; }
          .eficacia-PARCIALMENTE_EFICAZ { background-color: #fef3c7; color: #92400e; }
          .eficacia-NAO_EFICAZ { background-color: #fee2e2; color: #991b1b; }
          .anexos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .anexo-item { text-align: center; }
          .anexo-item img { max-width: 100%; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; }
          .anexo-name { font-size: 9px; color: #666; margin-top: 3px; word-break: break-all; }
          .anexo-file { background: #f3f4f6; padding: 15px; border-radius: 4px; }
          .file-icon { font-size: 24px; }
          .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center; }
          @media print { body { padding: 10px; } .section { break-inside: avoid; } .anexos-grid { break-inside: avoid; } }
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
          <div class="section-header">IDENTIFICAÇÃO</div>
          <div class="section-content">
            <div class="field-row">
              <div class="field">
                <div class="field-label">Data de Emissão</div>
                <div class="field-value">${formatDatePrint(acao.data_emissao || acao.data_abertura)}</div>
              </div>
              <div class="field">
                <div class="field-label">Emitente</div>
                <div class="field-value">${acao.emitente || '-'}</div>
              </div>
            </div>
            ${acao.origem_descricao ? `
            <div class="field-row">
              <div class="field" style="flex: 1; padding-right: 0;">
                <div class="field-label">Origem</div>
                <div class="field-value">${acao.origem_descricao}</div>
              </div>
            </div>
            ` : ''}
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
                <div class="text-block falha">${acao.falha || acao.descricao_problema || '-'}</div>
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
                <div class="field-value">${acao.responsaveis || acao.responsavel_principal || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Prazo</div>
                <div class="field-value">${formatDatePrint(acao.prazo || acao.prazo_conclusao)}</div>
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

        ${evidenciasHtml}

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - Portal Pili - Sistema Integrado de Gestão</p>
          <p>Criado em: ${formatDateTimePrint(acao.created)} | Atualizado em: ${formatDateTimePrint(acao.updated)}</p>
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
            images[i].onerror = checkAllLoaded;
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
                  className={`px-4 py-2 ${editMode ? 'bg-gray-500' : 'bg-blue-600'} text-white rounded-lg hover:opacity-90 transition text-sm`}
                >
                  {editMode ? 'Cancelar' : 'Editar'}
                </button>
                {editMode && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                )}
                {acao.status === 'ABERTA' && (
                  <button
                    onClick={handleIniciarTratamento}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    Iniciar Tratamento
                  </button>
                )}
                {acao.status === 'EM_ANDAMENTO' && (
                  <button
                    onClick={handleAguardarVerificacao}
                    disabled={saving}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm disabled:opacity-50"
                  >
                    Aguardar Verificação
                  </button>
                )}
                {acao.status === 'AGUARDANDO_VERIFICACAO' && (
                  <button
                    onClick={() => handleStatusChange('FECHADA')}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                  >
                    Fechar RAC
                  </button>
                )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão</label>
                <input
                  type="date"
                  value={(editData.data_emissao || editData.data_abertura || '').split('T')[0]}
                  onChange={(e) => setEditData({ ...editData, data_emissao: e.target.value, data_abertura: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emitente</label>
                <input
                  type="text"
                  value={editData.emitente || ''}
                  onChange={(e) => setEditData({ ...editData, emitente: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Data de Emissão</p>
                <p className="font-medium">{formatDate(acao.data_emissao || acao.data_abertura)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Emitente</p>
                <p className="font-medium">{acao.emitente || '-'}</p>
              </div>
            </div>
          )}
          {/* Origem (NC ou Reclamação vinculada) */}
          {acao.origem_descricao && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Origem:</strong> {acao.origem_descricao}
              </p>
              {acao.origem_id && acao.origem_tipo === 'NAO_CONFORMIDADE' && (
                <Link href={`/qualidade/nao-conformidade/${acao.origem_id}`} className="text-sm text-blue-600 underline mt-1 inline-block">
                  Ver NC vinculada
                </Link>
              )}
              {acao.origem_id && acao.origem_tipo === 'RECLAMACAO' && (
                <Link href={`/qualidade/reclamacao-cliente/${acao.origem_id}`} className="text-sm text-blue-600 underline mt-1 inline-block">
                  Ver Reclamação vinculada
                </Link>
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
                  value={editData.falha || editData.descricao_problema || ''}
                  onChange={(e) => setEditData({ ...editData, falha: e.target.value, descricao_problema: e.target.value })}
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
                <p className="bg-red-50 p-3 rounded-lg whitespace-pre-wrap">{acao.falha || acao.descricao_problema || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Causas</p>
                <p className="bg-yellow-50 p-3 rounded-lg whitespace-pre-wrap">{acao.causas || '-'}</p>
              </div>
              {acao.subcausas && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Subcausas</p>
                  <p className="bg-orange-50 p-3 rounded-lg whitespace-pre-wrap">{acao.subcausas}</p>
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
                    value={editData.responsaveis || editData.responsavel_principal || ''}
                    onChange={(e) => setEditData({ ...editData, responsaveis: e.target.value, responsavel_principal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                  <input
                    type="date"
                    value={(editData.prazo || editData.prazo_conclusao || '').split('T')[0]}
                    onChange={(e) => setEditData({ ...editData, prazo: e.target.value, prazo_conclusao: e.target.value })}
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
                  <p className="font-medium">{acao.responsaveis || acao.responsavel_principal || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prazo</p>
                  <p className="font-medium">{formatDate(acao.prazo || acao.prazo_conclusao)}</p>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {acao.evidencias_anexos.map((anexo, index) => {
                      const isImage = anexo.url?.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename || anexo.url || '');
                      const url = anexo.url?.startsWith('data:') ? anexo.url : (anexo.url?.startsWith('http') ? anexo.url : `${window.location.origin}${anexo.url}`);
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                          {isImage ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={anexo.filename || `Evidência ${index + 1}`}
                                className="w-full h-32 object-cover hover:opacity-80 transition"
                              />
                            </a>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center h-32 bg-gray-100 hover:bg-gray-200 transition"
                            >
                              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                          <p className="text-xs text-gray-600 p-2 truncate">{anexo.filename || `Evidência ${index + 1}`}</p>
                        </div>
                      );
                    })}
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

      {/* Modal Iniciar Tratamento */}
      {showModalTratamento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Iniciar Tratamento</h2>
                <button onClick={() => setShowModalTratamento(false)} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                Descreva as ações que serão realizadas para tratar esta não conformidade.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ações a serem realizadas *</label>
                <textarea
                  value={tratamentoData.acoes}
                  onChange={(e) => setTratamentoData({ ...tratamentoData, acoes: e.target.value })}
                  rows={4}
                  required
                  placeholder="Descreva detalhadamente as ações que serão realizadas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis</label>
                  <input
                    type="text"
                    value={tratamentoData.responsaveis}
                    onChange={(e) => setTratamentoData({ ...tratamentoData, responsaveis: e.target.value })}
                    placeholder="Nome dos responsáveis"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                  <input
                    type="date"
                    value={tratamentoData.prazo}
                    onChange={(e) => setTratamentoData({ ...tratamentoData, prazo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModalTratamento(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarTratamento}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Iniciar Tratamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Análise de Eficácia */}
      {showModalEficacia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Análise da Eficácia</h2>
                <button onClick={() => setShowModalEficacia(false)} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                Avalie se as ações foram eficazes para eliminar a causa raiz do problema.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ações Finalizadas? *</label>
                  <select
                    value={eficaciaData.acoes_finalizadas}
                    onChange={(e) => setEficaciaData({ ...eficaciaData, acoes_finalizadas: e.target.value as AcoesFinalizadasAC })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                    value={eficaciaData.situacao_final}
                    onChange={(e) => setEficaciaData({ ...eficaciaData, situacao_final: e.target.value as SituacaoFinalAC })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(SITUACAO_FINAL_AC).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela Análise</label>
                  <input
                    type="text"
                    value={eficaciaData.responsavel_analise}
                    onChange={(e) => setEficaciaData({ ...eficaciaData, responsavel_analise: e.target.value })}
                    placeholder="Nome do responsável"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Análise</label>
                  <input
                    type="date"
                    value={eficaciaData.data_analise}
                    onChange={(e) => setEficaciaData({ ...eficaciaData, data_analise: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModalEficacia(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEficacia}
                  disabled={saving}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Confirmar Análise'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assistente IA para análise de causas e ações corretivas */}
      {acao && (
        <AssistenteIAQualidade
          contexto={{
            nc_numero: acao.numero,
            nc_descricao: acao.descricao_problema,
            tipo_origem: acao.origem_tipo,
            origem_descricao: acao.origem_descricao || undefined,
          }}
          sugestoes={[
            'Analisar causas desta NC',
            'Sugerir ações corretivas',
            'Verificar eficácia das ações',
            'Identificar padrões similares',
          ]}
        />
      )}
    </div>
  );
}
