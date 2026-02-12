/**
 * Validar dados do Tiago após limpeza
 * Compara com os dados da planilha CSV
 *
 * Executa: node scripts/validar-dados-tiago.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();

  try {
    console.log('=== VALIDAÇÃO DE DADOS - TIAGO GEVINSKI ===\n');

    // 1. Vendedor
    const tiago = await client.query(
      `SELECT id, nome, usuario_id, ativo FROM crm_vendedores WHERE nome ILIKE '%TIAGO%'`
    );
    console.log(`Vendedores "Tiago": ${tiago.rows.length}`);
    tiago.rows.forEach(t => console.log(`  id=${t.id} nome="${t.nome}" usuario_id=${t.usuario_id} ativo=${t.ativo}`));

    if (tiago.rows.length !== 1) {
      console.log('ERRO: Deveria ter exatamente 1 vendedor Tiago!');
      return;
    }

    const vendedorId = tiago.rows[0].id;

    // 2. Propostas comerciais (sync da planilha)
    console.log('\n--- PROPOSTAS_COMERCIAIS (planilha sync) ---\n');
    const propostasCom = await client.query(`
      SELECT numero_proposta, situacao, cliente_nome, tipo_produto, valor_total, valor_equipamento, data_criacao
      FROM propostas_comerciais
      WHERE UPPER(vendedor_nome) LIKE '%TIAGO%'
      ORDER BY numero_proposta
    `);
    console.log(`Total: ${propostasCom.rows.length} propostas`);
    propostasCom.rows.forEach((p, i) => {
      const num = (p.numero_proposta || '-').replace(/^PROP-0*/i, '');
      console.log(`  ${(i + 1).toString().padStart(2)}. #${num.padStart(4)} | ${(p.situacao || '-').padEnd(18)} | ${(p.tipo_produto || '-').padEnd(16)} | R$ ${(p.valor_total || 0).toLocaleString('pt-BR').padStart(12)} | ${p.cliente_nome}`);
    });

    // 3. CRM Propostas
    console.log('\n--- CRM_PROPOSTAS ---\n');
    const propostasCRM = await client.query(`
      SELECT p.numero_proposta, p.situacao, p.produto, p.valor_total,
             c.razao_social as cliente_nome
      FROM crm_propostas p
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      WHERE p.vendedor_id = $1
      ORDER BY p.numero_proposta
    `, [vendedorId]);
    console.log(`Total: ${propostasCRM.rows.length} propostas`);
    propostasCRM.rows.forEach((p, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. #${String(p.numero_proposta || '-').padStart(4)} | ${(p.situacao || '-').padEnd(18)} | ${(p.produto || '-').padEnd(16)} | R$ ${(p.valor_total || 0).toLocaleString('pt-BR').padStart(12)} | ${p.cliente_nome || '-'}`);
    });

    // 4. Oportunidades
    console.log('\n--- CRM_OPORTUNIDADES ---\n');
    const oportunidades = await client.query(`
      SELECT o.titulo, o.estagio, o.status, o.valor_estimado, o.probabilidade,
             o.numero_proposta, o.fonte, c.razao_social as cliente_nome
      FROM crm_oportunidades o
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      WHERE o.vendedor_id = $1
      ORDER BY o.numero_proposta NULLS LAST, o.titulo
    `, [vendedorId]);
    console.log(`Total: ${oportunidades.rows.length} oportunidades`);
    oportunidades.rows.forEach((o, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. #${(o.numero_proposta || '-').padStart(4)} | ${(o.estagio || '-').padEnd(15)} | ${(o.status || '-').padEnd(8)} | ${(o.probabilidade || 0).toString().padStart(3)}% | R$ ${(o.valor_estimado || 0).toLocaleString('pt-BR').padStart(12)} | ${o.titulo}`);
    });

    // 5. Clientes
    console.log('\n--- CLIENTES ---\n');
    const clientes = await client.query(`
      SELECT c.razao_social, c.cpf_cnpj, c.estado, c.municipio,
             COUNT(o.id) as total_ops,
             SUM(o.valor_estimado) as valor_total_ops
      FROM crm_clientes c
      LEFT JOIN crm_oportunidades o ON o.cliente_id = c.id AND o.vendedor_id = $1
      WHERE c.vendedor_id = $1
      GROUP BY c.id, c.razao_social, c.cpf_cnpj, c.estado, c.municipio
      ORDER BY valor_total_ops DESC NULLS LAST
    `, [vendedorId]);
    console.log(`Total: ${clientes.rows.length} clientes`);
    clientes.rows.forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${(c.razao_social || '-').padEnd(50)} | ${c.estado || '-'} | Ops: ${c.total_ops} | R$ ${(c.valor_total_ops || 0).toLocaleString('pt-BR')}`);
    });

    // 6. Resumo geral
    console.log('\n=== RESUMO GERAL ===\n');
    const totais = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM crm_vendedores) as vendedores,
        (SELECT COUNT(*) FROM crm_vendedores WHERE ativo = true) as vendedores_ativos,
        (SELECT COUNT(*) FROM crm_clientes) as clientes,
        (SELECT COUNT(*) FROM propostas_comerciais) as propostas_com,
        (SELECT COUNT(*) FROM crm_propostas) as propostas_crm,
        (SELECT COUNT(*) FROM crm_oportunidades) as oportunidades,
        (SELECT COUNT(*) FROM crm_oportunidades WHERE titulo LIKE 'Venda %') as ops_venda,
        (SELECT COUNT(*) FROM crm_oportunidades WHERE numero_proposta IS NOT NULL) as ops_com_num,
        (SELECT COUNT(*) FROM crm_oportunidades WHERE cliente_id IS NULL) as ops_sem_cliente
    `);
    const t = totais.rows[0];
    console.log(`  Vendedores: ${t.vendedores} (${t.vendedores_ativos} ativos)`);
    console.log(`  Clientes: ${t.clientes}`);
    console.log(`  propostas_comerciais: ${t.propostas_com}`);
    console.log(`  crm_propostas: ${t.propostas_crm}`);
    console.log(`  crm_oportunidades: ${t.oportunidades}`);
    console.log(`    - com "Venda": ${t.ops_venda}`);
    console.log(`    - com numero_proposta: ${t.ops_com_num}`);
    console.log(`    - sem cliente: ${t.ops_sem_cliente}`);

    // 7. Verificar duplicatas restantes
    console.log('\n=== DUPLICATAS RESTANTES ===\n');
    const dups = await client.query(`
      SELECT titulo, cliente_id, vendedor_id, COUNT(*) as total
      FROM crm_oportunidades
      GROUP BY titulo, cliente_id, vendedor_id
      HAVING COUNT(*) > 1
      ORDER BY total DESC
      LIMIT 10
    `);
    if (dups.rows.length === 0) {
      console.log('  Nenhuma duplicata encontrada!');
    } else {
      console.log(`  ${dups.rows.length} grupos com duplicatas:`);
      dups.rows.forEach(d => {
        console.log(`    "${d.titulo}" (cliente_id=${d.cliente_id}, vendedor_id=${d.vendedor_id}): ${d.total}x`);
      });
    }

    console.log('\nValidacao concluida!');

  } catch (error) {
    console.error('ERRO:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
