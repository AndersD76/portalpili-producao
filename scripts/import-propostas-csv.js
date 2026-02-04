/**
 * Script para importar propostas do CSV para o banco de dados
 * Uso: node scripts/import-propostas-csv.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const CSV_PATH = path.join(__dirname, '../docs/PROPOSTA COMERCIAL (respostas) - Respostas ao formulário 5 (2).csv');

// Função para parsear CSV (considerando campos com vírgulas dentro de aspas)
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || '';
    }
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Mapeia situação para status
function mapSituacao(situacao) {
  const map = {
    'TESTE': 'RASCUNHO',
    'FECHADA': 'APROVADA',
    'PERDIDA': 'PERDIDA',
    'SUBSTITUÍDO': 'CANCELADA',
    'SUBSTITUIDA': 'CANCELADA',
  };
  return map[situacao?.toUpperCase()] || 'RASCUNHO';
}

// Mapeia região
function mapRegiao(regiao) {
  const map = {
    'SUL': 'SUL',
    'SUDESTE': 'SUDESTE',
    'CENTRO-OESTE': 'CENTRO-OESTE',
    'NORTE': 'NORTE',
    'NORDESTE': 'NORDESTE',
  };
  return map[regiao?.toUpperCase()] || 'SUL';
}

// Parseia valor monetário brasileiro
function parseValor(valor) {
  if (!valor) return 0;
  // Remove R$, espaços e converte vírgula para ponto
  const cleaned = valor
    .replace(/R\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parseia data brasileira ou ISO
function parseData(data) {
  if (!data) return null;
  // Tenta formato DD/MM/YYYY HH:MM:SS ou DD/MM/YYYY
  const brMatch = data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  // Tenta formato YYYY-MM-DD
  const isoMatch = data.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return null;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Lendo arquivo CSV...');
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const records = parseCSV(content);
    console.log(`Encontradas ${records.length} propostas no CSV`);

    // Verifica/cria tabela de propostas comerciais
    await pool.query(`
      CREATE TABLE IF NOT EXISTS propostas_comerciais (
        id SERIAL PRIMARY KEY,
        numero_proposta VARCHAR(50) UNIQUE,
        situacao VARCHAR(50) DEFAULT 'RASCUNHO',
        data_criacao TIMESTAMP DEFAULT NOW(),
        data_validade DATE,

        -- Cliente
        cliente_nome VARCHAR(255),
        cliente_cnpj VARCHAR(20),
        cliente_email VARCHAR(255),
        cliente_pais VARCHAR(100) DEFAULT 'Brasil',
        cliente_estado VARCHAR(2),
        cliente_cidade VARCHAR(255),
        cliente_regiao VARCHAR(50),

        -- Vendedor
        vendedor_nome VARCHAR(255),
        vendedor_email VARCHAR(255),

        -- Produto
        tipo_produto VARCHAR(20), -- TOMBADOR ou COLETOR
        modelo VARCHAR(50),
        tamanho INT,
        capacidade INT,

        -- Especificações Tombador
        tipo_tombador VARCHAR(20), -- FIXO ou MOVEL
        comprimento_trilhos DECIMAL(10,2),
        angulo_inclinacao VARCHAR(20),
        economizador_energia BOOLEAN DEFAULT false,
        calco_manutencao VARCHAR(20),
        tipo_acionamento VARCHAR(20),
        kit_descida_rapida BOOLEAN DEFAULT false,
        travamento_movel BOOLEAN DEFAULT false,

        -- Especificações Coletor
        grau_rotacao VARCHAR(20),
        tipo_escada VARCHAR(50),
        platibanda BOOLEAN DEFAULT false,

        -- Elétrica
        voltagem INT,
        frequencia INT,
        qt_motores INT,
        qt_oleo INT,

        -- Valores
        quantidade INT DEFAULT 1,
        valor_equipamento DECIMAL(15,2),
        valor_total DECIMAL(15,2),
        forma_pagamento TEXT,
        tipo_frete VARCHAR(20), -- FOB ou CIF

        -- Garantia e prazos
        prazo_entrega VARCHAR(100),
        garantia_meses INT DEFAULT 6,

        -- Observações
        observacoes TEXT,
        outros_requisitos TEXT,

        -- Anexos
        anexos JSONB DEFAULT '[]',

        -- Metadados
        dados_completos JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Tabela de propostas verificada/criada');

    let importadas = 0;
    let erros = 0;

    for (const record of records) {
      try {
        const numeroProposta = record['Número da proposta'];
        if (!numeroProposta) continue;

        // Extrai dados principais
        const proposta = {
          numero_proposta: `PROP-${numeroProposta.padStart(5, '0')}`,
          situacao: mapSituacao(record['Situação']),
          data_criacao: parseData(record['Carimbo de data/hora']) || new Date(),
          data_validade: parseData(record['Validade da proposta (em dias)']),

          cliente_nome: record['Razão Social do Cliente:'],
          cliente_cnpj: record['CPF/CNPJ/RUC do Cliente:'],
          cliente_email: record['E-mail, telefone e/ou whatsApp do Cliente:'],
          cliente_pais: record['País (onde será instalado o equipamento):'] || 'Brasil',
          cliente_estado: record['Estado (onde será instalado o equipamento):'],
          cliente_cidade: record['Município (onde será instalado o equipamento):'],
          cliente_regiao: mapRegiao(record['Região:']),

          vendedor_nome: record['Vendedor e/ou Representante (Nome e Sobrenome):'],
          vendedor_email: record['E-mail do Vendedor/Representante:'],

          tipo_produto: record['Produto:']?.toUpperCase() || 'TOMBADOR',
          modelo: record['Modelo'] || record['Tamanho do tombador:'],
          tamanho: parseInt(record['Tamanho do tombador:']) || parseInt(record['Tamanho']) || 0,
          capacidade: parseInt(record['Capacidade']) || 0,

          tipo_tombador: record['Tipo:']?.toUpperCase() || 'FIXO',
          comprimento_trilhos: parseFloat(record['Comprimento dos trilhos (em metros):']) || 0,
          angulo_inclinacao: record['Ângulo de inclinação:'],
          economizador_energia: record['Economizador de energia:']?.toUpperCase() === 'COM',
          calco_manutencao: record['Calço de manutenção:'],
          tipo_acionamento: record['Tipo de acionamento:'],
          kit_descida_rapida: record['Kit de descida rápida:']?.toUpperCase() === 'COM',
          travamento_movel: record['Travamento móvel:']?.toUpperCase() === 'COM',

          grau_rotacao: record['Grau de rotação do coletor:'],
          tipo_escada: record['Tipo de escada do coletor:'],
          platibanda: record['Platibanda:']?.toUpperCase() === 'COM',

          voltagem: parseInt(record['Voltagem dos motores (V):']) || 380,
          frequencia: parseInt(record['Frequência dos motores (Hz):']) || 60,
          qt_motores: parseInt(record['Qt de motores']) || 1,
          qt_oleo: parseInt(record['Qt de óleo']) || 0,

          quantidade: parseInt(record['Quantidade de equipamento (UN) (TOMBADOR):']) ||
                      parseInt(record['Quantidade (UN) (COLETOR):']) || 1,
          valor_equipamento: parseValor(record['Preço do equipamento (R$) (TOMBADOR):']) ||
                            parseValor(record['Preço do equipamento (R$) (COLETOR):']),
          valor_total: parseValor(record['TOTAL GERAL (R$):']) ||
                      parseValor(record['TOTAL GERAL (COLETOR) R$:']),
          forma_pagamento: record['Detalhe a forma de pagamento (digitação livre):'] ||
                          record['Detalhe a forma de pagamento do coletor (digitação livre):'],
          tipo_frete: record['Tipo de frete:']?.toUpperCase() || 'FOB',

          prazo_entrega: record['Prazo de entrega (dias):'],
          garantia_meses: parseInt(record['Tempo de garantia (em meses):']) ||
                         parseInt(record['Tempo de garantia (em meses) do coletor:']) || 6,

          observacoes: record['Observações complementares:'],
          outros_requisitos: record['Outros requisitos solicitados pelo cliente:'] ||
                            record['Outros requisitos solicitados pelo cliente (COLETOR):'],

          dados_completos: record,
        };

        // Upsert na tabela
        await pool.query(`
          INSERT INTO propostas_comerciais (
            numero_proposta, situacao, data_criacao, data_validade,
            cliente_nome, cliente_cnpj, cliente_email, cliente_pais, cliente_estado, cliente_cidade, cliente_regiao,
            vendedor_nome, vendedor_email,
            tipo_produto, modelo, tamanho, capacidade,
            tipo_tombador, comprimento_trilhos, angulo_inclinacao, economizador_energia, calco_manutencao, tipo_acionamento, kit_descida_rapida, travamento_movel,
            grau_rotacao, tipo_escada, platibanda,
            voltagem, frequencia, qt_motores, qt_oleo,
            quantidade, valor_equipamento, valor_total, forma_pagamento, tipo_frete,
            prazo_entrega, garantia_meses,
            observacoes, outros_requisitos,
            dados_completos
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10, $11,
            $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25,
            $26, $27, $28,
            $29, $30, $31, $32,
            $33, $34, $35, $36, $37,
            $38, $39,
            $40, $41,
            $42
          )
          ON CONFLICT (numero_proposta) DO UPDATE SET
            situacao = EXCLUDED.situacao,
            cliente_nome = EXCLUDED.cliente_nome,
            valor_total = EXCLUDED.valor_total,
            dados_completos = EXCLUDED.dados_completos,
            updated_at = NOW()
        `, [
          proposta.numero_proposta, proposta.situacao, proposta.data_criacao, proposta.data_validade,
          proposta.cliente_nome, proposta.cliente_cnpj, proposta.cliente_email, proposta.cliente_pais, proposta.cliente_estado, proposta.cliente_cidade, proposta.cliente_regiao,
          proposta.vendedor_nome, proposta.vendedor_email,
          proposta.tipo_produto, proposta.modelo, proposta.tamanho, proposta.capacidade,
          proposta.tipo_tombador, proposta.comprimento_trilhos, proposta.angulo_inclinacao, proposta.economizador_energia, proposta.calco_manutencao, proposta.tipo_acionamento, proposta.kit_descida_rapida, proposta.travamento_movel,
          proposta.grau_rotacao, proposta.tipo_escada, proposta.platibanda,
          proposta.voltagem, proposta.frequencia, proposta.qt_motores, proposta.qt_oleo,
          proposta.quantidade, proposta.valor_equipamento, proposta.valor_total, proposta.forma_pagamento, proposta.tipo_frete,
          proposta.prazo_entrega, proposta.garantia_meses,
          proposta.observacoes, proposta.outros_requisitos,
          JSON.stringify(proposta.dados_completos)
        ]);

        importadas++;
        console.log(`Importada proposta ${proposta.numero_proposta}: ${proposta.cliente_nome} - ${proposta.tipo_produto}`);

      } catch (err) {
        erros++;
        console.error(`Erro ao importar proposta ${record['Número da proposta']}:`, err.message);
      }
    }

    console.log('\n=== RESUMO DA IMPORTAÇÃO ===');
    console.log(`Total de registros: ${records.length}`);
    console.log(`Importados com sucesso: ${importadas}`);
    console.log(`Erros: ${erros}`);

    // Estatísticas
    const stats = await pool.query(`
      SELECT
        tipo_produto,
        situacao,
        COUNT(*) as total,
        SUM(valor_total) as valor_total
      FROM propostas_comerciais
      GROUP BY tipo_produto, situacao
      ORDER BY tipo_produto, situacao
    `);

    console.log('\n=== ESTATÍSTICAS ===');
    stats.rows.forEach(s => {
      console.log(`${s.tipo_produto} - ${s.situacao}: ${s.total} propostas (R$ ${Number(s.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})})`);
    });

  } catch (err) {
    console.error('Erro geral:', err.message);
  } finally {
    await pool.end();
  }
}

main();
