import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM materiais_vendedor ORDER BY categoria, created_at DESC`
    );
    return NextResponse.json({ success: true, data: result?.rows || [] });
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar materiais' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const titulo = formData.get('titulo') as string;
    const descricao = formData.get('descricao') as string;
    const categoria = formData.get('categoria') as string || 'MANUAL';

    if (!file || !titulo) {
      return NextResponse.json({ success: false, error: 'Arquivo e titulo sao obrigatorios' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024; // 20MB para materiais
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'Arquivo muito grande. Maximo 20MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const result = await query(
      `INSERT INTO materiais_vendedor (titulo, descricao, categoria, arquivo_nome, arquivo_url, arquivo_tamanho, arquivo_tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, titulo, categoria, arquivo_nome, arquivo_tamanho`,
      [titulo, descricao || null, categoria, file.name, dataUrl, file.size, file.type]
    );

    return NextResponse.json({ success: true, data: result?.rows[0] });
  } catch (error) {
    console.error('Erro ao criar material:', error);
    return NextResponse.json({ success: false, error: 'Erro ao salvar material' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
