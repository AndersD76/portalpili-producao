'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioMontagemEletricaHidraulicaProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioMontagemEletricaHidraulica({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioMontagemEletricaHidraulicaProps) {
  const [formData, setFormData] = useState({
    cq1g_status: '',
    cq2g_status: '',
    cq3g_status: '',
    cq4g_status: '',
    cq5g_status: '',
    cq6g_status: '',
    cq7g_status: '',
    cq8g_status: '',
    cq9g_status: '',
    cq10g_status: '',
    cq11g_status: '',
    cq12g_status: '',
    cq13g_status: '',
    cq14g_status: '',
    cq15g_status: '',
    cq16g_status: '',
    cq17g_status: '',
    cq18g_status: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);
  const [perguntasOpcoes, setPerguntasOpcoes] = useState<Record<string, string[]>>({});
  const [perguntasTipoResposta, setPerguntasTipoResposta] = useState<Record<string, string>>({});

  // Carregar dados existentes (rascunho ou formulário anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-montagem-eletrica-hidraulica/${opd}?atividade_id=${atividadeId}`);
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

  // Carregar opções das perguntas do banco de dados (Setor G)
  useEffect(() => {
    let isMounted = true;
    const carregarPerguntasDB = async () => {
      try {
        const response = await fetch('/api/qualidade/cq-config/perguntas-setor/G');
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
        console.error('[CQ-SetorG] ERRO ao carregar perguntas:', err);
        if (isMounted) setLoadingOpcoes(false);
      }
    };
    carregarPerguntasDB();
    return () => { isMounted = false; };
  }, []);

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
      const response = await fetch(`/api/formularios-montagem-eletrica-hidraulica/${opd}`, {
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
    setLoading(true);

    try {
      // Validar campos obrigatórios
      const requiredFields = [
        'cq1g_status', 'cq2g_status', 'cq3g_status', 'cq4g_status',
        'cq5g_status', 'cq6g_status', 'cq7g_status', 'cq8g_status',
        'cq9g_status', 'cq10g_status', 'cq11g_status', 'cq12g_status',
        'cq13g_status', 'cq14g_status', 'cq15g_status', 'cq16g_status',
        'cq17g_status', 'cq18g_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          toast.warning(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          return;
        }
      }

      // Enviar formulário
      const response = await fetch(`/api/formularios-montagem-eletrica-hidraulica/${opd}`, {
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
        toast.success('Formulário de Controle de Qualidade - Montagem Elétrica/Hidráulica salvo com sucesso!');
        onSubmit();
      } else {
        throw new Error(result.error || 'Erro ao salvar formulário');
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      toast.error('Erro ao salvar formulário. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckpoint = (
    id: string,
    title: string,
    description: string
  ) => {
    const statusField = `${id}_status`;
    // Extrair código da pergunta (ex: cq1g -> CQ1-G)
    const match = id.match(/^cq(\d+)([a-z])$/i);
    const codigoPergunta = match ? `CQ${match[1]}-${match[2].toUpperCase()}` : id.toUpperCase();
    const tipoResposta = perguntasTipoResposta[codigoPergunta];
    const opcoes = perguntasOpcoes[codigoPergunta] || ['Conforme', 'Não conforme'];

    return (
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-bold text-lg mb-3 text-gray-900">{title}</h4>
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">{description}</p>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Status *
          </label>
          {tipoResposta === 'texto_livre' || tipoResposta === 'texto' ? (
            <input
              type="text"
              value={formData[statusField as keyof typeof formData] as string}
              onChange={(e) => handleStatusChange(statusField, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Digite a resposta..."
              required
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Controle de Qualidade - Montagem Elétrica/Hidráulica</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      {/* Indicador de rascunho */}
      {isRascunhoExistente && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Este formulário contém dados de um rascunho anterior</span>
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {renderCheckpoint(
          'cq1g',
          'CQ1-G. FURAÇÃO PARA PASSAGEM DE MANGUEIRAS E ELÉTRICAS',
          `- Avaliação: 100%
- Medida crítica: Posição dos furos
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq2g',
          'CQ2-G. SOLDA CHAPINHAS DE ACABAMENTO NOS FUROS DA VIGA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq3g',
          'CQ3-G. PARAFUSOS PARA PRENDER MANGUEIRA',
          `- Avaliação: 100%
- Medida crítica: Presença dos parafusos
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq4g',
          'CQ4-G. SOLDA PARA PRENDER MANGUEIRA',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq5g',
          'CQ5-G. SUPORTE PARA VALVULAS TRAVA PINO',
          `- Avaliação: 100%
- Medida crítica: Posição do suporte
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq6g',
          'CQ6-G. SUPORTE PARA VALVULAS LATERAIS',
          `- Avaliação: 100%
- Medida crítica: Posição do suporte
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq7g',
          'CQ7-G. MONTAGEM DO PISO (ABERTO)',
          `- Avaliação: 100%
- Medida crítica: Posição do piso
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq8g',
          'CQ8-G. MONTAGEM DO PISO (FECHADO)',
          `- Avaliação: 100%
- Medida crítica: Posição do piso
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq9g',
          'CQ9-G. TESTAR MOVIMENTAÇÃO DA TAMPA DE INSPEÇÃO DO TRAVA RODA',
          `- Avaliação: 100%
- Medida crítica: Movimento da tampa
- Método de verificação: Funcional
- Instrumento de medição: N/A
- Critérios de aceitação: Tampa se movimentar`
        )}

        {renderCheckpoint(
          'cq10g',
          'CQ10-G. SUPORTE TAMPA DE INSPEÇÃO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq11g',
          'CQ11-G. LOCALIZAÇÃO DO SUPORTE DA VÁLVULA TRAVA RODA',
          `- Avaliação: 100%
- Medida crítica: Localização do suporte
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq12g',
          'CQ12-G. VERIFICAR VÁVULA LATERAL',
          `- Avaliação: 100%
- Medida crítica: Posição do válvula
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq13g',
          'CQ13-G. MONTAGEM CHAPA INCLINOSTATO DO TOMBADOR COM FECHAMENTO INFERIOR',
          `- Avaliação: 100%
- Medida crítica: Posição da chapa do inclinostato
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq14g',
          'CQ14-G. MONTAGEM CHAPA INCLINOSTATO DO TOMBADOR SEM FECHAMENTO INFERIOR',
          `- Avaliação: 100%
- Medida crítica: Posição da chapa do inclinostato
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq15g',
          'CQ15-G. MONTAGEM DAS ABRAÇADEIRAS TIPO D',
          `- Avaliação: 100%
- Medida crítica: Posição das abraçadeiras
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq16g',
          'CQ16-G. MONTAGEM DOS SUPORTES DA CAIXA ELÉTRICA LATERAL',
          `- Avaliação: 100%
- Medida crítica: Posição dos suportes
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq17g',
          'CQ17-G. MONTAGEM DOS SUPORTES DA CAIXA ELÉTRICA DOS SENSORES DAS TRAVAS (INTERNO)',
          `- Avaliação: 100%
- Medida crítica: Posição dos suportes
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq18g',
          'CQ18-G. MONTAGEM DO SUPORTE DO SENSOR TRAVA RODA',
          `- Avaliação: 100%
- Medida crítica: Suporte do sensor
- Método de verificação: Funcional (realizar teste de colisão)
- Instrumento de medição: N/A
- Critérios de aceitação: Conforme POP`
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
