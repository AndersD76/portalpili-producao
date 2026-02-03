'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalVendedores: number;
  totalClientes: number;
  totalPropostas: number;
  totalOportunidades: number;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    totalVendedores: 0,
    totalClientes: 0,
    totalPropostas: 0,
    totalOportunidades: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Carrega estatisticas de varias APIs em paralelo
      const [usuariosRes, vendedoresRes, clientesRes, propostasRes, oportunidadesRes] = await Promise.all([
        fetch('/api/admin/usuarios').catch(() => null),
        fetch('/api/comercial/vendedores').catch(() => null),
        fetch('/api/comercial/clientes').catch(() => null),
        fetch('/api/comercial/propostas').catch(() => null),
        fetch('/api/comercial/oportunidades').catch(() => null),
      ]);

      const usuarios = usuariosRes ? await usuariosRes.json().catch(() => ({})) : {};
      const vendedores = vendedoresRes ? await vendedoresRes.json().catch(() => ({})) : {};
      const clientes = clientesRes ? await clientesRes.json().catch(() => ({})) : {};
      const propostas = propostasRes ? await propostasRes.json().catch(() => ({})) : {};
      const oportunidades = oportunidadesRes ? await oportunidadesRes.json().catch(() => ({})) : {};

      setStats({
        totalUsuarios: usuarios.data?.length || 0,
        usuariosAtivos: usuarios.data?.filter((u: { ativo: boolean }) => u.ativo).length || 0,
        totalVendedores: vendedores.total || vendedores.data?.length || 0,
        totalClientes: clientes.pagination?.total || clientes.data?.length || 0,
        totalPropostas: propostas.pagination?.total || propostas.data?.length || 0,
        totalOportunidades: oportunidades.pagination?.total || oportunidades.data?.length || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatisticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Usuarios',
      value: stats.totalUsuarios,
      subtitle: `${stats.usuariosAtivos} ativos`,
      href: '/admin/usuarios',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      title: 'Vendedores',
      value: stats.totalVendedores,
      subtitle: 'Equipe comercial',
      href: '/admin/vendedores',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      title: 'Clientes',
      value: stats.totalClientes,
      subtitle: 'Cadastrados no CRM',
      href: '/admin/clientes',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-purple-500',
    },
    {
      title: 'Propostas',
      value: stats.totalPropostas,
      subtitle: 'Total geradas',
      href: '/comercial/propostas',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-orange-500',
    },
    {
      title: 'Oportunidades',
      value: stats.totalOportunidades,
      subtitle: 'Pipeline comercial',
      href: '/comercial/oportunidades',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'bg-red-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Administrativo</h2>
        <p className="text-gray-600 mt-1">Visao geral do sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-center gap-4">
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-400">{card.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acoes Rapidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/usuarios"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-gray-700">Novo Usuario</span>
          </Link>

          <Link
            href="/admin/vendedores"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-gray-700">Novo Vendedor</span>
          </Link>

          <Link
            href="/admin/precos"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-gray-700">Gerenciar Precos</span>
          </Link>

          <Link
            href="/admin/configuracoes"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-700">Configuracoes</span>
          </Link>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Informacoes do Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Versao</p>
            <p className="font-medium text-gray-800">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-500">Ambiente</p>
            <p className="font-medium text-gray-800">Producao</p>
          </div>
          <div>
            <p className="text-gray-500">Banco de Dados</p>
            <p className="font-medium text-gray-800">PostgreSQL (NeonDB)</p>
          </div>
          <div>
            <p className="text-gray-500">Framework</p>
            <p className="font-medium text-gray-800">Next.js 16</p>
          </div>
        </div>
      </div>
    </div>
  );
}
