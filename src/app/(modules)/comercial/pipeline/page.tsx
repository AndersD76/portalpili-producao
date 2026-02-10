'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PipelineKanban } from '@/components/comercial';
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
  { value: 'PROSPECCAO', label: 'Prospecção' },
  { value: 'EM_NEGOCIACAO', label: 'Negociação' },
  { value: 'FECHADA', label: 'Fechada' },
  { value: 'PERDIDA', label: 'Perdida' },
  { value: 'TESTE', label: 'Teste' },
  { value: 'SUBSTITUIDO', label: 'Substituído' },
  { value: 'SUSPENSO', label: 'Suspenso' },
];

export default function PipelinePage() {
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [editModal, setEditModal] = useState<Oportunidade | null>(null);
  const [editForm, setEditForm] = useState({
    estagio: '',
    valor_estimado: '',
    probabilidade: '',
    observacoes: '',
    status: '',
  });
  const [saving, setSaving] = useState(false);
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
    setEditModal(oportunidade);
    setEditForm({
      estagio: oportunidade.estagio,
      valor_estimado: String(toNum(oportunidade.valor_estimado)),
      probabilidade: String(toNum(oportunidade.probabilidade)),
      observacoes: oportunidade.observacoes || '',
      status: oportunidade.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/comercial/oportunidades/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estagio: editForm.estagio,
          valor_estimado: parseFloat(editForm.valor_estimado) || 0,
          probabilidade: parseInt(editForm.probabilidade) || 0,
          observacoes: editForm.observacoes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOportunidades(prev =>
          prev.map(o => o.id === editModal.id ? {
            ...o,
            estagio: editForm.estagio,
            valor_estimado: parseFloat(editForm.valor_estimado) || 0,
            probabilidade: parseInt(editForm.probabilidade) || 0,
            observacoes: editForm.observacoes,
          } : o)
        );
        setEditModal(null);
      } else {
        alert(data.error || 'Erro ao salvar');
      }
    } catch {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
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

      {/* Modal Editar Oportunidade */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">#{editModal.id} - Oportunidade</h3>
                <p className="text-xs text-gray-500">{editModal.vendedor_nome}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Info card */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="font-bold text-gray-900">{editModal.titulo}</div>
                <div className="text-sm text-gray-600">
                  {editModal.cliente_fantasia || editModal.cliente_nome}
                </div>
                <div className="text-xs text-gray-400">
                  Produto: {editModal.produto || editModal.tipo_produto || '-'} &bull; Criado: {new Date(editModal.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Estagio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estágio</label>
                <select
                  value={editForm.estagio}
                  onChange={e => setEditForm({ ...editForm, estagio: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {ESTAGIOS_OPTIONS.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Valor + Probabilidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={editForm.valor_estimado}
                    onChange={e => setEditForm({ ...editForm, valor_estimado: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.probabilidade}
                    onChange={e => setEditForm({ ...editForm, probabilidade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Observacoes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={editForm.observacoes}
                  onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Anotações sobre esta oportunidade..."
                />
              </div>

              {/* Atividades info */}
              {(toNum(editModal.total_atividades) > 0 || toNum(editModal.atividades_atrasadas) > 0) && (
                <div className="flex gap-3 text-xs">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    {editModal.total_atividades} atividade(s)
                  </span>
                  {toNum(editModal.atividades_atrasadas) > 0 && (
                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                      {editModal.atividades_atrasadas} atrasada(s)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
