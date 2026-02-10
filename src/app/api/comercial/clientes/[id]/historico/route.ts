import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar dados do cliente
    const clienteResult = await query(
      `SELECT c.*, v.nome as vendedor_nome
       FROM crm_clientes c
       LEFT JOIN crm_vendedores v ON c.vendedor_id = v.id
       WHERE c.id = $1`,
      [id]
    );

    if (!clienteResult?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const cliente = clienteResult.rows[0];

    // Buscar timeline unificada: oportunidades, atividades, propostas
    const [oportunidades, atividades, propostas, interacoes] = await Promise.all([
      query(
        `SELECT id, titulo, valor_estimado, estagio, status, tipo_produto,
                created_at as data, 'OPORTUNIDADE' as tipo_evento
         FROM crm_oportunidades
         WHERE cliente_id = $1
         ORDER BY created_at DESC`,
        [id]
      ),
      query(
        `SELECT a.id, a.titulo, a.descricao, a.tipo, a.status, a.data_agendada,
                a.created_at as data, 'ATIVIDADE' as tipo_evento,
                v.nome as vendedor_nome
         FROM crm_atividades a
         LEFT JOIN crm_vendedores v ON a.vendedor_id = v.id
         WHERE a.cliente_id = $1
            OR a.oportunidade_id IN (SELECT id FROM crm_oportunidades WHERE cliente_id = $1)
         ORDER BY COALESCE(a.data_agendada, a.created_at) DESC`,
        [id]
      ),
      query(
        `SELECT p.id, p.numero, p.valor_total, p.status, p.tipo_equipamento,
                p.created_at as data, 'PROPOSTA' as tipo_evento,
                p.vendedor_nome
         FROM propostas_comerciais p
         WHERE p.cliente_cnpj = (SELECT cpf_cnpj FROM crm_clientes WHERE id = $1)
            OR p.cliente_id = $1
         ORDER BY p.created_at DESC`,
        [id]
      ),
      query(
        `SELECT i.id, i.tipo, i.descricao, i.resultado,
                i.created_at as data, 'INTERACAO' as tipo_evento,
                v.nome as vendedor_nome
         FROM crm_interacoes i
         LEFT JOIN crm_vendedores v ON i.vendedor_id = v.id
         WHERE i.oportunidade_id IN (SELECT id FROM crm_oportunidades WHERE cliente_id = $1)
         ORDER BY i.created_at DESC`,
        [id]
      ),
    ]);

    // Construir timeline unificada
    const timeline: Array<{
      tipo: string;
      data: string;
      titulo: string;
      detalhes: string;
      id: number;
      extra?: Record<string, unknown>;
    }> = [];

    // Oportunidades
    for (const o of oportunidades?.rows || []) {
      timeline.push({
        tipo: 'OPORTUNIDADE',
        data: o.data,
        titulo: o.titulo || `Oportunidade ${o.tipo_produto || ''}`,
        detalhes: `Estágio: ${o.estagio} | Status: ${o.status} | Valor: R$ ${parseFloat(o.valor_estimado || 0).toLocaleString('pt-BR')}`,
        id: o.id,
        extra: { estagio: o.estagio, status: o.status, valor: o.valor_estimado },
      });
    }

    // Atividades
    for (const a of atividades?.rows || []) {
      timeline.push({
        tipo: 'ATIVIDADE',
        data: a.data_agendada || a.data,
        titulo: a.titulo || `${a.tipo || 'Atividade'}`,
        detalhes: `${a.descricao || ''} | Status: ${a.status} | Responsável: ${a.vendedor_nome || '-'}`,
        id: a.id,
        extra: { tipo_atividade: a.tipo, status: a.status },
      });
    }

    // Propostas
    for (const p of propostas?.rows || []) {
      timeline.push({
        tipo: 'PROPOSTA',
        data: p.data,
        titulo: `Proposta ${p.numero || '#' + p.id}`,
        detalhes: `${p.tipo_equipamento || ''} | Valor: R$ ${parseFloat(p.valor_total || 0).toLocaleString('pt-BR')} | Status: ${p.status}`,
        id: p.id,
        extra: { valor: p.valor_total, status: p.status },
      });
    }

    // Interações
    for (const i of interacoes?.rows || []) {
      timeline.push({
        tipo: 'INTERACAO',
        data: i.data,
        titulo: `${i.tipo || 'Interação'}`,
        detalhes: `${i.descricao || ''} ${i.resultado ? '| Resultado: ' + i.resultado : ''} | ${i.vendedor_nome || ''}`,
        id: i.id,
      });
    }

    // Ordenar por data (mais recente primeiro)
    timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Calcular resumo
    const opRows = oportunidades?.rows || [];
    const totalOportunidades = opRows.length;
    const ganhas = opRows.filter((o: { status: string }) => o.status === 'GANHA');
    const valorTotalCompras = ganhas.reduce((s: number, o: { valor_estimado: string }) => s + parseFloat(o.valor_estimado || '0'), 0);
    const ticketMedio = ganhas.length > 0 ? valorTotalCompras / ganhas.length : 0;
    const taxaConversao = totalOportunidades > 0 ? ganhas.length / totalOportunidades : 0;
    const ultimaInteracao = timeline[0]?.data || null;

    return NextResponse.json({
      success: true,
      data: {
        cliente,
        resumo: {
          total_oportunidades: totalOportunidades,
          oportunidades_ganhas: ganhas.length,
          valor_total_compras: valorTotalCompras,
          ticket_medio: ticketMedio,
          taxa_conversao: taxaConversao,
          ultima_interacao: ultimaInteracao,
          total_atividades: (atividades?.rows || []).length,
          total_propostas: (propostas?.rows || []).length,
        },
        timeline,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar histórico' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
