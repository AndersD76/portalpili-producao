/**
 * Debug: comparar dados do Tiago na planilha vs banco
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Buscar vendedor Tiago
    const tiago = await client.query(`SELECT id, nome, usuario_id FROM crm_vendedores WHERE nome ILIKE '%TIAGO%'`);
    if (!tiago.rows.length) { console.log('Tiago nao encontrado!'); return; }
    const vendedorId = tiago.rows[0].id;
    console.log(`Tiago: vendedor_id=${vendedorId}\n`);

    // 2. Propostas na tabela propostas_comerciais (sync da planilha)
    console.log('====== PROPOSTAS_COMERCIAIS (planilha sync) ======\n');
    const propostasCom = await client.query(`
      SELECT id, numero_proposta, situacao, cliente_nome, tipo_produto, valor_total,
             valor_equipamento, vendedor_nome, data_criacao
      FROM propostas_comerciais
      WHERE UPPER(vendedor_nome) LIKE '%TIAGO%'
      ORDER BY data_criacao DESC
    `);
    console.log(`Total: ${propostasCom.rows.length} propostas na tabela propostas_comerciais\n`);
    propostasCom.rows.forEach((p, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. [${p.numero_proposta || '-'}] ${p.situacao?.padEnd(18)} | ${p.tipo_produto?.padEnd(10)} | R$ ${(p.valor_total || 0).toLocaleString('pt-BR').padStart(12)} | ${p.cliente_nome}`);
    });

    // 3. Propostas CRM (crm_propostas)
    console.log('\n====== CRM_PROPOSTAS ======\n');
    const propostasCRM = await client.query(`
      SELECT p.id, p.numero_proposta, p.situacao, p.produto, p.valor_total,
             c.razao_social as cliente_nome, v.nome as vendedor_nome
      FROM crm_propostas p
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      WHERE p.vendedor_id = $1
      ORDER BY p.created_at DESC
    `, [vendedorId]);
    console.log(`Total: ${propostasCRM.rows.length} propostas em crm_propostas\n`);
    propostasCRM.rows.forEach((p, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. [${p.numero_proposta || '-'}] ${(p.situacao || '-').padEnd(18)} | ${(p.produto || '-').padEnd(10)} | R$ ${(p.valor_total || 0).toLocaleString('pt-BR').padStart(12)} | ${p.cliente_nome || '-'}`);
    });

    // 4. Oportunidades CRM
    console.log('\n====== CRM_OPORTUNIDADES ======\n');
    const oportunidades = await client.query(`
      SELECT o.id, o.titulo, o.estagio, o.status, o.valor_estimado, o.probabilidade,
             o.produto, o.fonte, c.razao_social as cliente_nome
      FROM crm_oportunidades o
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      WHERE o.vendedor_id = $1
      ORDER BY o.valor_estimado DESC NULLS LAST
    `, [vendedorId]);
    console.log(`Total: ${oportunidades.rows.length} oportunidades em crm_oportunidades\n`);

    // Separar por tipo
    const comVenda = oportunidades.rows.filter(o => o.titulo && o.titulo.startsWith('Venda '));
    const semVenda = oportunidades.rows.filter(o => !o.titulo || !o.titulo.startsWith('Venda '));

    console.log(`  Com prefixo "Venda ": ${comVenda.length}`);
    console.log(`  Sem prefixo "Venda ": ${semVenda.length}\n`);

    console.log('  --- OPORTUNIDADES NORMAIS ---');
    semVenda.forEach((o, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${o.estagio?.padEnd(15)} | ${o.status?.padEnd(8)} | ${(o.probabilidade || 0).toString().padStart(3)}% | R$ ${(o.valor_estimado || 0).toLocaleString('pt-BR').padStart(12)} | ${o.titulo}`);
    });

    console.log('\n  --- OPORTUNIDADES "Venda ..." ---');
    comVenda.forEach((o, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${o.estagio?.padEnd(15)} | ${o.status?.padEnd(8)} | ${(o.probabilidade || 0).toString().padStart(3)}% | R$ ${(o.valor_estimado || 0).toLocaleString('pt-BR').padStart(12)} | ${o.titulo}`);
    });

    // 5. Análise de problemas
    console.log('\n====== ANALISE DE PROBLEMAS ======\n');

    // Duplicatas: mesma oportunidade com e sem "Venda"
    let duplicatas = 0;
    for (const op of semVenda) {
      const vendaMatch = comVenda.find(v => {
        const tituloVenda = v.titulo.replace('Venda ', '');
        // Comparar produto + cliente
        return tituloVenda.includes(op.cliente_nome || 'XXXXX');
      });
      if (vendaMatch) duplicatas++;
    }
    console.log(`Possiveis duplicatas (normal + Venda): ${duplicatas}`);

    // Oportunidades sem cliente vinculado
    const semCliente = oportunidades.rows.filter(o => !o.cliente_nome);
    console.log(`Oportunidades sem cliente vinculado: ${semCliente.length}`);
    semCliente.forEach(o => console.log(`  - "${o.titulo}"`));

    // Oportunidades com valor 0 ou null
    const semValor = oportunidades.rows.filter(o => !o.valor_estimado || o.valor_estimado == 0);
    console.log(`Oportunidades sem valor: ${semValor.length}`);

    // Comparar com planilha: 22 propostas devem gerar ~13 oportunidades unicas (por cliente/produto)
    console.log(`\nPlanilha: ${propostasCom.rows.length} propostas`);
    console.log(`Banco oportunidades: ${oportunidades.rows.length} (${semVenda.length} normais + ${comVenda.length} "Venda")`);
    console.log(`Banco crm_propostas: ${propostasCRM.rows.length}`);

    // 6. Verificar de onde vem as "Venda"
    console.log('\n====== ORIGEM DAS OPORTUNIDADES "Venda" ======\n');
    const fontes = await client.query(`
      SELECT fonte, COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id = $1 GROUP BY fonte
    `, [vendedorId]);
    fontes.rows.forEach(f => console.log(`  Fonte: ${f.fonte || 'NULL'} → ${f.total} oportunidades`));

    // Verificar script migrate-to-crm
    const vendaTitles = await client.query(`
      SELECT titulo, estagio, status, probabilidade, fonte FROM crm_oportunidades
      WHERE vendedor_id = $1 AND titulo LIKE 'Venda %'
      ORDER BY titulo LIMIT 5
    `, [vendedorId]);
    console.log('\n  Exemplos de "Venda":');
    vendaTitles.rows.forEach(v => console.log(`  - "${v.titulo}" | estagio=${v.estagio} status=${v.status} prob=${v.probabilidade}% fonte=${v.fonte}`));

  } catch (error) {
    console.error('ERRO:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
