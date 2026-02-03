'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AcaoCorretiva, STATUS_ACAO_CORRETIVA, STATUS_ACOES_AC, SITUACAO_FINAL_AC } from '@/types/qualidade';

export default function AcaoCorretivaPage() {
  const [acoes, setAcoes] = useState<AcaoCorretiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterStatusAcoes, setFilterStatusAcoes] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
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

  const handleDelete = async (acao: AcaoCorretiva) => {
    if (!confirm(`Tem certeza que deseja excluir a RAC ${acao.numero}?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setDeleting(acao.id);
    try {
      const response = await fetch(`/api/qualidade/acao-corretiva/${acao.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast.success('RAC excluída com sucesso');
        setAcoes(prev => prev.filter(a => a.id !== acao.id));
      } else {
        toast.error(result.error || 'Erro ao excluir RAC');
      }
    } catch (error) {
      console.error('Erro ao excluir RAC:', error);
      toast.error('Erro ao excluir RAC');
    } finally {
      setDeleting(null);
    }
  };

  const filteredAcoes = acoes.filter(acao => {
    if (filterStatus !== 'todos' && acao.status !== filterStatus) return false;
    if (filterStatusAcoes !== 'todos' && acao.status_acoes !== filterStatusAcoes) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchNumero = acao.numero?.toLowerCase().includes(search);
      const matchFalha = acao.falha?.toLowerCase().includes(search);
      const matchEmitente = acao.emitente?.toLowerCase().includes(search);
      if (!matchNumero && !matchFalha && !matchEmitente) return false;
    }
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

  const getSituacaoFinalBadge = (situacao: string | null) => {
    if (!situacao) return null;
    const colors: Record<string, string> = {
      'EFICAZ': 'bg-green-100 text-green-800',
      'PARCIALMENTE_EFICAZ': 'bg-yellow-100 text-yellow-800',
      'NAO_EFICAZ': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[situacao] || 'bg-gray-100'}`}>
        {SITUACAO_FINAL_AC[situacao as keyof typeof SITUACAO_FINAL_AC] || situacao}
      </span>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isPrazoVencido = (prazo: string | null | undefined) => {
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
                <p className="text-sm text-gray-600">Nº 57-3 - REV. 01</p>
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
              placeholder="Buscar por número, falha ou emitente..."
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
              value={filterStatusAcoes}
              onChange={(e) => setFilterStatusAcoes(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todas as Condições</option>
              {Object.entries(STATUS_ACOES_AC).map(([key, label]) => (
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
          <>
            {/* Versão Mobile - Cards */}
            <div className="block sm:hidden space-y-3">
              {filteredAcoes.map(acao => (
                <div
                  key={acao.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/qualidade/acao-corretiva/${acao.id}`} className="text-blue-600 font-bold hover:underline">
                      {acao.numero}
                    </Link>
                    <div className="flex items-center gap-2">
                      {getSituacaoFinalBadge(acao.situacao_final)}
                      <button
                        onClick={() => handleDelete(acao)}
                        disabled={deleting === acao.id}
                        className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <Link href={`/qualidade/acao-corretiva/${acao.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{formatDate(acao.data_emissao)}</span>
                      {getStatusBadge(acao.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{acao.falha || '-'}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Emitente: {acao.emitente || '-'}</span>
                      {acao.prazo && (
                        <span className={isPrazoVencido(acao.prazo) && acao.status !== 'FECHADA' ? 'text-red-600 font-medium' : ''}>
                          Prazo: {formatDate(acao.prazo)}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Emitente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Falha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Responsáveis</th>
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
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(acao.data_emissao)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{acao.emitente || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{acao.falha || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{acao.responsaveis || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {acao.prazo ? (
                            <span className={isPrazoVencido(acao.prazo) && acao.status !== 'FECHADA' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {formatDate(acao.prazo)}
                              {isPrazoVencido(acao.prazo) && acao.status !== 'FECHADA' && (
                                <span className="ml-1 text-red-600">!</span>
                              )}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(acao.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/qualidade/acao-corretiva/${acao.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Ver Detalhes
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDelete(acao);
                              }}
                              disabled={deleting === acao.id}
                              className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                              title="Excluir"
                            >
                              {deleting === acao.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
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
          Exibindo {filteredAcoes.length} de {acoes.length} registros
        </div>
      </main>
    </div>
  );
}
