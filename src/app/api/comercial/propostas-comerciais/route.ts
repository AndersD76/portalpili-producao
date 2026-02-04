import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || searchParams.get('situacao');
    const vendedor_id = searchParams.get('vendedor_id');
    const cliente_id = searchParams.get('cliente_id');
    const produto = searchParams.get('produto');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        p.*,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cpf_cnpj as cliente_cnpj,
        v.nome as vendedor_nome,
        o.titulo as oportunidade_titulo
      FROM crm_propostas p
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      LEFT JOIN crm_oportunidades o ON p.oportunidade_id = o.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND p.situacao = $${paramIndex++}`;
      params.push(status);
    }

    if (vendedor_id) {
      sql += ` AND p.vendedor_id = $${paramIndex++}`;
      params.push(parseInt(vendedor_id));
    }

    if (cliente_id) {
      sql += ` AND p.cliente_id = $${paramIndex++}`;
      params.push(parseInt(cliente_id));
    }

    if (produto) {
      sql += ` AND p.produto = $${paramIndex++}`;
      params.push(produto);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Count total
    let countSql = `SELECT COUNT(*) FROM crm_propostas WHERE 1=1`;
    const countParams: unknown[] = [];
    let countIndex = 1;

    if (status) {
      countSql += ` AND situacao = $${countIndex++}`;
      countParams.push(status);
    }
    if (vendedor_id) {
      countSql += ` AND vendedor_id = $${countIndex++}`;
      countParams.push(parseInt(vendedor_id));
    }
    if (cliente_id) {
      countSql += ` AND cliente_id = $${countIndex++}`;
      countParams.push(parseInt(cliente_id));
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult?.rows[0]?.count || '0');

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar propostas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar propostas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      // Informacoes Gerais
      vendedor_id,
      cliente_id,
      cliente_razao_social,
      prazo_entrega,
      prazo_entrega_outro,
      data_visita,
      validade_proposta,
      chance_negocio,

      // Produto
      produto,
      quantidade,

      // TOMBADOR Config
      tombador_tamanho,
      tombador_tipo,
      tombador_comprimento_trilhos,
      tombador_angulo,
      tombador_complemento_titulo,
      tombador_economizador,
      tombador_economizador_qtd,
      tombador_economizador_valor,
      tombador_calco_manutencao,
      tombador_calco_acionamento,
      tombador_calco_qtd,
      tombador_calco_valor,
      tombador_kit_descida,
      tombador_kit_descida_qtd,
      tombador_kit_descida_valor,
      tombador_mangueiras_hidraulicas,
      tombador_cabos_eletricos,
      tombador_voltagem,
      tombador_frequencia,
      tombador_travamento,
      tombador_travamento_qtd,
      tombador_travamento_valor,
      tombador_rampas,
      tombador_rampas_tipo,
      tombador_enclausuramento,
      tombador_enclausuramento_qtd,
      tombador_enclausuramento_valor,
      tombador_botoeiras,
      tombador_botoeiras_fio_qtd,
      tombador_grelhas,
      tombador_grelhas_qtd,
      tombador_grelhas_valor,
      tombador_varandas,
      tombador_varandas_qtd,
      tombador_varandas_valor,
      tombador_cilindros_tipo,
      tombador_oleo,
      tombador_oleo_valor,
      tombador_outros_requisitos,
      tombador_guindaste,
      tombador_guindaste_qtd,
      tombador_guindaste_valor,

      // COLETOR Config
      coletor_tipo,
      coletor_comprimento_trilhos,
      coletor_grau_rotacao,
      coletor_retorno_grao,
      coletor_retorno_grao_qtd,
      coletor_retorno_grao_valor,
      coletor_tubo_diametro,
      coletor_tubo_qtd,
      coletor_tubo_valor,
      coletor_motor_qtd,
      coletor_voltagem,
      coletor_frequencia,
      coletor_platibanda,
      coletor_platibanda_qtd,
      coletor_platibanda_valor,
      coletor_cadeira_platibanda,
      coletor_cadeira_qtd,
      coletor_cadeira_valor,
      coletor_acionamento,
      coletor_fio_controle_qtd,
      coletor_contactores,
      coletor_contactores_outro,
      coletor_distancia_hidraulica,
      coletor_distancia_ciclone,
      coletor_tipo_escada,
      coletor_oleo,
      coletor_oleo_valor,
      coletor_outros_requisitos,

      // Comercial
      garantia_meses,
      frete_tipo,
      frete_qtd,
      frete_valor,
      deslocamentos_qtd,
      diaria_valor,

      // Valores calculados
      valor_equipamento,
      valor_opcionais,
      valor_total,
    } = body;

    if (!produto) {
      return NextResponse.json(
        { success: false, error: 'Tipo de produto é obrigatório' },
        { status: 400 }
      );
    }

    if (!cliente_id) {
      return NextResponse.json(
        { success: false, error: 'Cliente é obrigatório' },
        { status: 400 }
      );
    }

    // Montar opcionais TOMBADOR como JSON
    const tombadorOpcionais = [];
    if (tombador_economizador === 'COM') {
      tombadorOpcionais.push({ codigo: 'ECONOMIZADOR', qtd: tombador_economizador_qtd, valor: tombador_economizador_valor });
    }
    if (tombador_calco_manutencao === 'COM') {
      tombadorOpcionais.push({ codigo: 'CALCO_MANUTENCAO', qtd: tombador_calco_qtd, valor: tombador_calco_valor, acionamento: tombador_calco_acionamento });
    }
    if (tombador_kit_descida === 'COM') {
      tombadorOpcionais.push({ codigo: 'KIT_DESCIDA', qtd: tombador_kit_descida_qtd, valor: tombador_kit_descida_valor });
    }
    if (tombador_travamento === 'COM') {
      tombadorOpcionais.push({ codigo: 'TRAVAMENTO', qtd: tombador_travamento_qtd, valor: tombador_travamento_valor });
    }
    if (tombador_rampas === 'COM') {
      tombadorOpcionais.push({ codigo: 'RAMPAS', tipo: tombador_rampas_tipo });
    }
    if (tombador_enclausuramento === 'COM') {
      tombadorOpcionais.push({ codigo: 'ENCLAUSURAMENTO', qtd: tombador_enclausuramento_qtd, valor: tombador_enclausuramento_valor });
    }
    if (tombador_grelhas === 'COM') {
      tombadorOpcionais.push({ codigo: 'GRELHAS', qtd: tombador_grelhas_qtd, valor: tombador_grelhas_valor });
    }
    if (tombador_varandas === 'COM') {
      tombadorOpcionais.push({ codigo: 'VARANDAS', qtd: tombador_varandas_qtd, valor: tombador_varandas_valor });
    }
    if (tombador_oleo === 'COM') {
      tombadorOpcionais.push({ codigo: 'OLEO', valor: tombador_oleo_valor });
    }
    if (tombador_guindaste === 'COM') {
      tombadorOpcionais.push({ codigo: 'GUINDASTE', qtd: tombador_guindaste_qtd, valor: tombador_guindaste_valor });
    }

    // Montar opcionais COLETOR como JSON
    const coletorOpcionais = [];
    if (coletor_retorno_grao === 'COM RETORNO DE GRÃO') {
      coletorOpcionais.push({ codigo: 'RETORNO_GRAO', qtd: coletor_retorno_grao_qtd, valor: coletor_retorno_grao_valor });
    }
    if (coletor_tubo_diametro === '4 POLEGADAS') {
      coletorOpcionais.push({ codigo: 'TUBO_4POL', qtd: coletor_tubo_qtd, valor: coletor_tubo_valor });
    }
    if (coletor_platibanda === 'COM PLATIBANDA') {
      coletorOpcionais.push({ codigo: 'PLATIBANDA', qtd: coletor_platibanda_qtd, valor: coletor_platibanda_valor });
    }
    if (coletor_cadeira_platibanda === 'COM CADEIRA') {
      coletorOpcionais.push({ codigo: 'CADEIRA_PLATIBANDA', qtd: coletor_cadeira_qtd, valor: coletor_cadeira_valor });
    }
    if (coletor_oleo === 'COM') {
      coletorOpcionais.push({ codigo: 'OLEO', valor: coletor_oleo_valor });
    }

    // Determinar prazo de entrega final
    const prazoFinal = prazo_entrega === 'outro' ? parseInt(prazo_entrega_outro) : parseInt(prazo_entrega);

    // Calcular data de validade
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + (validade_proposta || 15));

    // 1. Criar Oportunidade vinculada
    const oportunidadeResult = await query(`
      INSERT INTO crm_oportunidades (
        cliente_id, vendedor_id, titulo, descricao, produto,
        valor_estimado, probabilidade, data_previsao_fechamento,
        origem, estagio, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '${prazoFinal || 120} days', 'PROPOSTA COMERCIAL', 'PROPOSTA', 'ABERTA')
      RETURNING id`,
      [
        cliente_id,
        vendedor_id,
        `${produto} ${produto === 'TOMBADOR' ? (tombador_tamanho || '') + 'm' : (coletor_grau_rotacao || '') + '°'} - ${cliente_razao_social || 'Cliente'}`,
        `Proposta comercial para ${produto}`,
        produto,
        valor_total || 0,
        chance_negocio || 7,
      ]
    );
    const oportunidade_id = oportunidadeResult?.rows[0]?.id;

    // 2. Criar Proposta
    const result = await query(`
      INSERT INTO crm_propostas (
        vendedor_id, cliente_id, oportunidade_id,
        situacao, data_visita, validade_dias, data_validade, prazo_entrega_dias,
        produto, chance_concretizacao,
        tombador_tamanho, tombador_tipo, tombador_complemento_titulo, tombador_comprimento_trilhos,
        tombador_opcionais, tombador_voltagem, tombador_frequencia, tombador_qt_mangueiras,
        tombador_qt_cabos_eletricos, tombador_botoeiras, tombador_qt_fio_botoeira,
        tombador_tipo_cilindros, tombador_angulo_inclinacao, tombador_outros_requisitos,
        tombador_preco_base, tombador_subtotal_opcionais, tombador_quantidade, tombador_total_geral,
        coletor_grau_rotacao, coletor_tipo, coletor_comprimento_trilhos,
        coletor_opcionais, coletor_voltagem, coletor_frequencia, coletor_qt_motor,
        coletor_marca_contactores, coletor_distancia_hidraulica, coletor_distancia_ciclone,
        coletor_tipo_escada, coletor_acionamento_comando, coletor_qt_fio_controle, coletor_diametro_tubo,
        coletor_outros_requisitos, coletor_preco_base, coletor_subtotal_opcionais, coletor_quantidade, coletor_total_geral,
        garantia_meses, frete_tipo, frete_valor, qt_deslocamentos, valor_diaria, valor_total,
        created_by
      ) VALUES (
        $1, $2, $3,
        'RASCUNHO', $4, $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27,
        $28, $29, $30,
        $31, $32, $33, $34,
        $35, $36, $37,
        $38, $39, $40, $41,
        $42, $43, $44, $45, $46,
        $47, $48, $49, $50, $51, $52,
        $53
      )
      RETURNING *
    `, [
      vendedor_id, cliente_id, oportunidade_id,
      data_visita || null, validade_proposta || 15, dataValidade, prazoFinal || 120,
      produto, chance_negocio || 7,
      // Tombador
      produto === 'TOMBADOR' ? tombador_tamanho : null,
      produto === 'TOMBADOR' ? tombador_tipo : null,
      produto === 'TOMBADOR' ? tombador_complemento_titulo : null,
      produto === 'TOMBADOR' && tombador_tipo === 'MOVEL' ? tombador_comprimento_trilhos : null,
      JSON.stringify(tombadorOpcionais),
      tombador_voltagem || '380',
      tombador_frequencia || '60',
      tombador_mangueiras_hidraulicas || 7,
      tombador_cabos_eletricos || 1,
      tombador_botoeiras,
      tombador_botoeiras === 'COM FIO' ? tombador_botoeiras_fio_qtd : null,
      tombador_cilindros_tipo || 'INTERNOS',
      tombador_angulo || '40',
      tombador_outros_requisitos,
      produto === 'TOMBADOR' ? valor_equipamento : null,
      produto === 'TOMBADOR' ? valor_opcionais : null,
      produto === 'TOMBADOR' ? quantidade : null,
      produto === 'TOMBADOR' ? valor_total : null,
      // Coletor
      produto === 'COLETOR' ? coletor_grau_rotacao : null,
      produto === 'COLETOR' ? coletor_tipo : null,
      produto === 'COLETOR' && coletor_tipo === 'MOVEL' ? coletor_comprimento_trilhos : null,
      JSON.stringify(coletorOpcionais),
      coletor_voltagem || '220',
      coletor_frequencia || '60',
      coletor_motor_qtd,
      coletor_contactores === 'OUTRA' ? coletor_contactores_outro : coletor_contactores,
      coletor_distancia_hidraulica || 2,
      coletor_distancia_ciclone || 2,
      coletor_tipo_escada,
      coletor_acionamento,
      coletor_acionamento?.includes('COM FIO') ? coletor_fio_controle_qtd : null,
      coletor_tubo_diametro,
      coletor_outros_requisitos,
      produto === 'COLETOR' ? valor_equipamento : null,
      produto === 'COLETOR' ? valor_opcionais : null,
      produto === 'COLETOR' ? quantidade : null,
      produto === 'COLETOR' ? valor_total : null,
      // Comercial
      garantia_meses || 12,
      frete_tipo || 'CIF',
      frete_tipo === 'CIF' ? (frete_qtd || 1) * (frete_valor || 0) : 0,
      deslocamentos_qtd || 1,
      diaria_valor || 2500,
      valor_total || 0,
      vendedor_id
    ]);

    // 3. Criar atividade de follow-up
    if (oportunidade_id) {
      await query(`
        INSERT INTO crm_atividades (
          oportunidade_id, cliente_id, vendedor_id,
          tipo, titulo, descricao, data_agendada, status
        ) VALUES ($1, $2, $3, 'LIGACAO', 'Follow-up da proposta', 'Entrar em contato para discutir a proposta enviada', NOW() + INTERVAL '3 days', 'PENDENTE')`,
        [oportunidade_id, cliente_id, vendedor_id]
      );

      // 4. Registrar interacao
      await query(`
        INSERT INTO crm_interacoes (
          cliente_id, oportunidade_id, proposta_id, vendedor_id,
          tipo, descricao, dados
        ) VALUES ($1, $2, $3, $4, 'PROPOSTA_CRIADA', 'Nova proposta comercial criada', $5)`,
        [
          cliente_id, oportunidade_id, result?.rows[0]?.id, vendedor_id,
          JSON.stringify({ produto, valor_total, quantidade })
        ]
      );
    }

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      oportunidade_id,
      message: 'Proposta comercial criada com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar proposta comercial: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
