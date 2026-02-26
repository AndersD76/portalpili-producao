'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioColetorCentralHidraulicaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioColetorCentralHidraulica({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioColetorCentralHidraulicaProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});
  const [perguntasTipoResposta, setPerguntasTipoResposta] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    cq1bc_status: '', // VISOR DE NIVEL ALINHADO
    cq2bc_status: '', // VEDAÇÃO DO VISOR
    cq3bc_status: '', // BOCAL DE ENCHIMENTO
    cq4bc_status: '', // SUPORTE MOTOR CONFORME DESENHO
    cq5bc_status: '', // BLOCO MANIFOLD CONFORME DESENHO
    cq6bc_status: '', // APERTO DO DRENO
    cq7bc_status: '', // REGULAGEM PRESSÃO DA BOMBA: 120BAR
    cq8bc_status: '', // MONTAGEM DA LINHA DE PRESSÃO
    cq9bc_status: '', // MONTAGEM DA LINHA DE RETORNO
    cq10bc_status: '', // BOMBA DE 5,5
    cq11bc_status: '', // MOTOR DE 3CV
    cq12bc_status: '', // FREQUENCIA PADRÃO 60hz
  });

  // Carregar dados existentes (rascunho ou formulario anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-coletor-central-hidraulica/${opd}?atividade_id=${atividadeId}`);
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

  // Carregar opções das perguntas do banco de dados (Setor Bc)
  useEffect(() => {
    let isMounted = true;
    const carregarPerguntasDB = async () => {
      try {
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/Bc');
        if (!isMounted) return;
        const data = await response.json();
        const opcoesMap: Record<string, string[]> = {};
        const tipoRespostaMap: Record<string, string> = {};
        if (data.success && data.data?.perguntas) {
          data.data.perguntas.forEach((p: { codigo: string; opcoes: string[]; tipoResposta?: string }) => {
            const codigoUpper = p.codigo.toUpperCase();
            if (p.opcoes && Array.isArray(p.opcoes)) opcoesMap[codigoUpper] = p.opcoes;
            if (p.tipoResposta) tipoRespostaMap[codigoUpper] = p.tipoResposta;
          });
        }
        if (isMounted) {
          setPerguntasOpcoes(opcoesMap);
          setPerguntasTipoResposta(tipoRespostaMap);
          setLoadingOpcoes(false);
        }
      } catch (err) {
        console.error('[CQ-SectorBc] ERRO ao carregar perguntas:', err);
        if (isMounted) setLoadingOpcoes(false);
      }
    };
    carregarPerguntasDB();
    return () => { isMounted = false; };
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
      const response = await fetch(`/api/formularios-coletor-central-hidraulica/${opd}`, {
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
      const response = await fetch(`/api/formularios-coletor-central-hidraulica/${opd}`, {
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

  const renderCQField = (label: string, fieldName: string, criterio: string) => {
    const codigo = fieldName.toUpperCase();
    const opcoesDB = perguntasOpcoes[codigo];
    const opcoes = opcoesDB || ['Conforme', 'Não conforme', 'Não Aplicável'];

    return (
      <div className="border rounded-lg p-4 bg-white mb-3">
        <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
        <p className="text-sm text-blue-700 mb-2">Critérios: {criterio}</p>
        <select
          name={`${fieldName}_status`}
          value={(formData as any)[`${fieldName}_status`]}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
        <p className="text-gray-600">Carregando formulario...</p>
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
          <span>Este formulario contem dados de um rascunho anterior</span>
        </div>
      )}

      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
        <h3 className="font-bold text-lg mb-2">CQ-Bc: CENTRAL HIDRAULICA (COLETOR) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">COLETORES DE GRÃOS</span>
      </div>

      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">Bc - CENTRAL HIDRÁULICA</h4>

        {renderCQField('CQ1-Bc: VISOR DE NÍVEL ALINHADO', 'cq1bc', 'Alinhado')}
        {renderCQField('CQ2-Bc: VEDAÇÃO DO VISOR', 'cq2bc', 'Sem vazamento')}
        {renderCQField('CQ3-Bc: BOCAL DE ENCHIMENTO', 'cq3bc', 'Conforme especificação')}
        {renderCQField('CQ4-Bc: SUPORTE MOTOR CONFORME DESENHO', 'cq4bc', 'Conforme desenho')}
        {renderCQField('CQ5-Bc: BLOCO MANIFOLD CONFORME DESENHO', 'cq5bc', 'Conforme desenho')}
        {renderCQField('CQ6-Bc: APERTO DO DRENO', 'cq6bc', 'Apertado')}
        {renderCQField('CQ7-Bc: REGULAGEM PRESSÃO DA BOMBA: 120BAR', 'cq7bc', '120 BAR')}
        {renderCQField('CQ8-Bc: MONTAGEM DA LINHA DE PRESSÃO', 'cq8bc', 'Conforme projeto')}
        {renderCQField('CQ9-Bc: MONTAGEM DA LINHA DE RETORNO', 'cq9bc', 'Conforme projeto')}
        {renderCQField('CQ10-Bc: BOMBA DE 5,5', 'cq10bc', 'Correta')}
        {renderCQField('CQ11-Bc: MOTOR DE 3CV', 'cq11bc', 'Correto')}
        {renderCQField('CQ12-Bc: FREQUÊNCIA PADRÃO 60Hz', 'cq12bc', '60Hz')}
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
              <span>Finalizar CQ-Bc</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
