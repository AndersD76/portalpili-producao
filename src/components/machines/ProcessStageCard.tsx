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
  'CONCLUÍDA': { label: 'Concluída', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: '✓' },
  'EM ANDAMENTO': { label: 'Em andamento', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: '▶' },
  'A REALIZAR': { label: 'A realizar', color: 'text-gray-500', bg: 'bg-gray-500/5 border-gray-700/30', icon: '○' },
  'PAUSADA': { label: 'Pausada', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: '⏸' },
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
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${config.bg}`}>
        <span className={`text-xs font-bold ${config.color}`}>{config.icon}</span>
        <span className="text-xs text-gray-300 truncate flex-1">{stage.atividade}</span>
        {stage.tem_nao_conformidade && (
          <span className="text-red-400 text-[10px]" title="Não conformidade">NC</span>
        )}
        {hasCamera && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title={`Câmera: ${machine.name}`} />
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${config.bg} transition-all hover:border-gray-600`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${config.color}`}>{config.icon}</span>
            <span className="text-sm font-medium text-white truncate">{stage.atividade}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${config.color}`}>{config.label}</span>
        </div>
        {stage.tem_nao_conformidade && (
          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded font-bold">NC</span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs">
        {stage.responsavel && (
          <div className="flex justify-between">
            <span className="text-gray-500">Responsável</span>
            <span className="text-gray-300">{stage.responsavel}</span>
          </div>
        )}
        {stage.tempo_acumulado_segundos != null && stage.tempo_acumulado_segundos > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tempo</span>
            <span className="text-gray-300">{formatDuration(stage.tempo_acumulado_segundos)}</span>
          </div>
        )}
        {stage.data_inicio && (
          <div className="flex justify-between">
            <span className="text-gray-500">Início</span>
            <span className="text-gray-300">{new Date(stage.data_inicio).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Camera indicator */}
      {machine && (
        <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            hasCamera ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
          }`} />
          <span className="text-[10px] text-gray-500">
            {machine.machine_code} — {machine.name}
          </span>
        </div>
      )}
    </div>
  );
}
