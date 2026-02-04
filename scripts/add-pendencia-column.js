const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumn() {
  console.log('=== Adicionando coluna tem_pendencia_formulario ===\n');

  try {
    // Verificar se a coluna já existe
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'registros_atividades' AND column_name = 'tem_pendencia_formulario'
    `);

    if (checkResult.rows.length > 0) {
      console.log('Coluna tem_pendencia_formulario já existe!');
    } else {
      // Adicionar a coluna
      await pool.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN tem_pendencia_formulario BOOLEAN DEFAULT FALSE
      `);
      console.log('Coluna tem_pendencia_formulario adicionada com sucesso!');
    }

    // Atualizar atividades existentes que têm formulário com pendência
    const updateResult = await pool.query(`
      UPDATE registros_atividades ra
      SET tem_pendencia_formulario = true
      FROM formularios_preenchidos fp
      WHERE ra.id = fp.atividade_id
        AND fp.tipo_formulario = 'LIBERACAO_COMERCIAL'
        AND (fp.dados_formulario->>'todos_criterios_atendidos')::text = 'Não'
    `);

    console.log('Atividades atualizadas: ' + updateResult.rowCount);

  } catch (error) {
    console.error('Erro:', error.message);
  }

  await pool.end();
}

addColumn().catch(console.error);
