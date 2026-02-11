// Script para criar contas de usuário para vendedores sem conta e vincular
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Gerar id_funcionario a partir do nome (ex: "João Ricardo" -> "joao.ricardo")
// Usa primeiro e último nome se o resultado ficar > 20 chars
function gerarIdFuncionario(nome) {
  const normalizado = nome
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  const partes = normalizado.split(/\s+/);
  let id = partes.join('.');

  // Se passar de 20 chars, usar primeiro.ultimo
  if (id.length > 20 && partes.length > 1) {
    id = partes[0] + '.' + partes[partes.length - 1];
  }

  // Se ainda passar, truncar
  return id.substring(0, 20);
}

// Gerar email a partir do nome
function gerarEmail(nome) {
  const id = gerarIdFuncionario(nome);
  return `${id}@pili.ind.br`;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Criando contas para vendedores sem usuario ===\n');

    // Vendedores sem usuario_id
    const vendedores = await client.query(
      `SELECT id, nome FROM crm_vendedores WHERE usuario_id IS NULL AND ativo = true ORDER BY nome`
    );

    console.log('Vendedores sem conta:', vendedores.rows.length, '\n');

    // Senha padrão: Pili@2025
    const senhaHash = await bcrypt.hash('Pili@2025', 10);
    let criados = 0;

    for (const v of vendedores.rows) {
      const idFunc = gerarIdFuncionario(v.nome);
      const email = gerarEmail(v.nome);

      // Verificar se já existe usuario com esse id_funcionario ou email
      const existe = await client.query(
        `SELECT id FROM usuarios WHERE id_funcionario = $1 OR email = $2`,
        [idFunc, email]
      );

      if (existe.rows.length > 0) {
        // Vincular ao vendedor existente
        await client.query('UPDATE crm_vendedores SET usuario_id = $1 WHERE id = $2', [existe.rows[0].id, v.id]);
        console.log(`  Vinculado existente: ${v.nome} -> usuario ${existe.rows[0].id}`);
        criados++;
        continue;
      }

      // Criar novo usuario
      const result = await client.query(
        `INSERT INTO usuarios (nome, email, id_funcionario, senha_hash, password, role, cargo, departamento, ativo, active, is_admin, is_vendedor)
         VALUES ($1, $2, $3, $4, $4, 'operador', $5, $6, true, true, false, true)
         RETURNING id`,
        [v.nome, email, idFunc, senhaHash, 'Vendedor', 'COMERCIAL']
      );

      const novoUsuarioId = result.rows[0].id;

      // Vincular vendedor ao usuario
      await client.query('UPDATE crm_vendedores SET usuario_id = $1 WHERE id = $2', [novoUsuarioId, v.id]);

      console.log(`  Criado: ${v.nome} | Login: ${idFunc} | Email: ${email} | Usuario ID: ${novoUsuarioId}`);
      criados++;
    }

    console.log(`\nTotal criados/vinculados: ${criados}`);

    // Resumo final
    const resumo = await client.query(
      `SELECT COUNT(*) as total, COUNT(usuario_id) as vinculados FROM crm_vendedores WHERE ativo = true`
    );
    console.log('\n=== Resumo Final ===');
    console.log('  Total vendedores ativos:', resumo.rows[0].total);
    console.log('  Vinculados a usuarios:', resumo.rows[0].vinculados);
    console.log('\n  Senha padrão para novos: Pili@2025');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
