import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ativo = searchParams.get('ativo');

    let sql = `
      SELECT
        v.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        COUNT(DISTINCT o.id) as total_oportunidades,
        COUNT(DISTINCT CASE WHEN o.estagio = 'FECHAMENTO' AND o.status = 'GANHA' THEN o.id END) as oportunidades_ganhas,
        SUM(CASE WHEN o.estagio = 'FECHAMENTO' AND o.status = 'GANHA' THEN o.valor_estimado ELSE 0 END) as valor_total_ganho,
        COUNT(DISTINCT c.id) as total_clientes
      FROM crm_vendedores v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      LEFT JOIN crm_clientes c ON v.id = c.vendedor_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (ativo !== null) {
      sql += ` AND v.ativo = $${paramIndex++}`;
      params.push(ativo === 'true');
    }

    sql += `
      GROUP BY v.id, u.nome, u.email
      ORDER BY v.nome
    `;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar vendedores:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar vendedores' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nome,
      email,
      telefone,
      cargo,
      meta_mensal,
      comissao_padrao,
      avatar_url,
    } = body;

    if (!nome || !email) {
      return NextResponse.json(
        { success: false, error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se já existe vendedor com este email
    const existing = await query(
      'SELECT id FROM crm_vendedores WHERE email = $1',
      [email]
    );

    if (existing?.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Já existe um vendedor com este email' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO crm_vendedores (
        nome, email, telefone, cargo, meta_mensal,
        comissao_padrao, avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        nome,
        email,
        telefone || null,
        cargo || 'VENDEDOR',
        meta_mensal || 0,
        comissao_padrao || 0.048,
        avatar_url || null,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Vendedor criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar vendedor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar vendedor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
