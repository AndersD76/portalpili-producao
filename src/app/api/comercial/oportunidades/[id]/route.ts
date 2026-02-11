import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { gerarSugestoes } from '@/lib/comercial/ia';
import { gerarFollowUp } from '@/lib/comercial/followup';
import { verificarPermissao } from '@/lib/auth';

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;

    // Query principal: oportunidade + cliente + vendedor (sem JOINs com tabelas que podem não existir)
    const result = await query(
      `SELECT
        o.*,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cpf_cnpj as cliente_cnpj,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        c.segmento as cliente_segmento,
        v.nome as vendedor_nome,
        v.email as vendedor_email
      FROM crm_oportunidades o
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON o.vendedor_id = v.id
      WHERE o.id = $1`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Oportunidade não encontrada' },
        { status: 404 }
      );
    }

    const oportunidade = result.rows[0];

    // Buscar atividades separadamente (tabela pode não existir)
    let atividades = null;
    try {
      const atRes = await query(
        `SELECT id, tipo, titulo, data_agendada, status,
          (status = 'CONCLUIDA') as concluida
        FROM crm_atividades WHERE oportunidade_id = $1 ORDER BY data_agendada DESC`,
        [id]
      );
      atividades = atRes?.rows || [];
    } catch { /* tabela pode não existir */ }

    // Buscar interações separadamente
    let interacoes = null;
    try {
      const intRes = await query(
        `SELECT id, tipo, descricao, created_at as data
        FROM crm_interacoes WHERE oportunidade_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      interacoes = intRes?.rows || [];
    } catch { /* tabela pode não existir */ }

    // Buscar propostas separadamente
    let propostas = null;
    try {
      const propRes = await query(
        `SELECT id, numero, valor_total, situacao, created_at
        FROM crm_propostas WHERE oportunidade_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      propostas = propRes?.rows || [];
    } catch { /* tabela pode não existir */ }

    // Tenta gerar sugestões da IA
    let sugestoes = null;
    try {
      sugestoes = await gerarSugestoes(oportunidade.estagio, {
        cliente: { razao_social: oportunidade.cliente_nome },
        valor_estimado: oportunidade.valor_estimado,
        dias_no_estagio: toNum(oportunidade.dias_no_estagio),
      });
    } catch {
      // IA não disponível - continua sem sugestões
    }

    return NextResponse.json({
      success: true,
      data: {
        ...oportunidade,
        atividades,
        interacoes,
        propostas,
      },
      sugestoes_ia: sugestoes,
    });
  } catch (error) {
    console.error('Erro ao buscar oportunidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar oportunidade' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('COMERCIAL', 'editar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      titulo,
      descricao,
      tipo_produto,
      produto,
      valor_estimado,
      probabilidade,
      estagio,
      situacao,
      status,
      motivo_perda,
      data_previsao_fechamento,
      concorrentes,
      concorrente,
      observacoes,
      nota_contato,
    } = body;

    const produtoVal = produto || tipo_produto;
    const statusVal = status || situacao;
    const concorrenteVal = concorrente || concorrentes;

    // Se mudou de estágio, reseta dias no estágio
    let estagioClause = '';
    if (estagio) {
      estagioClause = ', dias_no_estagio = 0';
    }

    // Se fechou (ganhou ou perdeu), registra a data
    let fechamentoClause = '';
    if (statusVal === 'GANHA' || statusVal === 'PERDIDA') {
      fechamentoClause = ', data_fechamento = NOW()';
    }

    const result = await query(
      `UPDATE crm_oportunidades SET
        titulo = COALESCE($2, titulo),
        descricao = COALESCE($3, descricao),
        produto = COALESCE($4, produto),
        valor_estimado = COALESCE($5, valor_estimado),
        probabilidade = COALESCE($6, probabilidade),
        estagio = COALESCE($7, estagio),
        status = COALESCE($8, status),
        motivo_perda = COALESCE($9, motivo_perda),
        data_previsao_fechamento = COALESCE($10, data_previsao_fechamento),
        concorrente = COALESCE($11, concorrente),
        observacoes = COALESCE($12, observacoes),
        updated_at = NOW()
        ${estagioClause}
        ${fechamentoClause}
      WHERE id = $1
      RETURNING *`,
      [id, titulo, descricao, produtoVal, valor_estimado, probabilidade, estagio, statusVal, motivo_perda, data_previsao_fechamento, concorrenteVal, observacoes]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Oportunidade não encontrada' },
        { status: 404 }
      );
    }

    // Registra nota de contato se fornecida
    if (nota_contato && nota_contato.trim()) {
      await query(
        `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
         VALUES ($1, 'CONTATO', $2)`,
        [id, nota_contato.trim()]
      );
    }

    // Registra interação de mudança de estágio e gera follow-up automático
    let followup = null;
    if (estagio) {
      await query(
        `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
         VALUES ($1, 'ANOTACAO', $2)`,
        [id, `Oportunidade movida para estágio: ${estagio}`]
      );

      // Gerar follow-up automático para o novo estágio
      try {
        followup = await gerarFollowUp(
          parseInt(id),
          estagio,
          result.rows[0].vendedor_id
        );
      } catch (followupError) {
        console.log('Erro ao gerar follow-up automático:', followupError);
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Oportunidade atualizada com sucesso',
      followup,
    });
  } catch (error) {
    console.error('Erro ao atualizar oportunidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar oportunidade' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('COMERCIAL', 'excluir');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;

    // Verifica se há propostas vinculadas
    const propostas = await query(
      `SELECT COUNT(*) as total FROM crm_propostas WHERE oportunidade_id = $1`,
      [id]
    );

    if (parseInt(propostas?.rows[0]?.total || '0') > 0) {
      return NextResponse.json(
        { success: false, error: 'Oportunidade possui propostas vinculadas. Cancele primeiro.' },
        { status: 400 }
      );
    }

    // Soft delete - cancela a oportunidade
    const result = await query(
      `UPDATE crm_oportunidades SET status = 'CANCELADA', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Oportunidade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Oportunidade cancelada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar oportunidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar oportunidade' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
