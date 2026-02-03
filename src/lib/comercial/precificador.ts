/**
 * Precificador Dinâmico - Sistema de Cálculo de Preços Comercial PILI
 *
 * Os preços são configuráveis via banco de dados, não são fixos no código.
 * Todas as tabelas de preços, opcionais e descontos vêm do banco.
 */

import { query } from '../db';
import {
  ProdutoTipo,
  PrecoBase,
  PrecoOpcao,
  PrecoDesconto,
  PrecoConfiguracao,
  PrecoRegra,
  ResultadoCalculo,
  ItemCalculo,
  Proposta,
} from '@/types/comercial';

// ==================== CACHE DE PREÇOS ====================

interface CachePrecos {
  precosBase: PrecoBase[];
  opcoes: PrecoOpcao[];
  descontos: PrecoDesconto[];
  configuracoes: PrecoConfiguracao[];
  regras: PrecoRegra[];
  ultimaAtualizacao: Date;
}

let cachePrecos: CachePrecos | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega todos os preços do banco de dados com cache
 */
export async function carregarPrecos(forcarReload = false): Promise<CachePrecos> {
  if (cachePrecos && !forcarReload) {
    const agora = new Date();
    if (agora.getTime() - cachePrecos.ultimaAtualizacao.getTime() < CACHE_TTL_MS) {
      return cachePrecos;
    }
  }

  const [precosBaseRes, opcoesRes, descontosRes, configRes, regrasRes] = await Promise.all([
    query(`SELECT * FROM crm_precos_base WHERE ativo = true ORDER BY tipo_produto, modelo, comprimento`),
    query(`SELECT * FROM crm_precos_opcoes WHERE ativo = true ORDER BY categoria_id, ordem`),
    query(`SELECT * FROM crm_precos_descontos WHERE ativo = true ORDER BY tipo, valor_minimo`),
    query(`SELECT * FROM crm_precos_config WHERE ativo = true`),
    query(`SELECT * FROM crm_precos_regras WHERE ativo = true ORDER BY prioridade DESC`),
  ]);

  cachePrecos = {
    precosBase: precosBaseRes?.rows || [],
    opcoes: opcoesRes?.rows || [],
    descontos: descontosRes?.rows || [],
    configuracoes: configRes?.rows || [],
    regras: regrasRes?.rows || [],
    ultimaAtualizacao: new Date(),
  };

  return cachePrecos;
}

/**
 * Invalida o cache (usar após atualização de preços)
 */
export function invalidarCachePrecos(): void {
  cachePrecos = null;
}

// ==================== BUSCA DE PREÇOS ====================

/**
 * Busca o preço base de um produto
 */
export async function buscarPrecoBase(
  tipoProduto: ProdutoTipo,
  modelo: string,
  comprimento?: number
): Promise<PrecoBase | null> {
  const cache = await carregarPrecos();

  return cache.precosBase.find(p => {
    if (p.tipo_produto !== tipoProduto) return false;
    if (p.modelo !== modelo) return false;
    if (comprimento && p.comprimento && p.comprimento !== comprimento) return false;
    return true;
  }) || null;
}

/**
 * Busca opcionais por categoria
 */
export async function buscarOpcionaisPorCategoria(categoriaId: number): Promise<PrecoOpcao[]> {
  const cache = await carregarPrecos();
  return cache.opcoes.filter(o => o.categoria_id === categoriaId);
}

/**
 * Busca todos os opcionais disponíveis para um tipo de produto
 */
export async function buscarOpcionaisDisponiveis(tipoProduto: ProdutoTipo): Promise<PrecoOpcao[]> {
  const cache = await carregarPrecos();
  return cache.opcoes.filter(o =>
    !o.tipo_produto_aplicavel || o.tipo_produto_aplicavel === tipoProduto
  );
}

/**
 * Busca descontos aplicáveis
 */
export async function buscarDescontosAplicaveis(
  valorTotal: number,
  quantidade: number,
  segmento?: string,
  regiao?: string
): Promise<PrecoDesconto[]> {
  const cache = await carregarPrecos();

  return cache.descontos.filter(d => {
    // Verifica valor mínimo
    if (d.valor_minimo && valorTotal < d.valor_minimo) return false;
    if (d.valor_maximo && valorTotal > d.valor_maximo) return false;

    // Verifica quantidade mínima
    if (d.quantidade_minima && quantidade < d.quantidade_minima) return false;

    // Verifica segmento
    if (d.segmentos_aplicaveis && segmento) {
      if (!d.segmentos_aplicaveis.includes(segmento)) return false;
    }

    // Verifica região
    if (d.regioes_aplicaveis && regiao) {
      if (!d.regioes_aplicaveis.includes(regiao)) return false;
    }

    return true;
  });
}

// ==================== CÁLCULO DE PREÇOS ====================

export interface ParametrosCalculo {
  tipoProduto: ProdutoTipo;
  modelo: string;
  comprimento?: number;
  quantidade: number;
  opcionaisSelecionados: number[]; // IDs dos opcionais
  segmentoCliente?: string;
  regiaoCliente?: string;
  descontoManual?: number; // Percentual
  condicaoPagamento?: string;
  prazoEntrega?: number; // dias
}

/**
 * Calcula o preço total de uma proposta
 */
export async function calcularPreco(params: ParametrosCalculo): Promise<ResultadoCalculo> {
  const cache = await carregarPrecos();

  // 1. Busca preço base
  const precoBase = await buscarPrecoBase(params.tipoProduto, params.modelo, params.comprimento);

  if (!precoBase) {
    throw new Error(`Preço não encontrado para ${params.tipoProduto} ${params.modelo} ${params.comprimento || ''}`);
  }

  const itens: ItemCalculo[] = [];
  let subtotal = 0;

  // 2. Adiciona equipamento base
  const valorBaseTotal = precoBase.preco * params.quantidade;
  itens.push({
    descricao: `${precoBase.descricao} x ${params.quantidade}`,
    quantidade: params.quantidade,
    valorUnitario: precoBase.preco,
    valorTotal: valorBaseTotal,
    tipo: 'BASE',
  });
  subtotal += valorBaseTotal;

  // 3. Adiciona opcionais selecionados
  for (const opcaoId of params.opcionaisSelecionados) {
    const opcao = cache.opcoes.find(o => o.id === opcaoId);
    if (opcao) {
      let valorOpcao = 0;

      if (opcao.tipo_valor === 'FIXO') {
        valorOpcao = opcao.valor * params.quantidade;
      } else if (opcao.tipo_valor === 'PERCENTUAL') {
        valorOpcao = (precoBase.preco * opcao.valor / 100) * params.quantidade;
      } else if (opcao.tipo_valor === 'POR_METRO') {
        valorOpcao = (opcao.valor * (params.comprimento || 1)) * params.quantidade;
      }

      itens.push({
        descricao: opcao.nome,
        quantidade: params.quantidade,
        valorUnitario: valorOpcao / params.quantidade,
        valorTotal: valorOpcao,
        tipo: 'OPCIONAL',
      });
      subtotal += valorOpcao;
    }
  }

  // 4. Aplica regras de negócio
  const ajustesRegras = await aplicarRegras(params, subtotal, cache.regras);
  for (const ajuste of ajustesRegras) {
    itens.push(ajuste);
    subtotal += ajuste.valorTotal;
  }

  // 5. Busca descontos automáticos
  const descontosAplicaveis = await buscarDescontosAplicaveis(
    subtotal,
    params.quantidade,
    params.segmentoCliente,
    params.regiaoCliente
  );

  let totalDescontos = 0;
  const descontosAplicados: { descricao: string; percentual: number; valor: number }[] = [];

  // Aplica maior desconto de cada tipo (não cumulativo por tipo)
  const descontosPorTipo = new Map<string, PrecoDesconto>();
  for (const desconto of descontosAplicaveis) {
    const existente = descontosPorTipo.get(desconto.tipo);
    if (!existente || desconto.percentual > existente.percentual) {
      descontosPorTipo.set(desconto.tipo, desconto);
    }
  }

  for (const desconto of descontosPorTipo.values()) {
    const valorDesconto = subtotal * desconto.percentual / 100;
    totalDescontos += valorDesconto;
    descontosAplicados.push({
      descricao: desconto.nome,
      percentual: desconto.percentual,
      valor: valorDesconto,
    });
  }

  // 6. Aplica desconto manual (se houver e se permitido)
  if (params.descontoManual && params.descontoManual > 0) {
    const maxDescontoManual = cache.configuracoes.find(c => c.chave === 'MAX_DESCONTO_MANUAL');
    const limiteDesconto = maxDescontoManual ? parseFloat(maxDescontoManual.valor) : 10;

    const descontoAplicar = Math.min(params.descontoManual, limiteDesconto);
    const valorDescontoManual = (subtotal - totalDescontos) * descontoAplicar / 100;
    totalDescontos += valorDescontoManual;
    descontosAplicados.push({
      descricao: 'Desconto Comercial',
      percentual: descontoAplicar,
      valor: valorDescontoManual,
    });
  }

  // 7. Calcula totais
  const valorFinal = subtotal - totalDescontos;
  const valorUnitarioFinal = valorFinal / params.quantidade;

  // 8. Busca configurações de margem e comissão
  const margemConfig = cache.configuracoes.find(c => c.chave === 'MARGEM_PADRAO');
  const comissaoConfig = cache.configuracoes.find(c => c.chave === 'COMISSAO_PADRAO');

  const margemPadrao = margemConfig ? parseFloat(margemConfig.valor) : 30;
  const comissaoPadrao = comissaoConfig ? parseFloat(comissaoConfig.valor) : 3;

  return {
    itens,
    subtotal,
    descontos: descontosAplicados,
    totalDescontos,
    valorFinal,
    valorUnitario: valorUnitarioFinal,
    quantidade: params.quantidade,
    margemEstimada: margemPadrao,
    comissaoEstimada: valorFinal * comissaoPadrao / 100,
    validadePreco: 30, // dias
    observacoes: gerarObservacoesCalculo(params, descontosAplicados),
  };
}

/**
 * Aplica regras de negócio ao cálculo
 */
async function aplicarRegras(
  params: ParametrosCalculo,
  subtotal: number,
  regras: PrecoRegra[]
): Promise<ItemCalculo[]> {
  const ajustes: ItemCalculo[] = [];

  for (const regra of regras) {
    if (!avaliarCondicaoRegra(regra, params, subtotal)) continue;

    let valorAjuste = 0;

    if (regra.tipo_acao === 'ADICIONAR_VALOR') {
      valorAjuste = regra.valor_acao;
    } else if (regra.tipo_acao === 'ADICIONAR_PERCENTUAL') {
      valorAjuste = subtotal * regra.valor_acao / 100;
    } else if (regra.tipo_acao === 'DESCONTO_VALOR') {
      valorAjuste = -regra.valor_acao;
    } else if (regra.tipo_acao === 'DESCONTO_PERCENTUAL') {
      valorAjuste = -(subtotal * regra.valor_acao / 100);
    }

    if (valorAjuste !== 0) {
      ajustes.push({
        descricao: regra.nome,
        quantidade: 1,
        valorUnitario: valorAjuste,
        valorTotal: valorAjuste,
        tipo: 'AJUSTE',
      });
    }
  }

  return ajustes;
}

/**
 * Avalia se uma regra deve ser aplicada
 */
function avaliarCondicaoRegra(
  regra: PrecoRegra,
  params: ParametrosCalculo,
  subtotal: number
): boolean {
  const condicoes = regra.condicoes as Record<string, unknown>;

  // Verifica tipo de produto
  if (condicoes.tipo_produto && condicoes.tipo_produto !== params.tipoProduto) {
    return false;
  }

  // Verifica modelo
  if (condicoes.modelo && condicoes.modelo !== params.modelo) {
    return false;
  }

  // Verifica comprimento
  if (condicoes.comprimento_min && params.comprimento && params.comprimento < Number(condicoes.comprimento_min)) {
    return false;
  }
  if (condicoes.comprimento_max && params.comprimento && params.comprimento > Number(condicoes.comprimento_max)) {
    return false;
  }

  // Verifica quantidade
  if (condicoes.quantidade_min && params.quantidade < Number(condicoes.quantidade_min)) {
    return false;
  }

  // Verifica valor
  if (condicoes.valor_min && subtotal < Number(condicoes.valor_min)) {
    return false;
  }

  // Verifica opcionais obrigatórios
  if (condicoes.opcionais_obrigatorios && Array.isArray(condicoes.opcionais_obrigatorios)) {
    const temTodos = condicoes.opcionais_obrigatorios.every(
      (id: number) => params.opcionaisSelecionados.includes(id)
    );
    if (!temTodos) return false;
  }

  // Verifica segmento
  if (condicoes.segmentos && Array.isArray(condicoes.segmentos) && params.segmentoCliente) {
    if (!condicoes.segmentos.includes(params.segmentoCliente)) {
      return false;
    }
  }

  return true;
}

/**
 * Gera observações sobre o cálculo
 */
function gerarObservacoesCalculo(
  params: ParametrosCalculo,
  descontos: { descricao: string; percentual: number }[]
): string[] {
  const obs: string[] = [];

  if (descontos.length > 0) {
    obs.push(`Descontos aplicados: ${descontos.map(d => `${d.descricao} (${d.percentual}%)`).join(', ')}`);
  }

  if (params.quantidade >= 3) {
    obs.push('Quantidade especial - verificar prazo de entrega');
  }

  if (params.tipoProduto === 'TOMBADOR' && params.comprimento && params.comprimento >= 26) {
    obs.push('Equipamento de grande porte - requer avaliação técnica');
  }

  return obs;
}

// ==================== SIMULAÇÃO ====================

/**
 * Simula diferentes cenários de preço
 */
export async function simularCenarios(
  baseParams: ParametrosCalculo,
  variacoes: { quantidade?: number; desconto?: number }[]
): Promise<ResultadoCalculo[]> {
  const resultados: ResultadoCalculo[] = [];

  for (const variacao of variacoes) {
    const params = {
      ...baseParams,
      quantidade: variacao.quantidade || baseParams.quantidade,
      descontoManual: variacao.desconto || baseParams.descontoManual,
    };

    const resultado = await calcularPreco(params);
    resultados.push(resultado);
  }

  return resultados;
}

// ==================== EXPORTAR PARA PROPOSTA ====================

/**
 * Gera os campos de preço para salvar na proposta
 */
export async function gerarCamposProposta(
  resultado: ResultadoCalculo,
  params: ParametrosCalculo
): Promise<Partial<Proposta>> {
  return {
    valor_equipamento: resultado.subtotal,
    valor_opcionais: resultado.itens
      .filter(i => i.tipo === 'OPCIONAL')
      .reduce((sum, i) => sum + i.valorTotal, 0),
    valor_servicos: resultado.itens
      .filter(i => i.tipo === 'AJUSTE' && i.valorTotal > 0)
      .reduce((sum, i) => sum + i.valorTotal, 0),
    valor_desconto: resultado.totalDescontos,
    valor_total: resultado.valorFinal,
    margem_estimada: resultado.margemEstimada,
    comissao_estimada: resultado.comissaoEstimada,
  };
}

// ==================== REAJUSTE DE PREÇOS ====================

/**
 * Reajusta todos os preços base por percentual
 */
export async function reajustarPrecosBase(
  percentual: number,
  tipoProduto?: ProdutoTipo,
  usuarioId?: string
): Promise<number> {
  const whereClause = tipoProduto ? `WHERE tipo_produto = $2` : '';
  const params = tipoProduto
    ? [percentual, tipoProduto]
    : [percentual];

  const result = await query(
    `UPDATE crm_precos_base
     SET preco = preco * (1 + $1::numeric / 100),
         updated_at = NOW()
     ${whereClause}
     RETURNING id`,
    params
  );

  // Invalida cache após atualização
  invalidarCachePrecos();

  // Registra no histórico
  if (result?.rows) {
    for (const row of result.rows) {
      await query(
        `INSERT INTO crm_precos_historico (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id, motivo)
         SELECT 'crm_precos_base', id, 'preco',
                (preco / (1 + $1::numeric / 100))::text,
                preco::text,
                $2,
                $3
         FROM crm_precos_base WHERE id = $4`,
        [percentual, usuarioId, `Reajuste de ${percentual}%`, row.id]
      );
    }
  }

  return result?.rows?.length || 0;
}

/**
 * Reajusta opcionais por percentual
 */
export async function reajustarOpcionais(
  percentual: number,
  categoriaId?: number,
  usuarioId?: string
): Promise<number> {
  const whereClause = categoriaId ? `WHERE categoria_id = $2 AND tipo_valor = 'FIXO'` : `WHERE tipo_valor = 'FIXO'`;
  const params = categoriaId
    ? [percentual, categoriaId]
    : [percentual];

  const result = await query(
    `UPDATE crm_precos_opcoes
     SET valor = valor * (1 + $1::numeric / 100),
         updated_at = NOW()
     ${whereClause}
     RETURNING id`,
    params
  );

  invalidarCachePrecos();

  return result?.rows?.length || 0;
}
