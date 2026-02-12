/**
 * Limpeza de duplicatas no CRM
 *
 * Problemas encontrados:
 * 1. propostas_comerciais tem duplicatas (ex: "329" e "PROP-00329" para mesma proposta)
 * 2. crm_oportunidades tem duplicatas: "Venda X - Cliente" (migrate-to-crm.js) + "X - Cliente" (sync)
 * 3. crm_vendedores tem duplicatas (ex: "Tiago Gevinski" id=10 + "TIAGO GEVINSKI" id=146)
 *
 * Executa: node scripts/cleanup-duplicatas.js
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
    console.log('=============================================================');
    console.log('  LIMPEZA DE DUPLICATAS DO CRM');
    console.log('=============================================================\n');

    // ==================== 1. VENDEDORES DUPLICADOS ====================
    console.log('1. VENDEDORES DUPLICADOS\n');

    // Buscar vendedores com nomes similares (case-insensitive)
    const vendedoresDup = await client.query(`
      SELECT v1.id as id_manter, v1.nome as nome_manter, v1.usuario_id, v1.ativo as ativo_manter,
             v2.id as id_remover, v2.nome as nome_remover, v2.ativo as ativo_remover
      FROM crm_vendedores v1
      JOIN crm_vendedores v2 ON UPPER(TRIM(v1.nome)) = UPPER(TRIM(v2.nome)) AND v1.id != v2.id
      WHERE v1.id < v2.id OR (v1.usuario_id IS NOT NULL AND v2.usuario_id IS NULL)
    `);

    // Determinar qual manter: o que tem usuario_id, ou o ativo, ou o de maior id
    const vendedorMerges = new Map();
    const todosVendedores = await client.query(`SELECT id, nome, usuario_id, ativo, email FROM crm_vendedores ORDER BY id`);

    // Agrupar por nome normalizado
    const vendedorGroups = {};
    for (const v of todosVendedores.rows) {
      const key = v.nome.trim().toUpperCase();
      if (!vendedorGroups[key]) vendedorGroups[key] = [];
      vendedorGroups[key].push(v);
    }

    let vendedoresMerged = 0;
    for (const [nome, grupo] of Object.entries(vendedorGroups)) {
      if (grupo.length <= 1) continue;

      // Escolher o melhor: com usuario_id > ativo > maior id
      const sorted = grupo.sort((a, b) => {
        if (a.usuario_id && !b.usuario_id) return -1;
        if (!a.usuario_id && b.usuario_id) return 1;
        if (a.ativo && !b.ativo) return -1;
        if (!a.ativo && b.ativo) return 1;
        return b.id - a.id; // maior id = mais recente
      });

      const manter = sorted[0];
      const remover = sorted.slice(1);

      console.log(`  Grupo "${nome}": manter id=${manter.id} (usuario_id=${manter.usuario_id}, ativo=${manter.ativo})`);

      for (const rem of remover) {
        console.log(`    Remover id=${rem.id} (usuario_id=${rem.usuario_id}, ativo=${rem.ativo})`);

        // Transferir referências
        const tabelas = [
          { tabela: 'crm_clientes', coluna: 'vendedor_id' },
          { tabela: 'crm_oportunidades', coluna: 'vendedor_id' },
          { tabela: 'crm_propostas', coluna: 'vendedor_id' },
          { tabela: 'crm_atividades', coluna: 'vendedor_id' },
        ];

        for (const { tabela, coluna } of tabelas) {
          const upd = await client.query(
            `UPDATE ${tabela} SET ${coluna} = $1 WHERE ${coluna} = $2`,
            [manter.id, rem.id]
          );
          if (upd.rowCount > 0) {
            console.log(`      ${tabela}: ${upd.rowCount} registros transferidos`);
          }
        }

        // Deletar vendedor duplicado
        await client.query(`DELETE FROM crm_vendedores WHERE id = $1`, [rem.id]);
        vendedoresMerged++;
      }
    }
    console.log(`  Total vendedores mesclados: ${vendedoresMerged}\n`);

    // ==================== 2. PROPOSTAS_COMERCIAIS DUPLICADAS ====================
    console.log('2. PROPOSTAS_COMERCIAIS DUPLICADAS\n');

    // Identificar duplicatas por numero_proposta normalizado
    // Formatos: "329", "PROP-00329", "PROP-329" -> todos representam proposta 329
    const propostasCom = await client.query(`
      SELECT id, numero_proposta, situacao, cliente_nome, vendedor_nome, valor_total, data_criacao
      FROM propostas_comerciais
      WHERE numero_proposta IS NOT NULL
      ORDER BY numero_proposta
    `);

    function normalizarNumProposta(num) {
      if (!num) return null;
      // Remover PROP-, zeros à esquerda
      const limpo = num.replace(/^PROP-0*/i, '').replace(/^0+/, '');
      return limpo || null;
    }

    const propostaGroups = {};
    for (const p of propostasCom.rows) {
      const key = normalizarNumProposta(p.numero_proposta);
      if (!key) continue;
      if (!propostaGroups[key]) propostaGroups[key] = [];
      propostaGroups[key].push(p);
    }

    let propostasRemovidas = 0;
    const idsRemover = [];

    for (const [numNorm, grupo] of Object.entries(propostaGroups)) {
      if (grupo.length <= 1) continue;

      // Manter a que tem formato PROP- (mais completo) ou a com mais dados
      const sorted = grupo.sort((a, b) => {
        // Preferir PROP- format
        const aHasProp = a.numero_proposta.startsWith('PROP-') ? 1 : 0;
        const bHasProp = b.numero_proposta.startsWith('PROP-') ? 1 : 0;
        if (aHasProp !== bHasProp) return bHasProp - aHasProp;
        // Preferir com situacao definida
        if (a.situacao && !b.situacao) return -1;
        if (!a.situacao && b.situacao) return 1;
        // Preferir com valor
        if (a.valor_total && !b.valor_total) return -1;
        if (!a.valor_total && b.valor_total) return 1;
        // Mais recente
        return new Date(b.data_criacao) - new Date(a.data_criacao);
      });

      const manter = sorted[0];
      const removerList = sorted.slice(1);

      if (removerList.length > 0) {
        console.log(`  Proposta #${numNorm}: manter "${manter.numero_proposta}" (id=${manter.id}) | ${manter.situacao} | R$ ${manter.valor_total || 0}`);
        for (const rem of removerList) {
          console.log(`    Remover "${rem.numero_proposta}" (id=${rem.id}) | ${rem.situacao} | R$ ${rem.valor_total || 0}`);
          idsRemover.push(rem.id);
        }
      }
    }

    if (idsRemover.length > 0) {
      await client.query(
        `DELETE FROM propostas_comerciais WHERE id = ANY($1)`,
        [idsRemover]
      );
      propostasRemovidas = idsRemover.length;
    }
    console.log(`  Total propostas_comerciais removidas: ${propostasRemovidas}\n`);

    // ==================== 3. OPORTUNIDADES DUPLICADAS ====================
    console.log('3. OPORTUNIDADES DUPLICADAS\n');

    // Padrão 1: "Venda X - Cliente" + "X - Cliente" -> manter "X - Cliente" (do sync, mais atualizado)
    const opsDupVenda = await client.query(`
      SELECT o1.id as id_sem_venda, o1.titulo as titulo_sem, o1.estagio as estagio_sem,
             o1.valor_estimado as valor_sem, o1.fonte as fonte_sem,
             o2.id as id_com_venda, o2.titulo as titulo_com, o2.estagio as estagio_com,
             o2.valor_estimado as valor_com, o2.fonte as fonte_com
      FROM crm_oportunidades o1
      JOIN crm_oportunidades o2 ON o2.titulo = 'Venda ' || o1.titulo
        AND o1.cliente_id = o2.cliente_id
        AND o1.vendedor_id = o2.vendedor_id
      WHERE o1.titulo NOT LIKE 'Venda %'
    `);

    let opsRemovidasVenda = 0;
    const opsIdsRemover = [];

    for (const dup of opsDupVenda.rows) {
      console.log(`  Duplicata: "${dup.titulo_sem}" (id=${dup.id_sem_venda}, fonte=${dup.fonte_sem}) vs "${dup.titulo_com}" (id=${dup.id_com_venda}, fonte=${dup.fonte_com})`);
      // Remover o "Venda ..." (veio do migrate-to-crm), manter o do sync (PLANILHA)
      opsIdsRemover.push(dup.id_com_venda);
    }

    // Padrão 2: Mesma oportunidade duplicada exata (mesmo titulo + cliente)
    const opsDupExata = await client.query(`
      SELECT titulo, cliente_id, vendedor_id, COUNT(*) as total,
             ARRAY_AGG(id ORDER BY updated_at DESC) as ids,
             ARRAY_AGG(fonte ORDER BY updated_at DESC) as fontes
      FROM crm_oportunidades
      WHERE status != 'CANCELADA'
      GROUP BY titulo, cliente_id, vendedor_id
      HAVING COUNT(*) > 1
    `);

    for (const dup of opsDupExata.rows) {
      const ids = dup.ids;
      const manterIdExato = ids[0]; // mais recente
      const removerIdsExatos = ids.slice(1).filter(id => !opsIdsRemover.includes(id));

      if (removerIdsExatos.length > 0) {
        console.log(`  Duplicata exata: "${dup.titulo}" (${dup.total}x) - manter id=${manterIdExato}, remover ids=[${removerIdsExatos.join(',')}]`);
        opsIdsRemover.push(...removerIdsExatos);
      }
    }

    // Remover duplicatas
    const uniqueOpsRemover = [...new Set(opsIdsRemover)];
    if (uniqueOpsRemover.length > 0) {
      // Desvincular todas as FKs que apontam para oportunidades a remover
      await client.query(
        `UPDATE crm_atividades SET oportunidade_id = NULL WHERE oportunidade_id = ANY($1)`,
        [uniqueOpsRemover]
      );
      await client.query(
        `UPDATE crm_propostas SET oportunidade_id = NULL WHERE oportunidade_id = ANY($1)`,
        [uniqueOpsRemover]
      );

      await client.query(
        `DELETE FROM crm_oportunidades WHERE id = ANY($1)`,
        [uniqueOpsRemover]
      );
      opsRemovidasVenda = uniqueOpsRemover.length;
    }
    console.log(`  Total oportunidades removidas: ${opsRemovidasVenda}\n`);

    // ==================== 4. OPORTUNIDADES ÓRFÃS ====================
    console.log('4. OPORTUNIDADES SEM VENDEDOR OU CLIENTE\n');

    // Oportunidades sem vendedor
    const semVendedor = await client.query(`
      SELECT COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id IS NULL
    `);
    console.log(`  Sem vendedor: ${semVendedor.rows[0].total}`);

    // Oportunidades sem cliente
    const semCliente = await client.query(`
      SELECT COUNT(*) as total FROM crm_oportunidades WHERE cliente_id IS NULL
    `);
    console.log(`  Sem cliente: ${semCliente.rows[0].total}`);

    // Tentar vincular oportunidades sem cliente pelo nome no titulo
    const opsSemCliente = await client.query(`
      SELECT o.id, o.titulo, o.vendedor_id FROM crm_oportunidades o WHERE o.cliente_id IS NULL
    `);

    const todosClientes = await client.query(`SELECT id, razao_social, vendedor_id FROM crm_clientes`);
    let vinculados = 0;

    for (const op of opsSemCliente.rows) {
      // Extrair nome do cliente do titulo (formato: "PRODUTO - CLIENTE")
      const partes = op.titulo.split(' - ');
      if (partes.length < 2) continue;
      const nomeCliente = partes.slice(1).join(' - ').replace(/^Venda /, '');

      // Buscar cliente por nome similar
      const clienteMatch = todosClientes.rows.find(c => {
        const sim = calcularSimilaridade(nomeCliente.toUpperCase(), (c.razao_social || '').toUpperCase());
        return sim > 0.7;
      });

      if (clienteMatch) {
        await client.query(
          `UPDATE crm_oportunidades SET cliente_id = $1 WHERE id = $2`,
          [clienteMatch.id, op.id]
        );
        vinculados++;
      }
    }
    console.log(`  Oportunidades vinculadas a clientes: ${vinculados}\n`);

    // ==================== 5. RESUMO FINAL ====================
    console.log('=============================================================');
    console.log('  RESUMO FINAL');
    console.log('=============================================================\n');

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM crm_vendedores WHERE ativo = true) as vendedores,
        (SELECT COUNT(*) FROM crm_clientes) as clientes,
        (SELECT COUNT(*) FROM crm_propostas) as propostas_crm,
        (SELECT COUNT(*) FROM propostas_comerciais) as propostas_com,
        (SELECT COUNT(*) FROM crm_oportunidades) as oportunidades,
        (SELECT COUNT(*) FROM crm_oportunidades WHERE titulo LIKE 'Venda %') as ops_com_venda,
        (SELECT COUNT(DISTINCT vendedor_id) FROM crm_oportunidades) as vendedores_com_ops
    `);

    const c = counts.rows[0];
    console.log(`  Vendedores ativos:       ${c.vendedores}`);
    console.log(`  Clientes:                ${c.clientes}`);
    console.log(`  propostas_comerciais:    ${c.propostas_com}`);
    console.log(`  crm_propostas:           ${c.propostas_crm}`);
    console.log(`  crm_oportunidades:       ${c.oportunidades}`);
    console.log(`  - com "Venda" no titulo: ${c.ops_com_venda}`);
    console.log(`  - vendedores com ops:    ${c.vendedores_com_ops}`);

    // Verificar Tiago especificamente
    console.log('\n--- Verificação Tiago ---');
    const tiago = await client.query(`SELECT id, nome, usuario_id, ativo FROM crm_vendedores WHERE nome ILIKE '%TIAGO%'`);
    console.log(`  Vendedores "Tiago": ${tiago.rows.length}`);
    tiago.rows.forEach(t => console.log(`    id=${t.id} nome="${t.nome}" usuario_id=${t.usuario_id} ativo=${t.ativo}`));

    if (tiago.rows.length === 1) {
      const tid = tiago.rows[0].id;
      const tOps = await client.query(`SELECT COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id = $1`, [tid]);
      const tProps = await client.query(`SELECT COUNT(*) as total FROM crm_propostas WHERE vendedor_id = $1`, [tid]);
      const tCli = await client.query(`SELECT COUNT(*) as total FROM crm_clientes WHERE vendedor_id = $1`, [tid]);
      console.log(`    Oportunidades: ${tOps.rows[0].total}`);
      console.log(`    Propostas CRM: ${tProps.rows[0].total}`);
      console.log(`    Clientes: ${tCli.rows[0].total}`);
    }

    console.log('\nLimpeza concluida!');

  } catch (error) {
    console.error('ERRO:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

// Função de similaridade simples
function calcularSimilaridade(a, b) {
  if (!a || !b) return 0;
  a = a.toUpperCase().trim();
  b = b.toUpperCase().trim();
  if (a === b) return 1;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  let matches = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matches++;
  }

  // Também verificar se um contém o outro
  if (a.includes(b) || b.includes(a)) return 0.9;

  return matches / maxLen;
}

run();
