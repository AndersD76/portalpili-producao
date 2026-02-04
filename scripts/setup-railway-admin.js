const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database URL do Railway/Neon
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupAdmin() {
  const client = await pool.connect();

  try {
    console.log('Conectando ao banco de dados...');

    // Verificar se as colunas existem
    console.log('Verificando estrutura da tabela usuarios...');

    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
    `);

    const columns = columnsResult.rows.map(r => r.column_name);
    console.log('Colunas existentes:', columns.join(', '));

    // Adicionar colunas se não existirem
    if (!columns.includes('id_funcionario')) {
      console.log('Adicionando coluna id_funcionario...');
      await client.query('ALTER TABLE usuarios ADD COLUMN id_funcionario VARCHAR(50)');
    }

    if (!columns.includes('senha_hash')) {
      console.log('Adicionando coluna senha_hash...');
      await client.query('ALTER TABLE usuarios ADD COLUMN senha_hash VARCHAR(255)');
    }

    // Gerar hash da senha
    const senha = '123456789';
    const senhaHash = await bcrypt.hash(senha, 10);
    console.log('Hash gerado para senha 123456789');

    // Verificar se usuário admin existe
    const existingUser = await client.query(
      "SELECT id FROM usuarios WHERE id_funcionario = '100' OR email = 'admin@pili.com.br'"
    );

    if (existingUser.rows.length > 0) {
      // Atualizar usuário existente
      console.log('Atualizando usuário existente...');
      await client.query(`
        UPDATE usuarios
        SET id_funcionario = '100',
            senha_hash = $1,
            nome = 'Administrador',
            role = 'admin',
            ativo = true
        WHERE id_funcionario = '100' OR email = 'admin@pili.com.br'
      `, [senhaHash]);
      console.log('Usuário admin atualizado!');
    } else {
      // Criar novo usuário
      console.log('Criando novo usuário admin...');
      await client.query(`
        INSERT INTO usuarios (nome, email, id_funcionario, senha_hash, cargo, role, ativo)
        VALUES ('Administrador', 'admin@pili.com.br', '100', $1, 'Administrador', 'admin', true)
      `, [senhaHash]);
      console.log('Usuário admin criado!');
    }

    // Verificar resultado
    const result = await client.query(
      "SELECT id, nome, email, id_funcionario, role, ativo FROM usuarios WHERE id_funcionario = '100'"
    );

    console.log('\n=== Usuário Admin ===');
    console.log(result.rows[0]);
    console.log('\nCredenciais:');
    console.log('  ID Funcionário: 100');
    console.log('  Senha: 123456789');
    console.log('\nPronto! Você pode fazer login agora.');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAdmin();
