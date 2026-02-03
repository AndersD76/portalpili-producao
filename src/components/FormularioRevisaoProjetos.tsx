'use client';

import { useState, useEffect } from 'react';

interface Documento {
  id: number;
  tipo: string;
  nome: string;
  arquivo: {
    filename: string;
    url: string;
    size: number;
  };
  fonte: 'OBRA_CIVIL' | 'ENGENHARIA_MECANICA' | 'ENGENHARIA_ELETRICA_HIDRAULICA';
  formulario_id: number;
}

interface AprovacaoDocumento {
  documento_id: number;
  tipo: string;
  nome: string;
  aprovado: boolean | null;
  motivo_reprovacao: string;
  fonte: string;
  formulario_id: number;
}

interface FormularioRevisaoProjetosProps {
  numeroOpd: string;
  opd?: string;
  atividadeId?: number;
  onSubmit: () => void;
  onCancel: () => void;
}

const FONTE_LABELS: Record<string, { label: string; cor: string; bg: string; border: string }> = {
  'OBRA_CIVIL': {
    label: 'Obra Civil',
    cor: 'text-blue-900',
    bg: 'bg-blue-50',
    border: 'border-blue-300'
  },
  'ENGENHARIA_MECANICA': {
    label: 'Engenharia Mecânica',
    cor: 'text-green-900',
    bg: 'bg-green-50',
    border: 'border-green-300'
  },
  'ENGENHARIA_ELETRICA_HIDRAULICA': {
    label: 'Engenharia Elétrica/Hidráulica',
    cor: 'text-orange-900',
    bg: 'bg-orange-50',
    border: 'border-orange-300'
  }
};

export default function FormularioRevisaoProjetos({
  numeroOpd,
  opd,
  atividadeId,
  onSubmit,
  onCancel,
}: FormularioRevisaoProjetosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [aprovacoes, setAprovacoes] = useState<AprovacaoDocumento[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numero = numeroOpd || opd || '';

  // Carregar documentos das 3 tarefas anteriores
  useEffect(() => {
    carregarDocumentos();
  }, [numero]);

  const carregarDocumentos = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar documentos de cada tipo
      const tipos = ['OBRA_CIVIL', 'ENGENHARIA_MECANICA', 'ENGENHARIA_ELETRICA_HIDRAULICA'];
      const todosDocumentos: Documento[] = [];
      let docId = 0;

      for (const tipo of tipos) {
        try {
          const response = await fetch(`/api/formularios-documentos/${numero}?tipo=${tipo}`);
          const result = await response.json();

          if (result.success && result.data?.dados_formulario) {
            const dados = typeof result.data.dados_formulario === 'string'
              ? JSON.parse(result.data.dados_formulario)
              : result.data.dados_formulario;

            if (dados.documentos && Array.isArray(dados.documentos)) {
              dados.documentos.forEach((doc: any) => {
                if (doc.arquivo) {
                  todosDocumentos.push({
                    id: docId++,
                    tipo: tipo,
                    nome: doc.nome || 'Documento sem nome',
                    arquivo: doc.arquivo,
                    fonte: tipo as 'OBRA_CIVIL' | 'ENGENHARIA_MECANICA' | 'ENGENHARIA_ELETRICA_HIDRAULICA',
                    formulario_id: result.data.id
                  });
                }
              });
            }
          }
        } catch (err) {
          console.warn(`Nenhum documento encontrado para ${tipo}`);
        }
      }

      setDocumentos(todosDocumentos);

      // Inicializar aprovações
      setAprovacoes(todosDocumentos.map(doc => ({
        documento_id: doc.id,
        tipo: doc.tipo,
        nome: doc.nome,
        aprovado: null,
        motivo_reprovacao: '',
        fonte: doc.fonte,
        formulario_id: doc.formulario_id
      })));

    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
      setError('Erro ao carregar documentos para revisão');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovacaoChange = (docId: number, aprovado: boolean) => {
    setAprovacoes(prev => prev.map(a =>
      a.documento_id === docId
        ? { ...a, aprovado, motivo_reprovacao: aprovado ? '' : a.motivo_reprovacao }
        : a
    ));
  };

  const handleMotivoChange = (docId: number, motivo: string) => {
    setAprovacoes(prev => prev.map(a =>
      a.documento_id === docId ? { ...a, motivo_reprovacao: motivo } : a
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que todos os documentos foram avaliados
    const naoAvaliados = aprovacoes.filter(a => a.aprovado === null);
    if (naoAvaliados.length > 0) {
      setError(`Existem ${naoAvaliados.length} documento(s) que ainda não foram avaliados`);
      return;
    }

    // Validar que reprovados têm motivo
    const reprovadosSemMotivo = aprovacoes.filter(a => a.aprovado === false && !a.motivo_reprovacao.trim());
    if (reprovadosSemMotivo.length > 0) {
      setError('Todos os documentos reprovados devem ter um motivo');
      return;
    }

    // Obter usuário
    const userDataString = localStorage.getItem('user_data');
    let preenchidoPor = 'Sistema';
    if (userDataString) {
      try {
        const usuario = JSON.parse(userDataString);
        preenchidoPor = usuario.nome || preenchidoPor;
      } catch {}
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/formularios-revisao-projetos/${numero}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: {
            aprovacoes,
            observacoes_gerais: observacoesGerais,
            total_documentos: documentos.length,
            total_aprovados: aprovacoes.filter(a => a.aprovado === true).length,
            total_reprovados: aprovacoes.filter(a => a.aprovado === false).length,
          },
          preenchido_por: preenchidoPor,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSubmit();
      } else {
        setError(result.error || 'Erro ao salvar revisão');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar revisão');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Função para abrir documento (converte data URL para blob se necessário)
  const abrirDocumento = (url: string, filename: string) => {
    if (url.startsWith('data:')) {
      // Converter data URL para blob e abrir
      try {
        const [header, base64Data] = url.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        // Limpar URL após um tempo
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (err) {
        console.error('Erro ao abrir documento:', err);
        // Fallback: tentar abrir diretamente
        window.open(url, '_blank');
      }
    } else {
      // URL normal
      window.open(url, '_blank');
    }
  };

  // Agrupar documentos por fonte
  const documentosPorFonte = documentos.reduce((acc, doc) => {
    if (!acc[doc.fonte]) acc[doc.fonte] = [];
    acc[doc.fonte].push(doc);
    return acc;
  }, {} as Record<string, Documento[]>);

  const totalAprovados = aprovacoes.filter(a => a.aprovado === true).length;
  const totalReprovados = aprovacoes.filter(a => a.aprovado === false).length;
  const totalPendentes = aprovacoes.filter(a => a.aprovado === null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-3 text-gray-600">Carregando documentos...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <h3 className="font-bold text-lg text-purple-900">Revisão Final de Projetos</h3>
        <p className="text-sm text-gray-600 mt-1">
          Revise e aprove cada documento anexado nas etapas anteriores.
        </p>
        <p className="text-sm font-semibold mt-2">OPD: {numero}</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-700">{documentos.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-green-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{totalAprovados}</p>
          <p className="text-xs text-green-600">Aprovados</p>
        </div>
        <div className="bg-red-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{totalReprovados}</p>
          <p className="text-xs text-red-600">Reprovados</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {documentos.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-yellow-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-yellow-800 font-semibold">Nenhum documento encontrado</p>
          <p className="text-sm text-yellow-600 mt-1">
            As tarefas de Obra Civil, Engenharia Mecânica e Engenharia Elétrica/Hidráulica ainda não possuem documentos anexados.
          </p>
        </div>
      ) : (
        /* Lista de Documentos por Fonte */
        Object.entries(documentosPorFonte).map(([fonte, docs]) => {
          const config = FONTE_LABELS[fonte];
          return (
            <div key={fonte} className={`border-2 ${config.border} rounded-lg overflow-hidden`}>
              <div className={`${config.bg} px-4 py-3`}>
                <h4 className={`font-bold ${config.cor}`}>{config.label}</h4>
                <p className="text-xs text-gray-600">{docs.length} documento(s)</p>
              </div>

              <div className="divide-y divide-gray-200">
                {docs.map((doc) => {
                  const aprovacao = aprovacoes.find(a => a.documento_id === doc.id);
                  return (
                    <div key={doc.id} className="p-4 bg-white">
                      <div className="flex items-start gap-4">
                        {/* Info do documento */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900">{doc.nome}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-sm text-gray-500 truncate">{doc.arquivo.filename}</p>
                                <span className="text-xs text-gray-400">({formatFileSize(doc.arquivo.size)})</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => abrirDocumento(doc.arquivo.url, doc.arquivo.filename)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Visualizar
                            </button>
                          </div>

                          {/* Checkbox de aprovação */}
                          <div className="mt-4 flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`aprovacao_${doc.id}`}
                                checked={aprovacao?.aprovado === true}
                                onChange={() => handleAprovacaoChange(doc.id, true)}
                                className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">Aprovado</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`aprovacao_${doc.id}`}
                                checked={aprovacao?.aprovado === false}
                                onChange={() => handleAprovacaoChange(doc.id, false)}
                                className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">Reprovado</span>
                            </label>
                          </div>

                          {/* Campo de motivo para reprovação */}
                          {aprovacao?.aprovado === false && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-red-700 mb-1">
                                Motivo da reprovação: <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={aprovacao.motivo_reprovacao}
                                onChange={(e) => handleMotivoChange(doc.id, e.target.value)}
                                rows={2}
                                placeholder="Descreva o motivo da reprovação e o que precisa ser corrigido..."
                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                required
                              />
                            </div>
                          )}

                          {/* Status visual */}
                          {aprovacao && aprovacao.aprovado !== null && (
                            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                              aprovacao.aprovado
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {aprovacao.aprovado ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Documento aprovado
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Documento reprovado - aguardando correção
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Observações Gerais */}
      {documentos.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações Gerais (opcional)
          </label>
          <textarea
            value={observacoesGerais}
            onChange={(e) => setObservacoesGerais(e.target.value)}
            rows={3}
            placeholder="Observações adicionais sobre a revisão dos projetos..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || documentos.length === 0 || totalPendentes > 0}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </>
          ) : (
            'Concluir Revisão'
          )}
        </button>
      </div>
    </form>
  );
}
