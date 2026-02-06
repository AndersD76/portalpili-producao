import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calcularPreco, ParametrosCalculo, processarRegras, validarProposta } from '@/lib/comercial';
import { verificarPermissao } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar permissão de visualização
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;

    const result = await query(
      `SELECT
        p.*,
        o.titulo as oportunidade_titulo,
        o.estagio as oportunidade_estagio,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cnpj as cliente_cnpj,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        c.endereco as cliente_endereco,
        c.cidade as cliente_cidade,
        c.estado as cliente_estado,
        v.nome as vendedor_nome,
        v.email as vendedor_email,
        v.telefone as vendedor_telefone,
        json_agg(DISTINCT jsonb_build_object(
          'id', h.id,
          'acao', h.acao,
          'created_at', h.created_at,
          'usuario', h.usuario
        )) FILTER (WHERE h.id IS NOT NULL) as historico,
        json_agg(DISTINCT jsonb_build_object(
          'id', e.id,
          'tipo', e.tipo,
          'destinatario', e.destinatario,
          'assunto', e.assunto,
          'enviado_em', e.enviado_em,
          'status', e.status
        )) FILTER (WHERE e.id IS NOT NULL) as emails
      FROM crm_propostas p
      LEFT JOIN crm_oportunidades o ON p.oportunidade_id = o.id
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      LEFT JOIN crm_propostas_historico h ON p.id = h.proposta_id
      LEFT JOIN crm_propostas_emails e ON p.id = e.proposta_id
      WHERE p.id = $1
      GROUP BY p.id, o.titulo, o.estagio, c.razao_social, c.nome_fantasia, c.cnpj,
               c.telefone, c.email, c.endereco, c.cidade, c.estado,
               v.nome, v.email, v.telefone`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Processa regras para determinar campos visíveis/obrigatórios
    const proposta = result.rows[0];
    const regras = processarRegras(proposta);

    return NextResponse.json({
      success: true,
      data: proposta,
      regras,
    });
  } catch (error) {
    console.error('Erro ao buscar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar proposta' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar permissão de edição
  const auth = await verificarPermissao('COMERCIAL', 'editar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;
    const body = await request.json();

    // Busca proposta atual para histórico
    const propostaAtual = await query(
      `SELECT * FROM crm_propostas WHERE id = $1`,
      [id]
    );

    if (!propostaAtual?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    const {
      tipo_produto,
      modelo,
      comprimento,
      angulo_giro,
      quantidade,
      opcionais_ids,
      dados_cliente,
      dados_entrega,
      condicoes_comerciais,
      valor_equipamento,
      valor_opcionais,
      valor_servicos,
      valor_desconto,
      valor_total,
      situacao,
      observacoes,
      recalcular = false,
      usuario_id,
    } = body;

    // Recalcula preço se solicitado
    let resultadoCalculo = null;
    if (recalcular) {
      const parametros: ParametrosCalculo = {
        tipoProduto: tipo_produto || propostaAtual.rows[0].tipo_produto,
        modelo: modelo || propostaAtual.rows[0].modelo,
        comprimento: comprimento || propostaAtual.rows[0].comprimento,
        quantidade: quantidade || propostaAtual.rows[0].quantidade,
        opcionaisSelecionados: opcionais_ids || propostaAtual.rows[0].opcionais_ids || [],
        segmentoCliente: dados_cliente?.segmento,
        regiaoCliente: dados_entrega?.estado,
        descontoManual: condicoes_comerciais?.desconto_manual,
      };

      resultadoCalculo = await calcularPreco(parametros);
    }

    const result = await query(
      `UPDATE crm_propostas SET
        tipo_produto = COALESCE($2, tipo_produto),
        modelo = COALESCE($3, modelo),
        comprimento = COALESCE($4, comprimento),
        angulo_giro = COALESCE($5, angulo_giro),
        quantidade = COALESCE($6, quantidade),
        opcionais_ids = COALESCE($7, opcionais_ids),
        dados_cliente = COALESCE($8, dados_cliente),
        dados_entrega = COALESCE($9, dados_entrega),
        condicoes_comerciais = COALESCE($10, condicoes_comerciais),
        valor_equipamento = COALESCE($11, valor_equipamento),
        valor_opcionais = COALESCE($12, valor_opcionais),
        valor_servicos = COALESCE($13, valor_servicos),
        valor_desconto = COALESCE($14, valor_desconto),
        valor_total = COALESCE($15, valor_total),
        situacao = COALESCE($16, situacao),
        observacoes = COALESCE($17, observacoes),
        updated_at = NOW(),
        versao = versao + 1
      WHERE id = $1
      RETURNING *`,
      [
        id,
        tipo_produto,
        modelo,
        comprimento,
        angulo_giro,
        quantidade,
        opcionais_ids,
        dados_cliente ? JSON.stringify(dados_cliente) : null,
        dados_entrega ? JSON.stringify(dados_entrega) : null,
        condicoes_comerciais ? JSON.stringify(condicoes_comerciais) : null,
        resultadoCalculo?.subtotal || valor_equipamento,
        resultadoCalculo?.subtotalOpcionais || valor_opcionais,
        valor_servicos,
        resultadoCalculo?.descontoValor || valor_desconto,
        resultadoCalculo?.total || valor_total,
        situacao,
        observacoes,
      ]
    );

    // Registra no histórico
    await query(
      `INSERT INTO crm_propostas_historico (proposta_id, acao, dados_anteriores, dados_novos, usuario)
       VALUES ($1, 'EDICAO', $2, $3, $4)`,
      [id, JSON.stringify(propostaAtual.rows[0]), JSON.stringify(result?.rows[0]), usuario_id]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      calculo: resultadoCalculo,
      message: 'Proposta atualizada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar proposta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar permissão de exclusão
  const auth = await verificarPermissao('COMERCIAL', 'excluir');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;

    // Verifica situação
    const proposta = await query(
      `SELECT situacao FROM crm_propostas WHERE id = $1`,
      [id]
    );

    if (!proposta?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    if (proposta.rows[0].situacao === 'APROVADA') {
      return NextResponse.json(
        { success: false, error: 'Não é possível excluir proposta aprovada' },
        { status: 400 }
      );
    }

    // Soft delete - cancela
    const result = await query(
      `UPDATE crm_propostas SET situacao = 'CANCELADA', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Proposta cancelada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar proposta' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
