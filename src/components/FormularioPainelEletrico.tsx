'use client';

import { useState } from 'react';

interface FormularioPainelEletricoProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioPainelEletrico({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioPainelEletricoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1n_status: '', // CONDIÇÕES FISICAS DA CAIXA
    cq2n_status: '', // INEXISTÊNCIA DE FIOS SOLTOS
    cq3n_status: '', // LAYOUT
    cq4n_status: '', // IDENTIFICAÇÃO DE TODOS OS FIOS
    cq5n_status: '', // IDENTIFICAÇÃO DOS BORNERS RELÉ
    cq6n_status: '', // IDENTIFICAÇÃO DOS BORNES
    cq7n_status: '', // FUROS COM PRENSA CABOS OU SIMILARES
    cq8n_status: '', // VEDAÇÃO DA TAMPA
    cq9n_status: '', // ADESIVO DOS BOTÕES COM IDENTIFICAÇÃO E ALINHAMENTO
    cq10n_status: '', // CONTROLE REMOTO COM PILHAS DENTRO DO PAINEL
    cq11n_status: '', // CAPA DE SILICONE NOS BOTÕES
    cq12n_status: '', // VERIFICAR SE AS PROTEÇÕES DA SOFTSTARTER ESTÃO LIGADAS
    cq13n_status: '', // REGULAGEM RELÉ DE SOBRECARGA
    cq14n_status: '', // CONFERIR A TENSÃO DA FONTE ANTES DE ALIMENTAR O PAINEL
    cq15n_status: '', // VERIFICAR SE TEM O ACRÍLICO NOS BARRAMENTOS DE FORÇA
    cq16n_status: '', // VERIFICAR SE O RECEPTOR ESTÁ INSTALADO NA LATERAL DA CAIXA
    cq17n_status: '', // VERIFICAR APERTO DOS PARAFUSOS DA FIXAÇÃO DO PAINEL ELÉTRICO
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
      const response = await fetch(`/api/formularios-painel-eletrico/${opd}`, {
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
        <h3 className="font-bold text-lg mb-2">CQ-N: PAINEL ELÉTRICO - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
      </div>

      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-xl mb-4 text-red-900">N - PAINEL ELÉTRICO</h4>

        {renderCQField('CQ1-N: CONDIÇÕES FÍSICAS DA CAIXA', 'cq1n', 'Sem danos; Sem amassados')}
        {renderCQField('CQ2-N: INEXISTÊNCIA DE FIOS SOLTOS', 'cq2n', 'Sem fios soltos')}
        {renderCQField('CQ3-N: LAYOUT', 'cq3n', 'Conforme projeto')}
        {renderCQField('CQ4-N: IDENTIFICAÇÃO DE TODOS OS FIOS', 'cq4n', 'Todos identificados')}
        {renderCQField('CQ5-N: IDENTIFICAÇÃO DOS BORNERS RELÉ', 'cq5n', 'Todos identificados')}
        {renderCQField('CQ6-N: IDENTIFICAÇÃO DOS BORNES', 'cq6n', 'Todos identificados')}
        {renderCQField('CQ7-N: FUROS COM PRENSA CABOS OU SIMILARES', 'cq7n', 'Conforme projeto')}
        {renderCQField('CQ8-N: VEDAÇÃO DA TAMPA', 'cq8n', 'Vedação OK')}
        {renderCQField('CQ9-N: ADESIVO DOS BOTÕES COM IDENTIFICAÇÃO E ALINHAMENTO', 'cq9n', 'Identificados e alinhados')}
        {renderCQField('CQ10-N: CONTROLE REMOTO COM PILHAS DENTRO DO PAINEL', 'cq10n', 'Presente')}
        {renderCQField('CQ11-N: CAPA DE SILICONE NOS BOTÕES', 'cq11n', 'Instaladas')}
        {renderCQField('CQ12-N: PROTEÇÕES DA SOFTSTARTER ESTÃO LIGADAS', 'cq12n', 'Ligadas')}
        {renderCQField('CQ13-N: REGULAGEM RELÉ DE SOBRECARGA', 'cq13n', 'Regulado conforme especificação')}
        {renderCQField('CQ14-N: CONFERIR TENSÃO DA FONTE ANTES DE ALIMENTAR O PAINEL', 'cq14n', 'Tensão correta')}
        {renderCQField('CQ15-N: ACRÍLICO NOS BARRAMENTOS DE FORÇA', 'cq15n', 'Instalado')}
        {renderCQField('CQ16-N: RECEPTOR INSTALADO NA LATERAL DA CAIXA', 'cq16n', 'Instalado')}
        {renderCQField('CQ17-N: APERTO DOS PARAFUSOS DA FIXAÇÃO DO PAINEL', 'cq17n', 'Torque conforme especificação')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-N</span>)}
        </button>
      </div>
    </form>
  );
}
