'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioControleQualidadeCentralProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioControleQualidadeCentral({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioControleQualidadeCentralProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);
  const [imagensFaltando, setImagensFaltando] = useState<string[]>([]);

  // Campos que requerem imagem obrigatoria
  const CAMPOS_COM_IMAGEM = [
    'cq3c', 'cq4c', 'cq5c', 'cq6c', 'cq7c', 'cq8c', 'cq9c',
    'cq10c', 'cq11c', 'cq12c', 'cq13c', 'cq14c', 'cq15c',
  ];

  // Mapa de opções das perguntas carregadas do banco (código -> opções)
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});
  // Mapa de tipo de resposta (código -> tipoResposta)
  const [perguntasTipoResposta, setPerguntasTipoResposta] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // CQ1-C: MOTOR LIVRE COM PESO DA BOMBA
    cq1c_status: '',

    // CQ2-C: VERIFICAR ACOPLAMENTO DOS MOTORES
    cq2c_status: '',

    // CQ3-C: VERIFICAR ADAPTADORES DOS BLOCOS
    cq3c_status: '',
    cq3c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ4-C: ASPECTO VISUAL DAS MANGUEIRAS
    cq4c_status: '',
    cq4c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ5-C: APERTO DAS CONEXÕES DAS MANGUEIRAS
    cq5c_status: '',
    cq5c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ6-C: INSPECIONAR VISOR DE NÍVEL
    cq6c_status: '',
    cq6c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ7-C: INSPECIONAR MONTAGEM ELÉTRICA DE FORÇA
    cq7c_status: '',
    cq7c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ8-C: LIMPEZA GERAL / GRAXA / POEIRAS / MARCAS
    cq8c_status: '',
    cq8c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ9-C: ALINHAMENTO DE COMPONENTES MONTADOS
    cq9c_status: '',
    cq9c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ10-C: PONTO DE ATERRAMENTO NOS MOTORES
    cq10c_status: '',
    cq10c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ11-C: MOTORES ADEQUADOS À TENSÃO E FREQUÊNCIA
    cq11c_status: '',
    cq11c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ12-C: CIRCUITO HIDRÁULICO CONFORME O PROJETO
    cq12c_status: '',
    cq12c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ13-C: APERTO DA MANGUEIRA INTERNA DO CONJUNTO FLANGE/MOTOR/BOMBA
    cq13c_status: '',
    cq13c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ14-C: APERTO DO TAMPÃO DO DRENO
    cq14c_status: '',
    cq14c_imagem: null as { filename: string; url: string; size: number }[] | null,

    // CQ15-C: VERIFICAR APLICAÇÃO DO ÓLEO PROTETIVO
    cq15c_status: '',
    cq15c_imagem: null as { filename: string; url: string; size: number }[] | null,
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
        const response = await fetch(`/api/formularios-controle-qualidade-central/${opd}?atividade_id=${atividadeId}`);
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

  // Carregar opções das perguntas do banco de dados (Setor C)
  useEffect(() => {
    let isMounted = true;

    const carregarPerguntasDB = async () => {
      try {
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/C');

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
        console.error('[CQ-Central] ERRO ao carregar perguntas:', err);
        if (isMounted) {
          setLoadingOpcoes(false);
        }
      }
    };

    carregarPerguntasDB();

    return () => { isMounted = false; };
  }, []);

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
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'controle_qualidade_central');
        formData.append('numero_opd', opd);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
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

      setFormData(prev => ({ ...prev, [fieldName]: uploadedFiles }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload de arquivos');
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldName]: false }));
    }
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
      const response = await fetch(`/api/formularios-controle-qualidade-central/${opd}`, {
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

    // Validar imagens obrigatorias
    const faltando = CAMPOS_COM_IMAGEM.filter(campo => {
      const imagens = (formData as any)[`${campo}_imagem`];
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
    setError(null);

    try {
      // Salvar formulario via API (finalizado)
      const response = await fetch(`/api/formularios-controle-qualidade-central/${opd}`, {
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
    hasImage = false
  ) => {
    // Extrair código da pergunta do fieldName (ex: cq3c -> CQ3-C)
    const codigo = fieldName.toUpperCase().replace(/^(CQ\d+)([A-Z])$/, '$1-$2');

    // Buscar opções e tipo de resposta do banco de dados
    const opcoesDB = perguntasOpcoes[codigo];
    const tipoResposta = perguntasTipoResposta[codigo] || 'select';
    const opcoes = opcoesDB || ['Conforme', 'Não conforme'];

    // Verificar se é texto livre
    const isTextoLivre = tipoResposta === 'texto_livre' || tipoResposta === 'texto';

    const imagemFaltando = hasImage && imagensFaltando.includes(fieldName);

    return (
    <div data-field={fieldName} className={`border rounded-lg p-4 bg-white mb-4 ${imagemFaltando ? 'border-red-500 ring-2 ring-red-300' : ''}`}>
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <div className="text-sm text-gray-600 mb-3 space-y-1">
        <p>{description}</p>
        <p className="font-semibold text-blue-700">Critérios de aceitação: {criterio}</p>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold mb-2">Condição *</label>
        {isTextoLivre ? (
          <input
            type="text"
            name={`${fieldName}_status`}
            value={(formData as any)[`${fieldName}_status`] || ''}
            onChange={handleChange}
            required
            placeholder="Digite o valor medido..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
        ) : (
          <select
            name={`${fieldName}_status`}
            value={(formData as any)[`${fieldName}_status`]}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">Selecione</option>
            {opcoes.map((opcao) => (
              <option key={opcao} value={opcao}>{opcao}</option>
            ))}
          </select>
        )}
      </div>

      {hasImage && (
        <div>
          <label className="block text-sm font-semibold mb-2">
            Anexar Imagem <span className="text-red-600">* obrigatória</span>
          </label>
          <div className={`border-2 border-dashed rounded-lg p-4 hover:border-red-500 transition ${imagemFaltando ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
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
                    {(formData as any)[`${fieldName}_imagem`] && (formData as any)[`${fieldName}_imagem`].length > 0
                      ? `${(formData as any)[`${fieldName}_imagem`].length} arquivo(s) selecionado(s)`
                      : 'Clique para selecionar imagens'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG, PDF (múltiplos arquivos)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
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
        <h3 className="font-bold text-lg mb-2">Controle de Qualidade - Central Hidraulica</h3>
        <p className="text-gray-700">OPD: {opd} | CLIENTE: {cliente}</p>
      </div>

      {/* SEÇÃO C - CENTRAL HIDRÁULICA */}
      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">ETAPA DO PROCESSO: CENTRAL HIDRÁULICA</h4>

        {renderCQField(
          'CQ1-C: MOTOR LIVRE COM PESO DA BOMBA',
          'cq1c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Ventoinha | Método: Funcional (verificar se ventoinha está trancada; girar ventoinha com a mão) | Instrumento: N/A',
          'Ventoinha girar'
        )}

        {renderCQField(
          'CQ2-C: VERIFICAR ACOPLAMENTO DOS MOTORES',
          'cq2c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Distância do acoplamento de um lado para o outro | Método: Dimensional | Instrumento: Trena',
          '+/- 1 mm'
        )}

        {renderCQField(
          'CQ3-C: VERIFICAR ADAPTADORES DOS BLOCOS',
          'cq3c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true
        )}

        {renderCQField(
          'CQ4-C: ASPECTO VISUAL DAS MANGUEIRAS',
          'cq4c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Integridade | Método: Visual | Instrumento: N/A',
          'Íntegro',
          true
        )}

        {renderCQField(
          'CQ5-C: APERTO DAS CONEXÕES DAS MANGUEIRAS',
          'cq5c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: N/A | Método: Visual | Instrumento: N/A',
          'Conexões firmes',
          true
        )}

        {renderCQField(
          'CQ6-C: INSPECIONAR VISOR DE NÍVEL',
          'cq6c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Vedação | Método: Visual (verificar se tem vedação de borracha) | Instrumento: N/A',
          'Com vedação de borracha',
          true
        )}

        {renderCQField(
          'CQ7-C: INSPECIONAR MONTAGEM ELÉTRICA DE FORÇA',
          'cq7c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Ligação elétrica do motor | Método: Visual (verificar ligações elétricas) | Instrumento: N/A',
          'Conforme desenho',
          true
        )}

        {renderCQField(
          'CQ8-C: LIMPEZA GERAL / GRAXA / POEIRAS / MARCAS',
          'cq8c',
          'ETAPA DO PROCESSO: LIMPEZA | Avaliação: 100% | Medida crítica: Limpo; Graxa; Poeira; Marcas | Método: Visual | Instrumento: N/A',
          'Limpo; Sem graxa; Sem poeira; Sem marcas',
          true
        )}

        {renderCQField(
          'CQ9-C: ALINHAMENTO DE COMPONENTES MONTADOS',
          'cq9c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Alinhamento | Método: Visual | Instrumento: Visual',
          'Componentes alinhados',
          true
        )}

        {renderCQField(
          'CQ10-C: PONTO DE ATERRAMENTO NOS MOTORES',
          'cq10c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Aterramento dos motores | Método: Visual (certificar se foi realizada a ligação do aterramento no motor) | Instrumento: N/A',
          'Ligação de aterramento realizada',
          true
        )}

        {renderCQField(
          'CQ11-C: MOTORES ADEQUADOS À TENSÃO E FREQUÊNCIA FORNECIDAS PELO CLIENTE',
          'cq11c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Tensão; Frequência | Método: Visual (verificar as placas dos motores) | Instrumento: N/A',
          'Conforme especificado na reunião de START',
          true
        )}

        {renderCQField(
          'CQ12-C: CIRCUITO HIDRÁULICO CONFORME O PROJETO',
          'cq12c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Circuito hidráulico | Método: Visual | Instrumento: N/A',
          'Conforme desenho',
          true
        )}

        {renderCQField(
          'CQ13-C: APERTO DA MANGUEIRA INTERNA DO CONJUNTO FLANGE/MOTOR/BOMBA',
          'cq13c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Aperto da mangueira interna | Método: Visual | Instrumento: N/A',
          'Mangueira apertada',
          true
        )}

        {renderCQField(
          'CQ14-C: APERTO DO TAMPÃO DO DRENO',
          'cq14c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Aperto do tampão do dreno | Método: Visual | Instrumento: N/A',
          'Tampão apertado',
          true
        )}

        {renderCQField(
          'CQ15-C: VERIFICAR APLICAÇÃO DO ÓLEO PROTETIVO NA PARTE INTERNA DA CENTRAL',
          'cq15c',
          'ETAPA DO PROCESSO: MONTAGEM | Avaliação: 100% | Medida crítica: Aplicação do óleo protetivo | Método: Visual | Instrumento: N/A',
          'Óleo protetivo aplicado',
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
