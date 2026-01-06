'use client';

import { useState } from 'react';

interface FormularioSoldaInferiorProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioSoldaInferior({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioSoldaInferiorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1q_status: '', // MONTAGEM CONFORME PROJETO
    cq2q_status: '', // SOLDA
    cq3q_status: '', // ALINHAMENTO DOS COMPONENTES
    cq4q_status: '', // CHANFRO EM CHAPAS ACIMA DE 1/2 POL.
    cq5q_status: '', // SOLDAGEM
    cq6q_status: '', // PONTOS DE LUBRIFICAÇÃO
    cq7q_status: '', // PINOS CONFORME PROJETO
    cq8q_status: '', // PARAFUSOS CONFORME PROJETO
    cq9q_status: '', // ROSCAS CONFORME PROJETO
    cq10q_status: '', // AUSENCIA DE RESPINGOS DE SOLDA
    cq11q_status: '', // MONTAGEM CORRETA DOS COMPONENTES
    cq12q_status: '', // CONFERIR AJUSTES DE MONTAGEM CONFORME TOLERANCIAS
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios-solda-inferior/${opd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividade_id: atividadeId,
          dados_formulario: formData,
          preenchido_por: localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data')!).nome : 'Sistema'
        }),
      });

      const result = await response.json();
      if (result.success) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">CQ-Q: SOLDA INFERIOR - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">Q - SOLDA INFERIOR</h4>

        {renderCQField('CQ1-Q: MONTAGEM CONFORME PROJETO', 'cq1q', 'Conforme projeto')}
        {renderCQField('CQ2-Q: SOLDA', 'cq2q', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ3-Q: ALINHAMENTO DOS COMPONENTES', 'cq3q', 'Alinhados')}
        {renderCQField('CQ4-Q: CHANFRO EM CHAPAS ACIMA DE 1/2 POL.', 'cq4q', 'Conforme especificação')}
        {renderCQField('CQ5-Q: SOLDAGEM', 'cq5q', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ6-Q: PONTOS DE LUBRIFICAÇÃO', 'cq6q', 'Lubrificados')}
        {renderCQField('CQ7-Q: PINOS CONFORME PROJETO', 'cq7q', 'Conforme projeto')}
        {renderCQField('CQ8-Q: PARAFUSOS CONFORME PROJETO', 'cq8q', 'Conforme especificação')}
        {renderCQField('CQ9-Q: ROSCAS CONFORME PROJETO', 'cq9q', 'Conforme especificação')}
        {renderCQField('CQ10-Q: AUSÊNCIA DE RESPINGOS DE SOLDA', 'cq10q', 'Sem respingos')}
        {renderCQField('CQ11-Q: MONTAGEM CORRETA DOS COMPONENTES', 'cq11q', 'Conforme projeto')}
        {renderCQField('CQ12-Q: AJUSTES DE MONTAGEM CONFORME TOLERÂNCIAS', 'cq12q', 'Dentro das tolerâncias')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-Q</span>)}
        </button>
      </div>
    </form>
  );
}
