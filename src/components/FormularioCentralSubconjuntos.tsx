'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioCentralSubconjuntosProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioCentralSubconjuntos({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioCentralSubconjuntosProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);

  // Mapa de opcoes das perguntas carregadas do banco (codigo -> opcoes)
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    cq1m_status: '', // MONTAGEM DO RESERVATORIO
    cq2m_status: '', // OLHAL DE IÇAMENTO
    cq3m_status: '', // MONTAGEM VISOR DE NIVEL
    cq4m_status: '', // VERIFICAR MONTAGEM E ESQUADRO DO RESERVATÓRIO
    cq5m_status: '', // MONTAGEM DAS CHICANAS
    cq6m_status: '', // PARTE INTERNA JANELA DE INSPEÇÃO
    cq7m_status: '', // VERIFICAR A QUALIDADE DA SOLDA INTERNA DO RESERVATÓRIO
    cq8m_status: '', // FLANGE 3 CV
    cq9m_status: '', // FLANGE 4 CV
    cq10m_status: '', // FLANGE 10 / 15 CV
    cq11m_status: '', // FLANGE 20 / 25 / 30 CV
    cq12m_status: '', // FLANGE 50 CV
    cq13m_status: '', // VERIFICAR LIMPEZA INTERNA DO RESERVATÓRIO
    cq14m_status: '', // VERIFICAR A CORRETA MONTAGEM DOS COMPONENTES NA TAMPA
    cq15m_status: '', // VERIFICAR ALINHAMENTO DOS PARAFUSOS DO FLANGE
    cq16m_status: '', // PARTE INFERIOR DA TAMPA (SOLDAGEM DOS TUBOS)
    cq17m_status: '', // TESTE DE FALHA DE SOLDA LP (LIQUIDO PENETRANTE)
  });

  // Carregar dados existentes (rascunho ou formulário anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-central-subconjuntos/${opd}?atividade_id=${atividadeId}`);
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
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/M');
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
        console.error('[FormularioCentralSubconjuntos] Erro ao carregar perguntas:', err);
      }
    };

    carregarPerguntasDB();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const response = await fetch(`/api/formularios-central-subconjuntos/${opd}`, {
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
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios-central-subconjuntos/${opd}`, {
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
    // Extrair codigo da pergunta do fieldName (ex: cq1m -> CQ1-M)
    const codigo = fieldName.toUpperCase().replace(/^(CQ\d+)([A-Z])$/, '$1-$2');

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
        <h3 className="font-bold text-lg mb-2">CQ-M: CENTRAL HIDRÁULICA (SUBCONJUNTOS) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">M - CENTRAL HIDRÁULICA (SETOR SUBCONJUNTOS)</h4>

        {renderCQField('CQ1-M: MONTAGEM DO RESERVATÓRIO', 'cq1m', 'Conforme desenho')}
        {renderCQField('CQ2-M: OLHAL DE IÇAMENTO', 'cq2m', 'Conforme desenho')}
        {renderCQField('CQ3-M: MONTAGEM VISOR DE NÍVEL', 'cq3m', 'Conforme desenho')}
        {renderCQField('CQ4-M: MONTAGEM E ESQUADRO DO RESERVATÓRIO', 'cq4m', '+/- 5 mm')}
        {renderCQField('CQ5-M: MONTAGEM DAS CHICANAS', 'cq5m', 'Conforme desenho')}
        {renderCQField('CQ6-M: PARTE INTERNA JANELA DE INSPEÇÃO', 'cq6m', 'Limpa; Sem rebarbas')}
        {renderCQField('CQ7-M: QUALIDADE DA SOLDA INTERNA DO RESERVATÓRIO', 'cq7m', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ8-M: FLANGE 3 CV', 'cq8m', 'Conforme desenho', true)}
        {renderCQField('CQ9-M: FLANGE 4 CV', 'cq9m', 'Conforme desenho', true)}
        {renderCQField('CQ10-M: FLANGE 10 / 15 CV', 'cq10m', 'Conforme desenho', true)}
        {renderCQField('CQ11-M: FLANGE 20 / 25 / 30 CV', 'cq11m', 'Conforme desenho', true)}
        {renderCQField('CQ12-M: FLANGE 50 CV', 'cq12m', 'Conforme desenho', true)}
        {renderCQField('CQ13-M: LIMPEZA INTERNA DO RESERVATÓRIO', 'cq13m', 'Limpo')}
        {renderCQField('CQ14-M: CORRETA MONTAGEM DOS COMPONENTES NA TAMPA', 'cq14m', 'Conforme desenho')}
        {renderCQField('CQ15-M: ALINHAMENTO DOS PARAFUSOS DO FLANGE', 'cq15m', 'Alinhados')}
        {renderCQField('CQ16-M: PARTE INFERIOR DA TAMPA (SOLDAGEM DOS TUBOS)', 'cq16m', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ17-M: TESTE DE FALHA DE SOLDA LP (LÍQUIDO PENETRANTE)', 'cq17m', 'Aprovado')}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 border-t sticky bottom-0 bg-white py-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm" disabled={loading || savingDraft}>
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
