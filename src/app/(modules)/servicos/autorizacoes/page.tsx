'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Authorization {
  id: string;
  code: string;
  requester_name: string;
  requester_phone: string | null;
  reason: string;
  amount: number;
  manager_name: string;
  status: string;
  decision_at: string | null;
  created_at: string;
}

export default function AutorizacoesAdminPage() {
  const [items, setItems] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    try {
      const res = await fetch(`/api/servicos/autorizacoes${params}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      'Pendente': 'bg-yellow-100 text-yellow-700',
      'Aprovada': 'bg-green-100 text-green-700',
      'Reprovada': 'bg-red-100 text-red-700',
    };
    return map[s] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/servicos" className="p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-lg">Autorizações</h1>
        </div>
        <Link href="/servicos/autorizacao" target="_blank"
          className="text-xs bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-500">+ Solicitar</Link>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
        {['', 'Pendente', 'Aprovada', 'Reprovada'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filterStatus === s ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-2">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="bg-white rounded-lg p-4 animate-pulse"><div className="h-12 bg-gray-200 rounded" /></div>)
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-400">Nenhuma autorização encontrada</div>
        ) : (
          items.map(a => (
            <div key={a.id} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{a.requester_name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{a.reason}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>Gerente: {a.manager_name}</span>
                    <span>{fmtDate(a.created_at)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{fmt(a.amount)}</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${statusBadge(a.status)}`}>{a.status}</span>
                  {a.status === 'Aprovada' && (
                    <div className="mt-1 font-mono text-xs bg-green-50 px-2 py-0.5 rounded text-green-700">{a.code}</div>
                  )}
                </div>
              </div>
              {a.status === 'Pendente' && (
                <div className="mt-3 pt-2 border-t">
                  <Link href={`/servicos/autorizacao/decisao/${a.id}`} target="_blank"
                    className="text-xs text-red-600 hover:underline">
                    Abrir página de decisão →
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
