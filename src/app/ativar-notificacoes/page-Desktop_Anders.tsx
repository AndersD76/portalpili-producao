'use client';

import { useState, useEffect } from 'react';

export default function AtivarNotificacoesPage() {
  const [status, setStatus] = useState('Carregando...');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Seu navegador não suporta notificações push');
      setError('Navegador incompatível');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setIsSubscribed(true);
        setStatus('Você já está inscrito para notificações');
      } else {
        setStatus('Clique no botão para ativar notificações');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetAndSubscribe = async () => {
    setStatus('Processando...');
    setError(null);

    try {
      // 1. Desregistrar service worker antigo
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        await registration.unregister();
      }
      setStatus('Service Worker resetado...');

      // 2. Registrar novo service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      setStatus('Novo Service Worker registrado...');

      // 3. Solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Você precisa permitir notificações');
        setStatus('Permissão negada');
        return;
      }
      setStatus('Permissão concedida...');

      // 4. Obter VAPID key
      const keyResponse = await fetch('/api/send-notification');
      const keyData = await keyResponse.json();

      if (!keyData.publicKey) {
        setError('Chave VAPID não disponível');
        return;
      }
      setStatus('Chave VAPID obtida...');

      // 5. Criar subscription
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      setStatus('Subscription criada...');

      // 6. Enviar para o servidor
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setIsSubscribed(true);
        setStatus('Notificações ativadas com sucesso!');

        // Testar imediatamente
        setTimeout(async () => {
          setStatus('Enviando notificação de teste...');
          await fetch('/api/test-notification');
          setStatus('Notificação de teste enviada! Verifique se apareceu.');
        }, 1000);
      } else {
        setError(result.error || 'Erro ao registrar');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('Erro ao ativar');
    }
  };

  function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
          success ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-red-100'
        }`}>
          <svg
            className={`w-10 h-10 ${success ? 'text-green-600' : error ? 'text-red-600' : 'text-red-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {success ? 'Notificações Ativadas!' : 'Ativar Notificações'}
        </h1>

        <p className="text-gray-600 mb-6">{status}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!success && (
          <button
            onClick={resetAndSubscribe}
            className="w-full py-3 px-6 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            {isSubscribed ? 'Reativar Notificações' : 'Ativar Notificações'}
          </button>
        )}

        {success && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              Uma notificação de teste foi enviada!
            </div>
            <a
              href="/"
              className="block w-full py-3 px-6 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
            >
              Voltar ao Portal
            </a>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Portal Pili - Sistema de Gestão
        </p>
      </div>
    </div>
  );
}
