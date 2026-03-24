/**
 * SinProd → NeonDB Direct Sync
 *
 * Roda na máquina local com acesso ao Firebird do SinProd.
 * Lê dados do Firebird e escreve direto no NeonDB (PostgreSQL).
 * Sem ngrok, sem API intermediária, sem tunnel.
 *
 * Uso:
 *   node sync.js              → sync completo (OPDs + produção)
 *   node sync.js --opds       → sync apenas OPDs
 *   node sync.js --producao   → sync apenas dados de produção
 *   node sync.js --loop 5     → rodar a cada 5 minutos
 *
 * Instalar dependências:
 *   cd sinprod-sync && npm install
 *
 * Configurar .env com credenciais do Firebird e NeonDB
 */

require('dotenv').config();
const Firebird = require('node-firebird');
const { Pool } = require('pg');

// ============================================
// Configuração
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

const pgPool = new Pool({
  connectionString: process.env.NEONDB_URL,
  ssl: { rejectUnauthorized: false },
});

const SYNC_INTERVAL_MIN = parseInt(process.argv.find(a => a.match(/^\d+$/)) || process.env.SYNC_INTERVAL || '5');

// ============================================
// Helpers
// ============================================

function log(level, msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = { info: '✓', warn: '⚠', error: '✗', sync: '↻' }[level] || '·';
  console.log(`[${ts}] ${prefix} ${msg}`);
}

function fbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    Firebird.attach(fbOptions, (err, db) => {
      if (err) return reject(new Error(`Firebird connect: ${err.message}`));
      db.query(sql, params, (err, rows) => {
        db.detach();
        if (err) return reject(new Error(`Firebird query: ${err.message}`));
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
// Sync OPDs
// ============================================

async function syncOPDs() {
  log('sync', 'Sincronizando OPDs...');

  let opds;
  try {
    opds = await fbQuery(`
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
      opds = await fbQuery(`
        SELECT o.NUMOPD as NUMERO, o.STATUS, o.COD_CLIENTE as CLIENTE,
          o.DATA_FINAL_PREV as DATA_ENTREGA, o.DATA_INICIO as DATA_EMISSAO
        FROM CADOPD o ORDER BY o.NUMOPD DESC
      `);
    } catch (err) {
      log('error', `Falha ao ler OPDs do Firebird: ${err.message}`);
      return { updated: 0, created: 0, errors: 1 };
    }
  }

  log('info', `${opds.length} OPDs encontradas no SinProd`);

  const client = await pgPool.connect();
  let updated = 0, created = 0, errors = 0;

  try {
    await client.query('BEGIN');

    for (const opd of opds) {
      try {
        const existing = await client.query(
          'SELECT id FROM opds WHERE numero = $1',
          [String(opd.NUMERO)]
        );

        if (existing.rows.length > 0) {
          await client.query(`
            UPDATE opds SET
              cliente = COALESCE($1, cliente),
              data_termino = COALESCE($2, data_termino),
              sinprod_status = $3,
              sinprod_sync = NOW(),
              updated = NOW()
            WHERE numero = $4
          `, [
            opd.CLIENTE || null,
            opd.DATA_ENTREGA || null,
            opd.STATUS || null,
            String(opd.NUMERO)
          ]);
          updated++;
        } else {
          await client.query(`
            INSERT INTO opds (
              numero, cliente, data_inicio, data_termino, status,
              sinprod_status, sinprod_sync, created, updated
            ) VALUES ($1, $2, $3, $4, 'PENDENTE', $5, NOW(), NOW(), NOW())
          `, [
            String(opd.NUMERO),
            opd.CLIENTE || null,
            opd.DATA_EMISSAO || null,
            opd.DATA_ENTREGA || null,
            opd.STATUS || null
          ]);
          created++;
        }
      } catch (err) {
        errors++;
        if (errors <= 5) log('warn', `OPD ${opd.NUMERO}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    log('info', `OPDs: ${updated} atualizadas, ${created} criadas, ${errors} erros`);
  } catch (err) {
    await client.query('ROLLBACK');
    log('error', `Rollback OPDs: ${err.message}`);
  } finally {
    client.release();
  }

  return { updated, created, errors };
}

// ============================================
// Sync Produção (apontamentos, operadores, recursos)
// ============================================

async function syncProducao() {
  log('sync', 'Sincronizando dados de produção...');

  try {
    // OPDs em produção com cliente
    const opdsEmProd = await fbQuery(`
      SELECT FIRST 100 o.NUMOPD, o.STATUS, o.COD_CLIENTE, o.DATA_FINAL_PREV,
        o.DATA_INICIO, o.PRIORIDADE, c.NOME as CLIENTE_NOME
      FROM CADOPD o LEFT JOIN CLIENTES c ON o.COD_CLIENTE = c.CODIGO
      WHERE (o.STATUS LIKE 'Em Produ%' OR o.STATUS = 'Paralisada')
      ORDER BY o.PRIORIDADE DESC, o.DATA_FINAL_PREV ASC
    `).catch(() => []);

    // Apontamentos abertos agora
    const apontAbertos = await fbQuery(`
      SELECT v.DATA_HORA_INICIO, v.ORDEM_FABRICACAO, v.RECURSO,
        v.ESTAGIO_INICIO, v.FUNCIONARIO_INICIO,
        f.NOME_FUN as NOME_FUNCIONARIO
      FROM vw_pili_maq_apontamentos v
      LEFT JOIN FUNCI f ON v.FUNCIONARIO_INICIO = f.CODIGO_FUN
      ORDER BY v.DATA_HORA_INICIO DESC
    `).catch(() => []);

    // Operadores últimos 30 dias
    const operadores = await fbQuery(`
      SELECT f.NOME_FUN as OPERADOR, COUNT(*) as TOTAL,
        SUM(CASE WHEN t.DT_LEITURA_FIM IS NULL THEN 1 ELSE 0 END) as ABERTOS,
        SUM(CASE WHEN t.DT_LEITURA_FIM IS NOT NULL THEN 1 ELSE 0 END) as FECHADOS,
        SUM(COALESCE(t.QTDE_PRODUZIDA, 0)) as PECAS,
        SUM(COALESCE(t.QTDE_REFUGADA, 0)) as REFUGO
      FROM TEMPOS_PRODUCAO_LEITORES t
      LEFT JOIN FUNCI f ON t.CD_FUNCIONARIO_INI = f.CODIGO_FUN
      WHERE t.DT_LEITURA_INI >= DATEADD(-30 DAY TO CURRENT_DATE)
        AND (t.FL_CANCELADO IS NULL OR t.FL_CANCELADO = '0')
      GROUP BY f.NOME_FUN ORDER BY COUNT(*) DESC
    `).catch(() => []);

    // Recursos últimos 30 dias
    const recursos = await fbQuery(`
      SELECT g.NOME as RECURSO, COUNT(*) as TOTAL,
        SUM(COALESCE(t.QTDE_PRODUZIDA, 0)) as PECAS,
        SUM(COALESCE(t.QTDE_REFUGADA, 0)) as REFUGO
      FROM TEMPOS_PRODUCAO_LEITORES t
      LEFT JOIN GERAL_PATRIMONIO g ON t.CD_RECURSO = g.CODIGO
      WHERE t.DT_LEITURA_INI >= DATEADD(-30 DAY TO CURRENT_DATE)
        AND (t.FL_CANCELADO IS NULL OR t.FL_CANCELADO = '0')
      GROUP BY g.NOME ORDER BY COUNT(*) DESC
    `).catch(() => []);

    // Processos últimos 30 dias
    const processos = await fbQuery(`
      SELECT p.DESCRICAO as PROCESSO, COUNT(*) as TOTAL,
        SUM(COALESCE(t.QTDE_PRODUZIDA, 0)) as PECAS
      FROM TEMPOS_PRODUCAO_LEITORES t
      LEFT JOIN PROCESSOS p ON t.CD_PROCESSO = p.CODIGO
      WHERE t.DT_LEITURA_INI >= DATEADD(-30 DAY TO CURRENT_DATE)
        AND (t.FL_CANCELADO IS NULL OR t.FL_CANCELADO = '0')
      GROUP BY p.DESCRICAO ORDER BY COUNT(*) DESC
    `).catch(() => []);

    // OPDs por status
    const opdsPorStatus = await fbQuery(`
      SELECT COUNT(*) as TOTAL, STATUS FROM CADOPD GROUP BY STATUS
    `).catch(() => []);

    // Salvar snapshot de produção no NeonDB
    const snapshot = {
      timestamp: new Date().toISOString(),
      opds_por_status: opdsPorStatus,
      opds_em_producao: opdsEmProd,
      apontamentos_abertos: apontAbertos,
      operadores_30d: operadores,
      recursos_30d: recursos,
      processos_30d: processos,
      stats: {
        total_opds: opdsPorStatus.reduce((s, r) => s + (parseInt(r.TOTAL) || 0), 0),
        em_producao: opdsEmProd.length,
        trabalhando_agora: apontAbertos.length,
        total_operadores: operadores.length,
        total_recursos: recursos.length,
      }
    };

    await pgPool.query(`
      INSERT INTO sinprod_snapshots (data, created_at)
      VALUES ($1, NOW())
    `, [JSON.stringify(snapshot)]).catch(async () => {
      // Table might not exist, create it
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS sinprod_snapshots (
          id SERIAL PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      await pgPool.query(`
        INSERT INTO sinprod_snapshots (data, created_at)
        VALUES ($1, NOW())
      `, [JSON.stringify(snapshot)]);
    });

    // Keep only last 24h of snapshots (cleanup)
    await pgPool.query(`
      DELETE FROM sinprod_snapshots
      WHERE created_at < NOW() - INTERVAL '24 hours'
    `).catch(() => {});

    log('info', `Produção: ${opdsEmProd.length} OPDs ativas, ${apontAbertos.length} trabalhando, ${operadores.length} operadores`);
    return snapshot.stats;
  } catch (err) {
    log('error', `Sync produção: ${err.message}`);
    return null;
  }
}

// ============================================
// Main
// ============================================

async function runSync() {
  const startTime = Date.now();
  log('sync', '══════ Início sincronização ══════');

  const args = process.argv.slice(2);
  const onlyOPDs = args.includes('--opds');
  const onlyProd = args.includes('--producao');
  const doAll = !onlyOPDs && !onlyProd;

  try {
    // Test Firebird connection
    await fbQuery('SELECT FIRST 1 1 FROM RDB$DATABASE');
    log('info', `Firebird OK (${fbOptions.host}:${fbOptions.port})`);
  } catch (err) {
    log('error', `Firebird offline: ${err.message}`);
    return;
  }

  try {
    // Test NeonDB connection
    await pgPool.query('SELECT 1');
    log('info', 'NeonDB OK');
  } catch (err) {
    log('error', `NeonDB offline: ${err.message}`);
    return;
  }

  if (doAll || onlyOPDs) await syncOPDs();
  if (doAll || onlyProd) await syncProducao();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log('info', `══════ Concluído em ${elapsed}s ══════\n`);
}

// ============================================
// Entry point
// ============================================

const args = process.argv.slice(2);
const loopMode = args.includes('--loop');
const intervalIdx = args.indexOf('--loop');
const interval = intervalIdx >= 0 && args[intervalIdx + 1]
  ? parseInt(args[intervalIdx + 1]) : SYNC_INTERVAL_MIN;

if (loopMode) {
  log('info', `Modo loop: sincronizando a cada ${interval} minutos`);
  log('info', `Firebird: ${fbOptions.host}:${fbOptions.port}`);
  log('info', `NeonDB: ${process.env.NEONDB_URL?.replace(/:[^:@]+@/, ':***@') || 'NÃO CONFIGURADO'}\n`);

  runSync();
  setInterval(runSync, interval * 60 * 1000);
} else {
  runSync().then(() => {
    pgPool.end();
  });
}
