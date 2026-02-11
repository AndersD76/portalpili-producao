import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { gerarEmail, tratarObjecao, chatAssistente } from '@/lib/comercial/ia';
import { verificarPermissao } from '@/lib/auth';

/**
 * Busca dados reais do vendedor logado para contextualizar o assistente
 */
async function buscarDadosVendedor(usuarioId: number, usuarioNome: string, isAdmin: boolean) {
  // Encontrar vendedor_id
  let vendedorId: number | null = null;
  let vendedorNome = usuarioNome;

  const vendedorResult = await query(
    `SELECT id, nome FROM crm_vendedores WHERE usuario_id = $1`,
    [usuarioId]
  );
  if (vendedorResult?.rows?.length) {
    vendedorId = vendedorResult.rows[0].id;
    vendedorNome = vendedorResult.rows[0].nome;
  } else {
    const vendedorByName = await query(
      `SELECT id, nome FROM crm_vendedores WHERE LOWER(nome) = LOWER($1) OR nome ILIKE $2 LIMIT 1`,
      [usuarioNome, `%${usuarioNome.split(' ')[0]}%`]
    );
    if (vendedorByName?.rows?.length) {
      vendedorId = vendedorByName.rows[0].id;
      vendedorNome = vendedorByName.rows[0].nome;
    }
  }

  // Construir filtro SQL baseado no vendedor
  const vendedorFilter = (!isAdmin && vendedorId) ? `AND o.vendedor_id = ${vendedorId}` : '';
  const clienteVendedorFilter = (!isAdmin && vendedorId)
    ? `AND (c.vendedor_id = ${vendedorId} OR c.id IN (SELECT cliente_id FROM crm_oportunidades WHERE vendedor_id = ${vendedorId}))`
    : '';

  // Buscar clientes do vendedor (top 30)
  let clientes: any[] = [];
  try {
    const clientesRes = await query(
      `SELECT c.id, c.razao_social, c.nome_fantasia, c.cpf_cnpj, c.segmento,
              c.municipio, c.estado, c.status,
              COUNT(DISTINCT o.id) as total_oportunidades,
              SUM(CASE WHEN o.status = 'GANHA' THEN o.valor_estimado ELSE 0 END) as valor_compras
       FROM crm_clientes c
       LEFT JOIN crm_oportunidades o ON c.id = o.cliente_id
       WHERE 1=1 ${clienteVendedorFilter}
       GROUP BY c.id
       ORDER BY c.razao_social
       LIMIT 30`
    );
    clientes = clientesRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Buscar oportunidades abertas do vendedor
  let oportunidades: any[] = [];
  try {
    const opRes = await query(
      `SELECT o.id, o.titulo, o.estagio, o.status, o.valor_estimado, o.probabilidade,
              o.produto, o.dias_no_estagio, o.data_previsao_fechamento,
              c.razao_social as cliente_nome, c.nome_fantasia as cliente_fantasia
       FROM crm_oportunidades o
       LEFT JOIN crm_clientes c ON o.cliente_id = c.id
       WHERE o.status = 'ABERTA' ${vendedorFilter}
       ORDER BY o.valor_estimado DESC
       LIMIT 30`
    );
    oportunidades = opRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Buscar propostas recentes do vendedor
  let propostas: any[] = [];
  try {
    const propFilter = (!isAdmin && vendedorId) ? `AND p.vendedor_id = ${vendedorId}` : '';
    const propRes = await query(
      `SELECT p.id, p.numero, p.valor_total, p.situacao, p.created_at,
              c.razao_social as cliente_nome, c.nome_fantasia as cliente_fantasia
       FROM crm_propostas p
       LEFT JOIN crm_clientes c ON p.cliente_id = c.id
       WHERE 1=1 ${propFilter}
       ORDER BY p.created_at DESC
       LIMIT 20`
    );
    propostas = propRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Resumo de pipeline
  let resumoPipeline: any[] = [];
  try {
    const pipeRes = await query(
      `SELECT estagio, COUNT(*) as quantidade,
              COALESCE(SUM(valor_estimado), 0) as valor_total
       FROM crm_oportunidades
       WHERE status = 'ABERTA' ${vendedorFilter}
       GROUP BY estagio
       ORDER BY quantidade DESC`
    );
    resumoPipeline = pipeRes?.rows || [];
  } catch { /* ignore */ }

  return { vendedorId, vendedorNome, clientes, oportunidades, propostas, resumoPipeline };
}

/**
 * Formata dados do vendedor como contexto textual para o prompt
 */
function formatarContextoVendedor(dados: Awaited<ReturnType<typeof buscarDadosVendedor>>) {
  const formatCurrency = (v: any) => {
    const n = parseFloat(v) || 0;
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  let ctx = `\n\n=== DADOS REAIS DO VENDEDOR: ${dados.vendedorNome} ===\n`;

  // Clientes
  if (dados.clientes.length > 0) {
    ctx += `\n## Clientes (${dados.clientes.length}):\n`;
    dados.clientes.forEach((c: any) => {
      const nome = c.nome_fantasia || c.razao_social;
      const local = [c.municipio, c.estado].filter(Boolean).join('/');
      ctx += `- ${nome} (${c.status || 'ATIVO'})${local ? ` - ${local}` : ''}${c.segmento ? ` [${c.segmento}]` : ''} - ${c.total_oportunidades || 0} oport., ${formatCurrency(c.valor_compras)} em compras\n`;
    });
  } else {
    ctx += `\nNenhum cliente vinculado.\n`;
  }

  // Pipeline
  if (dados.resumoPipeline.length > 0) {
    ctx += `\n## Resumo do Pipeline:\n`;
    const estagioLabels: Record<string, string> = {
      EM_ANALISE: 'Em Análise', EM_NEGOCIACAO: 'Negociação', POS_NEGOCIACAO: 'Pós Negociação',
      FECHADA: 'Fechada', PERDIDA: 'Perdida', TESTE: 'Teste', SUSPENSO: 'Suspenso',
      PROSPECCAO: 'Prospecção', QUALIFICACAO: 'Qualificação', PROPOSTA: 'Proposta',
    };
    dados.resumoPipeline.forEach((p: any) => {
      ctx += `- ${estagioLabels[p.estagio] || p.estagio}: ${p.quantidade} oport. (${formatCurrency(p.valor_total)})\n`;
    });
  }

  // Oportunidades abertas
  if (dados.oportunidades.length > 0) {
    ctx += `\n## Oportunidades Abertas (${dados.oportunidades.length}):\n`;
    dados.oportunidades.forEach((o: any) => {
      const cliente = o.cliente_fantasia || o.cliente_nome || 'Sem cliente';
      const estagioLabels: Record<string, string> = {
        EM_ANALISE: 'Em Análise', EM_NEGOCIACAO: 'Negociação', POS_NEGOCIACAO: 'Pós Negociação',
        PROSPECCAO: 'Prospecção', QUALIFICACAO: 'Qualificação', PROPOSTA: 'Proposta',
        TESTE: 'Teste', SUSPENSO: 'Suspenso',
      };
      ctx += `- #${o.id} ${o.titulo} | ${cliente} | ${estagioLabels[o.estagio] || o.estagio} | ${formatCurrency(o.valor_estimado)} | ${o.probabilidade || 0}% | ${o.produto} | ${o.dias_no_estagio || 0}d no estágio\n`;
    });
  }

  // Propostas
  if (dados.propostas.length > 0) {
    ctx += `\n## Propostas Recentes (${dados.propostas.length}):\n`;
    dados.propostas.forEach((p: any) => {
      const cliente = p.cliente_fantasia || p.cliente_nome || 'Sem cliente';
      const data = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-';
      ctx += `- Proposta #${p.numero || p.id} | ${cliente} | ${formatCurrency(p.valor_total)} | ${p.situacao} | ${data}\n`;
    });
  }

  return ctx;
}

/**
 * Endpoint para geração de conteúdo via IA
 * Gera emails, respostas a objeções ou respostas do chat
 */
export async function POST(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

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

      case 'chat': {
        // Chat com assistente de vendas - com dados reais do vendedor
        if (!dados.mensagem) {
          return NextResponse.json(
            { success: false, error: 'Mensagem é obrigatória' },
            { status: 400 }
          );
        }

        // Buscar dados reais do vendedor logado
        const dadosVendedor = await buscarDadosVendedor(
          auth.usuario.id,
          auth.usuario.nome,
          auth.usuario.is_admin
        );
        const contextoVendedor = formatarContextoVendedor(dadosVendedor);

        resultado = await chatAssistente(
          dados.mensagem,
          dados.historico_chat || [],
          {
            cliente: dados.contexto?.cliente,
            oportunidade_id: dados.contexto?.oportunidade_id,
            proposta_id: dados.contexto?.proposta_id,
            vendedor_nome: dadosVendedor.vendedorNome,
            dados_reais: contextoVendedor,
          }
        );
        break;
      }

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
