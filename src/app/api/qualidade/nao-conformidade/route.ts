import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';

// GET - Listar não conformidades
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tipo = searchParams.get('tipo');
    const countOnly = searchParams.get('count');

    let query = 'SELECT * FROM nao_conformidades';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (tipo) {
      params.push(tipo);
      conditions.push(`tipo = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created DESC';

    const result = await pool.query(query, params);

    if (countOnly === 'true') {
      return NextResponse.json({
        success: true,
        count: result.rows.filter(nc => nc.status !== 'FECHADA').length
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao buscar não conformidades:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar não conformidades' },
      { status: 500 }
    );
  }
}

// POST - Criar não conformidade
export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      data_ocorrencia,
      local_ocorrencia,
      setor_responsavel,
      tipo,
      origem,
      gravidade,
      descricao,
      evidencias,
      produtos_afetados,
      quantidade_afetada,
      detectado_por,
      detectado_por_id,
      disposicao,
      disposicao_descricao,
      acao_contencao,
      responsavel_contencao,
      created_by
    } = body;

    // Validações
    if (!data_ocorrencia || !tipo || !descricao) {
      return NextResponse.json(
        { success: false, error: 'Data de ocorrência, tipo e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Gerar número da NC (RNC-ANO-SEQUENCIA)
    const year = new Date().getFullYear();
    const seqResult = await client.query("SELECT nextval('seq_nao_conformidade') as seq");
    const seq = seqResult.rows[0].seq.toString().padStart(4, '0');
    const numero = `RNC-${year}-${seq}`;

    const result = await client.query(`
      INSERT INTO nao_conformidades (
        numero, data_ocorrencia, local_ocorrencia, setor_responsavel,
        tipo, origem, gravidade, descricao, evidencias,
        produtos_afetados, quantidade_afetada, detectado_por, detectado_por_id,
        disposicao, disposicao_descricao, acao_contencao, responsavel_contencao,
        status, created_by, created, updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      numero,
      data_ocorrencia,
      local_ocorrencia || null,
      setor_responsavel || null,
      tipo,
      origem || null,
      gravidade || null,
      descricao,
      evidencias ? JSON.stringify(evidencias) : null,
      produtos_afetados || null,
      quantidade_afetada || null,
      detectado_por || null,
      detectado_por_id || null,
      disposicao || null,
      disposicao_descricao || null,
      acao_contencao || null,
      responsavel_contencao || null,
      'ABERTA',
      created_by || null,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    await client.query('COMMIT');

    // Enviar notificação push para nova NC
    try {
      const ncCriada = result.rows[0];
      const opdReferencia = produtos_afetados || origem || 'N/A';
      const usuario = detectado_por || created_by || 'Sistema';
      await enviarNotificacaoPush(notificacoes.ncCriada(ncCriada.id, ncCriada.numero, opdReferencia, usuario));
    } catch (notifError) {
      console.error('Erro ao enviar notificação:', notifError);
      // Não falha a criação da NC se falhar a notificação
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Não conformidade registrada com sucesso'
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar não conformidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar não conformidade' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
