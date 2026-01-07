'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ORIGENS_ACAO_CORRETIVA,
  METODOS_ANALISE,
  OrigemAcaoCorretiva,
  MetodoAnalise
} from '@/types/qualidade';

function NovaAcaoCorretivaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    data_abertura: new Date().toISOString().split('T')[0],
    origem_tipo: '' as OrigemAcaoCorretiva | '',
    origem_id: '',
    origem_descricao: '',
    descricao_problema: '',
    metodo_analise: '' as MetodoAnalise | '',
    responsavel_principal: '',
    prazo_conclusao: '',
    equipe: ''
  });

  // Preencher origem se vier de uma NC ou Reclamação
  useEffect(() => {
    const origemTipo = searchParams.get('origem_tipo');
    const origemId = searchParams.get('origem_id');
    const origemDescricao = searchParams.get('origem_descricao');

    if (origemTipo) {
      setFormData(prev => ({
        ...prev,
        origem_tipo: origemTipo as OrigemAcaoCorretiva,
        origem_id: origemId || '',
        origem_descricao: origemDescricao || ''
      }));
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      // Processar equipe
      const equipeArray = formData.equipe
        ? formData.equipe.split(',').map(e => e.trim()).filter(e => e)
        : null;

      const response = await fetch('/api/qualidade/acao-corretiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_abertura: formData.data_abertura,
          origem_tipo: formData.origem_tipo,
          origem_id: formData.origem_id ? parseInt(formData.origem_id) : null,
          origem_descricao: formData.origem_descricao || null,
          descricao_problema: formData.descricao_problema,
          metodo_analise: formData.metodo_analise || null,
          responsavel_principal: formData.responsavel_principal || null,
          prazo_conclusao: formData.prazo_conclusao || null,
          equipe: equipeArray,
          created_by: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/qualidade/acao-corretiva');
      } else {
        setError(result.error || 'Erro ao criar ação corretiva');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Identificação */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Identificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Abertura *</label>
            <input
              type="date"
              name="data_abertura"
              value={formData.data_abertura}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
            <select
              name="origem_tipo"
              value={formData.origem_tipo}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              {Object.entries(ORIGENS_ACAO_CORRETIVA).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          {(formData.origem_tipo === 'NAO_CONFORMIDADE' || formData.origem_tipo === 'RECLAMACAO') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID de Referência</label>
              <input
                type="text"
                name="origem_id"
                value={formData.origem_id}
                onChange={handleChange}
                placeholder="ID da NC ou Reclamação"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
          <div className={formData.origem_tipo === 'NAO_CONFORMIDADE' || formData.origem_tipo === 'RECLAMACAO' ? '' : 'sm:col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Origem</label>
            <input
              type="text"
              name="origem_descricao"
              value={formData.origem_descricao}
              onChange={handleChange}
              placeholder="Descrição resumida da origem"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Descrição do Problema */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Descrição do Problema</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
            <textarea
              name="descricao_problema"
              value={formData.descricao_problema}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Descreva detalhadamente o problema que originou esta ação corretiva..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Análise</label>
            <select
              name="metodo_analise"
              value={formData.metodo_analise}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              {Object.entries(METODOS_ANALISE).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Selecione o método que será usado para análise de causa raiz</p>
          </div>
        </div>
      </div>

      {/* Responsáveis */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Responsáveis e Prazo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável Principal</label>
            <input
              type="text"
              name="responsavel_principal"
              value={formData.responsavel_principal}
              onChange={handleChange}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Conclusão</label>
            <input
              type="date"
              name="prazo_conclusao"
              value={formData.prazo_conclusao}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
            <input
              type="text"
              name="equipe"
              value={formData.equipe}
              onChange={handleChange}
              placeholder="Nomes separados por vírgula (ex: João, Maria, Pedro)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Membros da equipe que participarão da análise</p>
          </div>
        </div>
      </div>

      {/* Informação Adicional */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Próximas Etapas</p>
            <p>Após criar esta RAC, você poderá:</p>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>Realizar a análise de causa raiz</li>
              <li>Definir e acompanhar ações corretivas</li>
              <li>Verificar a eficácia das ações</li>
              <li>Documentar a padronização</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Salvando...' : 'Registrar Ação Corretiva'}
        </button>
        <Link
          href="/qualidade/acao-corretiva"
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-center font-medium"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export default function NovaAcaoCorretivaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/qualidade/acao-corretiva"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nova Ação Corretiva</h1>
              <p className="text-sm text-gray-600">Registrar uma nova RAC</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        }>
          <NovaAcaoCorretivaForm />
        </Suspense>
      </main>
    </div>
  );
}
