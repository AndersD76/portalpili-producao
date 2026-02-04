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

async function enviarTeste() {
  try {
    console.log('VAPID Public:', VAPID_PUBLIC_KEY ? 'OK' : 'FALTA');
    console.log('VAPID Private:', VAPID_PRIVATE_KEY ? 'OK' : 'FALTA');

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const result = await pool.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE active = true');
    console.log('Subscriptions ativas:', result.rowCount);

    if (result.rowCount === 0) {
      console.log('Nenhuma subscription ativa encontrada!');
      pool.end();
      return;
    }

    const payload = JSON.stringify({
      title: 'Teste de Notificacao - Portal Pili',
      body: 'Se voce esta vendo esta mensagem, as notificacoes estao funcionando!',
      url: '/qualidade',
      tag: 'teste-' + Date.now(),
      icon: '/icons/icon-192x192.png'
    });

    let enviados = 0;
    let falhas = 0;

    for (const sub of result.rows) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        enviados++;
        console.log('Enviado para subscription ID:', sub.id);
      } catch (error) {
        falhas++;
        console.error('Falha na subscription ID:', sub.id, '-', error.message);
      }
    }

    console.log('Resultado: ' + enviados + ' enviados, ' + falhas + ' falhas');
    pool.end();
  } catch (error) {
    console.error('Erro geral:', error.message);
    pool.end();
  }
}

enviarTeste();
