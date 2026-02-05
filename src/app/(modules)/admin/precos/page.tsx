'use client';

import { useEffect, useState } from 'react';

interface TabelaPreco {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  created_at: string;
  total_itens?: number;
}

interface ItemPreco {
  id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_base: number;
  preco_minimo: number;
  margem_percentual: number;
}

export default function AdminPrecosPage() {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [itens, setItens] = useState<ItemPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTabelas();
  }, []);

  useEffect(() => {
    if (tabelaSelecionada) {
      fetchItens(tabelaSelecionada);
    }
  }, [tabelaSelecionada]);

  const fetchTabelas = async () => {
    try {
      const res = await fetch('/api/comercial/tabelas-precos');
      const data = await res.json();
      if (data.success) {
        setTabelas(data.data || []);
        if (data.data?.length > 0) {
          setTabelaSelecionada(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar tabelas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItens = async (tabelaId: number) => {
    try {
      const res = await fetch(`/api/comercial/tabelas-precos/${tabelaId}/itens`);
      const data = await res.json();
      if (data.success) {
        setItens(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const itensFiltrados = itens.filter(item =>
    !search ||
    item.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    item.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestao de Precos</h2>
        <p className="text-gray-600">Administre as tabelas de precos do sistema</p>
      </div>

      {/* Tabelas de Preco */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Tabelas de Preco</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tabelas.map((tabela) => (
            <div
              key={tabela.id}
              onClick={() => setTabelaSelecionada(tabela.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                tabelaSelecionada === tabela.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{tabela.nome}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  tabela.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tabela.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              {tabela.descricao && (
                <p className="text-sm text-gray-600 mb-2">{tabela.descricao}</p>
              )}
              <div className="text-xs text-gray-500">
                {tabela.total_itens || 0} itens
              </div>
            </div>
          ))}
          {tabelas.length === 0 && (
            <div className="col-span-4 text-center py-8 text-gray-500">
              Nenhuma tabela de preco cadastrada
            </div>
          )}
        </div>
      </div>

      {/* Itens da Tabela */}
      {tabelaSelecionada && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Itens da Tabela: {tabelas.find(t => t.id === tabelaSelecionada)?.nome}
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar item..."
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                />
                <span className="text-sm text-gray-600">
                  {itensFiltrados.length} item(ns)
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco Base</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco Minimo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margem %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.codigo}</td>
                    <td className="px-6 py-4 text-gray-600">{item.descricao}</td>
                    <td className="px-6 py-4 text-gray-600">{item.unidade}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(item.preco_base)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {formatCurrency(item.preco_minimo)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.margem_percentual?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {itensFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nenhum item encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
