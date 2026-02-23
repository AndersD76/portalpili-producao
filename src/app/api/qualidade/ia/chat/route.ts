import { NextResponse } from 'next/server';
import { chatQualidade } from '@/lib/qualidade/ia';
import { query } from '@/lib/db';

/**
 * Busca dados reais de qualidade do BD para contextualizar o assistente
 */
async function buscarDadosQualidade() {
  const formatCurrency = (v: any) => {
    const n = parseFloat(v) || 0;
    return n.toLocaleString('pt-BR');
  };

  let ctx = '\n\nDADOS REAIS DO SISTEMA DE QUALIDADE:\n';

  // NCs resumo por status
  try {
    const ncStats = await query(`
      SELECT status, COUNT(*) as qtd
      FROM nao_conformidades
      GROUP BY status
      ORDER BY qtd DESC
    `);
    if (ncStats?.rows?.length) {
      ctx += '\nRESUMO NCS POR STATUS:\n';
      ncStats.rows.forEach((r: any) => {
        const label = r.status === 'ABERTA' ? 'Abertas' : r.status === 'EM_ANALISE' ? 'Em Analise' : r.status === 'FECHADA' ? 'Fechadas' : r.status;
        ctx += `  ${label}: ${r.qtd}\n`;
      });
    }
  } catch { /* ignore */ }

  // NCs por tipo
  try {
    const ncTipos = await query(`
      SELECT tipo, COUNT(*) as qtd
      FROM nao_conformidades
      GROUP BY tipo
      ORDER BY qtd DESC
      LIMIT 10
    `);
    if (ncTipos?.rows?.length) {
      ctx += '\nNCS POR TIPO (top 10):\n';
      ncTipos.rows.forEach((r: any) => {
        ctx += `  ${r.tipo || 'Sem tipo'}: ${r.qtd}\n`;
      });
    }
  } catch { /* ignore */ }

  // NCs por setor
  try {
    const ncSetores = await query(`
      SELECT setor_responsavel, COUNT(*) as qtd
      FROM nao_conformidades
      WHERE setor_responsavel IS NOT NULL
      GROUP BY setor_responsavel
      ORDER BY qtd DESC
      LIMIT 10
    `);
    if (ncSetores?.rows?.length) {
      ctx += '\nNCS POR SETOR (top 10):\n';
      ncSetores.rows.forEach((r: any) => {
        ctx += `  ${r.setor_responsavel}: ${r.qtd}\n`;
      });
    }
  } catch { /* ignore */ }

  // NCs por local
  try {
    const ncLocais = await query(`
      SELECT local_ocorrencia, COUNT(*) as qtd
      FROM nao_conformidades
      WHERE local_ocorrencia IS NOT NULL
      GROUP BY local_ocorrencia
      ORDER BY qtd DESC
      LIMIT 8
    `);
    if (ncLocais?.rows?.length) {
      ctx += '\nNCS POR UNIDADE/LOCAL:\n';
      ncLocais.rows.forEach((r: any) => {
        ctx += `  ${r.local_ocorrencia}: ${r.qtd}\n`;
      });
    }
  } catch { /* ignore */ }

  // NCs recentes (ultimas 15)
  try {
    const ncRecentes = await query(`
      SELECT numero, descricao, tipo, gravidade, status, setor_responsavel, local_ocorrencia,
             data_ocorrencia, disposicao
      FROM nao_conformidades
      ORDER BY created DESC
      LIMIT 15
    `);
    if (ncRecentes?.rows?.length) {
      ctx += `\nNCS RECENTES (${ncRecentes.rows.length}):\n`;
      ncRecentes.rows.forEach((nc: any, i: number) => {
        const data = nc.data_ocorrencia ? new Date(nc.data_ocorrencia).toLocaleDateString('pt-BR') : '-';
        ctx += `${i + 1}. ${nc.numero}: ${nc.descricao?.substring(0, 100) || 'Sem descricao'}, Tipo: ${nc.tipo || '-'}, Gravidade: ${nc.gravidade || '-'}, Status: ${nc.status}, Setor: ${nc.setor_responsavel || '-'}, Local: ${nc.local_ocorrencia || '-'}, Data: ${data}\n`;
      });
    }
  } catch { /* ignore */ }

  // Reclamacoes resumo
  try {
    const recStats = await query(`
      SELECT status, COUNT(*) as qtd
      FROM reclamacoes_clientes
      GROUP BY status
      ORDER BY qtd DESC
    `);
    if (recStats?.rows?.length) {
      ctx += '\nRECLAMACOES DE CLIENTES POR STATUS:\n';
      recStats.rows.forEach((r: any) => {
        const label = r.status === 'ABERTA' ? 'Abertas' : r.status === 'EM_ANALISE' ? 'Em Analise' : r.status === 'RESPONDIDA' ? 'Respondidas' : r.status === 'FECHADA' ? 'Fechadas' : r.status;
        ctx += `  ${label}: ${r.qtd}\n`;
      });
    }
  } catch { /* ignore */ }

  // Reclamacoes recentes
  try {
    const recRecentes = await query(`
      SELECT numero, cliente_nome, descricao, tipo_reclamacao, status, data_reclamacao
      FROM reclamacoes_clientes
      ORDER BY created DESC
      LIMIT 10
    `);
    if (recRecentes?.rows?.length) {
      ctx += `\nRECLAMACOES RECENTES (${recRecentes.rows.length}):\n`;
      recRecentes.rows.forEach((rec: any, i: number) => {
        const data = rec.data_reclamacao ? new Date(rec.data_reclamacao).toLocaleDateString('pt-BR') : '-';
        ctx += `${i + 1}. ${rec.numero}: Cliente ${rec.cliente_nome || '-'}, ${rec.descricao?.substring(0, 80) || '-'}, Tipo: ${rec.tipo_reclamacao || '-'}, Status: ${rec.status}, Data: ${data}\n`;
      });
    }
  } catch { /* ignore */ }

  // Acoes corretivas resumo
  try {
    const acStats = await query(`
      SELECT status, COUNT(*) as qtd
      FROM acoes_corretivas
      GROUP BY status
      ORDER BY qtd DESC
    `);
    if (acStats?.rows?.length) {
      ctx += '\nACOES CORRETIVAS POR STATUS:\n';
      acStats.rows.forEach((r: any) => {
        const label = r.status === 'ABERTA' ? 'Abertas' : r.status === 'EM_ANDAMENTO' ? 'Em Andamento' : r.status === 'AGUARDANDO_VERIFICACAO' ? 'Aguardando Verificacao' : r.status === 'FECHADA' ? 'Fechadas' : r.status;
        ctx += `  ${label}: ${r.qtd}\n`;
      });
    }
  } catch { /* ignore */ }

  // Acoes corretivas vencidas
  try {
    const acVencidas = await query(`
      SELECT COUNT(*) as qtd
      FROM acoes_corretivas
      WHERE prazo_conclusao < NOW() AND status != 'FECHADA'
    `);
    if (acVencidas?.rows?.[0]?.qtd > 0) {
      ctx += `\nALERTA: ${acVencidas.rows[0].qtd} acoes corretivas com prazo vencido!\n`;
    }
  } catch { /* ignore */ }

  // Acoes recentes
  try {
    const acRecentes = await query(`
      SELECT numero, descricao_problema, responsavel_principal, status, prazo_conclusao, data_abertura
      FROM acoes_corretivas
      ORDER BY created DESC
      LIMIT 10
    `);
    if (acRecentes?.rows?.length) {
      ctx += `\nACOES CORRETIVAS RECENTES (${acRecentes.rows.length}):\n`;
      acRecentes.rows.forEach((ac: any, i: number) => {
        const data = ac.data_abertura ? new Date(ac.data_abertura).toLocaleDateString('pt-BR') : '-';
        const prazo = ac.prazo_conclusao ? new Date(ac.prazo_conclusao).toLocaleDateString('pt-BR') : '-';
        ctx += `${i + 1}. ${ac.numero}: ${ac.descricao_problema?.substring(0, 80) || '-'}, Resp: ${ac.responsavel_principal || '-'}, Status: ${ac.status}, Abertura: ${data}, Prazo: ${prazo}\n`;
      });
    }
  } catch { /* ignore */ }

  return ctx;
}

/**
 * Endpoint para chat com assistente de qualidade via IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mensagem, historico = [], contexto } = body;

    if (!mensagem) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    // Buscar dados reais do BD
    const dadosReais = await buscarDadosQualidade();

    const resposta = await chatQualidade(
      mensagem,
      historico.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        ...contexto,
        dados_reais: dadosReais,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        resposta,
      },
    });
  } catch (error: unknown) {
    console.error('Erro no chat:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao processar mensagem' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
