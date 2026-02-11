'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { gerarRelatorioTotais, gerarRelatorioVendedores, gerarRelatorioProdutos, gerarRelatorioVendedorIndividual } from '@/lib/comercial/relatorios-pdf';

type ReportType = 'totais' | 'vendedores' | 'produtos' | 'vendedor_individual';

interface Vendedor {
  id: number;
  nome: string;
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState<ReportType | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedorId, setSelectedVendedorId] = useState<string>('');
  const router = useRouter();
  const { user, authenticated, loading: authLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (authenticated && isAdmin) {
      fetch('/api/comercial/vendedores?ativo=true')
        .then(r => r.json())
        .then(d => { if (d.success) setVendedores(d.data || []); })
        .catch(() => {});
    }
  }, [authenticated, isAdmin]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    router.push('/login');
    return null;
  }

  const periodoLabel = () => {
    if (dataInicio && dataFim) {
      return `${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    }
    if (dataInicio) return `A partir de ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    if (dataFim) return `Até ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    return 'Todos os períodos';
  };

  const handleGerarPDF = async (tipo: ReportType) => {
    if (tipo === 'vendedor_individual' && !selectedVendedorId) {
      alert('Selecione um vendedor para gerar o relatório individual.');
      return;
    }

    setLoading(tipo);
    try {
      const params = new URLSearchParams({ tipo });
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim) params.append('data_fim', dataFim);
      if (!isAdmin && user?.id) params.append('usuario_id', String(user.id));
      if (tipo === 'vendedor_individual') params.append('vendedor_id', selectedVendedorId);

      const res = await fetch(`/api/comercial/relatorios?${params.toString()}`);
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Erro ao buscar dados do relatório');
        return;
      }

      const periodo = periodoLabel();

      if (tipo === 'totais') {
        gerarRelatorioTotais(result.data, periodo);
      } else if (tipo === 'vendedores') {
        gerarRelatorioVendedores(result.data, periodo);
      } else if (tipo === 'produtos') {
        gerarRelatorioProdutos(result.data, periodo);
      } else if (tipo === 'vendedor_individual') {
        gerarRelatorioVendedorIndividual(result.data, periodo);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(null);
    }
  };

  const relatorios = [
    {
      tipo: 'totais' as ReportType,
      titulo: 'Relatório Geral',
      descricao: 'Resumo completo: pipeline por estágio, KPIs, propostas por situação e total de clientes.',
      icone: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      cor: 'from-red-500 to-red-600',
    },
    {
      tipo: 'vendedores' as ReportType,
      titulo: 'Todos Vendedores',
      descricao: 'Comparativo de todos os vendedores: oportunidades, conversão, valor ganho e comissões.',
      icone: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      cor: 'from-blue-500 to-blue-600',
    },
    {
      tipo: 'produtos' as ReportType,
      titulo: 'Por Produto',
      descricao: 'Tombador vs Coletor: quantidade, valores, pipeline por estágio e propostas por produto.',
      icone: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      cor: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link href="/comercial" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Relatórios Comerciais</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Gerar relatórios em PDF</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period filter */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtrar por Período</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            {(dataInicio || dataFim) && (
              <button
                onClick={() => { setDataInicio(''); setDataFim(''); }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition"
              >
                Limpar filtro
              </button>
            )}
            <div className="text-xs text-gray-400 ml-auto">
              {periodoLabel()}
            </div>
          </div>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {relatorios.map(rel => (
            <div key={rel.tipo} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition">
              <div className={`bg-gradient-to-r ${rel.cor} p-4`}>
                <div className="text-white flex items-center gap-3">
                  {rel.icone}
                  <h3 className="text-lg font-bold">{rel.titulo}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-5 min-h-[48px]">{rel.descricao}</p>
                <button
                  onClick={() => handleGerarPDF(rel.tipo)}
                  disabled={loading !== null}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                    loading === rel.tipo
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {loading === rel.tipo ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Gerar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Individual vendor report */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
              <div className="text-white flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-lg font-bold">Relatório Individual do Vendedor</h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Relatório detalhado para um vendedor específico: KPIs, pipeline, oportunidades, atividades pendentes.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Selecionar Vendedor</label>
                  <select
                    value={selectedVendedorId}
                    onChange={e => setSelectedVendedorId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">-- Selecione --</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={String(v.id)}>{v.nome}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleGerarPDF('vendedor_individual')}
                  disabled={loading !== null || !selectedVendedorId}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                    loading === 'vendedor_individual'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : !selectedVendedorId
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                  } disabled:opacity-50`}
                >
                  {loading === 'vendedor_individual' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Gerar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isAdmin && (
          <p className="text-xs text-gray-400 text-center mt-6">
            Os relatórios mostram apenas dados das suas oportunidades e propostas.
          </p>
        )}
      </main>
    </div>
  );
}
