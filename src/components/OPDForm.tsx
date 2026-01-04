'use client';

import { useState, useEffect } from 'react';
import { OPD } from '@/types/opd';

interface OPDFormProps {
  opd?: OPD | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function OPDForm({ opd, onSuccess, onCancel }: OPDFormProps) {
  const [formData, setFormData] = useState({
    numero: '',
    data_pedido: '',
    previsao_inicio: '',
    previsao_termino: '',
    inicio_producao: '',
    tipo_opd: 'PAI',
    responsavel_opd: 'PCP'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opd) {
      setFormData({
        numero: opd.numero || '',
        data_pedido: opd.data_pedido ? opd.data_pedido.split('T')[0] : '',
        previsao_inicio: opd.previsao_inicio ? opd.previsao_inicio.split('T')[0] : '',
        previsao_termino: opd.previsao_termino ? opd.previsao_termino.split('T')[0] : '',
        inicio_producao: opd.inicio_producao ? opd.inicio_producao.split('T')[0] : '',
        tipo_opd: opd.tipo_opd || 'PAI',
        responsavel_opd: opd.responsavel_opd || 'PCP'
      });
    }
  }, [opd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = opd ? `/api/opds/${opd.id}` : '/api/opds';
      const method = opd ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Erro ao salvar OPD');
      }
    } catch (err) {
      setError('Erro ao salvar OPD');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
          Número da OPD *
        </label>
        <input
          type="text"
          id="numero"
          name="numero"
          value={formData.numero}
          onChange={handleChange}
          required
          disabled={!!opd}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="Ex: 3212025"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipo_opd" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de OPD
          </label>
          <select
            id="tipo_opd"
            name="tipo_opd"
            value={formData.tipo_opd}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="PAI">PAI</option>
            <option value="FILHA">FILHA</option>
          </select>
        </div>

        <div>
          <label htmlFor="responsavel_opd" className="block text-sm font-medium text-gray-700 mb-1">
            Responsável
          </label>
          <select
            id="responsavel_opd"
            name="responsavel_opd"
            value={formData.responsavel_opd}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="PCP">PCP</option>
            <option value="ENGENHARIA">ENGENHARIA</option>
            <option value="PRODUÇÃO">PRODUÇÃO</option>
            <option value="OUTROS">OUTROS</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="data_pedido" className="block text-sm font-medium text-gray-700 mb-1">
          Data do Pedido
        </label>
        <input
          type="date"
          id="data_pedido"
          name="data_pedido"
          value={formData.data_pedido}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="previsao_inicio" className="block text-sm font-medium text-gray-700 mb-1">
            Previsão de Início
          </label>
          <input
            type="date"
            id="previsao_inicio"
            name="previsao_inicio"
            value={formData.previsao_inicio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="previsao_termino" className="block text-sm font-medium text-gray-700 mb-1">
            Previsão de Término
          </label>
          <input
            type="date"
            id="previsao_termino"
            name="previsao_termino"
            value={formData.previsao_termino}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label htmlFor="inicio_producao" className="block text-sm font-medium text-gray-700 mb-1">
          Início da Produção
        </label>
        <input
          type="date"
          id="inicio_producao"
          name="inicio_producao"
          value={formData.inicio_producao}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? 'Salvando...' : opd ? 'Atualizar' : 'Criar OPD'}
        </button>
      </div>
    </form>
  );
}
