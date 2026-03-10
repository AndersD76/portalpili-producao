'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/servicos/constants';

interface Expense {
  id: number;
  technician_name: string;
  client_name: string | null;
  category: string;
  amount: number;
  expense_date: string | null;
  location: string | null;
  osv_number: string | null;
  nf_number: string | null;
  status: string;
  receipt_image_url: string | null;
  payment_method: string | null;
  notes: string | null;
}

export default function ValidarDespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servicos/despesas?status=pendente&limit=100');
      const data = await res.json();
      if (data.success) setExpenses(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditData({ osv_number: e.osv_number || '', nf_number: e.nf_number || '', category: e.category, amount: e.amount });
  };

  const saveEdit = async (id: number) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/servicos/despesas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...editData } as Expense : e));
        setEditingId(null);
        setMessage({ type: 'success', text: 'Atualizado' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    }
    setSaving(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const updateStatus = async (id: number, status: 'validado' | 'rejeitado') => {
    setSaving(id);
    try {
      const res = await fetch(`/api/servicos/despesas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        setMessage({ type: 'success', text: status === 'validado' ? 'Despesa validada' : 'Despesa rejeitada' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao atualizar' });
    }
    setSaving(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteExpense = async (id: number) => {
    if (!confirm('Excluir esta despesa permanentemente?')) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/servicos/despesas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        setMessage({ type: 'success', text: 'Despesa excluída' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao excluir' });
    }
    setSaving(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/servicos/despesas" className="p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-lg">Validar Despesas</h1>
          <span className="bg-blue-600 px-2 py-0.5 rounded text-xs">{expenses.length} pendentes</span>
        </div>
        <Link href="/servicos/despesas/relatorio" className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500">Relatório</Link>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 text-sm ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>{message.text}</div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="bg-white rounded-xl p-4 animate-pulse"><div className="h-20 bg-gray-200 rounded" /></div>)
        ) : expenses.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-lg font-medium text-gray-600">Tudo validado!</p>
            <p className="text-sm mt-1">Não há despesas pendentes de validação.</p>
          </div>
        ) : (
          expenses.map(e => (
            <div key={e.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${saving === e.id ? 'opacity-60' : ''}`}>
              <div className="flex gap-3 p-4">
                {/* Thumbnail */}
                {e.receipt_image_url ? (
                  <img src={e.receipt_image_url} alt="" onClick={() => setLightboxUrl(e.receipt_image_url)}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs">sem foto</div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{e.client_name || 'Sem estabelecimento'}</div>
                      <div className="text-xs text-gray-500">{e.technician_name} — {fmtDate(e.expense_date)}</div>
                      {e.location && <div className="text-xs text-gray-400">{e.location}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{fmt(Number(e.amount))}</div>
                      <div className="text-xs text-gray-400">{e.payment_method || '-'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">{e.category}</span>
                    {e.osv_number && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">OSV: {e.osv_number}</span>}
                    {e.nf_number && <span className="px-2 py-0.5 bg-gray-50 rounded">NF: {e.nf_number}</span>}
                  </div>
                </div>
              </div>

              {/* Edit mode */}
              {editingId === e.id && (
                <div className="bg-gray-50 px-4 py-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">OSV</label>
                    <input type="text" value={editData.osv_number || ''} onChange={ev => setEditData(d => ({ ...d, osv_number: ev.target.value }))}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">NF</label>
                    <input type="text" value={editData.nf_number || ''} onChange={ev => setEditData(d => ({ ...d, nf_number: ev.target.value }))}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Categoria</label>
                    <select value={editData.category || ''} onChange={ev => setEditData(d => ({ ...d, category: ev.target.value }))}
                      className="w-full px-2 py-1.5 border rounded text-sm">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Valor</label>
                    <input type="number" step="0.01" value={editData.amount || ''} onChange={ev => setEditData(d => ({ ...d, amount: Number(ev.target.value) }))}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div className="col-span-2 sm:col-span-4 flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                    <button onClick={() => saveEdit(e.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Salvar</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 px-4 py-2 border-t bg-gray-50/50">
                <button onClick={() => startEdit(e)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Editar
                </button>
                <button onClick={() => deleteExpense(e.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Excluir
                </button>
                <div className="flex-1" />
                <button onClick={() => updateStatus(e.id, 'rejeitado')}
                  className="px-3 py-1.5 text-xs border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Rejeitar
                </button>
                <button onClick={() => updateStatus(e.id, 'validado')}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">
                  Validar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setLightboxUrl(null)}>&times;</button>
          <img src={lightboxUrl} alt="Comprovante" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
