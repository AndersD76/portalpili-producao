'use client';

import { useState } from 'react';

interface FormularioColetorMontagemInicialProps {
  opd: string;
  cliente: string;
  atividadeId?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormularioColetorMontagemInicial({ opd, cliente, atividadeId, onSubmit, onCancel }: FormularioColetorMontagemInicialProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cq1ac_status: '', // MONTAGEM
    cq2ac_status: '', // FOLGA ENTRE LANCAS
    cq3ac_status: '', // SOLDA
    cq4ac_velocidade: '', // VELOCIDADE DE AVANÇO DA LANÇA (texto)
    cq5ac_status: '', // VELOCIDADE DE GIRO (<18s em 180 graus)
    cq6ac_status: '', // PONTOS DE LUBRIFICAÇÃO
    cq7ac_status: '', // VELOCIDADE DESCIDA (16s)
    cq8ac_status: '', // PINOS CONFORME PROJETO
    cq9ac_status: '', // TESTE DE SUCÇÃO
    cq10ac_status: '', // POSIÇÃO DE MANGUEIRAS
    cq11ac_status: '', // ALINHAMENTO DOS CILINDROS
    cq12ac_status: '', // REGULAGEM DO APOIO DO CILINDRO DA LANÇA
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
      const response = await fetch(`/api/formularios-coletor-montagem-inicial/${opd}`, {
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

  const renderTextField = (label: string, fieldName: string, criterio: string) => (
    <div className="border rounded-lg p-4 bg-white mb-3">
      <h5 className="font-bold text-gray-900 mb-2">{label}</h5>
      <p className="text-sm text-blue-700 mb-2">Critérios: {criterio}</p>
      <input
        type="text"
        name={fieldName}
        value={(formData as any)[fieldName]}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        placeholder="Digite o valor..."
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
        <h3 className="font-bold text-lg mb-2">CQ-Ac: MONTAGEM INICIAL (COLETOR) - OPD: {opd}</h3>
        <p className="text-gray-700">CLIENTE: {cliente}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">COLETORES DE GRÃOS</span>
      </div>

      <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-xl mb-4 text-green-900">Ac - MONTAGEM INICIAL</h4>

        {renderCQField('CQ1-Ac: MONTAGEM', 'cq1ac', 'Conforme desenho')}
        {renderCQField('CQ2-Ac: FOLGA ENTRE LANÇAS', 'cq2ac', 'Sem tolerância')}
        {renderCQField('CQ3-Ac: SOLDA', 'cq3ac', 'Sem trinca; Sem porosidade')}
        {renderTextField('CQ4-Ac: VELOCIDADE DE AVANÇO DA LANÇA', 'cq4ac_velocidade', 'Informar velocidade medida')}
        {renderCQField('CQ5-Ac: VELOCIDADE DE GIRO (<18s em 180° / <27s em 270°)', 'cq5ac', '<18s em 180°')}
        {renderCQField('CQ6-Ac: PONTOS DE LUBRIFICAÇÃO', 'cq6ac', 'Lubrificados')}
        {renderCQField('CQ7-Ac: VELOCIDADE DESCIDA (16s máx ao mín)', 'cq7ac', 'Tolerância de 2s')}
        {renderCQField('CQ8-Ac: PINOS CONFORME PROJETO', 'cq8ac', 'Conforme desenho')}
        {renderCQField('CQ9-Ac: TESTE DE SUCÇÃO (usar grãos na mão)', 'cq9ac', 'Sucção OK')}
        {renderCQField('CQ10-Ac: POSIÇÃO DE MANGUEIRAS (torção, dobramento, esticamento)', 'cq10ac', 'Sem danos')}
        {renderCQField('CQ11-Ac: ALINHAMENTO DOS CILINDROS', 'cq11ac', 'Alinhados com gabarito')}
        {renderCQField('CQ12-Ac: REGULAGEM DO APOIO DO CILINDRO DA LANÇA', 'cq12ac', 'Regulado')}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2" disabled={loading}>
          {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Salvando...</span></>) : (<span>Salvar CQ-Ac</span>)}
        </button>
      </div>
    </form>
  );
}
