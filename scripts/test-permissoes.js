/**
 * Script para testar permissões de TODOS os usuários do banco de dados
 * Simula exatamente o que o server-side verificarPermissao() faz
 * Executa: node scripts/test-permissoes.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();

  try {
    // Buscar todos os usuários ativos com seu perfil
    const usuarios = await client.query(`
      SELECT
        u.id, u.nome, u.email, u.departamento, u.cargo,
        u.is_admin, u.perfil_id,
        pa.nome as perfil_nome,
        pa.permissoes_padrao,
        COALESCE(u.is_vendedor, false) as is_vendedor
      FROM usuarios u
      LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
      WHERE COALESCE(u.ativo, true) = true
      ORDER BY u.is_admin DESC NULLS LAST, pa.nivel DESC NULLS LAST, u.nome
    `);

    // Buscar módulos
    const modulos = await client.query(`
      SELECT id, codigo, nome FROM modulos WHERE ativo = true ORDER BY ordem
    `);

    // Buscar todas as permissões personalizadas
    const permCustom = await client.query(`
      SELECT usuario_id, modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_aprovar
      FROM permissoes_modulos
    `);

    // Mapear permissões personalizadas
    const permMap = {};
    permCustom.rows.forEach(p => {
      if (!permMap[p.usuario_id]) permMap[p.usuario_id] = {};
      permMap[p.usuario_id][p.modulo_id] = p;
    });

    const MODULOS = ['PRODUCAO', 'QUALIDADE', 'COMERCIAL', 'ADMIN'];
    const ACOES = ['visualizar', 'criar', 'editar', 'excluir', 'aprovar'];

    // Mapear módulo código -> id
    const moduloMap = {};
    modulos.rows.forEach(m => { moduloMap[m.codigo] = m.id; });

    console.log('');
    console.log('==========================================================================');
    console.log('     TESTE DE PERMISSOES - TODOS OS USUARIOS ATIVOS DO BANCO');
    console.log('==========================================================================');
    console.log('');
    console.log('Legenda: V=Visualizar C=Criar E=Editar X=Excluir A=Aprovar');
    console.log('         [OK]=permitido  [--]=negado');
    console.log('Fonte:   ADM=is_admin | PER=personalizada | PRF=perfil | DEF=default');
    console.log('');

    let problemas = [];

    for (const user of usuarios.rows) {
      const isAdmin = user.is_admin === true;
      const permissoesPadrao = user.permissoes_padrao || {};
      const userPerms = permMap[user.id] || {};

      const adminTag = isAdmin ? ' [ADMIN]' : '';
      const perfilTag = user.perfil_nome ? `Perfil: ${user.perfil_nome}` : 'Perfil: NENHUM';
      console.log(`--- ${user.nome}${adminTag} | ${perfilTag} | Dept: ${user.departamento || '-'} ---`);

      for (const modCodigo of MODULOS) {
        const moduloId = moduloMap[modCodigo];
        const permPersonalizada = userPerms[moduloId];
        const permPerfil = permissoesPadrao[modCodigo] || {};

        const resultados = {};
        const fontes = {};

        for (const acao of ACOES) {
          if (isAdmin) {
            resultados[acao] = true;
            fontes[acao] = 'ADM';
          } else if (permPersonalizada) {
            const campo = `pode_${acao}`;
            resultados[acao] = permPersonalizada[campo] ?? false;
            fontes[acao] = 'PER';
          } else if (permPerfil[acao] !== undefined) {
            resultados[acao] = permPerfil[acao];
            fontes[acao] = 'PRF';
          } else {
            resultados[acao] = acao === 'visualizar';
            fontes[acao] = 'DEF';
          }
        }

        const fmt = (acao, letra) => resultados[acao] ? `${letra}[OK]` : `${letra}[--]`;
        const fonte = fontes['editar'];
        const line = `  ${modCodigo.padEnd(10)} | ${fmt('visualizar', 'V')} ${fmt('criar', 'C')} ${fmt('editar', 'E')} ${fmt('excluir', 'X')} ${fmt('aprovar', 'A')} | fonte:[${fonte}]`;
        console.log(line);

        // Detectar problemas
        if (!isAdmin) {
          const deptUpper = (user.departamento || '').toUpperCase();
          const isOwnModule =
            (deptUpper === 'COMERCIAL' && modCodigo === 'COMERCIAL') ||
            (deptUpper.includes('PRODU') && modCodigo === 'PRODUCAO') ||
            (deptUpper.includes('QUALIDADE') && modCodigo === 'QUALIDADE');

          if (isOwnModule && !resultados['editar']) {
            problemas.push(`${user.nome}: Nao pode EDITAR em ${modCodigo} (seu departamento!)`);
          }
          if (isOwnModule && !resultados['criar']) {
            problemas.push(`${user.nome}: Nao pode CRIAR em ${modCodigo} (seu departamento!)`);
          }
        }
      }
      console.log('');
    }

    // Resumo
    console.log('==========================================================================');
    console.log('                             RESUMO');
    console.log('==========================================================================');
    console.log(`Total de usuarios ativos: ${usuarios.rows.length}`);
    console.log(`Admins (is_admin=true):   ${usuarios.rows.filter(u => u.is_admin === true).length}`);
    console.log(`Com perfil atribuido:     ${usuarios.rows.filter(u => u.perfil_id).length}`);
    console.log(`Sem perfil (PROBLEMA):    ${usuarios.rows.filter(u => !u.perfil_id).length}`);
    console.log(`Com perms personalizadas: ${Object.keys(permMap).length}`);
    console.log('');

    // Contagem por perfil
    const perfilCount = {};
    usuarios.rows.forEach(u => {
      const p = u.perfil_nome || 'SEM PERFIL';
      perfilCount[p] = (perfilCount[p] || 0) + 1;
    });
    console.log('Distribuicao por perfil:');
    Object.entries(perfilCount).sort((a, b) => b[1] - a[1]).forEach(([perfil, count]) => {
      console.log(`  ${perfil.padEnd(25)} ${count} usuarios`);
    });
    console.log('');

    if (problemas.length > 0) {
      console.log('PROBLEMAS DETECTADOS:');
      [...new Set(problemas)].forEach(p => console.log(`  ! ${p}`));
    } else {
      console.log('RESULTADO: Nenhum problema detectado!');
      console.log('Todos os usuarios tem permissoes adequadas ao seu departamento.');
    }

    console.log('');

  } catch (error) {
    console.error('ERRO:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
