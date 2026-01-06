'use client';

import { useState } from 'react';

interface FormularioBracosProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioBracos({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioBracosProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-R</span>)}
        </button>
      </div>
    </form>
  );
}
