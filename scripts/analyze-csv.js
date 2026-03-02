const https = require('https');
const http = require('http');

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'Accept': 'text/csv' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
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

(async () => {
  try {
    console.log('Fetching CSV from Google Sheets...');
    const url = 'https://docs.google.com/spreadsheets/d/1-rxFnIAOFtg-sx0LN6NMLCrFGGcy0qE7ONTr4iTxSC4/export?format=csv&gid=1005054371';
    const text = await fetchURL(url);
    console.log(`CSV size: ${(text.length / 1024).toFixed(0)} KB`);

    const lines = parseCSVLines(text);
    const headers = lines[0];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i] || lines[i].length < 2) continue;
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (lines[i][j] || '').trim();
      }
      if (row['Carimbo de data/hora']) rows.push(row);
    }

    console.log(`\n=== TOTAL: ${rows.length} propostas, ${headers.length} colunas ===\n`);

    // 1. ALL HEADERS
    console.log('=== TODAS AS COLUNAS ===');
    headers.forEach((h, i) => console.log(`  [${i}] ${h}`));

    // 2. SITUAÇÃO distribution
    console.log('\n=== SITUAÇÃO (coluna "Situação") ===');
    const sitCounts = {};
    rows.forEach(r => {
      const s = r['Situação'] || '(vazio)';
      sitCounts[s] = (sitCounts[s] || 0) + 1;
    });
    Object.entries(sitCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 3. PROBABILIDADE distribution
    console.log('\n=== PROBABILIDADE ("Chance do negócio se concretizar:") ===');
    const probCounts = {};
    rows.forEach(r => {
      const p = r['Chance do negócio se concretizar:'] || '(vazio)';
      probCounts[p] = (probCounts[p] || 0) + 1;
    });
    Object.entries(probCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 3b. PROB vs RESULTADO
    console.log('\n=== PROB vs RESULTADO (Fechada vs Perdida) ===');
    const probResult = {};
    rows.forEach(r => {
      const prob = r['Chance do negócio se concretizar:'] || '(vazio)';
      const sit = (r['Situação'] || '').toUpperCase();
      if (!probResult[prob]) probResult[prob] = { total: 0, fechada: 0, perdida: 0, aberta: 0 };
      probResult[prob].total++;
      if (sit === 'FECHADA') probResult[prob].fechada++;
      else if (sit === 'PERDIDA') probResult[prob].perdida++;
      else probResult[prob].aberta++;
    });
    console.table(probResult);

    // 4. CONCORRENTE
    console.log('\n=== CONCORRENTES ("Cliente fechou com o concorrente:") ===');
    const concCounts = {};
    rows.forEach(r => {
      const c = r['Cliente fechou com o concorrente:'] || '(vazio)';
      if (c && c !== '(vazio)') concCounts[c] = (concCounts[c] || 0) + 1;
    });
    Object.entries(concCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 5. MOTIVO PERDA
    console.log('\n=== MOTIVO PERDA ===');
    const motivoCounts = {};
    rows.forEach(r => {
      const m = r['Motivo que levou o cliente a não fechar a proposta:'] || '';
      if (m) motivoCounts[m] = (motivoCounts[m] || 0) + 1;
    });
    Object.entries(motivoCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 6. PRODUTO distribution
    console.log('\n=== PRODUTO ("Produto:") ===');
    const prodCounts = {};
    rows.forEach(r => {
      const p = r['Produto:'] || '(vazio)';
      prodCounts[p] = (prodCounts[p] || 0) + 1;
    });
    Object.entries(prodCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 7. VALUE ANALYSIS
    console.log('\n=== VALORES ===');
    function parseValor(v) {
      if (!v) return null;
      const n = parseFloat(v.replace(/[R$\s.]/g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    }
    const valCols = [
      'Preço do equipamento (R$) (TOMBADOR):',
      'TOTAL GERAL (R$):',
      'Preço do equipamento (R$) (COLETOR):',
      'TOTAL GERAL (COLETOR) R$:',
      'VALOR TOTAL DE PROPOSTAS'
    ];
    valCols.forEach(col => {
      const vals = rows.map(r => parseValor(r[col])).filter(v => v !== null && v > 0);
      if (vals.length > 0) {
        vals.sort((a,b) => a - b);
        console.log(`  ${col}`);
        console.log(`    N=${vals.length}, Min=${vals[0].toFixed(0)}, Max=${vals[vals.length-1].toFixed(0)}, Media=${(vals.reduce((a,b) => a+b, 0)/vals.length).toFixed(0)}, Mediana=${vals[Math.floor(vals.length/2)].toFixed(0)}`);
      }
    });

    // 8. VENDEDOR analysis
    console.log('\n=== VENDEDOR + WIN RATE ===');
    const vendStats = {};
    rows.forEach(r => {
      const v = r['Vendedor e/ou Representante (Nome e Sobrenome):'] || '(vazio)';
      const sit = (r['Situação'] || '').toUpperCase();
      if (!vendStats[v]) vendStats[v] = { total: 0, fechada: 0, perdida: 0 };
      vendStats[v].total++;
      if (sit === 'FECHADA') vendStats[v].fechada++;
      else if (sit === 'PERDIDA') vendStats[v].perdida++;
    });
    Object.entries(vendStats).sort((a,b) => b[1].total - a[1].total).forEach(([k,v]) => {
      const wr = (v.fechada + v.perdida) > 0 ? (100 * v.fechada / (v.fechada + v.perdida)).toFixed(1) : 'N/A';
      console.log(`  ${k}: total=${v.total}, fechada=${v.fechada}, perdida=${v.perdida}, WR=${wr}%`);
    });

    // 9. REGIÃO / ESTADO
    console.log('\n=== ESTADO ===');
    const estCounts = {};
    rows.forEach(r => {
      const e = r['Estado (onde será instalado o equipamento):'] || '(vazio)';
      estCounts[e] = (estCounts[e] || 0) + 1;
    });
    Object.entries(estCounts).sort((a,b) => b[1] - a[1]).slice(0, 15).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 10. REGIÃO
    console.log('\n=== REGIÃO ===');
    const regCounts = {};
    rows.forEach(r => {
      const e = r['Região:'] || '(vazio)';
      regCounts[e] = (regCounts[e] || 0) + 1;
    });
    Object.entries(regCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 11. TIME ANALYSIS - proposals over time
    console.log('\n=== PROPOSTAS POR ANO/MES ===');
    const monthCounts = {};
    rows.forEach(r => {
      const ts = r['Carimbo de data/hora'] || '';
      const m = ts.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) {
        const key = `${m[3]}-${m[2]}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      }
    });
    Object.entries(monthCounts).sort().forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 12. SITUAÇÃO PROPOSTA (separate column)
    console.log('\n=== "Situação da proposta:" (coluna separada) ===');
    const sitPropCounts = {};
    rows.forEach(r => {
      const s = r['Situação da proposta:'] || '(vazio)';
      if (s !== '(vazio)') sitPropCounts[s] = (sitPropCounts[s] || 0) + 1;
    });
    Object.entries(sitPropCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 13. FILL RATE per important column
    console.log('\n=== FILL RATE (colunas importantes) ===');
    const importantCols = [
      'Situação', 'Produto:', 'Vendedor e/ou Representante (Nome e Sobrenome):',
      'Razão Social do Cliente:', 'Chance do negócio se concretizar:',
      'VALOR TOTAL DE PROPOSTAS', 'TOTAL GERAL (R$):', 'Preço do equipamento (R$) (TOMBADOR):',
      'Cliente fechou com o concorrente:', 'Motivo que levou o cliente a não fechar a proposta:',
      'Justificativa da perda da proposta:', 'Data da visita ao Cliente:',
      'Situação da proposta:', 'Situação da proposta fechada:', 'Data da entrega:',
      'Estado (onde será instalado o equipamento):', 'Região:',
      'Prazo de entrega (dias):', 'Validade da proposta (em dias):',
      'Tipo:', 'Tamanho do tombador:', 'Ângulo de inclinação:',
    ];
    importantCols.forEach(col => {
      const filled = rows.filter(r => r[col] && r[col].trim()).length;
      const pct = (100 * filled / rows.length).toFixed(1);
      console.log(`  ${col}: ${filled}/${rows.length} (${pct}%)`);
    });

    // 14. JUSTIFICATIVA PERDA
    console.log('\n=== JUSTIFICATIVA PERDA ===');
    const justCounts = {};
    rows.forEach(r => {
      const j = r['Justificativa da perda da proposta:'] || '';
      if (j) justCounts[j] = (justCounts[j] || 0) + 1;
    });
    Object.entries(justCounts).sort((a,b) => b[1] - a[1]).slice(0, 20).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 15. SITUAÇÃO FECHADA
    console.log('\n=== SITUAÇÃO PROPOSTA FECHADA ===');
    const sfCounts = {};
    rows.forEach(r => {
      const s = r['Situação da proposta fechada:'] || '';
      if (s) sfCounts[s] = (sfCounts[s] || 0) + 1;
    });
    Object.entries(sfCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

    // 16. CICLO VENDAS - Tempo entre proposta e fechamento
    console.log('\n=== CICLO DE VENDAS (propostas FECHADAS) ===');
    const fechadas = rows.filter(r => (r['Situação'] || '').toUpperCase() === 'FECHADA');
    console.log(`  Total fechadas: ${fechadas.length}`);
    let ciclos = [];
    fechadas.forEach(r => {
      const ts = r['Carimbo de data/hora'] || '';
      const m1 = ts.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      // Check if there's a "Data da entrega:" or similar closing date
      const de = r['Data da entrega:'] || '';
      const m2 = de.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m1 && m2) {
        const d1 = new Date(parseInt(m1[3]), parseInt(m1[2])-1, parseInt(m1[1]));
        const d2 = new Date(parseInt(m2[3]), parseInt(m2[2])-1, parseInt(m2[1]));
        const dias = Math.round((d2 - d1) / (1000*60*60*24));
        ciclos.push(dias);
      }
    });
    if (ciclos.length > 0) {
      ciclos.sort((a,b) => a - b);
      console.log(`  Com data entrega: ${ciclos.length}`);
      console.log(`  Min: ${ciclos[0]}d, Max: ${ciclos[ciclos.length-1]}d, Media: ${(ciclos.reduce((a,b)=>a+b,0)/ciclos.length).toFixed(0)}d, Mediana: ${ciclos[Math.floor(ciclos.length/2)]}d`);
    } else {
      console.log('  Sem dados de ciclo (sem data_entrega)');
    }

    // 17. Ticket medio por produto (FECHADAS)
    console.log('\n=== TICKET MÉDIO POR PRODUTO (FECHADAS) ===');
    const ticketProd = {};
    fechadas.forEach(r => {
      const prod = r['Produto:'] || 'N/A';
      const val = parseValor(r['VALOR TOTAL DE PROPOSTAS']) || parseValor(r['TOTAL GERAL (R$):']);
      if (val && val > 0) {
        if (!ticketProd[prod]) ticketProd[prod] = [];
        ticketProd[prod].push(val);
      }
    });
    Object.entries(ticketProd).forEach(([k,v]) => {
      const avg = v.reduce((a,b) => a+b, 0) / v.length;
      console.log(`  ${k}: N=${v.length}, Ticket médio=R$ ${avg.toFixed(0)}`);
    });

  } catch(e) {
    console.error('Erro:', e.message);
  }
})();
