import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tamanho (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido' },
        { status: 400 }
      );
    }

    // Salvar arquivo no banco de dados
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await query(
      `INSERT INTO arquivos (filename, mime_type, tamanho, dados)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [file.name, file.type, file.size, buffer]
    );

    const fileId = result?.rows[0]?.id;
    const fileUrl = `/api/files/${fileId}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: file.name,
      size: file.size,
      file: {
        url: fileUrl,
        filename: file.name,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do arquivo' },
      { status: 500 }
    );
  }
}
