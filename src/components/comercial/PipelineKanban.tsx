'use client';

import { useState, useCallback } from 'react';
import OportunidadeCard from './OportunidadeCard';

interface Oportunidade {
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
}

interface PipelineKanbanProps {
  oportunidades: Oportunidade[];
  onMoveOportunidade?: (oportunidadeId: number, novoEstagio: string) => Promise<void>;
  onClickOportunidade?: (oportunidade: Oportunidade) => void;
}

const ESTAGIOS = [
  { id: 'EM_ANALISE', nome: 'Em Análise', cor: 'bg-cyan-500' },
  { id: 'EM_NEGOCIACAO', nome: 'Negociação', cor: 'bg-orange-500' },
  { id: 'POS_NEGOCIACAO', nome: 'Pós Negociação', cor: 'bg-purple-500' },
  { id: 'FECHADA', nome: 'Fechada', cor: 'bg-green-500' },
  { id: 'PERDIDA', nome: 'Perdida', cor: 'bg-red-500' },
  { id: 'TESTE', nome: 'Teste', cor: 'bg-pink-500' },
  { id: 'SUSPENSO', nome: 'Suspenso', cor: 'bg-yellow-600' },
  { id: 'SUBSTITUIDO', nome: 'Substituído', cor: 'bg-indigo-500' },
];

export default function PipelineKanban({
  oportunidades,
  onMoveOportunidade,
  onClickOportunidade,
}: PipelineKanbanProps) {
  const [draggedItem, setDraggedItem] = useState<Oportunidade | null>(null);
  const [dragOverEstagio, setDragOverEstagio] = useState<string | null>(null);

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
      maximumFractionDigits: 0,
    }).format(toNum(value));
  };

  const getOportunidadesPorEstagio = useCallback((estagio: string) => {
    // Estágios finais mostram independente do status
    const estagiosFinais = ['FECHADA', 'PERDIDA', 'SUSPENSO', 'SUBSTITUIDO', 'TESTE'];
    if (estagiosFinais.includes(estagio)) {
      return oportunidades.filter((o) => o.estagio === estagio);
    }
    // EM_ANALISE também agrupa PROSPECCAO, QUALIFICACAO, PROPOSTA legados
    if (estagio === 'EM_ANALISE') {
      const legados = ['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA'];
      return oportunidades.filter(
        (o) => (o.estagio === estagio || legados.includes(o.estagio)) && o.status === 'ABERTA'
      );
    }
    // Estágios ativos mostram apenas status ABERTA
    return oportunidades.filter(
      (o) => o.estagio === estagio && o.status === 'ABERTA'
    );
  }, [oportunidades]);

  const getTotalPorEstagio = useCallback((estagio: string) => {
    const ops = getOportunidadesPorEstagio(estagio);
    return {
      quantidade: ops.length,
      valor: ops.reduce((sum, o) => sum + toNum(o.valor_estimado), 0),
    };
  }, [getOportunidadesPorEstagio]);

  const handleDragStart = (e: React.DragEvent, oportunidade: Oportunidade) => {
    setDraggedItem(oportunidade);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, estagio: string) => {
    e.preventDefault();
    setDragOverEstagio(estagio);
  };

  const handleDragLeave = () => {
    setDragOverEstagio(null);
  };

  const handleDrop = async (e: React.DragEvent, novoEstagio: string) => {
    e.preventDefault();
    setDragOverEstagio(null);

    if (draggedItem && draggedItem.estagio !== novoEstagio && onMoveOportunidade) {
      await onMoveOportunidade(draggedItem.id, novoEstagio);
    }

    setDraggedItem(null);
  };

  return (
    <div className="flex gap-2 sm:gap-4 overflow-x-auto overflow-y-hidden pb-4" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {ESTAGIOS.map((estagio) => {
        const totais = getTotalPorEstagio(estagio.id);
        const ops = getOportunidadesPorEstagio(estagio.id);

        return (
          <div
            key={estagio.id}
            className={`flex-shrink-0 w-60 sm:w-64 lg:w-72 bg-gray-100 rounded-lg transition-all duration-200 ${
              dragOverEstagio === estagio.id ? 'ring-2 ring-red-500 bg-red-50' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, estagio.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, estagio.id)}
          >
            {/* Cabeçalho do estágio */}
            <div className={`${estagio.cor} text-white p-3 rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{estagio.nome}</h3>
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                  {totais.quantidade}
                </span>
              </div>
              <p className="text-sm mt-1 opacity-90">
                {formatCurrency(totais.valor)}
              </p>
            </div>

            {/* Lista de oportunidades */}
            <div className="p-2 space-y-2 min-h-[200px] max-h-[60vh] lg:max-h-[calc(100vh-250px)] overflow-y-auto">
              {ops.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhuma oportunidade
                </div>
              ) : (
                ops.map((oportunidade) => (
                  <div
                    key={oportunidade.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, oportunidade)}
                    className={`transition-transform ${
                      draggedItem?.id === oportunidade.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <OportunidadeCard
                      oportunidade={oportunidade}
                      onClick={() => onClickOportunidade?.(oportunidade)}
                      onMove={async (novoEstagio) => {
                        try {
                          if (onMoveOportunidade) await onMoveOportunidade(oportunidade.id, novoEstagio);
                        } catch (err) {
                          console.error('Erro ao mover:', err);
                        }
                        onClickOportunidade?.(oportunidade);
                      }}
                      draggable
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
