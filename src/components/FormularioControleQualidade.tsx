'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioControleQualidadeProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioControleQualidade({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioControleQualidadeProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);

  const [formData, setFormData] = useState({
    // CQ1-A: MEDIDA TOTAL DE CORTE DA VIGA (não requer imagem)
    cq1a_status: '',

    // CQ2-A: VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA (não requer imagem)
    cq2a_status: '',

    // CQ3-A: VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (requer imagem)
    cq3a_status: '',
    cq3a_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ1-B: MEDIDA DA MONTAGEM INICIAL (requer imagem)
    cq1b_status: '',
    cq1b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ2-B: ESQUADRO (não requer imagem)
    cq2b_status: '',

    // CQ3-B: POSICIONAMENTO DO TRAVA CHASSI (não requer imagem)
    cq3b_status: '',

    // CQ4-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23691 (não requer imagem)
    cq4b_status: '',

    // CQ5-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23789 (não requer imagem)
    cq5b_status: '',

    // CQ6-B: MONTAGEM DA MÃO FRANCESA E PRESENÇA DE OLHAL
    cq6b_status: '',
    cq6b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ7-B: SOLDA DA MÃO FRANCESA DE APOIO DO TRAVA RODAS
    cq7b_status: '',
    cq7b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ8-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS COD. 23694
    cq8b_status: '',
    cq8b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ9-B: FECHAMENTO FRONTAL GRADEADO COD. 24845
    cq9b_status: '',
    cq9b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ10-B: MONTAGEM DA BARRA CHATA NO LAVRADO COD. 23103
    cq10b_status: '',
    cq10b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ11-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS PARA BARRA REDONDA COD 25623
    cq11b_status: '',
    cq11b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ12-B: CONFERIR BARRAS REDONDAS SE ESTÃO POSICIONADAS CORRETAMENTE
    cq12b_status: '',
    cq12b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ13-B: MONTAGEM DO REFORÇO TRANSVERSAL PARA ASSOALHO
    cq13b_status: '',
    cq13b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ14-B: MONTAGEM DE PERFIL 50X70 CONFORME DESENHO ASSINADO
    cq14b_status: '',
    cq14b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ15-B: MONTAGEM DE REFORÇOS SUPERIORES
    cq15b_status: '',
    cq15b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ16-B: SOLDA DE REFORÇOS SUPERIORES
    cq16b_status: '',
    cq16b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ17-B: SOLDA DO REFORÇO DO PISO COM PERFIL 50X70 PARTE SUPERIOR
    cq17b_status: '',
    cq17b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ18-B: MONTAGEM TAMPA TRAVA RODAS CHAPA PISO COD. 23698
    cq18b_status: '',
    cq18b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ19-B: SOLDA TAMPA TRAVA RODAS
    cq19b_status: '',
    cq19b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ20-B: SOLDA EMENDAS DAS VIGAS INFERIORES
    cq20b_status: '',
    cq20b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ21-B: SOLDA EMENDA DAS VIGAS SUPERIORES
    cq21b_status: '',
    cq21b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ22-B: OLHAL DE IÇAMENTO CONFORME DESENHO COD. 23694
    cq22b_status: '',
    cq22b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ23-B: MONTAGEM CHAPA DE DESCIDA RÁPIDA
    cq23b_status: '',
    cq23b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ24-B: SOLDA CHAPA DE DESCIDA RÁPIDA
    cq24b_status: '',
    cq24b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ25-B: SOLDA OLHAL DE IÇAMENTO (SOLDA A SUBIR)
    cq25b_status: '',
    cq25b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ26-B: VERIFICAR SE ARTICULADOR DE 2" ESTA MONTADO COD. 12570
    cq26b_status: '',
    cq26b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ27-B: MONTAGEM CHAPA 1050X3000 COD. 23806
    cq27b_status: '',
    cq27b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ28-B: SOLDA CHAPA 1050X2980
    cq28b_status: '',
    cq28b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ29-B: MONTAGEM SUPORTE CALHAS (ETAPA 5, COD. 27948, 27949 E 27958)
    cq29b_status: '',
    cq29b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ30-B: SOLDA SUPORTE CALHAS
    cq30b_status: '',
    cq30b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ31-B: MONTAGEM TAMPA DE PROTEÇÃO TRAVA CHASSI
    cq31b_status: '',
    cq31b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ32-B: SOLDA TAMPA DE PROTEÇÃO TRAVA CHASSI
    cq32b_status: '',
    cq32b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ33-B: SUPORTE PARA TRAVA PINOS
    cq33b_status: '',
    cq33b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ34-B: SOLDA SUPORTE TRAVA PINO
    cq34b_status: '',
    cq34b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ35-B: MONTAGEM SUPORTE CALÇO MECÂNICO
    cq35b_status: '',
    cq35b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ36-B: SOLDA SUPORTES CALÇO MECÂNICO
    cq36b_status: '',
    cq36b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ37-B: VERIFICAR SE PARAFUSOS QUE SEGURAM A CALHA ESTÃO NA POSIÇÃO
    cq37b_status: '',
    cq37b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ38-B: MONTAGEM PISO
    cq38b_status: '',
    cq38b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ39-B: SOLDA PISO
    cq39b_status: '',
    cq39b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ40-B: POSICIONAMENTO DE TRILHOS
    cq40b_status: '',
    cq40b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ41-B: SOLDA TRILHOS
    cq41b_status: '',
    cq41b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ42-B: POSICIONAMENTO TRAVA CINTAS (ETAPA 3 COD. 20137 E 26299)
    cq42b_status: '',
    cq42b_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ43-B: SOLDA TRAVA CINTAS
    cq43b_status: '',
    cq43b_imagem: null as { filename: string; url: string; size: number }[] | null,
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Carregar dados existentes (rascunho ou formulario anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-controle-qualidade/${opd}?atividade_id=${atividadeId}`);
        const result = await response.json();

        if (result.success && result.data?.dados_formulario) {
          const dados = typeof result.data.dados_formulario === 'string'
            ? JSON.parse(result.data.dados_formulario)
            : result.data.dados_formulario;

          // Verificar se e rascunho
          if (dados._is_rascunho) {
            setIsRascunhoExistente(true);
            toast.info('Rascunho carregado. Continue de onde parou.');
          }

          // Remover campo interno _is_rascunho antes de usar
          const { _is_rascunho, ...dadosFormulario } = dados;

          setFormData(prev => ({
            ...prev,
            ...dadosFormulario
          }));
        }
      } catch (err) {
        console.log('Nenhum formulario existente encontrado');
      } finally {
        setLoadingDados(false);
      }
    };

    carregarDadosExistentes();
  }, [atividadeId, opd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(prev => ({ ...prev, [fieldName]: true }));

    try {
      const uploadedFiles: { filename: string; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('tipo', 'controle_qualidade');
        uploadFormData.append('numero_opd', opd);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({
            filename: result.filename,
            url: result.url,
            size: file.size
          });
        } else {
          throw new Error(result.error || 'Erro ao fazer upload');
        }
      }

      // Adicionar aos arquivos existentes
      const existingFiles = (formData as any)[fieldName] || [];
      setFormData(prev => ({ ...prev, [fieldName]: [...existingFiles, ...uploadedFiles] }));
      toast.success(`${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload de arquivos');
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldName]: false }));
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRefs.current[fieldName]) {
        fileInputRefs.current[fieldName]!.value = '';
      }
    }
  };

  const handleRemoveFile = (fieldName: string, index: number) => {
    const currentFiles = (formData as any)[fieldName] || [];
    const newFiles = currentFiles.filter((_: any, i: number) => i !== index);
    setFormData(prev => ({ ...prev, [fieldName]: newFiles.length > 0 ? newFiles : null }));
  };

  const getUsuario = () => {
    const userDataString = localStorage.getItem('user_data');
    if (userDataString) {
      try {
        const usuario = JSON.parse(userDataString);
        return usuario.nome || 'Sistema';
      } catch {
        return 'Sistema';
      }
    }
    return 'Sistema';
  };

  const handleSalvarRascunho = async () => {
    setSavingDraft(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios-controle-qualidade/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: getUsuario(),
          is_rascunho: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsRascunhoExistente(true);
        toast.success('Rascunho salvo com sucesso! Voce pode continuar depois.');
      } else {
        setError(result.error || 'Erro ao salvar rascunho');
        toast.error('Erro ao salvar rascunho');
      }
    } catch (err) {
      setError('Erro ao salvar rascunho');
      toast.error('Erro ao salvar rascunho');
      console.error(err);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Salvar formulario via API (finalizado)
      const response = await fetch(`/api/formularios-controle-qualidade/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: getUsuario(),
          is_rascunho: false
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Formulario salvo com sucesso!');
        onSubmit(formData);
      } else {
        setError(result.error || 'Erro ao salvar formulario');
      }
    } catch (err) {
      setError('Erro ao salvar formulario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderCQField = (
    label: string,
    fieldName: string,
    description: string,
    criterio: string,
    hasNaoAplicavel = false,
    hasImage = false
  ) => (
    <div className="border rounded-lg p-4 bg-white mb-4">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <div className="text-sm text-gray-600 mb-3 space-y-1">
        <p>{description}</p>
        <p className="font-semibold text-blue-700">Critérios de aceitação: {criterio}</p>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold mb-2">Condição *</label>
        <select
          name={`${fieldName}_status`}
          value={(formData as any)[`${fieldName}_status`]}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="">Selecione</option>
          <option value="Conforme">Conforme</option>
          <option value="Não conforme">Não conforme</option>
          {hasNaoAplicavel && <option value="Não Aplicável">Não Aplicável</option>}
        </select>
      </div>

      {hasImage && (
        <div>
          <label className="block text-sm font-semibold mb-2">Anexar Imagem</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
            <input
              ref={(el) => { fileInputRefs.current[`${fieldName}_imagem`] = el; }}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => handleFileUpload(e, `${fieldName}_imagem`)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[`${fieldName}_imagem`]?.click()}
              className="w-full flex flex-col items-center py-3"
            >
              {uploadingImages[`${fieldName}_imagem`] ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Clique para adicionar imagens
                  </span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG, PDF (múltiplos arquivos)</span>
                </>
              )}
            </button>
          </div>
          {/* Preview de arquivos anexados */}
          {(formData as any)[`${fieldName}_imagem`] && (formData as any)[`${fieldName}_imagem`].length > 0 && (
            <div className="mt-3 space-y-2">
              {(formData as any)[`${fieldName}_imagem`].map((file: { filename: string; url: string; size: number }, index: number) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename || file.url);
                return (
                  <div key={index} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {isImage ? (
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-green-800 truncate">{file.filename}</p>
                        <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(`${fieldName}_imagem`, index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition ml-2"
                      title="Remover arquivo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Loading inicial
  if (loadingDados) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-gray-600">Carregando formulario...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Indicador de rascunho */}
      {isRascunhoExistente && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Este formulario contem dados de um rascunho anterior</span>
        </div>
      )}

      {/* Cabecalho */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">Controle de Qualidade - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO A - CORTE */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">ETAPA DO PROCESSO: VIGA - CORTE</h4>

        {renderCQField(
          'CQ1-A: MEDIDA TOTAL DE CORTE DA VIGA',
          'cq1a',
          'Avaliação: 100% | Medida crítica: Comprimento total (após esquadro pronto) | Método: Dimensional | Instrumento: Trena',
          '+/- 10 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ2-A: VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA',
          'cq2a',
          'Avaliação: 100% | Medida crítica: Medida de corte da aba e presença de chanfro | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ3-A: VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (IDENTIFICAÇÃO DA VIGA 72/82/92)',
          'cq3a',
          'Avaliação: 100% | Medida crítica: Comprimento e identificação das vigas | Método: Dimensional e Visual | Instrumento: Trena',
          '+/- 8 mm. Seguir conforme desenho.',
          false,
          true
        )}
      </div>

      {/* SEÇÃO B - MONTAGEM SUPERIOR E ESQUADRO */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-xl mb-4 text-blue-900">ETAPA DO PROCESSO: MONTAGEM SUPERIOR E ESQUADRO</h4>

        {renderCQField(
          'CQ1-B: MEDIDA DA MONTAGEM INICIAL (CONFORME DESENHO ETAPA 0)',
          'cq1b',
          'ETAPA DO PROCESSO: VIGA | Avaliação: 100% | Medida crítica: Comprimento; Largura | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          true
        )}

        {renderCQField(
          'CQ2-B: ESQUADRO',
          'cq2b',
          'ETAPA DO PROCESSO: VIGA | Avaliação: 100% | Medida crítica: Comprimento; Ângulo | Método: Dimensional | Instrumento: Trena; Esquadro',
          '+/- 5 mm; +/- 1 grau',
          false,
          false
        )}

        {renderCQField(
          'CQ3-B: POSICIONAMENTO DO TRAVA CHASSI COD.24569 (CONFORME DESENHO ETAPA 0)',
          'cq3b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Comprimento | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ4-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23691 (CONFORME DESENHO ETAPA 1)',
          'cq4b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Comprimento | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ5-B: POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23789 (CONFORME DESENHO ETAPA 1)',
          'cq5b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Comprimento | Método: Dimensional | Instrumento: Trena',
          '+/- 5 mm',
          false,
          false
        )}

        {renderCQField(
          'CQ6-B: MONTAGEM DA MÃO FRANCESA E PRESENÇA DE OLHAL (COD. 23709 NO APOIO TRAVA RODAS)',
          'cq6b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ7-B: SOLDA DA MÃO FRANCESA DE APOIO DO TRAVA RODAS',
          'cq7b',
          'ETAPA DO PROCESSO: SOLDA | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ8-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS COD. 23694 (CONFORME DESENHO ETAPA 1)',
          'cq8b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Espaçamento entre grampos; Quantidade de grampos | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 2 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ9-B: FECHAMENTO FRONTAL GRADEADO COD. 24845',
          'cq9b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ10-B: MONTAGEM DA BARRA CHATA NO LAVRADO COD. 23103',
          'cq10b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ11-B: POSICIONAMENTO E ESPAÇAMENTO DOS GRAMPOS PARA BARRA REDONDA COD 25623 (CONFORME DESENHO ETAPA 1)',
          'cq11b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Espaçamento entre grampos; Quantidade de grampos | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ12-B: CONFERIR BARRAS REDONDAS SE ESTÃO POSICIONADAS CORRETAMENTE',
          'cq12b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Espaçamento entre grampos; Quantidade de grampos | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ13-B: MONTAGEM DO REFORÇO TRANSVERSAL PARA ASSOALHO (CONFORME MEDIDAS DESENHO ETAPA 1)',
          'cq13b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ14-B: MONTAGEM DE PERFIL 50X70 CONFORME DESENHO ASSINADO',
          'cq14b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Dimensional; Visual | Instrumento: Trena',
          '+/- 5 mm; Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ15-B: MONTAGEM DE REFORÇOS SUPERIORES (CONFORME DESENHO)',
          'cq15b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ16-B: SOLDA DE REFORÇOS SUPERIORES',
          'cq16b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ17-B: SOLDA DO REFORÇO DO PISO COM PERFIL 50X70 PARTE SUPERIOR',
          'cq17b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ18-B: MONTAGEM TAMPA TRAVA RODAS CHAPA PISO COD. 23698',
          'cq18b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ19-B: SOLDA TAMPA TRAVA RODAS',
          'cq19b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ20-B: SOLDA EMENDAS DAS VIGAS INFERIORES',
          'cq20b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          true,
          true
        )}

        {renderCQField(
          'CQ21-B: SOLDA EMENDA DAS VIGAS SUPERIORES',
          'cq21b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ22-B: OLHAL DE IÇAMENTO CONFORME DESENHO COD. 23694',
          'cq22b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme Desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ23-B: MONTAGEM CHAPA DE DESCIDA RÁPIDA',
          'cq23b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ24-B: SOLDA CHAPA DE DESCIDA RÁPIDA',
          'cq24b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          true,
          true
        )}

        {renderCQField(
          'CQ25-B: SOLDA OLHAL DE IÇAMENTO (SOLDA A SUBIR)',
          'cq25b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ26-B: VERIFICAR SE ARTICULADOR DE 2" ESTA MONTADO COD. 12570',
          'cq26b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme Desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ27-B: MONTAGEM CHAPA 1050X3000 COD. 23806',
          'cq27b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ28-B: SOLDA CHAPA 1050X2980',
          'cq28b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ29-B: MONTAGEM SUPORTE CALHAS (ETAPA 5, COD. 27948, 27949 E 27958)',
          'cq29b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: Gabarito',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ30-B: SOLDA SUPORTE CALHAS',
          'cq30b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ31-B: MONTAGEM TAMPA DE PROTEÇÃO TRAVA CHASSI',
          'cq31b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ32-B: SOLDA TAMPA DE PROTEÇÃO TRAVA CHASSI',
          'cq32b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ33-B: SUPORTE PARA TRAVA PINOS',
          'cq33b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ34-B: SOLDA SUPORTE TRAVA PINO',
          'cq34b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ35-B: MONTAGEM SUPORTE CALÇO MECÂNICO',
          'cq35b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true,
          true
        )}

        {renderCQField(
          'CQ36-B: SOLDA SUPORTES CALÇO MECÂNICO',
          'cq36b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          true,
          true
        )}

        {renderCQField(
          'CQ37-B: VERIFICAR SE PARAFUSOS QUE SEGURAM A CALHA ESTÃO NA POSIÇÃO',
          'cq37b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Posição; Quantidade de parafusos | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ38-B: MONTAGEM PISO',
          'cq38b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Deformações; Ondulações no piso | Método: Visual | Instrumento: N/A',
          'Conforme o desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ39-B: SOLDA PISO',
          'cq39b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ40-B: POSICIONAMENTO DE TRILHOS',
          'cq40b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Esquadro | Método: Dimensional | Instrumento: Esquadro',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ41-B: SOLDA TRILHOS',
          'cq41b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}

        {renderCQField(
          'CQ42-B: POSICIONAMENTO TRAVA CINTAS (ETAPA 3 COD. 20137 E 26299)',
          'cq42b',
          'ITEM: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          false,
          true
        )}

        {renderCQField(
          'CQ43-B: SOLDA TRAVA CINTAS',
          'cq43b',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Trinca; Porosidade | Método: Visual | Instrumento: N/A',
          'Sem trinca; Sem porosidade',
          false,
          true
        )}
      </div>

      {/* Botoes */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 border-t sticky bottom-0 bg-white py-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
          disabled={loading || savingDraft}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSalvarRascunho}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
          disabled={loading || savingDraft}
        >
          {savingDraft ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Salvar Rascunho</span>
            </>
          )}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
          disabled={loading || savingDraft}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Finalizando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Finalizar Controle</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
