require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixDateTimeTracking() {
  const client = await pool.connect();

  try {
    console.log('Iniciando correção do rastreamento de data/hora...\\n');

    await client.query('BEGIN');

    // 1. Alterar data_inicio e data_termino de DATE para TIMESTAMP
    console.log('1. Convertendo data_inicio e data_termino para TIMESTAMP...');
    await client.query(`
      ALTER TABLE registros_atividades
      ALTER COLUMN data_inicio TYPE TIMESTAMP USING data_inicio::TIMESTAMP,
      ALTER COLUMN data_termino TYPE TIMESTAMP USING data_termino::TIMESTAMP;
    `);
    console.log('   ✓ Colunas convertidas com sucesso!\\n');

    // 2. Criar função para calcular dias automaticamente
    console.log('2. Criando função para calcular duração em dias...');
    await client.query(`
      CREATE OR REPLACE FUNCTION calcular_dias_atividade()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Calcular dias apenas quando ambas as datas estão definidas
        IF NEW.data_inicio IS NOT NULL AND NEW.data_termino IS NOT NULL THEN
          -- Calcular diferença em dias (com casas decimais)
          -- EXTRACT(EPOCH FROM ...) retorna segundos, dividimos por 86400 para obter dias
          NEW.dias = CEIL(EXTRACT(EPOCH FROM (NEW.data_termino - NEW.data_inicio)) / 86400.0);

          -- Garantir que dias seja pelo menos 1 se houver diferença de tempo
          IF NEW.dias < 1 AND NEW.data_termino > NEW.data_inicio THEN
            NEW.dias = 1;
          END IF;
        ELSE
          -- Se uma das datas estiver NULL, limpar o campo dias
          NEW.dias = NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Função criada com sucesso!\\n');

    // 3. Criar trigger para chamar a função
    console.log('3. Criando trigger para cálculo automático...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_calcular_dias ON registros_atividades;
    `);
    await client.query(`
      CREATE TRIGGER trigger_calcular_dias
      BEFORE INSERT OR UPDATE ON registros_atividades
      FOR EACH ROW
      EXECUTE FUNCTION calcular_dias_atividade();
    `);
    console.log('   ✓ Trigger criado com sucesso!\\n');

    // 4. Recalcular dias para registros existentes que já tem data_inicio e data_termino
    console.log('4. Recalculando dias para atividades existentes...');
    const updateResult = await client.query(`
      UPDATE registros_atividades
      SET updated = updated  -- Trigger will recalculate dias
      WHERE data_inicio IS NOT NULL AND data_termino IS NOT NULL;
    `);
    console.log(`   ✓ ${updateResult.rowCount} registros recalculados\\n`);

    await client.query('COMMIT');

    console.log('========================================');
    console.log('Correção concluída com sucesso!');
    console.log('========================================\\n');
    console.log('Alterações realizadas:');
    console.log('  • data_inicio: DATE → TIMESTAMP');
    console.log('  • data_termino: DATE → TIMESTAMP');
    console.log('  • Trigger automático para calcular dias');
    console.log('  • Recálculo de atividades existentes\\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro durante a correção:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDateTimeTracking();
