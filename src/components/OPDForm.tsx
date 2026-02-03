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
    data_prevista_entrega: '',
    inicio_producao: '',
    tipo_opd: 'PAI',
    tipo_produto: 'TOMBADOR', // TOMBADOR ou COLETOR
    responsavel_opd: 'PCP'
  });
  const [originalDatas, setOriginalDatas] = useState({
    previsao_inicio: '',
    previsao_termino: '',
    data_prevista_entrega: '',
    inicio_producao: ''
  });
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opd) {
      const dados = {
        numero: opd.numero || '',
        data_pedido: opd.data_pedido ? opd.data_pedido.split('T')[0] : '',
        previsao_inicio: opd.previsao_inicio ? opd.previsao_inicio.split('T')[0] : '',
        previsao_termino: opd.previsao_termino ? opd.previsao_termino.split('T')[0] : '',
        data_prevista_entrega: opd.data_prevista_entrega ? opd.data_prevista_entrega.split('T')[0] : (opd.data_entrega ? opd.data_entrega.split('T')[0] : ''),
        inicio_producao: opd.inicio_producao ? opd.inicio_producao.split('T')[0] : '',
        tipo_opd: opd.tipo_opd || 'PAI',
        tipo_produto: (opd as any).tipo_produto || 'TOMBADOR',
        responsavel_opd: opd.responsavel_opd || 'PCP'
      };
      setFormData(dados);
      // Salvar datas originais para comparação
      setOriginalDatas({
        previsao_inicio: dados.previsao_inicio,
        previsao_termino: dados.previsao_termino,
        data_prevista_entrega: dados.data_prevista_entrega,
        inicio_producao: dados.inicio_producao
      });
    }
  }, [opd]);

  // Verificar se houve mudança nas datas
  const datasForamAlteradas = opd && (
    formData.previsao_inicio !== originalDatas.previsao_inicio ||
    formData.previsao_termino !== originalDatas.previsao_termino ||
    formData.data_prevista_entrega !== originalDatas.data_prevista_entrega ||
    formData.inicio_producao !== originalDatas.inicio_producao
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar motivo se houver alteração de datas
    if (datasForamAlteradas && !motivo.trim()) {
      setError('Por favor, informe o motivo da alteração das datas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = opd ? `/api/opds/${opd.id}` : '/api/opds';
      const method = opd ? 'PATCH' : 'POST';

      // Obter nome do usuário do localStorage
      const userData = localStorage.getItem('user_data');
      const usuario = userData ? JSON.parse(userData).nome : 'Sistema';

      const bodyData = {
        ...formData,
        ...(datasForamAlteradas ? { motivo_alteracao: motivo, usuario_alteracao: usuario } : {})
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
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

      {/* Tipo de Produto - IMPORTANTE */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <label className="block text-sm font-bold text-blue-900 mb-2">
          Tipo de Produto *
        </label>
        <p className="text-xs text-blue-700 mb-3">
          Define as atividades e formulários de produção
        </p>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition ${
              formData.tipo_produto === 'TOMBADOR'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="tipo_produto"
              value="TOMBADOR"
              checked={formData.tipo_produto === 'TOMBADOR'}
              onChange={handleChange}
              className="sr-only"
            />
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-bold">TOMBADOR</span>
              <p className="text-xs mt-1">Plataformas de descarga</p>
            </div>
          </label>
          <label
            className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition ${
              formData.tipo_produto === 'COLETOR'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="tipo_produto"
              value="COLETOR"
              checked={formData.tipo_produto === 'COLETOR'}
              onChange={handleChange}
              className="sr-only"
            />
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span className="font-bold">COLETOR</span>
              <p className="text-xs mt-1">Coletores de grãos</p>
            </div>
          </label>
        </div>
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

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <label htmlFor="data_prevista_entrega" className="block text-sm font-bold text-orange-900 mb-1">
          📅 Data de Entrega Prevista
        </label>
        <p className="text-xs text-orange-700 mb-2">
          Data que aparecerá no calendário de entregas
        </p>
        <input
          type="date"
          id="data_prevista_entrega"
          name="data_prevista_entrega"
          value={formData.data_prevista_entrega}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
        />
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

      {/* Campo de motivo - aparece quando há alteração de datas em edição */}
      {datasForamAlteradas && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <label htmlFor="motivo" className="block text-sm font-bold text-yellow-900 mb-1">
            Motivo da Alteração *
          </label>
          <p className="text-xs text-yellow-700 mb-2">
            Informe o motivo da alteração das datas. Isso será registrado no histórico.
          </p>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            required
            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
            placeholder="Ex: Solicitação do cliente, atraso na entrega de materiais, etc."
          />
        </div>
      )}

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
