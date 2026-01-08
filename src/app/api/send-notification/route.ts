import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import webpush from 'web-push';

// Configurar VAPID keys (gerar uma vez e armazenar no .env)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@portalpili.com.br';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Tipos de notificação
export type NotificationType =
  | 'OPD_CRIADA'
  | 'TAREFA_INICIADA'
  | 'TAREFA_FINALIZADA'
  | 'CHAT_MENSAGEM'
  | 'NC_CRIADA'
  | 'AC_CRIADA';

interface NotificationPayload {
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  url?: string;
  referencia?: string;
  enviado_por?: string;
  tag?: string;
}

// POST - Enviar notificação para todos os usuários ativos
export async function POST(request: Request) {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'VAPID keys não configuradas' },
        { status: 500 }
      );
    }

    const body: NotificationPayload = await request.json();
    const { tipo, titulo, mensagem, url, referencia, enviado_por, tag } = body;

    if (!tipo || !titulo || !mensagem) {
      return NextResponse.json(
        { success: false, error: 'Tipo, título e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar todas as subscriptions ativas
    const result = await pool.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE active = true'
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma subscription ativa',
        enviados: 0
      });
    }

    const payload = JSON.stringify({
      title: titulo,
      body: mensagem,
      url: url || '/',
      tag: tag || `sig-${tipo.toLowerCase()}-${Date.now()}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    });

    let enviados = 0;
    let falhas = 0;
    const subscriptionsParaRemover: number[] = [];

    // Enviar para cada subscription
    const promises = result.rows.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        enviados++;
      } catch (error: any) {
        console.error(`Erro ao enviar para ${sub.endpoint}:`, error.message);
        falhas++;

        // Se a subscription expirou ou é inválida, marcar para remoção
        if (error.statusCode === 404 || error.statusCode === 410) {
          subscriptionsParaRemover.push(sub.id);
        }
      }
    });

    await Promise.all(promises);

    // Remover subscriptions inválidas
    if (subscriptionsParaRemover.length > 0) {
      await pool.query(
        'UPDATE push_subscriptions SET active = false WHERE id = ANY($1)',
        [subscriptionsParaRemover]
      );
    }

    // Registrar log
    await pool.query(
      `INSERT INTO notification_logs (tipo, referencia, titulo, mensagem, enviado_por, total_enviados, total_falhas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tipo, referencia || null, titulo, mensagem, enviado_por || 'Sistema', enviados, falhas]
    );

    return NextResponse.json({
      success: true,
      enviados,
      falhas,
      message: `Notificação enviada para ${enviados} dispositivos`
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar notificação' },
      { status: 500 }
    );
  }
}

// GET - Obter VAPID public key para o cliente
export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY
  });
}

export const dynamic = 'force-dynamic';
