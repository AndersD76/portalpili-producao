'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProcessoOrigem, PROCESSOS_ORIGEM } from '@/types/qualidade';
import AssistenteIAQualidade from '@/components/qualidade/AssistenteIAQualidade';
import { useAuth } from '@/contexts/AuthContext';

function NovaAcaoCorretivaForm() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pegar origem da NC se vier do link
  const origemTipo = searchParams.get('origem_tipo');
  const origemId = searchParams.get('origem_id');
  const origemDescricao = searchParams.get('origem_descricao');

  const [formData, setFormData] = useState({
    // Identificação
    data_emissao: new Date().toISOString().split('T')[0],
    emitente: '',
    // Análise das Causas
    processos_envolvidos: [] as ProcessoOrigem[],
    falha: '',
    causas: '',
    subcausas: '',
    // Ações para Eliminar as Causas
    acoes: '',
    responsaveis: '',
    prazo: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProcessoChange = (processo: ProcessoOrigem) => {
    setFormData(prev => {
      const processos = prev.processos_envolvidos.includes(processo)
        ? prev.processos_envolvidos.filter(p => p !== processo)
        : [...prev.processos_envolvidos, processo];
      return { ...prev, processos_envolvidos: processos };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/qualidade/acao-corretiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_abertura: formData.data_emissao,
          origem_tipo: origemTipo || 'OUTROS',
          origem_id: origemId ? parseInt(origemId) : null,
          origem_descricao: origemDescricao || null,
          descricao_problema: formData.falha,
          responsavel_principal: formData.responsaveis,
          prazo_conclusao: formData.prazo,
          // Campos adicionais do formulário
          emitente: formData.emitente,
          processos_envolvidos: formData.processos_envolvidos.length > 0 ? formData.processos_envolvidos : null,
          causas: formData.causas || null,
          subcausas: formData.subcausas || null,
          acoes: formData.acoes || null,
          status_acoes: 'EM_ANDAMENTO',
          created_by: authUser?.id || null
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

      {/* Origem (se vier de uma NC) */}
      {origemDescricao && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Origem:</strong> {decodeURIComponent(origemDescricao)}
          </p>
        </div>
      )}

      {/* IDENTIFICAÇÃO */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">IDENTIFICAÇÃO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da emissão *</label>
            <input
              type="date"
              name="data_emissao"
              value={formData.data_emissao}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emitente *</label>
            <input
              type="text"
              name="emitente"
              value={formData.emitente}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* ANÁLISE DAS CAUSAS */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">ANÁLISE DAS CAUSAS</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Processos envolvidos *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(PROCESSOS_ORIGEM).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.processos_envolvidos.includes(key as ProcessoOrigem)}
                    onChange={() => handleProcessoChange(key as ProcessoOrigem)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Falha *</label>
            <textarea
              name="falha"
              value={formData.falha}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Descreva a falha identificada..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Causas *</label>
            <textarea
              name="causas"
              value={formData.causas}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Descreva as causas identificadas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcausas</label>
            <textarea
              name="subcausas"
              value={formData.subcausas}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva as subcausas, se houver..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* AÇÕES PARA ELIMINAR AS CAUSAS */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">AÇÕES PARA ELIMINAR AS CAUSAS</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ações *</label>
            <textarea
              name="acoes"
              value={formData.acoes}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Descreva as ações para eliminar as causas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis *</label>
              <input
                type="text"
                name="responsaveis"
                value={formData.responsaveis}
                onChange={handleChange}
                required
                placeholder="Nomes dos responsáveis"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo *</label>
              <input
                type="date"
                name="prazo"
                value={formData.prazo}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">REGISTRO DE AÇÃO CORRETIVA</h1>
              <p className="text-sm text-gray-600">Nº 57-3 - REV. 01</p>
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

      {/* Assistente IA para análise de causas e ações corretivas */}
      <AssistenteIAQualidade
        sugestoes={[
          'Analisar causas da NC',
          'Sugerir ações corretivas',
          'Identificar causas raiz',
          'Exemplos de ações eficazes',
        ]}
      />
    </div>
  );
}
