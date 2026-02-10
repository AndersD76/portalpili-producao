'use client';

import Link from 'next/link';

interface OportunidadeCardProps {
  oportunidade: {
    id: number;
    titulo: string;
    cliente_nome: string;
    cliente_fantasia?: string;
    vendedor_nome?: string;
    produto: string;
    valor_estimado: number;
    probabilidade: number;
    estagio: string;
    status: string;
    data_previsao_fechamento?: string;
    total_atividades?: number;
    atividades_atrasadas?: number;
    ultimo_contato?: string;
    ultimo_contato_desc?: string;
    dias_no_estagio?: number;
    created_at: string;
  };
  onMove?: (novoEstagio: string) => void;
  onClick?: () => void;
  draggable?: boolean;
}

export default function OportunidadeCard({
  oportunidade,
  onMove,
  onClick,
  draggable = false,
}: OportunidadeCardProps) {
  const toNum = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return isNaN(n) ? 0 : n;
  };

  const formatCurrency = (value: unknown) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(toNum(value));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getProdutoIcon = (tipo: string) => {
    if (tipo === 'TOMBADOR') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  };

  const getProbabilidadeColor = (prob: number) => {
    if (prob >= 70) return 'bg-green-500';
    if (prob >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABERTA': return 'text-blue-600';
      case 'GANHA': return 'text-green-600';
      case 'PERDIDA': return 'text-red-600';
      case 'CANCELADA': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const diasParaFechamento = () => {
    if (!oportunidade.data_previsao_fechamento) return null;
    const hoje = new Date();
    const previsao = new Date(oportunidade.data_previsao_fechamento);
    const diff = Math.ceil((previsao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const diasRestantes = diasParaFechamento();

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
      onClick={onClick}
      draggable={draggable}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-red-600">{getProdutoIcon(oportunidade.produto)}</span>
          <span className="text-xs font-medium text-gray-500">{oportunidade.produto}</span>
        </div>
        <span className={`text-xs font-semibold ${getStatusColor(oportunidade.status)}`}>
          {oportunidade.status}
        </span>
      </div>

      {/* Título */}
      <h4 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">
        {oportunidade.titulo}
      </h4>

      {/* Cliente */}
      <p className="text-xs text-gray-600 mb-2 truncate">
        {oportunidade.cliente_fantasia || oportunidade.cliente_nome}
      </p>

      {/* Valor e Probabilidade */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-green-600 text-sm">
          {formatCurrency(oportunidade.valor_estimado)}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${getProbabilidadeColor(oportunidade.probabilidade)}`}
              style={{ width: `${oportunidade.probabilidade}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{oportunidade.probabilidade}%</span>
        </div>
      </div>

      {/* Alertas e Atividades */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {oportunidade.total_atividades && oportunidade.total_atividades > 0 && (
          <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {oportunidade.total_atividades}
          </span>
        )}
        {oportunidade.atividades_atrasadas && oportunidade.atividades_atrasadas > 0 && (
          <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {oportunidade.atividades_atrasadas}
          </span>
        )}
        {diasRestantes !== null && diasRestantes <= 7 && diasRestantes >= 0 && (
          <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {diasRestantes}d
          </span>
        )}
        {diasRestantes !== null && diasRestantes < 0 && (
          <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            Vencida
          </span>
        )}
      </div>

      {/* Data previsão */}
      {oportunidade.data_previsao_fechamento && (
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Prev: {formatDate(oportunidade.data_previsao_fechamento)}</span>
        </div>
      )}

      {/* Último Contato */}
      {oportunidade.ultimo_contato && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{formatDate(oportunidade.ultimo_contato)}</span>
          </div>
          {oportunidade.ultimo_contato_desc && (
            <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 pl-4">
              {oportunidade.ultimo_contato_desc}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-gray-400">
        <span className="truncate">{oportunidade.vendedor_nome}</span>
        <div className="flex items-center gap-2">
          {oportunidade.dias_no_estagio !== undefined && oportunidade.dias_no_estagio !== null && (
            <span className="text-gray-300">{toNum(oportunidade.dias_no_estagio)}d</span>
          )}
          <span>{formatDate(oportunidade.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
