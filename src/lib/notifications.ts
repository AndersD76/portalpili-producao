// Utilitário para enviar notificações push

export type NotificationType =
  | 'OPD_CRIADA'
  | 'TAREFA_INICIADA'
  | 'TAREFA_FINALIZADA'
  | 'CHAT_MENSAGEM'
  | 'CHAT_INICIADO'
  | 'NC_CRIADA'
  | 'AC_CRIADA'
  | 'RC_CRIADA'
  | 'POSTIT_SALVO';

interface NotificationData {
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  url?: string;
  referencia?: string;
  enviado_por?: string;
}

/**
 * Envia notificação push para todos os usuários ativos
 * Usar apenas no servidor (API routes)
 */
export async function enviarNotificacaoPush(data: NotificationData): Promise<{ enviados: number; falhas: number; erro?: string }> {
  const startTime = Date.now();

  try {
    // Importar webpush diretamente para evitar problemas com fetch interno
    const webpush = (await import('web-push')).default;
    const { query } = await import('@/lib/db');

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@portalpili.com.br';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('[Notificação] VAPID keys não configuradas - notificações push desabilitadas');
      return { enviados: 0, falhas: 0, erro: 'VAPID keys não configuradas' };
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // Buscar todas as subscriptions ativas
    const result = await query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE active = true'
    );

    if (!result?.rowCount || result.rowCount === 0) {
      console.log('[Notificação] Nenhuma subscription ativa encontrada');
      return { enviados: 0, falhas: 0 };
    }

    const payload = JSON.stringify({
      title: data.titulo,
      body: data.mensagem,
      url: data.url || '/',
      tag: `sig-${data.tipo.toLowerCase()}-${Date.now()}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    });

    let enviados = 0;
    let falhas = 0;
    const subscriptionsParaRemover: number[] = [];
    const errosDetalhados: string[] = [];

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
        const errorMsg = `[Sub ${sub.id}] ${error.statusCode || 'ERR'}: ${error.message}`;
        errosDetalhados.push(errorMsg);
        falhas++;

        if (error.statusCode === 404 || error.statusCode === 410) {
          subscriptionsParaRemover.push(sub.id);
        }
      }
    });

    await Promise.all(promises);

    // Remover subscriptions inválidas
    if (subscriptionsParaRemover.length > 0) {
      try {
        await query(
          'UPDATE push_subscriptions SET active = false WHERE id = ANY($1)',
          [subscriptionsParaRemover]
        );
        console.log(`[Notificação] ${subscriptionsParaRemover.length} subscriptions inválidas removidas`);
      } catch (removeError: any) {
        console.error('[Notificação] Erro ao remover subscriptions inválidas:', removeError.message);
      }
    }

    // Registrar log
    try {
      await query(
        `INSERT INTO notification_logs (tipo, referencia, titulo, mensagem, enviado_por, total_enviados, total_falhas, detalhes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.tipo,
          data.referencia || null,
          data.titulo,
          data.mensagem,
          data.enviado_por || 'Sistema',
          enviados,
          falhas,
          errosDetalhados.length > 0 ? JSON.stringify(errosDetalhados.slice(0, 10)) : null
        ]
      );
    } catch (logError: any) {
      // Se falhar por coluna não existir, tentar sem a coluna detalhes
      if (logError.message?.includes('detalhes')) {
        try {
          await query(
            `INSERT INTO notification_logs (tipo, referencia, titulo, mensagem, enviado_por, total_enviados, total_falhas)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [data.tipo, data.referencia || null, data.titulo, data.mensagem, data.enviado_por || 'Sistema', enviados, falhas]
          );
        } catch {
          console.warn('[Notificação] Erro ao registrar log (fallback)');
        }
      } else {
        console.warn('[Notificação] Erro ao registrar log:', logError.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Notificação] ${data.tipo}: ${enviados}/${result.rowCount} enviados em ${duration}ms`);

    if (errosDetalhados.length > 0 && errosDetalhados.length <= 5) {
      errosDetalhados.forEach(e => console.warn(`[Notificação] ${e}`));
    } else if (errosDetalhados.length > 5) {
      console.warn(`[Notificação] ${errosDetalhados.length} erros (mostrando 3):`);
      errosDetalhados.slice(0, 3).forEach(e => console.warn(`  ${e}`));
    }

    return { enviados, falhas };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Notificação] ERRO CRÍTICO após ${duration}ms:`, error.message);
    return { enviados: 0, falhas: 0, erro: error.message };
  }
}

/**
 * Helpers para tipos específicos de notificação
 */
export const notificacoes = {
  opdCriada: (numero: string, usuario: string) => ({
    tipo: 'OPD_CRIADA' as NotificationType,
    titulo: 'Nova OPD Criada',
    mensagem: `OPD ${numero} foi criada`,
    url: `/producao/opd/${numero}`,
    referencia: numero,
    enviado_por: usuario
  }),

  tarefaIniciada: (numero: string, tarefa: string, usuario: string) => ({
    tipo: 'TAREFA_INICIADA' as NotificationType,
    titulo: 'Tarefa Iniciada',
    mensagem: `${tarefa} iniciada na OPD ${numero}`,
    url: `/producao/opd/${numero}`,
    referencia: numero,
    enviado_por: usuario
  }),

  tarefaFinalizada: (numero: string, tarefa: string, usuario: string) => ({
    tipo: 'TAREFA_FINALIZADA' as NotificationType,
    titulo: 'Tarefa Concluída',
    mensagem: `${tarefa} concluída na OPD ${numero}`,
    url: `/producao/opd/${numero}`,
    referencia: numero,
    enviado_por: usuario
  }),

  chatMensagem: (numero: string, usuario: string, preview: string) => ({
    tipo: 'CHAT_MENSAGEM' as NotificationType,
    titulo: `Nova mensagem - OPD ${numero}`,
    mensagem: `${usuario}: ${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}`,
    url: `/producao/opd/${numero}`,
    referencia: numero,
    enviado_por: usuario
  }),

  ncCriada: (id: number, numero: string, opd: string, usuario: string) => ({
    tipo: 'NC_CRIADA' as NotificationType,
    titulo: 'Nova Não Conformidade',
    mensagem: `NC ${numero} registrada${opd ? ` na OPD ${opd}` : ''}`,
    url: `/qualidade/nao-conformidade/${id}`,
    referencia: numero,
    enviado_por: usuario
  }),

  acCriada: (id: number, numero: string, usuario: string) => ({
    tipo: 'AC_CRIADA' as NotificationType,
    titulo: 'Nova Ação Corretiva',
    mensagem: `Ação Corretiva ${numero} registrada`,
    url: `/qualidade/acao-corretiva/${id}`,
    referencia: numero,
    enviado_por: usuario
  }),

  rcCriada: (id: number, numero: string, cliente: string, usuario: string) => ({
    tipo: 'RC_CRIADA' as NotificationType,
    titulo: 'Nova Reclamação de Cliente',
    mensagem: `Reclamação ${numero} registrada - Cliente: ${cliente}`,
    url: `/qualidade/reclamacao-cliente/${id}`,
    referencia: numero,
    enviado_por: usuario
  }),

  chatIniciado: (numero: string, usuario: string) => ({
    tipo: 'CHAT_INICIADO' as NotificationType,
    titulo: `Chat iniciado - OPD ${numero}`,
    mensagem: `${usuario} iniciou um chat na OPD ${numero}`,
    url: `/producao/opd/${numero}`,
    referencia: numero,
    enviado_por: usuario
  }),

  postitSalvo: (numero: string, cor: string, texto: string, usuario: string) => ({
    tipo: 'POSTIT_SALVO' as NotificationType,
    titulo: `Post-it na OPD ${numero}`,
    mensagem: `${usuario}: ${texto.substring(0, 80)}${texto.length > 80 ? '...' : ''}`,
    url: `/producao/opd/${numero}`,
    referencia: numero,
    enviado_por: usuario
  })
};
