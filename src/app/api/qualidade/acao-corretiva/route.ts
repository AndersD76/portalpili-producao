import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';

// GET - Listar ações corretivas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const origem = searchParams.get('origem');
    const countOnly = searchParams.get('count');

    let query = 'SELECT * FROM acoes_corretivas';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (origem) {
      params.push(origem);
      conditions.push(`origem_tipo = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created DESC';

    const result = await pool.query(query, params);

    if (countOnly === 'true') {
      return NextResponse.json({
        success: true,
        count: result.rows.filter(ac => ac.status !== 'FECHADA').length
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao buscar ações corretivas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar ações corretivas' },
      { status: 500 }
    );
  }
}

// POST - Criar ação corretiva
export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      data_abertura,
      origem_tipo,
      origem_id,
      origem_descricao,
      descricao_problema,
      responsavel_principal,
      responsavel_principal_id,
      prazo_conclusao,
      equipe,
      created_by,
      // Campos adicionais do formulário
      emitente,
      processos_envolvidos,
      causas,
      subcausas,
      acoes,
      status_acoes
    } = body;

    // Validações
    if (!data_abertura || !origem_tipo || !descricao_problema) {
      return NextResponse.json(
        { success: false, error: 'Data de abertura, origem e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Gerar número da ação corretiva (RAC-ANO-SEQUENCIA)
    const year = new Date().getFullYear();
    const seqResult = await client.query("SELECT nextval('seq_acao_corretiva') as seq");
    const seq = seqResult.rows[0].seq.toString().padStart(4, '0');
    const numero = `RAC-${year}-${seq}`;

    const result = await client.query(`
      INSERT INTO acoes_corretivas (
        numero, data_abertura, origem_tipo, origem_id, origem_descricao,
        descricao_problema, responsavel_principal, responsavel_principal_id,
        prazo_conclusao, equipe, status, created_by, created, updated,
        emitente, processos_envolvidos, causas, subcausas, acoes, status_acoes, falha, responsaveis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      numero,
      data_abertura,
      origem_tipo,
      origem_id || null,
      origem_descricao || null,
      descricao_problema,
      responsavel_principal || null,
      responsavel_principal_id || null,
      prazo_conclusao || null,
      equipe ? JSON.stringify(equipe) : null,
      'ABERTA',
      created_by || null,
      new Date().toISOString(),
      new Date().toISOString(),
      emitente || null,
      processos_envolvidos ? JSON.stringify(processos_envolvidos) : null,
      causas || null,
      subcausas ? JSON.stringify(subcausas) : null,
      acoes ? JSON.stringify(acoes) : null,
      status_acoes || null,
      descricao_problema || null,
      responsavel_principal || null
    ]);

    // Se a origem for uma NC ou reclamação, atualizar a referência
    if (origem_id) {
      if (origem_tipo === 'NAO_CONFORMIDADE') {
        await client.query(
          'UPDATE nao_conformidades SET acao_corretiva_id = $1 WHERE id = $2',
          [result.rows[0].id, origem_id]
        );
      } else if (origem_tipo === 'RECLAMACAO') {
        await client.query(
          'UPDATE reclamacoes_clientes SET acao_corretiva_id = $1 WHERE id = $2',
          [result.rows[0].id, origem_id]
        );
      }
    }

    await client.query('COMMIT');

    // Enviar notificação push para nova AC
    try {
      const acCriada = result.rows[0];
      const usuario = responsavel_principal || created_by || 'Sistema';
      await enviarNotificacaoPush(notificacoes.acCriada(acCriada.id, acCriada.numero, usuario));
    } catch (notifError) {
      console.error('Erro ao enviar notificação:', notifError);
      // Não falha a criação da AC se falhar a notificação
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Ação corretiva registrada com sucesso'
    }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar ação corretiva:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar ação corretiva: ' + (error?.message || String(error)) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
