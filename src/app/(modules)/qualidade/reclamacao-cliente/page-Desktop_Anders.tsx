'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReclamacaoCliente, STATUS_RECLAMACAO } from '@/types/qualidade';

export default function ReclamacaoClientePage() {
  const [reclamacoes, setReclamacoes] = useState<ReclamacaoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchReclamacoes();
  }, []);

  const fetchReclamacoes = async () => {
    try {
      const response = await fetch('/api/qualidade/reclamacao-cliente');
      const data = await response.json();
      if (data.success) {
        setReclamacoes(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar reclamações:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReclamacoes = reclamacoes.filter(rec => {
    if (filterStatus !== 'todos' && rec.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchNumero = rec.numero?.toLowerCase().includes(search);
      const matchCliente = rec.nome_cliente?.toLowerCase().includes(search);
      const matchDescricao = rec.descricao?.toLowerCase().includes(search);
      const matchLocal = rec.local_instalado?.toLowerCase().includes(search);
      if (!matchNumero && !matchCliente && !matchDescricao && !matchLocal) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANALISE': 'bg-yellow-100 text-yellow-800',
      'RESPONDIDA': 'bg-blue-100 text-blue-800',
      'FECHADA': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_RECLAMACAO[status as keyof typeof STATUS_RECLAMACAO] || status}
      </span>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/qualidade"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reclamações de Clientes</h1>
                <p className="text-sm text-gray-600">Nº 57-2 - REV. 01</p>
              </div>
            </div>
            <Link
              href="/qualidade/reclamacao-cliente/nova"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Reclamação
            </Link>
          </div>

          {/* Filtros */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Buscar por número, cliente, descrição ou local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todos os Status</option>
              {Object.entries(STATUS_RECLAMACAO).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredReclamacoes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-gray-500">Nenhuma reclamação encontrada</p>
            <Link
              href="/qualidade/reclamacao-cliente/nova"
              className="inline-block mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Registrar primeira reclamação
            </Link>
          </div>
        ) : (
          <>
            {/* Versão Mobile - Cards */}
            <div className="block sm:hidden space-y-3">
              {filteredReclamacoes.map(rec => (
                <Link
                  key={rec.id}
                  href={`/qualidade/reclamacao-cliente/${rec.id}`}
                  className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-600 font-bold">{rec.numero}</span>
                    {getStatusBadge(rec.status)}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{formatDate(rec.data_emissao)}</span>
                    <span className="text-sm font-medium text-gray-900">{rec.nome_cliente}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{rec.descricao}</p>
                  <div className="text-xs text-gray-500">
                    {rec.local_instalado && <span>Local: {rec.local_instalado}</span>}
                  </div>
                </Link>
              ))}
            </div>

            {/* Versão Desktop - Tabela */}
            <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Número</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">OPD</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Local</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReclamacoes.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/qualidade/reclamacao-cliente/${rec.id}`} className="text-orange-600 hover:text-orange-800 font-medium">
                            {rec.numero}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(rec.data_emissao)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{rec.nome_cliente}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{rec.numero_opd || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{rec.local_instalado || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{rec.descricao}</td>
                        <td className="px-4 py-3">{getStatusBadge(rec.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/qualidade/reclamacao-cliente/${rec.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Ver Detalhes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Exibindo {filteredReclamacoes.length} de {reclamacoes.length} registros
        </div>
      </main>
    </div>
  );
}
