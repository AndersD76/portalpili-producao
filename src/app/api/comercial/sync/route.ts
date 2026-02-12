import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  fetchPropostasFromSheet,
  mapSituacaoToEstagio,
  parseValorBR,
  parseDataBR,
  parseProbabilidade,
  type PropostaSheet,
} from '@/lib/googleSheets';
import { calcularSimilaridade } from '@/lib/comercial/fuzzyMatch';

/**
 * GET /api/comercial/sync
 * Retorna status do último sync
 */
export async function GET() {
  try {
    const result = await query(`
      SELECT COUNT(*) as total,
             MAX(updated_at) as ultimo_sync,
             COUNT(CASE WHEN situacao = 'EM NEGOCIAÇÃO' THEN 1 END) as em_negociacao,
             COUNT(CASE WHEN situacao = 'FECHADA' THEN 1 END) as fechadas,
             COUNT(CASE WHEN situacao = 'PERDIDA' THEN 1 END) as perdidas
      FROM propostas_comerciais
    `);

    return NextResponse.json({
      success: true,
      data: result?.rows[0] || {},
    });
  } catch (error) {
    console.error('Erro ao buscar status sync:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comercial/sync
 * Sincroniza dados da planilha Google Sheets com o banco de dados
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const modo = (body as { modo?: string }).modo || 'full'; // 'full' ou 'preview'

    console.log(`[SYNC] Iniciando sincronização (modo: ${modo})...`);

    // 1. Buscar dados da planilha
    const propostas = await fetchPropostasFromSheet();
    console.log(`[SYNC] ${propostas.length} propostas encontradas na planilha`);

    // 2. Buscar propostas existentes no banco
    const existentesResult = await query(
      `SELECT id, data_criacao, situacao, cliente_cnpj, vendedor_nome, numero_proposta
       FROM propostas_comerciais`
    );
    const existentes = existentesResult?.rows || [];

    // 3. Buscar vendedores existentes
    const vendedoresResult = await query(
      `SELECT id, nome, email FROM crm_vendedores WHERE ativo = true`
    );
    const vendedores = vendedoresResult?.rows || [];

    // 4. Buscar clientes existentes
    const clientesResult = await query(
      `SELECT id, razao_social, cpf_cnpj FROM crm_clientes`
    );
    const clientes = clientesResult?.rows || [];

    // 5. Processar cada proposta
    const resultados = {
      total_planilha: propostas.length,
      novas: 0,
      atualizadas: 0,
      sem_alteracao: 0,
      clientes_criados: 0,
      erros: 0,
      detalhes: [] as Array<{
        linha: number;
        cliente: string;
        numero: string;
        acao: string;
      }>,
    };

    for (let i = 0; i < propostas.length; i++) {
      const prop = propostas[i];

      try {
        const dataCriacao = parseDataBR(prop.timestamp);
        if (!dataCriacao) {
          resultados.erros++;
          continue;
        }

        // Identificar proposta existente por timestamp + vendedor + cliente
        const existente = findExistingProposta(prop, existentes, dataCriacao);

        // Calcular valor total (com fallbacks: TOTAL GERAL > VALOR TOTAL > Preço equipamento)
        const valorTotal = parseValorBR(prop.valor_total_tombador) ||
          parseValorBR(prop.valor_total_coletor) ||
          parseValorBR(prop.valor_total_geral) ||
          parseValorBR(prop.valor_equipamento_tombador) ||
          parseValorBR(prop.valor_equipamento_coletor) || null;
        const valorEquipamento = parseValorBR(prop.valor_equipamento_tombador) ||
          parseValorBR(prop.valor_equipamento_coletor) || null;

        if (existente) {
          // Verificar se situação mudou
          if (existente.situacao !== prop.situacao && prop.situacao) {
            if (modo === 'full') {
              await query(
                `UPDATE propostas_comerciais SET
                  situacao = $2,
                  valor_total = COALESCE($3, valor_total),
                  dados_completos = $4,
                  updated_at = NOW()
                WHERE id = $1`,
                [existente.id, prop.situacao, valorTotal, JSON.stringify(prop.dados_completos)]
              );

              // Atualizar oportunidade correspondente
              await syncOportunidade(prop, existente.id, vendedores, clientes);
            }

            resultados.atualizadas++;
            resultados.detalhes.push({
              linha: i + 1,
              cliente: prop.cliente_razao_social,
              numero: prop.numero_proposta,
              acao: `Atualizada: ${existente.situacao} → ${prop.situacao}`,
            });
          } else {
            resultados.sem_alteracao++;
          }
        } else {
          // Nova proposta
          if (modo === 'full') {
            const novaId = await insertProposta(prop, dataCriacao, valorTotal, valorEquipamento);

            // Criar/vincular cliente se necessário
            const clienteId = await ensureCliente(prop, clientes);
            if (clienteId && typeof clienteId === 'number') {
              resultados.clientes_criados++;
              // Adicionar ao cache local
              clientes.push({
                id: clienteId,
                razao_social: prop.cliente_razao_social,
                cpf_cnpj: prop.cliente_cnpj,
              });
            }

            // Criar oportunidade
            await syncOportunidade(prop, novaId, vendedores, clientes);
          }

          resultados.novas++;
          resultados.detalhes.push({
            linha: i + 1,
            cliente: prop.cliente_razao_social,
            numero: prop.numero_proposta,
            acao: 'Nova proposta',
          });
        }
      } catch (err) {
        resultados.erros++;
        console.error(`[SYNC] Erro linha ${i + 1}:`, err);
      }
    }

    console.log(`[SYNC] Concluído: ${resultados.novas} novas, ${resultados.atualizadas} atualizadas, ${resultados.erros} erros`);

    return NextResponse.json({
      success: true,
      modo,
      ...resultados,
      // Limitar detalhes no response (somente mudanças)
      detalhes: resultados.detalhes.slice(0, 100),
    });
  } catch (error) {
    console.error('[SYNC] Erro geral:', error);
    return NextResponse.json(
      { success: false, error: `Erro na sincronização: ${error instanceof Error ? error.message : 'desconhecido'}` },
      { status: 500 }
    );
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Normaliza numero_proposta para comparação: "PROP-00329" → "329", "329" → "329"
 */
function normalizarNumeroProposta(num: string): string {
  if (!num) return '';
  return num.replace(/^PROP-0*/i, '').replace(/^0+/, '') || num;
}

function findExistingProposta(
  prop: PropostaSheet,
  existentes: Array<{ id: number; data_criacao: string; situacao: string; cliente_cnpj: string; vendedor_nome: string; numero_proposta: string }>,
  dataCriacao: Date
) {
  // Primeiro: match por numero_proposta normalizado
  if (prop.numero_proposta) {
    const numNorm = normalizarNumeroProposta(prop.numero_proposta);
    const byNum = existentes.find(e =>
      e.numero_proposta && normalizarNumeroProposta(e.numero_proposta) === numNorm
    );
    if (byNum) return byNum;
  }

  // Segundo: match por timestamp + cliente (com tolerância de 2 min)
  return existentes.find(e => {
    const existDate = new Date(e.data_criacao);
    const diffMs = Math.abs(existDate.getTime() - dataCriacao.getTime());
    const sameTime = diffMs < 120000; // 2 min tolerance

    if (!sameTime) return false;

    // Verificar se é o mesmo cliente (por CNPJ ou nome similar)
    const cnpjProp = (prop.cliente_cnpj || '').replace(/\D/g, '');
    const cnpjExist = (e.cliente_cnpj || '').replace(/\D/g, '');
    if (cnpjProp && cnpjExist && cnpjProp === cnpjExist) return true;

    // Match por vendedor
    if (e.vendedor_nome && prop.vendedor_nome) {
      return calcularSimilaridade(e.vendedor_nome, prop.vendedor_nome) > 0.7;
    }

    return false;
  });
}

async function insertProposta(
  prop: PropostaSheet,
  dataCriacao: Date,
  valorTotal: number | null,
  valorEquipamento: number | null
): Promise<number> {
  const result = await query(
    `INSERT INTO propostas_comerciais (
      numero_proposta, situacao, data_criacao, cliente_nome, cliente_cnpj,
      cliente_email, cliente_pais, cliente_estado, cliente_cidade, cliente_regiao,
      vendedor_nome, vendedor_email, tipo_produto, tamanho,
      angulo_inclinacao, voltagem, frequencia,
      valor_equipamento, valor_total, forma_pagamento,
      tipo_frete, prazo_entrega, garantia_meses,
      observacoes, dados_completos
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    RETURNING id`,
    [
      prop.numero_proposta || null,
      prop.situacao,
      dataCriacao.toISOString(),
      prop.cliente_razao_social,
      prop.cliente_cnpj ? prop.cliente_cnpj.replace(/\D/g, '') : null,
      prop.cliente_contato,
      prop.cliente_pais,
      prop.cliente_estado ? prop.cliente_estado.substring(0, 2) : null,
      prop.cliente_cidade,
      prop.cliente_regiao,
      prop.vendedor_nome,
      prop.vendedor_email,
      prop.tipo_produto,
      parseInt(prop.tamanho_tombador) || null,
      prop.angulo_inclinacao || null,
      parseInt(prop.voltagem) || null,
      parseInt(prop.frequencia) || null,
      valorEquipamento,
      valorTotal,
      prop.forma_pagamento || prop.forma_pagamento_coletor || null,
      prop.tipo_frete || null,
      prop.prazo_entrega || null,
      parseInt(prop.garantia_meses) || null,
      prop.observacoes || prop.observacoes_coletor || null,
      JSON.stringify(prop.dados_completos),
    ]
  );

  return result?.rows[0]?.id;
}

async function ensureCliente(
  prop: PropostaSheet,
  clientes: Array<{ id: number; razao_social: string; cpf_cnpj: string }>
): Promise<number | null> {
  if (!prop.cliente_razao_social) return null;

  const cnpjLimpo = (prop.cliente_cnpj || '').replace(/\D/g, '');

  // Verificar por CNPJ
  if (cnpjLimpo && cnpjLimpo.length >= 11) {
    const existente = clientes.find(c => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cnpjLimpo);
    if (existente) return null; // já existe, não precisa criar
  }

  // Verificar por nome similar
  const existentePorNome = clientes.find(
    c => calcularSimilaridade(prop.cliente_razao_social, c.razao_social) > 0.85
  );
  if (existentePorNome) return null;

  // Criar novo cliente
  try {
    const result = await query(
      `INSERT INTO crm_clientes (
        razao_social, cpf_cnpj, municipio, estado, email, origem
      ) VALUES ($1, $2, $3, $4, $5, 'PLANILHA')
      ON CONFLICT DO NOTHING
      RETURNING id`,
      [
        prop.cliente_razao_social,
        cnpjLimpo || null,
        prop.cliente_cidade || null,
        prop.cliente_estado || null,
        prop.cliente_contato || null,
      ]
    );
    return result?.rows[0]?.id || null;
  } catch {
    return null;
  }
}

async function syncOportunidade(
  prop: PropostaSheet,
  propostaId: number,
  vendedores: Array<{ id: number; nome: string; email: string }>,
  clientes: Array<{ id: number; razao_social: string; cpf_cnpj: string }>
) {
  const { estagio, status } = mapSituacaoToEstagio(prop.situacao);
  const valorTotal = parseValorBR(prop.valor_total_tombador) ||
    parseValorBR(prop.valor_total_coletor) ||
    parseValorBR(prop.valor_total_geral) ||
    parseValorBR(prop.valor_equipamento_tombador) ||
    parseValorBR(prop.valor_equipamento_coletor);
  const probabilidade = parseProbabilidade(prop.probabilidade);

  // Encontrar vendedor
  let vendedorId: number | null = null;
  if (prop.vendedor_nome) {
    const v = vendedores.find(
      v => calcularSimilaridade(prop.vendedor_nome, v.nome) > 0.6
    );
    if (v) vendedorId = v.id;
  }

  // Encontrar cliente
  let clienteId: number | null = null;
  const cnpjLimpo = (prop.cliente_cnpj || '').replace(/\D/g, '');
  if (cnpjLimpo && cnpjLimpo.length >= 11) {
    const c = clientes.find(c => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cnpjLimpo);
    if (c) clienteId = c.id;
  }
  if (!clienteId && prop.cliente_razao_social) {
    const c = clientes.find(c => calcularSimilaridade(prop.cliente_razao_social, c.razao_social) > 0.7);
    if (c) clienteId = c.id;
  }

  const titulo = `${prop.tipo_produto} - ${prop.cliente_razao_social}`;
  const numNorm = prop.numero_proposta ? normalizarNumeroProposta(prop.numero_proposta) : null;

  // Verificar se já existe oportunidade para esta proposta
  // Prioridade: 1) por numero_proposta, 2) por "Venda" variant, 3) por titulo+cliente
  let existenteId: number | null = null;

  // 1) Buscar por numero_proposta (coluna adicionada)
  if (numNorm) {
    const byNum = await query(
      `SELECT id FROM crm_oportunidades WHERE numero_proposta = $1`,
      [numNorm]
    );
    if (byNum?.rows[0]) existenteId = byNum.rows[0].id;
  }

  // 2) Buscar variante "Venda X - Cliente" (do migrate-to-crm antigo)
  if (!existenteId) {
    const vendaTitulo = `Venda ${titulo}`;
    const byVenda = clienteId
      ? await query(`SELECT id FROM crm_oportunidades WHERE titulo = $1 AND cliente_id = $2`, [vendaTitulo, clienteId])
      : await query(`SELECT id FROM crm_oportunidades WHERE titulo = $1 AND cliente_id IS NULL`, [vendaTitulo]);
    if (byVenda?.rows[0]) existenteId = byVenda.rows[0].id;
  }

  // 3) Buscar por titulo + cliente (match original)
  if (!existenteId) {
    const byTitulo = clienteId
      ? await query(`SELECT id FROM crm_oportunidades WHERE titulo = $1 AND cliente_id = $2`, [titulo, clienteId])
      : await query(`SELECT id FROM crm_oportunidades WHERE titulo = $1 AND cliente_id IS NULL AND vendedor_id = $2`, [titulo, vendedorId]);
    if (byTitulo?.rows[0]) existenteId = byTitulo.rows[0].id;
  }

  if (existenteId) {
    // Atualizar - normalizar titulo (remover "Venda " prefix se existir)
    await query(
      `UPDATE crm_oportunidades SET
        titulo = $2, estagio = $3, status = $4, valor_estimado = COALESCE($5, valor_estimado),
        probabilidade = COALESCE($6, probabilidade), numero_proposta = COALESCE($7, numero_proposta),
        cliente_id = COALESCE($8, cliente_id), vendedor_id = COALESCE($9, vendedor_id),
        fonte = 'PLANILHA', updated_at = NOW()
      WHERE id = $1`,
      [existenteId, titulo, estagio, status, valorTotal, probabilidade, numNorm, clienteId, vendedorId]
    );
  } else {
    // Criar
    await query(
      `INSERT INTO crm_oportunidades (
        titulo, cliente_id, vendedor_id, produto, valor_estimado,
        estagio, status, probabilidade, fonte, numero_proposta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PLANILHA', $9)
      ON CONFLICT DO NOTHING`,
      [titulo, clienteId, vendedorId, prop.tipo_produto, valorTotal, estagio, status, probabilidade, numNorm]
    );
  }
}

export const dynamic = 'force-dynamic';
