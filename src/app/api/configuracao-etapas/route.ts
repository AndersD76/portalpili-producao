import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar configuração de etapas
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nome_etapa,
        ordem,
        responsavel_padrao,
        dias_padrao,
        requer_formulario,
        tipo_formulario,
        descricao,
        ativo,
        created,
        updated
      FROM configuracao_etapas
      WHERE ativo = TRUE
      ORDER BY ordem ASC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount || 0
    });
  } catch (error) {
    console.error('Erro ao buscar configuração de etapas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuração de etapas' },
      { status: 500 }
    );
  }
}

// POST - Criar atividades automaticamente para uma OPD baseado nas etapas configuradas
export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { numero_opd, data_inicio } = body;

    if (!numero_opd || !data_inicio) {
      return NextResponse.json(
        { success: false, error: 'Número da OPD e data de início são obrigatórios' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Buscar etapas configuradas
    const etapasResult = await client.query(`
      SELECT
        nome_etapa,
        responsavel_padrao,
        dias_padrao,
        requer_formulario,
        tipo_formulario
      FROM configuracao_etapas
      WHERE ativo = TRUE
      ORDER BY ordem ASC
    `);

    const etapas = etapasResult.rows;
    const dataInicio = new Date(data_inicio);
    const atividadesCriadas: Array<any & { dias_acumulados: number }> = [];

    // Buscar próximo ID disponível
    let nextIdResult = await client.query(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
    );
    let nextId = nextIdResult.rows[0].next_id;

    // Criar atividades para cada etapa
    for (const etapa of etapas) {
      const previsaoInicio = new Date(dataInicio);

      // Adicionar dias de acordo com as etapas anteriores
      if (atividadesCriadas.length > 0) {
        const ultimaAtividade = atividadesCriadas[atividadesCriadas.length - 1];
        previsaoInicio.setDate(previsaoInicio.getDate() + ultimaAtividade.dias_acumulados);
      }

      const atividadeResult = await client.query(`
        INSERT INTO registros_atividades (
          id,
          numero_opd,
          atividade,
          responsavel,
          previsao_inicio,
          data_pedido,
          status,
          dias_programados,
          requer_formulario,
          tipo_formulario,
          created,
          updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        nextId,
        numero_opd,
        etapa.nome_etapa,
        etapa.responsavel_padrao,
        previsaoInicio.toISOString(),
        data_inicio,
        'A REALIZAR',
        etapa.dias_padrao,
        etapa.requer_formulario,
        etapa.tipo_formulario,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      atividadesCriadas.push({
        ...atividadeResult.rows[0],
        dias_acumulados: (atividadesCriadas.length > 0
          ? atividadesCriadas[atividadesCriadas.length - 1].dias_acumulados
          : 0) + etapa.dias_padrao
      });

      nextId++;
    }

    // Criar notificação para a primeira atividade
    if (atividadesCriadas.length > 0) {
      const primeiraAtividade = atividadesCriadas[0];

      const emailResult = await client.query(`
        SELECT email, nome
        FROM configuracao_emails
        WHERE responsavel = $1 AND ativo = TRUE
      `, [primeiraAtividade.responsavel]);

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
          numero_opd,
          primeiraAtividade.id,
          email,
          nome,
          `Nova OPD ${numero_opd} criada`,
          `Olá ${nome},\n\nUma nova OPD ${numero_opd} foi criada e a atividade "${primeiraAtividade.atividade}" está aguardando sua ação.\n\nPrevisão de início: ${new Date(primeiraAtividade.previsao_inicio).toLocaleDateString('pt-BR')}`,
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
      data: atividadesCriadas,
      total: atividadesCriadas.length,
      message: `${atividadesCriadas.length} atividades criadas com sucesso`
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar atividades:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar atividades automáticas' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
