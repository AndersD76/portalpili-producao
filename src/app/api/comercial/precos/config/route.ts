import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get('grupo');
    const chave = searchParams.get('chave');

    let sql = `SELECT * FROM crm_precos_config WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (grupo) {
      sql += ` AND grupo = $${paramIndex++}`;
      params.push(grupo);
    }

    if (chave) {
      sql += ` AND chave = $${paramIndex++}`;
      params.push(chave);
    }

    sql += ` ORDER BY grupo, chave`;

    const result = await query(sql, params);

    // Se solicitou uma chave específica, retorna apenas o valor
    if (chave && result?.rows[0]) {
      const config = result.rows[0];
      let valor = config.valor;

      // Converte conforme o tipo
      if (config.tipo === 'NUMBER') {
        valor = parseFloat(valor);
      } else if (config.tipo === 'BOOLEAN') {
        valor = valor === 'true';
      } else if (config.tipo === 'JSON') {
        try {
          valor = JSON.parse(valor);
        } catch {
          // Mantém como string se não for JSON válido
        }
      }

      return NextResponse.json({
        success: true,
        data: { ...config, valor_convertido: valor },
      });
    }

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chave, valor, tipo, descricao, grupo } = body;

    if (!chave || valor === undefined) {
      return NextResponse.json(
        { success: false, error: 'Chave e valor são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se já existe
    const existing = await query(
      'SELECT id FROM crm_precos_config WHERE chave = $1',
      [chave]
    );

    if (existing?.rowCount && existing.rowCount > 0) {
      // Atualiza
      const result = await query(
        `UPDATE crm_precos_config
         SET valor = $1, tipo = $2, descricao = $3, grupo = $4, updated_at = NOW()
         WHERE chave = $5
         RETURNING *`,
        [String(valor), tipo || 'STRING', descricao, grupo, chave]
      );

      return NextResponse.json({
        success: true,
        data: result?.rows[0],
        message: 'Configuração atualizada com sucesso',
      });
    }

    const result = await query(
      `INSERT INTO crm_precos_config (chave, valor, tipo, descricao, grupo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [chave, String(valor), tipo || 'STRING', descricao, grupo]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Configuração criada com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar/atualizar configuração:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar/atualizar configuração' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
