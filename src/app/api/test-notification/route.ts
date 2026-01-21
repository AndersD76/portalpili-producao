import { NextResponse } from 'next/server';
import { enviarNotificacaoPush } from '@/lib/notifications';

export async function GET() {
  try {
    const result = await enviarNotificacaoPush({
      tipo: 'OPD_CRIADA',
      titulo: 'Teste de Notificação - Portal Pili',
      mensagem: 'Se você está vendo esta mensagem, as notificações estão funcionando!',
      url: '/qualidade',
      referencia: 'TESTE',
      enviado_por: 'Sistema'
    });

    return NextResponse.json({
      success: true,
      message: 'Notificação de teste enviada',
      resultado: result
    });
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar notificação' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
