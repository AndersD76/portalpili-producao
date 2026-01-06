require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Lista de atividades padrão com visivel_cq (sincronizada com atividadesPadrao.ts)
const ATIVIDADES_PADRAO = [
  { atividade: 'LIBERAÇÃO FINANCEIRA', responsavel: 'FINANCEIRO', ordem: 1, visivel_cq: false },
  { atividade: 'LIBERAÇÃO COMERCIAL', responsavel: 'COMERCIAL', ordem: 2, visivel_cq: false },
  { atividade: 'CRIAÇÃO DA OPD', responsavel: 'PCP', ordem: 3, visivel_cq: false },
  { atividade: 'DEFINIÇÃO DA OBRA CIVIL', responsavel: 'PCP', ordem: 4, visivel_cq: false },
  { atividade: 'REUNIÃO DE START 1', responsavel: 'PCP', ordem: 5, visivel_cq: false },
  { atividade: 'ENGENHARIA (MEC)', responsavel: 'ENGENHARIA (MEC)', ordem: 6, visivel_cq: false },
  { atividade: 'ENGENHARIA (ELE/HID)', responsavel: 'ENGENHARIA (ELE/HID)', ordem: 7, visivel_cq: false },
  { atividade: 'REVISÃO FINAL DE PROJETOS', responsavel: 'PCP', ordem: 8, visivel_cq: false },
  { atividade: 'REUNIÃO DE START 2', responsavel: 'PCP', ordem: 9, visivel_cq: false },
  { atividade: 'PROGRAMAÇÃO DAS LINHAS', responsavel: 'PCP', ordem: 10, visivel_cq: false },
  { atividade: 'RESERVAS DE COMP/FAB', responsavel: 'PCP', ordem: 11, visivel_cq: false },
  { atividade: 'IMPRIMIR LISTAS E PLANOS', responsavel: 'PCP', ordem: 12, visivel_cq: false },
  { atividade: 'ASSINATURA DOS PLANOS DE CORTE', responsavel: 'ENGENHARIA', ordem: 13, visivel_cq: false },
  { atividade: 'IMPRIMIR OF/ETIQUETA', responsavel: 'PCP', ordem: 14, visivel_cq: false },
  { atividade: 'PROGRAMAÇÃO DE CORTE', responsavel: 'PCP', ordem: 15, visivel_cq: false },
  { atividade: "ENTREGAR OF'S/LISTAS PARA ALMOX", responsavel: 'PCP', ordem: 16, visivel_cq: false },
  { atividade: 'PRODUÇÃO', responsavel: 'PRODUÇÃO', ordem: 17, visivel_cq: true },
  { atividade: 'EXPEDIÇÃO', responsavel: 'EXPEDIÇÃO', ordem: 18, visivel_cq: true },
  { atividade: 'LIBERAÇÃO E EMBARQUE', responsavel: 'EXPEDIÇÃO', ordem: 19, visivel_cq: true },
  { atividade: 'PREPARAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 20, visivel_cq: false },
  { atividade: 'DESEMBARQUE E PRÉ-INSTALAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 21, visivel_cq: false },
  { atividade: 'ENTREGA', responsavel: 'INSTALAÇÃO', ordem: 22, visivel_cq: false },
];

async function updateAtividadesVisivelCQ() {
  const client = await pool.connect();

  try {
    console.log('=== Atualização de Atividades - Campo visivel_cq ===\n');

    // 1. Verificar se a coluna visivel_cq existe
    console.log('1. Verificando se a coluna visivel_cq existe...');
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'registros_atividades' AND column_name = 'visivel_cq'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('   Coluna não existe. Criando coluna visivel_cq...');
      await client.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN visivel_cq BOOLEAN DEFAULT false
      `);
      console.log('   ✅ Coluna visivel_cq criada com sucesso!\n');
    } else {
      console.log('   ✅ Coluna visivel_cq já existe.\n');
    }

    // 2. Atualizar valores de visivel_cq para cada atividade padrão
    console.log('2. Atualizando valores de visivel_cq nas atividades existentes...\n');

    let totalUpdated = 0;

    for (const atividadePadrao of ATIVIDADES_PADRAO) {
      const result = await client.query(`
        UPDATE registros_atividades
        SET visivel_cq = $1, updated = NOW()
        WHERE UPPER(atividade) = UPPER($2)
      `, [atividadePadrao.visivel_cq, atividadePadrao.atividade]);

      if (result.rowCount > 0) {
        console.log(`   ${atividadePadrao.atividade}: ${result.rowCount} registros atualizados (visivel_cq: ${atividadePadrao.visivel_cq})`);
        totalUpdated += result.rowCount;
      }
    }

    // 3. Verificar e mostrar resumo
    console.log('\n3. Verificando resultado...');

    const visivelCQCount = await client.query(`
      SELECT visivel_cq, COUNT(*) as count
      FROM registros_atividades
      GROUP BY visivel_cq
    `);

    console.log('\n   Resumo de visivel_cq:');
    visivelCQCount.rows.forEach(row => {
      console.log(`   - visivel_cq = ${row.visivel_cq}: ${row.count} atividades`);
    });

    // 4. Mostrar atividades visíveis no CQ
    const atividadesCQ = await client.query(`
      SELECT DISTINCT atividade
      FROM registros_atividades
      WHERE visivel_cq = true
      ORDER BY atividade
    `);

    console.log('\n   Atividades visíveis no CQ:');
    atividadesCQ.rows.forEach(row => {
      console.log(`   - ${row.atividade}`);
    });

    console.log(`\n=== Resumo Final ===`);
    console.log(`Total de registros atualizados: ${totalUpdated}`);
    console.log('\n✅ Atualização concluída com sucesso!');

  } catch (error) {
    console.error('Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateAtividadesVisivelCQ();
