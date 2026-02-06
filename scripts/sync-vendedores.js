/**
 * Script para sincronizar vendedores do CSV com o banco de dados
 * e vincular propostas aos vendedores corretos
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Lista de nomes de vendedores validos conhecidos
const VENDEDORES_CONHECIDOS = [
  'VINICIUS MOTA',
  'LUIS ALBERTO ROOS',
  'ROBSON BORTOLOSO',
  'CLARICE PICOLI',
  'EDERSON RODRIGUES DA SILVA',
  'EDERSON RODRIGUES',
  'RICARDO FOLETTO',
  'GIOVANI PILI',
  'TIAGO GEVINSKI',
  'FABIO GILIOLI',
  'VAGNER DO REIS',
  'WAGNER DO REIS',
  'EVERTON BERTUOL',
  'MAGNES FIGUEIREDO',
  'CELSO PAROT DE OLIVEIRA',
  'MATEUS DE BONA',
  'PAULO RICARDO TAVARES',
  'DANIEL ANDERS',
  'EDER GAVA',
  'EDIMARA TRINDADE',
  'EZEQUIEL TRINDADE',
  'FERNANDO RAU',
  'NETO BELLO',
  'CESAR RAMOS',
  'CLAYTON FRITSCHE',
  'MARCELO FERREIRA',
  'MARCOS SULIGO',
  'JEFERSON BECKER',
  'LUCIANO',
  'MIRO',
  'ERNANI',
  'ESTEVAM JUNIOR',
  'VICENTE'
];

// Normalizar nome para comparacao
function normalizarNome(nome) {
  if (!nome) return '';
  return nome.toString().trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
}

// Verificar se parece ser um nome de pessoa valido
function nomeValido(nome) {
  if (!nome || typeof nome !== 'string') return false;
  const nomeNorm = normalizarNome(nome);

  // Verificar se esta na lista de vendedores conhecidos
  for (const conhecido of VENDEDORES_CONHECIDOS) {
    if (nomeNorm.includes(conhecido) || conhecido.includes(nomeNorm)) {
      return true;
    }
  }

  // Verificar padroes que indicam que NAO e um nome
  const invalidPatterns = [
    /^\d/, // comeca com numero
    /http/i,
    /R\$/,
    /eixos/i,
    /metros/i,
    /acess[oó]rios/i,
    /equipamento/i,
    /cliente/i,
    /proposta/i,
    /tombador/i,
    /moega/i,
    /plataforma/i,
    /coletor/i,
    /venda/i,
    /pedido/i,
    /entrega/i,
    /pagamento/i,
    /frete/i,
    /contrato/i,
    /instalação/i,
    /montagem/i,
    /kg/i,
    /mm\b/i,
    /cv\b/i,
    /\d{2}\/\d{2}/, // data
    /@/, // email
    /drive\.google/,
    /^\s*$/
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(nome)) return false;
  }

  // Deve ter entre 3 e 50 caracteres
  if (nome.length < 3 || nome.length > 50) return false;

  // Deve parecer um nome (ter espacos ou ser curto)
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1 && nome.length > 15) return false; // palavra unica muito longa

  return true;
}

// Gerar email a partir do nome
function gerarEmail(nome) {
  const nomeLimpo = nome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '');
  const partes = nomeLimpo.split(/\s+/).filter(p => p);
  if (partes.length >= 2) {
    return `${partes[0]}.${partes[partes.length - 1]}@pili.ind.br`;
  }
  return partes[0] ? `${partes[0]}@pili.ind.br` : 'vendedor@pili.ind.br';
}

// Parser simples de CSV
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

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
  }
  return { headers, rows };
}

async function syncVendedores() {
  const client = await pool.connect();

  try {
    console.log('='.repeat(68));
    console.log('    SINCRONIZANDO VENDEDORES E VINCULANDO PROPOSTAS');
    console.log('='.repeat(68));

    // Ler CSV
    const csvPath = path.join(__dirname, '..', 'docs', 'PROPOSTA COMERCIAL (respostas) - Respostas ao formulário 5 (2).csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const { headers, rows } = parseCSV(csvContent);

    // Encontrar colunas relevantes
    let vendCol = headers.find(h => h.toLowerCase().includes('vendedor') && h.toLowerCase().includes('representante'));
    let numCol = headers.find(h => h.toLowerCase().includes('mero da proposta'));
    let emailCol = headers.find(h => h.toLowerCase().includes('e-mail do vendedor'));

    console.log(`\nColunas encontradas:`);
    console.log(`  Vendedor: ${vendCol}`);
    console.log(`  Numero: ${numCol}`);
    console.log(`  Email: ${emailCol}`);

    // 1. Buscar vendedores existentes no banco
    const vendedoresBd = await client.query('SELECT id, nome, email FROM crm_vendedores');
    const mapaVendedoresBd = {};
    vendedoresBd.rows.forEach(v => {
      mapaVendedoresBd[normalizarNome(v.nome)] = { id: v.id, nome: v.nome, email: v.email };
    });
    console.log(`\nVendedores no banco: ${vendedoresBd.rows.length}`);

    // 2. Identificar vendedores unicos no CSV (filtrando nomes validos)
    const vendedoresCsv = new Map(); // nome_norm -> nome_original
    rows.forEach(row => {
      if (row[vendCol]) {
        const nome = row[vendCol].trim();
        if (nomeValido(nome)) {
          const nomeNorm = normalizarNome(nome);
          if (!vendedoresCsv.has(nomeNorm)) {
            vendedoresCsv.set(nomeNorm, nome);
          }
        }
      }
    });
    console.log(`Vendedores validos no CSV: ${vendedoresCsv.size}`);

    // Listar vendedores encontrados
    console.log('\nVendedores identificados:');
    for (const [norm, nome] of vendedoresCsv) {
      const existe = mapaVendedoresBd[norm] ? 'OK' : 'NOVO';
      console.log(`  [${existe}] ${nome}`);
    }

    // 3. Criar vendedores que nao existem
    await client.query('BEGIN');

    let vendedoresCriados = 0;
    const mapaVendedores = {}; // nome_normalizado -> vendedor_id

    for (const [nomeNorm, nomeCsv] of vendedoresCsv) {
      if (mapaVendedoresBd[nomeNorm]) {
        mapaVendedores[nomeNorm] = mapaVendedoresBd[nomeNorm].id;
      } else {
        // Buscar email do CSV se existir
        let emailCsv = null;
        if (emailCol) {
          const rowComEmail = rows.find(r => normalizarNome(r[vendCol]) === nomeNorm && r[emailCol]);
          if (rowComEmail) {
            emailCsv = rowComEmail[emailCol];
          }
        }

        let email = emailCsv || gerarEmail(nomeCsv);

        // Verificar se email ja existe
        const emailExiste = await client.query('SELECT id FROM crm_vendedores WHERE email = $1', [email]);
        if (emailExiste.rows.length > 0) {
          // Email existe, adicionar sufixo
          email = email.replace('@', `.${vendedoresCriados + 1}@`);
        }

        // Criar vendedor SEM usuario (usuario_id = null)
        const vendedorResult = await client.query(`
          INSERT INTO crm_vendedores (nome, email, ativo, created_at, updated_at)
          VALUES ($1, $2, true, NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
          RETURNING id
        `, [nomeCsv, email]);
        const vendedorId = vendedorResult.rows[0].id;

        mapaVendedores[nomeNorm] = vendedorId;
        vendedoresCriados++;
        console.log(`  Criado: ${nomeCsv} (${email}) -> ID ${vendedorId}`);
      }
    }

    await client.query('COMMIT');
    console.log(`\nVendedores criados: ${vendedoresCriados}`);

    // 4. Atualizar propostas com vendedor_id
    console.log('\nAtualizando propostas com vendedores...');
    await client.query('BEGIN');

    // Agrupar por numero da proposta (pegar ultima ocorrencia com vendedor valido)
    const propostasPorNumero = {};
    rows.forEach(row => {
      const numero = parseInt(row[numCol]);
      const vendedor = row[vendCol] ? row[vendCol].trim() : '';
      if (numero && nomeValido(vendedor)) {
        propostasPorNumero[numero] = vendedor;
      }
    });

    let atualizadas = 0;
    let naoEncontradas = 0;

    for (const [numero, vendedorNome] of Object.entries(propostasPorNumero)) {
      const nomeNorm = normalizarNome(vendedorNome);

      if (!mapaVendedores[nomeNorm]) {
        continue;
      }

      const vendedorId = mapaVendedores[nomeNorm];

      // Atualizar proposta
      const propResult = await client.query(`
        UPDATE crm_propostas
        SET vendedor_id = $1, updated_at = NOW()
        WHERE numero_proposta = $2
        RETURNING id, oportunidade_id
      `, [vendedorId, parseInt(numero)]);

      if (propResult.rows.length > 0) {
        // Atualizar oportunidade tambem
        const oportunidadeId = propResult.rows[0].oportunidade_id;
        if (oportunidadeId) {
          await client.query(`
            UPDATE crm_oportunidades
            SET vendedor_id = $1, updated_at = NOW()
            WHERE id = $2
          `, [vendedorId, oportunidadeId]);
        }
        atualizadas++;
      } else {
        naoEncontradas++;
      }
    }

    await client.query('COMMIT');

    console.log('='.repeat(68));
    console.log(`Propostas atualizadas: ${atualizadas}`);
    console.log(`Nao encontradas: ${naoEncontradas}`);

    // 5. Verificar resultado
    console.log('\nPROPOSTAS POR VENDEDOR:');
    console.log('-'.repeat(68));

    const resultado = await client.query(`
      SELECT v.nome, COUNT(p.id) as total, COALESCE(SUM(p.valor_total), 0) as valor
      FROM crm_vendedores v
      LEFT JOIN crm_propostas p ON p.vendedor_id = v.id
      GROUP BY v.id, v.nome
      HAVING COUNT(p.id) > 0
      ORDER BY total DESC
    `);

    resultado.rows.forEach(row => {
      const valor = Number(row.valor) || 0;
      console.log(`   ${row.nome.padEnd(30)} ${String(row.total).padStart(4)} propostas - R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    });

    // Total de propostas vinculadas
    const totalVinculadas = await client.query(`
      SELECT COUNT(*) as total FROM crm_propostas WHERE vendedor_id IS NOT NULL
    `);
    const totalPropostas = await client.query(`
      SELECT COUNT(*) as total FROM crm_propostas
    `);

    console.log('\n' + '='.repeat(68));
    console.log(`Total vinculadas: ${totalVinculadas.rows[0].total}/${totalPropostas.rows[0].total} propostas`);
    console.log('    SINCRONIZACAO DE VENDEDORES CONCLUIDA!');
    console.log('='.repeat(68));

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERRO:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

syncVendedores();
