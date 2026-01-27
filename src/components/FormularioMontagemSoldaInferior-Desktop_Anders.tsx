'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface FormularioMontagemSoldaInferiorProps {
  opd: string;
  cliente: string;
  atividadeId: number;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function FormularioMontagemSoldaInferior({
  opd,
  cliente,
  atividadeId,
  onSubmit,
  onCancel
}: FormularioMontagemSoldaInferiorProps) {
  const [formData, setFormData] = useState({
    // CQ1-F - EMENDA DAS VIGAS INFERIORES
    cq1f_status: '',

    // CQ2-F - MONTAGEM REFORÇOS INFERIORES
    cq2f_status: '',

    // CQ3-F - REFORÇOS INFERIORES
    cq3f_status: '',

    // CQ4-F - SOLDA PISO
    cq4f_status: '',

    // CQ5-F - MONTAGEM E FECHAMENTO 690 MM CONFORME DESENHO
    cq5f_status: '',

    // CQ6-F - SOLDA FECHAMENTO 690 MM GRADEADO
    cq6f_status: '',

    // CQ7-F - MONTAGEM TAMPA DE INSPEÇÃO
    cq7f_status: '',

    // CQ8-F - SUPORTE TAMPA DE INSPEÇÃO
    cq8f_status: '',

    // CQ9-F - SOLDA EMENDA DAS VIGAS SUPERIORES
    cq9f_status: '',

    // CQ10-F - PERFIL ASSOALHO
    cq10f_status: '',

    // CQ11-F - MONTAGEM SAPATA CILINDRO PRINCIPAL
    cq11f_status: '',

    // CQ12-F - SAPATA CILINDRO PRINCIPAL
    cq12f_status: '',

    // CQ13-F - SOLDA REFORÇO TRAVA CINTAS
    cq13f_status: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar campos obrigatórios
      const requiredFields = [
        'cq1f_status', 'cq2f_status', 'cq3f_status', 'cq4f_status',
        'cq5f_status', 'cq6f_status', 'cq7f_status', 'cq8f_status',
        'cq9f_status', 'cq10f_status', 'cq11f_status', 'cq12f_status',
        'cq13f_status'
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          toast.warning(`Por favor, preencha o campo ${field.toUpperCase()}`);
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
      const response = await fetch(`/api/formularios-montagem-solda-inferior/${opd}`, {
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
        toast.success('Formulário de Controle de Qualidade - Montagem e Solda Inferior salvo com sucesso!');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-semibold">Controle de Qualidade - Montagem e Solda Inferior</p>
        <p className="text-sm">OPD: {opd} | Cliente: {cliente}</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        {renderCheckpoint(
          'cq1f',
          'CQ1-F. EMENDA DAS VIGAS INFERIORES',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq2f',
          'CQ2-F. MONTAGEM REFORÇOS INFERIORES',
          `- Avaliação: 100%
- Medida crítica: Posição dos reforços inferiores
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq3f',
          'CQ3-F. REFORÇOS INFERIORES',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq4f',
          'CQ4-F. SOLDA PISO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq5f',
          'CQ5-F. MONTAGEM E FECHAMENTO 690 MM CONFORME DESENHO',
          `- Avaliação: 100%
- Medida crítica: Posição do fechamento
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq6f',
          'CQ6-F. SOLDA FECHAMENTO 690 MM GRADEADO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq7f',
          'CQ7-F. MONTAGEM TAMPA DE INSPEÇÃO',
          `- Avaliação: 100%
- Medida crítica: Posição da tampa
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq8f',
          'CQ8-F. SUPORTE TAMPA DE INSPEÇÃO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq9f',
          'CQ9-F. SOLDA EMENDA DAS VIGAS SUPERIORES',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq10f',
          'CQ10-F. PERFIL ASSOALHO',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq11f',
          'CQ11-F. MONTAGEM SAPATA CILINDRO PRINCIPAL',
          `- Avaliação: 100%
- Medida crítica: Posição da sapata
- Método de verificação: Dimensional
- Instrumento de medição: Trena
- Critérios de aceitação: Conforme desenho`
        )}

        {renderCheckpoint(
          'cq12f',
          'CQ12-F. SAPATA CILINDRO PRINCIPAL',
          `- Avaliação: 100%
- Medida crítica: Trinca; Porosidade
- Método de verificação: Visual
- Instrumento de medição: N/A
- Critérios de aceitação: Sem trinca; Sem porosidade`
        )}

        {renderCheckpoint(
          'cq13f',
          'CQ13-F. SOLDA REFORÇO TRAVA CINTAS',
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
