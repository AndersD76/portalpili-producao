const { Pool } = require('pg');
const webpush = require('web-push');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@portalpili.com.br';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function cleanSubscriptions() {
  console.log('=== Limpando Subscriptions Inválidas ===\n');

  try {
    // Buscar todas as subscriptions ativas
    const result = await pool.query(
      'SELECT id, endpoint, p256dh, auth, user_nome FROM push_subscriptions WHERE active = true'
    );

    console.log(`Total de subscriptions ativas: ${result.rowCount}\n`);

    if (result.rowCount === 0) {
      console.log('Nenhuma subscription para verificar.');
      return;
    }

    const invalidas = [];
    const validas = [];

    // Testar cada subscription
    for (const sub of result.rows) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        // Envia notificação de teste silenciosa (TTL 0 = não armazena se offline)
        await webpush.sendNotification(pushSubscription, JSON.stringify({
          title: 'Verificação',
          body: 'Teste de conexão',
          tag: 'test-silent'
        }), { TTL: 0 });

        validas.push({ id: sub.id, user: sub.user_nome || 'Anônimo' });
        console.log(`✓ Válida: ${sub.user_nome || 'Anônimo'} (ID: ${sub.id})`);
      } catch (error) {
        invalidas.push(sub.id);
        console.log(`✗ Inválida: ${sub.user_nome || 'Anônimo'} (ID: ${sub.id}) - ${error.statusCode || error.message}`);
      }
    }

    // Desativar subscriptions inválidas
    if (invalidas.length > 0) {
      await pool.query(
        'UPDATE push_subscriptions SET active = false WHERE id = ANY($1)',
        [invalidas]
      );
      console.log(`\n${invalidas.length} subscriptions marcadas como inativas.`);
    }

    console.log(`\n=== Resumo ===`);
    console.log(`Válidas: ${validas.length}`);
    console.log(`Inválidas (removidas): ${invalidas.length}`);

    if (validas.length > 0) {
      console.log('\nUsuários com notificações funcionando:');
      validas.forEach(v => console.log(`  - ${v.user}`));
    }

    if (validas.length === 0) {
      console.log('\n⚠️  NENHUMA subscription válida encontrada!');
      console.log('Os usuários precisam acessar /ativar-notificacoes para reativar.');
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

cleanSubscriptions();
