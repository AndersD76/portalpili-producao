// Service Worker para Push Notifications - Portal Pili
// Versão: 3.0 - Sem cache de páginas para evitar erro após deploys

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v3...');
  // Limpa qualquer cache antigo que existia
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Removendo cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker v3 ativado');
  // Remove todos os caches restantes
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Recebimento de Push Notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido');
  console.log('[SW] event.data existe?', !!event.data);

  let data = {
    title: 'SIG - Nova Notificação',
    body: 'Você tem uma nova atualização',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'sig-notification',
    url: '/'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Payload recebido:', JSON.stringify(payload));
      data = { ...data, ...payload };
    } catch (e) {
      console.log('[SW] Erro ao parsear JSON, tentando texto:', e);
      const text = event.data.text();
      console.log('[SW] Texto recebido:', text);
      data.body = text;
    }
  }

  console.log('[SW] Dados finais da notificação:', JSON.stringify(data));

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'sig-notification',
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    vibrate: [200, 100, 200], // Vibração
    requireInteraction: true, // Mantém até o usuário interagir
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'close') {
    return;
  }

  // Abre ou foca na janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Verifica se já existe uma janela aberta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Se não existe, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Fechamento da notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event);
});

// Sem fetch handler - todas as requisições vão direto para o servidor
// Isso evita servir páginas antigas do cache após novos deploys
