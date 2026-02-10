/**
 * Script para consolidar vendedores duplicados no CRM
 *
 * Problemas resolvidos:
 * 1. Vendedores duplicados no crm_vendedores (importados de planilha)
 * 2. crm_vendedores desconectado de usuarios (quase nenhum usuario_id)
 * 3. Cada pessoa deve ter UM único registro em crm_vendedores linkado ao usuario
 *
 * Lógica:
 * - Para cada usuario com perfil vendedor, encontra registros em crm_vendedores por nome similar
 * - Elege o registro com mais oportunidades como canônico
 * - Move todas as referências (oportunidades, clientes, etc.) para o canônico
 * - Linka o canônico ao usuario via usuario_id
 * - Desativa os duplicados
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function consolidar() {
  const client = await pool.connect();

  try {
    console.log('=== CONSOLIDAÇÃO DE VENDEDORES ===\n');

    // 1. Buscar usuarios que são vendedores (perfil_id=3)
    const usuarios = await client.query(`
      SELECT id, nome, email, cargo
      FROM usuarios
      WHERE perfil_id = 3 AND ativo = true
      ORDER BY nome
    `);
    console.log(`Encontrados ${usuarios.rows.length} usuários vendedores:\n`);
    usuarios.rows.forEach(u => console.log(`  - [${u.id}] ${u.nome} (${u.email})`));

    // 2. Buscar todos os crm_vendedores com contagem de oportunidades
    const vendedores = await client.query(`
      SELECT v.id, v.nome, v.email, v.usuario_id, v.ativo,
             COUNT(o.id) as total_oportunidades
      FROM crm_vendedores v
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      GROUP BY v.id
      ORDER BY v.nome, total_oportunidades DESC
    `);
    console.log(`\nEncontrados ${vendedores.rows.length} registros em crm_vendedores\n`);

    // 3. Mapeamento manual de nomes (usuario -> vendedor patterns)
    // Baseado nos nomes encontrados no banco
    const mapeamento = [
      { usuario_nome: 'CELSO PAROT DE OLIVEIRA', patterns: ['Celso Parot', 'celso'] },
      { usuario_nome: 'CLARICE PICOLI', patterns: ['Clarice Picoli', 'clarice'] },
      { usuario_nome: 'EDERSON RODRIGUES DA SILVA', patterns: ['Ederson', 'ederson'] },
      { usuario_nome: 'JAIR D AGUSTIN', patterns: ['Jair', 'jair'] },
      { usuario_nome: 'LUIS ALBERTO ROOS', patterns: ['Luis Alberto', 'Luis Roos', 'luis'] },
      { usuario_nome: 'ROBSON ALEX BORTOLOSO', patterns: ['Robson Bortoloso', 'Robson', 'robson'] },
      { usuario_nome: 'TIAGO GEVINSKI', patterns: ['Tiago Gevinski', 'tiago'] },
      { usuario_nome: 'VICENTE DE PAUL MARTINEZ', patterns: ['Vicente', 'vicente'] },
      { usuario_nome: 'VINICIUS MOTA', patterns: ['Vinicius Mota', 'Vinícius', 'vinicius'] },
    ];

    console.log('=== ANÁLISE DE DUPLICATAS ===\n');

    const consolidacoes = [];

    for (const usuario of usuarios.rows) {
      const map = mapeamento.find(m => m.usuario_nome === usuario.nome);
      if (!map) {
        console.log(`⚠ Sem mapeamento para ${usuario.nome}`);
        continue;
      }

      // Encontrar todos os vendedores que correspondem a este usuario
      const matchingVendedores = vendedores.rows.filter(v => {
        const vnomeLower = v.nome.toLowerCase();
        return map.patterns.some(p => vnomeLower.includes(p.toLowerCase()));
      });

      if (matchingVendedores.length === 0) {
        console.log(`⚠ Nenhum vendedor CRM encontrado para ${usuario.nome}`);
        continue;
      }

      // Ordenar por total de oportunidades (o com mais fica como canônico)
      matchingVendedores.sort((a, b) => parseInt(b.total_oportunidades) - parseInt(a.total_oportunidades));

      const canonico = matchingVendedores[0];
      const duplicados = matchingVendedores.slice(1);

      console.log(`\n👤 ${usuario.nome} (usuario_id: ${usuario.id})`);
      console.log(`   ✅ Canônico: [${canonico.id}] ${canonico.nome} (${canonico.email}) - ${canonico.total_oportunidades} oportunidades`);
      duplicados.forEach(d => {
        console.log(`   🔄 Duplicado: [${d.id}] ${d.nome} (${d.email}) - ${d.total_oportunidades} oportunidades`);
      });

      consolidacoes.push({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        usuario_email: usuario.email,
        canonico_id: canonico.id,
        duplicados_ids: duplicados.map(d => d.id),
      });
    }

    // 4. Executar consolidação
    console.log('\n\n=== EXECUTANDO CONSOLIDAÇÃO ===\n');

    await client.query('BEGIN');

    let totalOportunidadesMigradas = 0;
    let totalClientesMigrados = 0;
    let totalDuplicadosDesativados = 0;

    for (const c of consolidacoes) {
      console.log(`\n📋 Processando ${c.usuario_nome}...`);

      // 4a. Linkar canônico ao usuario
      await client.query(
        `UPDATE crm_vendedores SET usuario_id = $1, nome = $2, email = $3, updated_at = NOW() WHERE id = $4`,
        [c.usuario_id, c.usuario_nome, c.usuario_email, c.canonico_id]
      );
      console.log(`   ✅ Linkado crm_vendedores[${c.canonico_id}] -> usuarios[${c.usuario_id}]`);
      console.log(`   ✅ Atualizado nome para "${c.usuario_nome}" e email para "${c.usuario_email}"`);

      // 4b. Migrar oportunidades dos duplicados para o canônico
      for (const dupId of c.duplicados_ids) {
        const opResult = await client.query(
          `UPDATE crm_oportunidades SET vendedor_id = $1 WHERE vendedor_id = $2`,
          [c.canonico_id, dupId]
        );
        const opCount = opResult?.rowCount || 0;
        totalOportunidadesMigradas += opCount;
        if (opCount > 0) {
          console.log(`   🔄 Migradas ${opCount} oportunidades de vendedor[${dupId}] -> vendedor[${c.canonico_id}]`);
        }

        // Migrar clientes
        const clResult = await client.query(
          `UPDATE crm_clientes SET vendedor_id = $1 WHERE vendedor_id = $2`,
          [c.canonico_id, dupId]
        );
        const clCount = clResult?.rowCount || 0;
        totalClientesMigrados += clCount;
        if (clCount > 0) {
          console.log(`   🔄 Migrados ${clCount} clientes de vendedor[${dupId}] -> vendedor[${c.canonico_id}]`);
        }

        // Migrar interações
        await client.query(
          `UPDATE crm_interacoes SET vendedor_id = $1 WHERE vendedor_id = $2`,
          [c.canonico_id, dupId]
        );

        // Migrar atividades
        await client.query(
          `UPDATE crm_atividades SET vendedor_id = $1 WHERE vendedor_id = $2`,
          [c.canonico_id, dupId]
        );

        // Migrar propostas CRM
        await client.query(
          `UPDATE crm_propostas SET vendedor_id = $1 WHERE vendedor_id = $2`,
          [c.canonico_id, dupId]
        );

        // Migrar metas
        await client.query(
          `UPDATE crm_metas SET vendedor_id = $1 WHERE vendedor_id = $2 AND NOT EXISTS (
            SELECT 1 FROM crm_metas m2 WHERE m2.vendedor_id = $1 AND m2.mes = crm_metas.mes AND m2.ano = crm_metas.ano
          )`,
          [c.canonico_id, dupId]
        );
        // Deletar metas duplicadas restantes
        await client.query(`DELETE FROM crm_metas WHERE vendedor_id = $1`, [dupId]);

        // Desativar duplicado
        await client.query(
          `UPDATE crm_vendedores SET ativo = false, updated_at = NOW() WHERE id = $1`,
          [dupId]
        );
        totalDuplicadosDesativados++;
        console.log(`   ❌ Desativado vendedor duplicado [${dupId}]`);
      }
    }

    // 5. Atualizar is_vendedor nos usuarios
    await client.query(`
      UPDATE usuarios SET is_vendedor = true
      WHERE perfil_id = 3 AND ativo = true
    `);
    console.log(`\n✅ Flag is_vendedor atualizada para usuários com perfil vendedor`);

    await client.query('COMMIT');

    console.log('\n\n=== RESUMO ===');
    console.log(`✅ ${consolidacoes.length} vendedores consolidados e linkados a usuários`);
    console.log(`🔄 ${totalOportunidadesMigradas} oportunidades migradas`);
    console.log(`🔄 ${totalClientesMigrados} clientes migrados`);
    console.log(`❌ ${totalDuplicadosDesativados} registros duplicados desativados`);

    // 6. Verificação final
    console.log('\n\n=== VERIFICAÇÃO FINAL ===\n');

    const verificacao = await client.query(`
      SELECT v.id, v.nome, v.email, v.usuario_id, v.ativo, u.nome as usuario_nome,
             COUNT(DISTINCT o.id) as total_oportunidades
      FROM crm_vendedores v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      WHERE v.ativo = true
      GROUP BY v.id, u.nome
      ORDER BY v.nome
    `);

    console.log('Vendedores ativos após consolidação:');
    verificacao.rows.forEach(v => {
      const linked = v.usuario_id ? `✅ -> usuario[${v.usuario_id}]` : '⚠ SEM LINK';
      console.log(`  [${v.id}] ${v.nome} (${v.email}) - ${v.total_oportunidades} oport. ${linked}`);
    });

    // Verificar orphans (vendedores ativos sem usuario_id que têm oportunidades)
    const orphans = verificacao.rows.filter(v => !v.usuario_id && parseInt(v.total_oportunidades) > 0);
    if (orphans.length > 0) {
      console.log('\n⚠ Vendedores ativos SEM link a usuário mas COM oportunidades:');
      orphans.forEach(v => {
        console.log(`  [${v.id}] ${v.nome} (${v.email}) - ${v.total_oportunidades} oportunidades`);
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO na consolidação:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

consolidar().catch(console.error);
