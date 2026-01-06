'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TIPOS_NAO_CONFORMIDADE,
  ORIGENS_NAO_CONFORMIDADE,
  GRAVIDADES_NAO_CONFORMIDADE,
  DISPOSICOES_NAO_CONFORMIDADE,
  TipoNaoConformidade,
  OrigemNaoConformidade,
  GravidadeNaoConformidade,
  DisposicaoNaoConformidade
} from '@/types/qualidade';

export default function NovaNaoConformidadePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    data_ocorrencia: new Date().toISOString().split('T')[0],
    local_ocorrencia: '',
    setor_responsavel: '',
    tipo: '' as TipoNaoConformidade | '',
    origem: '' as OrigemNaoConformidade | '',
    gravidade: '' as GravidadeNaoConformidade | '',
    descricao: '',
    produtos_afetados: '',
    quantidade_afetada: '',
    detectado_por: '',
    disposicao: '' as DisposicaoNaoConformidade | '',
    disposicao_descricao: '',
    acao_contencao: '',
    responsavel_contencao: ''
  });

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

      const response = await fetch('/api/qualidade/nao-conformidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantidade_afetada: formData.quantidade_afetada ? parseInt(formData.quantidade_afetada) : null,
          created_by: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/qualidade/nao-conformidade');
      } else {
        setError(result.error || 'Erro ao criar não conformidade');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/qualidade/nao-conformidade"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nova Não Conformidade</h1>
              <p className="text-sm text-gray-600">Registrar uma nova NC</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Ocorrência *</label>
                <input
                  type="date"
                  name="data_ocorrencia"
                  value={formData.data_ocorrencia}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local da Ocorrência</label>
                <input
                  type="text"
                  name="local_ocorrencia"
                  value={formData.local_ocorrencia}
                  onChange={handleChange}
                  placeholder="Ex: Linha de produção 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor Responsável</label>
                <input
                  type="text"
                  name="setor_responsavel"
                  value={formData.setor_responsavel}
                  onChange={handleChange}
                  placeholder="Ex: Produção"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detectado Por</label>
                <input
                  type="text"
                  name="detectado_por"
                  value={formData.detectado_por}
                  onChange={handleChange}
                  placeholder="Nome do colaborador"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Classificação */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Classificação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(TIPOS_NAO_CONFORMIDADE).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                <select
                  name="origem"
                  value={formData.origem}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(ORIGENS_NAO_CONFORMIDADE).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
                <select
                  name="gravidade"
                  value={formData.gravidade}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(GRAVIDADES_NAO_CONFORMIDADE).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Descrição da Não Conformidade</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Descreva detalhadamente a não conformidade encontrada..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produtos Afetados</label>
                  <input
                    type="text"
                    name="produtos_afetados"
                    value={formData.produtos_afetados}
                    onChange={handleChange}
                    placeholder="Ex: Peça XYZ, Componente ABC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Afetada</label>
                  <input
                    type="number"
                    name="quantidade_afetada"
                    value={formData.quantidade_afetada}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Disposição */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Disposição Imediata</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disposição</label>
                  <select
                    name="disposicao"
                    value={formData.disposicao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(DISPOSICOES_NAO_CONFORMIDADE).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela Contenção</label>
                  <input
                    type="text"
                    name="responsavel_contencao"
                    value={formData.responsavel_contencao}
                    onChange={handleChange}
                    placeholder="Nome do responsável"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Disposição</label>
                <textarea
                  name="disposicao_descricao"
                  value={formData.disposicao_descricao}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Descreva as ações de disposição tomadas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ação de Contenção</label>
                <textarea
                  name="acao_contencao"
                  value={formData.acao_contencao}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Descreva as ações de contenção imediatas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Salvando...' : 'Registrar Não Conformidade'}
            </button>
            <Link
              href="/qualidade/nao-conformidade"
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-center font-medium"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
