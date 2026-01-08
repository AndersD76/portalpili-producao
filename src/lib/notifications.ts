// Utilitário para enviar notificações push

export type NotificationType =
  | 'OPD_CRIADA'
  | 'TAREFA_INICIADA'
  | 'TAREFA_FINALIZADA'
  | 'CHAT_MENSAGEM'
  | 'NC_CRIADA'
  | 'AC_CRIADA';

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
export async function enviarNotificacaoPush(data: NotificationData): Promise<{ enviados: number; falhas: number }> {
  try {
    // Usar URL absoluta para chamadas internas
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao enviar notificação:', result.error);
      return { enviados: 0, falhas: 0 };
    }

    return {
      enviados: result.enviados || 0,
      falhas: result.falhas || 0
    };
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return { enviados: 0, falhas: 0 };
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

  ncCriada: (numero: string, opd: string, usuario: string) => ({
    tipo: 'NC_CRIADA' as NotificationType,
    titulo: 'Nova Não Conformidade',
    mensagem: `NC ${numero} registrada${opd ? ` na OPD ${opd}` : ''}`,
    url: `/qualidade/nao-conformidade/${numero}`,
    referencia: numero,
    enviado_por: usuario
  }),

  acCriada: (numero: string, usuario: string) => ({
    tipo: 'AC_CRIADA' as NotificationType,
    titulo: 'Nova Ação Corretiva',
    mensagem: `Ação Corretiva ${numero} registrada`,
    url: `/qualidade/acao-corretiva/${numero}`,
    referencia: numero,
    enviado_por: usuario
  })
};
