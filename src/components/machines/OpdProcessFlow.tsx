'use client';

import Link from 'next/link';

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

interface OpdData {
  numero: string;
  tipo_produto: string;
  cliente: string | null;
  previsao_termino: string | null;
  progress_pct: number;
  total_atividades: string;
  concluidas: string;
  em_andamento: string;
  a_realizar: string;
  pausadas: string;
  stages: Stage[];
}

interface OpdProcessFlowProps {
  opd: OpdData;
  machinesByStage: Record<string, MachineInfo>;
  expanded?: boolean;
  onToggle?: () => void;
}

const statusColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  'CONCLUÍDA': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
  'EM ANDAMENTO': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', border: 'border-blue-200' },
  'A REALIZAR': { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', border: 'border-gray-200' },
  'PAUSADA': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ''}`;
  return `${m}m`;
}

export default function OpdProcessFlow({ opd, machinesByStage, expanded = false, onToggle }: OpdProcessFlowProps) {
  const progressColor = opd.progress_pct >= 80 ? 'bg-green-500'
    : opd.progress_pct >= 50 ? 'bg-amber-500'
    : opd.progress_pct >= 20 ? 'bg-blue-500'
    : 'bg-gray-400';

  const progressTextColor = opd.progress_pct >= 80 ? 'text-green-600'
    : opd.progress_pct >= 50 ? 'text-amber-600'
    : 'text-gray-600';

  const productBadge = opd.tipo_produto === 'TOMBADOR'
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-cyan-100 text-cyan-700 border-cyan-200';

  const hasNc = opd.stages.some(s => s.tem_nao_conformidade);

  const daysUntilDelivery = opd.previsao_termino
    ? Math.ceil((new Date(opd.previsao_termino).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${productBadge}`}>
          {opd.tipo_produto === 'TOMBADOR' ? 'TOMB' : 'COL'}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">OPD {opd.numero}</span>
            {opd.cliente && (
              <span className="text-xs text-gray-400 truncate hidden sm:inline">{opd.cliente}</span>
            )}
            {hasNc && (
              <span className="px-1 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-bold">NC</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{opd.concluidas}/{opd.total_atividades} etapas</span>
            {daysUntilDelivery !== null && (
              <span className={daysUntilDelivery < 0 ? 'text-red-600 font-medium' : daysUntilDelivery <= 7 ? 'text-amber-600' : 'text-gray-400'}>
                {daysUntilDelivery < 0 ? `${Math.abs(daysUntilDelivery)}d atrasada` : `${daysUntilDelivery}d restantes`}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
            <div className={`h-full rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${opd.progress_pct}%` }} />
          </div>
          <span className={`text-sm font-bold w-10 text-right ${progressTextColor}`}>{opd.progress_pct}%</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded: full process pipeline */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Pipeline visual — each stage as a row */}
          <div className="divide-y divide-gray-100">
            {opd.stages.map((stage, i) => {
              const colors = statusColors[stage.status] || statusColors['A REALIZAR'];
              const machine = machinesByStage[stage.atividade];
              const hasCamera = machine && machine.cam_ip && machine.status !== 'offline';

              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${colors.bg}`}>
                  {/* Step number */}
                  <span className="text-[10px] text-gray-400 font-mono w-5 text-right shrink-0">{i + 1}</span>

                  {/* Status dot */}
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />

                  {/* Stage name */}
                  <span className={`text-sm font-medium flex-1 min-w-0 truncate ${colors.text}`}>
                    {stage.atividade}
                  </span>

                  {/* NC badge */}
                  {stage.tem_nao_conformidade && (
                    <span className="px-1 py-0.5 bg-red-100 text-red-600 text-[9px] rounded font-bold shrink-0">NC</span>
                  )}

                  {/* Camera indicator */}
                  {hasCamera && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" title={machine.name} />
                  )}

                  {/* Responsável */}
                  {stage.responsavel && (
                    <span className="text-[11px] text-gray-500 truncate max-w-[100px] hidden sm:inline shrink-0">
                      {stage.responsavel}
                    </span>
                  )}

                  {/* Duration */}
                  {stage.tempo_acumulado_segundos != null && stage.tempo_acumulado_segundos > 0 && (
                    <span className="text-[11px] text-gray-400 font-mono shrink-0">
                      {formatDuration(stage.tempo_acumulado_segundos)}
                    </span>
                  )}

                  {/* Date */}
                  {stage.data_inicio && (
                    <span className="text-[11px] text-gray-400 hidden md:inline shrink-0">
                      {new Date(stage.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> {opd.concluidas}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> {opd.em_andamento}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> {opd.a_realizar}
              </span>
              {parseInt(opd.pausadas) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> {opd.pausadas}
                </span>
              )}
            </div>
            <Link
              href={`/producao/opd/${opd.numero}`}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Abrir OPD →
            </Link>
          </div>
        </div>
      )}

      {/* Collapsed: show inline pipeline dots */}
      {!expanded && opd.stages.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-0.5 overflow-hidden">
          {opd.stages.map((stage, i) => {
            const colors = statusColors[stage.status] || statusColors['A REALIZAR'];
            return (
              <div
                key={i}
                className={`h-2 flex-1 rounded-sm min-w-[3px] ${colors.dot.replace(' animate-pulse', '')}`}
                title={`${stage.atividade} — ${stage.status}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
