import { OPD } from '@/types/opd';
import Link from 'next/link';

interface OPDCardProps {
  opd: OPD;
}

export default function OPDCard({ opd }: OPDCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Progresso baseado nas atividades concluídas, não no tempo decorrido
  const progress = opd.percentual_conclusao || 0;

  // Verificar se há atualizações recentes (últimas 24 horas)
  const hasRecentUpdates = () => {
    if (!opd.updated) return false;
    const updateDate = new Date(opd.updated);
    const now = new Date();
    const diffHours = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  // Calcular dias até a entrega
  const getDaysUntilDelivery = () => {
    if (!opd.data_entrega) return null;
    const deliveryDate = new Date(opd.data_entrega);
    const now = new Date();
    const diffTime = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDelivery = getDaysUntilDelivery();
  const isNearDelivery = daysUntilDelivery !== null && daysUntilDelivery <= 30 && daysUntilDelivery > 0;
  const isOverdue = daysUntilDelivery !== null && daysUntilDelivery < 0;

  const getStatusColor = () => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress > 0) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (progress >= 100) return 'Concluído';
    if (progress >= 50) return 'Em Andamento';
    if (progress > 0) return 'Iniciado';
    return 'Pendente';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border-t-4 border-red-600 relative">
      {/* Alertas de entrega */}
      {isOverdue && (
        <div className="absolute -top-3 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>ATRASADO</span>
        </div>
      )}
      {!isOverdue && isNearDelivery && (
        <div className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{daysUntilDelivery} DIAS RESTANTES</span>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-800">OPD {opd.numero}</h2>
            {/* Sininho de notificação para atualizações recentes */}
            {hasRecentUpdates() && (
              <div className="relative" title="Atualizado recentemente">
                <svg className="w-6 h-6 text-red-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {opd.cliente && (
              <div className="inline-flex items-center px-3 py-1.5 bg-blue-100 border-2 border-blue-400 rounded-md">
                <svg className="w-4 h-4 mr-1.5 text-blue-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-semibold text-blue-700">Cliente:</span>
                <span className="ml-1 text-xs font-bold text-blue-900 truncate">{opd.cliente}</span>
              </div>
            )}
            {opd.data_entrega && (
              <div className="inline-flex items-center px-3 py-1.5 bg-blue-100 border-2 border-blue-400 rounded-md">
                <svg className="w-4 h-4 mr-1.5 text-blue-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">Previsão de Entrega:</span>
                <span className="ml-1 text-xs font-bold text-blue-900">{formatDate(opd.data_entrega)}</span>
              </div>
            )}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Tipo</p>
            <p className="text-sm font-medium text-gray-800">{opd.tipo_opd}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Responsável</p>
            <p className="text-sm font-medium text-gray-800">{opd.responsavel_opd}</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Datas</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Pedido:</span>
              <span className="ml-2 font-medium">{formatDate(opd.data_pedido)}</span>
            </div>
            <div>
              <span className="text-gray-600">Início Prod.:</span>
              <span className="ml-2 font-medium">{formatDate(opd.inicio_producao)}</span>
            </div>
            <div>
              <span className="text-gray-600">Prev. Início:</span>
              <span className="ml-2 font-medium">{formatDate(opd.previsao_inicio)}</span>
            </div>
            <div>
              <span className="text-gray-600">Prev. Término:</span>
              <span className="ml-2 font-medium">{formatDate(opd.previsao_termino)}</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500 uppercase font-semibold">Progresso</p>
            <p className="text-sm font-bold text-gray-700">{progress}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full ${getStatusColor()} transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          {opd.total_atividades !== undefined && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">{opd.atividades_concluidas || 0}</span> de{' '}
              <span className="font-medium">{opd.total_atividades}</span> atividades concluídas
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Atualizado em: {formatDate(opd.updated)}
        </span>
        <Link
          href={`/opd/${opd.numero}`}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
        >
          <span>Ver Detalhes</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
