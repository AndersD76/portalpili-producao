require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixAtividadesOrder() {
  const client = await pool.connect();

  try {
    console.log('=== Correção de Atividades OPD ===\n');

    // 1. Renomear LIBERAÇÃO FINANCEIRA para LIBERAÇÃO COMERCIAL
    console.log('1. Renomeando LIBERAÇÃO FINANCEIRA para LIBERAÇÃO COMERCIAL...');
    const renameFinanceiraResult = await client.query(`
      UPDATE registros_atividades
      SET atividade = 'LIBERAÇÃO COMERCIAL',
          responsavel = 'COMERCIAL',
          updated = NOW()
      WHERE UPPER(atividade) = 'LIBERAÇÃO FINANCEIRA'
      RETURNING numero_opd
    `);
    console.log(`   ${renameFinanceiraResult.rowCount} atividades renomeadas.\n`);

    // 2. Renomear INSTALAÇÃO E ENTREGA para INSTALAÇÃO
    console.log('2. Renomeando INSTALAÇÃO E ENTREGA para INSTALAÇÃO...');
    const renameInstalacaoResult = await client.query(`
      UPDATE registros_atividades
      SET atividade = 'INSTALAÇÃO',
          updated = NOW()
      WHERE UPPER(atividade) = 'INSTALAÇÃO E ENTREGA'
      RETURNING numero_opd
    `);
    console.log(`   ${renameInstalacaoResult.rowCount} atividades renomeadas.\n`);

    // 3. Buscar todas as OPDs para criar atividades faltantes e ajustar ordem
    console.log('3. Buscando OPDs para adicionar atividades faltantes...\n');
    const opdsResult = await client.query(`
      SELECT DISTINCT numero_opd FROM registros_atividades ORDER BY numero_opd
    `);

    let preparacaoAdded = 0;
    let entregaAdded = 0;
    let orderFixed = 0;

    for (const opdRow of opdsResult.rows) {
      const numeroOpd = opdRow.numero_opd;

      // Buscar data base da PRODUÇÃO para calcular as datas das atividades finais
      const producaoResult = await client.query(`
        SELECT previsao_inicio, data_pedido FROM registros_atividades
        WHERE numero_opd = $1
        AND UPPER(atividade) = 'PRODUÇÃO'
        AND parent_id IS NULL
        LIMIT 1
      `, [numeroOpd]);

      if (producaoResult.rows.length === 0) {
        console.log(`   OPD ${numeroOpd}: Sem atividade PRODUÇÃO, pulando...`);
        continue;
      }

      const producaoData = producaoResult.rows[0].previsao_inicio;
      const dataPedido = producaoResult.rows[0].data_pedido;

      if (!producaoData) {
        console.log(`   OPD ${numeroOpd}: Data da PRODUÇÃO não definida, pulando...`);
        continue;
      }

      // Calcular datas baseadas na data da produção (42 dias após produção = dia 73)
      const baseDate = new Date(producaoData);
      const dia73 = new Date(baseDate);
      dia73.setDate(baseDate.getDate() + 42); // PREPARAÇÃO

      // Verificar se PREPARAÇÃO existe
      const prepExistResult = await client.query(`
        SELECT id FROM registros_atividades
        WHERE numero_opd = $1 AND UPPER(atividade) = 'PREPARAÇÃO'
      `, [numeroOpd]);

      if (prepExistResult.rows.length === 0) {
        // Buscar próximo ID
        const maxIdResult = await client.query(
          'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
        );
        const nextId = maxIdResult.rows[0].next_id;

        await client.query(`
          INSERT INTO registros_atividades (
            id, numero_opd, atividade, responsavel, previsao_inicio, data_pedido,
            status, dias_programados, parent_id, created, updated
          ) VALUES ($1, $2, 'PREPARAÇÃO', 'INSTALAÇÃO', $3, $4, 'A REALIZAR', 2, NULL, NOW(), NOW())
        `, [nextId, numeroOpd, dia73.toISOString(), dataPedido]);
        preparacaoAdded++;
      }

      // Verificar se ENTREGA existe (separada de INSTALAÇÃO)
      const entregaExistResult = await client.query(`
        SELECT id FROM registros_atividades
        WHERE numero_opd = $1 AND UPPER(atividade) = 'ENTREGA' AND UPPER(responsavel) = 'INSTALAÇÃO'
      `, [numeroOpd]);

      if (entregaExistResult.rows.length === 0) {
        // Buscar próximo ID
        const maxIdResult = await client.query(
          'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
        );
        const nextId = maxIdResult.rows[0].next_id;

        const dia83 = new Date(baseDate);
        dia83.setDate(baseDate.getDate() + 52); // ENTREGA (10 dias após produção final)

        await client.query(`
          INSERT INTO registros_atividades (
            id, numero_opd, atividade, responsavel, previsao_inicio, data_pedido,
            status, dias_programados, parent_id, created, updated
          ) VALUES ($1, $2, 'ENTREGA', 'INSTALAÇÃO', $3, $4, 'A REALIZAR', 2, NULL, NOW(), NOW())
        `, [nextId, numeroOpd, dia83.toISOString(), dataPedido]);
        entregaAdded++;
      }

      // Agora ajustar a ordem das atividades finais
      // Nova ordem: PREPARAÇÃO -> LIBERAÇÃO E EMBARQUE -> EXPEDIÇÃO -> DESEMBARQUE -> INSTALAÇÃO -> ENTREGA

      // Buscar datas atuais para calcular nova sequência
      const atividadesFinaisResult = await client.query(`
        SELECT id, atividade, previsao_inicio, responsavel
        FROM registros_atividades
        WHERE numero_opd = $1
        AND UPPER(atividade) IN ('PREPARAÇÃO', 'LIBERAÇÃO E EMBARQUE', 'EXPEDIÇÃO', 'DESEMBARQUE E PRÉ INSTALAÇÃO', 'DESEMBARQUE E PRÉ-INSTALAÇÃO', 'INSTALAÇÃO', 'ENTREGA')
        AND parent_id IS NULL
        ORDER BY previsao_inicio
      `, [numeroOpd]);

      if (atividadesFinaisResult.rows.length > 0) {
        // Usar a menor data como base para reordenar
        const primeiraData = new Date(atividadesFinaisResult.rows[0].previsao_inicio || dia73);

        // Definir nova ordem com intervalos de 2 dias
        const novaOrdem = [
          { nome: 'PREPARAÇÃO', dias: 0, responsavel: 'INSTALAÇÃO' },
          { nome: 'LIBERAÇÃO E EMBARQUE', dias: 2, responsavel: 'QUALIDADE' },
          { nome: 'EXPEDIÇÃO', dias: 3, responsavel: 'EXPEDIÇÃO' },
          { nome: 'DESEMBARQUE E PRÉ-INSTALAÇÃO', dias: 5, responsavel: 'INSTALAÇÃO' },
          { nome: 'INSTALAÇÃO', dias: 7, responsavel: 'MONTAGEM' },
          { nome: 'ENTREGA', dias: 10, responsavel: 'INSTALAÇÃO' }
        ];

        for (const item of novaOrdem) {
          const novaData = new Date(primeiraData);
          novaData.setDate(primeiraData.getDate() + item.dias);

          // Atualizar tanto a versão com hífen quanto sem
          const updateResult = await client.query(`
            UPDATE registros_atividades
            SET previsao_inicio = $1,
                responsavel = $2,
                updated = NOW()
            WHERE numero_opd = $3
            AND (UPPER(atividade) = UPPER($4) OR UPPER(atividade) = UPPER($5))
            AND parent_id IS NULL
          `, [
            novaData.toISOString(),
            item.responsavel,
            numeroOpd,
            item.nome,
            item.nome.replace('-', ' ') // Versão sem hífen
          ]);

          if (updateResult.rowCount > 0) {
            orderFixed++;
          }
        }

        // Corrigir nome DESEMBARQUE E PRÉ INSTALAÇÃO para DESEMBARQUE E PRÉ-INSTALAÇÃO
        await client.query(`
          UPDATE registros_atividades
          SET atividade = 'DESEMBARQUE E PRÉ-INSTALAÇÃO',
              updated = NOW()
          WHERE numero_opd = $1
          AND UPPER(atividade) = 'DESEMBARQUE E PRÉ INSTALAÇÃO'
        `, [numeroOpd]);
      }

      console.log(`   OPD ${numeroOpd}: Processada`);
    }

    console.log('\n=== Resumo ===');
    console.log(`LIBERAÇÃO FINANCEIRA -> COMERCIAL: ${renameFinanceiraResult.rowCount}`);
    console.log(`INSTALAÇÃO E ENTREGA -> INSTALAÇÃO: ${renameInstalacaoResult.rowCount}`);
    console.log(`PREPARAÇÃO adicionadas: ${preparacaoAdded}`);
    console.log(`ENTREGA adicionadas: ${entregaAdded}`);
    console.log(`Atividades reordenadas: ${orderFixed}`);
    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAtividadesOrder();
