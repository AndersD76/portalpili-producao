import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { extractReceiptData } from '@/lib/servicos/vision-extractor';

export async function POST(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const { imagem_base64, mime_type } = body;

    if (!imagem_base64 || !mime_type) {
      return NextResponse.json(
        { success: false, error: 'Imagem e tipo MIME são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await extractReceiptData(imagem_base64, mime_type);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    const dados = result.data;

    // Build localizacao string
    let localizacao: string | null = null;
    if (dados.cidade) {
      localizacao = dados.cidade;
      if (dados.estado) localizacao += ` - ${dados.estado}`;
    }

    return NextResponse.json({
      success: true,
      dados: {
        cliente_nome: dados.estabelecimento,
        valor: dados.valor_total,
        data: dados.data,
        hora: dados.hora,
        categoria: dados.categoria_sugerida,
        forma_pagamento: dados.forma_pagamento,
        numero_nf: dados.numero_nf,
        localizacao,
        combustivel_litros: dados.combustivel_litros,
        combustivel_tipo: dados.combustivel_tipo,
        confiancas: dados.confiancas || {},
      },
      ai_raw: result.raw,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao analisar comprovante:', msg);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
