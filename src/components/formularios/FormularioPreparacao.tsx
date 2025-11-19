'use client';

import { useState } from 'react';
import { DadosPreparacao } from '@/types/atividade';

interface FormularioPreparacaoProps {
  numeroOPD: string;
  atividadeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FormularioPreparacao({
  numeroOPD,
  atividadeId,
  onSuccess,
  onCancel
}: FormularioPreparacaoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DadosPreparacao>({
    numero_opd: numeroOPD,
    nome_cliente: '',
    modelo_equipamento: '',
    cidade_uf: '',
    data_prevista_inicio: '',
    tecnicos_designados: '',
    documentos_liberacao: {
      liberacao_montagem: false,
      esquema_eletrico: false,
      esquema_hidraulico: false,
      projeto_executivo: false,
      projeto_civil: false
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      documentos_liberacao: {
        ...prev.documentos_liberacao,
        [name]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formularios/${numeroOPD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          atividade_id: atividadeId,
          tipo_formulario: 'PREPARACAO',
          dados_formulario: formData,
          preenchido_por: 'Usuário do Sistema' // TODO: pegar do contexto de autenticação
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <h3 className="font-bold text-blue-900">REGISTRO DE INSTALAÇÃO - PREPARAÇÃO</h3>
        <p className="text-sm text-blue-800 mt-1">OPD: {numeroOPD}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* DADOS INICIAIS */}
      <div className="space-y-4">
        <h4 className="font-bold text-gray-900">DADOS INICIAIS</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número da OPD *
          </label>
          <input
            type="text"
            name="numero_opd"
            value={formData.numero_opd}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Cliente *
          </label>
          <input
            type="text"
            name="nome_cliente"
            value={formData.nome_cliente}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Nome completo do cliente"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo do Equipamento *
          </label>
          <input
            type="text"
            name="modelo_equipamento"
            value={formData.modelo_equipamento}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: Tombador 18m"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Onde será instalado (Cidade - UF) *
          </label>
          <input
            type="text"
            name="cidade_uf"
            value={formData.cidade_uf}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: São Paulo - SP"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Prevista para Início da Instalação *
          </label>
          <input
            type="date"
            name="data_prevista_inicio"
            value={formData.data_prevista_inicio}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo dos Técnicos Designados *
          </label>
          <input
            type="text"
            name="tecnicos_designados"
            value={formData.tecnicos_designados}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Nome dos técnicos separados por vírgula"
          />
        </div>
      </div>

      {/* DOCUMENTOS OBRIGATÓRIOS */}
      <div className="space-y-4">
        <h4 className="font-bold text-gray-900">DOCUMENTOS OBRIGATÓRIOS</h4>
        <p className="text-sm text-gray-600">Marque os documentos que foram anexados:</p>

        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="liberacao_montagem"
              checked={formData.documentos_liberacao.liberacao_montagem}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              Anexar documentos de liberação de montagem do cliente
            </span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="esquema_eletrico"
              checked={formData.documentos_liberacao.esquema_eletrico}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Anexar o Esquema Elétrico</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="esquema_hidraulico"
              checked={formData.documentos_liberacao.esquema_hidraulico}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Anexar o Esquema Hidráulico</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="projeto_executivo"
              checked={formData.documentos_liberacao.projeto_executivo}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Anexar o Projeto Executivo</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="projeto_civil"
              checked={formData.documentos_liberacao.projeto_civil}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Anexar o Projeto Civil</span>
          </label>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
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
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar e Concluir Etapa</span>
          )}
        </button>
      </div>
    </form>
  );
}
