'use client';

import { useState } from 'react';

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
          alert(`Por favor, preencha o campo ${field.toUpperCase()}`);
          setLoading(false);
          return;
        }
      }

      // Preparar dados para envio
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      const dados_formulario = {
        ...formData,
      };

      // Enviar formulário
      const response = await fetch(`/api/formularios-montagem-calhas/${opd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario,
          preenchido_por: user?.nome || 'Sistema',
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Formulário de Controle de Qualidade - Montagem das Calhas salvo com sucesso!');
        onSubmit();
      } else {
        throw new Error(result.error || 'Erro ao salvar formulário');
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário. Por favor, tente novamente.');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Controle de Qualidade - Montagem das Calhas</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

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

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Formulário</span>
          )}
        </button>
      </div>
    </form>
  );
}
