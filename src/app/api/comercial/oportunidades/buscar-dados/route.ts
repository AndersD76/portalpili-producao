import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ReceitaData {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  situacao?: string;
  cnae_fiscal_descricao?: string;
  cnae_fiscal?: number;
  porte?: string;
  natureza_juridica?: string;
  capital_social?: number;
  data_inicio_atividade?: string;
  qsa?: Array<{ nome_socio: string; qualificacao_socio: string }>;
}

// Consulta CNPJ direto na BrasilAPI
async function consultarCNPJ(cnpj: string): Promise<ReceitaData | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseBrasilAPI(data);
  } catch (e) {
    console.log('Erro ao consultar CNPJ:', cnpjLimpo, e);
    return null;
  }
}

// Busca CNPJ pelo nome da empresa via CasaDosDados
async function buscarCNPJPorNome(nome: string, cidade?: string, estado?: string): Promise<ReceitaData | null> {
  if (!nome || nome.length < 3) return null;

  // Limpar nome - remover sufixos comuns, pontuação etc.
  const nomeLimpo = nome
    .replace(/\s*(ltda|me|epp|eireli|s\.?a\.?|s\/a|empresa individual|ss)\s*\.?\s*$/i, '')
    .replace(/[.-]/g, ' ')
    .trim();

  try {
    // CasaDosDados API - busca por nome
    const body: any = {
      query: {
        termo: [nomeLimpo],
        situacao_cadastral: 'ATIVA',
      },
      range_query: {},
      extras: {},
      page: 1,
    };

    // Add city/state filters if available
    if (estado) {
      body.query.uf = [estado.toUpperCase()];
    }
    if (cidade) {
      body.query.municipio = [cidade.toUpperCase()];
    }

    const res = await fetch('https://api.casadosdados.com.br/v2/cnpj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log('CasaDosDados respondeu:', res.status);
      return null;
    }

    const data = await res.json();
    const resultados = data?.data?.cnpj;

    if (!resultados || resultados.length === 0) return null;

    // Pegar o primeiro resultado (mais relevante)
    const primeiro = resultados[0];
    const cnpjEncontrado = primeiro.cnpj?.replace(/\D/g, '');

    if (!cnpjEncontrado) return null;

    // Agora consultar os dados completos via BrasilAPI
    const dadosCompletos = await consultarCNPJ(cnpjEncontrado);
    if (dadosCompletos) {
      dadosCompletos.cnpj = cnpjEncontrado;
    }
    return dadosCompletos;
  } catch (e) {
    console.log('Erro ao buscar CNPJ por nome:', nomeLimpo, e);

    // Fallback: tentar BrasilAPI com busca direta (não suportado, mas tenta receitaws)
    return null;
  }
}

function parseBrasilAPI(data: any): ReceitaData {
  return {
    cnpj: data.cnpj ? String(data.cnpj).replace(/\D/g, '') : undefined,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    telefone: data.ddd_telefone_1 ? formatTelefone(data.ddd_telefone_1) : undefined,
    email: data.email && data.email.trim() !== '' ? data.email.toLowerCase().trim() : undefined,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : undefined,
    situacao: data.descricao_situacao_cadastral,
    cnae_fiscal_descricao: data.cnae_fiscal_descricao,
    cnae_fiscal: data.cnae_fiscal,
    porte: data.descricao_porte,
    natureza_juridica: data.natureza_juridica,
    capital_social: data.capital_social,
    data_inicio_atividade: data.data_inicio_atividade,
    qsa: data.qsa,
  };
}

function formatTelefone(raw: string): string | undefined {
  if (!raw || raw.trim() === '') return undefined;
  const limpo = raw.replace(/\D/g, '');
  if (limpo.length < 8) return undefined;
  if (limpo.length <= 10) return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 6)}-${limpo.substring(6)}`;
  return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
}

function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '');
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oportunidade_ids, atualizar } = body;

    if (!oportunidade_ids || !Array.isArray(oportunidade_ids) || oportunidade_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'IDs de oportunidades são obrigatórios' }, { status: 400 });
    }

    if (oportunidade_ids.length > 50) {
      return NextResponse.json({ success: false, error: 'Máximo de 50 propostas por vez' }, { status: 400 });
    }

    const placeholders = oportunidade_ids.map((_: number, i: number) => `$${i + 1}`).join(',');

    const result = await query(
      `SELECT
        o.id as oportunidade_id,
        o.titulo,
        o.numero_proposta,
        o.estagio,
        o.valor_estimado,
        o.cliente_id,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cpf_cnpj as cliente_cnpj,
        c.contato_nome,
        c.contato_cargo,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        c.whatsapp as cliente_whatsapp,
        c.cep,
        c.logradouro,
        c.numero as endereco_numero,
        c.bairro,
        c.cidade,
        c.estado,
        v.nome as vendedor_nome
      FROM crm_oportunidades o
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON o.vendedor_id = v.id
      WHERE o.id IN (${placeholders})
      ORDER BY c.razao_social`,
      oportunidade_ids
    );

    const propostas = result.rows;

    // Group by client to avoid duplicate lookups
    const clienteMap = new Map<number, { cnpj: string | null; nome: string; cidade: string | null; estado: string | null; rows: any[] }>();
    for (const row of propostas) {
      if (!row.cliente_id) continue;
      if (!clienteMap.has(row.cliente_id)) {
        clienteMap.set(row.cliente_id, {
          cnpj: row.cliente_cnpj,
          nome: row.cliente_nome || row.titulo,
          cidade: row.cidade,
          estado: row.estado,
          rows: [],
        });
      }
      clienteMap.get(row.cliente_id)!.rows.push(row);
    }

    const resultados: any[] = [];
    let atualizados = 0;
    let cnpjsDescobertos = 0;
    let erros = 0;

    for (const [clienteId, info] of clienteMap.entries()) {
      let receita: ReceitaData | null = null;
      let cnpjDescoberto = false;

      if (info.cnpj) {
        // Tem CNPJ -> consulta direto
        receita = await consultarCNPJ(info.cnpj);
      } else {
        // Sem CNPJ -> busca pelo nome + cidade
        receita = await buscarCNPJPorNome(info.nome, info.cidade || undefined, info.estado || undefined);
        if (receita?.cnpj) {
          cnpjDescoberto = true;
        }
      }

      const row = info.rows[0];

      if (!receita) {
        erros++;
        for (const r of info.rows) {
          resultados.push({
            oportunidade_id: r.oportunidade_id,
            numero_proposta: r.numero_proposta,
            cliente_nome: r.cliente_nome,
            cliente_cnpj: r.cliente_cnpj,
            cliente_id: clienteId,
            status: 'erro',
            mensagem: info.cnpj ? 'Não foi possível consultar CNPJ' : 'CNPJ não encontrado pelo nome',
            dados_atuais: {
              telefone: r.cliente_telefone,
              email: r.cliente_email,
              whatsapp: r.cliente_whatsapp,
              contato_nome: r.contato_nome,
            },
          });
        }
        // Delay between calls
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      const dadosNovos: Record<string, any> = {};
      const camposAtualizados: string[] = [];

      // Se descobriu CNPJ, salvar
      if (cnpjDescoberto && receita.cnpj) {
        dadosNovos.cpf_cnpj = formatCNPJ(receita.cnpj);
        camposAtualizados.push('cnpj');
        cnpjsDescobertos++;
      }

      // Only fill empty fields
      if (!row.cliente_telefone && receita.telefone) {
        dadosNovos.telefone = receita.telefone;
        camposAtualizados.push('telefone');
      }
      if (!row.cliente_email && receita.email) {
        dadosNovos.email = receita.email;
        camposAtualizados.push('email');
      }
      if (!row.cliente_fantasia && receita.nome_fantasia) {
        dadosNovos.nome_fantasia = receita.nome_fantasia;
        camposAtualizados.push('nome_fantasia');
      }
      if (!row.cep && receita.cep) {
        dadosNovos.cep = receita.cep;
        camposAtualizados.push('cep');
      }
      if (!row.logradouro && receita.logradouro) {
        dadosNovos.logradouro = receita.logradouro;
        if (receita.numero) dadosNovos.numero = receita.numero;
        if (receita.complemento) dadosNovos.complemento = receita.complemento;
        camposAtualizados.push('endereço');
      }
      if (!row.bairro && receita.bairro) {
        dadosNovos.bairro = receita.bairro;
      }
      if (!row.cidade && receita.municipio) {
        dadosNovos.cidade = receita.municipio;
        camposAtualizados.push('cidade');
      }
      if (!row.estado && receita.uf) {
        dadosNovos.estado = receita.uf;
        camposAtualizados.push('estado');
      }

      // Update DB if requested
      if (atualizar && Object.keys(dadosNovos).length > 0) {
        const setClauses: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [key, val] of Object.entries(dadosNovos)) {
          setClauses.push(`${key} = $${idx++}`);
          values.push(val);
        }
        setClauses.push(`updated_at = NOW()`);
        values.push(clienteId);

        try {
          await query(
            `UPDATE crm_clientes SET ${setClauses.join(', ')} WHERE id = $${idx}`,
            values
          );
          atualizados++;
        } catch (e) {
          console.error('Erro ao atualizar cliente:', clienteId, e);
          erros++;
        }
      }

      const socios = receita.qsa?.slice(0, 3).map(s => s.nome_socio).join(', ') || null;

      for (const r of info.rows) {
        resultados.push({
          oportunidade_id: r.oportunidade_id,
          numero_proposta: r.numero_proposta,
          cliente_nome: r.cliente_nome,
          cliente_cnpj: r.cliente_cnpj || (receita.cnpj ? formatCNPJ(receita.cnpj) : null),
          cliente_id: clienteId,
          cnpj_descoberto: cnpjDescoberto,
          status: camposAtualizados.length > 0 ? (atualizar ? 'atualizado' : 'dados_novos') : 'completo',
          mensagem: camposAtualizados.length > 0
            ? (atualizar ? `Atualizado: ${camposAtualizados.join(', ')}` : `Dados disponíveis: ${camposAtualizados.join(', ')}`)
            : 'Dados já completos',
          dados_atuais: {
            telefone: r.cliente_telefone,
            email: r.cliente_email,
            whatsapp: r.cliente_whatsapp,
            contato_nome: r.contato_nome,
          },
          dados_receita: {
            cnpj: receita.cnpj ? formatCNPJ(receita.cnpj) : null,
            razao_social: receita.razao_social,
            telefone: receita.telefone,
            email: receita.email,
            nome_fantasia: receita.nome_fantasia,
            endereco: receita.logradouro ? `${receita.logradouro}, ${receita.numero || 'S/N'} - ${receita.bairro || ''} - ${receita.municipio || ''}/${receita.uf || ''}` : null,
            cep: receita.cep,
            situacao: receita.situacao,
            cnae: receita.cnae_fiscal_descricao,
            porte: receita.porte,
            capital_social: receita.capital_social,
            socios,
          },
          campos_atualizados: camposAtualizados,
        });
      }

      // Delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Add proposals without client_id
    for (const row of propostas) {
      if (!row.cliente_id) {
        resultados.push({
          oportunidade_id: row.oportunidade_id,
          numero_proposta: row.numero_proposta,
          cliente_nome: row.cliente_nome || row.titulo,
          cliente_cnpj: null,
          status: 'erro',
          mensagem: 'Proposta sem cliente vinculado',
          dados_atuais: {},
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: resultados,
      resumo: {
        total: resultados.length,
        atualizados,
        cnpjs_descobertos: cnpjsDescobertos,
        dados_novos: resultados.filter(r => r.status === 'dados_novos').length,
        completos: resultados.filter(r => r.status === 'completo').length,
        erros,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados dos clientes:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
}
