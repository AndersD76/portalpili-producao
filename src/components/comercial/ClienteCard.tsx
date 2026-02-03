'use client';

import Link from 'next/link';
import { formatarCNPJ } from '@/lib/utils/format';

interface ClienteCardProps {
  cliente: {
    id: number;
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    segmento?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    email?: string;
    status?: string;
    potencial?: string;
    score_credito?: number;
    total_oportunidades?: number;
    valor_total_compras?: number;
    vendedor_nome?: string;
  };
  onClick?: () => void;
}

export default function ClienteCard({ cliente, onClick }: ClienteCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ATIVO': return 'bg-green-500';
      case 'PROSPECTO': return 'bg-blue-500';
      case 'INATIVO': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getPotencialColor = (potencial?: string) => {
    switch (potencial) {
      case 'ALTO': return 'text-green-600 bg-green-100';
      case 'MEDIO': return 'text-yellow-600 bg-yellow-100';
      case 'BAIXO': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300 border-l-4 border-red-600 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-800 truncate">
            {cliente.nome_fantasia || cliente.razao_social}
          </h3>
          <p className="text-xs text-gray-500">{formatarCNPJ(cliente.cnpj)}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {cliente.potencial && (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPotencialColor(cliente.potencial)}`}>
              {cliente.potencial}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${getStatusColor(cliente.status)}`}>
            {cliente.status || 'PROSPECTO'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase">Segmento</p>
          <p className="font-medium text-gray-700 truncate">{cliente.segmento || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Localização</p>
          <p className="font-medium text-gray-700 truncate">
            {cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : '-'}
          </p>
        </div>
      </div>

      {(cliente.telefone || cliente.email) && (
        <div className="border-t pt-2 mb-3">
          <div className="flex flex-wrap gap-3 text-sm">
            {cliente.telefone && (
              <a
                href={`tel:${cliente.telefone}`}
                className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="truncate max-w-[120px]">{cliente.telefone}</span>
              </a>
            )}
            {cliente.email && (
              <a
                href={`mailto:${cliente.email}`}
                className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate max-w-[150px]">{cliente.email}</span>
              </a>
            )}
          </div>
        </div>
      )}

      <div className="border-t pt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500">Oportunidades</p>
          <p className="font-bold text-gray-800">{cliente.total_oportunidades || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Compras</p>
          <p className="font-bold text-green-600">{formatCurrency(cliente.valor_total_compras)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Score</p>
          <p className="font-bold text-blue-600">{cliente.score_credito || '-'}</p>
        </div>
      </div>

      {cliente.vendedor_nome && (
        <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-gray-500">
          <span>Vendedor: {cliente.vendedor_nome}</span>
          <Link
            href={`/comercial/clientes/${cliente.id}`}
            className="text-red-600 hover:text-red-700 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalhes →
          </Link>
        </div>
      )}
    </div>
  );
}
