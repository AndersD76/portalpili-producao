'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

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
  vehicle_description: string | null;
  submitted_at: string;
}

interface Filters {
  technicians: { id: number; name: string }[];
  vehicles: { id: number; description: string }[];
  categories: string[];
  statuses: string[];
}

export default function DespesasListPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<Filters>({ technicians: [], vehicles: [], categories: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [technician, setTechnician] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [client, setClient] = useState('');
  const [osv, setOsv] = useState('');

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/servicos/despesas/filtros')
      .then(r => r.json())
      .then(res => { if (res.success) setFilters(res.data); })
      .catch(() => {});
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '30');
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (technician) params.set('technician', technician);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (client) params.set('client', client);
    if (osv) params.set('osv', osv);

    try {
      const res = await fetch(`/api/servicos/despesas?${params}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, dateFrom, dateTo, technician, category, status, client, osv]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/servicos" className="p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-lg">Despesas de Campo</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/servicos/despesas/validar" className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500">Validar</Link>
          <Link href="/servicos/despesas/relatorio" className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500">Relatório</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm" placeholder="De" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm" placeholder="Até" />
          <select value={technician} onChange={e => { setTechnician(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm">
            <option value="">Todos técnicos</option>
            {filters.technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm">
            <option value="">Todas categorias</option>
            {filters.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm">
            <option value="">Todos status</option>
            <option value="pendente">Pendente</option>
            <option value="validado">Validado</option>
            <option value="rejeitado">Rejeitado</option>
          </select>
          <input type="text" value={client} onChange={e => { setClient(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm" placeholder="Cliente..." />
          <input type="text" value={osv} onChange={e => { setOsv(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border rounded text-sm" placeholder="OSV..." />
        </div>
        <div className="max-w-6xl mx-auto mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{total} despesas encontradas — Total: {fmt(grandTotal)}</span>
          <button onClick={() => { setDateFrom(''); setDateTo(''); setTechnician(''); setCategory(''); setStatus(''); setClient(''); setOsv(''); setPage(1); }}
            className="text-blue-600 hover:underline">Limpar filtros</button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-lg p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4" /></div>)}
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-400">Nenhuma despesa encontrada</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {expenses.map(e => (
                <div key={e.id} className="bg-white rounded-lg p-3 shadow-sm flex gap-3">
                  {e.receipt_image_url ? (
                    <img src={e.receipt_image_url} alt="" onClick={() => setLightboxUrl(e.receipt_image_url)}
                      className="w-14 h-14 rounded object-cover flex-shrink-0 cursor-pointer" />
                  ) : (
                    <div className="w-14 h-14 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-[10px]">sem foto</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm truncate">{e.client_name || e.category}</div>
                      <span className="font-bold text-sm">{fmt(Number(e.amount))}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{e.technician_name}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span>{fmtDate(e.expense_date)}</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">{e.category}</span>
                      {e.osv_number && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{e.osv_number}</span>}
                      <span className={`px-1.5 py-0.5 rounded ${
                        e.status === 'validado' ? 'bg-green-100 text-green-700' :
                        e.status === 'rejeitado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{e.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 w-10"></th>
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Técnico</th>
                    <th className="pb-2">Estabelecimento</th>
                    <th className="pb-2">Categoria</th>
                    <th className="pb-2 text-right">Valor</th>
                    <th className="pb-2">OSV</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        {e.receipt_image_url ? (
                          <img src={e.receipt_image_url} alt="" onClick={() => setLightboxUrl(e.receipt_image_url)}
                            className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-80" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100" />
                        )}
                      </td>
                      <td className="py-2">{fmtDate(e.expense_date)}</td>
                      <td className="py-2 max-w-[140px] truncate">{e.technician_name}</td>
                      <td className="py-2 max-w-[160px] truncate">{e.client_name || '-'}</td>
                      <td className="py-2"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{e.category}</span></td>
                      <td className="py-2 text-right font-medium">{fmt(Number(e.amount))}</td>
                      <td className="py-2 text-xs">{e.osv_number || '-'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          e.status === 'validado' ? 'bg-green-100 text-green-700' :
                          e.status === 'rejeitado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-40">Anterior</button>
                <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-40">Próxima</button>
              </div>
            )}
          </>
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
