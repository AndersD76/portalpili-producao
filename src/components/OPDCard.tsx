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

  // Progresso baseado nas atividades concluídas
  const progress = opd.percentual_conclusao !== undefined ? Math.round(opd.percentual_conclusao) : 0;

  // Contar mensagens não lidas (últimas 24 horas consideradas como "novas")
  const mensagensNovas = opd.mensagens?.filter(msg => {
    const msgDate = new Date(msg.timestamp);
    const horasAtras = (Date.now() - msgDate.getTime()) / (1000 * 60 * 60);
    return horasAtras <= 24;
  }).length || 0;

  const getStatusColor = () => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (progress === 100) return 'Concluída';
    if (progress >= 75) return 'Quase Pronta';
    if (progress >= 50) return 'Em Andamento';
    if (progress > 0) return 'Iniciada';
    return 'Não Iniciada';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border-t-4 border-red-600">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">OPD {opd.numero}</h2>
          <p className="text-sm text-gray-500">ID: {opd.id}</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Indicador de mensagens novas */}
          {mensagensNovas > 0 && (
            <div className="relative">
              <svg className="w-6 h-6 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {mensagensNovas}
              </span>
            </div>
          )}
          <div className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </div>
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
            <div>
              <span className="text-gray-600">Prev. Entrega:</span>
              <span className="ml-2 font-medium">{formatDate(opd.data_prevista_entrega)}</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500 uppercase font-semibold">Progresso das Atividades</p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">
                {opd.atividades_concluidas || 0}/{opd.total_atividades || 0}
              </span>
              <p className="text-sm font-bold text-gray-700">{progress}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${getStatusColor()} transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Anexo */}
        {opd.anexo_pedido && (
          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Anexo do Pedido</p>
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded border border-blue-200">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm text-gray-700 truncate">{opd.anexo_pedido.filename}</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(opd.anexo_pedido?.url, '_blank');
                }}
                className="ml-2 text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition flex-shrink-0"
              >
                Abrir
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Atualizado em: {formatDate(opd.updated)}
        </span>
        <Link
          href={`/producao/opd/${opd.numero}`}
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
