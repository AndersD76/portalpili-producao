'use client';

import { useEffect, useState } from 'react';

interface Vendedor {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  comissao_padrao: string;
  ativo: boolean;
  usuario_id?: number;
  usuario_nome?: string;
  usuario_email?: string;
  total_oportunidades: string;
  oportunidades_ganhas: string;
  valor_total_ganho: string;
  total_clientes: string;
  created_at: string;
}

export default function AdminVendedoresPage() {
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filtro, setFiltro] = useState<'ativos' | 'todos' | 'internos' | 'externos'>('ativos');
  const [showModal, setShowModal] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'VENDEDOR',
    comissao_padrao: '0.048',
  });

  useEffect(() => {
    loadVendedores();
  }, []);

  const loadVendedores = async () => {
    try {
      const res = await fetch('/api/comercial/vendedores');
      const data = await res.json();
      if (data.success) {
        setVendedores(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendedores = vendedores.filter(v => {
    if (filtro === 'ativos') return v.ativo;
    if (filtro === 'internos') return v.ativo && v.usuario_id;
    if (filtro === 'externos') return v.ativo && !v.usuario_id;
    return true; // todos
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingVendedor
        ? `/api/comercial/vendedores/${editingVendedor.id}`
        : '/api/comercial/vendedores';
      const method = editingVendedor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditingVendedor(null);
        setFormData({
          nome: '',
          email: '',
          telefone: '',
          cargo: 'VENDEDOR',
          comissao_padrao: '0.048',
        });
        loadVendedores();
      } else {
        alert(data.error || 'Erro ao salvar vendedor');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar vendedor');
    }
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      telefone: vendedor.telefone || '',
      cargo: vendedor.cargo || 'VENDEDOR',
      comissao_padrao: vendedor.comissao_padrao || '0.048',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este vendedor? Todas as oportunidades e clientes vinculados perderão o vendedor.')) return;

    try {
      const res = await fetch(`/api/comercial/vendedores/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadVendedores();
      } else {
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleToggleAtivo = async (vendedor: Vendedor) => {
    try {
      const res = await fetch(`/api/comercial/vendedores/${vendedor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !vendedor.ativo }),
      });
      const data = await res.json();
      if (data.success) {
        loadVendedores();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const totalAtivos = vendedores.filter(v => v.ativo).length;
  const totalInternos = vendedores.filter(v => v.ativo && v.usuario_id).length;
  const totalExternos = vendedores.filter(v => v.ativo && !v.usuario_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Vendedores</h2>
          <p className="text-gray-600 mt-1">
            {totalAtivos} ativos ({totalInternos} internos, {totalExternos} representantes)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingVendedor(null);
            setFormData({
              nome: '',
              email: '',
              telefone: '',
              cargo: 'VENDEDOR',
              comissao_padrao: '0.048',
            });
            setShowModal(true);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Vendedor
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { key: 'ativos', label: `Ativos (${totalAtivos})` },
          { key: 'internos', label: `Internos (${totalInternos})` },
          { key: 'externos', label: `Representantes (${totalExternos})` },
          { key: 'todos', label: `Todos (${vendedores.length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key as typeof filtro)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtro === f.key
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comissao</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clientes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oportunidades</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredVendedores.map((vendedor) => (
              <tr key={vendedor.id} className={`hover:bg-gray-50 ${!vendedor.ativo ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{vendedor.nome}</div>
                  {vendedor.telefone && (
                    <div className="text-sm text-gray-500">{vendedor.telefone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {vendedor.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {vendedor.usuario_id ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Interno
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Representante
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {vendedor.cargo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {vendedor.comissao_padrao ? (parseFloat(vendedor.comissao_padrao) * 100).toFixed(1) : '4.8'}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {vendedor.total_clientes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="text-gray-600">{vendedor.total_oportunidades}</span>
                  {parseInt(vendedor.oportunidades_ganhas) > 0 && (
                    <span className="text-green-600 ml-2">({vendedor.oportunidades_ganhas} ganhas)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleAtivo(vendedor)}
                    className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                      vendedor.ativo
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                    title={vendedor.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    {vendedor.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(vendedor)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(vendedor.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {filteredVendedores.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  Nenhum vendedor encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <select
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="DIRETOR">Diretor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comissao (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={(parseFloat(formData.comissao_padrao) * 100).toFixed(1)}
                  onChange={(e) => setFormData({ ...formData, comissao_padrao: (parseFloat(e.target.value) / 100).toString() })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
