'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ReclamacaoCliente,
  STATUS_RECLAMACAO,
  TIPOS_RECLAMACAO,
  IMPACTOS_RECLAMACAO,
  StatusReclamacao,
  Anexo
} from '@/types/qualidade';
import { useAuth } from '@/contexts/AuthContext';

export default function DetalhesReclamacaoPage() {
  const router = useRouter();
  const params = useParams();
  const [reclamacao, setReclamacao] = useState<ReclamacaoCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<ReclamacaoCliente>>({});

  const { authenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchReclamacao();
  }, [authLoading, authenticated, params.id]);

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
      } else {
        alert(result.error || 'Erro ao salvar. Verifique suas permissões.');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao conectar com o servidor.');
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
      } else {
        alert(result.error || 'Erro ao excluir. Verifique suas permissões.');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao conectar com o servidor.');
    }
  };

  // Helper para processar anexos
  const getAnexos = (): Anexo[] => {
    if (!reclamacao) return [];
    try {
      const anexos = reclamacao.anexos || reclamacao.evidencias;
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
    if (!reclamacao) return;

    const baseUrl = window.location.origin;

    const tipoReclamacao = reclamacao.tipo_reclamacao
      ? TIPOS_RECLAMACAO[reclamacao.tipo_reclamacao as keyof typeof TIPOS_RECLAMACAO] || reclamacao.tipo_reclamacao
      : '-';
    const impacto = reclamacao.impacto
      ? IMPACTOS_RECLAMACAO[reclamacao.impacto as keyof typeof IMPACTOS_RECLAMACAO] || reclamacao.impacto
      : '-';
    const status = STATUS_RECLAMACAO[reclamacao.status as keyof typeof STATUS_RECLAMACAO] || reclamacao.status;
    const procedencia = reclamacao.procedencia === null ? 'Não definida' : (reclamacao.procedencia ? 'Procedente' : 'Improcedente');

    // Processar anexos para exibição
    let anexosHtml = '';
    const anexos = getAnexos();
    if (anexos.length > 0) {
      anexosHtml = `
        <div class="section">
          <div class="section-title">ANEXOS / EVIDÊNCIAS</div>
          <div class="section-content">
            <div class="anexos-grid">
              ${anexos.map((anexo: Anexo, idx: number) => {
                const url = anexo.url?.startsWith('data:') ? anexo.url : (anexo.url?.startsWith('http') ? anexo.url : `${baseUrl}${anexo.url}`);
                const isImg = isImage(anexo);
                return isImg ? `
                  <div class="anexo-item">
                    <img src="${url}" alt="Anexo ${idx + 1}" />
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

    // Gerar nome do arquivo: RRC_ano_numero
    const numeroPartes = reclamacao.numero.split('-');
    const ano = numeroPartes[1] || new Date().getFullYear();
    const num = numeroPartes[2] || reclamacao.id;
    const nomeArquivo = `RRC_${ano}_${num}`;

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${nomeArquivo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; padding: 15px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 3px solid #ea580c; }
          .header h1 { color: #ea580c; font-size: 18px; margin-bottom: 3px; }
          .header .numero { font-size: 14px; font-weight: bold; color: #333; }
          .header .subtitle { font-size: 10px; color: #666; }
          .status-row { display: flex; justify-content: center; gap: 15px; margin-top: 8px; }
          .status-badge { padding: 4px 12px; border-radius: 15px; font-weight: bold; font-size: 10px; }
          .status-aberta { background: #fee2e2; color: #991b1b; }
          .status-em_analise { background: #fef3c7; color: #92400e; }
          .status-respondida { background: #dbeafe; color: #1e40af; }
          .status-fechada { background: #d1fae5; color: #065f46; }
          .procedente { background: #fee2e2; color: #991b1b; }
          .improcedente { background: #f3f4f6; color: #374151; }
          .nao-definida { background: #f3f4f6; color: #6b7280; }
          .section { margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
          .section-title { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 6px 12px; font-size: 12px; font-weight: bold; }
          .section-content { padding: 10px; background: #fafafa; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .grid-full { grid-column: span 2; }
          .field { margin-bottom: 6px; }
          .field-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 1px; font-weight: bold; }
          .field-value { font-size: 11px; color: #111827; }
          .text-box { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; margin-top: 3px; white-space: pre-wrap; min-height: 30px; }
          .text-box.resposta { background: #eff6ff; border-color: #bfdbfe; }
          .text-box.acao { background: #ecfdf5; border-color: #a7f3d0; }
          .anexos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .anexo-item { text-align: center; }
          .anexo-item img { max-width: 100%; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; }
          .anexo-name { font-size: 9px; color: #666; margin-top: 3px; word-break: break-all; }
          .anexo-file { background: #f3f4f6; padding: 15px; border-radius: 4px; }
          .file-icon { font-size: 24px; }
          .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af; }
          @media print { body { padding: 10px; } .section { break-inside: avoid; } .anexos-grid { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REGISTRO DE RECLAMAÇÃO DE CLIENTE</h1>
          <div class="numero">${reclamacao.numero}</div>
          <div class="subtitle">Nº 57-2 - REV. 01</div>
          <div class="status-row">
            <span class="status-badge status-${reclamacao.status.toLowerCase()}">${status}</span>
            <span class="status-badge ${reclamacao.procedencia === null ? 'nao-definida' : (reclamacao.procedencia ? 'procedente' : 'improcedente')}">${procedencia}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">IDENTIFICAÇÃO</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Data de Emissão</div>
                <div class="field-value">${formatDate(reclamacao.data_emissao || reclamacao.data_reclamacao)}</div>
              </div>
              <div class="field">
                <div class="field-label">Nome do Emitente</div>
                <div class="field-value">${reclamacao.nome_emitente || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">RECLAMAÇÃO DE CLIENTE</div>
          <div class="section-content">
            <div class="grid">
              <div class="grid-full field">
                <div class="field-label">Nome do Cliente</div>
                <div class="field-value">${reclamacao.nome_cliente || reclamacao.cliente_nome || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Número da OPD</div>
                <div class="field-value">${reclamacao.numero_opd || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Número da NF</div>
                <div class="field-value">${reclamacao.numero_nf || '-'}</div>
              </div>
              <div class="grid-full field">
                <div class="field-label">Código do Equipamento</div>
                <div class="field-value">${reclamacao.codigo_equipamento || reclamacao.numero_serie || '-'}</div>
              </div>
              <div class="grid-full field">
                <div class="field-label">Local Instalado (Cidade/Estado)</div>
                <div class="field-value">${reclamacao.local_instalado || '-'}</div>
              </div>
            </div>
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Descrição do Problema/Reclamação de Cliente</div>
              <div class="text-box">${reclamacao.descricao || '-'}</div>
            </div>
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Ação Imediata para Resolver o Ocorrido</div>
              <div class="text-box acao">${reclamacao.acao_imediata || '-'}</div>
            </div>
            ${reclamacao.resposta_cliente ? `
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Resposta ao Cliente</div>
              <div class="text-box resposta">${reclamacao.resposta_cliente}</div>
            </div>
            ` : ''}
            ${reclamacao.acao_tomada ? `
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Ação Tomada</div>
              <div class="text-box acao">${reclamacao.acao_tomada}</div>
            </div>
            ` : ''}
            ${reclamacao.justificativa_procedencia ? `
            <div class="field grid-full" style="margin-top: 8px;">
              <div class="field-label">Justificativa de Procedência</div>
              <div class="text-box">${reclamacao.justificativa_procedencia}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${anexosHtml}

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - Portal Pili - Sistema Integrado de Gestão</p>
          <p>Criado em: ${formatDateTime(reclamacao.created)} | Atualizado em: ${formatDateTime(reclamacao.updated)}</p>
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

  const anexos = getAnexos();

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
                href={`/qualidade/acao-corretiva/nova?origem_tipo=RECLAMACAO&origem_id=${reclamacao.id}&origem_descricao=${encodeURIComponent(reclamacao.numero + ' - ' + (reclamacao.nome_cliente || reclamacao.cliente_nome))}`}
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

        {/* Conteúdo */}
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
                      value={(editData.data_emissao || editData.data_reclamacao || '').split('T')[0]}
                      onChange={(e) => setEditData({ ...editData, data_emissao: e.target.value, data_reclamacao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Emitente</label>
                    <input
                      type="text"
                      value={editData.nome_emitente || ''}
                      onChange={(e) => setEditData({ ...editData, nome_emitente: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* RECLAMAÇÃO DE CLIENTE */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">RECLAMAÇÃO DE CLIENTE</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      value={editData.nome_cliente || editData.cliente_nome || ''}
                      onChange={(e) => setEditData({ ...editData, nome_cliente: e.target.value, cliente_nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número da OPD</label>
                      <input
                        type="text"
                        value={editData.numero_opd || ''}
                        onChange={(e) => setEditData({ ...editData, numero_opd: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número da NF</label>
                      <input
                        type="text"
                        value={editData.numero_nf || ''}
                        onChange={(e) => setEditData({ ...editData, numero_nf: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código do Equipamento</label>
                      <input
                        type="text"
                        value={editData.codigo_equipamento || editData.numero_serie || ''}
                        onChange={(e) => setEditData({ ...editData, codigo_equipamento: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Local Instalado</label>
                      <input
                        type="text"
                        value={editData.local_instalado || ''}
                        onChange={(e) => setEditData({ ...editData, local_instalado: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Cidade/Estado"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Problema</label>
                    <textarea
                      value={editData.descricao || ''}
                      onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ação Imediata</label>
                    <textarea
                      value={editData.acao_imediata || ''}
                      onChange={(e) => setEditData({ ...editData, acao_imediata: e.target.value })}
                      rows={3}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Justificativa de Procedência</label>
                    <textarea
                      value={editData.justificativa_procedencia || ''}
                      onChange={(e) => setEditData({ ...editData, justificativa_procedencia: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* DADOS DO CLIENTE (Legado) */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CONTATO DO CLIENTE</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Data de Emissão</p>
                    <p className="font-medium">{formatDate(reclamacao.data_emissao || reclamacao.data_reclamacao)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nome do Emitente</p>
                    <p className="font-medium">{reclamacao.nome_emitente || '-'}</p>
                  </div>
                </div>
              </div>

              {/* RECLAMAÇÃO DE CLIENTE */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">RECLAMAÇÃO DE CLIENTE</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome do Cliente</p>
                    <p className="font-medium text-lg">{reclamacao.nome_cliente || reclamacao.cliente_nome || '-'}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Número da OPD</p>
                      <p className="font-medium">{reclamacao.numero_opd || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Número da NF</p>
                      <p className="font-medium">{reclamacao.numero_nf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Código do Equipamento</p>
                      <p className="font-medium">{reclamacao.codigo_equipamento || reclamacao.numero_serie || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Local Instalado</p>
                      <p className="font-medium">{reclamacao.local_instalado || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Descrição do Problema</p>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{reclamacao.descricao || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ação Imediata</p>
                    <p className="bg-green-50 p-3 rounded-lg whitespace-pre-wrap">{reclamacao.acao_imediata || '-'}</p>
                  </div>
                  {reclamacao.resposta_cliente && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Resposta ao Cliente</p>
                      <p className="bg-blue-50 p-3 rounded-lg whitespace-pre-wrap">{reclamacao.resposta_cliente}</p>
                    </div>
                  )}
                  {reclamacao.acao_tomada && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ação Tomada</p>
                      <p className="bg-green-50 p-3 rounded-lg whitespace-pre-wrap">{reclamacao.acao_tomada}</p>
                    </div>
                  )}
                  {reclamacao.justificativa_procedencia && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Justificativa de Procedência</p>
                      <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{reclamacao.justificativa_procedencia}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CONTATO DO CLIENTE */}
              {(reclamacao.cliente_contato || reclamacao.cliente_email || reclamacao.cliente_telefone) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">CONTATO DO CLIENTE</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>
              )}

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

              {/* NC VINCULADA */}
              {reclamacao.nao_conformidade_id && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-medium">
                    NC vinculada:
                    <Link href={`/qualidade/nao-conformidade/${reclamacao.nao_conformidade_id}`} className="ml-2 underline">
                      Ver Não Conformidade
                    </Link>
                  </p>
                </div>
              )}

              {/* TIMESTAMPS */}
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
