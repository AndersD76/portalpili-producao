import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar formulários de uma OPD
export async function GET(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const { numero } = await params;

    const result = await pool.query(`
      SELECT
        id,
        atividade_id,
        numero_opd,
        tipo_formulario,
        dados_formulario,
        anexos,
        preenchido_por,
        data_preenchimento,
        created,
        updated
      FROM formularios_preenchidos
      WHERE numero_opd = $1
      ORDER BY data_preenchimento DESC
    `, [numero]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount || 0
    });
  } catch (error) {
    console.error('Erro ao buscar formulários:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar formulários' },
      { status: 500 }
    );
  }
}

// POST - Salvar formulário preenchido
export async function POST(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const client = await pool.connect();

  try {
    const { numero } = await params;
    const body = await request.json();
    const {
      atividade_id,
      tipo_formulario,
      dados_formulario,
      anexos,
      preenchido_por
    } = body;

    // Validações
    if (!atividade_id || !tipo_formulario || !dados_formulario) {
      return NextResponse.json(
        { success: false, error: 'Atividade, tipo de formulário e dados são obrigatórios' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Inserir formulário preenchido
    const formularioResult = await client.query(`
      INSERT INTO formularios_preenchidos (
        atividade_id,
        numero_opd,
        tipo_formulario,
        dados_formulario,
        anexos,
        preenchido_por,
        data_preenchimento,
        created,
        updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      atividade_id,
      numero,
      tipo_formulario,
      JSON.stringify(dados_formulario),
      anexos ? JSON.stringify(anexos) : null,
      preenchido_por || 'Sistema',
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    // Atualizar atividade como concluída
    await client.query(`
      UPDATE registros_atividades
      SET
        status = 'CONCLUÍDA',
        data_termino = $1,
        updated = $2
      WHERE id = $3
    `, [
      new Date().toISOString(),
      new Date().toISOString(),
      atividade_id
    ]);

    // Buscar próxima atividade para notificar
    const proximaAtividade = await client.query(`
      SELECT id, atividade, responsavel, numero_opd
      FROM registros_atividades
      WHERE numero_opd = $1
        AND status = 'A REALIZAR'
      ORDER BY id ASC
      LIMIT 1
    `, [numero]);

    // Se houver próxima atividade, criar notificação
    if (proximaAtividade.rowCount && proximaAtividade.rowCount > 0) {
      const proxima = proximaAtividade.rows[0];

      // Buscar email do responsável
      const emailResult = await client.query(`
        SELECT email, nome
        FROM configuracao_emails
        WHERE responsavel = $1 AND ativo = TRUE
      `, [proxima.responsavel]);

      if (emailResult.rowCount && emailResult.rowCount > 0) {
        const { email, nome } = emailResult.rows[0];

        await client.query(`
          INSERT INTO notificacoes (
            numero_opd,
            atividade_id,
            destinatario_email,
            destinatario_nome,
            assunto,
            mensagem,
            tipo,
            status,
            created,
            updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          numero,
          proxima.id,
          email,
          nome,
          `OPD ${numero} - Nova atividade disponível`,
          `Olá ${nome},\n\nA atividade "${proxima.atividade}" da OPD ${numero} está pronta para ser iniciada.\n\nPor favor, acesse o sistema para dar prosseguimento.`,
          'NOTIFICACAO_ETAPA',
          'PENDENTE',
          new Date().toISOString(),
          new Date().toISOString()
        ]);
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: formularioResult.rows[0],
      message: 'Formulário salvo com sucesso'
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar formulário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar formulário' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
