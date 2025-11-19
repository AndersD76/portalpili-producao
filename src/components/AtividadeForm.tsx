'use client';

import { useState, useEffect } from 'react';
import { Atividade } from '@/types/atividade';

interface AtividadeFormProps {
  atividade?: Atividade | null;
  numeroOpd: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AtividadeForm({ atividade, numeroOpd, onSuccess, onCancel }: AtividadeFormProps) {
  const [formData, setFormData] = useState({
    atividade: '',
    responsavel: 'PCP',
    previsao_inicio: '',
    data_pedido: '',
    data_inicio: '',
    data_termino: '',
    status: 'A REALIZAR' as 'A REALIZAR' | 'EM ANDAMENTO' | 'CONCLUÍDA',
    observacoes: '',
    dias: '',
    formulario_tipo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (atividade) {
      // Extrair o tipo de formulário do filename
      let formulario_tipo = '';
      if (atividade.formulario_anexo?.filename) {
        formulario_tipo = atividade.formulario_anexo.filename.replace('.pdf', '');
      }

      setFormData({
        atividade: atividade.atividade || '',
        responsavel: atividade.responsavel || 'PCP',
        previsao_inicio: atividade.previsao_inicio ? atividade.previsao_inicio.split('T')[0] : '',
        data_pedido: atividade.data_pedido ? atividade.data_pedido.split('T')[0] : '',
        data_inicio: atividade.data_inicio ? atividade.data_inicio.split('T')[0] : '',
        data_termino: atividade.data_termino ? atividade.data_termino.split('T')[0] : '',
        status: atividade.status || 'A REALIZAR',
        observacoes: atividade.observacoes || '',
        dias: atividade.dias ? String(atividade.dias) : '',
        formulario_tipo
      });
    }
  }, [atividade]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = atividade
        ? `/api/atividades/${numeroOpd}/${atividade.id}`
        : `/api/atividades/${numeroOpd}`;
      const method = atividade ? 'PATCH' : 'POST';

      // Mapear formulário tipo para o arquivo correspondente
      const formularios: { [key: string]: string } = {
        'preparacao': 'preparacao.pdf',
        'desembarque-pre-instalacao': 'desembarque-pre-instalacao.pdf',
        'liberacao-embarque': 'liberacao-embarque.pdf',
        'entrega': 'entrega.pdf'
      };

      const formulario_anexo = formData.formulario_tipo && formularios[formData.formulario_tipo]
        ? {
            filename: formularios[formData.formulario_tipo],
            url: `/forms/${formularios[formData.formulario_tipo]}`,
            size: 0
          }
        : null;

      const payload: any = {
        atividade: formData.atividade,
        responsavel: formData.responsavel,
        previsao_inicio: formData.previsao_inicio || null,
        data_pedido: formData.data_pedido || null,
        data_inicio: formData.data_inicio || null,
        data_termino: formData.data_termino || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        dias: formData.dias ? parseInt(formData.dias) : null,
        numero_opd: numeroOpd,
        formulario_anexo
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Erro ao salvar atividade');
      }
    } catch (err) {
      setError('Erro ao salvar atividade');
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
        <label htmlFor="atividade" className="block text-sm font-medium text-gray-700 mb-1">
          Nome da Atividade *
        </label>
        <input
          type="text"
          id="atividade"
          name="atividade"
          value={formData.atividade}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="Ex: CRIAÇÃO DA OPD"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="responsavel" className="block text-sm font-medium text-gray-700 mb-1">
            Responsável *
          </label>
          <select
            id="responsavel"
            name="responsavel"
            value={formData.responsavel}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="PCP">PCP</option>
            <option value="ENGENHARIA">ENGENHARIA</option>
            <option value="ENGENHARIA (MEC)">ENGENHARIA (MEC)</option>
            <option value="ENGENHARIA (ELE/HID)">ENGENHARIA (ELE/HID)</option>
            <option value="PRODUÇÃO">PRODUÇÃO</option>
            <option value="FINANCEIRO">FINANCEIRO</option>
            <option value="OUTROS">OUTROS</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="A REALIZAR">A REALIZAR</option>
            <option value="EM ANDAMENTO">EM ANDAMENTO</option>
            <option value="CONCLUÍDA">CONCLUÍDA</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700 mb-1">
            Data de Início
          </label>
          <input
            type="date"
            id="data_inicio"
            name="data_inicio"
            value={formData.data_inicio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="data_termino" className="block text-sm font-medium text-gray-700 mb-1">
            Data de Término
          </label>
          <input
            type="date"
            id="data_termino"
            name="data_termino"
            value={formData.data_termino}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="dias" className="block text-sm font-medium text-gray-700 mb-1">
            Duração (dias)
          </label>
          <input
            type="number"
            id="dias"
            name="dias"
            value={formData.dias}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: 5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="formulario_tipo" className="block text-sm font-medium text-gray-700 mb-1">
          Formulário de Instalação
        </label>
        <select
          id="formulario_tipo"
          name="formulario_tipo"
          value={formData.formulario_tipo}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="">Sem formulário</option>
          <option value="preparacao">PREPARAÇÃO</option>
          <option value="desembarque-pre-instalacao">DESEMBARQUE E PRÉ INSTALAÇÃO</option>
          <option value="liberacao-embarque">LIBERAÇÃO E EMBARQUE</option>
          <option value="entrega">ENTREGA</option>
        </select>
      </div>

      <div>
        <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="Observações sobre a atividade..."
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
          {loading ? 'Salvando...' : atividade ? 'Atualizar' : 'Criar Atividade'}
        </button>
      </div>
    </form>
  );
}
