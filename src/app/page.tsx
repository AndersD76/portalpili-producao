'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  opdsAtivas: number;
  opdsEmAndamento: number;
  ncsAbertas: number;
  acoesPendentes: number;
  entregasEsteMes: number;
  entregasProximaSemana: number;
  clientes: number;
  propostas: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    opdsAtivas: 0,
    opdsEmAndamento: 0,
    ncsAbertas: 0,
    acoesPendentes: 0,
    entregasEsteMes: 0,
    entregasProximaSemana: 0,
    clientes: 0,
    propostas: 0
  });
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Verificar autenticação
  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    async function fetchStats() {
      try {
        // Buscar OPDs
        const opdsResponse = await fetch('/api/opds');
        if (opdsResponse.ok) {
          const opdsData = await opdsResponse.json();
          if (opdsData.success && Array.isArray(opdsData.data)) {
            const opds = opdsData.data;
            const opdsAtivas = opds.length;
            const opdsEmAndamento = opds.filter((opd: { status?: string }) =>
              opd.status === 'EM ANDAMENTO' || opd.status === 'Em Andamento'
            ).length;

            // Calcular entregas do mês e próxima semana
            const hoje = new Date();
            const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            const proximaSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

            const entregasEsteMes = opds.filter((opd: { data_entrega?: string }) => {
              if (!opd.data_entrega) return false;
              const dataEntrega = new Date(opd.data_entrega);
              return dataEntrega >= inicioMes && dataEntrega <= fimMes;
            }).length;

            const entregasProximaSemana = opds.filter((opd: { data_entrega?: string }) => {
              if (!opd.data_entrega) return false;
              const dataEntrega = new Date(opd.data_entrega);
              return dataEntrega >= hoje && dataEntrega <= proximaSemana;
            }).length;

            setStats(prev => ({
              ...prev,
              opdsAtivas,
              opdsEmAndamento,
              entregasEsteMes,
              entregasProximaSemana
            }));
          }
        }

        // Buscar NCs
        const ncsResponse = await fetch('/api/qualidade/nao-conformidade');
        if (ncsResponse.ok) {
          const ncsData = await ncsResponse.json();
          if (ncsData.success && Array.isArray(ncsData.data)) {
            const ncs = ncsData.data;
            const ncsAbertas = ncs.filter((nc: { status?: string }) =>
              nc.status === 'Aberta' || nc.status === 'aberta' || nc.status === 'ABERTA'
            ).length;
            setStats(prev => ({ ...prev, ncsAbertas }));
          }
        }

        // Buscar Ações Corretivas
        const acoesResponse = await fetch('/api/qualidade/acao-corretiva');
        if (acoesResponse.ok) {
          const acoesData = await acoesResponse.json();
          if (acoesData.success && Array.isArray(acoesData.data)) {
            const acoes = acoesData.data;
            const acoesPendentes = acoes.filter((ac: { status?: string }) =>
              ac.status === 'Pendente' || ac.status === 'pendente' || ac.status === 'PENDENTE' ||
              ac.status === 'Em Andamento' || ac.status === 'em andamento' || ac.status === 'EM ANDAMENTO'
            ).length;
            setStats(prev => ({ ...prev, acoesPendentes }));
          }
        }

        // Buscar Clientes CRM
        const clientesResponse = await fetch('/api/comercial/clientes?limit=1');
        if (clientesResponse.ok) {
          const clientesData = await clientesResponse.json();
          if (clientesData.success) {
            const clientes = clientesData.pagination?.total || 0;
            setStats(prev => ({ ...prev, clientes }));
          }
        }

        // Buscar Propostas CRM
        const propostasResponse = await fetch('/api/comercial/propostas?limit=1');
        if (propostasResponse.ok) {
          const propostasData = await propostasResponse.json();
          if (propostasData.success) {
            const propostas = propostasData.pagination?.total || 0;
            setStats(prev => ({ ...prev, propostas }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [checkingAuth]);

  const modulos = [
    {
      titulo: 'Produção',
      descricao: 'Controle e acompanhamento de OPDs em tempo real',
      href: '/producao',
      cor: 'from-red-500 to-red-700',
      corHover: 'hover:from-red-600 hover:to-red-800',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      stats: [
        { label: 'OPDs Ativas', valor: loading ? '...' : String(stats.opdsAtivas) },
        { label: 'Em Andamento', valor: loading ? '...' : String(stats.opdsEmAndamento) },
      ]
    },
    {
      titulo: 'Qualidade',
      descricao: 'Gestão de NCs, Reclamações e Ações Corretivas',
      href: '/qualidade',
      cor: 'from-red-600 to-red-800',
      corHover: 'hover:from-red-700 hover:to-red-900',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      stats: [
        { label: 'NCs Abertas', valor: loading ? '...' : String(stats.ncsAbertas) },
        { label: 'Ações Pendentes', valor: loading ? '...' : String(stats.acoesPendentes) },
      ]
    },
    {
      titulo: 'Comercial',
      descricao: 'CRM, Pipeline de vendas e propostas',
      href: '/comercial',
      cor: 'from-red-500 to-red-700',
      corHover: 'hover:from-red-600 hover:to-red-800',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      stats: [
        { label: 'Clientes', valor: loading ? '...' : String(stats.clientes) },
        { label: 'Propostas', valor: loading ? '...' : String(stats.propostas) },
      ]
    },
    {
      titulo: 'Dashboard',
      descricao: 'Visão geral e indicadores de desempenho',
      href: '/dashboard',
      cor: 'from-red-600 to-red-800',
      corHover: 'hover:from-red-700 hover:to-red-900',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      stats: [
        { label: 'OPDs Total', valor: loading ? '...' : String(stats.opdsAtivas) },
        { label: 'Este Mês', valor: loading ? '...' : String(stats.entregasEsteMes) },
      ]
    },
    {
      titulo: 'Calendário',
      descricao: 'Visualização de entregas e prazos',
      href: '/producao/calendario',
      cor: 'from-red-400 to-red-600',
      corHover: 'hover:from-red-500 hover:to-red-700',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      stats: [
        { label: 'Este Mês', valor: loading ? '...' : String(stats.entregasEsteMes) },
        { label: 'Próx. Semana', valor: loading ? '...' : String(stats.entregasProximaSemana) },
      ]
    },
    {
      titulo: 'Admin',
      descricao: 'Configurações do sistema e usuários',
      href: '/admin',
      cor: 'from-rose-600 to-rose-800',
      corHover: 'hover:from-rose-700 hover:to-rose-900',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      stats: [
        { label: 'Usuários', valor: '-' },
        { label: 'Config', valor: '-' },
      ]
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('user_data');
    sessionStorage.removeItem('politica_vista');
    router.push('/login');
  };

  // Tela de carregamento enquanto verifica autenticação
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Portal Pili</h1>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              title="Sair"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Cards de Módulos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modulos.map((modulo) => (
            <Link
              key={modulo.titulo}
              href={modulo.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${modulo.cor} ${modulo.corHover} text-white shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl`}
            >
              <div className="p-8">
                {/* Ícone de fundo */}
                <div className="absolute right-4 top-4 opacity-20 group-hover:opacity-30 transition-opacity">
                  {modulo.icone}
                </div>

                {/* Conteúdo */}
                <div className="relative z-10">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <div className="w-8 h-8">
                        {modulo.icone}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold">{modulo.titulo}</h2>
                  </div>

                  <p className="text-white/90 mb-6 text-lg">
                    {modulo.descricao}
                  </p>

                  {/* Stats */}
                  <div className="flex space-x-6">
                    {modulo.stats.map((stat) => (
                      <div key={stat.label} className="bg-white/10 rounded-lg px-4 py-2">
                        <p className="text-white/70 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.valor}</p>
                      </div>
                    ))}
                  </div>

                  {/* Seta */}
                  <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Ações Rápidas */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/producao"
              className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition group"
            >
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Nova OPD</span>
            </Link>

            <Link
              href="/qualidade/nao-conformidade/nova"
              className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition group"
            >
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Registrar NC</span>
            </Link>

            <Link
              href="/qualidade/reclamacao-cliente/nova"
              className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition group"
            >
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Reclamação</span>
            </Link>

            <Link
              href="/qualidade/acao-corretiva/nova"
              className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition group"
            >
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Ação Corretiva</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Portal Pili v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
