const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function test() {
  const client = await pool.connect();
  try {
    // Test permissions for VINICIUS MOTA (id=288)
    console.log('=== PERMISSOES VINICIUS MOTA (id=288) ===');
    const perms = await client.query(`
      SELECT m.codigo, m.nome,
             pm.pode_visualizar, pm.pode_criar, pm.pode_editar, pm.pode_excluir, pm.pode_aprovar
      FROM permissoes_modulos pm
      JOIN modulos m ON pm.modulo_id = m.id
      WHERE pm.usuario_id = 288
      ORDER BY m.ordem
    `);
    perms.rows.forEach(p => {
      console.log(`  ${p.codigo}: ver=${p.pode_visualizar} criar=${p.pode_criar} editar=${p.pode_editar} excluir=${p.pode_excluir}`);
    });

    // Test vendedor link for VINICIUS MOTA
    console.log('\n=== VENDEDOR CRM LINK ===');
    const vend = await client.query(`
      SELECT v.id, v.nome, v.email, v.usuario_id, COUNT(o.id) as oportunidades
      FROM crm_vendedores v
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      WHERE v.usuario_id = 288
      GROUP BY v.id
    `);
    vend.rows.forEach(v => {
      console.log(`  vendedor[${v.id}] ${v.nome} (${v.email}) -> usuario[${v.usuario_id}] - ${v.oportunidades} oportunidades`);
    });

    // Test another user - CLARICE PICOLI (id=227)
    console.log('\n=== PERMISSOES CLARICE PICOLI (id=227) ===');
    const perms2 = await client.query(`
      SELECT m.codigo, pm.pode_visualizar, pm.pode_criar, pm.pode_editar, pm.pode_excluir
      FROM permissoes_modulos pm
      JOIN modulos m ON pm.modulo_id = m.id
      WHERE pm.usuario_id = 227
      ORDER BY m.ordem
    `);
    if (perms2.rows.length === 0) {
      const profile = await client.query(`
        SELECT pa.nome, pa.permissoes_padrao
        FROM usuarios u
        JOIN perfis_acesso pa ON u.perfil_id = pa.id
        WHERE u.id = 227
      `);
      console.log('  Sem permissoes customizadas. Perfil:', profile.rows[0]?.nome);
      console.log('  Permissoes padrao:', JSON.stringify(profile.rows[0]?.permissoes_padrao));
    } else {
      perms2.rows.forEach(p => {
        console.log(`  ${p.codigo}: ver=${p.pode_visualizar} criar=${p.pode_criar} editar=${p.pode_editar} excluir=${p.pode_excluir}`);
      });
    }

    // Check all 9 vendedores have correct links
    console.log('\n=== TODOS VENDEDORES-USUARIOS LINKADOS ===');
    const links = await client.query(`
      SELECT u.id as uid, u.nome as unome, v.id as vid, v.nome as vnome,
             COUNT(DISTINCT o.id) as opp
      FROM usuarios u
      JOIN crm_vendedores v ON v.usuario_id = u.id
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      WHERE u.perfil_id = 3
      GROUP BY u.id, u.nome, v.id, v.nome
      ORDER BY u.nome
    `);
    links.rows.forEach(l => {
      console.log(`  usuario[${l.uid}] ${l.unome} -> vendedor[${l.vid}] ${l.vnome} (${l.opp} opp)`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}
test().catch(console.error);
