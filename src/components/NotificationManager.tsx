'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface NotificationManagerProps {
  userId?: string;
  userNome?: string;
}

export default function NotificationManager({ userId, userNome }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Registrar Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado:', reg);
          setRegistration(reg);
          checkSubscription(reg);
        })
        .catch((error) => {
          console.error('Erro ao registrar Service Worker:', error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Verificar permissão atual
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Verificar se já está inscrito
  const checkSubscription = async (reg: ServiceWorkerRegistration) => {
    try {
      const subscription = await reg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      // Mostrar banner se não está inscrito e permissão não foi negada
      if (!subscription && Notification.permission !== 'denied') {
        // Esperar um pouco para não ser intrusivo
        setTimeout(() => {
          setShowBanner(true);
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Solicitar permissão e inscrever
  const subscribe = useCallback(async () => {
    if (!registration) return;

    try {
      // Solicitar permissão
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        console.log('Permissão negada');
        setShowBanner(false);
        return;
      }

      // Obter VAPID public key do servidor
      const keyResponse = await fetch('/api/send-notification');
      const keyData = await keyResponse.json();

      if (!keyData.publicKey) {
        console.error('VAPID key não disponível');
        return;
      }

      // Converter base64 para Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Enviar para o servidor
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
          userNome
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSubscribed(true);
        setShowBanner(false);

        // Tocar som de confirmação
        playNotificationSound();
      }
    } catch (error) {
      console.error('Erro ao inscrever:', error);
    }
  }, [registration, userId, userNome]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remover do servidor
        await fetch('/api/push-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          }),
        });

        // Cancelar subscription local
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
    }
  }, [registration]);

  // Converter base64 para Uint8Array
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

  // Tocar som de notificação
  function playNotificationSound() {
    try {
      const audio = new Audio('/sounds/notification.wav');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (error) {
      // Ignorar erro se som não existir
    }
  }

  // Não renderizar nada se não suportar
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  // Banner para solicitar permissão
  if (showBanner && !isSubscribed && permission !== 'denied') {
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Ativar Notificações</h3>
            <p className="text-sm text-gray-600 mt-1">
              Receba alertas de novas OPDs, tarefas e mensagens em tempo real.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={subscribe}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Ativar
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Agora não
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Componente para o ícone de sino no header
export function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Verificar subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleClick = async () => {
    if (isSubscribed) {
      // Já inscrito - pode mostrar menu de opções
      return;
    }

    if (permission === 'denied') {
      toast.warning('Notificacoes bloqueadas. Habilite nas configuracoes do navegador.');
      return;
    }

    // Solicitar permissão
    const perm = await Notification.requestPermission();
    setPermission(perm);

    if (perm === 'granted') {
      // Trigger subscribe via NotificationManager
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg transition ${
        isSubscribed
          ? 'text-green-600 hover:bg-green-50'
          : permission === 'denied'
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
      }`}
      title={
        isSubscribed
          ? 'Notificações ativas'
          : permission === 'denied'
          ? 'Notificações bloqueadas'
          : 'Ativar notificações'
      }
    >
      <svg className="w-5 h-5" fill={isSubscribed ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </button>
  );
}
