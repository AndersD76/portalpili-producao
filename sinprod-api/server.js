/**
 * SinProd API Intermediária
 *
 * Roda na rede local da fábrica, conecta no Firebird do SinProd
 * e expõe os dados via REST para o Portal Pili (Railway).
 *
 * Uso: npm start (na máquina local com acesso ao Firebird)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Firebird = require('node-firebird');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// Configuração Firebird
// ============================================

const fbOptions = {
  host: process.env.FIREBIRD_HOST || '192.168.1.8',
  port: parseInt(process.env.FIREBIRD_PORT || '3050'),
  database: process.env.FIREBIRD_DATABASE || 'c:/SINPROD WINDOWS/DADOS/INDUSTRIAL.FDB',
  user: process.env.FIREBIRD_USER || 'PILI_MAQ',
  password: process.env.FIREBIRD_PASSWORD || 'masterkey',
  lowercase_keys: false,
  role: undefined,
  pageSize: 4096,
};

const API_KEY = process.env.API_KEY || 'pili-sinprod-2026';

// ============================================
// Middleware de autenticação
// ============================================

function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== API_KEY) {
    return res.status(401).json({ success: false, error: 'API key inválida' });
  }
  next();
}

app.use('/api', authMiddleware);

// ============================================
// Helper: executar query no Firebird
// ============================================

function fbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    Firebird.attach(fbOptions, (err, db) => {
      if (err) return reject(err);

      db.query(sql, params, (err, rows) => {
        db.detach();
        if (err) return reject(err);
        // Trim string values
        const cleaned = (rows || []).map(row => {
          const obj = {};
          for (const key of Object.keys(row)) {
            const val = row[key];
            obj[key.trim()] = typeof val === 'string' ? val.trim() : val;
          }
          return obj;
        });
        resolve(cleaned);
      });
    });
  });
}

// ============================================
// Rotas
// ============================================

// Health check (sem auth)
app.get('/health', async (req, res) => {
  try {
    await fbQuery('SELECT FIRST 1 1 FROM RDB$DATABASE');
    res.json({ status: 'ok', firebird: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', firebird: err.message });
  }
});

// GET /api/tabelas — Listar tabelas do SinProd (para descoberta)
app.get('/api/tabelas', async (req, res) => {
  try {
    const tables = await fbQuery(`
      SELECT RDB$RELATION_NAME as TABLE_NAME
      FROM RDB$RELATIONS
      WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL
      ORDER BY RDB$RELATION_NAME
    `);
    res.json({ success: true, data: tables.map(t => t.TABLE_NAME) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tabela/:nome — Ver estrutura e amostra de uma tabela
app.get('/api/tabela/:nome', async (req, res) => {
  const tableName = req.params.nome.toUpperCase();
  try {
    const columns = await fbQuery(`
      SELECT
        RF.RDB$FIELD_NAME as COLUMN_NAME,
        F.RDB$FIELD_TYPE as FIELD_TYPE,
        F.RDB$FIELD_LENGTH as FIELD_LENGTH
      FROM RDB$RELATION_FIELDS RF
      JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
      WHERE RF.RDB$RELATION_NAME = '${tableName}'
      ORDER BY RF.RDB$FIELD_POSITION
    `);

    const sample = await fbQuery(`SELECT FIRST 5 * FROM ${tableName}`);
    const count = await fbQuery(`SELECT COUNT(*) as TOTAL FROM ${tableName}`);

    res.json({
      success: true,
      table: tableName,
      total_rows: count[0]?.TOTAL || 0,
      columns: columns.map(c => ({
        name: c.COLUMN_NAME,
        type: getTypeName(c.FIELD_TYPE),
      })),
      sample,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/opds — Todas as OPDs do SinProd
app.get('/api/opds', async (req, res) => {
  try {
    // Tentar as queries mais comuns do SinProd
    // Ajuste o SQL conforme a estrutura real do seu banco
    let rows;
    try {
      // Tentativa 1: tabela OPD padrão
      rows = await fbQuery(`
        SELECT
          o.NUMERO,
          o.CLIENTE,
          o.CNPJ_CLIENTE,
          o.PRODUTO,
          o.CODIGO_PRODUTO,
          o.DATA_EMISSAO,
          o.DATA_ENTREGA,
          o.STATUS,
          o.OBSERVACAO
        FROM OPD o
        ORDER BY o.NUMERO DESC
      `);
    } catch {
      try {
        // Tentativa 2: tabela ORDEM_PRODUCAO
        rows = await fbQuery(`
          SELECT
            op.NUMERO,
            op.CLIENTE,
            op.PRODUTO,
            op.DATA_EMISSAO,
            op.DATA_ENTREGA,
            op.STATUS
          FROM ORDEM_PRODUCAO op
          ORDER BY op.NUMERO DESC
        `);
      } catch {
        // Tentativa 3: listar tabelas para debug
        const tables = await fbQuery(`
          SELECT RDB$RELATION_NAME as TABLE_NAME
          FROM RDB$RELATIONS
          WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL
          ORDER BY RDB$RELATION_NAME
        `);
        return res.json({
          success: false,
          error: 'Tabela OPD/ORDEM_PRODUCAO não encontrada. Rode GET /api/tabelas para ver as tabelas disponíveis.',
          tabelas_disponiveis: tables.map(t => t.TABLE_NAME),
        });
      }
    }

    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/opds/:numero — OPD específica
app.get('/api/opds/:numero', async (req, res) => {
  try {
    const rows = await fbQuery(
      `SELECT * FROM OPD WHERE NUMERO = ?`,
      [req.params.numero]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'OPD não encontrada' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/query — Executar query customizada (somente SELECT)
app.post('/api/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
    return res.status(400).json({ success: false, error: 'Apenas SELECT é permitido' });
  }
  try {
    const rows = await fbQuery(sql);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Helper
// ============================================

function getTypeName(typeCode) {
  const types = {
    7: 'SMALLINT', 8: 'INTEGER', 10: 'FLOAT', 12: 'DATE',
    13: 'TIME', 14: 'CHAR', 16: 'BIGINT', 27: 'DOUBLE',
    35: 'TIMESTAMP', 37: 'VARCHAR', 261: 'BLOB',
  };
  return types[typeCode] || `TYPE_${typeCode}`;
}

// ============================================
// Start
// ============================================

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  SinProd API - Portal Pili`);
  console.log(`  http://0.0.0.0:${PORT}`);
  console.log(`  Firebird: ${fbOptions.host}:${fbOptions.port}`);
  console.log(`========================================\n`);
});
