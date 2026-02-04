'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Atividade {
  id: number;
  oportunidade_id: number;
  tipo: string;
  titulo: string;
  descricao: string;
  data_limite: string;
  responsavel_id: number;
  responsavel_nome: string;
  concluida: boolean;
  data_conclusao: string | null;
  oportunidade_titulo: string;
  oportunidade_estagio: string;
  cliente_nome: string;
  created_at: string;
}

interface Totais {
  pendentes: number;
  concluidas: number;
  atrasadas: number;
  proxima_semana: number;
}

const TIPOS_ATIVIDADE: Record<string, { label: string; cor: string; icone: string }> = {
  LIGACAO: { label: 'Ligação', cor: 'bg-blue-100 text-blue-800', icone: '📞' },
  EMAIL: { label: 'E-mail', cor: 'bg-purple-100 text-purple-800', icone: '✉️' },
  REUNIAO: { label: 'Reunião', cor: 'bg-green-100 text-green-800', icone: '👥' },
  VISITA: { label: 'Visita', cor: 'bg-orange-100 text-orange-800', icone: '🚗' },
  PROPOSTA: { label: 'Proposta', cor: 'bg-pink-100 text-pink-800', icone: '📄' },
  FOLLOW_UP: { label: 'Follow-up', cor: 'bg-yellow-100 text-yellow-800', icone: '🔔' },
  OUTRO: { label: 'Outro', cor: 'bg-gray-100 text-gray-800', icone: '📌' },
};

function AtividadesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [totais, setTotais] = useState<Totais>({ pendentes: 0, concluidas: 0, atrasadas: 0, proxima_semana: 0 });
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'atrasadas' | 'concluidas'>(
    searchParams.get('atrasadas') === 'true' ? 'atrasadas' : 'pendentes'
  );
  const [user, setUser] = useState<{ id: number; nome: string } | null>(null);

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    const userData = localStorage.getItem('user_data');

    if (authenticated !== 'true' || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchAtividades();
    }
  }, [user, filtro]);

  const fetchAtividades = async () => {
    try {
      const params = new URLSearchParams();

      // Filtrar por vendedor (usuário logado)
      if (user?.id) {
        params.append('responsavel_id', user.id.toString());
      }

      if (filtro === 'pendentes') {
        params.append('concluida', 'false');
      } else if (filtro === 'atrasadas') {
        params.append('atrasadas', 'true');
      } else if (filtro === 'concluidas') {
        params.append('concluida', 'true');
      }

      const response = await fetch(`/api/comercial/atividades?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAtividades(data.data || []);
        setTotais(data.totais || { pendentes: 0, concluidas: 0, atrasadas: 0, proxima_semana: 0 });
      }
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConcluir = async (id: number) => {
    try {
      const response = await fetch(`/api/comercial/atividades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: true, data_conclusao: new Date().toISOString() })
      });

      if (response.ok) {
        fetchAtividades();
      }
    } catch (error) {
      console.error('Erro ao concluir atividade:', error);
    }
  };

  const handleReabrir = async (id: number) => {
    try {
      const response = await fetch(`/api/comercial/atividades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: false, data_conclusao: null })
      });

      if (response.ok) {
        fetchAtividades();
      }
    } catch (error) {
      console.error('Erro ao reabrir atividade:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const isAtrasada = (atividade: Atividade) => {
    if (atividade.concluida) return false;
    return new Date(atividade.data_limite) < new Date();
  };

  const isProximaSemana = (atividade: Atividade) => {
    if (atividade.concluida) return false;
    const hoje = new Date();
    const limite = new Date(atividade.data_limite);
    const proximaSemana = new Date();
    proximaSemana.setDate(hoje.getDate() + 7);
    return limite >= hoje && limite <= proximaSemana;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando atividades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/comercial"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar ao Comercial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Atividades</h1>
                {user && <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>}
              </div>
            </div>

            <Link
              href="/comercial/atividades/nova"
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Atividade
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-gray-900">{totais.pendentes}</div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-red-600">{totais.atrasadas}</div>
            <div className="text-sm text-gray-500">Atrasadas</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-orange-600">{totais.proxima_semana}</div>
            <div className="text-sm text-gray-500">Próx. Semana</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">{totais.concluidas}</div>
            <div className="text-sm text-gray-500">Concluídas</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'pendentes', label: 'Pendentes' },
              { key: 'atrasadas', label: 'Atrasadas' },
              { key: 'concluidas', label: 'Concluídas' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key as typeof filtro)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filtro === f.key
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Atividades */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {atividades.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-500">Nenhuma atividade encontrada</p>
              <Link
                href="/comercial/atividades/nova"
                className="inline-block mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
              >
                Criar Primeira Atividade
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {atividades.map((atividade) => {
                const tipoInfo = TIPOS_ATIVIDADE[atividade.tipo] || TIPOS_ATIVIDADE.OUTRO;
                const atrasada = isAtrasada(atividade);
                const proximaSemana = isProximaSemana(atividade);

                return (
                  <div
                    key={atividade.id}
                    className={`p-4 hover:bg-gray-50 transition ${
                      atividade.concluida ? 'opacity-60' : ''
                    } ${atrasada ? 'bg-red-50' : proximaSemana ? 'bg-yellow-50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox para concluir */}
                      <button
                        onClick={() => atividade.concluida ? handleReabrir(atividade.id) : handleConcluir(atividade.id)}
                        className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                          atividade.concluida
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {atividade.concluida && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Conteúdo */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{tipoInfo.icone}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoInfo.cor}`}>
                            {tipoInfo.label}
                          </span>
                          {atrasada && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              Atrasada
                            </span>
                          )}
                          {proximaSemana && !atrasada && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              Esta semana
                            </span>
                          )}
                        </div>
                        <h3 className={`font-medium text-gray-900 ${atividade.concluida ? 'line-through' : ''}`}>
                          {atividade.titulo}
                        </h3>
                        {atividade.descricao && (
                          <p className="text-sm text-gray-600 mt-1">{atividade.descricao}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(atividade.data_limite)}
                          </span>
                          {atividade.cliente_nome && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {atividade.cliente_nome}
                            </span>
                          )}
                          {atividade.oportunidade_titulo && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {atividade.oportunidade_titulo}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/comercial/atividades/${atividade.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="Ver Detalhes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AtividadesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando atividades...</p>
        </div>
      </div>
    }>
      <AtividadesContent />
    </Suspense>
  );
}
