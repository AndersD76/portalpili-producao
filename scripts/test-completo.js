/**
 * Testes completos do Portal Pili
 * Simula fluxos reais: autenticação, permissões, filtros, integridade
 * Executa: node scripts/test-completo.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(msg) { passed++; console.log(`  [PASS] ${msg}`); }
function fail(msg) { failed++; console.log(`  [FAIL] ${msg}`); }
function warn(msg) { warnings++; console.log(`  [WARN] ${msg}`); }

async function run() {
  const client = await pool.connect();

  try {
    // =====================================================================
    console.log('\n====== TESTE 1: TABELAS DE PERMISSOES ======\n');
    // =====================================================================

    const tabelas = ['modulos', 'perfis_acesso', 'permissoes_modulos', 'usuarios'];
    for (const t of tabelas) {
      const r = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`, [t]);
      r.rows[0].exists ? ok(`Tabela '${t}' existe`) : fail(`Tabela '${t}' NAO existe`);
    }

    // Verificar módulos
    const modulos = await client.query(`SELECT codigo FROM modulos WHERE ativo = true ORDER BY ordem`);
    const modCodigos = modulos.rows.map(m => m.codigo);
    for (const expected of ['PRODUCAO', 'QUALIDADE', 'COMERCIAL', 'ADMIN']) {
      modCodigos.includes(expected) ? ok(`Modulo '${expected}' ativo`) : fail(`Modulo '${expected}' AUSENTE`);
    }

    // Verificar perfis
    const perfis = await client.query(`SELECT nome, permissoes_padrao FROM perfis_acesso WHERE ativo = true`);
    for (const expected of ['Administrador', 'Gerente', 'Vendedor', 'Operador Produção', 'Qualidade']) {
      const p = perfis.rows.find(r => r.nome === expected);
      if (!p) { fail(`Perfil '${expected}' AUSENTE`); continue; }
      ok(`Perfil '${expected}' existe`);
      // Verificar que permissoes_padrao tem os 4 módulos
      const pp = p.permissoes_padrao || {};
      const temTodos = ['PRODUCAO', 'QUALIDADE', 'COMERCIAL', 'ADMIN'].every(m => pp[m] !== undefined);
      temTodos ? ok(`  Perfil '${expected}' tem todos os modulos configurados`) : fail(`  Perfil '${expected}' faltam modulos em permissoes_padrao`);
    }

    // =====================================================================
    console.log('\n====== TESTE 2: USUARIOS E PERFIS ======\n');
    // =====================================================================

    const usuarios = await client.query(`
      SELECT u.id, u.nome, u.is_admin, u.perfil_id, u.departamento, u.ativo,
             pa.nome as perfil_nome, COALESCE(u.is_vendedor, false) as is_vendedor
      FROM usuarios u
      LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
      WHERE COALESCE(u.ativo, true) = true
    `);

    const semPerfil = usuarios.rows.filter(u => !u.perfil_id);
    const comPerfil = usuarios.rows.filter(u => u.perfil_id);
    const admins = usuarios.rows.filter(u => u.is_admin === true);

    semPerfil.length === 0
      ? ok(`Todos os ${usuarios.rows.length} usuarios ativos tem perfil`)
      : fail(`${semPerfil.length} usuarios SEM perfil: ${semPerfil.map(u => u.nome).join(', ')}`);

    admins.length > 0
      ? ok(`${admins.length} admins configurados: ${admins.map(u => u.nome).join(', ')}`)
      : fail('Nenhum admin configurado!');

    // Verificar que admins tem perfil Administrador
    for (const admin of admins) {
      admin.perfil_nome === 'Administrador'
        ? ok(`Admin '${admin.nome}' tem perfil Administrador`)
        : warn(`Admin '${admin.nome}' tem perfil '${admin.perfil_nome}' (esperado: Administrador)`);
    }

    // Verificar is_admin NULL
    const isAdminNull = await client.query(`SELECT COUNT(*) as total FROM usuarios WHERE is_admin IS NULL AND COALESCE(ativo, true) = true`);
    parseInt(isAdminNull.rows[0].total) === 0
      ? ok('Nenhum usuario com is_admin=NULL')
      : fail(`${isAdminNull.rows[0].total} usuarios com is_admin=NULL (deveria ser false)`);

    // =====================================================================
    console.log('\n====== TESTE 3: SIMULACAO verificarPermissao() ======\n');
    // =====================================================================

    // Simular a função buscarPermissaoModulo para cada tipo de usuario
    const cenarios = [
      { desc: 'Admin editando no ADMIN', userId: admins[0]?.id, modulo: 'ADMIN', acao: 'editar', esperado: true },
      { desc: 'Admin excluindo no COMERCIAL', userId: admins[0]?.id, modulo: 'COMERCIAL', acao: 'excluir', esperado: true },
      { desc: 'Admin criando na PRODUCAO', userId: admins[0]?.id, modulo: 'PRODUCAO', acao: 'criar', esperado: true },
    ];

    // Pegar um vendedor do Comercial
    const vendedor = usuarios.rows.find(u => !u.is_admin && u.departamento === 'COMERCIAL');
    if (vendedor) {
      cenarios.push(
        { desc: `Vendedor '${vendedor.nome}' visualizando COMERCIAL`, userId: vendedor.id, modulo: 'COMERCIAL', acao: 'visualizar', esperado: true },
        { desc: `Vendedor '${vendedor.nome}' criando no COMERCIAL`, userId: vendedor.id, modulo: 'COMERCIAL', acao: 'criar', esperado: true },
        { desc: `Vendedor '${vendedor.nome}' editando no COMERCIAL`, userId: vendedor.id, modulo: 'COMERCIAL', acao: 'editar', esperado: true },
        { desc: `Vendedor '${vendedor.nome}' acessando ADMIN`, userId: vendedor.id, modulo: 'ADMIN', acao: 'editar', esperado: false },
      );
    }

    // Pegar um gerente
    const gerente = usuarios.rows.find(u => !u.is_admin && u.perfil_nome === 'Gerente');
    if (gerente) {
      cenarios.push(
        { desc: `Gerente '${gerente.nome}' editando PRODUCAO`, userId: gerente.id, modulo: 'PRODUCAO', acao: 'editar', esperado: true },
        { desc: `Gerente '${gerente.nome}' editando QUALIDADE`, userId: gerente.id, modulo: 'QUALIDADE', acao: 'editar', esperado: true },
      );
    }

    for (const c of cenarios) {
      if (!c.userId) { warn(`Cenario '${c.desc}' pulado (sem usuario)`); continue; }

      const resultado = await simularVerificarPermissao(client, c.userId, c.modulo, c.acao);
      resultado === c.esperado
        ? ok(`${c.desc} → ${resultado ? 'PERMITIDO' : 'NEGADO'} (correto)`)
        : fail(`${c.desc} → ${resultado ? 'PERMITIDO' : 'NEGADO'} (esperado: ${c.esperado ? 'PERMITIDO' : 'NEGADO'})`);
    }

    // =====================================================================
    console.log('\n====== TESTE 4: API /api/auth/permissoes (simulação) ======\n');
    // =====================================================================

    // Simular o que a API retorna para cada tipo de usuario
    for (const tipo of ['admin', 'vendedor', 'gerente']) {
      let user;
      if (tipo === 'admin') user = admins[0];
      else if (tipo === 'vendedor') user = vendedor;
      else user = gerente;

      if (!user) { warn(`Sem usuario tipo '${tipo}' para testar`); continue; }

      const userResult = await client.query(`
        SELECT u.id, u.is_admin, u.perfil_id, pa.permissoes_padrao
        FROM usuarios u LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
        WHERE u.id = $1`, [user.id]);

      const isAdmin = userResult.rows[0]?.is_admin === true;
      const permissoesPadrao = userResult.rows[0]?.permissoes_padrao || {};

      const modulosResult = await client.query(`SELECT id, codigo FROM modulos WHERE ativo = true`);
      const permPersonalizadas = await client.query(`SELECT modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_aprovar FROM permissoes_modulos WHERE usuario_id = $1`, [user.id]);
      const permMap = {};
      permPersonalizadas.rows.forEach(p => { permMap[p.modulo_id] = p; });

      let temAlgumaEdicao = false;
      for (const mod of modulosResult.rows) {
        const pp = permMap[mod.id];
        const permPerfil = permissoesPadrao[mod.codigo] || {};
        const podeEditar = isAdmin || (pp?.pode_editar ?? permPerfil.editar ?? false);
        const podeCriar = isAdmin || (pp?.pode_criar ?? permPerfil.criar ?? false);
        if (podeEditar || podeCriar) temAlgumaEdicao = true;
      }

      temAlgumaEdicao
        ? ok(`API permissoes para ${tipo} '${user.nome}': tem permissao de edicao`)
        : fail(`API permissoes para ${tipo} '${user.nome}': NAO tem nenhuma permissao de edicao!`);
    }

    // =====================================================================
    console.log('\n====== TESTE 5: FILTRO VENDEDOR (clientes/propostas/oportunidades) ======\n');
    // =====================================================================

    // Verificar que vendedores estão vinculados a usuarios
    const vendedoresDB = await client.query(`
      SELECT v.id, v.nome, v.usuario_id, u.nome as usuario_nome
      FROM crm_vendedores v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.ativo = true
    `);

    const vinculados = vendedoresDB.rows.filter(v => v.usuario_id);
    const naoVinculados = vendedoresDB.rows.filter(v => !v.usuario_id);

    ok(`${vendedoresDB.rows.length} vendedores ativos no CRM`);
    vinculados.length > 0
      ? ok(`${vinculados.length} vendedores vinculados a usuarios`)
      : fail('Nenhum vendedor vinculado a usuario!');
    naoVinculados.length === 0
      ? ok('Todos vendedores vinculados')
      : warn(`${naoVinculados.length} vendedores SEM vinculo: ${naoVinculados.map(v => v.nome).join(', ')}`);

    // Testar filtro: pegar Tiago como exemplo
    const tiago = vendedoresDB.rows.find(v => v.nome && v.nome.toUpperCase().includes('TIAGO'));
    if (tiago) {
      const clientesTiago = await client.query(`
        SELECT COUNT(*) as total FROM crm_clientes
        WHERE vendedor_id = $1 OR id IN (SELECT cliente_id FROM crm_oportunidades WHERE vendedor_id = $1)
      `, [tiago.id]);

      const clientesTotal = await client.query(`SELECT COUNT(*) as total FROM crm_clientes`);
      const propostasTiago = await client.query(`SELECT COUNT(*) as total FROM crm_propostas WHERE vendedor_id = $1`, [tiago.id]);
      const propostasTotal = await client.query(`SELECT COUNT(*) as total FROM crm_propostas`);

      ok(`Tiago (vendedor_id=${tiago.id}): ${clientesTiago.rows[0].total} clientes (de ${clientesTotal.rows[0].total} total)`);
      ok(`Tiago: ${propostasTiago.rows[0].total} propostas (de ${propostasTotal.rows[0].total} total)`);

      parseInt(clientesTiago.rows[0].total) < parseInt(clientesTotal.rows[0].total)
        ? ok('Filtro de clientes funcionaria (Tiago vê menos que o total)')
        : warn('Tiago vê TODOS os clientes - verificar filtro');

      parseInt(propostasTiago.rows[0].total) < parseInt(propostasTotal.rows[0].total)
        ? ok('Filtro de propostas funcionaria (Tiago vê menos que o total)')
        : warn('Tiago vê TODAS as propostas - verificar filtro');
    }

    // =====================================================================
    console.log('\n====== TESTE 6: INTEGRIDADE DO BANCO ======\n');
    // =====================================================================

    // Verificar FKs orphãs
    const orfaosClientes = await client.query(`
      SELECT COUNT(*) as total FROM crm_clientes c
      WHERE c.vendedor_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM crm_vendedores v WHERE v.id = c.vendedor_id)
    `);
    parseInt(orfaosClientes.rows[0].total) === 0
      ? ok('Sem clientes com vendedor_id orfao')
      : warn(`${orfaosClientes.rows[0].total} clientes com vendedor_id apontando para vendedor inexistente`);

    const orfaosOportunidades = await client.query(`
      SELECT COUNT(*) as total FROM crm_oportunidades o
      WHERE o.vendedor_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM crm_vendedores v WHERE v.id = o.vendedor_id)
    `);
    parseInt(orfaosOportunidades.rows[0].total) === 0
      ? ok('Sem oportunidades com vendedor_id orfao')
      : warn(`${orfaosOportunidades.rows[0].total} oportunidades com vendedor_id orfao`);

    const orfaosPropostas = await client.query(`
      SELECT COUNT(*) as total FROM crm_propostas p
      WHERE p.vendedor_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM crm_vendedores v WHERE v.id = p.vendedor_id)
    `);
    parseInt(orfaosPropostas.rows[0].total) === 0
      ? ok('Sem propostas CRM com vendedor_id orfao')
      : warn(`${orfaosPropostas.rows[0].total} propostas CRM com vendedor_id orfao`);

    // Usuarios com perfil_id apontando para perfil inexistente
    const orfaosPerfil = await client.query(`
      SELECT COUNT(*) as total FROM usuarios u
      WHERE u.perfil_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM perfis_acesso pa WHERE pa.id = u.perfil_id)
    `);
    parseInt(orfaosPerfil.rows[0].total) === 0
      ? ok('Sem usuarios com perfil_id orfao')
      : fail(`${orfaosPerfil.rows[0].total} usuarios com perfil_id apontando para perfil inexistente`);

    // =====================================================================
    console.log('\n====== TESTE 7: TABELA propostas_comerciais (sync) ======\n');
    // =====================================================================

    // Verificar se existem estados com mais de 2 chars
    try {
      const estadosLongos = await client.query(`
        SELECT cliente_estado, COUNT(*) as total
        FROM propostas_comerciais
        WHERE LENGTH(cliente_estado) > 2
        GROUP BY cliente_estado
      `);
      estadosLongos.rows.length === 0
        ? ok('Nenhum estado com mais de 2 caracteres na tabela propostas_comerciais')
        : fail(`Estados com mais de 2 chars: ${estadosLongos.rows.map(r => `"${r.cliente_estado}" (${r.total}x)`).join(', ')}`);
    } catch (e) {
      warn(`Tabela propostas_comerciais nao acessivel: ${e.message}`);
    }

    // Verificar estados validos
    const SIGLAS_VALIDAS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
    try {
      const estadosInvalidos = await client.query(`
        SELECT DISTINCT cliente_estado FROM propostas_comerciais
        WHERE cliente_estado IS NOT NULL AND cliente_estado != ''
        AND cliente_estado NOT IN (${SIGLAS_VALIDAS.map((_, i) => `$${i + 1}`).join(',')})
      `, SIGLAS_VALIDAS);
      estadosInvalidos.rows.length === 0
        ? ok('Todos os estados sao siglas UF validas')
        : warn(`Estados nao-UF encontrados: ${estadosInvalidos.rows.map(r => `"${r.cliente_estado}"`).join(', ')}`);
    } catch (e) {
      // Tabela pode nao existir
    }

    // =====================================================================
    console.log('\n====== TESTE 8: CONTADORES DO DASHBOARD ======\n');
    // =====================================================================

    // Verificar se os contadores do dashboard retornam numeros corretos por vendedor
    if (tiago) {
      const tiagoCRM = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM crm_clientes WHERE vendedor_id = $1 OR id IN (SELECT cliente_id FROM crm_oportunidades WHERE vendedor_id = $1)) as clientes,
          (SELECT COUNT(*) FROM crm_propostas WHERE vendedor_id = $1) as propostas,
          (SELECT COUNT(*) FROM crm_oportunidades WHERE vendedor_id = $1) as oportunidades
      `, [tiago.id]);

      const totais = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM crm_clientes) as clientes,
          (SELECT COUNT(*) FROM crm_propostas) as propostas,
          (SELECT COUNT(*) FROM crm_oportunidades) as oportunidades
      `);

      const t = tiagoCRM.rows[0];
      const total = totais.rows[0];

      console.log(`  Dashboard Tiago: Clientes=${t.clientes} Propostas=${t.propostas} Oportunidades=${t.oportunidades}`);
      console.log(`  Dashboard Total: Clientes=${total.clientes} Propostas=${total.propostas} Oportunidades=${total.oportunidades}`);

      parseInt(t.propostas) !== parseInt(total.propostas)
        ? ok(`Contador propostas filtrado corretamente (${t.propostas} != ${total.propostas})`)
        : warn('Contador propostas iguais - pode indicar filtro nao aplicado');

      parseInt(t.clientes) !== parseInt(total.clientes)
        ? ok(`Contador clientes filtrado corretamente (${t.clientes} != ${total.clientes})`)
        : warn('Contador clientes iguais - pode indicar filtro nao aplicado');
    }

    // =====================================================================
    console.log('\n====== TESTE 9: JWT CAMPOS NECESSARIOS ======\n');
    // =====================================================================

    // Verificar que todos os campos necessários para o JWT existem na tabela usuarios
    const colunas = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios'
    `);
    const colunasSet = new Set(colunas.rows.map(c => c.column_name));
    const camposJWT = ['id', 'id_funcionario', 'nome', 'email', 'cargo', 'departamento', 'is_admin', 'perfil_id'];
    for (const campo of camposJWT) {
      colunasSet.has(campo)
        ? ok(`Coluna 'usuarios.${campo}' existe (necessaria para JWT)`)
        : fail(`Coluna 'usuarios.${campo}' AUSENTE (necessaria para JWT!)`);
    }

    // Verificar que nenhum admin tem senha_hash vazia
    const adminsSemSenha = await client.query(`
      SELECT nome FROM usuarios WHERE is_admin = true AND (senha_hash IS NULL OR senha_hash = '')
    `);
    adminsSemSenha.rows.length === 0
      ? ok('Todos os admins tem senha configurada')
      : fail(`Admins SEM senha: ${adminsSemSenha.rows.map(u => u.nome).join(', ')}`);

    // =====================================================================
    // RESUMO FINAL
    // =====================================================================
    console.log('\n==========================================================================');
    console.log('                         RESULTADO FINAL');
    console.log('==========================================================================');
    console.log(`  PASSED:   ${passed}`);
    console.log(`  FAILED:   ${failed}`);
    console.log(`  WARNINGS: ${warnings}`);
    console.log('');
    if (failed === 0) {
      console.log('  RESULTADO: TODOS OS TESTES PASSARAM!');
    } else {
      console.log(`  RESULTADO: ${failed} TESTE(S) FALHARAM - verificar itens [FAIL] acima`);
    }
    console.log('==========================================================================\n');

  } catch (error) {
    console.error('\nERRO CRITICO:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

/**
 * Simula exatamente o que verificarPermissao() faz no server-side
 */
async function simularVerificarPermissao(client, userId, modulo, acao) {
  // 1. Buscar usuario
  const userResult = await client.query(`
    SELECT u.id, u.is_admin, u.perfil_id, pa.permissoes_padrao
    FROM usuarios u LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
    WHERE u.id = $1 AND COALESCE(u.ativo, true) = true
  `, [userId]);

  if (!userResult.rows.length) return false;
  const user = userResult.rows[0];

  // 2. Admin bypass
  if (user.is_admin === true) return true;

  // 3. Buscar modulo
  const moduloResult = await client.query(`SELECT id FROM modulos WHERE codigo = $1 AND ativo = true`, [modulo]);
  if (!moduloResult.rows.length) return false;
  const moduloId = moduloResult.rows[0].id;

  // 4. Buscar permissao personalizada
  const permResult = await client.query(`
    SELECT pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_aprovar
    FROM permissoes_modulos WHERE usuario_id = $1 AND modulo_id = $2
  `, [userId, moduloId]);

  const permPersonalizada = permResult.rows[0];
  const permissoesPadrao = user.permissoes_padrao || {};
  const permPerfil = permissoesPadrao[modulo] || {};

  const campo = `pode_${acao}`;
  const defaultVal = acao === 'visualizar';

  return permPersonalizada?.[campo] ?? permPerfil[acao] ?? defaultVal;
}

run().catch(console.error);
