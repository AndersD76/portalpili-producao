/**
 * Consolida duplicatas restantes de vendedores que NÃO têm usuario linkado
 * (representantes externos, etc.)
 * Agrupa por nome, mantém o com mais oportunidades, desativa os demais.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function consolidar() {
  const client = await pool.connect();

  try {
    console.log('=== CONSOLIDAÇÃO DE DUPLICATAS RESTANTES ===\n');

    // Buscar vendedores ativos sem usuario_id, agrupados por nome
    const duplicados = await client.query(`
      SELECT LOWER(TRIM(v.nome)) as nome_grupo,
             MIN(v.nome) as nome,
             array_agg(v.id ORDER BY COALESCE(opp_count, 0) DESC, v.id) as ids,
             COUNT(*) as total_registros
      FROM crm_vendedores v
      LEFT JOIN (
        SELECT vendedor_id, COUNT(*) as opp_count
        FROM crm_oportunidades
        GROUP BY vendedor_id
      ) o ON v.id = o.vendedor_id
      WHERE v.ativo = true AND v.usuario_id IS NULL
      GROUP BY LOWER(TRIM(v.nome))
      HAVING COUNT(*) > 1
      ORDER BY MIN(v.nome)
    `);

    console.log(`Encontrados ${duplicados.rows.length} nomes com duplicatas:\n`);

    await client.query('BEGIN');

    let totalMigrados = 0;
    let totalDesativados = 0;

    for (const grupo of duplicados.rows) {
      const ids = grupo.ids;
      const canonico = ids[0];
      const dups = ids.slice(1);

      // Buscar detalhes
      const detalhes = await client.query(`
        SELECT v.id, v.nome, v.email, COUNT(o.id) as opp_count
        FROM crm_vendedores v
        LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
        WHERE v.id = ANY($1)
        GROUP BY v.id
        ORDER BY opp_count DESC
      `, [ids]);

      console.log(`\n📋 ${grupo.nome} (${grupo.total_registros} registros):`);
      detalhes.rows.forEach(d => {
        const tag = d.id === canonico ? '✅ CANÔNICO' : '🔄 duplicado';
        console.log(`   ${tag}: [${d.id}] ${d.email} - ${d.opp_count} oport.`);
      });

      for (const dupId of dups) {
        // Migrar tudo
        let r;
        r = await client.query(`UPDATE crm_oportunidades SET vendedor_id = $1 WHERE vendedor_id = $2`, [canonico, dupId]);
        totalMigrados += (r?.rowCount || 0);
        await client.query(`UPDATE crm_clientes SET vendedor_id = $1 WHERE vendedor_id = $2`, [canonico, dupId]);
        await client.query(`UPDATE crm_interacoes SET vendedor_id = $1 WHERE vendedor_id = $2`, [canonico, dupId]);
        await client.query(`UPDATE crm_atividades SET vendedor_id = $1 WHERE vendedor_id = $2`, [canonico, dupId]);
        await client.query(`UPDATE crm_propostas SET vendedor_id = $1 WHERE vendedor_id = $2`, [canonico, dupId]);
        await client.query(`DELETE FROM crm_metas WHERE vendedor_id = $1`, [dupId]);

        // Desativar
        await client.query(`UPDATE crm_vendedores SET ativo = false WHERE id = $1`, [dupId]);
        totalDesativados++;
      }
    }

    // Desativar também vendedores sem oportunidades e sem usuario (lixo)
    const lixo = await client.query(`
      UPDATE crm_vendedores v SET ativo = false
      WHERE v.ativo = true
        AND v.usuario_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM crm_oportunidades o WHERE o.vendedor_id = v.id)
        AND v.nome NOT IN ('Daniel Anders')
      RETURNING id, nome, email
    `);

    console.log(`\n\n📦 Desativados ${lixo.rowCount} vendedores sem oportunidades e sem link:`);
    lixo.rows.forEach(v => console.log(`   [${v.id}] ${v.nome} (${v.email})`));

    await client.query('COMMIT');

    console.log(`\n\n=== RESUMO ===`);
    console.log(`🔄 ${totalMigrados} oportunidades migradas`);
    console.log(`❌ ${totalDesativados} duplicados desativados`);
    console.log(`📦 ${lixo.rowCount} vendedores sem dados desativados`);

    // Estado final
    const final = await client.query(`
      SELECT v.id, v.nome, v.email, v.usuario_id, u.nome as usuario_nome,
             COUNT(DISTINCT o.id) as total_oportunidades
      FROM crm_vendedores v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      WHERE v.ativo = true
      GROUP BY v.id, u.nome
      ORDER BY v.nome
    `);

    console.log(`\n\n=== VENDEDORES ATIVOS FINAIS (${final.rows.length}) ===\n`);
    final.rows.forEach(v => {
      const link = v.usuario_id ? `✅ usuario[${v.usuario_id}]` : '⚠ externo';
      console.log(`  [${v.id}] ${v.nome} (${v.email}) - ${v.total_oportunidades} oport. ${link}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

consolidar().catch(console.error);
