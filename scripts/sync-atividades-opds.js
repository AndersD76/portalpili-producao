require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Lista completa de atividades principais (sincronizada com atividadesPadrao.ts)
const ATIVIDADES_PRINCIPAIS = [
  { atividade: 'LIBERAÇÃO FINANCEIRA', responsavel: 'FINANCEIRO', ordem: 1, dias_programados: 1 },
  { atividade: 'LIBERAÇÃO COMERCIAL', responsavel: 'COMERCIAL', ordem: 2, dias_programados: 1 },
  { atividade: 'CRIAÇÃO DA OPD', responsavel: 'PCP', ordem: 3, dias_programados: 1 },
  { atividade: 'DEFINIÇÃO DA OBRA CIVIL', responsavel: 'PCP', ordem: 4, dias_programados: 2 },
  { atividade: 'REUNIÃO DE START 1', responsavel: 'PCP', ordem: 5, dias_programados: 1 },
  { atividade: 'ENGENHARIA (MEC)', responsavel: 'ENGENHARIA (MEC)', ordem: 6, dias_programados: 5 },
  { atividade: 'ENGENHARIA (ELE/HID)', responsavel: 'ENGENHARIA (ELE/HID)', ordem: 7, dias_programados: 5 },
  { atividade: 'REVISÃO FINAL DE PROJETOS', responsavel: 'PCP', ordem: 8, dias_programados: 2 },
  { atividade: 'REUNIÃO DE START 2', responsavel: 'PCP', ordem: 9, dias_programados: 1 },
  { atividade: 'PROGRAMAÇÃO DAS LINHAS', responsavel: 'PCP', ordem: 10, dias_programados: 1 },
  { atividade: 'RESERVAS DE COMP/FAB', responsavel: 'PCP', ordem: 11, dias_programados: 2 },
  { atividade: 'IMPRIMIR LISTAS E PLANOS', responsavel: 'PCP', ordem: 12, dias_programados: 1 },
  { atividade: 'ASSINATURA DOS PLANOS DE CORTE', responsavel: 'ENGENHARIA', ordem: 13, dias_programados: 1 },
  { atividade: 'IMPRIMIR OF/ETIQUETA', responsavel: 'PCP', ordem: 14, dias_programados: 1 },
  { atividade: 'PROGRAMAÇÃO DE CORTE', responsavel: 'PCP', ordem: 15, dias_programados: 1 },
  { atividade: "ENTREGAR OF'S/LISTAS PARA ALMOX", responsavel: 'PCP', ordem: 16, dias_programados: 1 },
  { atividade: 'PRODUÇÃO', responsavel: 'PRODUÇÃO', ordem: 17, dias_programados: 42 },
  { atividade: 'EXPEDIÇÃO', responsavel: 'EXPEDIÇÃO', ordem: 18, dias_programados: 2 },
  { atividade: 'LIBERAÇÃO E EMBARQUE', responsavel: 'EXPEDIÇÃO', ordem: 19, dias_programados: 1 },
  { atividade: 'PREPARAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 20, dias_programados: 2 },
  { atividade: 'DESEMBARQUE E PRÉ-INSTALAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 21, dias_programados: 3 },
  { atividade: 'ENTREGA', responsavel: 'INSTALAÇÃO', ordem: 22, dias_programados: 5 }
];

// Subtarefas de PRODUÇÃO
const SUBTAREFAS_PRODUCAO = [
  { atividade: 'CORTE', responsavel: 'CORTE', ordem: 1 },
  { atividade: 'MONTAGEM SUPERIOR E ESQUADRO', responsavel: 'MONTAGEM', ordem: 2 },
  { atividade: 'CENTRAL HIDRÁULICA (SETOR HIDRÁULICA)', responsavel: 'HIDRÁULICA', ordem: 3 },
  { atividade: 'SOLDA LADO 01', responsavel: 'SOLDAGEM', ordem: 4 },
  { atividade: 'SOLDA LADO 02', responsavel: 'SOLDAGEM', ordem: 5 },
  { atividade: 'MONTAGEM E SOLDA INFERIOR', responsavel: 'MONTAGEM', ordem: 6 },
  { atividade: 'MONTAGEM ELÉTRICA/HIDRÁULICO', responsavel: 'MONTAGEM', ordem: 7 },
  { atividade: 'MONTAGEM DAS CALHAS', responsavel: 'MONTAGEM', ordem: 8 },
  { atividade: 'TRAVADOR DE RODAS LATERAL MÓVEL', responsavel: 'MONTAGEM', ordem: 9 },
  { atividade: 'CAIXA DO TRAVA CHASSI', responsavel: 'MONTAGEM', ordem: 10 },
  { atividade: 'TRAVA CHASSI', responsavel: 'MONTAGEM', ordem: 11 },
  { atividade: 'CAVALETE DO TRAVA CHASSI', responsavel: 'MONTAGEM', ordem: 12 },
  { atividade: 'CENTRAL HIDRÁULICA (SETOR SUBCONJUNTOS)', responsavel: 'SUBCONJUNTOS', ordem: 13 },
  { atividade: 'PAINEL ELÉTRICO', responsavel: 'ELÉTRICA', ordem: 14 },
  { atividade: 'PEDESTAIS', responsavel: 'MONTAGEM', ordem: 15 },
  { atividade: 'SOB PLATAFORMA', responsavel: 'MONTAGEM', ordem: 16 },
  { atividade: 'SOLDA INFERIOR', responsavel: 'SOLDAGEM', ordem: 17 },
  { atividade: 'BRAÇOS', responsavel: 'MONTAGEM', ordem: 18 },
  { atividade: 'RAMPAS', responsavel: 'MONTAGEM', ordem: 19 },
  { atividade: 'PINTURA E PREPARAÇÃO DA PLATAFORMA', responsavel: 'PINTURA', ordem: 20 },
  { atividade: 'MONTAGEM HIDRÁULICA ELÉTRICA SOB PLATAFORMA', responsavel: 'MONTAGEM', ordem: 21 }
];

async function syncAtividadesOPDs() {
  const client = await pool.connect();

  try {
    console.log('========================================');
    console.log('SINCRONIZAÇÃO DE ATIVIDADES DAS OPDs');
    console.log('========================================\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query('SELECT numero, data_pedido FROM opds ORDER BY numero');
    const opds = opdsResult.rows;

    console.log(`Total de OPDs encontradas: ${opds.length}\n`);

    let totalAdicionadas = 0;

    for (const opd of opds) {
      console.log(`\n--- Processando OPD: ${opd.numero} ---`);

      // Buscar atividades existentes da OPD
      const existingResult = await client.query(
        'SELECT id, atividade, parent_id FROM registros_atividades WHERE numero_opd = $1',
        [opd.numero]
      );

      const existingActivities = existingResult.rows.map(r => r.atividade.toUpperCase().trim());
      const existingMap = {};
      existingResult.rows.forEach(r => {
        existingMap[r.atividade.toUpperCase().trim()] = r.id;
      });

      const baseDate = new Date(opd.data_pedido || new Date());
      let addedCount = 0;

      await client.query('BEGIN');

      try {
        // Verificar e adicionar atividades principais faltantes
        for (const task of ATIVIDADES_PRINCIPAIS) {
          const taskName = task.atividade.toUpperCase().trim();

          if (!existingActivities.includes(taskName)) {
            const previsao = new Date(baseDate);
            previsao.setDate(previsao.getDate() + task.ordem);

            const maxIdResult = await client.query(
              'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
            );
            const nextId = maxIdResult.rows[0].next_id;

            await client.query(`
              INSERT INTO registros_atividades (
                id, numero_opd, atividade, responsavel, previsao_inicio,
                data_pedido, status, dias_programados, parent_id, created, updated
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

            // Atualizar o mapa
            existingMap[taskName] = nextId;
            existingActivities.push(taskName);
            addedCount++;
            console.log(`  + Adicionada: ${task.atividade}`);
          }
        }

        // Buscar ID da PRODUÇÃO para as subtarefas
        let producaoId = existingMap['PRODUÇÃO'];

        if (!producaoId) {
          // Buscar novamente caso tenha sido criada
          const prodResult = await client.query(
            "SELECT id FROM registros_atividades WHERE numero_opd = $1 AND UPPER(atividade) = 'PRODUÇÃO'",
            [opd.numero]
          );
          if (prodResult.rows.length > 0) {
            producaoId = prodResult.rows[0].id;
          }
        }

        // Adicionar subtarefas de PRODUÇÃO faltantes
        if (producaoId) {
          // Buscar subtarefas existentes
          const existingSubtasksResult = await client.query(
            'SELECT atividade FROM registros_atividades WHERE numero_opd = $1 AND parent_id = $2',
            [opd.numero, producaoId]
          );
          const existingSubtasks = existingSubtasksResult.rows.map(r => r.atividade.toUpperCase().trim());

          for (const subtask of SUBTAREFAS_PRODUCAO) {
            const subtaskName = subtask.atividade.toUpperCase().trim();

            if (!existingSubtasks.includes(subtaskName)) {
              const previsao = new Date(baseDate);
              previsao.setDate(previsao.getDate() + 26 + (subtask.ordem * 2)); // Offset de PRODUÇÃO + ordem

              const maxIdResult = await client.query(
                'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
              );
              const nextId = maxIdResult.rows[0].next_id;

              await client.query(`
                INSERT INTO registros_atividades (
                  id, numero_opd, atividade, responsavel, previsao_inicio,
                  data_pedido, status, dias_programados, parent_id, created, updated
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `, [
                nextId,
                opd.numero,
                subtask.atividade,
                subtask.responsavel,
                previsao.toISOString(),
                opd.data_pedido || new Date().toISOString(),
                'A REALIZAR',
                2,
                producaoId,
                new Date().toISOString(),
                new Date().toISOString()
              ]);

              addedCount++;
              console.log(`    + Subtarefa: ${subtask.atividade}`);
            }
          }
        }

        await client.query('COMMIT');

        if (addedCount > 0) {
          console.log(`  ✓ ${addedCount} atividade(s) adicionada(s)`);
          totalAdicionadas += addedCount;
        } else {
          console.log(`  ✓ Todas atividades já existem`);
        }

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Erro: ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log('SINCRONIZAÇÃO CONCLUÍDA');
    console.log(`Total de atividades adicionadas: ${totalAdicionadas}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncAtividadesOPDs();
