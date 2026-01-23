'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FormularioBracosProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioBracos({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioBracosProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRascunhoExistente, setIsRascunhoExistente] = useState(false);

  const [formData, setFormData] = useState({
    cq1r_status: '', // MONTAGEM CONFORME PROJETO
    cq2r_status: '', // SOLDA
    cq3r_status: '', // ALINHAMENTO DOS COMPONENTES
    cq4r_status: '', // CHANFRO EM CHAPAS ACIMA DE 1/2 POL.
    cq5r_status: '', // ASPECTO SOLDAGEM
    cq6r_status: '', // PONTOS DE LUBRIFICAÇÃO
    cq7r_status: '', // PINOS CONFORME PROJETO
    cq8r_status: '', // PARAFUSOS CONFORME PROJETO
    cq9r_status: '', // ROSCAS CONFORME PROJETO
    cq10r_status: '', // AUSENCIA DE RESPINGOS DE SOLDA
    cq11r_status: '', // MONTAGEM CORRETA DOS COMPONENTES
    cq12r_status: '', // CONFERIR AJUSTES DE MONTAGEM CONFORME TOLERANCIAS
  });

  // Carregar dados existentes (rascunho ou formulario anterior)
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      if (!atividadeId) {
        setLoadingDados(false);
        return;
      }

      try {
        const response = await fetch(`/api/formularios-bracos/${opd}?atividade_id=${atividadeId}`);
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
      const response = await fetch(`/api/formularios-bracos/${opd}`, {
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
      const response = await fetch(`/api/formularios-bracos/${opd}`, {
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

  const renderCQField = (label: string, fieldName: string, criterio: string) => (
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
        <option value="Conforme">Conforme</option>
        <option value="Não conforme">Não conforme</option>
      </select>
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

      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">CQ-R: BRAÇOS - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">R - BRAÇOS</h4>

        {renderCQField('CQ1-R: MONTAGEM CONFORME PROJETO', 'cq1r', 'Conforme projeto')}
        {renderCQField('CQ2-R: SOLDA', 'cq2r', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ3-R: ALINHAMENTO DOS COMPONENTES', 'cq3r', 'Alinhados')}
        {renderCQField('CQ4-R: CHANFRO EM CHAPAS ACIMA DE 1/2 POL.', 'cq4r', 'Conforme especificação')}
        {renderCQField('CQ5-R: ASPECTO SOLDAGEM', 'cq5r', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ6-R: PONTOS DE LUBRIFICAÇÃO', 'cq6r', 'Lubrificados')}
        {renderCQField('CQ7-R: PINOS CONFORME PROJETO', 'cq7r', 'Conforme projeto')}
        {renderCQField('CQ8-R: PARAFUSOS CONFORME PROJETO', 'cq8r', 'Conforme especificação')}
        {renderCQField('CQ9-R: ROSCAS CONFORME PROJETO', 'cq9r', 'Conforme especificação')}
        {renderCQField('CQ10-R: AUSÊNCIA DE RESPINGOS DE SOLDA', 'cq10r', 'Sem respingos')}
        {renderCQField('CQ11-R: MONTAGEM CORRETA DOS COMPONENTES', 'cq11r', 'Conforme projeto')}
        {renderCQField('CQ12-R: AJUSTES DE MONTAGEM CONFORME TOLERÂNCIAS', 'cq12r', 'Dentro das tolerâncias')}
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
