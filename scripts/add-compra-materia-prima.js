const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addCompraMateriasPrimaTask() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migração: Adicionando tarefa COMPRA DE MATÉRIA PRIMA...\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query('SELECT numero, data_pedido FROM opds ORDER BY numero');
    console.log(`📋 Encontradas ${opdsResult.rowCount} OPDs para processar\n`);

    let opdsMigradas = 0;
    let opdsComErro = 0;
    let opdsJaTinham = 0;

    for (const opd of opdsResult.rows) {
      try {
        await client.query('BEGIN');

        // Verificar se já tem a tarefa COMPRA DE MATÉRIA PRIMA
        const checkResult = await client.query(
          `SELECT id FROM registros_atividades
           WHERE numero_opd = $1 AND atividade = 'COMPRA DE MATÉRIA PRIMA'`,
          [opd.numero]
        );

        if (checkResult.rowCount > 0) {
          console.log(`✓ OPD ${opd.numero}: Já possui a tarefa COMPRA DE MATÉRIA PRIMA`);
          opdsJaTinham++;
          await client.query('COMMIT');
          continue;
        }

        // Buscar a tarefa REUNIÃO DE START 2 para calcular o offset
        const reuniaoStart2 = await client.query(
          `SELECT previsao_inicio FROM registros_atividades
           WHERE numero_opd = $1 AND atividade = 'REUNIÃO DE START 2'`,
          [opd.numero]
        );

        let previsaoInicio;
        if (reuniaoStart2.rowCount > 0 && reuniaoStart2.rows[0].previsao_inicio) {
          // Se tem a reunião de start 2, adiciona 1 dia após ela
          const dataReuniao = new Date(reuniaoStart2.rows[0].previsao_inicio);
          previsaoInicio = new Date(dataReuniao);
          previsaoInicio.setDate(previsaoInicio.getDate() + 1);
        } else {
          // Fallback: usa data do pedido + 18 dias (offset padrão)
          const baseDate = new Date(opd.data_pedido || new Date());
          previsaoInicio = new Date(baseDate);
          previsaoInicio.setDate(previsaoInicio.getDate() + 18);
        }

        // Buscar próximo ID
        const maxIdResult = await client.query(
          'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
        );
        const nextId = maxIdResult.rows[0].next_id;

        // Inserir a nova tarefa COMPRA DE MATÉRIA PRIMA
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
          opd.numero,
          'COMPRA DE MATÉRIA PRIMA',
          'COMPRAS',
          previsaoInicio.toISOString(),
          opd.data_pedido || new Date().toISOString(),
          'A REALIZAR',
          5, // dias_programados
          null, // parent_id - é uma tarefa principal
          new Date().toISOString(),
          new Date().toISOString()
        ]);

        // Atualizar previsão_inicio das tarefas subsequentes (+5 dias)
        // Lista de tarefas que vêm após COMPRA DE MATÉRIA PRIMA
        const tarefasSubsequentes = [
          'PROGRAMAÇÃO DAS LINHAS',
          'RESERVAS DE COMP/FAB',
          'IMPRIMIR LISTAS E PLANOS',
          'ASSINATURA DOS PLANOS DE CORTE',
          'IMPRIMIR OF/ETIQUETA',
          'PROGRAMAÇÃO DE CORTE',
          "ENTREGAR OF'S/LISTAS PARA ALMOX",
          'PRODUÇÃO',
          'EXPEDIÇÃO',
          'DESEMBARQUE E PRÉ INSTALAÇÃO',
          'LIBERAÇÃO E EMBARQUE',
          'INSTALAÇÃO E ENTREGA'
        ];

        for (const tarefa of tarefasSubsequentes) {
          await client.query(`
            UPDATE registros_atividades
            SET previsao_inicio = previsao_inicio + INTERVAL '5 days',
                updated = $1
            WHERE numero_opd = $2
              AND atividade = $3
              AND previsao_inicio IS NOT NULL
          `, [new Date().toISOString(), opd.numero, tarefa]);
        }

        // Atualizar subtarefas de PRODUÇÃO também
        await client.query(`
          UPDATE registros_atividades ra
          SET previsao_inicio = ra.previsao_inicio + INTERVAL '5 days',
              updated = $1
          FROM registros_atividades ra_parent
          WHERE ra.parent_id = ra_parent.id
            AND ra_parent.numero_opd = $2
            AND ra_parent.atividade = 'PRODUÇÃO'
            AND ra.previsao_inicio IS NOT NULL
        `, [new Date().toISOString(), opd.numero]);

        await client.query('COMMIT');
        console.log(`✓ OPD ${opd.numero}: Tarefa adicionada com sucesso`);
        opdsMigradas++;

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ OPD ${opd.numero}: Erro ao processar - ${error.message}`);
        opdsComErro++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA MIGRAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✓ OPDs migradas com sucesso: ${opdsMigradas}`);
    console.log(`✓ OPDs que já tinham a tarefa: ${opdsJaTinham}`);
    console.log(`✗ OPDs com erro: ${opdsComErro}`);
    console.log(`📋 Total processado: ${opdsResult.rowCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Migração concluída!\n');

  } catch (error) {
    console.error('❌ Erro geral na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar a migração
addCompraMateriasPrimaTask()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha na execução:', error);
    process.exit(1);
  });
