'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  pipeline: {
    em_analise: { quantidade: number; valor: number };
    negociacao: { quantidade: number; valor: number };
    pos_negociacao: { quantidade: number; valor: number };
    fechamento: { quantidade: number; valor: number };
    [key: string]: { quantidade: number; valor: number };
  };
  propostas: {
    total: number;
    abertas: number;
    aprovadas: number;
    rejeitadas: number;
    valorTotal: number;
    valorAprovado: number;
  };
  atividades: {
    pendentes: number;
    atrasadas: number;
    proximaSemana: number;
    concluidas: number;
  };
  clientes: {
    total: number;
    ativos: number;
    prospectos: number;
    novosEsteMes: number;
  };
  conversao: {
    taxaConversao: number;
    ticketMedio: number;
    tempoMedioCiclo: number;
  };
  ultimasPropostas: Array<{
    id: number;
    numero_proposta: number;
    cliente_nome: string;
    produto: string;
    valor_total: number;
    situacao: string;
    created_at: string;
  }>;
  proximasAtividades: Array<{
    id: number;
    titulo: string;
    tipo: string;
    data_limite: string;
    cliente_nome: string;
  }>;
}

const ESTAGIOS = [
  { key: 'em_analise', label: 'Em Análise', cor: 'bg-cyan-500' },
  { key: 'negociacao', label: 'Negociação', cor: 'bg-orange-500' },
  { key: 'pos_negociacao', label: 'Pós Negociação', cor: 'bg-purple-500' },
  { key: 'fechamento', label: 'Fechamento', cor: 'bg-green-500' },
];

export default function DashboardComercialPage() {
  const router = useRouter();
  const { user, authenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    pipeline: {
      em_analise: { quantidade: 0, valor: 0 },
      negociacao: { quantidade: 0, valor: 0 },
      pos_negociacao: { quantidade: 0, valor: 0 },
      fechamento: { quantidade: 0, valor: 0 },
    },
    propostas: { total: 0, abertas: 0, aprovadas: 0, rejeitadas: 0, valorTotal: 0, valorAprovado: 0 },
    atividades: { pendentes: 0, atrasadas: 0, proximaSemana: 0, concluidas: 0 },
    clientes: { total: 0, ativos: 0, prospectos: 0, novosEsteMes: 0 },
    conversao: { taxaConversao: 0, ticketMedio: 0, tempoMedioCiclo: 0 },
    ultimasPropostas: [],
    proximasAtividades: [],
  });

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [authLoading, authenticated]);

  const fetchDashboardData = async () => {
    try {
      // Buscar dados em paralelo
      const [opResponse, propostaResponse, atividadeResponse, clienteResponse] = await Promise.all([
        fetch(`/api/comercial/oportunidades${user?.id ? `?vendedor_id=${user.id}` : ''}`).catch(() => null),
        fetch(`/api/comercial/propostas${user?.id ? `?vendedor_id=${user.id}` : ''}`).catch(() => null),
        fetch(`/api/comercial/atividades${user?.id ? `?responsavel_id=${user.id}` : ''}`).catch(() => null),
        fetch('/api/comercial/clientes').catch(() => null),
      ]);

      // Pipeline
      if (opResponse) {
        const opData = await opResponse.json().catch(() => ({ pipeline: [] }));
        const pipeline = opData.pipeline || [];
        const newPipeline: DashboardData['pipeline'] = {
          em_analise: { quantidade: 0, valor: 0 },
          negociacao: { quantidade: 0, valor: 0 },
          pos_negociacao: { quantidade: 0, valor: 0 },
          fechamento: { quantidade: 0, valor: 0 },
        };
        // Mapeamento de estágios do DB para chaves do dashboard
        const estagioMap: Record<string, string> = {
          EM_ANALISE: 'em_analise', PROSPECCAO: 'em_analise', QUALIFICACAO: 'em_analise', PROPOSTA: 'em_analise',
          EM_NEGOCIACAO: 'negociacao',
          POS_NEGOCIACAO: 'pos_negociacao',
          FECHADA: 'fechamento',
        };
        pipeline.forEach((p: { estagio: string; quantidade: string; valor_total: string }) => {
          const key = estagioMap[p.estagio];
          if (key && newPipeline[key]) {
            newPipeline[key].quantidade += parseInt(p.quantidade) || 0;
            newPipeline[key].valor += parseFloat(p.valor_total) || 0;
          }
        });
        setData(prev => ({ ...prev, pipeline: newPipeline }));
      }

      // Propostas
      if (propostaResponse) {
        const propostaData = await propostaResponse.json().catch(() => ({ data: [] }));
        const propostas = propostaData.data || [];
        const abertas = propostas.filter((p: { situacao: string }) => ['RASCUNHO', 'ENVIADA', 'EM_NEGOCIACAO'].includes(p.situacao));
        const aprovadas = propostas.filter((p: { situacao: string }) => p.situacao === 'APROVADA');
        const rejeitadas = propostas.filter((p: { situacao: string }) => p.situacao === 'REJEITADA');

        setData(prev => ({
          ...prev,
          propostas: {
            total: propostas.length,
            abertas: abertas.length,
            aprovadas: aprovadas.length,
            rejeitadas: rejeitadas.length,
            valorTotal: propostas.reduce((sum: number, p: { valor_total: number }) => sum + (p.valor_total || 0), 0),
            valorAprovado: aprovadas.reduce((sum: number, p: { valor_total: number }) => sum + (p.valor_total || 0), 0),
          },
          ultimasPropostas: propostas.slice(0, 5),
          conversao: {
            taxaConversao: propostas.length > 0 ? (aprovadas.length / propostas.length) * 100 : 0,
            ticketMedio: aprovadas.length > 0
              ? aprovadas.reduce((sum: number, p: { valor_total: number }) => sum + (p.valor_total || 0), 0) / aprovadas.length
              : 0,
            tempoMedioCiclo: 0,
          },
        }));
      }

      // Atividades
      if (atividadeResponse) {
        const atividadeData = await atividadeResponse.json().catch(() => ({ totais: {}, data: [] }));
        const totais = atividadeData.totais || {};
        const atividades = atividadeData.data || [];

        setData(prev => ({
          ...prev,
          atividades: {
            pendentes: parseInt(totais.pendentes) || 0,
            atrasadas: parseInt(totais.atrasadas) || 0,
            proximaSemana: parseInt(totais.proxima_semana) || 0,
            concluidas: parseInt(totais.concluidas) || 0,
          },
          proximasAtividades: atividades.filter((a: { concluida: boolean }) => !a.concluida).slice(0, 5),
        }));
      }

      // Clientes
      if (clienteResponse) {
        const clienteData = await clienteResponse.json().catch(() => ({ data: [], pagination: { total: 0 } }));
        const clientes = clienteData.data || [];
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        setData(prev => ({
          ...prev,
          clientes: {
            total: clienteData.pagination?.total || clientes.length,
            ativos: clientes.filter((c: { status: string }) => c.status === 'ATIVO').length,
            prospectos: clientes.filter((c: { status: string }) => c.status === 'PROSPECTO').length,
            novosEsteMes: clientes.filter((c: { created_at: string }) =>
              new Date(c.created_at) >= inicioMes
            ).length,
          },
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const totalPipeline = Object.values(data.pipeline).reduce((sum, p) => sum + p.valor, 0);
  const totalOportunidades = Object.values(data.pipeline).reduce((sum, p) => sum + p.quantidade, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando dashboard...</p>
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard Comercial</h1>
                {user && <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>}
              </div>
            </div>

            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Pipeline de Vendas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Pipeline de Vendas</h2>
            <Link href="/comercial/pipeline" className="text-red-600 hover:text-red-700 text-sm font-medium">
              Ver Kanban →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {ESTAGIOS.map((estagio) => {
              const stageData = data.pipeline[estagio.key as keyof typeof data.pipeline];
              return (
                <div key={estagio.key} className="text-center">
                  <div className={`${estagio.cor} text-white rounded-lg p-3 sm:p-4`}>
                    <div className="text-2xl sm:text-3xl font-bold">{stageData.quantidade}</div>
                    <div className="text-xs sm:text-sm opacity-80">{formatCurrency(stageData.valor)}</div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-2">{estagio.label}</div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t gap-2">
            <div>
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900 ml-2">{totalOportunidades} oportunidades</span>
            </div>
            <div>
              <span className="text-gray-600">Valor no Pipeline:</span>
              <span className="font-bold text-green-600 ml-2">{formatCurrency(totalPipeline)}</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.propostas.valorAprovado)}</div>
                <div className="text-sm text-gray-500">Valor Fechado</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{data.conversao.taxaConversao.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Taxa de Conversão</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.conversao.ticketMedio)}</div>
                <div className="text-sm text-gray-500">Ticket Médio</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{data.clientes.total}</div>
                <div className="text-sm text-gray-500">Clientes ({data.clientes.novosEsteMes} novos)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Propostas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Propostas</h2>
              <Link href="/comercial/propostas" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                Ver Todas →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{data.propostas.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{data.propostas.abertas}</div>
                <div className="text-xs text-gray-500">Abertas</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{data.propostas.aprovadas}</div>
                <div className="text-xs text-gray-500">Aprovadas</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{data.propostas.rejeitadas}</div>
                <div className="text-xs text-gray-500">Rejeitadas</div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-3">Últimas Propostas</h3>
            {data.ultimasPropostas.length > 0 ? (
              <div className="space-y-2">
                {data.ultimasPropostas.map((proposta) => (
                  <Link
                    key={proposta.id}
                    href={`/comercial/propostas/${proposta.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <div className="font-medium text-gray-900">#{proposta.numero_proposta}</div>
                      <div className="text-sm text-gray-500">{proposta.cliente_nome}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(proposta.valor_total)}</div>
                      <div className="text-xs text-gray-500">{formatDate(proposta.created_at)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Nenhuma proposta encontrada</p>
            )}
          </div>

          {/* Atividades */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Atividades</h2>
              <Link href="/comercial/atividades" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                Ver Todas →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{data.atividades.pendentes}</div>
                <div className="text-xs text-gray-500">Pendentes</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{data.atividades.atrasadas}</div>
                <div className="text-xs text-gray-500">Atrasadas</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{data.atividades.proximaSemana}</div>
                <div className="text-xs text-gray-500">Próx. Semana</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{data.atividades.concluidas}</div>
                <div className="text-xs text-gray-500">Concluídas</div>
              </div>
            </div>

            {data.atividades.atrasadas > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">Você tem {data.atividades.atrasadas} atividade(s) atrasada(s)!</span>
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-gray-700 mb-3">Próximas Atividades</h3>
            {data.proximasAtividades.length > 0 ? (
              <div className="space-y-2">
                {data.proximasAtividades.map((atividade) => (
                  <Link
                    key={atividade.id}
                    href={`/comercial/atividades/${atividade.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{atividade.titulo}</div>
                      <div className="text-sm text-gray-500">{atividade.cliente_nome}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        {atividade.tipo}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{formatDate(atividade.data_limite)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Nenhuma atividade pendente</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
