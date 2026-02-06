import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';
import { verificarPermissao } from '@/lib/auth';

// GET - Buscar comentários de uma OPD
export async function GET(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  // Verificar permissão de visualização
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { numero } = await params;

    const result = await pool.query(`
      SELECT
        id,
        numero_opd,
        usuario_id,
        usuario_nome,
        usuario_id_funcionario,
        mensagem,
        tipo,
        arquivos,
        created,
        updated
      FROM comentarios_opd
      WHERE numero_opd = $1
      ORDER BY created DESC
    `, [numero]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar comentários' },
      { status: 500 }
    );
  }
}

// POST - Criar novo comentário
export async function POST(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  // Verificar permissão de criação
  const auth = await verificarPermissao('PRODUCAO', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { numero } = await params;
    const body = await request.json();
    const {
      usuario_id,
      usuario_nome,
      usuario_id_funcionario,
      mensagem,
      tipo = 'COMENTARIO',
      arquivos
    } = body;

    if (!mensagem || !usuario_nome) {
      return NextResponse.json(
        { success: false, error: 'Mensagem e nome do usuário são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      INSERT INTO comentarios_opd (
        numero_opd,
        usuario_id,
        usuario_nome,
        usuario_id_funcionario,
        mensagem,
        tipo,
        arquivos,
        created,
        updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      numero,
      usuario_id || null,
      usuario_nome,
      usuario_id_funcionario || null,
      mensagem,
      tipo,
      arquivos ? JSON.stringify(arquivos) : null,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    // Enviar notificação push para nova mensagem no chat
    try {
      const previewMensagem = mensagem.length > 50 ? mensagem.substring(0, 50) + '...' : mensagem;
      await enviarNotificacaoPush(notificacoes.chatMensagem(numero, usuario_nome, previewMensagem));
    } catch (notifError) {
      console.error('Erro ao enviar notificação:', notifError);
      // Não falha a criação do comentário se falhar a notificação
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Comentário adicionado com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar comentário' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
