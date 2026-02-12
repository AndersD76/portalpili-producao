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

  const filtrarVendedor = !isAdmin && vendedorId;

  // Buscar clientes do vendedor (top 50) - queries parametrizadas
  let clientes: any[] = [];
  try {
    const clienteParams: any[] = [];
    let clienteFilter = '';
    if (filtrarVendedor) {
      clienteParams.push(vendedorId);
      clienteFilter = `AND (c.vendedor_id = $1 OR c.id IN (SELECT cliente_id FROM crm_oportunidades WHERE vendedor_id = $1))`;
    }
    const clientesRes = await query(
      `SELECT c.id, c.razao_social, c.nome_fantasia, c.cpf_cnpj, c.segmento,
              c.municipio, c.estado, c.status, c.telefone, c.email,
              COUNT(DISTINCT o.id) as total_oportunidades,
              SUM(CASE WHEN o.status = 'GANHA' THEN o.valor_estimado ELSE 0 END) as valor_compras
       FROM crm_clientes c
       LEFT JOIN crm_oportunidades o ON c.id = o.cliente_id
       WHERE 1=1 ${clienteFilter}
       GROUP BY c.id
       ORDER BY c.razao_social
       LIMIT 50`,
      clienteParams
    );
    clientes = clientesRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Buscar oportunidades do vendedor
  let oportunidades: any[] = [];
  try {
    const opParams: any[] = [];
    let opFilter = '';
    if (filtrarVendedor) {
      opParams.push(vendedorId);
      opFilter = `AND o.vendedor_id = $1`;
    }
    const opRes = await query(
      `SELECT o.id, o.titulo, o.estagio, o.status, o.valor_estimado, o.probabilidade,
              o.produto, o.dias_no_estagio, o.data_previsao_fechamento, o.numero_proposta,
              o.concorrente, o.fonte, o.temperatura,
              c.razao_social as cliente_nome, c.nome_fantasia as cliente_fantasia,
              c.municipio as cliente_cidade, c.estado as cliente_estado
       FROM crm_oportunidades o
       LEFT JOIN crm_clientes c ON o.cliente_id = c.id
       WHERE o.status = 'ABERTA' ${opFilter}
       ORDER BY o.valor_estimado DESC
       LIMIT 50`,
      opParams
    );
    oportunidades = opRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Buscar propostas do CRM
  let propostas: any[] = [];
  try {
    const propParams: any[] = [];
    let propFilter = '';
    if (filtrarVendedor) {
      propParams.push(vendedorId);
      propFilter = `AND p.vendedor_id = $1`;
    }
    const propRes = await query(
      `SELECT p.id, p.numero_proposta, p.valor_total, p.situacao, p.produto,
              p.data_proposta, p.created_at,
              c.razao_social as cliente_nome, c.nome_fantasia as cliente_fantasia
       FROM crm_propostas p
       LEFT JOIN crm_clientes c ON p.cliente_id = c.id
       WHERE 1=1 ${propFilter}
       ORDER BY p.created_at DESC
       LIMIT 30`,
      propParams
    );
    propostas = propRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Buscar propostas sincronizadas da planilha Google Sheets
  let propostasSinc: any[] = [];
  try {
    const sincParams: any[] = [];
    let sincFilter = '';
    if (filtrarVendedor && vendedorNome) {
      sincParams.push(`%${vendedorNome.split(' ')[0]}%`);
      sincFilter = `AND pc.vendedor_nome ILIKE $1`;
    }
    const sincRes = await query(
      `SELECT pc.id, pc.numero_proposta, pc.situacao, pc.data_criacao,
              pc.cliente_nome, pc.cliente_estado, pc.cliente_cidade,
              pc.tipo_produto, pc.tamanho, pc.valor_equipamento, pc.valor_total,
              pc.vendedor_nome, pc.forma_pagamento, pc.prazo_entrega
       FROM propostas_comerciais pc
       WHERE 1=1 ${sincFilter}
       ORDER BY pc.data_criacao DESC
       LIMIT 40`,
      sincParams
    );
    propostasSinc = sincRes?.rows || [];
  } catch { /* tabela pode não existir */ }

  // Resumo de pipeline
  let resumoPipeline: any[] = [];
  try {
    const pipeParams: any[] = [];
    let pipeFilter = '';
    if (filtrarVendedor) {
      pipeParams.push(vendedorId);
      pipeFilter = `AND vendedor_id = $1`;
    }
    const pipeRes = await query(
      `SELECT estagio, COUNT(*) as quantidade,
              COALESCE(SUM(valor_estimado), 0) as valor_total
       FROM crm_oportunidades
       WHERE status = 'ABERTA' ${pipeFilter}
       GROUP BY estagio
       ORDER BY quantidade DESC`,
      pipeParams
    );
    resumoPipeline = pipeRes?.rows || [];
  } catch { /* ignore */ }

  // Buscar produtos/precos disponiveis
  let produtos: any[] = [];
  try {
    const prodRes = await query(
      `SELECT produto, tamanho, tipo, preco, modelo, capacidade
       FROM crm_precos_base
       WHERE ativo = true
       ORDER BY produto, tamanho`
    );
    produtos = prodRes?.rows || [];
  } catch { /* ignore */ }

  return { vendedorId, vendedorNome, clientes, oportunidades, propostas, propostasSinc, resumoPipeline, produtos };
}

/**
 * Formata dados do vendedor como contexto textual para o prompt
 */
function formatarContextoVendedor(dados: Awaited<ReturnType<typeof buscarDadosVendedor>>) {
  const formatCurrency = (v: any) => {
    const n = parseFloat(v) || 0;
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  let ctx = `\n\nDADOS REAIS DO VENDEDOR: ${dados.vendedorNome}\n`;

  // Clientes
  if (dados.clientes.length > 0) {
    ctx += `\nCLIENTES (${dados.clientes.length}):\n`;
    dados.clientes.forEach((c: any, i: number) => {
      const nome = c.nome_fantasia || c.razao_social;
      const local = [c.municipio, c.estado].filter(Boolean).join('/');
      ctx += `${i + 1}. ${nome} (${c.status || 'ATIVO'})${local ? ` em ${local}` : ''}${c.segmento ? ` [${c.segmento}]` : ''}, ${c.total_oportunidades || 0} oportunidades, ${formatCurrency(c.valor_compras)} em compras${c.telefone ? `, Tel: ${c.telefone}` : ''}${c.email ? `, Email: ${c.email}` : ''}\n`;
    });
  } else {
    ctx += `\nNenhum cliente vinculado.\n`;
  }

  // Pipeline
  if (dados.resumoPipeline.length > 0) {
    ctx += `\nRESUMO DO PIPELINE:\n`;
    const estagioLabels: Record<string, string> = {
      EM_ANALISE: 'Em Analise', EM_NEGOCIACAO: 'Negociacao', POS_NEGOCIACAO: 'Pos Negociacao',
      FECHADA: 'Fechada', PERDIDA: 'Perdida', TESTE: 'Teste', SUSPENSO: 'Suspenso',
      PROSPECCAO: 'Prospeccao', QUALIFICACAO: 'Qualificacao', PROPOSTA: 'Proposta',
    };
    let totalGeral = 0;
    let qtdGeral = 0;
    dados.resumoPipeline.forEach((p: any) => {
      ctx += `  ${estagioLabels[p.estagio] || p.estagio}: ${p.quantidade} oportunidades (${formatCurrency(p.valor_total)})\n`;
      totalGeral += parseFloat(p.valor_total) || 0;
      qtdGeral += parseInt(p.quantidade) || 0;
    });
    ctx += `  TOTAL GERAL: ${qtdGeral} oportunidades (${formatCurrency(totalGeral)})\n`;
  }

  // Oportunidades abertas
  if (dados.oportunidades.length > 0) {
    ctx += `\nOPORTUNIDADES ABERTAS (${dados.oportunidades.length}):\n`;
    const estagioLabels: Record<string, string> = {
      EM_ANALISE: 'Em Analise', EM_NEGOCIACAO: 'Negociacao', POS_NEGOCIACAO: 'Pos Negociacao',
      PROSPECCAO: 'Prospeccao', QUALIFICACAO: 'Qualificacao', PROPOSTA: 'Proposta',
      TESTE: 'Teste', SUSPENSO: 'Suspenso',
    };
    dados.oportunidades.forEach((o: any, i: number) => {
      const cliente = o.cliente_fantasia || o.cliente_nome || 'Sem cliente';
      const local = [o.cliente_cidade, o.cliente_estado].filter(Boolean).join('/');
      ctx += `${i + 1}. Oportunidade #${o.id}: ${o.titulo}, Cliente: ${cliente}${local ? ` (${local})` : ''}, Estagio: ${estagioLabels[o.estagio] || o.estagio}, Valor: ${formatCurrency(o.valor_estimado)}, Probabilidade: ${o.probabilidade || 0}%, Produto: ${o.produto || 'N/A'}, ${o.dias_no_estagio || 0} dias no estagio${o.concorrente ? `, Concorrente: ${o.concorrente}` : ''}${o.numero_proposta ? `, Proposta: ${o.numero_proposta}` : ''}\n`;
    });
  }

  // Propostas CRM
  if (dados.propostas.length > 0) {
    ctx += `\nPROPOSTAS CRM (${dados.propostas.length}):\n`;
    dados.propostas.forEach((p: any, i: number) => {
      const cliente = p.cliente_fantasia || p.cliente_nome || 'Sem cliente';
      const data = p.data_proposta ? new Date(p.data_proposta).toLocaleDateString('pt-BR') :
                   p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-';
      ctx += `${i + 1}. Proposta #${p.numero_proposta || p.id}, Cliente: ${cliente}, Valor: ${formatCurrency(p.valor_total)}, Situacao: ${p.situacao}, Produto: ${p.produto || '-'}, Data: ${data}\n`;
    });
  }

  // Propostas sincronizadas (Google Sheets)
  if (dados.propostasSinc.length > 0) {
    ctx += `\nPROPOSTAS DA PLANILHA (${dados.propostasSinc.length}):\n`;
    dados.propostasSinc.forEach((p: any, i: number) => {
      const data = p.data_criacao ? new Date(p.data_criacao).toLocaleDateString('pt-BR') : '-';
      const local = [p.cliente_cidade, p.cliente_estado].filter(Boolean).join('/');
      ctx += `${i + 1}. Proposta ${p.numero_proposta || '#' + p.id}, Cliente: ${p.cliente_nome || 'N/A'}${local ? ` (${local})` : ''}, Tipo: ${p.tipo_produto}${p.tamanho ? ` ${p.tamanho}m` : ''}, Valor: ${formatCurrency(p.valor_total)}, Situacao: ${p.situacao}, Data: ${data}${p.prazo_entrega ? `, Prazo: ${p.prazo_entrega}` : ''}\n`;
    });
  }

  // Produtos disponiveis
  if (dados.produtos.length > 0) {
    ctx += `\nPRODUTOS PILI DISPONIVEIS (tabela de precos):\n`;
    dados.produtos.forEach((p: any) => {
      const tipo = p.tipo ? ` ${p.tipo}` : '';
      const unidade = p.produto === 'TOMBADOR' ? 'm' : ' graus';
      ctx += `  ${p.produto} ${p.tamanho}${unidade}${tipo}: ${formatCurrency(p.preco)}${p.modelo ? ` (${p.modelo})` : ''}${p.capacidade ? `, capacidade: ${p.capacidade}` : ''}\n`;
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
