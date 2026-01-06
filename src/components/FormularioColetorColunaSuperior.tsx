'use client';

import { useState } from 'react';

interface FormularioColetorColunaSuperiorProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioColetorColunaSuperior({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioColetorColunaSuperiorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1fc_status: '', // FIXADORES DAS MANGUEIRAS HIDRÁULICAS (2 EM UM LADO E 3 OUTRO)
    cq2fc_status: '', // APERTO DOS PARAFUSOS DA COLUNA DE FIXAÇÃO DE GIRO
    cq3fc_status: '', // BORRACHA DE BATENTE DE GIRO
    cq4fc_status: '', // LUBRIFICAÇÃO ENGRENAGEM DE GIRO
    cq5fc_status: '', // ACABAMENTO E ARTICULAÇÃO DA TAMPA DA ENGRENAGEM E GRAMPO
    cq6fc_status: '', // LUBRIFICAÇÃO DA BUCHA DE BRONZE SUPERIOR E INFERIOR DE GIRO
    cq7fc_status: '', // FOLGA BUCHA BASE PARA GIRO (GIRO LIVRE)
    cq8fc_status: '', // AJUSTE DE ENGRENAGEM GIRO (ANALISAR INTERFERENCIA)
    cq9fc_status: '', // FIXAÇÃO DO COMPRESSOR RADIAL
    cq10fc_status: '', // MONTAGEM 2 FIXADORES DE MANGUEIRA
    cq11fc_status: '', // MONTAGEM DE VÁLVULA ANTI CHOQUE DA ENGRENAGEM DE GIRO
    cq12fc_status: '', // MONTAGEM DO ESPIGÃO COM FURO 14mm NA PARTE SUPERIOR
    cq13fc_status: '', // MONTAGEM DO ESPIGÃO SEM FURO NA PARTE INFERIOR
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
      const response = await fetch(`/api/formularios-coletor-coluna-superior/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">CQ-Fc: COLUNA SUPERIOR (COLETOR) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">COLETORES DE GRÃOS</span>
      </div>

      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">Fc - COLUNA SUPERIOR</h4>

        {renderCQField('CQ1-Fc: FIXADORES DAS MANGUEIRAS HIDRÁULICAS (2 em um lado e 3 outro)', 'cq1fc', 'Conforme especificação')}
        {renderCQField('CQ2-Fc: APERTO DOS PARAFUSOS DA COLUNA DE FIXAÇÃO DE GIRO', 'cq2fc', 'Torque conforme especificação')}
        {renderCQField('CQ3-Fc: BORRACHA DE BATENTE DE GIRO', 'cq3fc', 'Sem danos')}
        {renderCQField('CQ4-Fc: LUBRIFICAÇÃO ENGRENAGEM DE GIRO', 'cq4fc', 'Lubrificada')}
        {renderCQField('CQ5-Fc: ACABAMENTO E ARTICULAÇÃO DA TAMPA DA ENGRENAGEM E GRAMPO', 'cq5fc', 'Funcional')}
        {renderCQField('CQ6-Fc: LUBRIFICAÇÃO DA BUCHA DE BRONZE SUPERIOR E INFERIOR DE GIRO', 'cq6fc', 'Lubrificadas')}
        {renderCQField('CQ7-Fc: FOLGA BUCHA BASE PARA GIRO (GIRO LIVRE)', 'cq7fc', 'Giro livre')}
        {renderCQField('CQ8-Fc: AJUSTE DE ENGRENAGEM GIRO (ANALISAR INTERFERÊNCIA)', 'cq8fc', 'Sem interferência')}
        {renderCQField('CQ9-Fc: FIXAÇÃO DO COMPRESSOR RADIAL', 'cq9fc', 'Fixado')}
        {renderCQField('CQ10-Fc: MONTAGEM 2 FIXADORES DE MANGUEIRA', 'cq10fc', 'Montados')}
        {renderCQField('CQ11-Fc: MONTAGEM DE VÁLVULA ANTI CHOQUE DA ENGRENAGEM DE GIRO', 'cq11fc', 'Montada')}
        {renderCQField('CQ12-Fc: MONTAGEM DO ESPIGÃO COM FURO 14mm NA PARTE SUPERIOR', 'cq12fc', 'Furo 14mm')}
        {renderCQField('CQ13-Fc: MONTAGEM DO ESPIGÃO SEM FURO NA PARTE INFERIOR', 'cq13fc', 'Sem furo')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-Fc</span>)}
        </button>
      </div>
    </form>
  );
}
