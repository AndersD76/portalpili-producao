'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MatchResult {
  transacao: { data: string; descricao: string; valor: number; categoria_provavel: string };
  despesa: { id: number; client_name: string; amount: number; expense_date: string; category: string; technician_name: string };
  confianca: string;
}

interface ConferenceData {
  totalStatement: number;
  totalSystem: number;
  difference: number;
  transacoesExtrato: number;
  despesasSistema: number;
  matched: MatchResult[];
  unmatchedStatement: Array<{ data: string; descricao: string; valor: number; categoria_provavel: string }>;
  unmatchedSystem: Array<{ id: number; client_name: string; amount: number; expense_date: string; category: string; technician_name: string }>;
}

export default function ConferenciaPage() {
  const [extratoTexto, setExtratoTexto] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConferenceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmt = (v: number | string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const handleConferir = async () => {
    setError(null);
    if (!extratoTexto.trim()) { setError('Cole o extrato no campo acima'); return; }
    setLoading(true);

    try {
      const res = await fetch('/api/servicos/despesas/conferir-extrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extrato_texto: extratoTexto, date_from: dateFrom || null, date_to: dateTo || null }),
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Erro ao processar');
      }
    } catch {
      setError('Erro ao processar conferência');
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setExtratoTexto(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 print:hidden">
        <Link href="/servicos/despesas" className="p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-lg">Conferência de Extrato</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Input area */}
        {!data && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Extrato do cartão</label>
              <p className="text-xs text-gray-400 mb-2">Cole o texto do extrato ou faça upload de um arquivo TXT/CSV</p>
              <textarea
                value={extratoTexto}
                onChange={e => setExtratoTexto(e.target.value)}
                rows={10}
                placeholder="Cole aqui o extrato do cartão corporativo..."
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono resize-y"
              />
              <div className="mt-2">
                <label className="text-xs text-red-600 cursor-pointer hover:underline">
                  Ou carregar arquivo TXT/CSV
                  <input type="file" accept=".txt,.csv,.tsv" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Período de</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Até</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

            <button
              onClick={handleConferir}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analisando com IA...</>
              ) : (
                'Conferir com IA'
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-[10px] text-gray-500">Total Extrato</div>
                <div className="font-bold text-red-700">{fmt(data.totalStatement)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-[10px] text-gray-500">Total Sistema</div>
                <div className="font-bold">{fmt(data.totalSystem)}</div>
              </div>
              <div className={`bg-white rounded-lg p-3 shadow-sm ${Math.abs(data.difference) > 1 ? 'ring-2 ring-red-300' : ''}`}>
                <div className="text-[10px] text-gray-500">Diferença</div>
                <div className={`font-bold ${Math.abs(data.difference) > 1 ? 'text-red-600' : 'text-green-600'}`}>{fmt(data.difference)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-[10px] text-gray-500">Conciliados</div>
                <div className="font-bold text-green-600">{data.matched.length}/{data.transacoesExtrato}</div>
              </div>
            </div>

            {/* Matched */}
            {data.matched.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3 text-green-700">Transações Conciliadas ({data.matched.length})</h3>
                <div className="space-y-2">
                  {data.matched.map((m, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                      m.confianca === 'alta' ? 'bg-green-50' : 'bg-amber-50'
                    }`}>
                      <span className={`text-lg ${m.confianca === 'alta' ? 'text-green-500' : 'text-amber-500'}`}>
                        {m.confianca === 'alta' ? '✓' : '~'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{m.transacao.descricao}</div>
                        <div className="text-xs text-gray-500">{m.transacao.data} — {fmt(m.transacao.valor)}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-medium">{m.despesa.client_name || m.despesa.category}</div>
                        <div className="text-gray-500">{fmt(m.despesa.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched statement */}
            {data.unmatchedStatement.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3 text-red-700">No extrato, sem lançamento ({data.unmatchedStatement.length})</h3>
                <div className="space-y-1">
                  {data.unmatchedStatement.map((t, i) => (
                    <div key={i} className="flex justify-between p-2 bg-red-50 rounded text-sm">
                      <div><span className="font-medium">{t.descricao}</span> <span className="text-xs text-gray-500">{t.data}</span></div>
                      <span className="font-bold">{fmt(t.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched system */}
            {data.unmatchedSystem.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3 text-amber-700">No sistema, sem extrato ({data.unmatchedSystem.length})</h3>
                <div className="space-y-1">
                  {data.unmatchedSystem.map(s => (
                    <div key={s.id} className="flex justify-between p-2 bg-amber-50 rounded text-sm">
                      <div><span className="font-medium">{s.client_name || s.category}</span> <span className="text-xs text-gray-500">{fmtDate(s.expense_date)} — {s.technician_name}</span></div>
                      <span className="font-bold">{fmt(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setData(null); setExtratoTexto(''); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Nova Conferência
              </button>
              <button onClick={() => window.print()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Imprimir Relatório
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
