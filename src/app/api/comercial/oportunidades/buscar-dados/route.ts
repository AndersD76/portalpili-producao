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

// Consulta CNPJ em paralelo (4 APIs ao mesmo tempo, usa a primeira que responder)
// Mescla dados de múltiplas APIs: preenche campos vazios com dados de outras fontes
function mesclarDados(resultados: ReceitaData[]): ReceitaData {
  const merged: ReceitaData = {};
  for (const r of resultados) {
    for (const [key, val] of Object.entries(r)) {
      if (val !== undefined && val !== null && val !== '' && !(merged as any)[key]) {
        (merged as any)[key] = val;
      }
    }
  }
  return merged;
}

async function consultarCNPJ(cnpj: string): Promise<ReceitaData | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) {
    console.log(`[ConsultaCNPJ] CNPJ inválido (${cnpjLimpo.length} dígitos): ${cnpjLimpo}`);
    return null;
  }

  console.log(`[ConsultaCNPJ] Consultando ${cnpjLimpo} (4 APIs em paralelo, mesclando resultados)...`);

  // Dispara todas as APIs em paralelo
  const tentativas = [
    // 1) BrasilAPI
    fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, { signal: AbortSignal.timeout(12000) })
      .then(async res => {
        if (!res.ok) throw new Error(`BrasilAPI status ${res.status}`);
        const data = await res.json();
        console.log(`[ConsultaCNPJ] BrasilAPI OK para ${cnpjLimpo}`);
        return parseBrasilAPI(data);
      }),
    // 2) ReceitaWS
    fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, { signal: AbortSignal.timeout(12000), headers: { 'Accept': 'application/json' } })
      .then(async res => {
        if (!res.ok) throw new Error(`ReceitaWS status ${res.status}`);
        const data = await res.json();
        if (data.status === 'ERROR') throw new Error(`ReceitaWS ERROR: ${data.message}`);
        console.log(`[ConsultaCNPJ] ReceitaWS OK para ${cnpjLimpo}`);
        return parseReceitaWS(data);
      }),
    // 3) CNPJ.ws
    fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`, { signal: AbortSignal.timeout(12000) })
      .then(async res => {
        if (!res.ok) throw new Error(`CNPJ.ws status ${res.status}`);
        const data = await res.json();
        console.log(`[ConsultaCNPJ] CNPJ.ws OK para ${cnpjLimpo}`);
        return parseCnpjWs(data);
      }),
    // 4) CNPJA Open
    fetch(`https://open.cnpja.com/office/${cnpjLimpo}`, { signal: AbortSignal.timeout(12000), headers: { 'Accept': 'application/json' } })
      .then(async res => {
        if (!res.ok) throw new Error(`CNPJA status ${res.status}`);
        const data = await res.json();
        if (!data?.taxId) throw new Error('CNPJA sem dados');
        console.log(`[ConsultaCNPJ] CNPJA OK para ${cnpjLimpo}`);
        return parseCNPJA(data);
      }),
  ];

  // Espera TODAS as APIs (sucesso ou falha) e mescla os resultados
  const results = await Promise.allSettled(tentativas);
  const sucessos: ReceitaData[] = [];
  const erros: string[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      sucessos.push(r.value);
    } else {
      erros.push(r.reason?.message || String(r.reason));
    }
  }

  console.log(`[ConsultaCNPJ] ${cnpjLimpo}: ${sucessos.length} APIs OK, ${erros.length} falharam${erros.length ? ` (${erros.join(' | ')})` : ''}`);

  if (sucessos.length === 0) {
    ultimoErroConsulta = `APIs: ${erros.join(' | ')}`;
    return null;
  }

  // Mescla dados de todas as APIs que responderam
  return mesclarDados(sucessos);
}

// Armazena último erro para exibir no modal
let ultimoErroConsulta = '';

// Limpa nome da empresa para busca
function limparNomeEmpresa(nome: string): string {
  return nome
    // Remover sufixos jurídicos comuns
    .replace(/\s*(ltda\.?|me\.?|epp\.?|eireli\.?|s\.?\/?a\.?|empresa individual|ss|e importa[cç][aã]o|e exporta[cç][aã]o|com[ée]rcio|ind[uú]stria|comercial|industrial)\s*/gi, ' ')
    .replace(/[.\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Busca CNPJ pelo nome da empresa (múltiplas estratégias)
async function buscarCNPJPorNome(nome: string, cidade?: string, estado?: string): Promise<ReceitaData | null> {
  if (!nome || nome.length < 3) return null;

  const nomeLimpo = limparNomeEmpresa(nome);
  console.log(`[BuscarCNPJ] Nome original: "${nome}" -> Limpo: "${nomeLimpo}" | Cidade: ${cidade || '-'} | Estado: ${estado || '-'}`);

  // Estratégia 1: CasaDosDados (busca por nome completo + filtros)
  let resultado = await buscarViaCasaDosDados(nomeLimpo, cidade, estado);
  if (resultado) return resultado;

  // Estratégia 2: CasaDosDados sem filtro de cidade (às vezes a cidade está diferente)
  if (cidade) {
    resultado = await buscarViaCasaDosDados(nomeLimpo, undefined, estado);
    if (resultado) return resultado;
  }

  // Estratégia 3: Usar apenas as primeiras palavras significativas do nome
  const palavras = nomeLimpo.split(' ').filter(p => p.length > 2);
  if (palavras.length > 2) {
    const nomeReduzido = palavras.slice(0, 2).join(' ');
    console.log(`[BuscarCNPJ] Tentando nome reduzido: "${nomeReduzido}"`);
    resultado = await buscarViaCasaDosDados(nomeReduzido, cidade, estado);
    if (resultado) return resultado;

    // Sem cidade
    if (cidade) {
      resultado = await buscarViaCasaDosDados(nomeReduzido, undefined, estado);
      if (resultado) return resultado;
    }
  }

  // Estratégia 4: CNPJA Open API (busca por razão social)
  resultado = await buscarViaCNPJA(nomeLimpo, estado);
  if (resultado) return resultado;

  console.log(`[BuscarCNPJ] Nenhuma API encontrou CNPJ para "${nome}"`);
  return null;
}

// Busca via CasaDosDados API
async function buscarViaCasaDosDados(nome: string, cidade?: string, estado?: string): Promise<ReceitaData | null> {
  try {
    const body: any = {
      query: {
        termo: [nome],
        situacao_cadastral: 'ATIVA',
      },
      range_query: {},
      extras: {},
      page: 1,
    };

    if (estado) body.query.uf = [estado.toUpperCase()];
    if (cidade) body.query.municipio = [cidade.toUpperCase()];

    const res = await fetch('https://api.casadosdados.com.br/v2/cnpj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.log(`[CasaDosDados] Status ${res.status} para "${nome}"`);
      return null;
    }

    const data = await res.json();
    const resultados = data?.data?.cnpj;
    if (!resultados || resultados.length === 0) {
      console.log(`[CasaDosDados] Sem resultados para "${nome}"`);
      return null;
    }

    // Pegar o primeiro resultado
    const cnpjEncontrado = resultados[0].cnpj?.replace(/\D/g, '');
    if (!cnpjEncontrado) return null;

    console.log(`[CasaDosDados] Encontrou CNPJ ${cnpjEncontrado} para "${nome}" (${resultados.length} resultados)`);

    const dadosCompletos = await consultarCNPJ(cnpjEncontrado);
    if (dadosCompletos) dadosCompletos.cnpj = cnpjEncontrado;
    return dadosCompletos;
  } catch (e) {
    console.log(`[CasaDosDados] Erro para "${nome}":`, e instanceof Error ? e.message : e);
    return null;
  }
}

// Busca via CNPJA Open API (alternativa gratuita)
async function buscarViaCNPJA(nome: string, estado?: string): Promise<ReceitaData | null> {
  try {
    // CNPJA Open permite busca por razão social via query string
    const params = new URLSearchParams({ razao_social: nome });
    if (estado) params.set('estado', estado.toUpperCase());

    const res = await fetch(`https://open.cnpja.com/office/${encodeURIComponent(nome)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.log(`[CNPJA] Status ${res.status} para "${nome}"`);
      return null;
    }

    const data = await res.json();
    if (!data?.taxId) return null;

    const cnpjEncontrado = String(data.taxId).replace(/\D/g, '');
    console.log(`[CNPJA] Encontrou CNPJ ${cnpjEncontrado} para "${nome}"`);

    // Buscar dados completos
    const dadosCompletos = await consultarCNPJ(cnpjEncontrado);
    if (dadosCompletos) dadosCompletos.cnpj = cnpjEncontrado;
    return dadosCompletos;
  } catch (e) {
    console.log(`[CNPJA] Erro para "${nome}":`, e instanceof Error ? e.message : e);
    return null;
  }
}

function parseReceitaWS(data: any): ReceitaData {
  // ReceitaWS pode retornar múltiplos telefones separados por "/" ex: "(42) 3234-8000/4232-3480"
  const primeiroTel = data.telefone ? data.telefone.split('/')[0].trim() : null;
  return {
    cnpj: data.cnpj ? String(data.cnpj).replace(/\D/g, '') : undefined,
    razao_social: data.nome,
    nome_fantasia: data.fantasia,
    telefone: primeiroTel ? formatTelefone(primeiroTel.replace(/[().\-\s]/g, '')) : undefined,
    email: data.email && data.email.trim() !== '' ? data.email.toLowerCase().trim() : undefined,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    cep: data.cep ? data.cep.replace(/[.\-]/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : undefined,
    situacao: data.situacao,
    cnae_fiscal_descricao: data.atividade_principal?.[0]?.text,
    porte: data.porte,
    natureza_juridica: data.natureza_juridica,
    capital_social: data.capital_social ? parseFloat(String(data.capital_social).replace(/\./g, '').replace(',', '.')) : undefined,
    qsa: data.qsa?.map((s: any) => ({ nome_socio: s.nome, qualificacao_socio: s.qual })),
  };
}

function parseCnpjWs(data: any): ReceitaData {
  const estab = data.estabelecimento || {};
  const tel1 = estab.ddd1 && estab.telefone1 ? `${estab.ddd1}${estab.telefone1}` : null;
  return {
    cnpj: estab.cnpj ? String(estab.cnpj).replace(/\D/g, '') : undefined,
    razao_social: data.razao_social,
    nome_fantasia: estab.nome_fantasia,
    telefone: tel1 ? formatTelefone(tel1) : undefined,
    email: estab.email && estab.email.trim() !== '' ? estab.email.toLowerCase().trim() : undefined,
    logradouro: estab.logradouro,
    numero: estab.numero,
    complemento: estab.complemento,
    bairro: estab.bairro,
    municipio: estab.cidade?.nome,
    uf: estab.estado?.sigla,
    cep: estab.cep ? String(estab.cep).replace(/(\d{5})(\d{3})/, '$1-$2') : undefined,
    situacao: estab.situacao_cadastral,
    cnae_fiscal_descricao: estab.atividade_principal?.descricao,
    porte: data.porte?.descricao,
    natureza_juridica: data.natureza_juridica?.descricao,
    capital_social: data.capital_social ? parseFloat(String(data.capital_social)) : undefined,
    qsa: data.socios?.map((s: any) => ({ nome_socio: s.nome, qualificacao_socio: s.qualificacao?.descricao })),
  };
}

function parseCNPJA(data: any): ReceitaData {
  const addr = data.address || {};
  const tel = data.phones?.[0];
  const emails = data.emails?.[0];
  return {
    cnpj: String(data.taxId || '').replace(/\D/g, '') || undefined,
    razao_social: data.company?.name || data.alias || data.name,
    nome_fantasia: data.alias || data.company?.name,
    telefone: tel ? formatTelefone(`${tel.area || ''}${tel.number || ''}`) : undefined,
    email: emails?.address?.toLowerCase() || undefined,
    logradouro: addr.street,
    numero: addr.number,
    complemento: addr.details,
    bairro: addr.district,
    municipio: addr.city,
    uf: addr.state,
    cep: addr.zip ? String(addr.zip).replace(/(\d{5})(\d{3})/, '$1-$2') : undefined,
    situacao: data.status?.text || data.registration?.status,
    cnae_fiscal_descricao: data.mainActivity?.text,
    porte: data.company?.size?.text,
    natureza_juridica: data.company?.nature?.text,
    capital_social: data.company?.equity,
    qsa: data.company?.members?.map((s: any) => ({ nome_socio: s.person?.name || s.name, qualificacao_socio: s.role?.text })),
  };
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
  // Telefone BR: 10 dígitos (fixo) ou 11 dígitos (celular com 9)
  if (limpo.length < 10 || limpo.length > 11) return undefined;
  if (limpo.length === 10) return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 6)}-${limpo.substring(6)}`;
  return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
}

function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '');
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oportunidade_ids, salvar } = body;

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
          const semCNPJ = !info.cnpj;
          resultados.push({
            oportunidade_id: r.oportunidade_id,
            numero_proposta: r.numero_proposta,
            cliente_nome: r.cliente_nome,
            cliente_cnpj: r.cliente_cnpj,
            cliente_id: clienteId,
            status: semCNPJ ? 'sem_cnpj' : 'erro',
            mensagem: semCNPJ
              ? `Sem CNPJ - não encontrado pelo nome "${limparNomeEmpresa(info.nome)}"${info.cidade ? ` em ${info.cidade}` : ''}`
              : `Não foi possível consultar CNPJ${ultimoErroConsulta ? ` (${ultimoErroConsulta})` : ''}`,
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

      console.log(`[BuscarDados] Cliente ${clienteId} "${info.nome}" -> Receita: tel=${receita.telefone || 'N/A'}, email=${receita.email || 'N/A'}`);

      const dadosNovos: Record<string, any> = {};
      const camposAtualizados: string[] = [];

      // Se descobriu CNPJ, salvar
      if (cnpjDescoberto && receita.cnpj) {
        dadosNovos.cpf_cnpj = formatCNPJ(receita.cnpj);
        camposAtualizados.push('cnpj');
        cnpjsDescobertos++;
      }

      // Só preencher campos VAZIOS (não sobrescrever dados existentes)
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

      // Salvar no banco só quando o usuário clicar "Salvar"
      if (salvar && Object.keys(dadosNovos).length > 0) {
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
          status: camposAtualizados.length > 0 ? (salvar ? 'atualizado' : 'dados_novos') : 'completo',
          mensagem: camposAtualizados.length > 0
            ? (salvar ? `Salvo: ${camposAtualizados.join(', ')}` : `Disponível: ${camposAtualizados.join(', ')}`)
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
        completos: resultados.filter(r => r.status === 'completo').length,
        sem_cnpj: resultados.filter(r => r.status === 'sem_cnpj').length,
        erros: resultados.filter(r => r.status === 'erro').length,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados dos clientes:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
}
