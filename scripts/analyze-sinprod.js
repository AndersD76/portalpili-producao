require('dotenv').config({ path: '.env.local' });
const Firebird = require('node-firebird');

const options = {
  host: process.env.FIREBIRD_HOST || '192.168.1.8',
  port: parseInt(process.env.FIREBIRD_PORT || '3050'),
  database: process.env.FIREBIRD_DATABASE || 'c:/SINPROD WINDOWS/DADOS/INDUSTRIAL.FDB',
  user: process.env.FIREBIRD_USER || 'PILI_MAQ',
  password: process.env.FIREBIRD_PASSWORD || 'masterkey',
  lowercase_keys: false,
  role: undefined,
  pageSize: 4096
};

console.log('Configuração de conexão:');
console.log('Host:', options.host);
console.log('Database:', options.database);
console.log('User:', options.user);
console.log('');

Firebird.attach(options, async (err, db) => {
  if (err) {
    console.error('Erro ao conectar:', err.message);
    return;
  }

  console.log('Conectado ao SINPROD com sucesso!\n');

  // Listar todas as tabelas
  const sqlTables = `
    SELECT RDB$RELATION_NAME as TABLE_NAME
    FROM RDB$RELATIONS
    WHERE RDB$SYSTEM_FLAG = 0
    AND RDB$VIEW_BLR IS NULL
    ORDER BY RDB$RELATION_NAME
  `;

  db.query(sqlTables, [], (err, tables) => {
    if (err) {
      console.error('Erro ao listar tabelas:', err.message);
      db.detach();
      return;
    }

    console.log('=== TABELAS ENCONTRADAS ===\n');
    tables.forEach((t, i) => {
      const name = t.TABLE_NAME.trim();
      console.log(`${i + 1}. ${name}`);
    });

    console.log('\n=== BUSCANDO TABELAS RELACIONADAS A OPD/ORDEM DE PRODUÇÃO ===\n');

    // Procurar por tabelas relacionadas a OPD
    const opdRelated = tables.filter(t => {
      const name = t.TABLE_NAME.trim().toUpperCase();
      return name.includes('OPD') ||
             name.includes('ORDEM') ||
             name.includes('PRODUCAO') ||
             name.includes('PRODUTO') ||
             name.includes('CLIENTE') ||
             name.includes('PEDIDO') ||
             name.includes('OPERACAO') ||
             name.includes('ETAPA') ||
             name.includes('ATIVIDADE');
    });

    opdRelated.forEach(t => {
      const tableName = t.TABLE_NAME.trim();
      console.log(`\n--- Estrutura de ${tableName} ---`);

      // Buscar colunas de cada tabela relevante
      const sqlColumns = `
        SELECT
          RF.RDB$FIELD_NAME as COLUMN_NAME,
          F.RDB$FIELD_TYPE as FIELD_TYPE,
          F.RDB$FIELD_LENGTH as FIELD_LENGTH
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE RF.RDB$RELATION_NAME = '${tableName}'
        ORDER BY RF.RDB$FIELD_POSITION
      `;

      db.query(sqlColumns, [], (err, columns) => {
        if (err) {
          console.error(`Erro ao buscar colunas de ${tableName}:`, err.message);
          return;
        }

        columns.forEach(col => {
          const colName = col.COLUMN_NAME.trim();
          const type = getTypeName(col.FIELD_TYPE);
          console.log(`  - ${colName} (${type})`);
        });

        // Buscar alguns registros de exemplo
        const sqlSample = `SELECT FIRST 3 * FROM ${tableName}`;
        db.query(sqlSample, [], (err, samples) => {
          if (!err && samples && samples.length > 0) {
            console.log(`  [${samples.length} registros de exemplo]`);
            // Mostrar primeiro registro como exemplo
            const first = samples[0];
            Object.keys(first).forEach(key => {
              const val = first[key];
              if (val !== null && val !== undefined) {
                const displayVal = typeof val === 'string' ? val.substring(0, 50) : val;
                console.log(`    ${key}: ${displayVal}`);
              }
            });
          }
        });
      });
    });

    // Aguardar um pouco para as queries assíncronas
    setTimeout(() => {
      console.log('\n=== ANÁLISE COMPLETA ===');
      db.detach();
    }, 5000);
  });
});

function getTypeName(typeCode) {
  const types = {
    7: 'SMALLINT',
    8: 'INTEGER',
    10: 'FLOAT',
    12: 'DATE',
    13: 'TIME',
    14: 'CHAR',
    16: 'BIGINT',
    27: 'DOUBLE',
    35: 'TIMESTAMP',
    37: 'VARCHAR',
    261: 'BLOB'
  };
  return types[typeCode] || `TYPE_${typeCode}`;
}
