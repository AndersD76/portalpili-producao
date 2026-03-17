'use client';

import Link from 'next/link';
import ProcessStageCard from './ProcessStageCard';

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

export default function OpdProcessFlow({ opd, machinesByStage, expanded = false, onToggle }: OpdProcessFlowProps) {
  const progressColor = opd.progress_pct >= 80 ? 'bg-green-500'
    : opd.progress_pct >= 50 ? 'bg-amber-500'
    : opd.progress_pct >= 20 ? 'bg-blue-500'
    : 'bg-gray-600';

  const productBadge = opd.tipo_produto === 'TOMBADOR'
    ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';

  // Separate stages by status
  const activeStages = opd.stages.filter(s => s.status === 'EM ANDAMENTO');
  const nextStages = opd.stages.filter(s => s.status === 'A REALIZAR').slice(0, 3);
  const hasNc = opd.stages.some(s => s.tem_nao_conformidade);

  const daysUntilDelivery = opd.previsao_termino
    ? Math.ceil((new Date(opd.previsao_termino).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors text-left"
      >
        {/* Product type badge */}
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${productBadge}`}>
          {opd.tipo_produto === 'TOMBADOR' ? 'TOMB' : 'COL'}
        </span>

        {/* OPD number + client */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">OPD {opd.numero}</span>
            {opd.cliente && (
              <span className="text-xs text-gray-500 truncate">{opd.cliente}</span>
            )}
            {hasNc && (
              <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded font-bold">NC</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{opd.concluidas}/{opd.total_atividades} etapas</span>
            {parseInt(opd.em_andamento) > 0 && (
              <span className="text-blue-400">{opd.em_andamento} em andamento</span>
            )}
            {daysUntilDelivery !== null && (
              <span className={daysUntilDelivery < 0 ? 'text-red-400 font-medium' : daysUntilDelivery <= 7 ? 'text-amber-400' : 'text-gray-500'}>
                {daysUntilDelivery < 0 ? `${Math.abs(daysUntilDelivery)}d atrasada` : `${daysUntilDelivery}d restantes`}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${opd.progress_pct}%` }} />
          </div>
          <span className={`text-sm font-bold w-10 text-right ${
            opd.progress_pct >= 80 ? 'text-green-400' : opd.progress_pct >= 50 ? 'text-amber-400' : 'text-gray-400'
          }`}>{opd.progress_pct}%</span>
          <svg className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Inline active/next preview (collapsed) */}
      {!expanded && (activeStages.length > 0 || nextStages.length > 0) && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {activeStages.map((s, i) => (
            <ProcessStageCard key={`active-${i}`} stage={s} machine={machinesByStage[s.atividade]} compact />
          ))}
          {nextStages.map((s, i) => (
            <ProcessStageCard key={`next-${i}`} stage={s} machine={machinesByStage[s.atividade]} compact />
          ))}
        </div>
      )}

      {/* Expanded: full process flow */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800">
          {/* Stage flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-3">
            {opd.stages.map((stage, i) => (
              <ProcessStageCard
                key={i}
                stage={stage}
                machine={machinesByStage[stage.atividade]}
              />
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
            <div className="flex gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> {opd.concluidas} concluídas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> {opd.em_andamento} andamento
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-600" /> {opd.a_realizar} pendentes
              </span>
              {parseInt(opd.pausadas) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> {opd.pausadas} pausadas
                </span>
              )}
            </div>
            <Link
              href={`/producao/opd/${opd.numero}`}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Abrir OPD →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
