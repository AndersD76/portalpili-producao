'use client';

import { useEffect, useState } from 'react';

interface Cliente {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  status: string;
  vendedor_nome?: string;
  created_at: string;
}

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const res = await fetch('/api/comercial/clientes?limit=500');
      const data = await res.json();
      if (data.success) {
        setClientes(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    const matchSearch = !search ||
      c.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      c.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj?.includes(search);
    const matchStatus = !filtroStatus || c.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'ATIVO': 'bg-green-100 text-green-800',
      'INATIVO': 'bg-gray-100 text-gray-800',
      'PROSPECTO': 'bg-blue-100 text-blue-800',
      'BLOQUEADO': 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

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
        <h2 className="text-2xl font-bold text-gray-900">Gestao de Clientes</h2>
        <p className="text-gray-600">Visualize e gerencie todos os clientes cadastrados</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, fantasia ou CNPJ..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="PROSPECTO">Prospecto</option>
              <option value="BLOQUEADO">Bloqueado</option>
            </select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-gray-600">
              {clientesFiltrados.length} cliente(s) encontrado(s)
            </span>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">CNPJ</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Cidade/UF</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Contato</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Vendedor</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="font-medium text-gray-900 text-sm">{cliente.razao_social}</div>
                    {cliente.nome_fantasia && (
                      <div className="text-xs sm:text-sm text-gray-500">{cliente.nome_fantasia}</div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-sm text-gray-600 hidden md:table-cell">
                    {cliente.cnpj || '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-sm text-gray-600 hidden lg:table-cell">
                    {cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-sm hidden lg:table-cell">
                    {cliente.email && <div className="text-gray-600">{cliente.email}</div>}
                    {cliente.telefone && <div className="text-gray-500">{cliente.telefone}</div>}
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-sm text-gray-600 hidden sm:table-cell">
                    {cliente.vendedor_nome || '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(cliente.status)}`}>
                      {cliente.status}
                    </span>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
