'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Cliente {
  id: number;
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  segmento?: string;
  municipio?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  status?: string;
  potencial?: string;
  score_credito?: number;
  total_oportunidades?: number;
  valor_total_compras?: number;
  vendedor_nome?: string;
}

interface Vendedor {
  id: number;
  nome: string;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

export default function ClientesPage() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroSegmento, setFiltroSegmento] = useState<string>('');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenacao, setOrdenacao] = useState<string>('nome');
  const router = useRouter();
  const { user, authenticated, loading: authLoading, isAdmin, podeExecutarAcao } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
  }, [authLoading, authenticated, router]);

  useEffect(() => {
    if (!user) return;
    fetchClientes();
    if (isAdmin) fetchVendedores();
  }, [user, isAdmin]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '500');
      const response = await fetch(`/api/comercial/clientes?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setClientes(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
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

  const fmtCurrency = (v: unknown) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(v));

  const fmtCnpj = (cnpj: string) => {
    if (!cnpj) return '-';
    const c = cnpj.replace(/\D/g, '');
    if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return cnpj;
  };

  const listaFiltrada = useMemo(() => {
    let lista = [...clientes];
    if (filtroStatus) lista = lista.filter(c => c.status === filtroStatus);
    if (filtroSegmento) lista = lista.filter(c => c.segmento === filtroSegmento);
    if (filtroVendedor) lista = lista.filter(c => c.vendedor_nome === filtroVendedor);
    if (searchTerm) {
      const b = searchTerm.toLowerCase();
      lista = lista.filter(c =>
        (c.razao_social || '').toLowerCase().includes(b) ||
        (c.nome_fantasia || '').toLowerCase().includes(b) ||
        (c.cpf_cnpj || '').includes(b) ||
        (c.municipio || '').toLowerCase().includes(b)
      );
    }
    if (ordenacao === 'nome') lista.sort((a, b) => (a.razao_social || '').localeCompare(b.razao_social || ''));
    else if (ordenacao === 'valor') lista.sort((a, b) => toNum(b.valor_total_compras) - toNum(a.valor_total_compras));
    else if (ordenacao === 'oportunidades') lista.sort((a, b) => toNum(b.total_oportunidades) - toNum(a.total_oportunidades));
    return lista;
  }, [clientes, filtroStatus, filtroSegmento, filtroVendedor, searchTerm, ordenacao]);

  const resumo = useMemo(() => ({
    total: listaFiltrada.length,
    ativos: listaFiltrada.filter(c => c.status === 'ATIVO').length,
    prospectos: listaFiltrada.filter(c => c.status === 'PROSPECTO').length,
    valorTotal: listaFiltrada.reduce((s, c) => s + toNum(c.valor_total_compras), 0),
  }), [listaFiltrada]);

  const segmentos = useMemo(() => {
    const set = new Set(clientes.map(c => c.segmento).filter(Boolean));
    return Array.from(set).sort();
  }, [clientes]);

  const vendedoresUnicos = useMemo(() => {
    const set = new Set(clientes.map(c => c.vendedor_nome).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [clientes]);

  const statusColor: Record<string, string> = {
    ATIVO: 'bg-green-100 text-green-700',
    PROSPECTO: 'bg-blue-100 text-blue-700',
    INATIVO: 'bg-gray-100 text-gray-500',
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/comercial" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Clientes</h1>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/comercial/dashboard" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                Dashboard
              </Link>
              <Link href="/comercial" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                Pipeline
              </Link>
              <Link href="/comercial/pipeline" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                Kanban
              </Link>
              {podeExecutarAcao('COMERCIAL', 'criar') && (
                <Link href="/comercial/clientes/novo"
                  className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs sm:text-sm font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Novo</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* RESUMO + FILTROS */}
      <div className="bg-white border-b px-2 sm:px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          {/* KPIs */}
          <span><strong className="text-gray-900">{resumo.total}</strong> <span className="text-gray-400 hidden sm:inline">clientes</span></span>
          <span><strong className="text-green-600">{resumo.ativos}</strong> <span className="text-gray-400 hidden sm:inline">ativos</span></span>
          <span><strong className="text-blue-600">{resumo.prospectos}</strong> <span className="text-gray-400 hidden sm:inline">prospectos</span></span>
          <span><strong className="text-gray-700">{fmtCurrency(resumo.valorTotal)}</strong> <span className="text-gray-400 hidden sm:inline">total</span></span>

          <span className="hidden md:inline text-gray-200">|</span>

          {/* Filters */}
          {isAdmin && (
            <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
              className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
              <option value="">Vendedores</option>
              {vendedoresUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="">Status</option>
            <option value="ATIVO">Ativos</option>
            <option value="PROSPECTO">Prospectos</option>
            <option value="INATIVO">Inativos</option>
          </select>
          <select value={filtroSegmento} onChange={e => setFiltroSegmento(e.target.value)}
            className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="">Segmento</option>
            {segmentos.map(s => <option key={s} value={s!}>{s}</option>)}
          </select>
          <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)}
            className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="nome">Nome</option>
            <option value="valor">Valor</option>
            <option value="oportunidades">Oport.</option>
          </select>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm w-28 sm:w-40 text-gray-600 focus:ring-1 focus:ring-red-500" />
        </div>
      </div>

      {/* TABLE */}
      <div className="p-2 sm:p-3 max-w-[1400px]">
        {listaFiltrada.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Nenhum cliente encontrado</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-2 py-2 text-left w-[130px] hidden lg:table-cell">CNPJ</th>
                  <th className="px-2 py-2 text-left w-[40%]">Nome</th>
                  <th className="px-2 py-2 text-left w-[120px] hidden sm:table-cell">Cidade/UF</th>
                  <th className="px-2 py-2 text-right w-[100px]">Valor</th>
                  {isAdmin && <th className="px-2 py-2 text-left w-[140px] hidden lg:table-cell">Vendedor</th>}
                  <th className="px-2 py-2 text-center w-[50px]">Oport.</th>
                  <th className="px-2 py-2 text-center w-[80px] hidden sm:table-cell">Segmento</th>
                  <th className="px-2 py-2 text-center w-[65px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((c, idx) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/comercial/clientes/${c.id}`)}
                    className={`border-b last:border-b-0 hover:bg-blue-50/60 transition cursor-pointer ${
                      idx % 2 === 1 ? 'bg-gray-50/60' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5 text-[11px] text-gray-400 font-mono tabular-nums hidden lg:table-cell">
                      <span className="block truncate">{fmtCnpj(c.cpf_cnpj)}</span>
                    </td>
                    <td className="px-2 py-1.5 max-w-0">
                      <div className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                        {c.nome_fantasia || c.razao_social}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate lg:hidden">{fmtCnpj(c.cpf_cnpj)}</div>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-500 hidden sm:table-cell">
                      <span className="block truncate">{c.municipio ? `${c.municipio}/${c.estado || ''}` : c.estado || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-xs text-gray-800 tabular-nums whitespace-nowrap">
                      {fmtCurrency(c.valor_total_compras)}
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-1.5 text-xs text-gray-500 hidden lg:table-cell">
                        <span className="block truncate" title={c.vendedor_nome || ''}>{c.vendedor_nome || '-'}</span>
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600 tabular-nums">
                      {toNum(c.total_oportunidades)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-gray-400 hidden sm:table-cell">
                      <span className="block truncate">{c.segmento || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor[c.status || ''] || 'bg-gray-100 text-gray-500'}`}>
                        {c.status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
