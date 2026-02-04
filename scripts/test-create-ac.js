const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  const client = await pool.connect();

  try {
    console.log('=== Testando criacao de AC ===\n');

    await client.query('BEGIN');

    const year = new Date().getFullYear();
    const seqResult = await client.query("SELECT nextval('seq_acao_corretiva') as seq");
    const seq = seqResult.rows[0].seq.toString().padStart(4, '0');
    const numero = 'RAC-' + year + '-' + seq;

    console.log('Numero gerado: ' + numero);

    const result = await client.query(`
      INSERT INTO acoes_corretivas (
        numero, data_abertura, origem_tipo, origem_id, origem_descricao,
        descricao_problema, responsavel_principal, responsavel_principal_id,
        prazo_conclusao, equipe, status, created_by, created, updated,
        emitente, processos_envolvidos, causas, subcausas, acoes, status_acoes, falha, responsaveis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      numero,                                    // 1 numero
      '2026-01-27',                              // 2 data_abertura
      'NAO_CONFORMIDADE',                        // 3 origem_tipo
      1093,                                      // 4 origem_id (NC RNC-2026-1096)
      'RNC-2026-1096 - Teste',                   // 5 origem_descricao
      'Teste de descricao do problema',          // 6 descricao_problema
      'Teste Responsavel',                       // 7 responsavel_principal
      null,                                      // 8 responsavel_principal_id
      null,                                      // 9 prazo_conclusao
      null,                                      // 10 equipe
      'ABERTA',                                  // 11 status
      null,                                      // 12 created_by
      new Date().toISOString(),                  // 13 created
      new Date().toISOString(),                  // 14 updated
      'Teste Emitente',                          // 15 emitente
      JSON.stringify(['ALMOXARIFADO']),          // 16 processos_envolvidos
      'Teste causas',                            // 17 causas
      null,                                      // 18 subcausas
      null,                                      // 19 acoes
      'EM_ANDAMENTO',                            // 20 status_acoes
      'Teste de descricao do problema',          // 21 falha
      'Teste Responsavel'                        // 22 responsaveis
    ]);

    console.log('AC criada com sucesso!');
    console.log('ID: ' + result.rows[0].id);
    console.log('Numero: ' + result.rows[0].numero);

    // Rollback para nao salvar o teste
    await client.query('ROLLBACK');
    console.log('\nRollback realizado (AC de teste nao foi salva)');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERRO:', err.message);
    console.error('Detalhes:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
