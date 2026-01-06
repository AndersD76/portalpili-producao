'use client';

import { useState } from 'react';

interface FormularioCentralSubconjuntosProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioCentralSubconjuntos({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioCentralSubconjuntosProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1m_status: '', // MONTAGEM DO RESERVATORIO
    cq2m_status: '', // OLHAL DE IÇAMENTO
    cq3m_status: '', // MONTAGEM VISOR DE NIVEL
    cq4m_status: '', // VERIFICAR MONTAGEM E ESQUADRO DO RESERVATÓRIO
    cq5m_status: '', // MONTAGEM DAS CHICANAS
    cq6m_status: '', // PARTE INTERNA JANELA DE INSPEÇÃO
    cq7m_status: '', // VERIFICAR A QUALIDADE DA SOLDA INTERNA DO RESERVATÓRIO
    cq8m_status: '', // FLANGE 3 CV
    cq9m_status: '', // FLANGE 4 CV
    cq10m_status: '', // FLANGE 10 / 15 CV
    cq11m_status: '', // FLANGE 20 / 25 / 30 CV
    cq12m_status: '', // FLANGE 50 CV
    cq13m_status: '', // VERIFICAR LIMPEZA INTERNA DO RESERVATÓRIO
    cq14m_status: '', // VERIFICAR A CORRETA MONTAGEM DOS COMPONENTES NA TAMPA
    cq15m_status: '', // VERIFICAR ALINHAMENTO DOS PARAFUSOS DO FLANGE
    cq16m_status: '', // PARTE INFERIOR DA TAMPA (SOLDAGEM DOS TUBOS)
    cq17m_status: '', // TESTE DE FALHA DE SOLDA LP (LIQUIDO PENETRANTE)
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
      const response = await fetch(`/api/formularios-central-subconjuntos/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">CQ-M: CENTRAL HIDRÁULICA (SUBCONJUNTOS) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">M - CENTRAL HIDRÁULICA (SETOR SUBCONJUNTOS)</h4>

        {renderCQField('CQ1-M: MONTAGEM DO RESERVATÓRIO', 'cq1m', 'Conforme desenho')}
        {renderCQField('CQ2-M: OLHAL DE IÇAMENTO', 'cq2m', 'Conforme desenho')}
        {renderCQField('CQ3-M: MONTAGEM VISOR DE NÍVEL', 'cq3m', 'Conforme desenho')}
        {renderCQField('CQ4-M: MONTAGEM E ESQUADRO DO RESERVATÓRIO', 'cq4m', '+/- 5 mm')}
        {renderCQField('CQ5-M: MONTAGEM DAS CHICANAS', 'cq5m', 'Conforme desenho')}
        {renderCQField('CQ6-M: PARTE INTERNA JANELA DE INSPEÇÃO', 'cq6m', 'Limpa; Sem rebarbas')}
        {renderCQField('CQ7-M: QUALIDADE DA SOLDA INTERNA DO RESERVATÓRIO', 'cq7m', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ8-M: FLANGE 3 CV', 'cq8m', 'Conforme desenho', true)}
        {renderCQField('CQ9-M: FLANGE 4 CV', 'cq9m', 'Conforme desenho', true)}
        {renderCQField('CQ10-M: FLANGE 10 / 15 CV', 'cq10m', 'Conforme desenho', true)}
        {renderCQField('CQ11-M: FLANGE 20 / 25 / 30 CV', 'cq11m', 'Conforme desenho', true)}
        {renderCQField('CQ12-M: FLANGE 50 CV', 'cq12m', 'Conforme desenho', true)}
        {renderCQField('CQ13-M: LIMPEZA INTERNA DO RESERVATÓRIO', 'cq13m', 'Limpo')}
        {renderCQField('CQ14-M: CORRETA MONTAGEM DOS COMPONENTES NA TAMPA', 'cq14m', 'Conforme desenho')}
        {renderCQField('CQ15-M: ALINHAMENTO DOS PARAFUSOS DO FLANGE', 'cq15m', 'Alinhados')}
        {renderCQField('CQ16-M: PARTE INFERIOR DA TAMPA (SOLDAGEM DOS TUBOS)', 'cq16m', 'Sem trinca; Sem porosidade')}
        {renderCQField('CQ17-M: TESTE DE FALHA DE SOLDA LP (LÍQUIDO PENETRANTE)', 'cq17m', 'Aprovado')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-M</span>)}
        </button>
      </div>
    </form>
  );
}
