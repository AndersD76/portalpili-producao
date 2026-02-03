import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ numero: string }> }) {
  const client = await pool.connect();
  try {
    const { numero } = await params;
    const { atividade_id, dados_formulario, preenchido_por } = await request.json();

    if (!dados_formulario) {
      return NextResponse.json({ success: false, error: 'Dados obrigatórios' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Salvar o formulário de revisão
    const result = await client.query(
      `INSERT INTO formularios_preenchidos
       (atividade_id, numero_opd, tipo_formulario, dados_formulario, anexos, preenchido_por, data_preenchimento, created, updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        atividade_id || null,
        numero,
        'REVISAO_PROJETOS',
        JSON.stringify(dados_formulario),
        null,
        preenchido_por || 'Sistema',
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // Se houver documentos reprovados, marcar para correção
    const aprovacoes = dados_formulario.aprovacoes || [];
    const reprovados = aprovacoes.filter((a: any) => a.aprovado === false);

    if (reprovados.length > 0) {
      // Para cada documento reprovado, criar um registro de pendência de correção
      for (const reprovado of reprovados) {
        // Atualizar o formulário original com status de pendente correção
        await client.query(
          `UPDATE formularios_preenchidos
           SET dados_formulario = jsonb_set(
             COALESCE(dados_formulario::jsonb, '{}'::jsonb),
             '{pendente_correcao}',
             $1::jsonb
           ),
           updated = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [
            JSON.stringify({
              status: true,
              motivo: reprovado.motivo_reprovacao,
              revisado_por: preenchido_por,
              data_revisao: new Date().toISOString(),
              documento_nome: reprovado.nome
            }),
            reprovado.formulario_id
          ]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      resumo: {
        total: dados_formulario.total_documentos,
        aprovados: dados_formulario.total_aprovados,
        reprovados: dados_formulario.total_reprovados
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar revisão de projetos:', error);
    return NextResponse.json({ success: false, error: 'Erro ao salvar' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ numero: string }> }) {
  try {
    const { numero } = await params;
    const url = new URL(request.url);
    const atividadeId = url.searchParams.get('atividade_id');

    let query = `SELECT * FROM formularios_preenchidos WHERE tipo_formulario = 'REVISAO_PROJETOS'`;
    const queryParams: any[] = [];

    if (atividadeId) {
      query += ` AND atividade_id = $1`;
      queryParams.push(parseInt(atividadeId));
    } else {
      query += ` AND numero_opd = $1`;
      queryParams.push(numero);
    }

    query += ` ORDER BY created DESC LIMIT 1`;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar revisão de projetos:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
