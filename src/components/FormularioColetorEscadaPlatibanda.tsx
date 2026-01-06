'use client';

import { useState } from 'react';

interface FormularioColetorEscadaPlatibandaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioColetorEscadaPlatibanda({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioColetorEscadaPlatibandaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1gc_status: '', // SOLDA
    cq2gc_status: '', // VÃO DE PASSAGEM DE MANGUEIRAS
    cq3gc_status: '', // TESTE DE MONTAGEM NOS FLANGES DE FIXAÇÃO DA COLUNA
    cq4gc_status: '', // MONTAGEM E ALINHAMENTO DE COMPONENTES (1)
    cq5gc_status: '', // MONTAGEM E ALINHAMENTO DE COMPONENTES (2)
    cq6gc_status: '', // PARAFUSOS DE FIXAÇÃO DA ESCADA
    cq7gc_status: '', // ADESIVOS DE IDENTIFICAÇÃO (COLUNA E UNIDADE HIDRÁULICA)
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
      const response = await fetch(`/api/formularios-coletor-escada-platibanda/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">CQ-Gc: ESCADA, PLATIBANDA E GUARDA CORPO - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">COLETORES DE GRÃOS</span>
      </div>

      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">Gc - ESCADA, PLATIBANDA E GUARDA CORPO</h4>

        {renderCQField('CQ1-Gc: SOLDA', 'cq1gc', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ2-Gc: VÃO DE PASSAGEM DE MANGUEIRAS', 'cq2gc', 'Conforme projeto')}
        {renderCQField('CQ3-Gc: TESTE DE MONTAGEM NOS FLANGES DE FIXAÇÃO DA COLUNA', 'cq3gc', 'Encaixa corretamente')}
        {renderCQField('CQ4-Gc: MONTAGEM E ALINHAMENTO DE COMPONENTES (1)', 'cq4gc', 'Alinhados')}
        {renderCQField('CQ5-Gc: MONTAGEM E ALINHAMENTO DE COMPONENTES (2)', 'cq5gc', 'Alinhados')}
        {renderCQField('CQ6-Gc: PARAFUSOS DE FIXAÇÃO DA ESCADA', 'cq6gc', 'Fixados')}
        {renderCQField('CQ7-Gc: ADESIVOS DE IDENTIFICAÇÃO (COLUNA E UNIDADE HIDRÁULICA)', 'cq7gc', 'Presentes')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-Gc</span>)}
        </button>
      </div>
    </form>
  );
}
