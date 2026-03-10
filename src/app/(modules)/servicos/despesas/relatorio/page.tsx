'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { EXPENSE_LIMITS } from '@/lib/servicos/constants';

interface ReportData {
  expenses: Array<{
    id: number; technician_name: string; client_name: string; category: string;
    amount: number; expense_date: string; location: string; osv_number: string;
    nf_number: string; payment_method: string; vehicle_description: string;
    vehicle_km: number; fuel_liters: number;
  }>;
  grandTotal: number;
  totalCount: number;
  byCategory: Array<{ category: string; qty: string; total: string }>;
  byTechnician: Array<{ technician_name: string; category: string; qty: string; total: string }>;
  byLocation: Array<{ location: string; qty: string; total: string }>;
  fuel: Array<{ technician_name: string; vehicle_description: string; km_min: number; km_max: number; total_liters: string; total_fuel: string }>;
  meals: Array<{ technician_name: string; qty: string; avg_amount: string; total: string }>;
  filters: { dateFrom: string; dateTo: string; technician: string; osv: string; client: string; category: string };
}

export default function RelatorioPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [technician, setTechnician] = useState('');
  const [osv, setOsv] = useState('');
  const [technicians, setTechnicians] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/servicos/despesas/filtros')
      .then(r => r.json())
      .then(res => { if (res.success) setTechnicians(res.data.technicians || []); })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (technician) params.set('technician', technician);
    if (osv) params.set('osv', osv);

    try {
      const res = await fetch(`/api/servicos/despesas/relatorio?${params}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handlePrint = () => window.print();

  const fmt = (v: number | string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  // Group technician data
  const techData: Record<string, Array<{ category: string; qty: string; total: string }>> = {};
  if (data) {
    for (const r of data.byTechnician) {
      if (!techData[r.technician_name]) techData[r.technician_name] = [];
      techData[r.technician_name].push(r);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - hidden on print */}
      <div className="bg-blue-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/servicos/despesas" className="p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-lg">Relatório de Despesas</h1>
        </div>
        {data && (
          <button onClick={handlePrint} className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir
          </button>
        )}
      </div>

      {/* Filters - hidden on print */}
      <div className="bg-white border-b px-4 py-4 print:hidden">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1.5 border rounded text-sm" placeholder="De" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1.5 border rounded text-sm" placeholder="Até" />
          <select value={technician} onChange={e => setTechnician(e.target.value)} className="px-2 py-1.5 border rounded text-sm">
            <option value="">Todos técnicos</option>
            {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <input type="text" value={osv} onChange={e => setOsv(e.target.value)} className="px-2 py-1.5 border rounded text-sm" placeholder="OSV..." />
          <button onClick={generate} disabled={loading}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* Report content */}
      {data && (
        <div ref={printRef} className="max-w-4xl mx-auto px-4 py-6 print:max-w-none print:px-8">
          {/* Print header */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold text-center">PILI TECH — Relatório de Despesas de Campo</h1>
            <p className="text-center text-sm text-gray-500 mt-1">
              Período: {dateFrom ? fmtDate(dateFrom) : 'Início'} a {dateTo ? fmtDate(dateTo) : 'Atual'}
              {technician && ` — Técnico: ${technician}`}
              {osv && ` — OSV: ${osv}`}
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm print:border">
              <div className="text-xs text-gray-500">Total Geral</div>
              <div className="text-xl font-bold text-blue-700">{fmt(data.grandTotal)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm print:border">
              <div className="text-xs text-gray-500">Lançamentos</div>
              <div className="text-xl font-bold">{data.totalCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm print:border">
              <div className="text-xs text-gray-500">Técnicos</div>
              <div className="text-xl font-bold">{Object.keys(techData).length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm print:border">
              <div className="text-xs text-gray-500">Ticket Médio</div>
              <div className="text-xl font-bold">{data.totalCount > 0 ? fmt(data.grandTotal / data.totalCount) : '-'}</div>
            </div>
          </div>

          {/* By category */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 print:border">
            <h3 className="font-bold text-sm mb-3">Por Categoria</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="pb-1">Categoria</th><th className="pb-1 text-right">Qtd</th><th className="pb-1 text-right">Total</th><th className="pb-1 text-right">%</th></tr></thead>
              <tbody>
                {data.byCategory.map(r => (
                  <tr key={r.category} className="border-b">
                    <td className="py-1">{r.category}</td>
                    <td className="py-1 text-right">{r.qty}</td>
                    <td className="py-1 text-right font-medium">{fmt(r.total)}</td>
                    <td className="py-1 text-right text-gray-400">{data.grandTotal > 0 ? ((Number(r.total) / data.grandTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* By technician detail */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 print:border">
            <h3 className="font-bold text-sm mb-3">Por Técnico</h3>
            {Object.entries(techData).map(([name, rows]) => {
              const techTotal = rows.reduce((s, r) => s + Number(r.total), 0);
              return (
                <div key={name} className="mb-4">
                  <div className="flex justify-between items-center border-b pb-1 mb-1">
                    <span className="font-medium text-sm">{name}</span>
                    <span className="font-bold">{fmt(techTotal)}</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {rows.map(r => {
                        const limit = EXPENSE_LIMITS[r.category] || 999999;
                        const avgPerItem = Number(r.total) / Number(r.qty);
                        const overLimit = avgPerItem > limit;
                        return (
                          <tr key={r.category} className={overLimit ? 'text-red-600 font-medium' : ''}>
                            <td className="py-0.5 pl-4">{r.category}</td>
                            <td className="py-0.5 text-right">{r.qty}x</td>
                            <td className="py-0.5 text-right">{fmt(r.total)}</td>
                            <td className="py-0.5 text-right text-[10px]">
                              {overLimit && `Média ${fmt(avgPerItem)} > ${fmt(limit)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* By location */}
          {data.byLocation.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 print:border">
              <h3 className="font-bold text-sm mb-3">Por Localidade</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-1">Local</th><th className="pb-1 text-right">Qtd</th><th className="pb-1 text-right">Total</th></tr></thead>
                <tbody>
                  {data.byLocation.map(r => (
                    <tr key={r.location} className="border-b"><td className="py-1">{r.location}</td><td className="py-1 text-right">{r.qty}</td><td className="py-1 text-right font-medium">{fmt(r.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fuel / Logistics */}
          {data.fuel.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 print:border">
              <h3 className="font-bold text-sm mb-3">Logística (Combustível)</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-1">Técnico</th><th className="pb-1">Veículo</th><th className="pb-1 text-right">KM Ini.</th><th className="pb-1 text-right">KM Fin.</th><th className="pb-1 text-right">Dist.</th><th className="pb-1 text-right">Litros</th><th className="pb-1 text-right">Total</th><th className="pb-1 text-right">R$/km</th></tr></thead>
                <tbody>
                  {data.fuel.map((r, i) => {
                    const dist = r.km_max - r.km_min;
                    const costPerKm = dist > 0 ? Number(r.total_fuel) / dist : 0;
                    return (
                      <tr key={i} className="border-b">
                        <td className="py-1 text-xs">{r.technician_name}</td>
                        <td className="py-1 text-xs">{r.vehicle_description || '-'}</td>
                        <td className="py-1 text-right">{r.km_min?.toLocaleString() || '-'}</td>
                        <td className="py-1 text-right">{r.km_max?.toLocaleString() || '-'}</td>
                        <td className="py-1 text-right">{dist > 0 ? dist.toLocaleString() + ' km' : '-'}</td>
                        <td className="py-1 text-right">{Number(r.total_liters).toFixed(1)}L</td>
                        <td className="py-1 text-right font-medium">{fmt(r.total_fuel)}</td>
                        <td className="py-1 text-right">{costPerKm > 0 ? fmt(costPerKm) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Meals */}
          {data.meals.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 print:border">
              <h3 className="font-bold text-sm mb-3">Alimentação (Ticket Médio)</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-1">Técnico</th><th className="pb-1 text-right">Qtd</th><th className="pb-1 text-right">Média</th><th className="pb-1 text-right">Total</th></tr></thead>
                <tbody>
                  {data.meals.map(r => (
                    <tr key={r.technician_name} className="border-b">
                      <td className="py-1">{r.technician_name}</td>
                      <td className="py-1 text-right">{r.qty}</td>
                      <td className="py-1 text-right">{fmt(r.avg_amount)}</td>
                      <td className="py-1 text-right font-medium">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature block - print only */}
          <div className="hidden print:block mt-12 pt-8">
            <div className="grid grid-cols-2 gap-16">
              <div className="text-center">
                <div className="border-t border-black pt-2 text-sm">Responsável</div>
              </div>
              <div className="text-center">
                <div className="border-t border-black pt-2 text-sm">Gerência</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400 print:hidden">
          <p>Selecione os filtros acima e clique em &quot;Gerar Relatório&quot;</p>
        </div>
      )}
    </div>
  );
}
