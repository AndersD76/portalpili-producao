// Script para importar todos os usuários do CSV para o banco
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importarUsuarios() {
  const client = await pool.connect();

  try {
    console.log('=== IMPORTANDO USUÁRIOS DO CSV ===\n');

    // Ler CSV
    const csvPath = path.join(__dirname, '..', 'usuarios.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Pular header
    const dataLines = lines.slice(1);
    console.log('Total de linhas no CSV:', dataLines.length);

    let importados = 0;
    let atualizados = 0;
    let erros = 0;

    for (const line of dataLines) {
      try {
        // Parse CSV (campos podem ter vírgulas dentro de aspas)
        const campos = line.split(',');

        // ID,Full Name,ID(funcionario),Password,Username,Admin,...
        const id = campos[0]?.trim();
        const nome = campos[1]?.trim();
        const idFuncionario = campos[2]?.trim();
        const senhaHash = campos[3]?.trim();
        const username = campos[4]?.trim();
        const isAdmin = campos[5]?.trim()?.toUpperCase() === 'TRUE';
        const relacaoTrabalho = campos[6]?.trim(); // INTERNO, EXTERNO, CLIENTE
        const cadastroProcesso = campos[7]?.trim(); // COMERCIAL, QUALIDADE, etc

        if (!nome || !idFuncionario) {
          continue;
        }

        // Verificar se já existe
        const existe = await client.query(
          'SELECT id FROM usuarios WHERE id_funcionario = $1',
          [idFuncionario]
        );

        if (existe.rows.length > 0) {
          // Atualizar
          await client.query(`
            UPDATE usuarios SET
              nome = $1,
              senha_hash = $2,
              password = $2,
              is_admin = $3,
              ativo = true,
              active = true
            WHERE id_funcionario = $4
          `, [nome, senhaHash, isAdmin, idFuncionario]);
          atualizados++;
        } else {
          // Inserir
          await client.query(`
            INSERT INTO usuarios (
              nome, email, password, role, id_funcionario, senha_hash,
              ativo, active, is_admin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            nome,
            `user${idFuncionario}@pili.ind.br`,
            senhaHash,
            isAdmin ? 'admin' : 'operador',
            idFuncionario,
            senhaHash,
            true,
            true,
            isAdmin
          ]);
          importados++;
        }

      } catch (err) {
        erros++;
        // Ignorar erros individuais
      }
    }

    console.log('\n=== RESULTADO ===');
    console.log('Importados:', importados);
    console.log('Atualizados:', atualizados);
    console.log('Erros:', erros);

    // Verificar total
    const total = await client.query('SELECT COUNT(*) as total FROM usuarios');
    console.log('\nTotal de usuários no banco agora:', total.rows[0].total);

    // Verificar Daniel Anders
    const daniel = await client.query(
      "SELECT id, nome, id_funcionario, ativo, is_admin FROM usuarios WHERE id_funcionario = '100'"
    );
    if (daniel.rows.length > 0) {
      console.log('\nDANIEL ANDERS:', daniel.rows[0]);
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importarUsuarios();
