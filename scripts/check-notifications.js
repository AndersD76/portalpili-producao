const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('=== Verificando Push Subscriptions ===\n');

  // Verificar subscriptions ativas
  const subs = await pool.query(
    'SELECT id, user_nome, active, created FROM push_subscriptions ORDER BY created DESC'
  );

  console.log('Total de subscriptions: ' + subs.rowCount);
  const ativas = subs.rows.filter(s => s.active);
  console.log('Subscriptions ativas: ' + ativas.length);

  if (ativas.length > 0) {
    console.log('\nUsuarios com notificacoes ativas:');
    ativas.forEach(s => console.log('  - ' + (s.user_nome || 'Anonimo') + ' (ID: ' + s.id + ')'));
  } else {
    console.log('\n⚠️ NENHUMA subscription ativa!');
    console.log('Os usuarios precisam reativar notificacoes acessando /ativar-notificacoes');
  }

  // Verificar logs recentes
  console.log('\n=== Logs de Notificacoes Recentes ===\n');
  const logs = await pool.query(
    `SELECT tipo, titulo, total_enviados, total_falhas, created
     FROM notification_logs
     ORDER BY created DESC
     LIMIT 10`
  );

  if (logs.rowCount === 0) {
    console.log('Nenhum log de notificacao encontrado.');
  } else {
    logs.rows.forEach(log => {
      const data = new Date(log.created).toLocaleString('pt-BR');
      console.log('[' + data + '] ' + log.tipo + ': ' + log.titulo);
      console.log('   Enviados: ' + log.total_enviados + ', Falhas: ' + log.total_falhas);
    });
  }

  await pool.end();
}

check().catch(console.error);
