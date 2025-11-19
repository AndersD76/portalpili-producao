require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addTasksToExistingOPDs() {
  const client = await pool.connect();

  try {
    console.log('Iniciando adição de atividades às OPDs existentes...\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query('SELECT numero, data_pedido FROM opds ORDER BY numero');
    const opds = opdsResult.rows;

    console.log(`Total de OPDs encontradas: ${opds.length}\n`);

    for (const opd of opds) {
      console.log(`\n========================================`);
      console.log(`Processando OPD: ${opd.numero}`);
      console.log(`========================================`);

      // Verificar se a OPD já tem atividades
      const existingTasksResult = await client.query(
        'SELECT COUNT(*) as count FROM registros_atividades WHERE numero_opd = $1',
        [opd.numero]
      );
      const existingCount = parseInt(existingTasksResult.rows[0].count);

      if (existingCount >= 41) {
        console.log(`✓ OPD ${opd.numero} já possui ${existingCount} atividades. Pulando...`);
        continue;
      }

      console.log(`→ OPD ${opd.numero} possui apenas ${existingCount} atividades. Adicionando tarefas padrão...`);

      await client.query('BEGIN');

      try {
        const baseDate = new Date(opd.data_pedido || new Date());

        // Definir todas as tarefas principais
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
          { atividade: 'PRODUÇÃO', responsavel: 'PRODUÇÃO', daysOffset: 26, dias_programados: 42 },
          { atividade: 'EXPEDIÇÃO', responsavel: 'EXPEDIÇÃO', daysOffset: 68, dias_programados: 2 },
          { atividade: 'DESEMBARQUE E PRÉ INSTALAÇÃO', responsavel: 'MONTAGEM', daysOffset: 70, dias_programados: 3 },
          { atividade: 'LIBERAÇÃO E EMBARQUE', responsavel: 'QUALIDADE', daysOffset: 73, dias_programados: 1 },
          { atividade: 'INSTALAÇÃO E ENTREGA', responsavel: 'MONTAGEM', daysOffset: 74, dias_programados: 5 }
        ];

        let producaoId = null;
        let createdCount = 0;

        // Criar tarefas principais
        for (const task of mainTasks) {
          // Verificar se a tarefa já existe
          const existingTask = await client.query(
            'SELECT id FROM registros_atividades WHERE numero_opd = $1 AND atividade = $2',
            [opd.numero, task.atividade]
          );

          if (existingTask.rows.length > 0) {
            if (task.atividade === 'PRODUÇÃO') {
              producaoId = existingTask.rows[0].id;
            }
            console.log(`  - ${task.atividade}: já existe`);
            continue;
          }

          const previsao = new Date(baseDate);
          previsao.setDate(previsao.getDate() + task.daysOffset);

          const maxIdResult = await client.query(
            'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
          );
          const nextId = maxIdResult.rows[0].next_id;

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
            opd.numero,
            task.atividade,
            task.responsavel,
            previsao.toISOString(),
            opd.data_pedido || new Date().toISOString(),
            'A REALIZAR',
            task.dias_programados,
            null,
            new Date().toISOString(),
            new Date().toISOString()
          ]);

          createdCount++;
          console.log(`  + ${task.atividade}: criada`);
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
          // Verificar se a subtarefa já existe
          const existingSubtask = await client.query(
            'SELECT id FROM registros_atividades WHERE numero_opd = $1 AND atividade = $2 AND parent_id = $3',
            [opd.numero, task.atividade, producaoId]
          );

          if (existingSubtask.rows.length > 0) {
            console.log(`    - ${task.atividade}: já existe`);
            continue;
          }

          const previsao = new Date(baseDate);
          previsao.setDate(previsao.getDate() + task.daysOffset);

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
            opd.numero,
            task.atividade,
            task.responsavel,
            previsao.toISOString(),
            opd.data_pedido || new Date().toISOString(),
            'A REALIZAR',
            2,
            producaoId,
            new Date().toISOString(),
            new Date().toISOString()
          ]);

          createdCount++;
          console.log(`    + ${task.atividade}: criada`);
        }

        await client.query('COMMIT');
        console.log(`\n✓ OPD ${opd.numero}: ${createdCount} novas atividades criadas com sucesso!`);

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Erro ao processar OPD ${opd.numero}:`, error.message);
      }
    }

    console.log('\n========================================');
    console.log('Processamento concluído!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addTasksToExistingOPDs();
