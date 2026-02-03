import { NextResponse } from 'next/server';
import { gerarEmail, tratarObjecao, chatAssistente } from '@/lib/comercial/ia';

/**
 * Endpoint para geração de conteúdo via IA
 * Gera emails, respostas a objeções ou respostas do chat
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, dados } = body;

    if (!tipo || !dados) {
      return NextResponse.json(
        { success: false, error: 'Tipo e dados são obrigatórios' },
        { status: 400 }
      );
    }

    let resultado;

    switch (tipo) {
      case 'email':
        // Gera email personalizado
        if (!dados.tipo_email || !dados.cliente_nome || !dados.contato_nome) {
          return NextResponse.json(
            { success: false, error: 'Tipo de email, nome do cliente e contato são obrigatórios' },
            { status: 400 }
          );
        }

        resultado = await gerarEmail(dados.tipo_email, {
          cliente_nome: dados.cliente_nome,
          contato_nome: dados.contato_nome,
          empresa_contato: dados.empresa_contato,
          produto_interesse: dados.produto_interesse,
          valor_proposta: dados.valor_proposta,
          historico: dados.historico,
          tom: dados.tom || 'formal',
        });
        break;

      case 'objecao':
        // Responde a objeção de cliente
        if (!dados.objecao) {
          return NextResponse.json(
            { success: false, error: 'Texto da objeção é obrigatório' },
            { status: 400 }
          );
        }

        resultado = await tratarObjecao(dados.objecao, {
          tipo_produto: dados.tipo_produto,
          valor_proposta: dados.valor_proposta,
          concorrente_mencionado: dados.concorrente_mencionado,
        });
        break;

      case 'chat':
        // Chat com assistente de vendas
        if (!dados.mensagem) {
          return NextResponse.json(
            { success: false, error: 'Mensagem é obrigatória' },
            { status: 400 }
          );
        }

        resultado = await chatAssistente(
          dados.mensagem,
          dados.historico_chat || [],
          {
            cliente: dados.contexto?.cliente,
            oportunidade_id: dados.contexto?.oportunidade_id,
            proposta_id: dados.contexto?.proposta_id,
          }
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de geração inválido. Use: email, objecao ou chat' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar conteúdo:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao gerar conteúdo' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
