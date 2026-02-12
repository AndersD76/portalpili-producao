'use client';

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

  const fmtVal = (value: unknown) => {
    const v = toNum(value);
    if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + 'k';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
  };

  const fmtDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const abrevNome = (nome?: string) => {
    if (!nome) return '';
    const p = nome.trim().split(/\s+/);
    if (p.length <= 1) return nome;
    return `${p[0]} ${p[p.length - 1][0]}.`;
  };

  // Extrair nome do cliente do titulo (remove "TOMBADOR - " ou "COLETOR - " prefixo)
  const clienteNome = () => {
    const fantasia = oportunidade.cliente_fantasia || oportunidade.cliente_nome;
    if (fantasia) return fantasia;
    // Fallback: limpar titulo
    return oportunidade.titulo.replace(/^(TOMBADOR|COLETOR)\s*-\s*/i, '');
  };

  const prob = toNum(oportunidade.probabilidade);
  const probColor = prob >= 70 ? 'bg-green-500' : prob >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  const statusColor: Record<string, string> = {
    ABERTA: 'text-blue-600 bg-blue-50',
    GANHA: 'text-green-700 bg-green-50',
    PERDIDA: 'text-red-600 bg-red-50',
    CANCELADA: 'text-gray-500 bg-gray-50',
  };

  const LEGADO: Record<string, { label: string; color: string }> = {
    PROSPECCAO: { label: 'Prosp.', color: 'bg-blue-100 text-blue-700' },
    QUALIFICACAO: { label: 'Qualif.', color: 'bg-teal-100 text-teal-700' },
    PROPOSTA: { label: 'Proposta', color: 'bg-purple-100 text-purple-700' },
  };

  const diasFechamento = oportunidade.data_previsao_fechamento
    ? Math.ceil((new Date(oportunidade.data_previsao_fechamento).getTime() - Date.now()) / 86400000)
    : null;

  const diasEstagio = toNum(oportunidade.dias_no_estagio);
  const atrasadas = toNum(oportunidade.atividades_atrasadas);
  const urgente = atrasadas > 0;

  return (
    <div
      className={`bg-white rounded-lg border p-2.5 hover:shadow-md transition-all duration-150 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${urgente ? 'border-red-200' : 'border-gray-200'}`}
      onClick={(e) => { if (onClick && !e.defaultPrevented) onClick(); }}
    >
      {/* Row 1: Produto + Status */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            oportunidade.produto === 'TOMBADOR' ? 'bg-gray-100 text-gray-600' : 'bg-sky-50 text-sky-600'
          }`}>
            {oportunidade.produto === 'TOMBADOR' ? 'TOMB' : 'COL'}
          </span>
          {LEGADO[oportunidade.estagio] && (
            <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${LEGADO[oportunidade.estagio].color}`}>
              {LEGADO[oportunidade.estagio].label}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor[oportunidade.status] || 'text-gray-500 bg-gray-50'}`}>
          {oportunidade.status}
        </span>
      </div>

      {/* Row 2: Cliente */}
      <h4 className="font-semibold text-gray-900 text-[13px] leading-tight mb-0.5 truncate" title={oportunidade.titulo}>
        {clienteNome()}
      </h4>

      {/* Row 3: Valor + Prob */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-green-600 text-sm tabular-nums">
          {fmtVal(oportunidade.valor_estimado)}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-12 bg-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full ${probColor}`}
              style={{ width: `${Math.min(100, Math.max(0, prob))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right">{prob}%</span>
        </div>
      </div>

      {/* Row 4: Badges (alertas) - only if there's something to show */}
      {(urgente || (diasFechamento !== null && diasFechamento <= 7)) && (
        <div className="flex flex-wrap items-center gap-1 mb-1.5">
          {urgente && (
            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">
              {atrasadas} atrasada{atrasadas > 1 ? 's' : ''}
            </span>
          )}
          {diasFechamento !== null && diasFechamento >= 0 && diasFechamento <= 7 && (
            <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-medium">
              {diasFechamento}d p/ fechar
            </span>
          )}
          {diasFechamento !== null && diasFechamento < 0 && (
            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">
              Vencida
            </span>
          )}
        </div>
      )}

      {/* Row 5: Footer - Vendedor + data + mover */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1.5 border-t border-gray-100">
        <span className="truncate max-w-[45%]" title={oportunidade.vendedor_nome}>{oportunidade.vendedor_nome || '-'}</span>
        <div className="flex items-center gap-1.5 tabular-nums">
          {diasEstagio > 0 && <span className="text-gray-300">{diasEstagio}d</span>}
          <span>{fmtDate(oportunidade.created_at)}</span>
          {onMove && (
            <select
              className="text-[10px] bg-gray-50 border border-gray-200 rounded px-0.5 py-0 text-gray-500 cursor-pointer hover:border-red-300 ml-1"
              value=""
              onChange={(e) => { e.stopPropagation(); if (e.target.value) onMove(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Mover</option>
              {[
                { id: 'EM_ANALISE', nome: 'Em Análise' },
                { id: 'EM_NEGOCIACAO', nome: 'Negociação' },
                { id: 'POS_NEGOCIACAO', nome: 'Pós Negociação' },
                { id: 'FECHADA', nome: 'Fechada' },
                { id: 'PERDIDA', nome: 'Perdida' },
                { id: 'TESTE', nome: 'Teste' },
                { id: 'SUSPENSO', nome: 'Suspenso' },
                { id: 'SUBSTITUIDO', nome: 'Substituído' },
              ].filter(s => s.id !== oportunidade.estagio).map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
