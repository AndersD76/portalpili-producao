'use client';

import { useState } from 'react';

interface FormularioColetorPinturaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioColetorPintura({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioColetorPinturaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1hc_status: '', // ISOLAMENTO DOS COMPONENTES
    cq2hc_status: '', // APLICAÇÃO DO FOSFATIZANTE
    cq3hc_marca_tinta: '', // MARCA DA TINTA (texto)
    cq4hc_lote_tinta: '', // LOTE DA TINTA (texto)
    cq5hc_validade_tinta: '', // VALIDADE DA TINTA (texto)
    cq6hc_marca_fosfatizante: '', // MARCA DO FOSFATIZANTE (texto)
    cq7hc_status: '', // MÉTODO DE APLICAÇÃO DA TINTA
    cq8hc_espessura_umida: '', // ESPESSURA TINTA UMIDA (texto)
    cq9hc_espessura_seca: '', // ESPESSURA TINTA SECA (texto)
    cq10hc_status: '', // ADERÊNCIA
    cq12hc_status: '', // ADESIVAÇÃO
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
      const response = await fetch(`/api/formularios-coletor-pintura/${opd}`, {
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
      >
        <option value="">Selecione</option>
        <option value="Conforme">Conforme</option>
        <option value="Não conforme">Não conforme</option>
      </select>
    </div>
  );

  const renderTextField = (label: string, fieldName: string) => (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <input
        type="text"
        name={fieldName}
        value={(formData as any)[fieldName]}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        placeholder="Digite aqui..."
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
        <h3 className="font-bold text-lg mb-2">CQ-Hc: PINTURA (COLETOR) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">COLETORES DE GRÃOS</span>
      </div>

      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">Hc - PINTURA</h4>

        {renderCQField('CQ1-Hc: ISOLAMENTO DOS COMPONENTES', 'cq1hc', 'Isolados')}
        {renderCQField('CQ2-Hc: APLICAÇÃO DO FOSFATIZANTE', 'cq2hc', 'Aplicado corretamente')}
        {renderTextField('CQ3-Hc: MARCA DA TINTA', 'cq3hc_marca_tinta')}
        {renderTextField('CQ4-Hc: LOTE DA TINTA', 'cq4hc_lote_tinta')}
        {renderTextField('CQ5-Hc: VALIDADE DA TINTA', 'cq5hc_validade_tinta')}
        {renderTextField('CQ6-Hc: MARCA DO FOSFATIZANTE', 'cq6hc_marca_fosfatizante')}
        {renderCQField('CQ7-Hc: MÉTODO DE APLICAÇÃO DA TINTA', 'cq7hc', 'Conforme especificação')}
        {renderTextField('CQ8-Hc: ESPESSURA TINTA ÚMIDA', 'cq8hc_espessura_umida')}
        {renderTextField('CQ9-Hc: ESPESSURA TINTA SECA', 'cq9hc_espessura_seca')}
        {renderCQField('CQ10-Hc: ADERÊNCIA', 'cq10hc', 'Teste de aderência aprovado')}
        {renderCQField('CQ12-Hc: ADESIVAÇÃO', 'cq12hc', 'Conforme especificação')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-Hc</span>)}
        </button>
      </div>
    </form>
  );
}
