'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioTravadorRodasProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioTravadorRodas({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioTravadorRodasProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);

  // Mapa de opcoes das perguntas carregadas do banco (codigo -> opcoes)
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    // CQ1-I a CQ18-I
    cq1i_status: '', // PRESSÃO DE ABERTURA LATERAL DO CILINDRO (NÃO PASSAR DE 30 BAR)
    cq2i_status: '', // REGULAGEM DA PRESSÃO DA VÁLVULA DE ALIVIO ABERTURA LATERAL
    cq3i_status: '', // REGULAGEM DO PRESSOSTATO DE TRAÇÃO DO CILINDRO PRINCIPAL (55 BAR)
    cq4i_status: '', // REGULAGEM DE TRAÇÃO DO CILINDRO PRINCIPAL (65 BAR)
    cq5i_status: '', // TESTE PRESSÃO VÁLVULA DE RETENÇÃO
    cq6i_status: '', // TESTE DE FUNCIONAMENTO DA ESTEIRA
    cq7i_status: '', // APERTO PARAFUSO ALEN DA ASTE PRINCIPAL
    cq8i_status: '', // LUBRIFICAR GRAXEIRA ASTE PRINCIPAL
    cq9i_status: '', // LUBRIFICAR GRAXEIRA ASTE PRINCIPAL (duplicado no original)
    cq10i_status: '', // LUBRIFICAÇÃO DO MUNHÃO DO CILINDRO PRINCIPAL
    cq11i_status: '', // APERTO PARAFUSO DO OLHAIS DO MUNHÃO DO CILINDRO PRINCIPAL
    cq12i_status: '', // APERTO PARAFUSO DA ESTEIRA REGULAGEM DE GUIAS INFERIORES
    cq13i_status: '', // PARAFUSO DO OLHAL DO CILINDRO PRINCIPAL
    cq14i_status: '', // VERIFICAR PASSAGEM DOS PINOS DE FIXAÇÃO NA PLATAFORMA
    cq15i_status: '', // ACABAMENTO DAS SOLDAS
    cq16i_status: '', // ACABAMENTO DE PINTURA
    cq17i_status: '', // VERIFICAR CONDIÇÕES FÍSICAS DA HASTE DO CILINDRO
    cq18i_status: '', // VERIFICAR SE A HASTE DO CILINDRO ESTA RECOLHIDA PARA TRANSPORTE
  });

  // Carregar dados existentes (rascunho ou formulário anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-travador-rodas/${opd}?atividade_id=${atividadeId}`);
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
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/I');
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
        console.error('[FormularioTravadorRodas] Erro ao carregar perguntas:', err);
      }
    };

    carregarPerguntasDB();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const response = await fetch(`/api/formularios-travador-rodas/${opd}`, {
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
      const response = await fetch(`/api/formularios-travador-rodas/${opd}`, {
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
    // Extrair codigo da pergunta do fieldName (ex: cq1i -> CQ1-I)
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
        <h3 className="font-bold text-lg mb-2">CQ-I: TRAVADOR DE RODAS LATERAL MÓVEL - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">I - TRAVADOR DE RODAS LATERAL MÓVEL</h4>

        {renderCQField('CQ1-I: PRESSÃO DE ABERTURA LATERAL DO CILINDRO', 'cq1i', '30 BAR +/- 10 BAR')}
        {renderCQField('CQ2-I: REGULAGEM DA PRESSÃO DA VÁLVULA DE ALÍVIO', 'cq2i', 'Conforme especificação')}
        {renderCQField('CQ3-I: REGULAGEM DO PRESSOSTATO DE TRAÇÃO', 'cq3i', '55 BAR +/- 10 BAR')}
        {renderCQField('CQ4-I: REGULAGEM DE TRAÇÃO DO CILINDRO PRINCIPAL', 'cq4i', '65 BAR +/- 10 BAR')}
        {renderCQField('CQ5-I: TESTE PRESSÃO VÁLVULA DE RETENÇÃO', 'cq5i', 'Sem vazamento')}
        {renderCQField('CQ6-I: TESTE DE FUNCIONAMENTO DA ESTEIRA', 'cq6i', 'Funcional')}
        {renderCQField('CQ7-I: APERTO PARAFUSO ALLEN DA HASTE PRINCIPAL', 'cq7i', 'Torque conforme especificação')}
        {renderCQField('CQ8-I: LUBRIFICAR GRAXEIRA HASTE PRINCIPAL (1)', 'cq8i', 'Lubrificado')}
        {renderCQField('CQ9-I: LUBRIFICAR GRAXEIRA HASTE PRINCIPAL (2)', 'cq9i', 'Lubrificado')}
        {renderCQField('CQ10-I: LUBRIFICAÇÃO DO MUNHÃO DO CILINDRO PRINCIPAL', 'cq10i', 'Lubrificado')}
        {renderCQField('CQ11-I: APERTO PARAFUSO DOS OLHAIS DO MUNHÃO', 'cq11i', 'Torque conforme especificação')}
        {renderCQField('CQ12-I: APERTO PARAFUSO DA ESTEIRA', 'cq12i', 'Torque conforme especificação')}
        {renderCQField('CQ13-I: PARAFUSO DO OLHAL DO CILINDRO PRINCIPAL', 'cq13i', 'Conforme desenho')}
        {renderCQField('CQ14-I: PASSAGEM DOS PINOS DE FIXAÇÃO', 'cq14i', 'Conforme desenho')}
        {renderCQField('CQ15-I: ACABAMENTO DAS SOLDAS', 'cq15i', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ16-I: ACABAMENTO DE PINTURA', 'cq16i', 'Sem falhas')}
        {renderCQField('CQ17-I: CONDIÇÕES FÍSICAS DA HASTE DO CILINDRO', 'cq17i', 'Íntegra')}
        {renderCQField('CQ18-I: HASTE DO CILINDRO RECOLHIDA PARA TRANSPORTE', 'cq18i', 'Recolhida')}
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
              <span>Finalizar Controle</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
