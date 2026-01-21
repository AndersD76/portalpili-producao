// Service Worker para Push Notifications - SIG Portal Pili
// Versão: 2.0 - Atualizado em 21/01/2026
const CACHE_NAME = 'sig-cache-v2';

// Arquivos para cachear (opcional para PWA básico)
const urlsToCache = [
  '/',
  '/producao',
  '/qualidade'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('[SW] Erro ao cachear:', error);
      })
  );
  // Força ativação imediata
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Toma controle de todas as páginas imediatamente
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

// Fetch handler (para cache offline)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
