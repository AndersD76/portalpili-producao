'use client';

import { useState } from 'react';

interface FormularioColetorCentralHidraulicaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioColetorCentralHidraulica({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioColetorCentralHidraulicaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1bc_status: '', // VISOR DE NIVEL ALINHADO
    cq2bc_status: '', // VEDAÇÃO DO VISOR
    cq3bc_status: '', // BOCAL DE ENCHIMENTO
    cq4bc_status: '', // SUPORTE MOTOR CONFORME DESENHO
    cq5bc_status: '', // BLOCO MANIFOLD CONFORME DESENHO
    cq6bc_status: '', // APERTO DO DRENO
    cq7bc_status: '', // REGULAGEM PRESSÃO DA BOMBA: 120BAR
    cq8bc_status: '', // MONTAGEM DA LINHA DE PRESSÃO
    cq9bc_status: '', // MONTAGEM DA LINHA DE RETORNO
    cq10bc_status: '', // BOMBA DE 5,5
    cq11bc_status: '', // MOTOR DE 3CV
    cq12bc_status: '', // FREQUENCIA PADRÃO 60hz
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
      const response = await fetch(`/api/formularios-coletor-central-hidraulica/${opd}`, {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
        <h3 className="font-bold text-lg mb-2">CQ-Bc: CENTRAL HIDRÁULICA (COLETOR) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">COLETORES DE GRÃOS</span>
      </div>

      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">Bc - CENTRAL HIDRÁULICA</h4>

        {renderCQField('CQ1-Bc: VISOR DE NÍVEL ALINHADO', 'cq1bc', 'Alinhado')}
        {renderCQField('CQ2-Bc: VEDAÇÃO DO VISOR', 'cq2bc', 'Sem vazamento')}
        {renderCQField('CQ3-Bc: BOCAL DE ENCHIMENTO', 'cq3bc', 'Conforme especificação')}
        {renderCQField('CQ4-Bc: SUPORTE MOTOR CONFORME DESENHO', 'cq4bc', 'Conforme desenho')}
        {renderCQField('CQ5-Bc: BLOCO MANIFOLD CONFORME DESENHO', 'cq5bc', 'Conforme desenho')}
        {renderCQField('CQ6-Bc: APERTO DO DRENO', 'cq6bc', 'Apertado')}
        {renderCQField('CQ7-Bc: REGULAGEM PRESSÃO DA BOMBA: 120BAR', 'cq7bc', '120 BAR')}
        {renderCQField('CQ8-Bc: MONTAGEM DA LINHA DE PRESSÃO', 'cq8bc', 'Conforme projeto')}
        {renderCQField('CQ9-Bc: MONTAGEM DA LINHA DE RETORNO', 'cq9bc', 'Conforme projeto')}
        {renderCQField('CQ10-Bc: BOMBA DE 5,5', 'cq10bc', 'Correta')}
        {renderCQField('CQ11-Bc: MOTOR DE 3CV', 'cq11bc', 'Correto')}
        {renderCQField('CQ12-Bc: FREQUÊNCIA PADRÃO 60Hz', 'cq12bc', '60Hz')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-Bc</span>)}
        </button>
      </div>
    </form>
  );
}
