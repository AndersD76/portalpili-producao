'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ComercialStats {
  pipeline: {
    prospeccao: { quantidade: number; valor: number };
    qualificacao: { quantidade: number; valor: number };
    proposta: { quantidade: number; valor: number };
    em_analise: { quantidade: number; valor: number };
    em_negociacao: { quantidade: number; valor: number };
    fechada: { quantidade: number; valor: number };
    perdida: { quantidade: number; valor: number };
    suspenso: { quantidade: number; valor: number };
    substituido: { quantidade: number; valor: number };
    teste: { quantidade: number; valor: number };
  };
  clientes: {
    total: number;
    ativos: number;
    prospectos: number;
  };
  propostas: {
    total: number;
    abertas: number;
    valorTotal: number;
  };
  atividades: {
    pendentes: number;
    atrasadas: number;
    proximaSemana: number;
  };
}

export default function ComercialPage() {
  const [user, setUser] = useState<{ nome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ComercialStats>({
    pipeline: {
      prospeccao: { quantidade: 0, valor: 0 },
      qualificacao: { quantidade: 0, valor: 0 },
      proposta: { quantidade: 0, valor: 0 },
      em_analise: { quantidade: 0, valor: 0 },
      em_negociacao: { quantidade: 0, valor: 0 },
      fechada: { quantidade: 0, valor: 0 },
      perdida: { quantidade: 0, valor: 0 },
      suspenso: { quantidade: 0, valor: 0 },
      substituido: { quantidade: 0, valor: 0 },
      teste: { quantidade: 0, valor: 0 },
    },
    clientes: { total: 0, ativos: 0, prospectos: 0 },
    propostas: { total: 0, abertas: 0, valorTotal: 0 },
    atividades: { pendentes: 0, atrasadas: 0, proximaSemana: 0 },
  });
  const router = useRouter();

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    const userData = localStorage.getItem('user_data');

    if (authenticated !== 'true' || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [opResponse, clienteResponse, propostaResponse, atividadeResponse] = await Promise.all([
        fetch('/api/comercial/oportunidades').catch((e) => { console.error('Fetch oportunidades error:', e); return null; }),
        fetch('/api/comercial/clientes').catch(() => null),
        fetch('/api/comercial/propostas').catch(() => null),
        fetch('/api/comercial/atividades').catch(() => null),
      ]);

      // Debug: Log response status
      console.log('API Responses:', {
        oportunidades: opResponse ? opResponse.status : 'null',
        clientes: clienteResponse ? clienteResponse.status : 'null',
        propostas: propostaResponse ? propostaResponse.status : 'null',
        atividades: atividadeResponse ? atividadeResponse.status : 'null',
      });

      // Processar Oportunidades/Pipeline
      if (opResponse && opResponse.ok) {
        const opData = await opResponse.json().catch((e) => {
          console.error('Erro ao parsear oportunidades:', e);
          return { pipeline: [] };
        });
        console.log('Oportunidades API response:', opData);
        const pipeline = opData.pipeline || [];
        const newPipeline: ComercialStats['pipeline'] = {
          prospeccao: { quantidade: 0, valor: 0 },
          qualificacao: { quantidade: 0, valor: 0 },
          proposta: { quantidade: 0, valor: 0 },
          em_analise: { quantidade: 0, valor: 0 },
          em_negociacao: { quantidade: 0, valor: 0 },
          fechada: { quantidade: 0, valor: 0 },
          perdida: { quantidade: 0, valor: 0 },
          suspenso: { quantidade: 0, valor: 0 },
          substituido: { quantidade: 0, valor: 0 },
          teste: { quantidade: 0, valor: 0 },
        };
        pipeline.forEach((p: { estagio: string; quantidade: string; valor_total: string }) => {
          const key = p.estagio.toLowerCase() as keyof typeof newPipeline;
          if (newPipeline[key]) {
            newPipeline[key] = {
              quantidade: parseInt(p.quantidade) || 0,
              valor: parseFloat(p.valor_total) || 0,
            };
          }
        });
        setStats(prev => ({ ...prev, pipeline: newPipeline }));
      }

      // Processar Clientes
      if (clienteResponse) {
        const clienteData = await clienteResponse.json().catch(() => ({ data: [], pagination: { total: 0 } }));
        const clientes = clienteData.data || [];
        setStats(prev => ({
          ...prev,
          clientes: {
            total: clienteData.pagination?.total || clientes.length,
            ativos: clientes.filter((c: { status: string }) => c.status === 'ATIVO').length,
            prospectos: clientes.filter((c: { status: string }) => c.status === 'PROSPECTO').length,
          },
        }));
      }

      // Processar Propostas
      if (propostaResponse) {
        const propostaData = await propostaResponse.json().catch(() => ({ data: [] }));
        const propostas = propostaData.data || [];
        setStats(prev => ({
          ...prev,
          propostas: {
            total: propostas.length,
            abertas: propostas.filter((p: { situacao: string }) => ['RASCUNHO', 'ENVIADA', 'EM_NEGOCIACAO'].includes(p.situacao)).length,
            valorTotal: propostas.reduce((sum: number, p: { valor_total: string | number | null }) => {
              const valor = typeof p.valor_total === 'string' ? parseFloat(p.valor_total) : (p.valor_total || 0);
              return sum + (isNaN(valor) ? 0 : valor);
            }, 0),
          },
        }));
      }

      // Processar Atividades
      if (atividadeResponse) {
        const atividadeData = await atividadeResponse.json().catch(() => ({ totais: {} }));
        const totais = atividadeData.totais || {};
        setStats(prev => ({
          ...prev,
          atividades: {
            pendentes: parseInt(totais.pendentes) || 0,
            atrasadas: parseInt(totais.atrasadas) || 0,
            proximaSemana: parseInt(totais.proxima_semana) || 0,
          },
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('authenticated');
      localStorage.removeItem('user_data');
      router.push('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
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

  const totalPipeline = Object.values(stats.pipeline).reduce((sum, p) => sum + p.valor, 0);
  const totalOportunidades = Object.values(stats.pipeline).reduce((sum, p) => sum + p.quantidade, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando...</p>
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
                href="/"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar aos Módulos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Comercial</h1>
                {user && (
                  <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/comercial/admin/precos"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Administrar Preços"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
              <Link
                href="/comercial/dashboard"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Sair"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Pipeline Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Pipeline de Vendas</h2>
            <Link
              href="/comercial/pipeline"
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Ver Kanban →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 mb-4">
            {[
              { key: 'prospeccao', label: 'Prospecção', cor: 'bg-gray-500' },
              { key: 'qualificacao', label: 'Qualificação', cor: 'bg-blue-500' },
              { key: 'proposta', label: 'Proposta', cor: 'bg-purple-500' },
              { key: 'em_analise', label: 'Em Análise', cor: 'bg-cyan-500' },
              { key: 'em_negociacao', label: 'Negociação', cor: 'bg-orange-500' },
              { key: 'fechada', label: 'Fechada', cor: 'bg-green-500' },
              { key: 'perdida', label: 'Perdida', cor: 'bg-red-500' },
              { key: 'suspenso', label: 'Suspenso', cor: 'bg-yellow-500' },
              { key: 'substituido', label: 'Substituído', cor: 'bg-indigo-500' },
              { key: 'teste', label: 'Teste', cor: 'bg-pink-500' },
            ].map((estagio) => {
              const data = stats.pipeline[estagio.key as keyof typeof stats.pipeline];
              return (
                <div key={estagio.key} className="text-center">
                  <div className={`${estagio.cor} text-white rounded-lg p-2 sm:p-3 mb-2`}>
                    <div className="text-xl sm:text-2xl font-bold">{data.quantidade}</div>
                    <div className="text-xs opacity-80">{formatCurrency(data.valor)}</div>
                  </div>
                  <div className="text-xs text-gray-600">{estagio.label}</div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-4 border-t">
            <div>
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900 ml-2">{totalOportunidades} oportunidades</span>
            </div>
            <div>
              <span className="text-gray-600">Valor:</span>
              <span className="font-bold text-green-600 ml-2">{formatCurrency(totalPipeline)}</span>
            </div>
          </div>
        </div>

        {/* Cards de Acesso Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Clientes */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Clientes</h3>
                  <p className="text-blue-100 text-sm">Gestão de clientes</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.clientes.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.clientes.ativos}</div>
                  <div className="text-xs text-gray-500">Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.clientes.prospectos}</div>
                  <div className="text-xs text-gray-500">Prospectos</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/comercial/clientes"
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                >
                  Ver Todos
                </Link>
                <Link
                  href="/comercial/clientes/novo"
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center text-sm font-medium"
                >
                  Novo Cliente
                </Link>
              </div>
            </div>
          </div>

          {/* Propostas */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Propostas</h3>
                  <p className="text-purple-100 text-sm">Propostas comerciais</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.propostas.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.propostas.abertas}</div>
                  <div className="text-xs text-gray-500">Abertas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(stats.propostas.valorTotal)}</div>
                  <div className="text-xs text-gray-500">Valor</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/comercial/propostas"
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                >
                  Ver Todas
                </Link>
                <Link
                  href="/comercial/propostas/nova"
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center text-sm font-medium"
                >
                  Nova Proposta
                </Link>
              </div>
            </div>
          </div>

          {/* Atividades */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Atividades</h3>
                  <p className="text-orange-100 text-sm">Follow-ups e tarefas</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.atividades.pendentes}</div>
                  <div className="text-xs text-gray-500">Pendentes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.atividades.atrasadas}</div>
                  <div className="text-xs text-gray-500">Atrasadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.atividades.proximaSemana}</div>
                  <div className="text-xs text-gray-500">Próx. Semana</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/comercial/atividades"
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                >
                  Ver Todas
                </Link>
                <Link
                  href="/comercial/atividades/nova"
                  className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-center text-sm font-medium"
                >
                  Nova Atividade
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas e Ações Rápidas */}
        {stats.atividades.atrasadas > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Você tem {stats.atividades.atrasadas} atividade(s) atrasada(s)</p>
                <p className="text-sm text-red-600">Atualize o status ou reagende</p>
              </div>
              <Link
                href="/comercial/atividades?atrasadas=true"
                className="w-full sm:w-auto text-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Ver Atrasadas
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-600 text-xs sm:text-sm">
            Módulo Comercial - CRM, Propostas e Gestão de Vendas PILI
          </p>
        </div>
      </footer>
    </div>
  );
}
