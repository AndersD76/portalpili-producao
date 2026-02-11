'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PipelineKanban, ModalDetalheOportunidade } from '@/components/comercial';
import { useAuth } from '@/contexts/AuthContext';

interface Oportunidade {
  id: number;
  titulo: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  vendedor_nome?: string;
  vendedor_id?: number;
  produto: string;
  tipo_produto?: string;
  valor_estimado: number;
  probabilidade: number;
  estagio: string;
  status: string;
  data_previsao_fechamento?: string;
  total_atividades?: number;
  atividades_atrasadas?: number;
  ultimo_contato?: string;
  ultimo_contato_desc?: string;
  observacoes?: string;
  concorrentes?: string;
  created_at: string;
}

interface Vendedor {
  id: number;
  nome: string;
  usuario_id?: number;
}

const ESTAGIOS_OPTIONS = [
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'EM_NEGOCIACAO', label: 'Em Negociação' },
  { value: 'POS_NEGOCIACAO', label: 'Pós Negociação' },
  { value: 'FECHADA', label: 'Fechada' },
  { value: 'PERDIDA', label: 'Perdida' },
  { value: 'TESTE', label: 'Teste' },
  { value: 'SUSPENSO', label: 'Suspenso' },
  { value: 'SUBSTITUIDO', label: 'Substituído' },
];

export default function PipelinePage() {
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [selectedOportunidadeId, setSelectedOportunidadeId] = useState<number | null>(null);
  const router = useRouter();
  const { user, authenticated, loading: authLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
    if (user && !isAdmin) {
      setFiltroVendedor(String(user.id));
    }
  }, [authLoading, authenticated, user, isAdmin, router]);

  useEffect(() => {
    if (!user) return;
    fetchOportunidades();
    fetchVendedores();
  }, [user, filtroVendedor, filtroProduto]);

  const fetchOportunidades = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroVendedor) params.append('usuario_id', filtroVendedor);
      if (filtroProduto) params.append('produto', filtroProduto);
      params.append('limit', '2000');
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

  const fetchVendedores = async () => {
    try {
      const res = await fetch('/api/comercial/vendedores?ativo=true');
      const data = await res.json();
      if (data.success) setVendedores(data.data || []);
    } catch { /* ignore */ }
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
          prev.map(o => o.id === oportunidadeId ? { ...o, estagio: novoEstagio } : o)
        );
      }
    } catch (error) {
      console.error('Erro ao mover oportunidade:', error);
    }
  }, []);

  const handleClickOportunidade = (oportunidade: Oportunidade) => {
    setSelectedOportunidadeId(oportunidade.id);
  };

  const toNum = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return isNaN(n) ? 0 : n;
  };

  const formatCurrency = (value: unknown) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(toNum(value));

  const totalValor = oportunidades
    .filter(o => o.status === 'ABERTA')
    .reduce((sum, o) => sum + toNum(o.valor_estimado), 0);

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
      {/* Hide scrollbar arrows globally */}
      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        ::-webkit-scrollbar-button { display: none; }
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link href="/comercial" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Pipeline de Vendas</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {oportunidades.filter(o => o.status === 'ABERTA').length} oportunidades &bull; {formatCurrency(totalValor)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtro Vendedor */}
              {isAdmin && (
                <select
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Todos Vendedores</option>
                  {vendedores.map(v => (
                    <option key={v.id} value={v.usuario_id ? String(v.usuario_id) : `vid_${v.id}`}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              )}

              {/* Filtro Produto */}
              <select
                value={filtroProduto}
                onChange={(e) => setFiltroProduto(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">Todos Produtos</option>
                <option value="TOMBADOR">Tombador</option>
                <option value="COLETOR">Coletor</option>
              </select>
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

      {/* Modal Detalhe Oportunidade */}
      {selectedOportunidadeId && (
        <ModalDetalheOportunidade
          oportunidadeId={selectedOportunidadeId}
          onClose={() => setSelectedOportunidadeId(null)}
          onSave={() => fetchOportunidades()}
        />
      )}
    </div>
  );
}
