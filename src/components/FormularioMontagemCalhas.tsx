'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioMontagemCalhasProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioMontagemCalhas({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioMontagemCalhasProps) {
  const [formData, setFormData] = useState({
    // CQ1-H - MONTAGEM CONJUNTO MOD 1
    cq1h_status: '',

    // CQ2-H - SOLDA MOD 1
    cq2h_status: '',

    // CQ3-H - MONTAGEM CONJUNTO MOD 2
    cq3h_status: '',

    // CQ4-H - SOLDA MOD 2
    cq4h_status: '',

    // CQ5-H - MONTAGEM CONJUNTO MOD 3
    cq5h_status: '',

    // CQ6-H - SOLDA MOD 3
    cq6h_status: '',

    // CQ7-H - MONTAGEM CONJUNTO MOD 4
    cq7h_status: '',

    // CQ8-H - SOLDA MOD 4
    cq8h_status: '',

    // CQ9-H - MONTAGEM CONJUNTO MOD 5 CONFORME PROJETO (30 M)
    cq9h_status: '',

    // CQ10-H - SOLDA MOD 5
    cq10h_status: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);

  // Carregar dados existentes (rascunho ou formulário anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-montagem-calhas/${opd}?atividade_id=${atividadeId}`);
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

    try {
      const response = await fetch(`/api/formularios-montagem-calhas/${opd}`, {
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
        'cq1h_status', 'cq2h_status', 'cq3h_status', 'cq4h_status',
        'cq5h_status', 'cq6h_status', 'cq7h_status', 'cq8h_status',
        'cq9h_status', 'cq10h_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          toast.warning(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          return;
        }
      }

      // Enviar formulário
      const response = await fetch(`/api/formularios-montagem-calhas/${opd}`, {
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
        toast.success('Formulário de Controle de Qualidade - Montagem das Calhas salvo com sucesso!');
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

    return (
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-bold text-lg mb-3 text-gray-900">{title}</h4>
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">{description}</p>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Status *
          </label>
          <select
            value={formData[statusField as keyof typeof formData] as string}
            onChange={(e) => setFormData(prev => ({ ...prev, [statusField]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          >
            <option value="">Selecione...</option>
            <option value="Conforme">Conforme</option>
            <option value="Não conforme">Não conforme</option>
          </select>
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
        <p className="font-semibold">Controle de Qualidade - Montagem das Calhas</p>
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
          'cq1h',
          'CQ1-H. MONTAGEM CONJUNTO MOD 1',
          `- Avaliação: 100%
- Medida crítica: Posição do conjunto
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq2h',
          'CQ2-H. SOLDA MOD 1',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq3h',
          'CQ3-H. MONTAGEM CONJUNTO MOD 2',
          `- Avaliação: 100%
- Medida crítica: Posição do conjunto
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq4h',
          'CQ4-H. SOLDA MOD 2',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq5h',
          'CQ5-H. MONTAGEM CONJUNTO MOD 3',
          `- Avaliação: 100%
- Medida crítica: Posição do conjunto
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq6h',
          'CQ6-H. SOLDA MOD 3',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq7h',
          'CQ7-H. MONTAGEM CONJUNTO MOD 4',
          `- Avaliação: 100%
- Medida crítica: Posição do conjunto
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq8h',
          'CQ8-H. SOLDA MOD 4',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq9h',
          'CQ9-H. MONTAGEM CONJUNTO MOD 5 CONFORME PROJETO (30 M)',
          `- Avaliação: 100%
- Medida crítica: Posição do conjunto
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq10h',
          'CQ10-H. SOLDA MOD 5',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
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
