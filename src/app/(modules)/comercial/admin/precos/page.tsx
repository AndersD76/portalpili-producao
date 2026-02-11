'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface PrecoBase {
  id: number;
  tipo_produto: string;
  modelo: string;
  comprimento?: number;
  descricao: string;
  preco: number;
  ativo: boolean;
}

interface PrecoOpcional {
  id: number;
  categoria_nome: string;
  codigo: string;
  nome: string;
  tipo_valor: string;
  valor: number;
  ativo: boolean;
}

export default function PrecosVendedorPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'base' | 'opcoes'>('base');
  const [precosBase, setPrecosBase] = useState<PrecoBase[]>([]);
  const [opcionais, setOpcionais] = useState<PrecoOpcional[]>([]);
  const [produtoFiltro, setProdutoFiltro] = useState<string>('');
  const router = useRouter();
  const { authenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [authLoading, authenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [baseRes, opcoesRes] = await Promise.all([
        fetch('/api/comercial/admin/precos?tipo=base&ativo=true'),
        fetch('/api/comercial/admin/precos?tipo=opcoes&ativo=true'),
      ]);

      const [baseData, opcoesData] = await Promise.all([
        baseRes.json(),
        opcoesRes.json(),
      ]);

      if (baseData.success) setPrecosBase(baseData.data || []);
      if (opcoesData.success) setOpcionais(opcoesData.data || []);
    } catch (error) {
      console.error('Erro ao buscar preços:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const basesFiltrados = produtoFiltro
    ? precosBase.filter(p => p.tipo_produto === produtoFiltro)
    : precosBase;

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
                href="/comercial"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Tabela de Preços</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Consulte preços base e opcionais</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs + Filtro */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            {[
              { id: 'base' as const, label: 'Preços Base' },
              { id: 'opcoes' as const, label: 'Opcionais' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  tab === t.id
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'base' && (
            <select
              value={produtoFiltro}
              onChange={(e) => setProdutoFiltro(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="">Todos os Produtos</option>
              <option value="TOMBADOR">Tombador</option>
              <option value="COLETOR">Coletor</option>
              <option value="EXAUSTOR">Exaustor</option>
            </select>
          )}
        </div>

        {/* Preços Base */}
        {tab === 'base' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">
                Preços Base de Equipamentos
                <span className="ml-2 text-sm font-normal text-gray-500">({basesFiltrados.length} itens)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprimento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {basesFiltrados.map((preco) => (
                    <tr key={preco.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{preco.tipo_produto}</td>
                      <td className="px-4 py-3 text-sm">{preco.modelo}</td>
                      <td className="px-4 py-3 text-sm">{preco.comprimento ? `${preco.comprimento}m` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{preco.descricao}</td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                        {formatCurrency(preco.preco)}
                      </td>
                    </tr>
                  ))}
                  {basesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum preço encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Opcionais */}
        {tab === 'opcoes' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">
                Opcionais e Acessórios
                <span className="ml-2 text-sm font-normal text-gray-500">({opcionais.length} itens)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {opcionais.map((opc) => (
                    <tr key={opc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{opc.categoria_nome}</td>
                      <td className="px-4 py-3 text-sm font-mono">{opc.codigo}</td>
                      <td className="px-4 py-3 text-sm">{opc.nome}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {opc.tipo_valor}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right">
                        {opc.tipo_valor === 'PERCENTUAL' ? `${opc.valor}%` : formatCurrency(opc.valor)}
                      </td>
                    </tr>
                  ))}
                  {opcionais.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum opcional encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
