/**
 * Reset completo: limpa dados de sync e re-importa da planilha
 *
 * 1. Limpa propostas_comerciais (tudo vem da planilha)
 * 2. Remove oportunidades geradas pelo sync/migrate
 * 3. Re-importa da planilha Google Sheets
 * 4. Cria oportunidades corretas
 *
 * Executa: node scripts/reset-sync.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SPREADSHEET_ID = '1-rxFnIAOFtg-sx0LN6NMLCrFGGcy0qE7ONTr4iTxSC4';
const PROPOSTAS_GID = '1005054371';

// ==================== CSV Parser ====================

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

// ==================== Helpers ====================

function parseValorBR(valor) {
  if (!valor) return null;
  const limpo = valor.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
}

function parseDataBR(data) {
  if (!data) return null;
  const match = data.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2})?:?(\d{2})?:?(\d{2})?/);
  if (!match) return null;
  const [, dia, mes, ano, hora, min, seg] = match;
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora || '0'), parseInt(min || '0'), parseInt(seg || '0'));
}

function parseProbabilidade(prob) {
  if (!prob) return null;
  const match = prob.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) * 10;
}

const ESTADO_SIGLAS = {
  'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
  'goias': 'GO', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
  'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
  'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};
const SIGLAS_VALIDAS = new Set(Object.values(ESTADO_SIGLAS));

function normalizarEstado(valor) {
  if (!valor) return '';
  const limpo = valor.trim();
  if (limpo.length === 2 && SIGLAS_VALIDAS.has(limpo.toUpperCase())) return limpo.toUpperCase();
  const normalizado = limpo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ESTADO_SIGLAS[normalizado] || limpo.substring(0, 2).toUpperCase();
}

function mapSituacaoToEstagio(situacao) {
  const s = (situacao || '').trim().toUpperCase();
  switch (s) {
    case 'EM NEGOCIAÇÃO': return { estagio: 'EM_NEGOCIACAO', status: 'ABERTA' };
    case 'EM ANÁLISE': return { estagio: 'EM_ANALISE', status: 'ABERTA' };
    case 'FECHADA': return { estagio: 'FECHADA', status: 'GANHA' };
    case 'PERDIDA': return { estagio: 'PERDIDA', status: 'PERDIDA' };
    case 'SUSPENSO': case 'SUSPENSA': return { estagio: 'SUSPENSO', status: 'SUSPENSA' };
    case 'SUBSTITUÍDO': case 'SUBSTITUIDA': return { estagio: 'SUBSTITUIDO', status: 'ABERTA' };
    case 'TESTE': return { estagio: 'PROPOSTA', status: 'ABERTA' };
    default: return { estagio: 'PROPOSTA', status: 'ABERTA' };
  }
}

function calcularSimilaridade(a, b) {
  if (!a || !b) return 0;
  a = a.toUpperCase().trim();
  b = b.toUpperCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  let matches = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) { if (a[i] === b[i]) matches++; }
  return matches / maxLen;
}

function normalizarNumeroProposta(num) {
  if (!num) return null;
  return num.replace(/^PROP-0*/i, '').replace(/^0+/, '') || num;
}

// ==================== Main ====================

async function run() {
  const client = await pool.connect();

  try {
    console.log('============================================================');
    console.log('  RESET COMPLETO - RE-SYNC DA PLANILHA');
    console.log('============================================================\n');

    // 1. Buscar CSV da planilha
    console.log('1. Buscando CSV da planilha...');
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PROPOSTAS_GID}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro planilha: ${response.status}`);
    const text = await response.text();
    const allRows = parseCSV(text).filter(r => r['Carimbo de data/hora']);
    console.log(`   ${allRows.length} propostas na planilha\n`);

    // 2. Limpar dados antigos
    console.log('2. Limpando dados antigos...');

    // Desvincular FKs
    await client.query(`UPDATE crm_atividades SET oportunidade_id = NULL`);
    await client.query(`UPDATE crm_propostas SET oportunidade_id = NULL`);

    // Deletar todas as oportunidades (vamos recriar)
    const delOps = await client.query(`DELETE FROM crm_oportunidades`);
    console.log(`   Oportunidades removidas: ${delOps.rowCount}`);

    // Limpar propostas_comerciais (TRUNCATE é mais eficiente e reseta sequences)
    await client.query(`TRUNCATE propostas_comerciais RESTART IDENTITY CASCADE`);
    console.log(`   propostas_comerciais: TRUNCATED`);

    // Garantir coluna numero_proposta existe em crm_oportunidades
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_oportunidades' AND column_name = 'numero_proposta') THEN
          ALTER TABLE crm_oportunidades ADD COLUMN numero_proposta VARCHAR(50);
        END IF;
      END $$
    `);

    console.log('   OK\n');

    // 3. Buscar vendedores e clientes
    console.log('3. Buscando vendedores e clientes...');
    const vendedoresResult = await client.query(`SELECT id, nome, email FROM crm_vendedores WHERE ativo = true`);
    const vendedores = vendedoresResult.rows;
    console.log(`   ${vendedores.length} vendedores ativos`);

    const clientesResult = await client.query(`SELECT id, razao_social, cpf_cnpj FROM crm_clientes`);
    const clientes = clientesResult.rows;
    console.log(`   ${clientes.length} clientes\n`);

    // 4. Importar cada proposta
    console.log('4. Importando propostas...');
    let inseridas = 0;
    let erros = 0;
    let opsCreated = 0;
    let opsUpdated = 0;
    let clientesCriados = 0;

    for (const row of allRows) {
      try {
        const timestamp = row['Carimbo de data/hora'];
        const dataCriacao = parseDataBR(timestamp);
        if (!dataCriacao) { erros++; continue; }

        const numeroProposta = row['Número da proposta'] || null;
        const numNorm = normalizarNumeroProposta(numeroProposta);
        const situacao = row['Situação'] || '';
        const tipoProduto = row['Produto:'] || '';
        const vendedorNome = row['Vendedor e/ou Representante (Nome e Sobrenome):'] || '';
        const vendedorEmail = row['E-mail do Vendedor/Representante:'] || '';
        const clienteRazaoSocial = row['Razão Social do Cliente:'] || '';
        const clienteCnpj = row['CPF/CNPJ/RUC do Cliente:'] || '';
        const clienteContato = row['E-mail, telefone e/ou whatsApp do Cliente:'] || '';
        const clientePais = row['País (onde será instalado o equipamento):'] || '';
        const clienteEstado = normalizarEstado(row['Estado (onde será instalado o equipamento):'] || '');
        const clienteCidade = row['Município (onde será instalado o equipamento):'] || '';
        const clienteRegiao = row['Região:'] || '';
        const probabilidade = parseProbabilidade(row['Chance do negócio se concretizar:']);
        const prazoEntrega = row['Prazo de entrega (dias):'] || null;
        const validadeProposta = row['Validade da proposta (em dias):'] || null;
        const garantiaMeses = row['Tempo de garantia (em meses):'] || row['Tempo de garantia (em meses) do coletor:'] || null;
        const tipoFrete = row['Tipo de frete:'] || row['Tipo de frete para o cliente (COLETOR):'] || null;
        const formaPagamento = row['Detalhe a forma de pagamento (digitação livre):'] || row['Detalhe a forma de pagamento do coletor (digitação livre):'] || null;
        const observacoes = row['Descreva (digitação livre) (TOMBADOR):'] || row['Descreva (digitação livre) (COLETOR):'] || null;
        const situacaoProposta = row['Situação da proposta:'] || null;
        const situacaoFechada = row['Situação da proposta fechada:'] || null;
        const dataEntrega = row['Data da entrega:'] || null;
        const motivoPerda = row['Motivo que levou o cliente a não fechar a proposta:'] || null;
        const justificativaPerda = row['Justificativa da perda da proposta:'] || null;
        const concorrente = row['Cliente fechou com o concorrente:'] || null;
        const tamanhoTombador = row['Tamanho do tombador:'] || null;
        const tipoTombador = row['Tipo:'] || null;
        const anguloInclinacao = row['Ângulo de inclinação:'] || null;
        const voltagem = row['Voltagem dos motores (V):'] || row['Voltagem do motor (V) do coletor:'] || null;
        const frequencia = row['Frequência dos motores (Hz):'] || row['Frequência do motor (Hz) do coletor:'] || null;

        // Calcular valores
        const valorEquipamentoTombador = parseValorBR(row['Preço do equipamento (R$) (TOMBADOR):']);
        const valorTotalTombador = parseValorBR(row['TOTAL GERAL (R$):']);
        const valorEquipamentoColetor = parseValorBR(row['Preço do equipamento (R$) (COLETOR):']);
        const valorTotalColetor = parseValorBR(row['TOTAL GERAL (COLETOR) R$:']);
        const valorTotalGeral = parseValorBR(row['VALOR TOTAL DE PROPOSTAS']);

        const valorTotal = valorTotalTombador || valorTotalColetor || valorTotalGeral || valorEquipamentoTombador || valorEquipamentoColetor || null;
        const valorEquipamento = valorEquipamentoTombador || valorEquipamentoColetor || null;

        // 4a. Inserir em propostas_comerciais
        const cnpjLimpo = clienteCnpj.replace(/\D/g, '') || null;

        await client.query(`
          INSERT INTO propostas_comerciais (
            numero_proposta, situacao, data_criacao, cliente_nome, cliente_cnpj,
            cliente_email, cliente_pais, cliente_estado, cliente_cidade, cliente_regiao,
            vendedor_nome, vendedor_email, tipo_produto, tamanho,
            angulo_inclinacao, voltagem, frequencia,
            valor_equipamento, valor_total, forma_pagamento,
            tipo_frete, prazo_entrega, garantia_meses,
            observacoes, dados_completos
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
          ON CONFLICT (numero_proposta) DO UPDATE SET
            situacao = EXCLUDED.situacao,
            valor_total = COALESCE(EXCLUDED.valor_total, propostas_comerciais.valor_total),
            valor_equipamento = COALESCE(EXCLUDED.valor_equipamento, propostas_comerciais.valor_equipamento),
            dados_completos = EXCLUDED.dados_completos,
            updated_at = NOW()`,
          [
            numeroProposta,
            situacao,
            dataCriacao.toISOString(),
            clienteRazaoSocial,
            cnpjLimpo,
            clienteContato,
            clientePais,
            clienteEstado ? clienteEstado.substring(0, 2) : null,
            clienteCidade,
            clienteRegiao,
            vendedorNome,
            vendedorEmail,
            tipoProduto,
            parseInt(tamanhoTombador) || null,
            anguloInclinacao,
            parseInt(voltagem) || null,
            parseInt(frequencia) || null,
            valorEquipamento,
            valorTotal,
            formaPagamento,
            tipoFrete,
            prazoEntrega,
            parseInt(garantiaMeses) || null,
            observacoes,
            JSON.stringify(row),
          ]
        );
        inseridas++;

        // 4b. Garantir cliente existe
        if (clienteRazaoSocial && clienteRazaoSocial !== 'Teste' && clienteRazaoSocial !== 'Cliente') {
          const cnpjBusca = cnpjLimpo && cnpjLimpo.length >= 11 ? cnpjLimpo : null;
          let clienteExiste = false;

          if (cnpjBusca) {
            clienteExiste = clientes.some(c => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cnpjBusca);
          }
          if (!clienteExiste) {
            clienteExiste = clientes.some(c => calcularSimilaridade(clienteRazaoSocial, c.razao_social) > 0.85);
          }

          if (!clienteExiste) {
            try {
              const newCli = await client.query(
                `INSERT INTO crm_clientes (razao_social, cpf_cnpj, municipio, estado, email, origem)
                 VALUES ($1, $2, $3, $4, $5, 'PLANILHA') ON CONFLICT DO NOTHING RETURNING id`,
                [clienteRazaoSocial, cnpjBusca, clienteCidade || null, clienteEstado || null, clienteContato || null]
              );
              if (newCli?.rows[0]) {
                clientes.push({ id: newCli.rows[0].id, razao_social: clienteRazaoSocial, cpf_cnpj: cnpjBusca });
                clientesCriados++;
              }
            } catch (e) { /* ignore duplicate */ }
          }
        }

        // 4c. Criar oportunidade
        const { estagio, status } = mapSituacaoToEstagio(situacao);

        // Encontrar vendedor_id
        let vendedorId = null;
        if (vendedorNome) {
          const v = vendedores.find(v => calcularSimilaridade(vendedorNome, v.nome) > 0.6);
          if (v) vendedorId = v.id;
        }

        // Encontrar cliente_id
        let clienteId = null;
        if (cnpjLimpo && cnpjLimpo.length >= 11) {
          const c = clientes.find(c => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cnpjLimpo);
          if (c) clienteId = c.id;
        }
        if (!clienteId && clienteRazaoSocial) {
          const c = clientes.find(c => calcularSimilaridade(clienteRazaoSocial, c.razao_social) > 0.7);
          if (c) clienteId = c.id;
        }

        const titulo = `${tipoProduto} - ${clienteRazaoSocial}`;

        // Buscar oportunidade existente por numero_proposta
        let existenteId = null;
        if (numNorm) {
          const byNum = await client.query(
            `SELECT id FROM crm_oportunidades WHERE numero_proposta = $1`,
            [numNorm]
          );
          if (byNum?.rows[0]) existenteId = byNum.rows[0].id;
        }

        if (existenteId) {
          await client.query(
            `UPDATE crm_oportunidades SET
              titulo = $2, estagio = $3, status = $4, valor_estimado = COALESCE($5, valor_estimado),
              probabilidade = COALESCE($6, probabilidade), cliente_id = COALESCE($7, cliente_id),
              vendedor_id = COALESCE($8, vendedor_id), produto = $9, fonte = 'PLANILHA',
              motivo_perda = COALESCE($10, motivo_perda), concorrente = COALESCE($11, concorrente),
              justificativa_perda = COALESCE($12, justificativa_perda),
              updated_at = NOW()
            WHERE id = $1`,
            [existenteId, titulo, estagio, status, valorTotal, probabilidade, clienteId, vendedorId, tipoProduto, motivoPerda, concorrente, justificativaPerda]
          );
          opsUpdated++;
        } else {
          const dataAbertura = dataCriacao.toISOString().substring(0, 10);
          await client.query(
            `INSERT INTO crm_oportunidades (
              titulo, cliente_id, vendedor_id, produto, valor_estimado,
              estagio, status, probabilidade, fonte, numero_proposta,
              motivo_perda, concorrente, justificativa_perda,
              data_abertura
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PLANILHA', $9, $10, $11, $12, $13::date)
            ON CONFLICT DO NOTHING`,
            [titulo, clienteId, vendedorId, tipoProduto, valorTotal, estagio, status, probabilidade, numNorm, motivoPerda, concorrente, justificativaPerda, dataAbertura]
          );
          opsCreated++;
        }

      } catch (err) {
        erros++;
        if (erros <= 5) console.error(`   Erro: ${err.message}`);
      }
    }

    console.log(`   Propostas inseridas: ${inseridas}`);
    console.log(`   Oportunidades criadas: ${opsCreated}`);
    console.log(`   Oportunidades atualizadas: ${opsUpdated}`);
    console.log(`   Clientes criados: ${clientesCriados}`);
    console.log(`   Erros: ${erros}\n`);

    // 5. Vincular crm_propostas.oportunidade_id
    console.log('5. Vinculando crm_propostas a oportunidades...');
    const linked = await client.query(`
      UPDATE crm_propostas p
      SET oportunidade_id = o.id
      FROM crm_oportunidades o
      WHERE o.numero_proposta = CAST(p.numero_proposta AS VARCHAR)
        AND p.oportunidade_id IS NULL
    `);
    console.log(`   ${linked.rowCount} propostas vinculadas\n`);

    // 6. Vincular clientes a vendedores
    console.log('6. Atualizando vendedor_id dos clientes...');
    const cliUpdated = await client.query(`
      UPDATE crm_clientes c
      SET vendedor_id = o.vendedor_id
      FROM crm_oportunidades o
      WHERE o.cliente_id = c.id
        AND o.vendedor_id IS NOT NULL
        AND c.vendedor_id IS NULL
    `);
    console.log(`   ${cliUpdated.rowCount} clientes atualizados\n`);

    // 7. Resumo final
    console.log('============================================================');
    console.log('  RESUMO FINAL');
    console.log('============================================================\n');

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM propostas_comerciais) as propostas_com,
        (SELECT COUNT(*) FROM crm_oportunidades) as oportunidades,
        (SELECT COUNT(*) FROM crm_clientes) as clientes,
        (SELECT COUNT(*) FROM crm_vendedores WHERE ativo = true) as vendedores
    `);
    const c = counts.rows[0];
    console.log(`  propostas_comerciais: ${c.propostas_com}`);
    console.log(`  crm_oportunidades: ${c.oportunidades}`);
    console.log(`  crm_clientes: ${c.clientes}`);
    console.log(`  vendedores ativos: ${c.vendedores}`);

    // Por vendedor
    console.log('\n  Por vendedor:');
    const porVendedor = await client.query(`
      SELECT v.nome, COUNT(o.id) as ops, SUM(o.valor_estimado) as valor
      FROM crm_vendedores v
      LEFT JOIN crm_oportunidades o ON o.vendedor_id = v.id
      WHERE v.ativo = true
      GROUP BY v.id, v.nome
      ORDER BY ops DESC
    `);
    porVendedor.rows.forEach(v => {
      console.log(`    ${v.nome.padEnd(40)} ${v.ops.toString().padStart(4)} ops | R$ ${(v.valor || 0).toLocaleString('pt-BR')}`);
    });

    // Verificar Tiago
    console.log('\n  Tiago - detalhes:');
    const tiagoOps = await client.query(`
      SELECT o.titulo, o.estagio, o.status, o.valor_estimado, o.probabilidade, o.numero_proposta,
             o.data_abertura
      FROM crm_oportunidades o
      JOIN crm_vendedores v ON o.vendedor_id = v.id
      WHERE v.nome ILIKE '%TIAGO%'
      ORDER BY o.numero_proposta
    `);
    tiagoOps.rows.forEach((o, i) => {
      console.log(`    ${(i+1).toString().padStart(2)}. #${(o.numero_proposta || '-').padStart(4)} | ${o.estagio.padEnd(15)} | ${o.status.padEnd(8)} | ${(o.probabilidade || 0).toString().padStart(3)}% | R$ ${(o.valor_estimado || 0).toLocaleString('pt-BR').padStart(12)} | ${o.data_abertura?.toISOString()?.substring(0, 10) || '-'} | ${o.titulo}`);
    });

    console.log('\nReset concluido!');

  } catch (error) {
    console.error('ERRO:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

run();
