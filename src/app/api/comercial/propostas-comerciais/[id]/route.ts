import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(`
      SELECT
        pc.*,
        c.razao_social as cliente_nome,
        c.cnpj as cliente_cnpj_db,
        c.email as cliente_email_db,
        c.telefone as cliente_telefone,
        u.nome as vendedor_nome_usuario
      FROM crm_propostas_comerciais pc
      LEFT JOIN crm_clientes c ON pc.cliente_id = c.id
      LEFT JOIN usuarios u ON pc.vendedor_id = u.id
      WHERE pc.id = $1
    `, [id]);

    if (!result?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Buscar itens da proposta
    const itens = await query(`
      SELECT * FROM crm_proposta_itens WHERE proposta_id = $1
    `, [id]);

    // Buscar anexos
    const anexos = await query(`
      SELECT * FROM crm_proposta_anexos WHERE proposta_id = $1 ORDER BY tipo_produto, numero_anexo
    `, [id]);

    const proposta = result.rows[0];
    proposta.itens = itens?.rows || [];
    proposta.anexos = anexos?.rows || [];

    return NextResponse.json({
      success: true,
      data: proposta
    });
  } catch (error) {
    console.error('Erro ao buscar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar proposta' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Lista de campos atualizáveis
    const allowedFields = [
      'vendedor_id', 'vendedor_nome', 'vendedor_email', 'regiao',
      'cliente_id', 'cliente_cnpj', 'cliente_razao_social', 'cliente_pais',
      'cliente_estado', 'cliente_municipio', 'cliente_contato',
      'prazo_entrega_dias', 'data_visita', 'validade_dias', 'chance_negocio',
      'tipo_produto', 'configuracao_produto',
      'valor_equipamento', 'valor_opcionais', 'valor_frete', 'valor_montagem', 'valor_total',
      'desconto_percentual', 'comissao_percentual', 'forma_pagamento', 'tipo_frete',
      'quantidade_frete', 'valor_unitario_frete',
      'deslocamentos_tecnicos', 'valor_diaria_tecnica', 'garantia_meses',
      'outros_requisitos', 'observacoes', 'informacoes_adicionais',
      'analise_critica', 'criterios_atendidos', 'acao_necessaria', 'status', 'updated_by'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        let value = body[field];

        // Converter objetos para JSON
        if (field === 'configuracao_produto' || field === 'analise_critica') {
          value = JSON.stringify(value);
        }

        fields.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Adicionar updated_at
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const sql = `
      UPDATE crm_propostas_comerciais
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);

    if (!result?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Proposta atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar proposta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se existe
    const check = await query('SELECT id, status FROM crm_propostas_comerciais WHERE id = $1', [id]);

    if (!check?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Só permite deletar rascunhos
    if (check.rows[0].status !== 'RASCUNHO') {
      return NextResponse.json(
        { success: false, error: 'Apenas propostas em rascunho podem ser excluídas' },
        { status: 400 }
      );
    }

    await query('DELETE FROM crm_propostas_comerciais WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Proposta excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir proposta' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
