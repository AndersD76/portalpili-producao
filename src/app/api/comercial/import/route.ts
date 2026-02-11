import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';
import { normalizarNome, calcularSimilaridade } from '@/lib/comercial/fuzzyMatch';

/**
 * POST /api/comercial/import
 * Importa dados CSV para o CRM (clientes e oportunidades)
 */
export async function POST(request: Request) {
  // Verificar permissão de criação
  const auth = await verificarPermissao('COMERCIAL', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const { tipo, dados, modo = 'preview' } = body;

    if (!tipo || !dados || !Array.isArray(dados)) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos. Envie { tipo: "clientes"|"oportunidades", dados: [...], modo: "preview"|"importar" }' },
        { status: 400 }
      );
    }

    if (tipo === 'clientes') {
      return await importarClientes(dados, modo);
    } else if (tipo === 'oportunidades') {
      return await importarOportunidades(dados, modo);
    }

    return NextResponse.json(
      { success: false, error: 'Tipo inválido. Use "clientes" ou "oportunidades"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro na importação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro na importação' },
      { status: 500 }
    );
  }
}

// ==================== IMPORTAR CLIENTES ====================

interface ClienteCSV {
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  segmento?: string;
  vendedor?: string;
}

async function importarClientes(dados: ClienteCSV[], modo: string) {
  // Buscar clientes existentes para detectar duplicatas
  const existentes = await query(
    `SELECT id, razao_social, nome_fantasia, cpf_cnpj FROM crm_clientes`
  );
  const clientesExistentes = existentes?.rows || [];

  // Buscar vendedores para linkar
  const vendedoresResult = await query(
    `SELECT id, nome FROM crm_vendedores WHERE ativo = true`
  );
  const vendedores = vendedoresResult?.rows || [];

  const resultados: Array<{
    linha: number;
    razao_social: string;
    status: 'importado' | 'duplicata' | 'erro';
    mensagem: string;
    duplicata_id?: number;
    duplicata_nome?: string;
    similaridade?: number;
  }> = [];

  let importados = 0;
  let duplicatas = 0;
  let erros = 0;

  for (let i = 0; i < dados.length; i++) {
    const row = dados[i];

    if (!row.razao_social) {
      resultados.push({
        linha: i + 1,
        razao_social: '-',
        status: 'erro',
        mensagem: 'Razão social obrigatória',
      });
      erros++;
      continue;
    }

    // Verificar duplicata por CNPJ exato
    if (row.cnpj) {
      const cnpjLimpo = row.cnpj.replace(/\D/g, '');
      const dupCnpj = clientesExistentes.find(
        (c: { cpf_cnpj: string }) => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cnpjLimpo
      );
      if (dupCnpj) {
        resultados.push({
          linha: i + 1,
          razao_social: row.razao_social,
          status: 'duplicata',
          mensagem: `CNPJ idêntico ao cliente existente`,
          duplicata_id: dupCnpj.id,
          duplicata_nome: dupCnpj.razao_social,
          similaridade: 1,
        });
        duplicatas++;
        continue;
      }
    }

    // Verificar duplicata por nome similar
    let melhorMatch: { id: number; razao_social: string; sim: number } | null = null;
    for (const existente of clientesExistentes) {
      const sim = calcularSimilaridade(row.razao_social, existente.razao_social);
      if (sim > 0.85 && (!melhorMatch || sim > melhorMatch.sim)) {
        melhorMatch = { id: existente.id, razao_social: existente.razao_social, sim };
      }
    }

    if (melhorMatch) {
      resultados.push({
        linha: i + 1,
        razao_social: row.razao_social,
        status: 'duplicata',
        mensagem: `Nome similar a cliente existente (${(melhorMatch.sim * 100).toFixed(0)}%)`,
        duplicata_id: melhorMatch.id,
        duplicata_nome: melhorMatch.razao_social,
        similaridade: melhorMatch.sim,
      });
      duplicatas++;
      continue;
    }

    // Se modo preview, não insere
    if (modo === 'preview') {
      resultados.push({
        linha: i + 1,
        razao_social: row.razao_social,
        status: 'importado',
        mensagem: 'Pronto para importar',
      });
      importados++;
      continue;
    }

    // Encontrar vendedor por nome
    let vendedorId = null;
    if (row.vendedor) {
      const vendedorMatch = vendedores.find(
        (v: { nome: string }) => calcularSimilaridade(row.vendedor!, v.nome) > 0.7
      );
      if (vendedorMatch) {
        vendedorId = vendedorMatch.id;
      }
    }

    // Inserir no banco
    try {
      await query(
        `INSERT INTO crm_clientes (
          razao_social, nome_fantasia, cpf_cnpj, municipio, estado,
          telefone, email, segmento, vendedor_id, origem
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'IMPORTACAO')`,
        [
          row.razao_social,
          row.nome_fantasia || null,
          row.cnpj ? row.cnpj.replace(/\D/g, '') : null,
          row.cidade || null,
          row.estado || null,
          row.telefone || null,
          row.email || null,
          row.segmento || null,
          vendedorId,
        ]
      );

      resultados.push({
        linha: i + 1,
        razao_social: row.razao_social,
        status: 'importado',
        mensagem: 'Importado com sucesso',
      });
      importados++;
    } catch (err) {
      resultados.push({
        linha: i + 1,
        razao_social: row.razao_social,
        status: 'erro',
        mensagem: `Erro ao inserir: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
      });
      erros++;
    }
  }

  return NextResponse.json({
    success: true,
    modo,
    resumo: {
      total: dados.length,
      importados,
      duplicatas,
      erros,
    },
    detalhes: resultados,
  });
}

// ==================== IMPORTAR OPORTUNIDADES ====================

interface OportunidadeCSV {
  cliente: string; // nome ou CNPJ
  titulo?: string;
  valor?: number;
  estagio?: string;
  vendedor?: string;
  produto?: string;
  observacoes?: string;
}

async function importarOportunidades(dados: OportunidadeCSV[], modo: string) {
  // Buscar clientes para vincular
  const clientesResult = await query(
    `SELECT id, razao_social, nome_fantasia, cpf_cnpj FROM crm_clientes`
  );
  const clientes = clientesResult?.rows || [];

  // Buscar vendedores
  const vendedoresResult = await query(
    `SELECT id, nome FROM crm_vendedores WHERE ativo = true`
  );
  const vendedores = vendedoresResult?.rows || [];

  const estagiosValidos = [
    'EM_ANALISE', 'EM_NEGOCIACAO', 'POS_NEGOCIACAO',
    'FECHADA', 'PERDIDA', 'TESTE', 'SUSPENSO', 'SUBSTITUIDO',
    'PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA',
  ];

  const resultados: Array<{
    linha: number;
    cliente: string;
    status: 'importado' | 'erro';
    mensagem: string;
    cliente_id?: number;
  }> = [];

  let importados = 0;
  let erros = 0;

  for (let i = 0; i < dados.length; i++) {
    const row = dados[i];

    if (!row.cliente) {
      resultados.push({ linha: i + 1, cliente: '-', status: 'erro', mensagem: 'Cliente obrigatório' });
      erros++;
      continue;
    }

    // Encontrar cliente por CNPJ ou nome fuzzy
    let clienteId: number | null = null;
    const cnpjLimpo = row.cliente.replace(/\D/g, '');

    if (cnpjLimpo.length >= 11) {
      const match = clientes.find(
        (c: { cpf_cnpj: string }) => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cnpjLimpo
      );
      if (match) clienteId = match.id;
    }

    if (!clienteId) {
      let melhorSim = 0;
      for (const c of clientes) {
        const sim = Math.max(
          calcularSimilaridade(row.cliente, c.razao_social || ''),
          calcularSimilaridade(row.cliente, c.nome_fantasia || '')
        );
        if (sim > melhorSim && sim > 0.6) {
          melhorSim = sim;
          clienteId = c.id;
        }
      }
    }

    if (!clienteId) {
      resultados.push({ linha: i + 1, cliente: row.cliente, status: 'erro', mensagem: 'Cliente não encontrado no CRM' });
      erros++;
      continue;
    }

    // Validar estágio
    const estagio = row.estagio ? row.estagio.toUpperCase().replace(/\s+/g, '_').replace('PÓS', 'POS').replace('NEGOCIAÇÃO', 'NEGOCIACAO').replace('ANÁLISE', 'ANALISE').replace('NEGOCIAÇAO', 'NEGOCIACAO') : 'EM_ANALISE';
    if (!estagiosValidos.includes(estagio)) {
      resultados.push({ linha: i + 1, cliente: row.cliente, status: 'erro', mensagem: `Estágio inválido: ${row.estagio}` });
      erros++;
      continue;
    }

    if (modo === 'preview') {
      resultados.push({ linha: i + 1, cliente: row.cliente, status: 'importado', mensagem: 'Pronto para importar', cliente_id: clienteId });
      importados++;
      continue;
    }

    // Encontrar vendedor
    let vendedorId = null;
    if (row.vendedor) {
      const vm = vendedores.find(
        (v: { nome: string }) => calcularSimilaridade(row.vendedor!, v.nome) > 0.7
      );
      if (vm) vendedorId = vm.id;
    }

    try {
      await query(
        `INSERT INTO crm_oportunidades (
          titulo, cliente_id, vendedor_id, valor_estimado,
          estagio, status, tipo_produto, observacoes, origem
        ) VALUES ($1, $2, $3, $4, $5, 'ABERTA', $6, $7, 'IMPORTACAO')`,
        [
          row.titulo || `Oportunidade - ${row.cliente}`,
          clienteId,
          vendedorId,
          row.valor || null,
          estagio,
          row.produto || null,
          row.observacoes || null,
        ]
      );

      resultados.push({ linha: i + 1, cliente: row.cliente, status: 'importado', mensagem: 'Importado com sucesso', cliente_id: clienteId });
      importados++;
    } catch (err) {
      resultados.push({ linha: i + 1, cliente: row.cliente, status: 'erro', mensagem: `Erro: ${err instanceof Error ? err.message : 'desconhecido'}` });
      erros++;
    }
  }

  return NextResponse.json({
    success: true,
    modo,
    resumo: {
      total: dados.length,
      importados,
      erros,
    },
    detalhes: resultados,
  });
}

export const dynamic = 'force-dynamic';
