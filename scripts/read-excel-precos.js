// Script para ler o arquivo Excel de preços e mostrar a estrutura
// Executa via: node scripts/read-excel-precos.js

const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'PRECIFICADOR PILI.xlsx');

console.log('📂 Lendo arquivo:', filePath);

const workbook = XLSX.readFile(filePath);

console.log('\n📋 Planilhas encontradas:');
workbook.SheetNames.forEach((name, idx) => {
  console.log(`  ${idx + 1}. ${name}`);
});

// Ler cada planilha e mostrar as primeiras linhas
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n========== ${sheetName} ==========`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Mostrar as primeiras 10 linhas
  const linhas = data.slice(0, 15);
  linhas.forEach((row, idx) => {
    // Filtrar células vazias
    const cells = row.map((cell, i) => cell !== '' ? `[${i}]${cell}` : null).filter(Boolean);
    if (cells.length > 0) {
      console.log(`  ${idx}: ${cells.slice(0, 8).join(' | ')}`);
    }
  });
});
