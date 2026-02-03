'use client';

import { useState } from 'react';

export default function TestPushPage() {
  const [log, setLog] = useState<string[]>([]);
  const [swStatus, setSwStatus] = useState('Verificando...');

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const checkServiceWorker = async () => {
    addLog('Verificando Service Worker...');

    if (!('serviceWorker' in navigator)) {
      addLog('ERRO: Service Worker não suportado');
      setSwStatus('Não suportado');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      addLog(`SW ativo: ${registration.active?.scriptURL}`);
      setSwStatus('Ativo');

      // Verificar subscription
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        addLog(`Subscription ativa: ${subscription.endpoint.substring(0, 50)}...`);
      } else {
        addLog('AVISO: Nenhuma subscription ativa');
      }
    } catch (error: any) {
      addLog(`ERRO: ${error.message}`);
      setSwStatus('Erro');
    }
  };

  const updateServiceWorker = async () => {
    addLog('Forçando atualização do Service Worker...');

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        addLog('SW atualizado! Recarregue a página.');
      } else {
        addLog('Nenhum SW registrado');
      }
    } catch (error: any) {
      addLog(`ERRO: ${error.message}`);
    }
  };

  const unregisterServiceWorker = async () => {
    addLog('Desregistrando Service Worker...');

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        addLog('SW desregistrado');
      }
      addLog('Recarregue a página para registrar novamente');
    } catch (error: any) {
      addLog(`ERRO: ${error.message}`);
    }
  };

  const testLocalNotification = async () => {
    addLog('Testando notificação local...');

    if (!('Notification' in window)) {
      addLog('ERRO: Notificações não suportadas');
      return;
    }

    const permission = await Notification.requestPermission();
    addLog(`Permissão: ${permission}`);

    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Teste Local', {
          body: 'Esta é uma notificação de teste local',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'test-local-' + Date.now()
        });
        addLog('Notificação local enviada!');
      } catch (error: any) {
        addLog(`ERRO ao mostrar notificação: ${error.message}`);
      }
    }
  };

  const testServerNotification = async () => {
    addLog('Enviando notificação via servidor...');

    try {
      const response = await fetch('/api/test-notification');
      const data = await response.json();
      addLog(`Resposta: ${JSON.stringify(data)}`);
    } catch (error: any) {
      addLog(`ERRO: ${error.message}`);
    }
  };

  const checkDebugInfo = async () => {
    addLog('Buscando informações de debug...');

    try {
      const response = await fetch('/api/debug-push');
      const data = await response.json();
      addLog(`VAPID Public: ${data.vapid?.publicKey}`);
      addLog(`VAPID Private: ${data.vapid?.privateKey}`);
      addLog(`Total subscriptions: ${data.total}`);

      if (data.subscriptions) {
        data.subscriptions.forEach((sub: any) => {
          addLog(`  - ID ${sub.id}: ${sub.user || 'anônimo'} (${sub.active ? 'ATIVO' : 'inativo'})`);
        });
      }
    } catch (error: any) {
      addLog(`ERRO: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Teste de Push Notifications</h1>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold mb-2">Status: {swStatus}</h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={checkServiceWorker}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Verificar SW
            </button>
            <button
              onClick={updateServiceWorker}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Atualizar SW
            </button>
            <button
              onClick={unregisterServiceWorker}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Desregistrar SW
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold mb-2">Testes</h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={testLocalNotification}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Teste Local
            </button>
            <button
              onClick={testServerNotification}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Teste Servidor
            </button>
            <button
              onClick={checkDebugInfo}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Info Debug
            </button>
          </div>
        </div>

        <div className="bg-black rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2 text-green-400">Console</h2>
          <div className="font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-500">Clique em um botão para começar...</p>
            ) : (
              log.map((line, i) => (
                <div key={i} className="py-0.5">{line}</div>
              ))
            )}
          </div>
          {log.length > 0 && (
            <button
              onClick={() => setLog([])}
              className="mt-2 text-xs text-gray-400 hover:text-white"
            >
              Limpar console
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
