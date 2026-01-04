'use client';

import { useState } from 'react';

interface FormDesembarqueProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormDesembarque({
  numeroOpd,
  onSubmit,
  onCancel,
}: FormDesembarqueProps) {
  const [formData, setFormData] = useState({
    data_desembarque: '',
    hora_desembarque: '',
    local_desembarque: '',
    responsavel_recebimento: '',
    condicao_equipamento: '',
    observacoes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900">
          Registro de Instalação - Desembarque e Pré-Instalação
        </h3>
        <p className="text-sm text-blue-700 mt-1">OPD: {numeroOpd}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do Desembarque: <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            name="data_desembarque"
            value={formData.data_desembarque}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora do Desembarque: <span className="text-red-600">*</span>
          </label>
          <input
            type="time"
            name="hora_desembarque"
            value={formData.hora_desembarque}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Local do Desembarque: <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="local_desembarque"
          value={formData.local_desembarque}
          onChange={handleChange}
          placeholder="Endereço completo do local"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Responsável pelo Recebimento: <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="responsavel_recebimento"
          value={formData.responsavel_recebimento}
          onChange={handleChange}
          placeholder="Nome completo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condição do Equipamento: <span className="text-red-600">*</span>
        </label>
        <select
          name="condicao_equipamento"
          value={formData.condicao_equipamento}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required
        >
          <option value="">Selecione...</option>
          <option value="perfeito">Perfeito Estado</option>
          <option value="bom">Bom Estado</option>
          <option value="avariado">Avariado</option>
          <option value="danificado">Danificado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações:
        </label>
        <textarea
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          rows={4}
          placeholder="Observações sobre o desembarque e pré-instalação..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Salvar e Concluir Atividade
        </button>
      </div>
    </form>
  );
}
