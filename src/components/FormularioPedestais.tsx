'use client';

import { useState } from 'react';

interface FormularioPedestaisProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioPedestais({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioPedestaisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1o_status: '', // CONDIÇÕES FISICAS DA CAIXA
    cq2o_status: '', // INEXISTÊNCIA DE FIOS SOLTOS
    cq3o_status: '', // LAYOUT CONFORME PROJETO
    cq4o_status: '', // IDENTIFICAÇÃO DE TODOS OS FIOS
    cq5o_status: '', // ADESIVOS DOS BOTÕES
    cq6o_status: '', // ALINHAMENTO DOS ADESIVOS
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
      const response = await fetch(`/api/formularios-pedestais/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">CQ-O: PEDESTAIS - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">O - PEDESTAIS</h4>

        {renderCQField('CQ1-O: CONDIÇÕES FÍSICAS DA CAIXA', 'cq1o', 'Sem danos; Sem amassados')}
        {renderCQField('CQ2-O: INEXISTÊNCIA DE FIOS SOLTOS', 'cq2o', 'Sem fios soltos')}
        {renderCQField('CQ3-O: LAYOUT CONFORME PROJETO', 'cq3o', 'Conforme projeto')}
        {renderCQField('CQ4-O: IDENTIFICAÇÃO DE TODOS OS FIOS', 'cq4o', 'Todos identificados')}
        {renderCQField('CQ5-O: ADESIVOS DOS BOTÕES', 'cq5o', 'Todos presentes')}
        {renderCQField('CQ6-O: ALINHAMENTO DOS ADESIVOS', 'cq6o', 'Alinhados')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-O</span>)}
        </button>
      </div>
    </form>
  );
}
