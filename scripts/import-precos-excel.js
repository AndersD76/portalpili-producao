const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importPrecos() {
  const client = await pool.connect();

  try {
    console.log('📊 Lendo planilha PRECIFICADOR PILI.xlsx...\n');

    const workbook = XLSX.readFile(path.join(__dirname, '../docs/PRECIFICADOR PILI.xlsx'));

    console.log('Abas encontradas:', workbook.SheetNames.join(', '));

    // Processar cada aba
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 Processando aba: ${sheetName}`);

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length === 0) {
        console.log('   (vazia)');
        continue;
      }

      // Mostrar primeiras linhas para entender a estrutura
      console.log('   Primeiras linhas:');
      for (let i = 0; i < Math.min(5, data.length); i++) {
        console.log(`   ${i}: ${JSON.stringify(data[i])}`);
      }

      // Tentar identificar preços base (TOMBADOR/COLETOR)
      const sheetLower = sheetName.toLowerCase();

      if (sheetLower.includes('tombador') || sheetLower.includes('coletor') || sheetLower.includes('preco') || sheetLower.includes('base')) {
        await processarPrecosBase(client, sheetName, data);
      } else if (sheetLower.includes('opcional') || sheetLower.includes('acessorio')) {
        await processarOpcionais(client, sheetName, data);
      } else if (sheetLower.includes('config')) {
        await processarConfiguracoes(client, sheetName, data);
      }
    }

    console.log('\n✅ Importação concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function processarPrecosBase(client, sheetName, data) {
  console.log(`\n   Processando preços base de: ${sheetName}`);

  // Identificar cabeçalhos
  const headers = data[0] || [];
  console.log('   Headers:', headers);

  let insertCount = 0;

  // Determinar tipo de produto
  const tipo = sheetName.toLowerCase().includes('tombador') ? 'TOMBADOR' :
               sheetName.toLowerCase().includes('coletor') ? 'COLETOR' :
               'TOMBADOR';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Tentar extrair: modelo, comprimento/grau, preço
    let modelo = null;
    let comprimento = null;
    let preco = null;
    let descricao = null;

    // Procurar campos por posição ou nome de header
    for (let j = 0; j < row.length; j++) {
      const header = (headers[j] || '').toString().toLowerCase();
      const value = row[j];

      if (!value && value !== 0) continue;

      if (header.includes('modelo') || header.includes('tipo') || header.includes('nome')) {
        modelo = String(value);
      } else if (header.includes('comprimento') || header.includes('tamanho') || header.includes('metro') || header.includes('grau')) {
        comprimento = parseFloat(value);
      } else if (header.includes('preço') || header.includes('preco') || header.includes('valor') || header.includes('r$')) {
        preco = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
      } else if (header.includes('descri')) {
        descricao = String(value);
      }
    }

    // Se não encontrou pelos headers, tentar pela posição
    if (!modelo && row[0]) modelo = String(row[0]);
    if (!comprimento && row[1]) comprimento = parseFloat(row[1]);
    if (!preco && row[2]) preco = parseFloat(String(row[2]).replace(/[^\d.,]/g, '').replace(',', '.'));

    if (modelo && comprimento && preco && !isNaN(preco)) {
      try {
        await client.query(`
          INSERT INTO comercial_precos_base (produto, modelo, comprimento, preco, descricao, ativo)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (produto, modelo, comprimento) DO UPDATE SET
            preco = EXCLUDED.preco,
            descricao = EXCLUDED.descricao,
            updated_at = NOW()
        `, [tipo, modelo, comprimento, preco, descricao || `${tipo} ${modelo} ${comprimento}m`]);
        insertCount++;
      } catch (err) {
        console.log(`   Erro ao inserir: ${modelo} ${comprimento} - ${err.message}`);
      }
    }
  }

  console.log(`   ✓ ${insertCount} preços base inseridos/atualizados`);
}

async function processarOpcionais(client, sheetName, data) {
  console.log(`\n   Processando opcionais de: ${sheetName}`);

  const headers = data[0] || [];
  let insertCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    let nome = null;
    let codigo = null;
    let preco = null;
    let categoria = 'GERAL';
    let descricao = null;

    for (let j = 0; j < row.length; j++) {
      const header = (headers[j] || '').toString().toLowerCase();
      const value = row[j];

      if (!value && value !== 0) continue;

      if (header.includes('nome') || header.includes('opcional') || header.includes('item')) {
        nome = String(value);
      } else if (header.includes('codigo') || header.includes('cod')) {
        codigo = String(value);
      } else if (header.includes('preço') || header.includes('preco') || header.includes('valor')) {
        preco = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
      } else if (header.includes('categoria') || header.includes('tipo')) {
        categoria = String(value).toUpperCase();
      } else if (header.includes('descri')) {
        descricao = String(value);
      }
    }

    if (!nome && row[0]) nome = String(row[0]);
    if (!preco && row[1]) preco = parseFloat(String(row[1]).replace(/[^\d.,]/g, '').replace(',', '.'));

    if (nome && preco && !isNaN(preco)) {
      try {
        await client.query(`
          INSERT INTO comercial_precos_opcionais (nome, codigo, preco, categoria, descricao, ativo)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (codigo) DO UPDATE SET
            nome = EXCLUDED.nome,
            preco = EXCLUDED.preco,
            categoria = EXCLUDED.categoria,
            descricao = EXCLUDED.descricao,
            updated_at = NOW()
        `, [nome, codigo || nome.substring(0, 20).replace(/\s/g, '_').toUpperCase(), preco, categoria, descricao]);
        insertCount++;
      } catch (err) {
        console.log(`   Erro ao inserir opcional: ${nome} - ${err.message}`);
      }
    }
  }

  console.log(`   ✓ ${insertCount} opcionais inseridos/atualizados`);
}

async function processarConfiguracoes(client, sheetName, data) {
  console.log(`\n   Processando configurações de: ${sheetName}`);

  let insertCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const chave = String(row[0] || '').trim().toUpperCase().replace(/\s+/g, '_');
    const valor = row[1];
    const descricao = row[2] || '';

    if (chave && valor !== undefined && valor !== null) {
      try {
        await client.query(`
          INSERT INTO comercial_precos_config (chave, valor, descricao)
          VALUES ($1, $2, $3)
          ON CONFLICT (chave) DO UPDATE SET
            valor = EXCLUDED.valor,
            descricao = EXCLUDED.descricao,
            updated_at = NOW()
        `, [chave, String(valor), String(descricao)]);
        insertCount++;
      } catch (err) {
        console.log(`   Erro config: ${chave} - ${err.message}`);
      }
    }
  }

  console.log(`   ✓ ${insertCount} configurações inseridas/atualizadas`);
}

importPrecos();
