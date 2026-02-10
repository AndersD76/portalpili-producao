'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Proposta {
  id: number;
  numero_proposta: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_fantasia: string;
  cliente_cnpj: string;
  vendedor_id: number;
  vendedor_nome: string;
  oportunidade_id: number;
  oportunidade_titulo: string;
  produto: 'TOMBADOR' | 'COLETOR';
  situacao: string;
  valor_total: number;
  desconto_valor: number;
  data_validade: string;
  tombador_modelo: string;
  tombador_tamanho: string;
  tombador_quantidade: number;
  coletor_modelo: string;
  coletor_grau_rotacao: string;
  coletor_quantidade: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SITUACOES: Record<string, { label: string; cor: string }> = {
  RASCUNHO: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-800' },
  ENVIADA: { label: 'Enviada', cor: 'bg-blue-100 text-blue-800' },
  EM_NEGOCIACAO: { label: 'Em Negociação', cor: 'bg-yellow-100 text-yellow-800' },
  APROVADA: { label: 'Aprovada', cor: 'bg-green-100 text-green-800' },
  REJEITADA: { label: 'Rejeitada', cor: 'bg-red-100 text-red-800' },
  CANCELADA: { label: 'Cancelada', cor: 'bg-gray-300 text-gray-700' },
  EXPIRADA: { label: 'Expirada', cor: 'bg-orange-100 text-orange-800' },
};

export default function PropostasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filtroSituacao, setFiltroSituacao] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [search, setSearch] = useState('');
  const { user, authenticated, loading: authLoading, podeExecutarAcao } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
  }, [authLoading, authenticated]);

  useEffect(() => {
    if (user) {
      fetchPropostas();
    }
  }, [user, pagination.page, filtroSituacao, filtroProduto]);

  const fetchPropostas = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      // Filtrar por vendedor (usuário logado)
      if (user?.id) {
        params.append('vendedor_id', user.id.toString());
      }

      if (filtroSituacao) {
        params.append('situacao', filtroSituacao);
      }

      if (filtroProduto) {
        params.append('tipo_produto', filtroProduto);
      }

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/comercial/propostas?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPropostas(data.data || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPropostas();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isExpirando = (dataValidade: string) => {
    const validade = new Date(dataValidade);
    const hoje = new Date();
    const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes >= 0 && diasRestantes <= 7;
  };

  const isExpirada = (dataValidade: string) => {
    return new Date(dataValidade) < new Date();
  };

  // Calcular totais
  const totalValor = propostas.reduce((sum, p) => sum + (p.valor_total || 0), 0);
  const totalAbertas = propostas.filter(p => ['RASCUNHO', 'ENVIADA', 'EM_NEGOCIACAO'].includes(p.situacao)).length;
  const totalAprovadas = propostas.filter(p => p.situacao === 'APROVADA').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando propostas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/comercial"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar ao Comercial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Propostas</h1>
                {user && <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>}
              </div>
            </div>

            {podeExecutarAcao('COMERCIAL', 'criar') && (
              <Link
                href="/comercial/propostas/nova"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Proposta
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-gray-900">{pagination.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-purple-600">{totalAbertas}</div>
            <div className="text-sm text-gray-500">Abertas</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">{totalAprovadas}</div>
            <div className="text-sm text-gray-500">Aprovadas</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-lg font-bold text-green-600">{formatCurrency(totalValor)}</div>
            <div className="text-sm text-gray-500">Valor Total</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por número ou cliente..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <select
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas Situações</option>
              {Object.entries(SITUACOES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos Produtos</option>
              <option value="TOMBADOR">Tombador</option>
              <option value="COLETOR">Coletor</option>
            </select>
          </div>
        </div>

        {/* Lista de Propostas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {propostas.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">Nenhuma proposta encontrada</p>
              <Link
                href="/comercial/propostas/nova"
                className="inline-block mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
              >
                Criar Primeira Proposta
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nº</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Situação</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Validade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {propostas.map((proposta) => {
                      const situacaoInfo = SITUACOES[proposta.situacao] || SITUACOES.RASCUNHO;
                      const expirando = isExpirando(proposta.data_validade);
                      const expirada = isExpirada(proposta.data_validade);

                      return (
                        <tr key={proposta.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-gray-900">
                              {proposta.numero_proposta}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {proposta.cliente_fantasia || proposta.cliente_nome}
                              </div>
                              {proposta.cliente_cnpj && (
                                <div className="text-xs text-gray-500">{proposta.cliente_cnpj}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                proposta.produto === 'TOMBADOR'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {proposta.produto}
                              </span>
                              <span className="text-sm text-gray-600">
                                {proposta.produto === 'TOMBADOR'
                                  ? `${proposta.tombador_modelo} - ${proposta.tombador_tamanho}m`
                                  : `${proposta.coletor_modelo} - ${proposta.coletor_grau_rotacao}°`
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${situacaoInfo.cor}`}>
                              {situacaoInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(proposta.valor_total)}
                            </span>
                            {proposta.desconto_valor > 0 && (
                              <div className="text-xs text-green-600">
                                -{formatCurrency(proposta.desconto_valor)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`${expirada ? 'text-red-600' : expirando ? 'text-orange-600' : 'text-gray-600'}`}>
                              {formatDate(proposta.data_validade)}
                              {expirada && ' (Expirada)'}
                              {expirando && !expirada && ' (Expira em breve)'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {formatDate(proposta.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                href={`/comercial/propostas/${proposta.id}`}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Ver Detalhes"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              <Link
                                href={`/comercial/propostas/${proposta.id}/editar`}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                                title="Editar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <button
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                                title="Imprimir PDF"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {propostas.map((proposta) => {
                  const situacaoInfo = SITUACOES[proposta.situacao] || SITUACOES.RASCUNHO;

                  return (
                    <Link
                      key={proposta.id}
                      href={`/comercial/propostas/${proposta.id}`}
                      className="block p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono font-medium text-gray-900">#{proposta.numero_proposta}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${situacaoInfo.cor}`}>
                            {situacaoInfo.label}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{formatCurrency(proposta.valor_total)}</span>
                      </div>
                      <div className="text-sm text-gray-900 mb-1">
                        {proposta.cliente_fantasia || proposta.cliente_nome}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          proposta.produto === 'TOMBADOR' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {proposta.produto}
                        </span>
                        <span>{formatDate(proposta.created_at)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50">
                  <div className="text-sm text-gray-500 text-center sm:text-left">
                    {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      {pagination.page}/{pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
