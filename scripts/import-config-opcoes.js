require('dotenv').config({ path: '.env.local' });
const xlsx = require('xlsx');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importOpcoes() {
  console.log('\n=== Importando Opções de Configuração ===\n');

  const wb = xlsx.readFile('docs/PRECIFICADOR PILI.xlsx');
  const ws = wb.Sheets['PRECIFICADOR'];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

  // Extrair opções por grupo
  const opcoes = [];
  let ordem = 0;

  for (const row of data) {
    if (row.length >= 6) {
      const id = row[0];
      const grupo = row[1];
      const opcaoRaw = row[4];
      const valor = row[5];

      if (grupo && opcaoRaw && typeof id === 'number') {
        const opcaoStr = String(opcaoRaw);

        // Extrair tamanhos aplicáveis do texto [11/12/18/21/26/30]
        const tamanhosMatch = opcaoStr.match(/\[([0-9\/]+)\]/);
        let tamanhos = 'ALL';
        let nome = opcaoStr;

        if (tamanhosMatch) {
          tamanhos = tamanhosMatch[1].replace(/\//g, ',');
          nome = opcaoStr.replace(/\[[0-9\/]+\]\s*/, '').trim();
        }

        // Normalizar grupo
        const grupoNormalizado = grupo.toUpperCase().replace(/ /g, '_');

        opcoes.push({
          grupo: grupoNormalizado,
          codigo: `${grupoNormalizado}_${id}`,
          nome: nome,
          preco: typeof valor === 'number' ? valor : parseFloat(valor) || 0,
          tamanhos: tamanhos,
          tipo_produto: 'TOMBADOR',
          ordem: ordem++
        });
      }
    }
  }

  console.log(`Encontradas ${opcoes.length} opções`);

  // Limpar tabela existente
  await pool.query('DELETE FROM crm_config_opcoes');

  // Inserir opções
  let inserted = 0;
  for (const opt of opcoes) {
    try {
      await pool.query(`
        INSERT INTO crm_config_opcoes (grupo, codigo, nome, preco, tamanhos_aplicaveis, tipo_produto, ordem)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [opt.grupo, opt.codigo, opt.nome, opt.preco, opt.tamanhos, opt.tipo_produto, opt.ordem]);
      inserted++;
    } catch (e) {
      console.error('Erro ao inserir:', opt.nome, e.message);
    }
  }

  console.log(`✓ ${inserted} opções inseridas`);

  // Mostrar resumo por grupo
  const resumo = await pool.query(`
    SELECT grupo, COUNT(*) as qtd, SUM(CASE WHEN preco > 0 THEN 1 ELSE 0 END) as com_preco
    FROM crm_config_opcoes
    GROUP BY grupo
    ORDER BY grupo
  `);

  console.log('\n=== Resumo por Grupo ===');
  resumo.rows.forEach(r => {
    console.log(`  ${r.grupo}: ${r.qtd} opções (${r.com_preco} com preço)`);
  });

  await pool.end();
  console.log('\n✅ Importação concluída!\n');
}

importOpcoes().catch(console.error);
