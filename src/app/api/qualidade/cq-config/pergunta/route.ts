import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST - Criar nova pergunta
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      setor_id,
      codigo,
      descricao,
      etapa,
      avaliacao,
      medida_critica,
      metodo_verificacao,
      instrumento,
      criterios_aceitacao,
      opcoes,
      requer_imagem,
      imagem_descricao,
      tipo_resposta,
      ordem
    } = body;

    if (!setor_id || !codigo || !descricao) {
      return NextResponse.json(
        { success: false, error: 'Setor, código e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o setor existe
    const setorCheck = await client.query(
      'SELECT id FROM cq_setores WHERE id = $1',
      [setor_id]
    );

    if (setorCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Setor não encontrado' },
        { status: 404 }
      );
    }

    const result = await client.query(`
      INSERT INTO cq_perguntas (
        setor_id, codigo, descricao, etapa, avaliacao, medida_critica,
        metodo_verificacao, instrumento, criterios_aceitacao, opcoes,
        requer_imagem, imagem_descricao, tipo_resposta, ordem
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      setor_id,
      codigo,
      descricao,
      etapa || null,
      avaliacao || '100%',
      medida_critica || null,
      metodo_verificacao || null,
      instrumento || null,
      criterios_aceitacao || null,
      JSON.stringify(opcoes || ['Conforme', 'Não conforme']),
      requer_imagem || false,
      imagem_descricao || null,
      tipo_resposta || 'selecao',
      ordem || 0
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar pergunta:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Já existe uma pergunta com este código neste setor' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Erro ao criar pergunta' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
