import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.opd,
        o.numero,
        o.cliente,
        o.data_pedido,
        o.previsao_inicio,
        o.previsao_termino,
        o.data_entrega,
        o.inicio_producao,
        o.tipo_opd,
        o.responsavel_opd,
        o.atividades_opd,
        o.anexo_pedido,
        o.registros_atividade,
        o.created,
        o.updated,
        COUNT(a.id) as total_atividades,
        COUNT(CASE WHEN a.status = 'CONCLUÍDA' THEN 1 END) as atividades_concluidas,
        COUNT(CASE WHEN a.status = 'EM ANDAMENTO' THEN 1 END) as atividades_em_andamento,
        COUNT(CASE WHEN a.status = 'A REALIZAR' THEN 1 END) as atividades_a_realizar,
        CASE
          WHEN COUNT(a.id) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN a.status = 'CONCLUÍDA' THEN 1 END)::numeric / COUNT(a.id)::numeric) * 100)
        END as percentual_conclusao
      FROM opds o
      LEFT JOIN registros_atividades a ON o.numero = a.numero_opd
      GROUP BY o.id, o.opd, o.numero, o.cliente, o.data_pedido, o.previsao_inicio, o.previsao_termino,
               o.data_entrega, o.inicio_producao, o.tipo_opd, o.responsavel_opd, o.atividades_opd,
               o.anexo_pedido, o.registros_atividade, o.created, o.updated
      ORDER BY o.numero DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao buscar OPDs:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar OPDs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      numero,
      cliente,
      data_pedido,
      previsao_inicio,
      previsao_termino,
      data_entrega,
      inicio_producao,
      tipo_opd,
      responsavel_opd,
      atividades_opd,
      anexo_pedido
    } = body;

    // Validação básica
    if (!numero) {
      return NextResponse.json(
        { success: false, error: 'Número da OPD é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma OPD com este número
    const existingOpd = await client.query(
      'SELECT id FROM opds WHERE numero = $1',
      [numero]
    );

    if (existingOpd.rowCount && existingOpd.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma OPD com este número' },
        { status: 409 }
      );
    }

    await client.query('BEGIN');

    // Criar a OPD
    const result = await client.query(`
      INSERT INTO opds (
        numero,
        cliente,
        data_pedido,
        previsao_inicio,
        previsao_termino,
        data_entrega,
        inicio_producao,
        tipo_opd,
        responsavel_opd,
        atividades_opd,
        anexo_pedido,
        created,
        updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      numero,
      cliente || null,
      data_pedido || null,
      previsao_inicio || null,
      previsao_termino || null,
      data_entrega || null,
      inicio_producao || null,
      tipo_opd || null,
      responsavel_opd || null,
      atividades_opd || null,
      anexo_pedido || null,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    // Criar todas as atividades padrão da OPD
    const baseDate = new Date(data_pedido || new Date());

    // Definir todas as tarefas principais (sem parent_id)
    const mainTasks = [
      { atividade: 'LIBERAÇÃO FINANCEIRA', responsavel: 'FINANCEIRO', daysOffset: 0, dias_programados: 1 },
      { atividade: 'CRIAÇÃO DA OPD', responsavel: 'PCP', daysOffset: 1, dias_programados: 1 },
      { atividade: 'DEFINIÇÃO DA OBRA CIVIL', responsavel: 'ENGENHARIA', daysOffset: 2, dias_programados: 2 },
      { atividade: 'REUNIÃO DE START 1', responsavel: 'COMERCIAL', daysOffset: 4, dias_programados: 1 },
      { atividade: 'ENGENHARIA (MEC)', responsavel: 'ENGENHARIA', daysOffset: 5, dias_programados: 5 },
      { atividade: 'ENGENHARIA (ELE/HID)', responsavel: 'ENGENHARIA', daysOffset: 10, dias_programados: 5 },
      { atividade: 'REVISÃO FINAL DE PROJETOS', responsavel: 'ENGENHARIA', daysOffset: 15, dias_programados: 2 },
      { atividade: 'REUNIÃO DE START 2', responsavel: 'COMERCIAL', daysOffset: 17, dias_programados: 1 },
      { atividade: 'PROGRAMAÇÃO DAS LINHAS', responsavel: 'PCP', daysOffset: 18, dias_programados: 1 },
      { atividade: 'RESERVAS DE COMP/FAB', responsavel: 'ALMOXARIFADO', daysOffset: 19, dias_programados: 2 },
      { atividade: 'IMPRIMIR LISTAS E PLANOS', responsavel: 'PCP', daysOffset: 21, dias_programados: 1 },
      { atividade: 'ASSINATURA DOS PLANOS DE CORTE', responsavel: 'ENGENHARIA', daysOffset: 22, dias_programados: 1 },
      { atividade: 'IMPRIMIR OF/ETIQUETA', responsavel: 'PCP', daysOffset: 23, dias_programados: 1 },
      { atividade: 'PROGRAMAÇÃO DE CORTE', responsavel: 'PCP', daysOffset: 24, dias_programados: 1 },
      { atividade: "ENTREGAR OF'S/LISTAS PARA ALMOX", responsavel: 'PCP', daysOffset: 25, dias_programados: 1 },
      { atividade: 'PRODUÇÃO', responsavel: 'PRODUÇÃO', daysOffset: 26, dias_programados: 42 }, // Tarefa pai das subtarefas
      { atividade: 'EXPEDIÇÃO', responsavel: 'EXPEDIÇÃO', daysOffset: 68, dias_programados: 2 },
      { atividade: 'DESEMBARQUE E PRÉ INSTALAÇÃO', responsavel: 'MONTAGEM', daysOffset: 70, dias_programados: 3 },
      { atividade: 'LIBERAÇÃO E EMBARQUE', responsavel: 'QUALIDADE', daysOffset: 73, dias_programados: 1 },
      { atividade: 'INSTALAÇÃO E ENTREGA', responsavel: 'MONTAGEM', daysOffset: 74, dias_programados: 5 }
    ];

    let producaoId = null;

    // Criar tarefas principais
    for (const task of mainTasks) {
      const previsao = new Date(baseDate);
      previsao.setDate(previsao.getDate() + task.daysOffset);

      // Buscar próximo ID
      const maxIdResult = await client.query(
        'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
      );
      const nextId = maxIdResult.rows[0].next_id;

      // Guardar ID da PRODUÇÃO para usar nas subtarefas
      if (task.atividade === 'PRODUÇÃO') {
        producaoId = nextId;
      }

      await client.query(`
        INSERT INTO registros_atividades (
          id,
          numero_opd,
          atividade,
          responsavel,
          previsao_inicio,
          data_pedido,
          status,
          dias_programados,
          parent_id,
          created,
          updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        nextId,
        numero,
        task.atividade,
        task.responsavel,
        previsao.toISOString(),
        data_pedido || new Date().toISOString(),
        'A REALIZAR',
        task.dias_programados,
        null, // Tarefas principais não têm parent_id
        new Date().toISOString(),
        new Date().toISOString()
      ]);
    }

    // Criar subtarefas de PRODUÇÃO
    const producaoSubtasks = [
      { atividade: 'CORTE', responsavel: 'CORTE', daysOffset: 26 },
      { atividade: 'MONTAGEM SUPERIOR E ESQUADRO', responsavel: 'MONTAGEM', daysOffset: 28 },
      { atividade: 'CENTRAL HIDRÁULICA (SETOR HIDRÁULICA)', responsavel: 'HIDRÁULICA', daysOffset: 30 },
      { atividade: 'SOLDA LADO 01', responsavel: 'SOLDAGEM', daysOffset: 32 },
      { atividade: 'SOLDA LADO 02', responsavel: 'SOLDAGEM', daysOffset: 34 },
      { atividade: 'MONTAGEM E SOLDA INFERIOR', responsavel: 'MONTAGEM', daysOffset: 36 },
      { atividade: 'MONTAGEM ELÉTRICA/HIDRÁULICO', responsavel: 'MONTAGEM', daysOffset: 38 },
      { atividade: 'MONTAGEM DAS CALHAS', responsavel: 'MONTAGEM', daysOffset: 40 },
      { atividade: 'TRAVADOR DE RODAS LATERAL MÓVEL', responsavel: 'MONTAGEM', daysOffset: 42 },
      { atividade: 'CAIXA DO TRAVA CHASSI', responsavel: 'MONTAGEM', daysOffset: 44 },
      { atividade: 'TRAVA CHASSI', responsavel: 'MONTAGEM', daysOffset: 46 },
      { atividade: 'CAVALETE DO TRAVA CHASSI', responsavel: 'MONTAGEM', daysOffset: 48 },
      { atividade: 'CENTRAL HIDRÁULICA (SETOR SUBCONJUNTOS)', responsavel: 'SUBCONJUNTOS', daysOffset: 50 },
      { atividade: 'PAINEL ELÉTRICO', responsavel: 'ELÉTRICA', daysOffset: 52 },
      { atividade: 'PEDESTAIS', responsavel: 'MONTAGEM', daysOffset: 54 },
      { atividade: 'SOB PLATAFORMA', responsavel: 'MONTAGEM', daysOffset: 56 },
      { atividade: 'SOLDA INFERIOR', responsavel: 'SOLDAGEM', daysOffset: 58 },
      { atividade: 'BRAÇOS', responsavel: 'MONTAGEM', daysOffset: 60 },
      { atividade: 'RAMPAS', responsavel: 'MONTAGEM', daysOffset: 62 },
      { atividade: 'PINTURA E PREPARAÇÃO DA PLATAFORMA', responsavel: 'PINTURA', daysOffset: 64 },
      { atividade: 'MONTAGEM HIDRÁULICA ELÉTRICA SOB PLATAFORMA', responsavel: 'MONTAGEM', daysOffset: 66 }
    ];

    for (const task of producaoSubtasks) {
      const previsao = new Date(baseDate);
      previsao.setDate(previsao.getDate() + task.daysOffset);

      // Buscar próximo ID
      const maxIdResult = await client.query(
        'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
      );
      const nextId = maxIdResult.rows[0].next_id;

      await client.query(`
        INSERT INTO registros_atividades (
          id,
          numero_opd,
          atividade,
          responsavel,
          previsao_inicio,
          data_pedido,
          status,
          dias_programados,
          parent_id,
          created,
          updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        nextId,
        numero,
        task.atividade,
        task.responsavel,
        previsao.toISOString(),
        data_pedido || new Date().toISOString(),
        'A REALIZAR',
        2, // dias_programados para cada subtarefa
        producaoId, // parent_id - todas são subtarefas de PRODUÇÃO
        new Date().toISOString(),
        new Date().toISOString()
      ]);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'OPD criada com sucesso com todas as atividades padrão'
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar OPD:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar OPD' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
