// Script para criar oportunidades para propostas que não têm vinculação
// Executa via: node scripts/sync-propostas-oportunidades.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncPropostasOportunidades() {
  const client = await pool.connect();

  try {
    console.log('🔍 Buscando propostas sem oportunidade vinculada...\n');

    // Buscar propostas sem oportunidade_id
    const propostasSemOp = await client.query(`
      SELECT
        p.id,
        p.numero_proposta,
        p.cliente_id,
        p.vendedor_id,
        p.produto,
        p.situacao,
        p.chance_concretizacao,
        p.prazo_entrega_dias,
        p.valor_total,
        p.tombador_tamanho,
        p.coletor_grau_rotacao,
        c.razao_social as cliente_nome,
        v.nome as vendedor_nome
      FROM crm_propostas p
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      WHERE p.oportunidade_id IS NULL
      ORDER BY p.id
    `);

    console.log(`📋 Encontradas ${propostasSemOp.rows.length} propostas sem oportunidade\n`);

    if (propostasSemOp.rows.length === 0) {
      console.log('✅ Todas as propostas já têm oportunidades vinculadas!');
      return;
    }

    // Mapear situação da proposta para estágio do pipeline
    const situacaoParaEstagio = {
      'TESTE': 'PROPOSTA',
      'RASCUNHO': 'PROPOSTA',
      'ENVIADA': 'PROPOSTA',
      'EM_NEGOCIACAO': 'NEGOCIACAO',
      'NEGOCIACAO': 'NEGOCIACAO',
      'FECHAMENTO': 'FECHAMENTO',
      'APROVADA': 'FECHAMENTO',
      'FECHADA': 'FECHAMENTO',
      'GANHA': 'FECHAMENTO',
      'PERDIDA': 'PROPOSTA',
      'CANCELADA': 'PROPOSTA'
    };

    const situacaoParaStatus = {
      'TESTE': 'ABERTA',
      'RASCUNHO': 'ABERTA',
      'ENVIADA': 'ABERTA',
      'EM_NEGOCIACAO': 'ABERTA',
      'NEGOCIACAO': 'ABERTA',
      'FECHAMENTO': 'ABERTA',
      'APROVADA': 'ABERTA',
      'FECHADA': 'GANHA',
      'GANHA': 'GANHA',
      'PERDIDA': 'PERDIDA',
      'CANCELADA': 'CANCELADA'
    };

    let criadas = 0;
    let erros = 0;

    for (const proposta of propostasSemOp.rows) {
      try {
        const estagio = situacaoParaEstagio[proposta.situacao] || 'PROPOSTA';
        const status = situacaoParaStatus[proposta.situacao] || 'ABERTA';
        const probabilidade = proposta.chance_concretizacao || 7;

        // Gerar título da oportunidade
        const tamanho = proposta.produto === 'TOMBADOR'
          ? (proposta.tombador_tamanho ? `${proposta.tombador_tamanho}m` : '')
          : (proposta.coletor_grau_rotacao ? `${proposta.coletor_grau_rotacao}°` : '');
        const titulo = `${proposta.produto || 'TOMBADOR'} ${tamanho} - ${proposta.cliente_nome || 'Cliente'}`.trim();

        // Criar oportunidade
        const opResult = await client.query(`
          INSERT INTO crm_oportunidades (
            cliente_id, vendedor_id, titulo, descricao, produto,
            valor_estimado, probabilidade,
            data_previsao_fechamento,
            estagio, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '${proposta.prazo_entrega_dias || 120} days', $8, $9)
          RETURNING id
        `, [
          proposta.cliente_id,
          proposta.vendedor_id,
          titulo,
          `Proposta comercial #${proposta.numero_proposta || proposta.id}`,
          proposta.produto || 'TOMBADOR',
          proposta.valor_total || 0,
          probabilidade * 10, // Converter escala 1-10 para 10-100
          estagio,
          status
        ]);

        const oportunidadeId = opResult.rows[0].id;

        // Vincular proposta à oportunidade
        await client.query(`
          UPDATE crm_propostas
          SET oportunidade_id = $1
          WHERE id = $2
        `, [oportunidadeId, proposta.id]);

        console.log(`✅ Proposta #${proposta.numero_proposta || proposta.id} → Oportunidade #${oportunidadeId} (${titulo.substring(0, 40)}...)`);
        criadas++;

      } catch (err) {
        console.error(`❌ Erro na proposta #${proposta.id}: ${err.message}`);
        erros++;
      }
    }

    console.log('\n========================================');
    console.log(`📊 RESUMO:`);
    console.log(`   ✅ Oportunidades criadas: ${criadas}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log('========================================\n');

    // Mostrar totais do pipeline
    const pipelineResult = await client.query(`
      SELECT
        estagio,
        COUNT(*) as quantidade,
        SUM(valor_estimado) as valor_total
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'NEGOCIACAO' THEN 4
          WHEN 'FECHAMENTO' THEN 5
        END
    `);

    console.log('📈 Pipeline atualizado:');
    for (const row of pipelineResult.rows) {
      const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor_total || 0);
      console.log(`   ${row.estagio}: ${row.quantidade} oportunidades (${valor})`);
    }

  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncPropostasOportunidades();
