require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixDatabaseSchema() {
  const client = await pool.connect();

  try {
    console.log('🔧 Iniciando correção do schema do banco de dados...\n');

    // Iniciar transação
    await client.query('BEGIN');

    // 1. Ajustar tabela OPDs - adicionar SERIAL se necessário
    console.log('1️⃣ Verificando tabela OPDs...');

    // Verificar se id já é SERIAL
    const opdIdCheck = await client.query(`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'opds' AND column_name = 'id'
    `);

    if (!opdIdCheck.rows[0]?.column_default?.includes('nextval')) {
      console.log('   → Convertendo id para SERIAL...');
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS opds_id_seq;
        SELECT setval('opds_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM opds;
        ALTER TABLE opds ALTER COLUMN id SET DEFAULT nextval('opds_id_seq');
        ALTER SEQUENCE opds_id_seq OWNED BY opds.id;
      `);
      console.log('   ✅ ID convertido para SERIAL');
    } else {
      console.log('   ✅ ID já está configurado como SERIAL');
    }

    // Garantir que numero é único
    const opdUniqueCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'opds' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%numero%'
    `);

    if (opdUniqueCheck.rowCount === 0) {
      console.log('   → Adicionando constraint UNIQUE em numero...');
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS opds_numero_unique ON opds(numero);');
      console.log('   ✅ Constraint UNIQUE adicionada');
    } else {
      console.log('   ✅ Constraint UNIQUE já existe');
    }

    // 2. Ajustar tabela registros_atividades
    console.log('\n2️⃣ Verificando tabela registros_atividades...');

    // Verificar se id já é SERIAL
    const atividadeIdCheck = await client.query(`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'registros_atividades' AND column_name = 'id'
    `);

    if (!atividadeIdCheck.rows[0]?.column_default?.includes('nextval')) {
      console.log('   → Convertendo id para SERIAL...');
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS registros_atividades_id_seq;
        SELECT setval('registros_atividades_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM registros_atividades;
        ALTER TABLE registros_atividades ALTER COLUMN id SET DEFAULT nextval('registros_atividades_id_seq');
        ALTER SEQUENCE registros_atividades_id_seq OWNED BY registros_atividades.id;
      `);
      console.log('   ✅ ID convertido para SERIAL');
    } else {
      console.log('   ✅ ID já está configurado como SERIAL');
    }

    // Adicionar campos que faltam
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'registros_atividades'
    `);

    const existingColumns = columns.rows.map(row => row.column_name);

    if (!existingColumns.includes('dias')) {
      console.log('   → Adicionando coluna dias...');
      await client.query('ALTER TABLE registros_atividades ADD COLUMN dias INTEGER;');
      console.log('   ✅ Coluna dias adicionada');
    } else {
      console.log('   ✅ Coluna dias já existe');
    }

    if (!existingColumns.includes('formulario_anexo')) {
      console.log('   → Adicionando coluna formulario_anexo...');
      await client.query('ALTER TABLE registros_atividades ADD COLUMN formulario_anexo JSONB;');
      console.log('   ✅ Coluna formulario_anexo adicionada');
    } else {
      console.log('   ✅ Coluna formulario_anexo já existe');
    }

    // 3. Criar constraint de Foreign Key
    console.log('\n3️⃣ Verificando Foreign Key...');

    const fkCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'registros_atividades'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%numero_opd%'
    `);

    if (fkCheck.rowCount === 0) {
      console.log('   → Criando Foreign Key entre registros_atividades.numero_opd e opds.numero...');
      await client.query(`
        ALTER TABLE registros_atividades
        ADD CONSTRAINT fk_atividades_opd
        FOREIGN KEY (numero_opd)
        REFERENCES opds(numero)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
      `);
      console.log('   ✅ Foreign Key criada com sucesso');
    } else {
      console.log('   ✅ Foreign Key já existe');
    }

    // 4. Criar índices adicionais
    console.log('\n4️⃣ Criando índices adicionais...');

    await client.query('CREATE INDEX IF NOT EXISTS idx_atividades_status ON registros_atividades(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_atividades_data_inicio ON registros_atividades(data_inicio);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_atividades_data_termino ON registros_atividades(data_termino);');

    console.log('   ✅ Índices criados com sucesso');

    // Commit da transação
    await client.query('COMMIT');

    console.log('\n✅ Schema do banco de dados corrigido com sucesso!\n');

    // Mostrar estrutura final
    console.log('📊 Estrutura Final:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Tabela: opds');
    console.log('   • id (SERIAL PRIMARY KEY)');
    console.log('   • numero (VARCHAR UNIQUE)');
    console.log('   • Outros campos...');
    console.log('');
    console.log('📋 Tabela: registros_atividades');
    console.log('   • id (SERIAL PRIMARY KEY)');
    console.log('   • numero_opd (VARCHAR) → FK para opds.numero');
    console.log('   • atividade, responsavel, status...');
    console.log('   • dias (INTEGER)');
    console.log('   • formulario_anexo (JSONB)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao corrigir schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabaseSchema();
