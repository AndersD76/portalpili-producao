'use client';

import { useState } from 'react';

interface FormEntregaProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormEntrega({
  numeroOpd,
  onSubmit,
  onCancel,
}: FormEntregaProps) {
  const [formData, setFormData] = useState({
    data_entrega: '',
    hora_entrega: '',
    local_entrega: '',
    responsavel_recebimento: '',
    documento_recebimento: '',
    condicao_final: '',
    observacoes: '',
    assinatura_cliente: '',
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
      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
        <h3 className="text-lg font-semibold text-green-900">
          Registro de Instalação - Entrega Final
        </h3>
        <p className="text-sm text-green-700 mt-1">OPD: {numeroOpd}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data da Entrega: <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            name="data_entrega"
            value={formData.data_entrega}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora da Entrega: <span className="text-red-600">*</span>
          </label>
          <input
            type="time"
            name="hora_entrega"
            value={formData.hora_entrega}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Local de Entrega: <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="local_entrega"
          value={formData.local_entrega}
          onChange={handleChange}
          placeholder="Endereço completo do local"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            Documento (CPF/CNPJ): <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="documento_recebimento"
            value={formData.documento_recebimento}
            onChange={handleChange}
            placeholder="000.000.000-00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condição Final do Equipamento: <span className="text-red-600">*</span>
        </label>
        <select
          name="condicao_final"
          value={formData.condicao_final}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required
        >
          <option value="">Selecione...</option>
          <option value="perfeito">Perfeito Estado</option>
          <option value="bom">Bom Estado</option>
          <option value="conforme">Conforme Especificado</option>
          <option value="com_ressalvas">Com Ressalvas</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assinatura do Cliente: <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="assinatura_cliente"
          value={formData.assinatura_cliente}
          onChange={handleChange}
          placeholder="Nome completo para assinatura"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Digite o nome completo como assinatura digital
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações Finais:
        </label>
        <textarea
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          rows={4}
          placeholder="Observações sobre a entrega final..."
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
