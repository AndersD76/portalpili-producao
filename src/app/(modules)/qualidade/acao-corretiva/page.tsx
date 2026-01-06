'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AcaoCorretiva, STATUS_ACAO_CORRETIVA, ORIGENS_ACAO_CORRETIVA } from '@/types/qualidade';

export default function AcaoCorretivaPage() {
  const [acoes, setAcoes] = useState<AcaoCorretiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterOrigem, setFilterOrigem] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    fetchAcoes();
  }, []);

  const fetchAcoes = async () => {
    try {
      const response = await fetch('/api/qualidade/acao-corretiva');
      const data = await response.json();
      if (data.success) {
        setAcoes(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar ações corretivas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAcoes = acoes.filter(acao => {
    if (filterStatus !== 'todos' && acao.status !== filterStatus) return false;
    if (filterOrigem !== 'todos' && acao.origem_tipo !== filterOrigem) return false;
    if (searchTerm && !acao.numero.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !acao.descricao_problema.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
      'AGUARDANDO_VERIFICACAO': 'bg-yellow-100 text-yellow-800',
      'FECHADA': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {STATUS_ACAO_CORRETIVA[status as keyof typeof STATUS_ACAO_CORRETIVA] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isPrazoVencido = (prazo: string | null) => {
    if (!prazo) return false;
    return new Date(prazo) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ações Corretivas</h1>
                <p className="text-sm text-gray-600">Gestão de RACs</p>
              </div>
            </div>
            <Link
              href="/qualidade/acao-corretiva/nova"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova RAC
            </Link>
          </div>

          {/* Filtros */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Buscar por número ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todos os Status</option>
              {Object.entries(STATUS_ACAO_CORRETIVA).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={filterOrigem}
              onChange={(e) => setFilterOrigem(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todas as Origens</option>
              {Object.entries(ORIGENS_ACAO_CORRETIVA).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredAcoes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-500">Nenhuma ação corretiva encontrada</p>
            <Link
              href="/qualidade/acao-corretiva/nova"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Registrar primeira RAC
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Origem</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Responsável</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Prazo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAcoes.map(acao => (
                    <tr key={acao.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/qualidade/acao-corretiva/${acao.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {acao.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(acao.data_abertura)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ORIGENS_ACAO_CORRETIVA[acao.origem_tipo as keyof typeof ORIGENS_ACAO_CORRETIVA] || acao.origem_tipo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{acao.descricao_problema}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{acao.responsavel_principal || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {acao.prazo_conclusao ? (
                          <span className={isPrazoVencido(acao.prazo_conclusao) && acao.status !== 'FECHADA' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {formatDate(acao.prazo_conclusao)}
                            {isPrazoVencido(acao.prazo_conclusao) && acao.status !== 'FECHADA' && (
                              <span className="ml-1 text-red-600">!</span>
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(acao.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/qualidade/acao-corretiva/${acao.id}`}
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
        )}

        <div className="mt-4 text-sm text-gray-600">
          Exibindo {filteredAcoes.length} de {acoes.length} registros
        </div>
      </main>
    </div>
  );
}
