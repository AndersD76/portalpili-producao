'use client';

import { useState } from 'react';

interface FormularioMontagemHidraulicaSobPlataformaProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioMontagemHidraulicaSobPlataforma({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioMontagemHidraulicaSobPlataformaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1u_status: '', // ALINHAMENTO E MONTAGENS
    cq2u_status: '', // AJUSTES DE BUCHAS E PINOS
    cq3u_status: '', // CORDÕES DE SOLDA
    cq4u_status: '', // MANGUEIRAS
    cq5u_status: '', // ALINHAMENTOS E MONTAGENS
    cq6u_status: '', // TESTES HIDRAULICOS
    cq7u_status: '', // PONTOS DE LUBRIFICAÇÃO
    cq8u_status: '', // APERTO PARAFUSOS
    cq9u_status: '', // PRESSOSTATOS REGULADOS (1)
    cq10u_status: '', // PRESSOSTATOS REGULADOS (2)
    cq11u_status: '', // TUBULAÇÃO HIDRAULICA PARA LIGAÇÃO DOS BLOCOS
    cq12u_status: '', // APERTO DAS ANILHAS E PORCAS
    cq13u_status: '', // DOBRAS DOS CANOS 8X6 PARA RECEBER ESFORÇOS DOS CABEÇOTES
    cq14u_status: '', // REGULAGEM VALVULA LIMITADORA DE PRESSAO 50 BAR
    cq15u_status: '', // REGULAGEM VALVULA LIMITADORA DE PRESSAO 60 BAR
    cq16u_status: '', // ABRAÇADEIRA CILINDRO PRINCIPAL
    cq17u_status: '', // FIXAÇÃO ESTEIRAS
    cq18u_status: '', // MONTAGEM CILINDRO DE FECHAMENTO COM TUBOS FIXOS
    cq19u_status: '', // MONTAGEM CILINDRO DE TRAÇÃO
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
      const response = await fetch(`/api/formularios-montagem-hidraulica-sob-plataforma/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">CQ-U: MONTAGEM HIDRÁULICA SOB PLATAFORMA - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">U - MONTAGEM HIDRÁULICA ELÉTRICA SOB PLATAFORMA</h4>

        {renderCQField('CQ1-U: ALINHAMENTO E MONTAGENS', 'cq1u', 'Alinhados')}
        {renderCQField('CQ2-U: AJUSTES DE BUCHAS E PINOS', 'cq2u', 'Conforme tolerâncias')}
        {renderCQField('CQ3-U: CORDÕES DE SOLDA', 'cq3u', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ4-U: MANGUEIRAS', 'cq4u', 'Íntegras; Sem vazamentos')}
        {renderCQField('CQ5-U: ALINHAMENTOS E MONTAGENS (2)', 'cq5u', 'Conforme projeto')}
        {renderCQField('CQ6-U: TESTES HIDRÁULICOS', 'cq6u', 'Aprovados')}
        {renderCQField('CQ7-U: PONTOS DE LUBRIFICAÇÃO', 'cq7u', 'Lubrificados')}
        {renderCQField('CQ8-U: APERTO PARAFUSOS', 'cq8u', 'Torque conforme especificação')}
        {renderCQField('CQ9-U: PRESSOSTATOS REGULADOS (1)', 'cq9u', 'Regulados')}
        {renderCQField('CQ10-U: PRESSOSTATOS REGULADOS (2)', 'cq10u', 'Regulados')}
        {renderCQField('CQ11-U: TUBULAÇÃO HIDRÁULICA PARA LIGAÇÃO DOS BLOCOS', 'cq11u', 'Conforme projeto')}
        {renderCQField('CQ12-U: APERTO DAS ANILHAS E PORCAS', 'cq12u', 'Torque conforme especificação')}
        {renderCQField('CQ13-U: DOBRAS DOS CANOS 8X6', 'cq13u', 'Sem danos')}
        {renderCQField('CQ14-U: REGULAGEM VÁLVULA LIMITADORA DE PRESSÃO 50 BAR', 'cq14u', '50 BAR +/- 5 BAR')}
        {renderCQField('CQ15-U: REGULAGEM VÁLVULA LIMITADORA DE PRESSÃO 60 BAR', 'cq15u', '60 BAR +/- 5 BAR')}
        {renderCQField('CQ16-U: ABRAÇADEIRA CILINDRO PRINCIPAL', 'cq16u', 'Fixada')}
        {renderCQField('CQ17-U: FIXAÇÃO ESTEIRAS', 'cq17u', 'Fixadas')}
        {renderCQField('CQ18-U: MONTAGEM CILINDRO DE FECHAMENTO COM TUBOS FIXOS', 'cq18u', 'Conforme projeto')}
        {renderCQField('CQ19-U: MONTAGEM CILINDRO DE TRAÇÃO', 'cq19u', 'Conforme projeto')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-U</span>)}
        </button>
      </div>
    </form>
  );
}
