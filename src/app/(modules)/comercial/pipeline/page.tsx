'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PipelineKanban, AssistenteIA } from '@/components/comercial';

interface Oportunidade {
  id: number;
  titulo: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  vendedor_nome?: string;
  tipo_produto: string;
  valor_estimado: number;
  probabilidade: number;
  estagio: string;
  situacao: string;
  data_previsao_fechamento?: string;
  total_atividades?: number;
  atividades_atrasadas?: number;
  created_at: string;
}

export default function PipelinePage() {
  const [user, setUser] = useState<{ nome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [mostrarAssistente, setMostrarAssistente] = useState(false);
  const [oportunidadeSelecionada, setOportunidadeSelecionada] = useState<Oportunidade | null>(null);
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

    fetchOportunidades();
  }, [router]);

  const fetchOportunidades = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroVendedor) params.append('vendedor_id', filtroVendedor);
      if (filtroProduto) params.append('tipo_produto', filtroProduto);

      const response = await fetch(`/api/comercial/oportunidades?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setOportunidades(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveOportunidade = useCallback(async (oportunidadeId: number, novoEstagio: string) => {
    try {
      const response = await fetch(`/api/comercial/oportunidades/${oportunidadeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estagio: novoEstagio }),
      });

      const result = await response.json();

      if (result.success) {
        setOportunidades(prev =>
          prev.map(o =>
            o.id === oportunidadeId ? { ...o, estagio: novoEstagio } : o
          )
        );
      }
    } catch (error) {
      console.error('Erro ao mover oportunidade:', error);
    }
  }, []);

  const handleClickOportunidade = (oportunidade: Oportunidade) => {
    setOportunidadeSelecionada(oportunidade);
    router.push(`/comercial/oportunidades/${oportunidade.id}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalValor = oportunidades
    .filter(o => o.situacao === 'ABERTA')
    .reduce((sum, o) => sum + o.valor_estimado, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/comercial"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Pipeline de Vendas</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {oportunidades.filter(o => o.situacao === 'ABERTA').length} oportunidades • {formatCurrency(totalValor)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtros */}
              <select
                value={filtroProduto}
                onChange={(e) => {
                  setFiltroProduto(e.target.value);
                  fetchOportunidades();
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">Todos os Produtos</option>
                <option value="TOMBADOR">Tombador</option>
                <option value="COLETOR">Coletor</option>
              </select>

              <button
                onClick={() => setMostrarAssistente(true)}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Assistente IA"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>

              <Link
                href="/comercial/oportunidades/nova"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Oportunidade
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        <PipelineKanban
          oportunidades={oportunidades}
          onMoveOportunidade={handleMoveOportunidade}
          onClickOportunidade={handleClickOportunidade}
        />
      </main>

      {/* Assistente IA */}
      {mostrarAssistente && (
        <AssistenteIA
          contexto={oportunidadeSelecionada ? {
            cliente: oportunidadeSelecionada.cliente_nome,
            oportunidade_id: oportunidadeSelecionada.id,
          } : undefined}
          sugestoes={[
            'Como fechar mais vendas?',
            'Dicas para negociação',
            'Como qualificar leads?',
          ]}
          onClose={() => setMostrarAssistente(false)}
        />
      )}
    </div>
  );
}
