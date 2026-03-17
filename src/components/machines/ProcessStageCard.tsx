'use client';

interface Stage {
  atividade: string;
  status: string;
  responsavel: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  tempo_acumulado_segundos: number | null;
  tem_nao_conformidade: boolean;
}

interface MachineInfo {
  id: string;
  name: string;
  machine_code: string;
  status: string;
  cam_ip: string | null;
}

interface ProcessStageCardProps {
  stage: Stage;
  machine?: MachineInfo | null;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  'CONCLUÍDA': { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: '✓' },
  'EM ANDAMENTO': { label: 'Em andamento', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: '▶' },
  'A REALIZAR': { label: 'A realizar', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: '○' },
  'PAUSADA': { label: 'Pausada', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: '⏸' },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  return `${m}min`;
}

export default function ProcessStageCard({ stage, machine, compact = false }: ProcessStageCardProps) {
  const config = statusConfig[stage.status] || statusConfig['A REALIZAR'];
  const hasCamera = machine && machine.cam_ip && machine.status !== 'offline';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${config.bg}`}>
        <span className={`text-xs font-bold ${config.color}`}>{config.icon}</span>
        <span className="text-xs text-gray-700 truncate flex-1">{stage.atividade}</span>
        {stage.tem_nao_conformidade && (
          <span className="text-red-500 text-[10px]" title="Não conformidade">NC</span>
        )}
        {hasCamera && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title={`Câmera: ${machine.name}`} />
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${config.bg} transition-all hover:shadow-sm`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${config.color}`}>{config.icon}</span>
            <span className="text-sm font-medium text-gray-900 truncate">{stage.atividade}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${config.color}`}>{config.label}</span>
        </div>
        {stage.tem_nao_conformidade && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-bold">NC</span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs">
        {stage.responsavel && (
          <div className="flex justify-between">
            <span className="text-gray-400">Responsável</span>
            <span className="text-gray-700">{stage.responsavel}</span>
          </div>
        )}
        {stage.tempo_acumulado_segundos != null && stage.tempo_acumulado_segundos > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Tempo</span>
            <span className="text-gray-700">{formatDuration(stage.tempo_acumulado_segundos)}</span>
          </div>
        )}
        {stage.data_inicio && (
          <div className="flex justify-between">
            <span className="text-gray-400">Início</span>
            <span className="text-gray-700">{new Date(stage.data_inicio).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Camera indicator */}
      {machine && (
        <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            hasCamera ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className="text-[10px] text-gray-500">
            {machine.machine_code} — {machine.name}
          </span>
        </div>
      )}
    </div>
  );
}
