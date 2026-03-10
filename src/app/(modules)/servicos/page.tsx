'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FieldExpense } from '@/lib/servicos/types';

export default function ServicosPage() {
  const [recentes, setRecentes] = useState<FieldExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/servicos/despesas?limit=5')
      .then(r => r.json())
      .then(res => {
        if (res.success) setRecentes(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-red-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Serviços</h1>
            <p className="text-red-200 text-sm mt-1">Gestão de Despesas de Campo</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Main CTA - Camera button */}
        <Link
          href="/servicos/despesas/nova"
          className="block bg-red-600 hover:bg-red-700 text-white rounded-2xl p-6 text-center shadow-lg transition-all active:scale-[0.98]"
        >
          <div className="text-4xl mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold">REGISTRAR DESPESA</span>
          <p className="text-red-200 text-sm mt-1">
            Abra a câmera e fotografe o comprovante
          </p>
        </Link>

        {/* Recent expenses */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Últimas despesas
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : recentes.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Nenhuma despesa registrada ainda</p>
              <p className="text-sm mt-1">Fotografe seu primeiro comprovante!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentes.map(d => (
                <div key={d.id} className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-sm">
                  {d.receipt_image_url ? (
                    <img src={d.receipt_image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs">
                      sem foto
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {d.client_name || d.category}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{formatDate(d.expense_date)}</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                        {d.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-gray-900">{formatCurrency(Number(d.amount))}</div>
                    <div className={`text-[10px] px-1.5 py-0.5 rounded ${
                      d.status === 'validado' ? 'bg-green-100 text-green-700' :
                      d.status === 'rejeitado' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {d.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick access */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/servicos/despesas"
              className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow transition-shadow"
            >
              <svg className="w-6 h-6 mx-auto mb-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Despesas</span>
            </Link>
            <Link
              href="/servicos/autorizacoes"
              className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow transition-shadow"
            >
              <svg className="w-6 h-6 mx-auto mb-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Autorizações</span>
            </Link>
            <Link
              href="/servicos/despesas/relatorio"
              className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow transition-shadow"
            >
              <svg className="w-6 h-6 mx-auto mb-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Relatórios</span>
            </Link>
            <Link
              href="/servicos/despesas/conferencia"
              className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow transition-shadow"
            >
              <svg className="w-6 h-6 mx-auto mb-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Conferência</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
