'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NaoConformidade, STATUS_NAO_CONFORMIDADE, TIPOS_NAO_CONFORMIDADE, GRAVIDADES_NAO_CONFORMIDADE } from '@/types/qualidade';

export default function NaoConformidadePage() {
  const [ncs, setNcs] = useState<NaoConformidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchNCs();
  }, []);

  const fetchNCs = async () => {
    try {
      const response = await fetch('/api/qualidade/nao-conformidade');
      const data = await response.json();
      if (data.success) {
        setNcs(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar NCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNCs = ncs.filter(nc => {
    if (filterStatus !== 'todos' && nc.status !== filterStatus) return false;
    if (filterTipo !== 'todos' && nc.tipo !== filterTipo) return false;
    if (searchTerm && !nc.numero.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !nc.descricao.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANALISE': 'bg-yellow-100 text-yellow-800',
      'PENDENTE_ACAO': 'bg-orange-100 text-orange-800',
      'FECHADA': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_NAO_CONFORMIDADE[status as keyof typeof STATUS_NAO_CONFORMIDADE] || status}
      </span>
    );
  };

  const getGravidadeBadge = (gravidade: string | null) => {
    if (!gravidade) return null;
    const colors: Record<string, string> = {
      'CRITICA': 'bg-red-600 text-white',
      'MAIOR': 'bg-orange-500 text-white',
      'MENOR': 'bg-yellow-500 text-white'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[gravidade] || 'bg-gray-100'}`}>
        {GRAVIDADES_NAO_CONFORMIDADE[gravidade as keyof typeof GRAVIDADES_NAO_CONFORMIDADE] || gravidade}
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
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Não Conformidades</h1>
                <p className="text-sm text-gray-600">Registro e tratamento de NCs</p>
              </div>
            </div>
            <Link
              href="/qualidade/nao-conformidade/nova"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova NC
            </Link>
          </div>

          {/* Filtros */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Buscar por número ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todos os Status</option>
              {Object.entries(STATUS_NAO_CONFORMIDADE).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todos os Tipos</option>
              {Object.entries(TIPOS_NAO_CONFORMIDADE).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredNCs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">Nenhuma não conformidade encontrada</p>
            <Link
              href="/qualidade/nao-conformidade/nova"
              className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Registrar primeira NC
            </Link>
          </div>
        ) : (
          <>
            {/* Versão Mobile - Cards */}
            <div className="block sm:hidden space-y-3">
              {filteredNCs.map(nc => (
                <Link
                  key={nc.id}
                  href={`/qualidade/nao-conformidade/${nc.id}`}
                  className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-600 font-bold">{nc.numero}</span>
                    {getGravidadeBadge(nc.gravidade)}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{formatDate(nc.data_ocorrencia)}</span>
                    {getStatusBadge(nc.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{nc.descricao}</p>
                  <div className="text-xs text-gray-500">
                    {TIPOS_NAO_CONFORMIDADE[nc.tipo as keyof typeof TIPOS_NAO_CONFORMIDADE] || nc.tipo}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gravidade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredNCs.map(nc => (
                      <tr key={nc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/qualidade/nao-conformidade/${nc.id}`} className="text-red-600 hover:text-red-800 font-medium">
                            {nc.numero}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(nc.data_ocorrencia)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {TIPOS_NAO_CONFORMIDADE[nc.tipo as keyof typeof TIPOS_NAO_CONFORMIDADE] || nc.tipo}
                        </td>
                        <td className="px-4 py-3">{getGravidadeBadge(nc.gravidade)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{nc.descricao}</td>
                        <td className="px-4 py-3">{getStatusBadge(nc.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/qualidade/nao-conformidade/${nc.id}`}
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
          Exibindo {filteredNCs.length} de {ncs.length} registros
        </div>
      </main>
    </div>
  );
}
