import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Serve arquivos armazenados no banco de dados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const result = await query(
      'SELECT filename, mime_type, dados, tamanho FROM arquivos WHERE id = $1',
      [fileId]
    );

    if (!result?.rows?.length) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const arquivo = result.rows[0];
    const buffer = Buffer.from(arquivo.dados);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': arquivo.mime_type,
        'Content-Disposition': `inline; filename="${arquivo.filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    return NextResponse.json({ error: 'Erro ao carregar arquivo' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
