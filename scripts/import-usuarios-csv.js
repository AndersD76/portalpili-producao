require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Caminho para o arquivo CSV - coloque o arquivo na pasta raiz do projeto
const CSV_FILE = process.argv[2] || 'usuarios.csv';

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'sim' || str === 'yes';
}

function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

// Parser CSV simples que lida com colunas duplicadas
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Criar objeto com índices numéricos para colunas duplicadas
    const row = {};
    headers.forEach((header, idx) => {
      row[`col_${idx}`] = values[idx] || '';
      // Também manter pelo nome original (última ocorrência ganha)
      row[header.trim()] = values[idx] || '';
    });

    results.push(row);
  }

  return results;
}

async function importUsuarios() {
  console.log(`\n=== Importação de Usuários ===`);
  console.log(`Arquivo: ${CSV_FILE}\n`);

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ Arquivo não encontrado: ${CSV_FILE}`);
    console.log('\nPor favor, coloque o arquivo CSV na pasta raiz do projeto ou passe o caminho como argumento:');
    console.log('  node scripts/import-usuarios-csv.js "C:\\caminho\\para\\Users.csv"\n');
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const results = parseCSV(content);

  console.log(`Total de registros no CSV: ${results.length}\n`);

  if (results.length === 0) {
    console.log('❌ Nenhum registro encontrado no CSV');
    await pool.end();
    return;
  }

  // Estrutura do CSV (baseado nas colunas encontradas):
  // col_0: ID (primary key)
  // col_1: Full Name (nome)
  // col_2: ID (id_funcionario - usado para login)
  // col_3: Password (bcrypt hash)
  // col_4: Username
  // col_5: Admin (TRUE/FALSE)
  // col_6: Relação de trabalho
  // col_7-10: Cadastros
  // col_11: INTERNO
  // col_12: EXTERNO
  // col_13: CLIENTE
  // col_14: Created
  // col_15: Updated

  console.log('Amostra do primeiro registro:');
  const firstRow = results[0];
  console.log(`  ID (PK): ${firstRow.col_0}`);
  console.log(`  Nome: ${firstRow.col_1}`);
  console.log(`  ID Funcionario: ${firstRow.col_2}`);
  console.log(`  Senha Hash: ${firstRow.col_3 ? firstRow.col_3.substring(0, 30) + '...' : 'N/A'}`);
  console.log(`  Admin: ${firstRow.col_5}`);
  console.log(`  Tipo: ${firstRow.col_6}`);
  console.log(`  INTERNO: ${firstRow.col_11}, EXTERNO: ${firstRow.col_12}, CLIENTE: ${firstRow.col_13}`);
  console.log('');

  try {
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const row of results) {
      try {
        // Mapeamento baseado na estrutura do CSV
        const id = parseInt(row.col_0) || null;
        const nome = (row.col_1 || '').trim();
        const idFuncionario = (row.col_2 || '').trim();
        const senhaHash = row.col_3 || null;
        const isAdmin = parseBoolean(row.col_5);
        const tipoRelacao = (row.col_6 || '').trim();
        const departamento = (row.col_7 || '').trim() || null;
        const isInterno = parseBoolean(row.col_11);
        const isExterno = parseBoolean(row.col_12);
        const isCliente = parseBoolean(row.col_13);
        const createdAt = parseDate(row.col_14);

        // Gerar email se não existir
        const email = `user${id}@pili.com.br`;

        // Determinar ativo baseado em qualquer flag
        const ativo = isInterno || isExterno || isCliente || !tipoRelacao;

        // Determinar role baseado em flags e tipo
        let role = 'user';
        if (isAdmin) {
          role = 'admin';
        } else if (isCliente || tipoRelacao === 'CLIENTE') {
          role = 'client';
        } else if (isExterno || tipoRelacao === 'EXTERNO') {
          role = 'external';
        } else {
          role = 'user';
        }

        // Cargo baseado no tipo de relação
        const cargo = tipoRelacao || null;

        if (!nome || !idFuncionario) {
          console.log(`⏭️  Ignorando registro sem nome ou id_funcionario: ID ${id}`);
          continue;
        }

        // Verificar se usuário já existe pelo id_funcionario
        const existing = await pool.query(
          'SELECT id FROM usuarios WHERE id_funcionario = $1',
          [idFuncionario]
        );

        if (existing.rowCount > 0) {
          // Atualizar usuário existente
          await pool.query(`
            UPDATE usuarios SET
              nome = $1,
              senha_hash = COALESCE($2, senha_hash),
              password = COALESCE($2, password),
              is_admin = $3,
              cargo = COALESCE($4, cargo),
              departamento = COALESCE($5, departamento),
              role = $6,
              ativo = $7,
              active = $7
            WHERE id_funcionario = $8
          `, [
            nome,
            senhaHash,
            isAdmin,
            cargo,
            departamento,
            role,
            ativo,
            idFuncionario
          ]);
          updated++;
          if (updated <= 10 || updated % 20 === 0) {
            console.log(`📝 Atualizado: ${nome} (ID: ${idFuncionario})`);
          }
        } else {
          // Verificar se ID já existe
          const idExists = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);
          const newId = idExists.rowCount > 0 ? null : id;

          // Inserir novo usuário
          await pool.query(`
            INSERT INTO usuarios (
              ${newId ? 'id, ' : ''}nome, email, password, senha_hash, id_funcionario,
              role, is_admin, cargo, departamento, ativo, active, created_at
            ) VALUES (
              ${newId ? '$1, ' : ''}$${newId ? 2 : 1}, $${newId ? 3 : 2}, $${newId ? 4 : 3}, $${newId ? 4 : 3}, $${newId ? 5 : 4}, $${newId ? 6 : 5}, $${newId ? 7 : 6}, $${newId ? 8 : 7}, $${newId ? 9 : 8}, $${newId ? 10 : 9}, $${newId ? 10 : 9}, COALESCE($${newId ? 11 : 10}, NOW())
            )
          `, newId ? [
            newId,
            nome,
            email,
            senhaHash,
            idFuncionario,
            role,
            isAdmin,
            cargo,
            departamento,
            ativo,
            createdAt
          ] : [
            nome,
            email,
            senhaHash,
            idFuncionario,
            role,
            isAdmin,
            cargo,
            departamento,
            ativo,
            createdAt
          ]);
          imported++;
          if (imported <= 10 || imported % 20 === 0) {
            console.log(`✅ Importado: ${nome} (ID Func: ${idFuncionario})`);
          }
        }
      } catch (error) {
        errors++;
        const nome = row.col_1 || row.col_0 || 'desconhecido';
        console.error(`❌ Erro ao processar ${nome}:`, error.message);
      }
    }

    console.log(`\n========================================`);
    console.log(`✅ Importação concluída!`);
    console.log(`   - Novos usuários: ${imported}`);
    console.log(`   - Atualizados: ${updated}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`========================================\n`);

    // Verificar total de usuários
    const total = await pool.query('SELECT COUNT(*) FROM usuarios');
    console.log(`Total de usuários no banco: ${total.rows[0].count}`);

  } catch (error) {
    console.error('Erro durante a importação:', error);
  } finally {
    await pool.end();
  }
}

importUsuarios().catch(console.error);
