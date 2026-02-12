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
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(toNum(v));

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
              {[
                { href: '/comercial', label: 'Pipeline' },
                { href: '/comercial/pipeline', label: 'Kanban' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="hidden sm:inline-block px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                  {link.label}
                </Link>
              ))}
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
      <div className="p-2 sm:p-3">
        {listaFiltrada.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Nenhum cliente encontrado</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            {/* Table header */}
            <div className={`grid gap-1 px-2 sm:px-3 py-2 bg-gray-50 border-b text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide ${
              isAdmin
                ? 'grid-cols-[1fr_80px_60px_60px] sm:grid-cols-[1fr_120px_80px_80px_80px] lg:grid-cols-[120px_minmax(0,3fr)_minmax(0,1fr)_80px_minmax(0,2fr)_60px_80px_72px]'
                : 'grid-cols-[1fr_80px_60px_60px] sm:grid-cols-[1fr_120px_80px_80px] lg:grid-cols-[120px_minmax(0,3fr)_minmax(0,1fr)_80px_60px_80px_72px]'
            }`}>
              <span className="hidden lg:block">CNPJ</span>
              <span>Nome</span>
              <span className="hidden sm:block">Cidade/UF</span>
              <span className="text-right">Valor</span>
              {isAdmin && <span className="hidden lg:block">Vendedor</span>}
              <span className="text-center">Oport.</span>
              <span className="hidden sm:block text-center">Segmento</span>
              <span className="text-center">Status</span>
            </div>
            {/* Rows */}
            {listaFiltrada.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => router.push(`/comercial/clientes/${c.id}`)}
                className={`grid gap-1 px-2 sm:px-3 py-1.5 border-b last:border-b-0 hover:bg-blue-50/60 transition cursor-pointer items-center ${
                  isAdmin
                    ? 'grid-cols-[1fr_80px_60px_60px] sm:grid-cols-[1fr_120px_80px_80px_80px] lg:grid-cols-[120px_minmax(0,3fr)_minmax(0,1fr)_80px_minmax(0,2fr)_60px_80px_72px]'
                    : 'grid-cols-[1fr_80px_60px_60px] sm:grid-cols-[1fr_120px_80px_80px] lg:grid-cols-[120px_minmax(0,3fr)_minmax(0,1fr)_80px_60px_80px_72px]'
                } ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}
              >
                {/* CNPJ */}
                <div className="hidden lg:block text-[11px] text-gray-400 font-mono tabular-nums truncate">
                  {fmtCnpj(c.cpf_cnpj)}
                </div>
                {/* Nome */}
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                    {c.nome_fantasia || c.razao_social}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate lg:hidden">{fmtCnpj(c.cpf_cnpj)}</div>
                </div>
                {/* Cidade/UF */}
                <div className="hidden sm:block text-xs text-gray-500 truncate">
                  {c.municipio ? `${c.municipio}/${c.estado || ''}` : c.estado || '-'}
                </div>
                {/* Valor */}
                <div className="text-right font-bold text-xs text-gray-800 tabular-nums">
                  {fmtCurrency(c.valor_total_compras)}
                </div>
                {/* Vendedor - admin only */}
                {isAdmin && (
                  <div className="hidden lg:block text-xs text-gray-500 truncate" title={c.vendedor_nome || ''}>
                    {c.vendedor_nome || '-'}
                  </div>
                )}
                {/* Oportunidades */}
                <div className="text-center text-xs text-gray-600 tabular-nums">
                  {toNum(c.total_oportunidades)}
                </div>
                {/* Segmento */}
                <div className="hidden sm:block text-center text-[10px] text-gray-400 truncate">
                  {c.segmento || '-'}
                </div>
                {/* Status */}
                <div className="text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor[c.status || ''] || 'bg-gray-100 text-gray-500'}`}>
                    {c.status || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
