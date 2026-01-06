'use client';

import { useState, useRef } from 'react';

interface FormularioTravadorRodasProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioTravadorRodas({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioTravadorRodasProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // CQ1-I a CQ18-I
    cq1i_status: '', // PRESSÃO DE ABERTURA LATERAL DO CILINDRO (NÃO PASSAR DE 30 BAR)
    cq2i_status: '', // REGULAGEM DA PRESSÃO DA VÁLVULA DE ALIVIO ABERTURA LATERAL
    cq3i_status: '', // REGULAGEM DO PRESSOSTATO DE TRAÇÃO DO CILINDRO PRINCIPAL (55 BAR)
    cq4i_status: '', // REGULAGEM DE TRAÇÃO DO CILINDRO PRINCIPAL (65 BAR)
    cq5i_status: '', // TESTE PRESSÃO VÁLVULA DE RETENÇÃO
    cq6i_status: '', // TESTE DE FUNCIONAMENTO DA ESTEIRA
    cq7i_status: '', // APERTO PARAFUSO ALEN DA ASTE PRINCIPAL
    cq8i_status: '', // LUBRIFICAR GRAXEIRA ASTE PRINCIPAL
    cq9i_status: '', // LUBRIFICAR GRAXEIRA ASTE PRINCIPAL (duplicado no original)
    cq10i_status: '', // LUBRIFICAÇÃO DO MUNHÃO DO CILINDRO PRINCIPAL
    cq11i_status: '', // APERTO PARAFUSO DO OLHAIS DO MUNHÃO DO CILINDRO PRINCIPAL
    cq12i_status: '', // APERTO PARAFUSO DA ESTEIRA REGULAGEM DE GUIAS INFERIORES
    cq13i_status: '', // PARAFUSO DO OLHAL DO CILINDRO PRINCIPAL
    cq14i_status: '', // VERIFICAR PASSAGEM DOS PINOS DE FIXAÇÃO NA PLATAFORMA
    cq15i_status: '', // ACABAMENTO DAS SOLDAS
    cq16i_status: '', // ACABAMENTO DE PINTURA
    cq17i_status: '', // VERIFICAR CONDIÇÕES FÍSICAS DA HASTE DO CILINDRO
    cq18i_status: '', // VERIFICAR SE A HASTE DO CILINDRO ESTA RECOLHIDA PARA TRANSPORTE
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios-travador-rodas/${opd}`, {
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

  const renderCQField = (label: string, fieldName: string, criterio: string, hasNaoAplicavel = false) => (
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
        {hasNaoAplicavel && <option value="Não Aplicável">Não Aplicável</option>}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
        <h3 className="font-bold text-lg mb-2">CQ-I: TRAVADOR DE RODAS LATERAL MÓVEL - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">I - TRAVADOR DE RODAS LATERAL MÓVEL</h4>

        {renderCQField('CQ1-I: PRESSÃO DE ABERTURA LATERAL DO CILINDRO', 'cq1i', '30 BAR +/- 10 BAR')}
        {renderCQField('CQ2-I: REGULAGEM DA PRESSÃO DA VÁLVULA DE ALÍVIO', 'cq2i', 'Conforme especificação')}
        {renderCQField('CQ3-I: REGULAGEM DO PRESSOSTATO DE TRAÇÃO', 'cq3i', '55 BAR +/- 10 BAR')}
        {renderCQField('CQ4-I: REGULAGEM DE TRAÇÃO DO CILINDRO PRINCIPAL', 'cq4i', '65 BAR +/- 10 BAR')}
        {renderCQField('CQ5-I: TESTE PRESSÃO VÁLVULA DE RETENÇÃO', 'cq5i', 'Sem vazamento')}
        {renderCQField('CQ6-I: TESTE DE FUNCIONAMENTO DA ESTEIRA', 'cq6i', 'Funcional')}
        {renderCQField('CQ7-I: APERTO PARAFUSO ALLEN DA HASTE PRINCIPAL', 'cq7i', 'Torque conforme especificação')}
        {renderCQField('CQ8-I: LUBRIFICAR GRAXEIRA HASTE PRINCIPAL (1)', 'cq8i', 'Lubrificado')}
        {renderCQField('CQ9-I: LUBRIFICAR GRAXEIRA HASTE PRINCIPAL (2)', 'cq9i', 'Lubrificado')}
        {renderCQField('CQ10-I: LUBRIFICAÇÃO DO MUNHÃO DO CILINDRO PRINCIPAL', 'cq10i', 'Lubrificado')}
        {renderCQField('CQ11-I: APERTO PARAFUSO DOS OLHAIS DO MUNHÃO', 'cq11i', 'Torque conforme especificação')}
        {renderCQField('CQ12-I: APERTO PARAFUSO DA ESTEIRA', 'cq12i', 'Torque conforme especificação')}
        {renderCQField('CQ13-I: PARAFUSO DO OLHAL DO CILINDRO PRINCIPAL', 'cq13i', 'Conforme desenho')}
        {renderCQField('CQ14-I: PASSAGEM DOS PINOS DE FIXAÇÃO', 'cq14i', 'Conforme desenho')}
        {renderCQField('CQ15-I: ACABAMENTO DAS SOLDAS', 'cq15i', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ16-I: ACABAMENTO DE PINTURA', 'cq16i', 'Sem falhas')}
        {renderCQField('CQ17-I: CONDIÇÕES FÍSICAS DA HASTE DO CILINDRO', 'cq17i', 'Íntegra')}
        {renderCQField('CQ18-I: HASTE DO CILINDRO RECOLHIDA PARA TRANSPORTE', 'cq18i', 'Recolhida')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-I</span>)}
        </button>
      </div>
    </form>
  );
}
