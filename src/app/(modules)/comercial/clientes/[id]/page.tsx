'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Contato {
  id: number;
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  principal?: boolean;
}

interface Oportunidade {
  id: number;
  titulo: string;
  valor_estimado?: number;
  estagio?: string;
  situacao?: string;
  created_at?: string;
}

interface Cliente {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  cnpj?: string;
  segmento?: string;
  municipio?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  status?: string;
  logradouro?: string;
  endereco?: string;
  cep?: string;
  website?: string;
  porte?: string;
  potencial?: string;
  score_credito?: number;
  observacoes?: string;
  tags?: string[];
  vendedor_nome?: string;
  vendedor_email?: string;
  contatos?: Contato[] | null;
  oportunidades?: Oportunidade[] | null;
  total_oportunidades?: number;
  valor_total_compras?: number;
  created_at?: string;
  updated_at?: string;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (!value) return 'R$ 0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

function statusBadge(status?: string) {
  const s = (status || '').toUpperCase();
  const colors: Record<string, string> = {
    ATIVO: 'bg-green-100 text-green-800',
    PROSPECTO: 'bg-blue-100 text-blue-800',
    INATIVO: 'bg-gray-100 text-gray-600',
    SUSPENSO: 'bg-yellow-100 text-yellow-800',
  };
  return colors[s] || 'bg-gray-100 text-gray-600';
}

function estagioBadge(estagio?: string) {
  const e = (estagio || '').toUpperCase();
  const colors: Record<string, string> = {
    EM_ANALISE: 'bg-blue-100 text-blue-700',
    EM_NEGOCIACAO: 'bg-yellow-100 text-yellow-700',
    POS_NEGOCIACAO: 'bg-orange-100 text-orange-700',
    FECHADA: 'bg-green-100 text-green-700',
    PERDIDA: 'bg-red-100 text-red-700',
    TESTE: 'bg-purple-100 text-purple-700',
    SUSPENSO: 'bg-gray-100 text-gray-600',
    SUBSTITUIDO: 'bg-gray-100 text-gray-600',
  };
  return colors[e] || 'bg-gray-100 text-gray-600';
}

function estagioLabel(estagio?: string) {
  const labels: Record<string, string> = {
    EM_ANALISE: 'Em Analise',
    EM_NEGOCIACAO: 'Em Negociacao',
    POS_NEGOCIACAO: 'Pos Negociacao',
    FECHADA: 'Fechada',
    PERDIDA: 'Perdida',
    TESTE: 'Teste',
    SUSPENSO: 'Suspenso',
    SUBSTITUIDO: 'Substituido',
  };
  return labels[(estagio || '').toUpperCase()] || estagio || '-';
}

export default function ClienteDetalhePage() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const { authenticated, loading: authLoading } = useAuth();

  const clienteId = params?.id;

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
  }, [authLoading, authenticated, router]);

  useEffect(() => {
    if (!clienteId || !authenticated) return;
    fetchCliente();
  }, [clienteId, authenticated]);

  const fetchCliente = async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await fetch(`/api/comercial/clientes/${clienteId}`);
      const result = await response.json();
      if (result.success) {
        setCliente(result.data);
      } else {
        setErro(result.error || 'Cliente nao encontrado');
      }
    } catch {
      setErro('Erro ao buscar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const displayName = cliente?.nome_fantasia || cliente?.razao_social || '';
  const cnpjDisplay = cliente?.cpf_cnpj || cliente?.cnpj || '-';
  const locationParts = [
    cliente?.logradouro || cliente?.endereco,
    cliente?.municipio || cliente?.cidade,
    cliente?.estado,
  ].filter(Boolean);
  const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/comercial/clientes"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              {cliente && (
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {displayName}
                  </h1>
                  {cliente.razao_social && cliente.nome_fantasia && (
                    <p className="text-xs text-gray-500 truncate hidden sm:block">
                      {cliente.razao_social}
                    </p>
                  )}
                </div>
              )}
              {!cliente && !loading && (
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Cliente</h1>
              )}
            </div>

            {cliente && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge(cliente.status)}`}
              >
                {cliente.status || 'N/A'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        )}

        {/* Error */}
        {erro && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center">
            <p className="font-medium">{erro}</p>
            <Link
              href="/comercial/clientes"
              className="inline-block mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Voltar para lista de clientes
            </Link>
          </div>
        )}

        {/* Client data */}
        {cliente && !loading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <p className="text-sm text-gray-500">Oportunidades</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cliente.total_oportunidades || 0}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <p className="text-sm text-gray-500">Valor Total Compras</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(cliente.valor_total_compras)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <p className="text-sm text-gray-500">Vendedor</p>
                <p className="text-lg font-semibold text-gray-900 truncate">
                  {cliente.vendedor_nome || 'Nao atribuido'}
                </p>
              </div>
            </div>

            {/* Client Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm text-gray-500">CNPJ/CPF</p>
                  <p className="text-sm font-medium text-gray-900">{cnpjDisplay}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Segmento</p>
                  <p className="text-sm font-medium text-gray-900">{cliente.segmento || '-'}</p>
                </div>
                {locationDisplay && (
                  <div>
                    <p className="text-sm text-gray-500">Endereco</p>
                    <p className="text-sm font-medium text-gray-900">{locationDisplay}</p>
                  </div>
                )}
                {cliente.cep && (
                  <div>
                    <p className="text-sm text-gray-500">CEP</p>
                    <p className="text-sm font-medium text-gray-900">{cliente.cep}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="text-sm font-medium text-gray-900">{cliente.telefone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {cliente.email ? (
                      <a href={`mailto:${cliente.email}`} className="text-red-600 hover:text-red-800 underline">
                        {cliente.email}
                      </a>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
                {cliente.website && (
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <p className="text-sm font-medium text-gray-900">
                      <a href={cliente.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 underline">
                        {cliente.website}
                      </a>
                    </p>
                  </div>
                )}
                {cliente.porte && (
                  <div>
                    <p className="text-sm text-gray-500">Porte</p>
                    <p className="text-sm font-medium text-gray-900">{cliente.porte}</p>
                  </div>
                )}
                {cliente.potencial && (
                  <div>
                    <p className="text-sm text-gray-500">Potencial</p>
                    <p className="text-sm font-medium text-gray-900">{cliente.potencial}</p>
                  </div>
                )}
                {cliente.score_credito != null && (
                  <div>
                    <p className="text-sm text-gray-500">Score de Credito</p>
                    <p className="text-sm font-medium text-gray-900">{cliente.score_credito}</p>
                  </div>
                )}
                {cliente.vendedor_email && (
                  <div>
                    <p className="text-sm text-gray-500">Email do Vendedor</p>
                    <p className="text-sm font-medium text-gray-900">
                      <a href={`mailto:${cliente.vendedor_email}`} className="text-red-600 hover:text-red-800 underline">
                        {cliente.vendedor_email}
                      </a>
                    </p>
                  </div>
                )}
                {cliente.created_at && (
                  <div>
                    <p className="text-sm text-gray-500">Cadastrado em</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(cliente.created_at)}</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {cliente.tags && cliente.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {cliente.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contacts Section */}
            {cliente.contatos && cliente.contatos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Contatos ({cliente.contatos.length})
                </h2>
                <div className="divide-y divide-gray-100">
                  {cliente.contatos.map((contato) => (
                    <div key={contato.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {(contato.nome || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {contato.nome}
                            {contato.principal && (
                              <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                Principal
                              </span>
                            )}
                          </p>
                          {contato.cargo && (
                            <p className="text-xs text-gray-500">{contato.cargo}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 pl-10 sm:pl-0">
                        {contato.email && (
                          <a href={`mailto:${contato.email}`} className="hover:text-red-600 truncate">
                            {contato.email}
                          </a>
                        )}
                        {contato.telefone && (
                          <span className="whitespace-nowrap">{contato.telefone}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Oportunidades
                {cliente.oportunidades && cliente.oportunidades.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({cliente.oportunidades.length})
                  </span>
                )}
              </h2>

              {(!cliente.oportunidades || cliente.oportunidades.length === 0) ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500 text-sm">Nenhuma oportunidade registrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Titulo</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium hidden sm:table-cell">Estagio</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Valor</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium hidden md:table-cell">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cliente.oportunidades.map((op) => (
                        <tr key={op.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-2">
                            <Link
                              href={`/comercial/pipeline?oportunidade=${op.id}`}
                              className="text-red-600 hover:text-red-800 font-medium hover:underline"
                            >
                              {op.titulo || `Oportunidade #${op.id}`}
                            </Link>
                          </td>
                          <td className="py-3 px-2 hidden sm:table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estagioBadge(op.estagio)}`}>
                              {estagioLabel(op.estagio)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-gray-900">
                            {formatCurrency(op.valor_estimado)}
                          </td>
                          <td className="py-3 px-2 text-gray-500 hidden md:table-cell">
                            {formatDate(op.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Observations Section */}
            {cliente.observacoes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Observacoes</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {cliente.observacoes}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
