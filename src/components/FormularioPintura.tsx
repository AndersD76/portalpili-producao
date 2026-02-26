'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioPinturaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioPintura({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioPinturaProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const [imagensFaltando, setImagensFaltando] = useState<string[]>([]);

  // Campos que exigem imagem obrigatória
  const CAMPOS_COM_IMAGEM = ['cq11t2'];

  // Mapa de opcoes das perguntas carregadas do banco (codigo -> opcoes)
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    // T1 - PREPARAÇÃO (6 itens)
    cq1t1_status: '', // RESPINGOS DE SOLDA
    cq2t1_status: '', // PONTOS COM GRAXARIA
    cq3t1_status: '', // SOLDAS REVISADAS
    cq4t1_status: '', // COMPONENTES DA SUB PLATAFORMA CONFORME PROJETO
    cq5t1_status: '', // SOLDAS LIBERADAS
    cq6t1_status: '', // VERIFICAÇÃO DE CHAPAS (CALHAS E CHAPAS PISO) EMPENADAS

    // T2 - PINTURA (12 itens)
    cq1t2_status: '', // ISOLAMENTO DOS COMPONENTES
    cq2t2_marca_tinta: '', // MARCA DA TINTA (texto)
    cq3t2_lote_tinta: '', // LOTE DA TINTA (texto)
    cq4t2_validade_tinta: '', // VALIDADE DA TINTA (texto)
    cq5t2_marca_fosfatizante: '', // MARCA DO FOSFATIZANTE (texto)
    cq6t2_status: '', // APLICAÇÃO DO FOSFATIZANTE
    cq7t2_espessura_umida: '', // ESPESSURA DA TINTA ÚMIDA (texto)
    cq8t2_espessura_seca: '', // ESPESSURA TINTA SECA (texto)
    cq9t2_status: '', // MÉTODO DA APLICAÇÃO DE TINTA
    cq10t2_status: '', // VERIFICAR PINTURA GERAL (SUPERIOR E INFERIOR)
    cq11t2_status: '', // ADERÊNCIA
    cq11t2_imagem: null as { filename: string; url: string; size: number }[] | null,
    cq12t2_status: '', // ADESIVAÇÃO GERAL
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Carregar dados existentes (rascunho ou formulário anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-pintura/${opd}?atividade_id=${atividadeId}`);
        const result = await response.json();

        if (result.success && result.data?.dados_formulario) {
          const dados = typeof result.data.dados_formulario === 'string'
            ? JSON.parse(result.data.dados_formulario)
            : result.data.dados_formulario;

          // Verificar se é rascunho
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
        console.log('Nenhum formulário existente encontrado');
      } finally {
        setLoadingDados(false);
      }
    };

    carregarDadosExistentes();
  }, [atividadeId, opd]);

  // Carregar opcoes das perguntas do banco de dados
  useEffect(() => {
    const carregarPerguntasDB = async () => {
      try {
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/T');
        const data = await response.json();

        if (data.success && data.data?.perguntas) {
          const opcoesMap: Record<string, string[]> = {};
          data.data.perguntas.forEach((p: { codigo: string; opcoes: string[] }) => {
            const codigoUpper = p.codigo.toUpperCase();
            if (p.opcoes && Array.isArray(p.opcoes)) {
              opcoesMap[codigoUpper] = p.opcoes;
            }
          });
          setPerguntasOpcoes(opcoesMap);
        }
      } catch (err) {
        console.error('[FormularioPintura] Erro ao carregar perguntas:', err);
      }
    };

    carregarPerguntasDB();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Ao preencher um campo _status, registrar qual usuario fez e quando
    if (name.endsWith('_status') && value) {
      const base = name.replace('_status', '');
      setFormData(prev => ({
        ...prev,
        [name]: value,
        [`${base}_usuario`]: getUsuario(),
        [`${base}_data`]: new Date().toISOString(),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(prev => ({ ...prev, [fieldName]: true }));

    try {
      const uploadedFiles: { filename: string; url: string; size: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('tipo', 'controle_qualidade_pintura');
        formDataUpload.append('numero_opd', opd);

        const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({ filename: result.filename, url: result.url, size: file.size });
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
      const response = await fetch(`/api/formularios-pintura/${opd}`, {
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
        toast.success('Rascunho salvo com sucesso! Você pode continuar depois.');
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

    // Validar imagens obrigatórias
    const faltando = CAMPOS_COM_IMAGEM.filter(campo => {
      const imagens = (formData as any)[`${campo}_imagem`];
      return !imagens || (Array.isArray(imagens) && imagens.length === 0);
    });
    if (faltando.length > 0) {
      setImagensFaltando(faltando);
      const label = faltando[0].toUpperCase().replace(/^(CQ\d+)(T\d?)$/, '$1-$2');
      toast.error(`Imagem obrigatória faltando! ${label} requer foto.`);
      const el = document.querySelector(`[data-field="${faltando[0]}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setImagensFaltando([]);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios-pintura/${opd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: getUsuario(),
          is_rascunho: false
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Formulário salvo com sucesso!');
        onSubmit(formData);
      } else {
        setError(result.error || 'Erro ao salvar formulário');
      }
    } catch (err) {
      setError('Erro ao salvar formulário');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderCQField = (label: string, fieldName: string, criterio: string, hasNaoAplicavel = false) => {
    // Extrair codigo da pergunta do fieldName (ex: cq1t1 -> CQ1-T1, cq1t2 -> CQ1-T2)
    const codigo = fieldName.toUpperCase().replace(/^(CQ\d+)(T\d?)$/, '$1-$2');

    // Buscar opcoes do banco de dados ou usar fallback
    const opcoesDB = perguntasOpcoes[codigo];
    const opcoes = opcoesDB || (hasNaoAplicavel
      ? ['Conforme', 'Não conforme', 'Não Aplicável']
      : ['Conforme', 'Não conforme']);

    return (
      <div className="border rounded-lg p-4 bg-white mb-3">
        <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
        <p className="text-sm text-blue-700 mb-2">Critérios: {criterio}</p>
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
      </div>
    );
  };

  const renderTextField = (label: string, fieldName: string) => (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <input
        type="text"
        name={fieldName}
        value={(formData as any)[fieldName]}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        placeholder="Digite aqui..."
      />
    </div>
  );

  // Loading inicial
  if (loadingDados) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-gray-600">Carregando formulário...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* Indicador de rascunho */}
      {isRascunhoExistente && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Este formulário contém dados de um rascunho anterior</span>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">CQ-T: PINTURA E PREPARAÇÃO - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      {/* T1 - PREPARAÇÃO */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-xl mb-4 text-orange-900">T1 - PREPARAÇÃO</h4>

        {renderCQField('CQ1-T1: RESPINGOS DE SOLDA', 'cq1t1', 'Sem respingos', true)}
        {renderCQField('CQ2-T1: PONTOS COM GRAXARIA', 'cq2t1', 'Sem graxa', true)}
        {renderCQField('CQ3-T1: SOLDAS REVISADAS', 'cq3t1', 'Revisadas', true)}
        {renderCQField('CQ4-T1: COMPONENTES DA SUB PLATAFORMA CONFORME PROJETO', 'cq4t1', 'Conforme projeto', true)}
        {renderCQField('CQ5-T1: SOLDAS LIBERADAS', 'cq5t1', 'Liberadas', true)}
        {renderCQField('CQ6-T1: VERIFICAÇÃO DE CHAPAS EMPENADAS', 'cq6t1', 'Sem empenamento', true)}
      </div>

      {/* T2 - PINTURA */}
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">T2 - PINTURA</h4>

        {renderCQField('CQ1-T2: ISOLAMENTO DOS COMPONENTES', 'cq1t2', 'Isolados')}
        {renderTextField('CQ2-T2: MARCA DA TINTA', 'cq2t2_marca_tinta')}
        {renderTextField('CQ3-T2: LOTE DA TINTA', 'cq3t2_lote_tinta')}
        {renderTextField('CQ4-T2: VALIDADE DA TINTA', 'cq4t2_validade_tinta')}
        {renderTextField('CQ5-T2: MARCA DO FOSFATIZANTE', 'cq5t2_marca_fosfatizante')}
        {renderCQField('CQ6-T2: APLICAÇÃO DO FOSFATIZANTE', 'cq6t2', 'Aplicado corretamente')}
        {renderTextField('CQ7-T2: ESPESSURA DA TINTA ÚMIDA', 'cq7t2_espessura_umida')}
        {renderTextField('CQ8-T2: ESPESSURA TINTA SECA', 'cq8t2_espessura_seca')}
        {renderCQField('CQ9-T2: MÉTODO DA APLICAÇÃO DE TINTA', 'cq9t2', 'Conforme especificação')}
        {renderCQField('CQ10-T2: VERIFICAR PINTURA GERAL (SUPERIOR E INFERIOR)', 'cq10t2', 'Sem falhas', true)}

        {/* CQ11-T2 com imagem */}
        <div className="border rounded-lg p-4 bg-white mb-3" data-field="cq11t2">
          <h5 className="font-bold text-gray-900 mb-2">CQ11-T2: ADERÊNCIA</h5>
          <p className="text-sm text-blue-700 mb-2">Critérios: Teste de aderência aprovado</p>
          <select
            name="cq11t2_status"
            value={formData.cq11t2_status}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-3"
          >
            <option value="">Selecione</option>
            {(perguntasOpcoes['CQ11-T2'] || ['Conforme', 'Não conforme']).map((opcao) => (
              <option key={opcao} value={opcao}>{opcao}</option>
            ))}
          </select>
          <label className="block text-sm font-semibold mb-2">
            Anexar Imagem <span className="text-red-500">* obrigatória</span>
          </label>
          <div className={`border-2 border-dashed rounded-lg p-4 ${
            imagensFaltando.includes('cq11t2') ? 'border-red-500 ring-2 ring-red-300 bg-red-50' : 'border-gray-300'
          }`}>
            <input
              ref={(el) => { fileInputRefs.current['cq11t2_imagem'] = el; }}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e, 'cq11t2_imagem')}
              className="hidden"
            />
            <button type="button" onClick={() => fileInputRefs.current['cq11t2_imagem']?.click()} className="w-full flex flex-col items-center py-2">
              {uploadingImages['cq11t2_imagem'] ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
              ) : (
                <span className="text-sm text-gray-600">
                  {formData.cq11t2_imagem && formData.cq11t2_imagem.length > 0
                    ? `${formData.cq11t2_imagem.length} arquivo(s) selecionado(s)`
                    : 'Clique para anexar imagem do teste de aderência'}
                </span>
              )}
            </button>
          </div>
        </div>

        {renderCQField('CQ12-T2: ADESIVAÇÃO GERAL', 'cq12t2', 'Conforme especificação')}
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
              <span>Finalizar CQ-T</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
