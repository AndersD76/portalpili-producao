'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TIPOS_RECLAMACAO,
  IMPACTOS_RECLAMACAO,
  TipoReclamacao,
  ImpactoReclamacao
} from '@/types/qualidade';

export default function NovaReclamacaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    data_reclamacao: new Date().toISOString().split('T')[0],
    cliente_nome: '',
    cliente_contato: '',
    cliente_email: '',
    cliente_telefone: '',
    numero_opd: '',
    numero_serie: '',
    tipo_reclamacao: '' as TipoReclamacao | '',
    descricao: '',
    impacto: '' as ImpactoReclamacao | '',
    acao_imediata: '',
    responsavel_analise: ''
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

      const response = await fetch('/api/qualidade/reclamacao-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/qualidade/reclamacao-cliente');
      } else {
        setError(result.error || 'Erro ao criar reclamação');
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
              href="/qualidade/reclamacao-cliente"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nova Reclamação de Cliente</h1>
              <p className="text-sm text-gray-600">Registrar uma nova reclamação</p>
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

          {/* Informações do Cliente */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Informações do Cliente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  name="cliente_nome"
                  value={formData.cliente_nome}
                  onChange={handleChange}
                  required
                  placeholder="Nome completo ou razão social"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                <input
                  type="text"
                  name="cliente_contato"
                  value={formData.cliente_contato}
                  onChange={handleChange}
                  placeholder="Nome do contato"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  name="cliente_email"
                  value={formData.cliente_email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  name="cliente_telefone"
                  value={formData.cliente_telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Reclamação *</label>
                <input
                  type="date"
                  name="data_reclamacao"
                  value={formData.data_reclamacao}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Referência do Produto */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Referência do Produto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da OPD</label>
                <input
                  type="text"
                  name="numero_opd"
                  value={formData.numero_opd}
                  onChange={handleChange}
                  placeholder="Ex: OPD-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                <input
                  type="text"
                  name="numero_serie"
                  value={formData.numero_serie}
                  onChange={handleChange}
                  placeholder="Número de série do equipamento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Classificação */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Classificação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reclamação</label>
                <select
                  name="tipo_reclamacao"
                  value={formData.tipo_reclamacao}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(TIPOS_RECLAMACAO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
                <select
                  name="impacto"
                  value={formData.impacto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(IMPACTOS_RECLAMACAO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Descrição da Reclamação */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Descrição da Reclamação</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Descreva detalhadamente a reclamação do cliente..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ação Imediata Tomada</label>
                <textarea
                  name="acao_imediata"
                  value={formData.acao_imediata}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Descreva qualquer ação imediata já tomada..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela Análise</label>
                <input
                  type="text"
                  name="responsavel_analise"
                  value={formData.responsavel_analise}
                  onChange={handleChange}
                  placeholder="Nome do responsável"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Salvando...' : 'Registrar Reclamação'}
            </button>
            <Link
              href="/qualidade/reclamacao-cliente"
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
