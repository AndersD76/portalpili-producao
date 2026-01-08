// Script para gerar VAPID keys para push notifications
// Execute: node scripts/generate-vapid-keys.js

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== VAPID Keys Geradas ===');
console.log('');
console.log('Adicione as seguintes linhas ao seu arquivo .env.local:');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@portalpili.com.br`);
console.log('');
console.log('IMPORTANTE: A NEXT_PUBLIC_VAPID_PUBLIC_KEY será exposta ao cliente (isso é normal e necessário)');
console.log('A VAPID_PRIVATE_KEY deve ser mantida em segredo no servidor.');
