/**
 * Estudar o CSV da planilha Google Sheets - entender colunas e dados
 * Executa: node scripts/estudar-csv.js
 */

async function run() {
  const SPREADSHEET_ID = '1-rxFnIAOFtg-sx0LN6NMLCrFGGcy0qE7ONTr4iTxSC4';
  const PROPOSTAS_GID = '1005054371';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PROPOSTAS_GID}`;

  console.log('Buscando CSV da planilha...\n');
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Erro: ${response.status} ${response.statusText}`);
    return;
  }

  const text = await response.text();
  const lines = parseCSVLines(text);

  if (lines.length < 2) {
    console.log('Planilha vazia');
    return;
  }

  const headers = lines[0];
  console.log(`=== ${headers.length} COLUNAS ===\n`);
  headers.forEach((h, i) => {
    console.log(`  [${i.toString().padStart(2)}] "${h}"`);
  });

  console.log(`\n=== ${lines.length - 1} LINHAS DE DADOS ===\n`);

  // Mostrar 3 exemplos completos
  for (let ex = 1; ex <= Math.min(3, lines.length - 1); ex++) {
    const values = lines[ex];
    console.log(`--- Exemplo ${ex} ---`);
    for (let j = 0; j < headers.length; j++) {
      const val = (values[j] || '').trim();
      if (val) {
        console.log(`  ${headers[j]}: "${val}"`);
      }
    }
    console.log('');
  }

  // Mapear dados relevantes
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (!values || values.length === 0 || !values[0]?.trim()) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim();
    }
    rows.push(row);
  }

  // Contar por vendedor
  const colVendedor = headers.find(h => h.includes('Vendedor') && h.includes('Nome'));
  const colSituacao = 'Situação';
  const colNumero = headers.find(h => h.includes('Número') && h.includes('proposta'));
  const colCliente = headers.find(h => h.includes('Razão Social'));
  const colProduto = headers.find(h => h === 'Produto:');
  const colTimestamp = headers.find(h => h.includes('Carimbo'));
  const colValorTotalTombador = headers.find(h => h === 'TOTAL GERAL (R$):');
  const colValorTotalColetor = headers.find(h => h.includes('TOTAL GERAL (COLETOR)'));
  const colProbabilidade = headers.find(h => h.includes('Chance'));
  const colSituacaoProposta = headers.find(h => h === 'Situação da proposta:');
  const colSituacaoFechada = headers.find(h => h.includes('Situação da proposta fechada'));

  console.log('=== COLUNAS MAPEADAS ===\n');
  console.log(`  Vendedor: "${colVendedor}"`);
  console.log(`  Situacao: "${colSituacao}"`);
  console.log(`  Numero: "${colNumero}"`);
  console.log(`  Cliente: "${colCliente}"`);
  console.log(`  Produto: "${colProduto}"`);
  console.log(`  Timestamp: "${colTimestamp}"`);
  console.log(`  Valor Total Tombador: "${colValorTotalTombador}"`);
  console.log(`  Valor Total Coletor: "${colValorTotalColetor}"`);
  console.log(`  Probabilidade: "${colProbabilidade}"`);
  console.log(`  Situação proposta: "${colSituacaoProposta}"`);
  console.log(`  Situação fechada: "${colSituacaoFechada}"`);

  // Valores únicos de Situação
  console.log('\n=== VALORES ÚNICOS ===\n');
  const situacoes = [...new Set(rows.map(r => r[colSituacao]).filter(Boolean))];
  console.log(`  Situação: ${situacoes.join(', ')}`);

  const sitPropostas = [...new Set(rows.map(r => r[colSituacaoProposta]).filter(Boolean))];
  console.log(`  Situação proposta: ${sitPropostas.join(', ')}`);

  const sitFechadas = [...new Set(rows.map(r => r[colSituacaoFechada]).filter(Boolean))];
  console.log(`  Situação fechada: ${sitFechadas.join(', ')}`);

  const produtos = [...new Set(rows.map(r => r[colProduto]).filter(Boolean))];
  console.log(`  Produtos: ${produtos.join(', ')}`);

  const probs = [...new Set(rows.map(r => r[colProbabilidade]).filter(Boolean))];
  console.log(`  Probabilidades: ${probs.join(', ')}`);

  // Resumo por vendedor
  console.log('\n=== POR VENDEDOR ===\n');
  const porVendedor = {};
  for (const r of rows) {
    const v = r[colVendedor] || 'SEM VENDEDOR';
    if (!porVendedor[v]) porVendedor[v] = { total: 0, situacoes: {} };
    porVendedor[v].total++;
    const sit = r[colSituacao] || 'SEM';
    porVendedor[v].situacoes[sit] = (porVendedor[v].situacoes[sit] || 0) + 1;
  }

  Object.entries(porVendedor)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([v, data]) => {
      const sits = Object.entries(data.situacoes).map(([s, c]) => `${s}:${c}`).join(' ');
      console.log(`  ${v.padEnd(40)} ${data.total.toString().padStart(3)} propostas | ${sits}`);
    });

  // Dados do Tiago especificamente
  console.log('\n=== TIAGO GEVINSKI - DETALHES ===\n');
  const tiagoRows = rows.filter(r => (r[colVendedor] || '').toUpperCase().includes('TIAGO'));
  tiagoRows.forEach((r, i) => {
    const num = r[colNumero] || '-';
    const sit = r[colSituacao] || '-';
    const sitProp = r[colSituacaoProposta] || '-';
    const cliente = r[colCliente] || '-';
    const produto = r[colProduto] || '-';
    const valorT = r[colValorTotalTombador] || '-';
    const valorC = r[colValorTotalColetor] || '-';
    const prob = r[colProbabilidade] || '-';
    const timestamp = r[colTimestamp] || '-';
    console.log(`  ${(i+1).toString().padStart(2)}. #${num.padStart(4)} | Sit:"${sit}" SitProp:"${sitProp}" | ${produto.padEnd(12)} | ValT:${valorT.padStart(15)} ValC:${valorC.padStart(15)} | Prob:${prob} | ${cliente}`);
    console.log(`      Timestamp: ${timestamp}`);
  });

  console.log(`\n  Total Tiago: ${tiagoRows.length} propostas na planilha`);
}

function parseCSVLines(text) {
  const result = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        currentField = '';
        result.push(currentRow);
        currentRow = [];
        i++;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        result.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    result.push(currentRow);
  }

  return result;
}

run().catch(console.error);
