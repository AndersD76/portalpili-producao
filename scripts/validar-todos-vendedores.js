/**
 * Valida dados de TODOS os vendedores: planilha vs banco
 * Executa: node scripts/validar-todos-vendedores.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SPREADSHEET_ID = '1-rxFnIAOFtg-sx0LN6NMLCrFGGcy0qE7ONTr4iTxSC4';
const PROPOSTAS_GID = '1005054371';

function parseCSVLines(text) {
  const result = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { currentField += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { currentField += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { currentRow.push(currentField); currentField = ''; }
      else if (char === '\r' && nextChar === '\n') { currentRow.push(currentField); currentField = ''; result.push(currentRow); currentRow = []; i++; }
      else if (char === '\n') { currentRow.push(currentField); currentField = ''; result.push(currentRow); currentRow = []; }
      else { currentField += char; }
    }
  }
  if (currentField || currentRow.length > 0) { currentRow.push(currentField); result.push(currentRow); }
  return result;
}

function parseCSV(text) {
  const lines = parseCSVLines(text);
  if (lines.length < 2) return [];
  const headers = lines[0];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (!values || values.length === 0 || (values.length === 1 && !values[0])) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim();
    }
    rows.push(row);
  }
  return rows;
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('Buscando planilha...');
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PROPOSTAS_GID}`;
    const response = await fetch(url);
    const text = await response.text();
    const allRows = parseCSV(text).filter(r => r['Carimbo de data/hora']);

    // Agrupar planilha por vendedor
    const planilhaPorVendedor = {};
    for (const row of allRows) {
      const vendedor = (row['Vendedor e/ou Representante (Nome e Sobrenome):'] || 'SEM VENDEDOR').trim();
      if (!planilhaPorVendedor[vendedor]) planilhaPorVendedor[vendedor] = [];
      planilhaPorVendedor[vendedor].push(row);
    }

    // Buscar dados do banco por vendedor
    const dbResult = await client.query(`
      SELECT v.nome as vendedor, COUNT(o.id) as total_ops,
             COUNT(CASE WHEN o.estagio = 'EM_NEGOCIACAO' THEN 1 END) as negociacao,
             COUNT(CASE WHEN o.estagio = 'EM_ANALISE' THEN 1 END) as analise,
             COUNT(CASE WHEN o.estagio = 'FECHADA' THEN 1 END) as fechada,
             COUNT(CASE WHEN o.estagio = 'PERDIDA' THEN 1 END) as perdida,
             COUNT(CASE WHEN o.estagio = 'SUSPENSO' THEN 1 END) as suspenso,
             COUNT(CASE WHEN o.estagio = 'SUBSTITUIDO' THEN 1 END) as substituido,
             COUNT(CASE WHEN o.estagio = 'PROPOSTA' THEN 1 END) as proposta
      FROM crm_vendedores v
      LEFT JOIN crm_oportunidades o ON o.vendedor_id = v.id
      WHERE v.ativo = true
      GROUP BY v.id, v.nome
      ORDER BY total_ops DESC
    `);

    console.log('\n================================================================');
    console.log('  VALIDAÇÃO: PLANILHA vs BANCO POR VENDEDOR');
    console.log('================================================================\n');
    console.log('Vendedor'.padEnd(40) + 'Planilha'.padStart(10) + 'Banco'.padStart(8) + '  Status');
    console.log('-'.repeat(70));

    let totalOk = 0;
    let totalDiff = 0;

    // Para cada vendedor no banco
    for (const dbVend of dbResult.rows) {
      // Buscar vendedor na planilha (case insensitive, parcial)
      let planilhaCount = 0;
      const dbNome = dbVend.vendedor.toUpperCase().trim();

      for (const [pVend, pRows] of Object.entries(planilhaPorVendedor)) {
        const pNome = pVend.toUpperCase().trim();
        if (pNome === dbNome || pNome.includes(dbNome) || dbNome.includes(pNome)) {
          planilhaCount += pRows.length;
        }
      }

      const dbCount = parseInt(dbVend.total_ops);
      const match = planilhaCount === dbCount;
      const status = match ? 'OK' : `DIFF (${planilhaCount > dbCount ? '+' : ''}${planilhaCount - dbCount})`;

      console.log(
        dbVend.vendedor.padEnd(40) +
        planilhaCount.toString().padStart(10) +
        dbCount.toString().padStart(8) +
        '  ' + (match ? 'OK' : status)
      );

      if (match) totalOk++;
      else totalDiff++;

      // Se diferente, mostrar detalhes dos estágios
      if (!match) {
        console.log(`  Banco: negoc=${dbVend.negociacao} analise=${dbVend.analise} fechada=${dbVend.fechada} perdida=${dbVend.perdida} suspenso=${dbVend.suspenso} subst=${dbVend.substituido} proposta=${dbVend.proposta}`);
      }
    }

    console.log('-'.repeat(70));
    console.log(`Total planilha: ${allRows.length} | Total banco: ${dbResult.rows.reduce((s, v) => s + parseInt(v.total_ops), 0)}`);
    console.log(`Vendedores OK: ${totalOk} | Com diferença: ${totalDiff}`);

    // Verificar se há duplicatas no banco
    console.log('\n--- Verificação de duplicatas ---');
    const dups = await client.query(`
      SELECT titulo, vendedor_id, COUNT(*) as total
      FROM crm_oportunidades
      GROUP BY titulo, vendedor_id
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    if (dups.rows.length === 0) {
      console.log('  Nenhuma duplicata encontrada!');
    } else {
      console.log(`  ${dups.rows.length} grupos duplicados:`);
      dups.rows.forEach(d => console.log(`    "${d.titulo}" (${d.total}x)`));
    }

    // Verificar oportunidades sem vendedor
    const semVend = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id IS NULL`);
    console.log(`  Sem vendedor: ${semVend.rows[0].total}`);

    // Verificar oportunidades sem cliente
    const semCli = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE cliente_id IS NULL`);
    console.log(`  Sem cliente: ${semCli.rows[0].total}`);

  } catch (error) {
    console.error('ERRO:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
