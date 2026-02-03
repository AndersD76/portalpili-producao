'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface FormPreparacaoProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormPreparacao({ numeroOpd, onSubmit, onCancel }: FormPreparacaoProps) {
  const [formData, setFormData] = useState({
    numero_opd: numeroOpd,
    nome_cliente: '',
    modelo_equipamento: '',
    cidade_uf: '',
    data_prevista_inicio: '',
    tecnicos_designados: '',
    doc_liberacao_montagem: null as File | null,
    esquema_eletrico: null as File | null,
    esquema_hidraulico: null as File | null,
    projeto_executivo: null as File | null,
    projeto_civil: null as File | null,
  });

  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!formData.nome_cliente || !formData.modelo_equipamento || !formData.cidade_uf ||
        !formData.data_prevista_inicio || !formData.tecnicos_designados) {
      toast.warning('Por favor, preencha todos os campos obrigatorios');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
        <h3 className="font-semibold text-red-900">REGISTRO DE INSTALAÇÃO - PREPARAÇÃO</h3>
        <p className="text-sm text-red-700 mt-1">* Indica uma pergunta obrigatória</p>
      </div>

      {/* DADOS INICIAIS */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">DADOS INICIAIS</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número da OPD: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={numeroOpd}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do cliente: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.nome_cliente}
            onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo do equipamento: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.modelo_equipamento}
            onChange={(e) => setFormData({ ...formData, modelo_equipamento: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Onde será instalado o equipamento (Cidade - UF): <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.cidade_uf}
            onChange={(e) => setFormData({ ...formData, cidade_uf: e.target.value })}
            required
            placeholder="Ex: São Paulo - SP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data prevista para início da instalação: <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.data_prevista_inicio}
            onChange={(e) => setFormData({ ...formData, data_prevista_inicio: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo dos técnicos designados: <span className="text-red-600">*</span>
          </label>
          <textarea
            value={formData.tecnicos_designados}
            onChange={(e) => setFormData({ ...formData, tecnicos_designados: e.target.value })}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* DOCUMENTOS OBRIGATÓRIOS */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">DOCUMENTOS OBRIGATÓRIOS</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar documentos de liberação de montagem do cliente: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('doc_liberacao_montagem', e.target.files?.[0] || null)}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar o Esquema Elétrico: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('esquema_eletrico', e.target.files?.[0] || null)}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar o Esquema Hidráulico: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('esquema_hidraulico', e.target.files?.[0] || null)}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar o Projeto Executivo: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('projeto_executivo', e.target.files?.[0] || null)}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anexar o Projeto Civil: <span className="text-red-600">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => handleFileChange('projeto_civil', e.target.files?.[0] || null)}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botões */}
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
          Enviar Formulário
        </button>
      </div>
    </form>
  );
}
