import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar perguntas de um setor pelo código
// Usado pelos formulários de produção para carregar as perguntas dinamicamente
export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;

    const result = await pool.query(`
      SELECT
        p.id,
        p.codigo,
        p.descricao,
        p.etapa,
        p.avaliacao,
        p.medida_critica as "medidaCritica",
        p.metodo_verificacao as "metodoVerificacao",
        p.instrumento,
        p.criterios_aceitacao as "criteriosAceitacao",
        p.opcoes,
        p.requer_imagem as "requerImagem",
        p.imagem_descricao as "imagemDescricao",
        p.tipo_resposta as "tipoResposta",
        p.ordem,
        s.codigo as setor_codigo,
        s.nome as setor_nome,
        s.processo as setor_processo
      FROM cq_perguntas p
      JOIN cq_setores s ON s.id = p.setor_id
      WHERE s.codigo = $1 AND s.ativo = true AND p.ativo = true
      ORDER BY p.ordem, p.id
    `, [codigo.toUpperCase()]);

    if (result.rows.length === 0) {
      // Verificar se o setor existe mas não tem perguntas
      const setorCheck = await pool.query(
        'SELECT * FROM cq_setores WHERE codigo = $1 AND ativo = true',
        [codigo.toUpperCase()]
      );

      if (setorCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Setor não encontrado',
          useDefault: true // Indica que deve usar o arquivo padrão
        });
      }

      // Setor existe mas sem perguntas
      return NextResponse.json({
        success: true,
        data: {
          setor: setorCheck.rows[0],
          perguntas: []
        }
      });
    }

    // Formatar perguntas
    const perguntas = result.rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      descricao: row.descricao,
      etapa: row.etapa,
      avaliacao: row.avaliacao,
      medidaCritica: row.medidaCritica,
      metodoVerificacao: row.metodoVerificacao,
      instrumento: row.instrumento,
      criteriosAceitacao: row.criteriosAceitacao,
      opcoes: row.opcoes || ['Conforme', 'Não conforme'],
      requerImagem: row.requerImagem,
      imagemDescricao: row.imagemDescricao,
      tipoResposta: row.tipoResposta
    }));

    return NextResponse.json({
      success: true,
      data: {
        setor: {
          codigo: result.rows[0].setor_codigo,
          nome: result.rows[0].setor_nome,
          processo: result.rows[0].setor_processo
        },
        perguntas
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perguntas do setor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar perguntas', useDefault: true },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
