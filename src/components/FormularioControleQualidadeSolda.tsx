'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioControleQualidadeSoldaProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

// Type for saved images (from database)
type SavedImage = { filename: string; url: string; size: number };
// Type for image field that can hold either File[] or saved images
type ImageField = File[] | SavedImage[] | null;

export default function FormularioControleQualidadeSolda({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioControleQualidadeSoldaProps) {
  const [formData, setFormData] = useState({
    // CQ1-D - REFORÇOS EMENDA DAS VIGAS
    cq1d_status: '',

    // CQ2-D - SOLDA REFORÇOS VIGAS
    cq2d_status: '',
    cq2d_imagem: null as ImageField,

    // CQ3-D - REFORÇOS TRAVA CINTAS
    cq3d_status: '',

    // CQ4-D - SOLDA REFORÇOS TRAVA CINTAS
    cq4d_status: '',
    cq4d_imagem: null as ImageField,

    // CQ5-D - SOLDA CAIXA TRAVA CHASSI 24569
    cq5d_status: '',
    cq5d_imagem: null as ImageField,

    // CQ6-D - SOLDA TRAVA RODAS E ENCAIXE DOS CILINDROS
    cq6d_status: '',
    cq6d_imagem: null as ImageField,

    // CQ7-D - POSICIONAMENTO BATENTE DE DESCIDA
    cq7d_status: '',
    cq7d_imagem: null as ImageField,

    // CQ8-D - SOLDA BATENTE DE DESCIDA
    cq8d_status: '',
    cq8d_imagem: null as ImageField,

    // CQ9-D - SOLDA GRAMPOS E BARRA REDONDAS
    cq9d_status: '',
    cq9d_imagem: null as ImageField,

    // CQ10-D - SOLDA FECHAMENTO FRONTAL GRADEADO
    cq10d_status: '',
    cq10d_imagem: null as ImageField,

    // CQ11-D - SOLDA DA BARRA CHATA NO LAVRADO
    cq11d_status: '',
    cq11d_imagem: null as ImageField,

    // CQ12-D - SOLDA REFORÇO TRANVERSAL PARA ASSOALHO
    cq12d_status: '',
    cq12d_imagem: null as ImageField,

    // CQ13-D - SOLDA CHAPA 1050 X 3000
    cq13d_status: '',
    cq13d_imagem: null as ImageField,

    // CQ14-D - SOLDA PISO
    cq14d_status: '',
    cq14d_imagem: null as ImageField,

    // CQ15-D - SOLDA EMENDA VIGAS
    cq15d_status: '',
    cq15d_imagem: null as ImageField,

    // CQ16-D - CHAPA DE FECHAMENTO DIANTEIRA
    cq16d_status: '',
    cq16d_imagem: null as ImageField,

    // CQ17-D - CHAPA DE FECHAMENTO TRASEIRA
    cq17d_status: '',
    cq17d_imagem: null as ImageField,
  });

  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);
  const [imagensFaltando, setImagensFaltando] = useState<string[]>([]);

  // Campos que requerem imagem obrigatoria
  const CAMPOS_COM_IMAGEM = [
    'cq2d', 'cq4d', 'cq5d', 'cq6d', 'cq7d', 'cq8d', 'cq9d',
    'cq10d', 'cq11d', 'cq12d', 'cq13d', 'cq14d', 'cq15d', 'cq16d', 'cq17d',
  ];

  // Mapa de opções das perguntas carregadas do banco (código -> opções)
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});
  // Mapa de tipo de resposta (código -> tipoResposta)
  const [perguntasTipoResposta, setPerguntasTipoResposta] = useState<Record<string, string>>({});

  const fileInputRefs = {
    cq2d: useRef<HTMLInputElement>(null),
    cq4d: useRef<HTMLInputElement>(null),
    cq5d: useRef<HTMLInputElement>(null),
    cq6d: useRef<HTMLInputElement>(null),
    cq7d: useRef<HTMLInputElement>(null),
    cq8d: useRef<HTMLInputElement>(null),
    cq9d: useRef<HTMLInputElement>(null),
    cq10d: useRef<HTMLInputElement>(null),
    cq11d: useRef<HTMLInputElement>(null),
    cq12d: useRef<HTMLInputElement>(null),
    cq13d: useRef<HTMLInputElement>(null),
    cq14d: useRef<HTMLInputElement>(null),
    cq15d: useRef<HTMLInputElement>(null),
    cq16d: useRef<HTMLInputElement>(null),
    cq17d: useRef<HTMLInputElement>(null),
  };

  // Carregar dados existentes (rascunho ou formulario anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-controle-qualidade-solda/${opd}?atividade_id=${atividadeId}`);
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

  // Carregar opções das perguntas do banco de dados (Setor D - Solda)
  useEffect(() => {
    let isMounted = true;

    const carregarPerguntasDB = async () => {
      try {
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/D');
        if (!isMounted) return;

        const data = await response.json();
        const opcoesMap: Record<string, string[]> = {};
        const tipoRespostaMap: Record<string, string> = {};

        if (data.success && data.data?.perguntas) {
          data.data.perguntas.forEach((p: { codigo: string; opcoes: string[]; tipoResposta?: string }) => {
            const codigoUpper = p.codigo.toUpperCase();
            if (p.opcoes && Array.isArray(p.opcoes)) {
              opcoesMap[codigoUpper] = p.opcoes;
            }
            if (p.tipoResposta) {
              tipoRespostaMap[codigoUpper] = p.tipoResposta;
            }
          });
        }

        if (isMounted) {
          setPerguntasOpcoes(opcoesMap);
          setPerguntasTipoResposta(tipoRespostaMap);
          setLoadingOpcoes(false);
        }
      } catch (err) {
        console.error('[CQ-Solda] ERRO ao carregar perguntas:', err);
        if (isMounted) {
          setLoadingOpcoes(false);
        }
      }
    };

    carregarPerguntasDB();
    return () => { isMounted = false; };
  }, []);

  const handleFileChange = async (field: string, files: FileList | null) => {
    if (files && files.length > 0) {
      // Convert files to base64 for preview and storage
      const fileArray: SavedImage[] = [];
      for (const file of Array.from(files)) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        fileArray.push({
          filename: file.name,
          url: base64,
          size: file.size
        });
      }

      // Merge with existing images
      const existingImages = (formData[field as keyof typeof formData] as SavedImage[] | null) || [];
      const mergedImages = [...existingImages, ...fileArray];

      setFormData(prev => ({
        ...prev,
        [field]: mergedImages
      }));
    }
  };

  // Helper to check if image is a saved image (not File)
  const isSavedImage = (img: File | SavedImage): img is SavedImage => {
    return 'url' in img && 'filename' in img;
  };

  // Helper to remove image from field
  const removeImage = (field: string, index: number) => {
    const images = formData[field as keyof typeof formData] as ImageField;
    if (images && Array.isArray(images)) {
      const newImages = images.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        [field]: newImages.length > 0 ? newImages : null
      }));
    }
  };

  // Images are already stored as base64, just return them
  const processImages = (images: ImageField): SavedImage[] | null => {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return null;
    }
    // Images are already in SavedImage format with base64 URLs
    return images as SavedImage[];
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

  const handleStatusChange = (statusField: string, value: string) => {
    const base = statusField.replace('_status', '');
    setFormData(prev => ({
      ...prev,
      [statusField]: value,
      [`${base}_usuario`]: getUsuario(),
      [`${base}_data`]: new Date().toISOString(),
    }));
  };

  const handleSalvarRascunho = async () => {
    setSavingDraft(true);

    try {
      // Images are already in base64 format, just use formData directly
      const dados_formulario = {
        ...formData,
      };

      const response = await fetch(`/api/formularios-controle-qualidade-solda/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario,
          preenchido_por: getUsuario(),
          is_rascunho: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsRascunhoExistente(true);
        toast.success('Rascunho salvo com sucesso! Voce pode continuar depois.');
      } else {
        toast.error('Erro ao salvar rascunho');
      }
    } catch (err) {
      toast.error('Erro ao salvar rascunho');
      console.error(err);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar imagens obrigatorias
    const faltando = CAMPOS_COM_IMAGEM.filter(campo => {
      const imagens = formData[`${campo}_imagem` as keyof typeof formData];
      return !imagens || (Array.isArray(imagens) && imagens.length === 0);
    });

    if (faltando.length > 0) {
      setImagensFaltando(faltando);
      const label = faltando[0].toUpperCase().replace(/^(CQ\d+)([A-Z])$/, '$1-$2');
      toast.error(`Imagens obrigatórias faltando! ${faltando.length} check(s) sem imagem. Primeiro: ${label}`);
      const el = document.querySelector(`[data-field="${faltando[0]}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setImagensFaltando([]);

    setLoading(true);
    setUploadingImages(true);

    try {
      // Validar campos obrigatórios
      const requiredFields = [
        'cq1d_status', 'cq2d_status', 'cq3d_status', 'cq4d_status',
        'cq5d_status', 'cq6d_status', 'cq7d_status', 'cq8d_status',
        'cq9d_status', 'cq10d_status', 'cq11d_status', 'cq12d_status',
        'cq13d_status', 'cq14d_status', 'cq15d_status', 'cq16d_status',
        'cq17d_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          toast.warning(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          setUploadingImages(false);
          return;
        }
      }

      setUploadingImages(false);

      // Images are already in base64 format, just use formData directly
      const dados_formulario = {
        ...formData,
      };

      // Enviar formulario (finalizado)
      const response = await fetch(`/api/formularios-controle-qualidade-solda/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario,
          preenchido_por: getUsuario(),
          is_rascunho: false
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Formulario de Controle de Qualidade - Solda salvo com sucesso!');
        onSubmit();
      } else {
        throw new Error(result.error || 'Erro ao salvar formulario');
      }
    } catch (error) {
      console.error('Erro ao salvar formulario:', error);
      toast.error('Erro ao salvar formulario. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const renderCheckpoint = (
    id: string,
    title: string,
    description: string,
    hasImage: boolean = false,
    hasThreeOptions: boolean = false
  ) => {
    const statusField = `${id}_status`;
    const imageField = `${id}_imagem`;

    // Extrair código da pergunta (ex: cq3d -> CQ3-D)
    const codigo = id.toUpperCase().replace(/^(CQ\d+)([A-Z])$/, '$1-$2');

    // Buscar opções e tipo de resposta do banco de dados
    const opcoesDB = perguntasOpcoes[codigo];
    const tipoResposta = perguntasTipoResposta[codigo] || 'select';
    const opcoes = opcoesDB || (hasThreeOptions
      ? ['Conforme', 'Não conforme', 'Não Aplicável']
      : ['Conforme', 'Não conforme']);

    // Verificar se é texto livre
    const isTextoLivre = tipoResposta === 'texto_livre' || tipoResposta === 'texto';

    const imagemFaltando = hasImage && imagensFaltando.includes(id);

    return (
      <div data-field={id} className={`border-2 rounded-lg p-4 bg-gray-50 ${imagemFaltando ? 'border-red-500 ring-2 ring-red-300' : 'border-gray-300'}`}>
        <h4 className="font-bold text-lg mb-3 text-gray-900">{title}</h4>
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">{description}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status *
            </label>
            {isTextoLivre ? (
              <input
                type="text"
                value={formData[statusField as keyof typeof formData] as string || ''}
                onChange={(e) => handleStatusChange(statusField, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
                placeholder="Digite o valor medido..."
              />
            ) : (
              <select
                value={formData[statusField as keyof typeof formData] as string}
                onChange={(e) => handleStatusChange(statusField, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Selecione...</option>
                {opcoes.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            )}
          </div>

          {hasImage && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Anexar Imagem <span className="text-red-600">* obrigatória</span>
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 hover:border-red-500 transition ${imagemFaltando ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
                <input
                  ref={fileInputRefs[id as keyof typeof fileInputRefs]}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(imageField, e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs[id as keyof typeof fileInputRefs]?.current?.click()}
                  className="w-full flex flex-col items-center py-3"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {(formData[imageField as keyof typeof formData] as ImageField)?.length
                      ? `${(formData[imageField as keyof typeof formData] as ImageField)!.length} arquivo(s) - Clique para adicionar mais`
                      : 'Clique para selecionar imagens'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG (múltiplas imagens permitidas)</span>
                </button>
              </div>
              {/* Image preview grid */}
              {(formData[imageField as keyof typeof formData] as ImageField)?.length ? (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(formData[imageField as keyof typeof formData] as SavedImage[]).map((img, index) => (
                    <div key={index} className="relative border rounded-lg overflow-hidden bg-gray-50 group">
                      {img.url?.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(img.filename || '') ? (
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-gray-100">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(imageField, index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        title="Remover"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <p className="text-xs text-gray-600 p-1 truncate">{img.filename}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading inicial
  if (loadingDados || loadingOpcoes) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-gray-600">
          {loadingOpcoes ? 'Carregando opções...' : 'Carregando formulario...'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Indicador de rascunho */}
      {isRascunhoExistente && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Este formulario contem dados de um rascunho anterior</span>
        </div>
      )}

      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Controle de Qualidade - Solda Lado 1</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {renderCheckpoint(
          'cq1d',
          'CQ1-D. REFORÇOS EMENDA DAS VIGAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Reforços no esquadro
- Método de verificação: Dimensional
- Instrumento de medição: Trena; Esquadro
- Critérios de aceitação: Reforços nas emendas das vigas`
        )}

        {renderCheckpoint(
          'cq2d',
          'CQ2-D. SOLDA REFORÇOS VIGAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq3d',
          'CQ3-D. REFORÇOS TRAVA CINTAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Reforços no esquadro
- Método de verificação: Dimensional
- Instrumento de medição: Trena; Esquadro
- Critérios de aceitação: Reforços no esquadro`
        )}

        {renderCheckpoint(
          'cq4d',
          'CQ4-D. SOLDA REFORÇOS TRAVA CINTAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq5d',
          'CQ5-D. SOLDA CAIXA TRAVA CHASSI 24569',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq6d',
          'CQ6-D. SOLDA TRAVA RODAS E ENCAIXE DOS CILINDROS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq7d',
          'CQ7-D. POSICIONAMENTO BATENTE DE DESCIDA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Posição do batente
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Conforme desenho`,
          true
        )}

        {renderCheckpoint(
          'cq8d',
          'CQ8-D. SOLDA BATENTE DE DESCIDA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq9d',
          'CQ9-D. SOLDA GRAMPOS E BARRA REDONDAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq10d',
          'CQ10-D. SOLDA FECHAMENTO FRONTAL GRADEADO (24845)',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true,
          true // Has three options
        )}

        {renderCheckpoint(
          'cq11d',
          'CQ11-D. SOLDA DA BARRA CHATA NO LAVRADO',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq12d',
          'CQ12-D. SOLDA REFORÇO TRANVERSAL PARA ASSOALHO',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq13d',
          'CQ13-D. SOLDA CHAPA 1050 X 3000',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq14d',
          'CQ14-D. SOLDA PISO',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq15d',
          'CQ15-D. SOLDA EMENDA VIGAS',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq16d',
          'CQ16-D. CHAPA DE FECHAMENTO DIANTEIRA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}

        {renderCheckpoint(
          'cq17d',
          'CQ17-D. CHAPA DE FECHAMENTO TRASEIRA',
          `ETAPA DO PROCESSO: MONTAGEM
- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`,
          true
        )}
      </div>

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
          disabled={loading || savingDraft}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
        >
          {uploadingImages ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando imagens...</span>
            </>
          ) : loading ? (
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
