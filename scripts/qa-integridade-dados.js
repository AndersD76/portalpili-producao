/**
 * QA: Verificação completa de integridade dos dados
 * Executa: node scripts/qa-integridade-dados.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let erros = 0;
let avisos = 0;

function ok(msg) { console.log('  [OK] ' + msg); }
function warn(msg) { console.log('  [WARN] ' + msg); avisos++; }
function fail(msg) { console.log('  [FAIL] ' + msg); erros++; }

async function run() {
  const client = await pool.connect();
  try {
    console.log('================================================================');
    console.log('  QA: INTEGRIDADE DOS DADOS');
    console.log('================================================================\n');

    // 1. TABELAS EXISTEM
    console.log('1. VERIFICAR TABELAS\n');
    const tabelas = ['crm_vendedores', 'crm_clientes', 'crm_oportunidades', 'crm_propostas', 'crm_atividades', 'crm_interacoes', 'propostas_comerciais'];
    for (const t of tabelas) {
      try {
        const r = await client.query(`SELECT COUNT(*) as total FROM ${t}`);
        ok(`${t}: ${r.rows[0].total} registros`);
      } catch (e) {
        fail(`${t}: TABELA NAO EXISTE - ${e.message}`);
      }
    }

    // 2. COLUNA numero_proposta em crm_oportunidades
    console.log('\n2. COLUNAS IMPORTANTES\n');
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'crm_oportunidades'
      ORDER BY ordinal_position
    `);
    const colNames = cols.rows.map(c => c.column_name);
    const requiredCols = ['id', 'titulo', 'produto', 'estagio', 'status', 'valor_estimado', 'probabilidade', 'numero_proposta', 'data_abertura', 'vendedor_id', 'cliente_id', 'motivo_perda', 'concorrente', 'justificativa_perda', 'dias_no_estagio', 'fonte'];
    for (const col of requiredCols) {
      if (colNames.includes(col)) ok(`crm_oportunidades.${col} existe`);
      else fail(`crm_oportunidades.${col} NAO EXISTE`);
    }

    // 3. FK INTEGRITY
    console.log('\n3. INTEGRIDADE DE FK\n');

    // Oportunidades com vendedor_id inválido
    const fk1 = await client.query(`
      SELECT COUNT(*) as total FROM crm_oportunidades o
      LEFT JOIN crm_vendedores v ON o.vendedor_id = v.id
      WHERE o.vendedor_id IS NOT NULL AND v.id IS NULL
    `);
    if (parseInt(fk1.rows[0].total) === 0) ok('Oportunidades: vendedor_id OK');
    else fail(`Oportunidades: ${fk1.rows[0].total} com vendedor_id inválido`);

    // Oportunidades com cliente_id inválido
    const fk2 = await client.query(`
      SELECT COUNT(*) as total FROM crm_oportunidades o
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      WHERE o.cliente_id IS NOT NULL AND c.id IS NULL
    `);
    if (parseInt(fk2.rows[0].total) === 0) ok('Oportunidades: cliente_id OK');
    else fail(`Oportunidades: ${fk2.rows[0].total} com cliente_id inválido`);

    // Propostas com vendedor_id inválido
    const fk3 = await client.query(`
      SELECT COUNT(*) as total FROM crm_propostas p
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      WHERE p.vendedor_id IS NOT NULL AND v.id IS NULL
    `);
    if (parseInt(fk3.rows[0].total) === 0) ok('Propostas: vendedor_id OK');
    else fail(`Propostas: ${fk3.rows[0].total} com vendedor_id inválido`);

    // Propostas com oportunidade_id inválido
    const fk4 = await client.query(`
      SELECT COUNT(*) as total FROM crm_propostas p
      LEFT JOIN crm_oportunidades o ON p.oportunidade_id = o.id
      WHERE p.oportunidade_id IS NOT NULL AND o.id IS NULL
    `);
    if (parseInt(fk4.rows[0].total) === 0) ok('Propostas: oportunidade_id OK');
    else fail(`Propostas: ${fk4.rows[0].total} com oportunidade_id inválido`);

    // 4. NULLS IMPORTANTES
    console.log('\n4. DADOS NULOS\n');

    const nullChecks = [
      { table: 'crm_oportunidades', col: 'vendedor_id', desc: 'Oportunidades sem vendedor' },
      { table: 'crm_oportunidades', col: 'cliente_id', desc: 'Oportunidades sem cliente' },
      { table: 'crm_oportunidades', col: 'titulo', desc: 'Oportunidades sem titulo' },
      { table: 'crm_oportunidades', col: 'estagio', desc: 'Oportunidades sem estagio' },
      { table: 'crm_oportunidades', col: 'numero_proposta', desc: 'Oportunidades sem numero_proposta' },
      { table: 'crm_clientes', col: 'razao_social', desc: 'Clientes sem razao_social' },
      { table: 'crm_vendedores', col: 'nome', desc: 'Vendedores sem nome' },
    ];

    for (const check of nullChecks) {
      const r = await client.query(`SELECT COUNT(*) as total FROM ${check.table} WHERE ${check.col} IS NULL`);
      const count = parseInt(r.rows[0].total);
      if (count === 0) ok(`${check.desc}: 0`);
      else if (check.col === 'numero_proposta') warn(`${check.desc}: ${count}`);
      else fail(`${check.desc}: ${count}`);
    }

    // 5. DUPLICATAS
    console.log('\n5. DUPLICATAS\n');

    // Vendedores duplicados
    const dupVend = await client.query(`
      SELECT UPPER(TRIM(nome)) as nome_norm, COUNT(*) as total
      FROM crm_vendedores
      GROUP BY UPPER(TRIM(nome))
      HAVING COUNT(*) > 1
    `);
    if (dupVend.rows.length === 0) ok('Vendedores: sem duplicatas');
    else fail(`Vendedores: ${dupVend.rows.length} nomes duplicados: ${dupVend.rows.map(r => r.nome_norm).join(', ')}`);

    // Oportunidades com mesmo numero_proposta
    const dupOps = await client.query(`
      SELECT numero_proposta, COUNT(*) as total
      FROM crm_oportunidades
      WHERE numero_proposta IS NOT NULL
      GROUP BY numero_proposta
      HAVING COUNT(*) > 1
    `);
    if (dupOps.rows.length === 0) ok('Oportunidades: sem duplicatas por numero_proposta');
    else warn(`Oportunidades: ${dupOps.rows.length} numero_proposta duplicados`);

    // Propostas_comerciais com mesmo numero_proposta
    const dupPC = await client.query(`
      SELECT numero_proposta, COUNT(*) as total
      FROM propostas_comerciais
      WHERE numero_proposta IS NOT NULL
      GROUP BY numero_proposta
      HAVING COUNT(*) > 1
    `);
    if (dupPC.rows.length === 0) ok('propostas_comerciais: sem duplicatas por numero_proposta');
    else warn(`propostas_comerciais: ${dupPC.rows.length} numero_proposta duplicados`);

    // 6. ESTÁGIOS VÁLIDOS
    console.log('\n6. VALORES DE ENUM\n');

    const estagiosValidos = ['EM_ANALISE', 'EM_NEGOCIACAO', 'POS_NEGOCIACAO', 'FECHADA', 'PERDIDA', 'TESTE', 'SUSPENSO', 'SUBSTITUIDO', 'PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'FECHAMENTO'];
    const estagios = await client.query(`SELECT DISTINCT estagio FROM crm_oportunidades`);
    const estagiosInvalidos = estagios.rows.filter(r => !estagiosValidos.includes(r.estagio));
    if (estagiosInvalidos.length === 0) ok('Estágios: todos válidos');
    else fail(`Estágios inválidos: ${estagiosInvalidos.map(r => r.estagio).join(', ')}`);

    const statusValidos = ['ABERTA', 'GANHA', 'PERDIDA', 'CANCELADA', 'SUSPENSA'];
    const statuses = await client.query(`SELECT DISTINCT status FROM crm_oportunidades`);
    const statusInvalidos = statuses.rows.filter(r => !statusValidos.includes(r.status));
    if (statusInvalidos.length === 0) ok('Status: todos válidos');
    else fail(`Status inválidos: ${statusInvalidos.map(r => r.status).join(', ')}`);

    // 7. CONSISTÊNCIA ESTAGIO <-> STATUS
    console.log('\n7. CONSISTENCIA ESTAGIO <-> STATUS\n');

    const fechadaAberta = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE estagio = 'FECHADA' AND status != 'GANHA'`);
    if (parseInt(fechadaAberta.rows[0].total) === 0) ok('FECHADA -> GANHA: consistente');
    else warn(`FECHADA com status != GANHA: ${fechadaAberta.rows[0].total}`);

    const perdidaAberta = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE estagio = 'PERDIDA' AND status != 'PERDIDA'`);
    if (parseInt(perdidaAberta.rows[0].total) === 0) ok('PERDIDA -> PERDIDA: consistente');
    else warn(`PERDIDA com status != PERDIDA: ${perdidaAberta.rows[0].total}`);

    const suspensoAberta = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE estagio = 'SUSPENSO' AND status != 'SUSPENSA'`);
    if (parseInt(suspensoAberta.rows[0].total) === 0) ok('SUSPENSO -> SUSPENSA: consistente');
    else warn(`SUSPENSO com status != SUSPENSA: ${suspensoAberta.rows[0].total}`);

    // 8. VALORES
    console.log('\n8. VALORES\n');

    const valoresNegativos = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE valor_estimado < 0`);
    if (parseInt(valoresNegativos.rows[0].total) === 0) ok('Valores negativos: 0');
    else fail(`Valores negativos: ${valoresNegativos.rows[0].total}`);

    const probRange = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE probabilidade < 0 OR probabilidade > 100`);
    if (parseInt(probRange.rows[0].total) === 0) ok('Probabilidade fora de range: 0');
    else fail(`Probabilidade fora de range: ${probRange.rows[0].total}`);

    const semValor = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE valor_estimado IS NULL OR valor_estimado = 0`);
    warn(`Oportunidades sem valor: ${semValor.rows[0].total}`);

    // 9. CONTAGENS
    console.log('\n9. CONTAGENS FINAIS\n');
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM crm_vendedores WHERE ativo = true) as vendedores,
        (SELECT COUNT(*) FROM crm_clientes) as clientes,
        (SELECT COUNT(*) FROM crm_oportunidades) as oportunidades,
        (SELECT COUNT(*) FROM crm_propostas) as propostas_crm,
        (SELECT COUNT(*) FROM propostas_comerciais) as propostas_com,
        (SELECT COUNT(*) FROM crm_atividades) as atividades,
        (SELECT COUNT(*) FROM crm_interacoes) as interacoes,
        (SELECT COUNT(DISTINCT vendedor_id) FROM crm_oportunidades) as vendedores_com_ops,
        (SELECT COUNT(DISTINCT cliente_id) FROM crm_oportunidades) as clientes_com_ops
    `);
    const c = counts.rows[0];
    console.log(`  Vendedores ativos:    ${c.vendedores}`);
    console.log(`  Clientes:             ${c.clientes}`);
    console.log(`  Oportunidades:        ${c.oportunidades}`);
    console.log(`  crm_propostas:        ${c.propostas_crm}`);
    console.log(`  propostas_comerciais: ${c.propostas_com}`);
    console.log(`  Atividades:           ${c.atividades}`);
    console.log(`  Interações:           ${c.interacoes}`);
    console.log(`  Vendedores c/ ops:    ${c.vendedores_com_ops}`);
    console.log(`  Clientes c/ ops:      ${c.clientes_com_ops}`);

    // 10. DISTRIBUIÇÃO POR ESTÁGIO
    console.log('\n10. DISTRIBUIÇÃO POR ESTÁGIO\n');
    const dist = await client.query(`
      SELECT estagio, status, COUNT(*) as total, COALESCE(SUM(valor_estimado), 0) as valor
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY estagio, status
    `);
    dist.rows.forEach(r => {
      console.log(`  ${r.estagio.padEnd(20)} ${r.status.padEnd(10)} ${r.total.toString().padStart(5)} ops | R$ ${parseFloat(r.valor).toLocaleString('pt-BR')}`);
    });

    // RESUMO
    console.log('\n================================================================');
    console.log(`  RESULTADO: ${erros} erros, ${avisos} avisos`);
    console.log('================================================================\n');

    if (erros === 0) console.log('  APROVADO! Nenhum erro critico encontrado.');
    else console.log('  REPROVADO! Corrija os erros acima.');

  } catch (error) {
    console.error('ERRO:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

run();
