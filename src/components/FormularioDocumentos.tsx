'use client';

import { useState, useRef } from 'react';

interface Documento {
  nome: string;
  arquivo: {
    filename: string;
    url: string;
    size: number;
  } | null;
}

interface FormularioDocumentosProps {
  titulo: string;
  subtitulo: string;
  cor: 'blue' | 'green' | 'orange';
  numeroOpd: string;
  atividadeId?: number;
  onSubmit: () => void;
  onCancel: () => void;
}

const CORES = {
  blue: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    title: 'text-blue-900',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  green: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    title: 'text-green-900',
    button: 'bg-green-600 hover:bg-green-700',
  },
  orange: {
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    title: 'text-orange-900',
    button: 'bg-orange-600 hover:bg-orange-700',
  },
};

export default function FormularioDocumentos({
  titulo,
  subtitulo,
  cor,
  numeroOpd,
  atividadeId,
  onSubmit,
  onCancel,
}: FormularioDocumentosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([
    { nome: '', arquivo: null }
  ]);
  const [observacoes, setObservacoes] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const cores = CORES[cor];

  const adicionarDocumento = () => {
    setDocumentos([...documentos, { nome: '', arquivo: null }]);
  };

  const removerDocumento = (index: number) => {
    if (documentos.length > 1) {
      const novosDocumentos = documentos.filter((_, i) => i !== index);
      setDocumentos(novosDocumentos);
    }
  };

  const atualizarNome = (index: number, nome: string) => {
    const novosDocumentos = [...documentos];
    novosDocumentos[index].nome = nome;
    setDocumentos(novosDocumentos);
  };

  const handleFileUpload = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validar tipo de arquivo
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      alert('Por favor, selecione um arquivo PDF ou imagem');
      return;
    }

    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', 'documento');
      formData.append('numero_opd', numeroOpd);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const novosDocumentos = [...documentos];
        novosDocumentos[index].arquivo = {
          filename: result.filename,
          url: result.url,
          size: file.size,
        };
        // Se o nome estiver vazio, usar o nome do arquivo
        if (!novosDocumentos[index].nome) {
          novosDocumentos[index].nome = file.name.replace(/\.[^/.]+$/, '');
        }
        setDocumentos(novosDocumentos);
      } else {
        alert('Erro ao fazer upload: ' + result.error);
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que há pelo menos um documento com arquivo
    const documentosValidos = documentos.filter(d => d.arquivo !== null);
    if (documentosValidos.length === 0) {
      setError('Adicione pelo menos um documento');
      return;
    }

    // Obter usuário
    const userDataString = localStorage.getItem('user_data');
    let preenchidoPor = responsavel || 'Sistema';
    if (userDataString) {
      try {
        const usuario = JSON.parse(userDataString);
        preenchidoPor = usuario.nome || preenchidoPor;
      } catch {}
    }

    setLoading(true);
    try {
      // Mapear tipo de formulário baseado no título
      let tipoFormulario = 'DOCUMENTOS';
      if (titulo.includes('Obra Civil')) {
        tipoFormulario = 'OBRA_CIVIL';
      } else if (titulo.includes('Mecânica')) {
        tipoFormulario = 'ENGENHARIA_MECANICA';
      } else if (titulo.includes('Elétrica')) {
        tipoFormulario = 'ENGENHARIA_ELETRICA_HIDRAULICA';
      }

      const response = await fetch(`/api/formularios-documentos/${numeroOpd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          tipo_formulario: tipoFormulario,
          dados_formulario: {
            documentos: documentosValidos,
            observacoes,
          },
          preenchido_por: preenchidoPor,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSubmit();
      } else {
        setError(result.error || 'Erro ao salvar formulário');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar formulário');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className={`border-2 ${cores.border} rounded-lg p-4 ${cores.bg}`}>
        <h3 className={`font-bold text-lg ${cores.title}`}>{titulo}</h3>
        <p className="text-sm text-gray-600 mt-1">{subtitulo}</p>
        <p className="text-sm font-semibold mt-2">OPD: {numeroOpd}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Lista de Documentos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Documentos</h4>
          <button
            type="button"
            onClick={adicionarDocumento}
            className={`px-3 py-1.5 ${cores.button} text-white text-sm rounded-lg flex items-center gap-1`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Documento
          </button>
        </div>

        {documentos.map((doc, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                {/* Nome do documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Documento
                  </label>
                  <input
                    type="text"
                    value={doc.nome}
                    onChange={(e) => atualizarNome(index, e.target.value)}
                    placeholder="Ex: Projeto Estrutural, Memorial de Cálculo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Upload de arquivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arquivo (PDF ou Imagem)
                  </label>

                  {doc.arquivo ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                      <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.arquivo.filename}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(doc.arquivo.size)}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={doc.arquivo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Visualizar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const novosDocumentos = [...documentos];
                            novosDocumentos[index].arquivo = null;
                            setDocumentos(novosDocumentos);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Remover arquivo"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        onChange={(e) => handleFileUpload(index, e.target.files)}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={uploadingIndex === index}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {uploadingIndex === index ? (
                          <>
                            <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-blue-600">Enviando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-gray-600">Clique para selecionar arquivo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão remover documento */}
              {documentos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removerDocumento(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remover documento"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações (opcional)
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Observações adicionais sobre os documentos..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Responsável */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Responsável
        </label>
        <input
          type="text"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Nome do responsável pelo preenchimento"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 ${cores.button} text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2`}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </>
          ) : (
            'Salvar Documentos'
          )}
        </button>
      </div>
    </form>
  );
}
