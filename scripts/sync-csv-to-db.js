/**
 * Script para sincronizar dados do CSV do Forms com o banco de dados
 * Atualiza a situação das propostas e oportunidades baseado no CSV
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Mapeamento de situação do CSV para situação da proposta e estágio da oportunidade
const MAPEAMENTO = {
  'EM NEGOCIAÇÃO': { proposta: 'EM_NEGOCIACAO', estagio: 'EM_NEGOCIACAO', status: 'ABERTA' },
  'EM NEGOCIACÃO': { proposta: 'EM_NEGOCIACAO', estagio: 'EM_NEGOCIACAO', status: 'ABERTA' },
  'EM ANÁLISE': { proposta: 'EM_ANALISE', estagio: 'EM_ANALISE', status: 'ABERTA' },
  'FECHADA': { proposta: 'FECHADA', estagio: 'FECHADA', status: 'GANHA' },
  'PERDIDA': { proposta: 'PERDIDA', estagio: 'PERDIDA', status: 'PERDIDA' },
  'SUSPENSO': { proposta: 'SUSPENSO', estagio: 'SUSPENSO', status: 'ABERTA' },
  'SUBSTITUÍDO': { proposta: 'SUBSTITUIDA', estagio: 'SUBSTITUIDO', status: 'ABERTA' },
  'SUBSTITUIDO': { proposta: 'SUBSTITUIDA', estagio: 'SUBSTITUIDO', status: 'ABERTA' },
  'TESTE': { proposta: 'TESTE', estagio: 'TESTE', status: 'ABERTA' },
  // Fallbacks
  'RASCUNHO': { proposta: 'RASCUNHO', estagio: 'PROPOSTA', status: 'ABERTA' },
  'ENVIADA': { proposta: 'ENVIADA', estagio: 'EM_ANALISE', status: 'ABERTA' },
  'APROVADA': { proposta: 'APROVADA', estagio: 'FECHADA', status: 'ABERTA' },
  'CANCELADA': { proposta: 'CANCELADA', estagio: 'SUSPENSO', status: 'CANCELADA' },
  'REJEITADA': { proposta: 'REJEITADA', estagio: 'PERDIDA', status: 'PERDIDA' },
};

// Parser simples de CSV
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
  return rows;
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

async function syncCSVToDB() {
  const client = await pool.connect();

  try {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║         SINCRONIZANDO CSV DO FORMS COM BANCO DE DADOS            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Ler CSV
    const csvPath = path.join(__dirname, '..', 'docs', 'PROPOSTA COMERCIAL (respostas) - Respostas ao formulário 5 (2).csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`📄 CSV carregado: ${rows.length} registros\n`);

    // Agrupar por número da proposta (pegar última situação de cada)
    const propostasPorNumero = {};
    rows.forEach(row => {
      const numero = row['Número da proposta'];
      if (numero) {
        propostasPorNumero[numero] = row; // Última ocorrência prevalece
      }
    });

    console.log(`📊 Propostas únicas: ${Object.keys(propostasPorNumero).length}\n`);

    // Contar situações do CSV
    const situacoesCsv = {};
    Object.values(propostasPorNumero).forEach(row => {
      const sit = row['Situação'] || 'SEM_SITUACAO';
      situacoesCsv[sit] = (situacoesCsv[sit] || 0) + 1;
    });

    console.log('📋 Situações no CSV:');
    Object.entries(situacoesCsv).sort((a, b) => b[1] - a[1]).forEach(([sit, count]) => {
      console.log(`   ${sit}: ${count}`);
    });

    await client.query('BEGIN');

    // Atualizar cada proposta
    let atualizadas = 0;
    let naoEncontradas = 0;
    let erros = 0;

    console.log('\n🔄 Atualizando propostas...\n');

    for (const [numero, row] of Object.entries(propostasPorNumero)) {
      const situacaoCsv = (row['Situação'] || '').trim().toUpperCase();
      const mapeamento = MAPEAMENTO[situacaoCsv] || MAPEAMENTO['RASCUNHO'];

      try {
        // Buscar proposta pelo número
        const proposta = await client.query(
          'SELECT id, oportunidade_id, situacao FROM crm_propostas WHERE numero_proposta = $1',
          [parseInt(numero)]
        );

        if (proposta.rows.length === 0) {
          naoEncontradas++;
          continue;
        }

        const propostaId = proposta.rows[0].id;
        const oportunidadeId = proposta.rows[0].oportunidade_id;
        const situacaoAtual = proposta.rows[0].situacao;

        // Só atualiza se a situação for diferente
        if (situacaoAtual !== mapeamento.proposta) {
          // Atualizar proposta
          await client.query(
            'UPDATE crm_propostas SET situacao = $1, updated_at = NOW() WHERE id = $2',
            [mapeamento.proposta, propostaId]
          );

          // Atualizar oportunidade se existir
          if (oportunidadeId) {
            await client.query(
              'UPDATE crm_oportunidades SET estagio = $1, status = $2, updated_at = NOW() WHERE id = $3',
              [mapeamento.estagio, mapeamento.status, oportunidadeId]
            );
          }

          atualizadas++;
        }
      } catch (e) {
        console.error(`   Erro na proposta #${numero}: ${e.message}`);
        erros++;
      }
    }

    await client.query('COMMIT');

    console.log('═'.repeat(68));
    console.log(`✅ Propostas atualizadas: ${atualizadas}`);
    console.log(`⚠️ Não encontradas: ${naoEncontradas}`);
    console.log(`❌ Erros: ${erros}`);

    // Verificar resultado
    console.log('\n📊 SITUAÇÃO ATUAL NO BANCO:');
    console.log('─'.repeat(68));

    const situacoesBd = await client.query(`
      SELECT situacao, COUNT(*) as total
      FROM crm_propostas
      GROUP BY situacao
      ORDER BY total DESC
    `);

    situacoesBd.rows.forEach(r => {
      console.log(`   ${r.situacao}: ${r.total}`);
    });

    // Pipeline atualizado
    console.log('\n📈 PIPELINE ATUALIZADO:');
    console.log('─'.repeat(68));

    const pipeline = await client.query(`
      SELECT estagio, status, COUNT(*) as total, SUM(valor_estimado) as valor
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
          WHEN 'PERDIDA' THEN 7
          WHEN 'SUSPENSO' THEN 8
          WHEN 'SUBSTITUIDO' THEN 9
          WHEN 'TESTE' THEN 10
        END
    `);

    pipeline.rows.forEach(r => {
      const valor = Number(r.valor) || 0;
      console.log(`   ${r.estagio.padEnd(15)} (${r.status.padEnd(10)}): ${String(r.total).padStart(4)} - R$ ${valor.toLocaleString('pt-BR')}`);
    });

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    SINCRONIZAÇÃO CONCLUÍDA                       ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERRO GERAL:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

syncCSVToDB();
