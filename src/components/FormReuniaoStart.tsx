'use client';

import { useState } from 'react';

interface FormReuniaoStartProps {
  numeroOpd: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function FormReuniaoStart({ numeroOpd, onSubmit, onCancel }: FormReuniaoStartProps) {
  const [formData, setFormData] = useState({
    numero_opd: numeroOpd,
    // Cilindros (Estágios)
    cilindros_estagios: '',
    cilindros_especificacao: '',
    // Tipo de Piso
    tipo_piso: '',
    // Moldura
    moldura: '',
    // Calhas Laterais
    calhas_laterais: '',
    // Responsável e Data
    responsavel_reuniao: '',
    data_reuniao: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!formData.cilindros_estagios || !formData.tipo_piso || !formData.moldura ||
        !formData.calhas_laterais || !formData.responsavel_reuniao || !formData.data_reuniao) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Se selecionou "Outro", verificar se especificou
    if (formData.cilindros_estagios === 'Outro' && !formData.cilindros_especificacao) {
      alert('Por favor, especifique o tipo de cilindro');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 sticky top-0 z-10">
        <h3 className="font-semibold text-red-900">REGISTRO - REUNIÃO DE START</h3>
        <p className="text-sm text-red-700 mt-1">* Indica uma pergunta obrigatória</p>
      </div>

      {/* CILINDROS (ESTÁGIOS) */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">CILINDROS (ESTÁGIOS)</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o tipo de cilindro: <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="4 estágios para 18m (191mm)"
                checked={formData.cilindros_estagios === '4 estágios para 18m (191mm)'}
                onChange={(e) => setFormData({ ...formData, cilindros_estagios: e.target.value, cilindros_especificacao: '' })}
                className="mr-2"
              />
              4 estágios para 18m (191mm)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="4 estágios padrão (214mm)"
                checked={formData.cilindros_estagios === '4 estágios padrão (214mm)'}
                onChange={(e) => setFormData({ ...formData, cilindros_estagios: e.target.value, cilindros_especificacao: '' })}
                className="mr-2"
              />
              4 estágios padrão (214mm)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="3 estágios hyva"
                checked={formData.cilindros_estagios === '3 estágios hyva'}
                onChange={(e) => setFormData({ ...formData, cilindros_estagios: e.target.value, cilindros_especificacao: '' })}
                className="mr-2"
              />
              3 estágios hyva
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="3 estágios importado"
                checked={formData.cilindros_estagios === '3 estágios importado'}
                onChange={(e) => setFormData({ ...formData, cilindros_estagios: e.target.value, cilindros_especificacao: '' })}
                className="mr-2"
              />
              3 estágios importado
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Outro"
                checked={formData.cilindros_estagios === 'Outro'}
                onChange={(e) => setFormData({ ...formData, cilindros_estagios: e.target.value })}
                className="mr-2"
              />
              Outro
            </label>
          </div>

          {/* Campo condicional para especificar "Outro" */}
          {formData.cilindros_estagios === 'Outro' && (
            <div className="mt-3 ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especifique: <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.cilindros_especificacao}
                onChange={(e) => setFormData({ ...formData, cilindros_especificacao: e.target.value })}
                placeholder="Descreva o tipo de cilindro"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* TIPO DE PISO */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">TIPO DE PISO</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o tipo de piso: <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="Fechado"
                checked={formData.tipo_piso === 'Fechado'}
                onChange={(e) => setFormData({ ...formData, tipo_piso: e.target.value })}
                className="mr-2"
              />
              Fechado
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Gradeado"
                checked={formData.tipo_piso === 'Gradeado'}
                onChange={(e) => setFormData({ ...formData, tipo_piso: e.target.value })}
                className="mr-2"
              />
              Gradeado
            </label>
          </div>
        </div>
      </div>

      {/* MOLDURA */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">MOLDURA</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o tipo de moldura: <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="Sem moldura"
                checked={formData.moldura === 'Sem moldura'}
                onChange={(e) => setFormData({ ...formData, moldura: e.target.value })}
                className="mr-2"
              />
              Sem moldura
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Com moldura até cilindros"
                checked={formData.moldura === 'Com moldura até cilindros'}
                onChange={(e) => setFormData({ ...formData, moldura: e.target.value })}
                className="mr-2"
              />
              Com moldura até cilindros
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Com moldura curta"
                checked={formData.moldura === 'Com moldura curta'}
                onChange={(e) => setFormData({ ...formData, moldura: e.target.value })}
                className="mr-2"
              />
              Com moldura curta
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Com moldura completa"
                checked={formData.moldura === 'Com moldura completa'}
                onChange={(e) => setFormData({ ...formData, moldura: e.target.value })}
                className="mr-2"
              />
              Com moldura completa
            </label>
          </div>
        </div>
      </div>

      {/* CALHAS LATERAIS */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">CALHAS LATERAIS</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Possui calhas laterais? <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="Sim"
                checked={formData.calhas_laterais === 'Sim'}
                onChange={(e) => setFormData({ ...formData, calhas_laterais: e.target.value })}
                className="mr-2"
              />
              Sim
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Não"
                checked={formData.calhas_laterais === 'Não'}
                onChange={(e) => setFormData({ ...formData, calhas_laterais: e.target.value })}
                className="mr-2"
              />
              Não
            </label>
          </div>
        </div>
      </div>

      {/* RESPONSÁVEL E DATA */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">RESPONSÁVEL</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do responsável pela reunião: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.responsavel_reuniao}
            onChange={(e) => setFormData({ ...formData, responsavel_reuniao: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data da reunião: <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.data_reuniao}
            onChange={(e) => setFormData({ ...formData, data_reuniao: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
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
