'use client';

import Link from 'next/link';

export default function Home() {
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
        { label: 'OPDs Ativas', valor: '19' },
        { label: 'Em Andamento', valor: '12' },
      ]
    },
    {
      titulo: 'Qualidade',
      descricao: 'Gestão de NCs, Reclamações e Ações Corretivas',
      href: '/qualidade',
      cor: 'from-green-500 to-green-700',
      corHover: 'hover:from-green-600 hover:to-green-800',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      stats: [
        { label: 'NCs Abertas', valor: '—' },
        { label: 'Ações Pendentes', valor: '—' },
      ]
    },
    {
      titulo: 'Dashboard',
      descricao: 'Visão geral e indicadores de desempenho',
      href: '/dashboard',
      cor: 'from-blue-500 to-blue-700',
      corHover: 'hover:from-blue-600 hover:to-blue-800',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      stats: [
        { label: 'KPIs', valor: '—' },
        { label: 'Relatórios', valor: '—' },
      ]
    },
    {
      titulo: 'Calendário',
      descricao: 'Visualização de entregas e prazos',
      href: '/producao/calendario',
      cor: 'from-purple-500 to-purple-700',
      corHover: 'hover:from-purple-600 hover:to-purple-800',
      icone: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      stats: [
        { label: 'Este Mês', valor: '—' },
        { label: 'Próxima Semana', valor: '—' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Portal Pili</h1>
            <p className="text-gray-600 mt-2 text-lg">
              Sistema de Gestão de Produção e Qualidade
            </p>
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
              <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Registrar NC</span>
            </Link>

            <Link
              href="/qualidade/reclamacao-cliente/nova"
              className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition group"
            >
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Reclamação</span>
            </Link>

            <Link
              href="/qualidade/acao-corretiva/nova"
              className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            Portal Pili - Sistema de Gestão de Produção e Qualidade
          </p>
        </div>
      </footer>
    </div>
  );
}
