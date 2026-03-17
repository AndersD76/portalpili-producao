import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { extractReceiptData } from '@/lib/servicos/vision-extractor';

export async function POST(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Requisição inválida' },
        { status: 400 }
      );
    }

    const { imagem_base64, mime_type } = body;

    if (!imagem_base64 || !mime_type) {
      return NextResponse.json(
        { success: false, error: 'Imagem e tipo MIME são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await extractReceiptData(imagem_base64, mime_type);

    if (!result.success) {
      // Return 200 with success:false so the frontend can gracefully fall back to manual entry
      return NextResponse.json({
        success: false,
        error: result.error,
        manual: true,
      });
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
    // Return 200 with error info so the frontend doesn't crash on non-JSON responses
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar imagem. Preencha os campos manualmente.',
      manual: true,
    });
  }
}

export const dynamic = 'force-dynamic';
