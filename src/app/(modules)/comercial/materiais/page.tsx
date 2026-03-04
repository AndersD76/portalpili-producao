'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COMERCIAL_NAV = [
  { href: '/comercial/dashboard', label: 'Dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { href: '/comercial', label: 'Pipeline', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { href: '/comercial/clientes', label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/comercial/admin/precos', label: 'Preços', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/comercial/configurador', label: 'Orçamento', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
];

interface Material {
  id: number;
  titulo: string;
  descricao: string | null;
  categoria: string;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tamanho: number;
  arquivo_tipo: string;
  created_at: string;
}

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'CATALOGO', label: 'Catalogo' },
  { value: 'APRESENTACAO', label: 'Apresentacao' },
  { value: 'TABELA', label: 'Tabela' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function ComercialMateriaisPage() {
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const router = useRouter();
  const { authenticated, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
    fetchMateriais();
  }, [authLoading, authenticated]);

  useEffect(() => {
    if (!authLoading && authenticated) fetchMateriais();
  }, [categoriaFiltro]);

  const fetchMateriais = async () => {
    setLoading(true);
    try {
      let url = '/api/comercial/materiais';
      if (categoriaFiltro) url += `?categoria=${categoriaFiltro}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setMateriais(data.data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoriaColor = (cat: string) => {
    switch (cat) {
      case 'MANUAL': return 'bg-blue-100 text-blue-800';
      case 'FLYER': return 'bg-green-100 text-green-800';
      case 'CATALOGO': return 'bg-purple-100 text-purple-800';
      case 'APRESENTACAO': return 'bg-orange-100 text-orange-800';
      case 'TABELA': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (tipo: string) => {
    if (tipo?.includes('pdf')) return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    if (tipo?.includes('image')) return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/comercial" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Materiais de Apoio</h1>
            </div>
            <div className="flex items-center gap-1">
              {COMERCIAL_NAV.map(nav => (
                <Link key={nav.href} href={nav.href} className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={nav.icon} /></svg>
                  {nav.label}
                </Link>
              ))}
              <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition" title="Sair">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
        >
          {CATEGORIAS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materiais.map((mat) => (
          <div key={mat.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500 hover:shadow-md transition">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(mat.arquivo_tipo)} />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{mat.titulo}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${getCategoriaColor(mat.categoria)}`}>
                  {CATEGORIAS.find(c => c.value === mat.categoria)?.label || mat.categoria}
                </span>
              </div>
            </div>
            {mat.descricao && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{mat.descricao}</p>}
            <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
              <span className="truncate">{mat.arquivo_nome}</span>
              <span className="flex-shrink-0 ml-2">{formatFileSize(mat.arquivo_tamanho)}</span>
            </div>
            <a
              href={mat.arquivo_url}
              download={mat.arquivo_nome}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        ))}

        {materiais.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p>Nenhum material disponivel</p>
            <p className="text-sm mt-1">Materiais sao adicionados pelo administrador</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
