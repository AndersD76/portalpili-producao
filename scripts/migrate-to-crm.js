/**
 * Migrar dados de propostas_comerciais para tabelas CRM
 */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  MIGRAÇÃO DE DADOS PARA TABELAS CRM');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Migrar vendedores únicos
    console.log('1. Migrando vendedores...');
    await client.query(`
      INSERT INTO crm_vendedores (nome, email, ativo)
      SELECT DISTINCT
        vendedor_nome,
        vendedor_email,
        true
      FROM propostas_comerciais
      WHERE vendedor_nome IS NOT NULL AND vendedor_nome != ''
      ON CONFLICT DO NOTHING
    `);
    const vendedores = await client.query('SELECT COUNT(*) FROM crm_vendedores');
    console.log('   ✓ ' + vendedores.rows[0].count + ' vendedores');

    // 2. Migrar clientes únicos (truncando nomes longos)
    console.log('2. Migrando clientes...');
    await client.query(`
      INSERT INTO crm_clientes (razao_social, cpf_cnpj, email, pais, estado, cidade, status)
      SELECT DISTINCT ON (LEFT(cliente_nome, 95))
        LEFT(cliente_nome, 95),
        LEFT(cliente_cnpj, 20),
        LEFT(cliente_email, 255),
        COALESCE(LEFT(cliente_pais, 100), 'Brasil'),
        LEFT(cliente_estado, 50),
        LEFT(cliente_cidade, 100),
        'ATIVO'
      FROM propostas_comerciais
      WHERE cliente_nome IS NOT NULL AND cliente_nome != '' AND LENGTH(cliente_nome) < 100
      ON CONFLICT DO NOTHING
    `);
    const clientes = await client.query('SELECT COUNT(*) FROM crm_clientes');
    console.log('   ✓ ' + clientes.rows[0].count + ' clientes');

    // 3. Atualizar vendedor_id nos clientes
    console.log('3. Vinculando clientes a vendedores...');
    await client.query(`
      UPDATE crm_clientes c
      SET vendedor_id = v.id
      FROM crm_vendedores v, propostas_comerciais p
      WHERE c.razao_social = LEFT(p.cliente_nome, 95)
        AND v.nome = p.vendedor_nome
        AND c.vendedor_id IS NULL
    `);

    // 4. Migrar propostas
    console.log('4. Migrando propostas...');
    await client.query(`
      INSERT INTO crm_propostas (
        numero_proposta,
        vendedor_id,
        cliente_id,
        situacao,
        data_proposta,
        produto,
        tombador_tamanho,
        tombador_modelo,
        tombador_tipo,
        tombador_quantidade,
        tombador_total_geral,
        coletor_grau_rotacao,
        coletor_modelo,
        coletor_quantidade,
        coletor_total_geral,
        valor_total,
        created_at
      )
      SELECT DISTINCT ON (CAST(REPLACE(p.numero_proposta, 'PROP-', '') AS INTEGER))
        CAST(REPLACE(p.numero_proposta, 'PROP-', '') AS INTEGER),
        v.id,
        c.id,
        CASE
          WHEN p.situacao = 'PERDIDA' THEN 'REJEITADA'
          ELSE COALESCE(p.situacao, 'RASCUNHO')
        END,
        COALESCE(p.data_criacao, NOW()),
        COALESCE(p.tipo_produto, 'TOMBADOR'),
        COALESCE(p.tamanho, 0),
        LEFT(p.modelo, 100),
        LEFT(p.tipo_tombador, 50),
        COALESCE(p.quantidade, 1),
        COALESCE(p.valor_total, 0),
        CASE WHEN p.grau_rotacao ~ '^[0-9]+$' THEN CAST(p.grau_rotacao AS INTEGER) ELSE 180 END,
        LEFT(p.modelo, 100),
        COALESCE(p.quantidade, 1),
        COALESCE(p.valor_total, 0),
        COALESCE(p.valor_total, 0),
        COALESCE(p.created_at, NOW())
      FROM propostas_comerciais p
      LEFT JOIN crm_vendedores v ON v.nome = p.vendedor_nome
      LEFT JOIN crm_clientes c ON c.razao_social = LEFT(p.cliente_nome, 95)
      WHERE p.numero_proposta IS NOT NULL
        AND p.numero_proposta ~ '^PROP-[0-9]+$'
        AND (p.cliente_nome IS NULL OR LENGTH(p.cliente_nome) < 100)
      ON CONFLICT (numero_proposta) DO UPDATE SET
        situacao = EXCLUDED.situacao,
        valor_total = EXCLUDED.valor_total,
        updated_at = NOW()
    `);
    const propostas = await client.query('SELECT COUNT(*) FROM crm_propostas');
    console.log('   ✓ ' + propostas.rows[0].count + ' propostas');

    // 5. Criar algumas atividades de exemplo para vendedores
    console.log('5. Criando atividades de exemplo...');
    await client.query(`
      INSERT INTO crm_atividades (
        tipo, titulo, descricao, data_agendada, vendedor_id, status, cliente_id, oportunidade_id
      )
      SELECT
        CASE (random() * 4)::INT
          WHEN 0 THEN 'LIGACAO'
          WHEN 1 THEN 'EMAIL'
          WHEN 2 THEN 'REUNIAO'
          WHEN 3 THEN 'VISITA'
          ELSE 'FOLLOW_UP'
        END,
        'Follow-up com ' || LEFT(c.razao_social, 50),
        'Entrar em contato sobre proposta pendente',
        NOW() + (random() * 30 || ' days')::INTERVAL,
        v.id,
        'PENDENTE',
        c.id,
        NULL
      FROM crm_propostas p
      JOIN crm_clientes c ON c.id = p.cliente_id
      JOIN crm_vendedores v ON v.id = p.vendedor_id
      WHERE p.situacao IN ('RASCUNHO', 'ENVIADA', 'EM_NEGOCIACAO')
      LIMIT 50
    `);
    const atividades = await client.query('SELECT COUNT(*) FROM crm_atividades');
    console.log('   ✓ ' + atividades.rows[0].count + ' atividades');

    // 6. Criar oportunidades baseadas nas propostas
    console.log('6. Criando oportunidades no pipeline...');
    await client.query(`
      INSERT INTO crm_oportunidades (
        titulo, descricao, valor_estimado, estagio, probabilidade, vendedor_id, cliente_id
      )
      SELECT
        'Venda ' || p.produto || ' - ' || c.razao_social,
        'Oportunidade criada a partir da proposta ' || p.numero_proposta,
        p.valor_total,
        CASE p.situacao
          WHEN 'RASCUNHO' THEN 'PROSPECCAO'
          WHEN 'ENVIADA' THEN 'PROPOSTA'
          WHEN 'EM_NEGOCIACAO' THEN 'NEGOCIACAO'
          WHEN 'APROVADA' THEN 'FECHAMENTO'
          ELSE 'QUALIFICACAO'
        END,
        CASE p.situacao
          WHEN 'RASCUNHO' THEN 10
          WHEN 'ENVIADA' THEN 30
          WHEN 'EM_NEGOCIACAO' THEN 60
          WHEN 'APROVADA' THEN 100
          ELSE 20
        END,
        p.vendedor_id,
        p.cliente_id
      FROM crm_propostas p
      JOIN crm_clientes c ON c.id = p.cliente_id
      WHERE p.vendedor_id IS NOT NULL AND p.cliente_id IS NOT NULL
        AND p.situacao NOT IN ('REJEITADA', 'CANCELADA')
      LIMIT 100
      ON CONFLICT DO NOTHING
    `);
    const oportunidades = await client.query('SELECT COUNT(*) FROM crm_oportunidades');
    console.log('   ✓ ' + oportunidades.rows[0].count + ' oportunidades');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  MIGRAÇÃO CONCLUÍDA!');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Resumo final
    console.log('RESUMO:');
    console.log('  Vendedores:', vendedores.rows[0].count);
    console.log('  Clientes:', clientes.rows[0].count);
    console.log('  Propostas:', propostas.rows[0].count);
    console.log('  Atividades:', atividades.rows[0].count);
    console.log('  Oportunidades:', oportunidades.rows[0].count);

  } catch (error) {
    console.error('ERRO:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
