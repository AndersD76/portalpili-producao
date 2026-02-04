/**
 * Script de Importação Completa - Módulo Comercial PILI
 *
 * Importa:
 * - Preços Base da planilha PRECIFICADOR PILI.xlsx
 * - Propostas do CSV de respostas do formulário
 * - Vendedores e Clientes encontrados nos dados
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DOCS_PATH = path.join(__dirname, '../docs');

async function main() {
  const client = await pool.connect();

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  IMPORTAÇÃO COMPLETA - MÓDULO COMERCIAL PILI');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Garantir tabelas existem
    await criarTabelas(client);

    // 2. Importar Preços do Excel
    await importarPrecosExcel(client);

    // 3. Importar Propostas do CSV
    await importarPropostasCSV(client);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('ERRO FATAL:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function criarTabelas(client) {
  console.log('📋 Verificando/Criando tabelas...\n');

  // Tabela de vendedores
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_vendedores (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      telefone VARCHAR(50),
      cargo VARCHAR(100) DEFAULT 'VENDEDOR',
      comissao_percentual DECIMAL(5,2) DEFAULT 4.8,
      meta_mensal DECIMAL(15,2),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabela de clientes
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_clientes (
      id SERIAL PRIMARY KEY,
      razao_social VARCHAR(255) NOT NULL,
      nome_fantasia VARCHAR(255),
      cpf_cnpj VARCHAR(20),
      email VARCHAR(255),
      telefone VARCHAR(50),
      pais VARCHAR(100) DEFAULT 'Brasil',
      estado VARCHAR(50),
      cidade VARCHAR(100),
      regiao VARCHAR(50),
      endereco TEXT,
      segmento VARCHAR(100),
      status VARCHAR(50) DEFAULT 'ATIVO',
      vendedor_id INTEGER REFERENCES crm_vendedores(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabela de preços base
  await client.query(`
    CREATE TABLE IF NOT EXISTS comercial_precos_base (
      id SERIAL PRIMARY KEY,
      produto VARCHAR(50) NOT NULL,
      modelo VARCHAR(100) NOT NULL,
      comprimento INTEGER NOT NULL,
      preco DECIMAL(15,2) NOT NULL,
      descricao TEXT,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(produto, modelo, comprimento)
    )
  `);

  // Tabela de preços opcionais
  await client.query(`
    CREATE TABLE IF NOT EXISTS comercial_precos_opcionais (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      codigo VARCHAR(50) UNIQUE,
      preco DECIMAL(15,2) NOT NULL,
      categoria VARCHAR(100) DEFAULT 'GERAL',
      descricao TEXT,
      aplicavel_tombador BOOLEAN DEFAULT true,
      aplicavel_coletor BOOLEAN DEFAULT true,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabela de configurações
  await client.query(`
    CREATE TABLE IF NOT EXISTS comercial_precos_config (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(100) UNIQUE NOT NULL,
      valor TEXT NOT NULL,
      descricao TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabela de propostas
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_propostas (
      id SERIAL PRIMARY KEY,
      numero VARCHAR(50) UNIQUE,
      numero_proposta INTEGER,
      situacao VARCHAR(50) DEFAULT 'RASCUNHO',
      data_proposta TIMESTAMP,
      data_validade DATE,

      -- Relacionamentos
      vendedor_id INTEGER REFERENCES crm_vendedores(id),
      cliente_id INTEGER REFERENCES crm_clientes(id),
      oportunidade_id INTEGER,

      -- Produto
      produto VARCHAR(50),

      -- Tombador
      tombador_tamanho INTEGER,
      tombador_tipo VARCHAR(50),
      tombador_modelo VARCHAR(100),
      tombador_comprimento_trilhos DECIMAL(10,2),
      tombador_quantidade INTEGER DEFAULT 1,
      tombador_preco_base DECIMAL(15,2),
      tombador_subtotal_opcionais DECIMAL(15,2),
      tombador_total_geral DECIMAL(15,2),

      -- Coletor
      coletor_tipo VARCHAR(50),
      coletor_grau_rotacao INTEGER,
      coletor_comprimento_trilhos DECIMAL(10,2),
      coletor_modelo VARCHAR(100),
      coletor_quantidade INTEGER DEFAULT 1,
      coletor_preco_base DECIMAL(15,2),
      coletor_subtotal_opcionais DECIMAL(15,2),
      coletor_total_geral DECIMAL(15,2),

      -- Valores
      desconto_percentual DECIMAL(5,2) DEFAULT 0,
      desconto_valor DECIMAL(15,2) DEFAULT 0,
      valor_total DECIMAL(15,2),

      -- Comercial
      prazo_entrega_dias INTEGER,
      data_visita DATE,
      chance_negocio INTEGER,
      forma_pagamento TEXT,
      tipo_frete VARCHAR(50),
      garantia_meses INTEGER DEFAULT 6,

      -- Localização
      pais VARCHAR(100),
      estado VARCHAR(50),
      cidade VARCHAR(100),
      regiao VARCHAR(50),

      -- Detalhes técnicos (JSON)
      especificacoes_tecnicas JSONB,
      opcionais_selecionados JSONB,

      -- Observações
      observacoes TEXT,
      descricao_produto TEXT,

      -- Status
      criterios_atendidos JSONB,
      acao_necessaria TEXT,
      situacao_fechada VARCHAR(50),
      data_entrega DATE,
      motivo_perda TEXT,

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabela de atividades
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_atividades (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(50) NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      descricao TEXT,
      data_prevista TIMESTAMP,
      data_realizada TIMESTAMP,
      status VARCHAR(50) DEFAULT 'PENDENTE',
      prioridade VARCHAR(20) DEFAULT 'MEDIA',

      vendedor_id INTEGER REFERENCES crm_vendedores(id),
      cliente_id INTEGER REFERENCES crm_clientes(id),
      proposta_id INTEGER REFERENCES crm_propostas(id),
      oportunidade_id INTEGER,

      resultado TEXT,
      proxima_acao TEXT,

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tabela de oportunidades (pipeline)
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_oportunidades (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      descricao TEXT,
      valor_estimado DECIMAL(15,2),

      estagio VARCHAR(50) DEFAULT 'PROSPECCAO',
      probabilidade INTEGER DEFAULT 10,

      vendedor_id INTEGER REFERENCES crm_vendedores(id),
      cliente_id INTEGER REFERENCES crm_clientes(id),

      data_previsao_fechamento DATE,
      data_fechamento DATE,
      motivo_perda TEXT,

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('   ✓ Tabelas verificadas/criadas\n');
}

async function importarPrecosExcel(client) {
  console.log('📊 Importando preços do Excel...\n');

  const excelPath = path.join(DOCS_PATH, 'PRECIFICADOR PILI.xlsx');

  if (!fs.existsSync(excelPath)) {
    console.log('   ⚠ Arquivo PRECIFICADOR PILI.xlsx não encontrado\n');
    return;
  }

  const workbook = XLSX.readFile(excelPath);
  console.log('   Abas encontradas:', workbook.SheetNames.join(', '));

  let totalPrecos = 0;
  let totalOpcionais = 0;
  let totalConfig = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (data.length === 0) continue;

    const sheetLower = sheetName.toLowerCase();

    // Mostrar estrutura
    console.log(`\n   Aba "${sheetName}" - ${data.length} linhas`);
    if (data[0]) {
      console.log('   Colunas:', Object.keys(data[0]).join(', '));
    }

    // Tentar importar baseado no nome da aba
    if (sheetLower.includes('tombador')) {
      const count = await importarPrecosAba(client, data, 'TOMBADOR');
      totalPrecos += count;
    } else if (sheetLower.includes('coletor')) {
      const count = await importarPrecosAba(client, data, 'COLETOR');
      totalPrecos += count;
    } else if (sheetLower.includes('opcional') || sheetLower.includes('acessorio')) {
      const count = await importarOpcionaisAba(client, data);
      totalOpcionais += count;
    } else if (sheetLower.includes('config') || sheetLower.includes('param')) {
      const count = await importarConfigAba(client, data);
      totalConfig += count;
    } else {
      // Tentar detectar automaticamente pelo conteúdo
      const firstRow = data[0];
      const keys = Object.keys(firstRow).map(k => k.toLowerCase());

      if (keys.some(k => k.includes('preco') || k.includes('valor'))) {
        if (keys.some(k => k.includes('modelo') || k.includes('tamanho'))) {
          // Parece preço base
          const count = await importarPrecosAba(client, data, 'TOMBADOR');
          totalPrecos += count;
        } else if (keys.some(k => k.includes('nome') || k.includes('opcional'))) {
          // Parece opcional
          const count = await importarOpcionaisAba(client, data);
          totalOpcionais += count;
        }
      }
    }
  }

  console.log(`\n   ✓ ${totalPrecos} preços base importados`);
  console.log(`   ✓ ${totalOpcionais} opcionais importados`);
  console.log(`   ✓ ${totalConfig} configurações importadas\n`);
}

async function importarPrecosAba(client, data, tipoProduto) {
  let count = 0;

  for (const row of data) {
    // Encontrar campos relevantes
    let modelo = null;
    let comprimento = null;
    let preco = null;
    let descricao = null;

    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;

      const keyLower = key.toLowerCase();

      if (keyLower.includes('modelo') || keyLower.includes('tipo') || keyLower.includes('nome')) {
        modelo = String(value).trim();
      } else if (keyLower.includes('comprimento') || keyLower.includes('tamanho') || keyLower.includes('metro') || keyLower.includes('grau')) {
        comprimento = parseFloat(value);
      } else if (keyLower.includes('preco') || keyLower.includes('valor') || keyLower.includes('r$')) {
        const numStr = String(value).replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
        preco = parseFloat(numStr);
      } else if (keyLower.includes('descri')) {
        descricao = String(value);
      }
    }

    if (modelo && comprimento && preco && !isNaN(preco) && preco > 0) {
      try {
        await client.query(`
          INSERT INTO comercial_precos_base (produto, modelo, comprimento, preco, descricao, ativo)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (produto, modelo, comprimento) DO UPDATE SET
            preco = EXCLUDED.preco,
            descricao = COALESCE(EXCLUDED.descricao, comercial_precos_base.descricao),
            updated_at = NOW()
        `, [tipoProduto, modelo, comprimento, preco, descricao]);
        count++;
      } catch (err) {
        // Ignorar erros de duplicata
      }
    }
  }

  return count;
}

async function importarOpcionaisAba(client, data) {
  let count = 0;

  for (const row of data) {
    let nome = null;
    let codigo = null;
    let preco = null;
    let categoria = 'GERAL';
    let descricao = null;

    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;

      const keyLower = key.toLowerCase();

      if (keyLower.includes('nome') || keyLower.includes('opcional') || keyLower.includes('item')) {
        nome = String(value).trim();
      } else if (keyLower.includes('codigo') || keyLower.includes('cod')) {
        codigo = String(value).trim();
      } else if (keyLower.includes('preco') || keyLower.includes('valor')) {
        const numStr = String(value).replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
        preco = parseFloat(numStr);
      } else if (keyLower.includes('categoria') || keyLower.includes('tipo')) {
        categoria = String(value).toUpperCase();
      } else if (keyLower.includes('descri')) {
        descricao = String(value);
      }
    }

    if (nome && preco && !isNaN(preco)) {
      const codigoFinal = codigo || nome.substring(0, 30).replace(/\s+/g, '_').toUpperCase();

      try {
        await client.query(`
          INSERT INTO comercial_precos_opcionais (nome, codigo, preco, categoria, descricao, ativo)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (codigo) DO UPDATE SET
            nome = EXCLUDED.nome,
            preco = EXCLUDED.preco,
            categoria = EXCLUDED.categoria,
            descricao = COALESCE(EXCLUDED.descricao, comercial_precos_opcionais.descricao),
            updated_at = NOW()
        `, [nome, codigoFinal, preco, categoria, descricao]);
        count++;
      } catch (err) {
        // Ignorar erros
      }
    }
  }

  return count;
}

async function importarConfigAba(client, data) {
  let count = 0;

  for (const row of data) {
    const entries = Object.entries(row);
    if (entries.length < 2) continue;

    const chave = String(entries[0][1] || '').trim().toUpperCase().replace(/\s+/g, '_');
    const valor = entries[1][1];
    const descricao = entries[2] ? entries[2][1] : '';

    if (chave && valor !== null && valor !== undefined) {
      try {
        await client.query(`
          INSERT INTO comercial_precos_config (chave, valor, descricao)
          VALUES ($1, $2, $3)
          ON CONFLICT (chave) DO UPDATE SET
            valor = EXCLUDED.valor,
            descricao = COALESCE(EXCLUDED.descricao, comercial_precos_config.descricao),
            updated_at = NOW()
        `, [chave, String(valor), String(descricao || '')]);
        count++;
      } catch (err) {
        // Ignorar erros
      }
    }
  }

  return count;
}

async function importarPropostasCSV(client) {
  console.log('📄 Importando propostas do CSV...\n');

  const csvPath = path.join(DOCS_PATH, 'PROPOSTA COMERCIAL (respostas) - Respostas ao formulário 5 (2).csv');

  if (!fs.existsSync(csvPath)) {
    console.log('   ⚠ Arquivo CSV não encontrado\n');
    return;
  }

  const workbook = XLSX.readFile(csvPath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`   Total de linhas: ${data.length}`);

  // Cache de vendedores e clientes
  const vendedoresCache = new Map();
  const clientesCache = new Map();

  let importados = 0;
  let erros = 0;

  for (const row of data) {
    try {
      // 1. Garantir vendedor existe
      const vendedorNome = row['Vendedor e/ou Representante (Nome e Sobrenome):'] || 'Desconhecido';
      const vendedorEmail = row['E-mail do Vendedor/Representante:'] || '';

      let vendedorId = vendedoresCache.get(vendedorNome.toLowerCase());
      if (!vendedorId) {
        const vendedorResult = await client.query(`
          INSERT INTO crm_vendedores (nome, email, ativo)
          VALUES ($1, $2, true)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [vendedorNome, vendedorEmail]);

        if (vendedorResult.rows[0]) {
          vendedorId = vendedorResult.rows[0].id;
        } else {
          const existing = await client.query(
            `SELECT id FROM crm_vendedores WHERE LOWER(nome) = LOWER($1)`,
            [vendedorNome]
          );
          vendedorId = existing.rows[0]?.id;
        }

        vendedoresCache.set(vendedorNome.toLowerCase(), vendedorId);
      }

      // 2. Garantir cliente existe
      const clienteNome = row['Razão Social do Cliente:'] || 'Cliente Desconhecido';
      const clienteCnpj = row['CPF/CNPJ/RUC do Cliente:'] || '';
      const clienteEmail = row['E-mail, telefone e/ou whatsApp do Cliente:'] || '';

      let clienteId = clientesCache.get(clienteNome.toLowerCase());
      if (!clienteId) {
        const clienteResult = await client.query(`
          INSERT INTO crm_clientes (razao_social, cpf_cnpj, email, pais, estado, cidade, regiao, vendedor_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          clienteNome,
          clienteCnpj,
          clienteEmail,
          row['País (onde será instalado o equipamento):'] || 'Brasil',
          row['Estado (onde será instalado o equipamento):'] || '',
          row['Município (onde será instalado o equipamento):'] || '',
          row['Região:'] || '',
          vendedorId
        ]);

        if (clienteResult.rows[0]) {
          clienteId = clienteResult.rows[0].id;
        } else {
          const existing = await client.query(
            `SELECT id FROM crm_clientes WHERE LOWER(razao_social) = LOWER($1)`,
            [clienteNome]
          );
          clienteId = existing.rows[0]?.id;
        }

        clientesCache.set(clienteNome.toLowerCase(), clienteId);
      }

      // 3. Inserir proposta
      const numeroProposta = parseInt(row['Número da proposta']) || null;
      const produto = row['Produto:'] || 'TOMBADOR';
      const situacao = row['Situação'] || row['Situação da proposta:'] || 'RASCUNHO';

      // Parse data
      const dataPropostaStr = row['Carimbo de data/hora'];
      let dataProposta = null;
      if (dataPropostaStr) {
        const parts = dataPropostaStr.split(' ')[0].split('/');
        if (parts.length === 3) {
          dataProposta = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }

      // Parse valores
      const parseValor = (str) => {
        if (!str) return null;
        const numStr = String(str).replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(numStr);
        return isNaN(num) ? null : num;
      };

      // Especificações técnicas
      const especTecnicas = {
        tipo: row['Tipo:'],
        economizadorEnergia: row['Economizador de energia:'],
        calcoManutencao: row['Calço de manutenção:'],
        tipoAcionamento: row['Tipo de acionamento:'],
        kitDescidaRapida: row['Kit de descida rápida:'],
        mangueirasHidraulicas: row['Quantidade de mangueiras hidráulicas (em metros):'],
        redesEletricas: row['Quantidade de rede elétricas (em metros):'],
        voltagemMotores: row['Voltagem dos motores (V):'],
        frequenciaMotores: row['Frequência dos motores (Hz):'],
        travamentoMovel: row['Travamento móvel:'],
        rampas: row['Rampas:'],
        enclausuramento: row['Enclausuramento:'],
        botoeiras: row['Botoeiras:'],
        tipoMoldura: row['Tipo de moldura:'],
        guindaste: row['Guindaste:'],
        oleo: row['Óleo:'],
      };

      await client.query(`
        INSERT INTO crm_propostas (
          numero_proposta, situacao, data_proposta, vendedor_id, cliente_id,
          produto,
          tombador_tamanho, tombador_tipo, tombador_modelo, tombador_quantidade, tombador_preco_base, tombador_total_geral,
          coletor_tipo, coletor_grau_rotacao, coletor_quantidade, coletor_preco_base, coletor_total_geral,
          prazo_entrega_dias, chance_negocio, forma_pagamento, tipo_frete, garantia_meses,
          pais, estado, cidade, regiao,
          especificacoes_tecnicas, observacoes, descricao_produto
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27, $28, $29
        )
        ON CONFLICT (numero_proposta) WHERE numero_proposta IS NOT NULL DO UPDATE SET
          situacao = EXCLUDED.situacao,
          updated_at = NOW()
      `, [
        numeroProposta,
        situacao,
        dataProposta,
        vendedorId,
        clienteId,
        produto,
        // Tombador
        parseInt(row['Tamanho do tombador:']) || null,
        row['Tipo:'],
        row['Modelo'] || row['tombador_modelo'],
        parseInt(row['Quantidade de equipamento (UN) (TOMBADOR):']) || 1,
        parseValor(row['Preço do equipamento (R$) (TOMBADOR):']),
        parseValor(row['TOTAL GERAL (R$):']),
        // Coletor
        row['Tipo de coletor:'],
        parseInt(row['Grau de rotação do coletor:']) || null,
        parseInt(row['Quantidade (UN) (COLETOR):']) || 1,
        parseValor(row['Preço do equipamento (R$) (COLETOR):']),
        parseValor(row['TOTAL GERAL (COLETOR) R$:']),
        // Comercial
        parseInt(row['Prazo de entrega (dias):']) || null,
        parseInt(row['Chance do negócio se concretizar:']?.match(/\d+/)?.[0]) || null,
        row['Detalhe a forma de pagamento (digitação livre):'] || row['Detalhe a forma de pagamento do coletor (digitação livre):'],
        row['Tipo de frete:'] || row['Tipo de frete para o cliente (COLETOR):'],
        parseInt(row['Tempo de garantia (em meses):'] || row['Tempo de garantia (em meses) do coletor:']) || 6,
        // Localização
        row['País (onde será instalado o equipamento):'] || 'Brasil',
        row['Estado (onde será instalado o equipamento):'],
        row['Município (onde será instalado o equipamento):'],
        row['Região:'],
        // Extras
        JSON.stringify(especTecnicas),
        row['Observações complementares:'],
        row['Descreva (digitação livre) (TOMBADOR):'] || row['Descreva (digitação livre) (COLETOR):']
      ]);

      importados++;

      if (importados % 100 === 0) {
        console.log(`   ... ${importados} propostas importadas`);
      }

    } catch (err) {
      erros++;
      if (erros <= 5) {
        console.log(`   Erro na proposta ${row['Número da proposta']}: ${err.message}`);
      }
    }
  }

  console.log(`\n   ✓ ${importados} propostas importadas`);
  console.log(`   ✓ ${vendedoresCache.size} vendedores cadastrados`);
  console.log(`   ✓ ${clientesCache.size} clientes cadastrados`);
  if (erros > 0) {
    console.log(`   ⚠ ${erros} erros (ignorados)\n`);
  }
}

main();
