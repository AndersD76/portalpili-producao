const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Preços base atuais
    const precos = await pool.query('SELECT produto, tamanho, tipo, preco, descricao FROM crm_precos_base ORDER BY produto, tamanho');
    console.log('=== PREÇOS BASE ATUAIS NO BD ===');
    precos.rows.forEach(r => {
      const tipo = r.tipo ? ` (${r.tipo})` : '';
      console.log(`${r.produto} ${r.tamanho}m${tipo}: R$ ${Number(r.preco).toLocaleString('pt-BR')}`);
    });

    // Descontos
    const descontos = await pool.query('SELECT desconto_percentual, fator_multiplicador, comissao_percentual FROM crm_precos_descontos ORDER BY desconto_percentual');
    console.log('\n=== DESCONTOS ===');
    descontos.rows.forEach(r => {
      console.log(`Desconto: ${(r.desconto_percentual*100).toFixed(1)}% | Fator: ${r.fator_multiplicador} | Comissão: ${(r.comissao_percentual*100).toFixed(1)}%`);
    });

    // Categorias de opções
    const cats = await pool.query('SELECT codigo, nome FROM crm_precos_categorias ORDER BY ordem_exibicao');
    console.log('\n=== CATEGORIAS DE OPÇÕES ===');
    cats.rows.forEach(r => console.log(`- ${r.codigo}: ${r.nome}`));

    // Algumas opções
    const opcoes = await pool.query('SELECT codigo, nome, preco, preco_tipo FROM crm_precos_opcoes WHERE ativo=true ORDER BY codigo LIMIT 30');
    console.log('\n=== OPÇÕES (primeiras 30) ===');
    opcoes.rows.forEach(r => {
      console.log(`${r.codigo}: R$ ${Number(r.preco).toLocaleString('pt-BR')} (${r.preco_tipo})`);
    });

    await pool.end();
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}
check();
