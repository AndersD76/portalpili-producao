import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Listar reclamações de clientes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cliente = searchParams.get('cliente');
    const countOnly = searchParams.get('count');

    let query = 'SELECT * FROM reclamacoes_clientes';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (cliente) {
      params.push(`%${cliente}%`);
      conditions.push(`cliente_nome ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created DESC';

    const result = await pool.query(query, params);

    if (countOnly === 'true') {
      return NextResponse.json({
        success: true,
        count: result.rows.filter(rec => rec.status !== 'FECHADA').length
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao buscar reclamações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar reclamações' },
      { status: 500 }
    );
  }
}

// POST - Criar reclamação de cliente
export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      data_reclamacao,
      cliente_nome,
      cliente_contato,
      cliente_email,
      cliente_telefone,
      numero_opd,
      numero_serie,
      tipo_reclamacao,
      descricao,
      evidencias,
      impacto,
      created_by
    } = body;

    // Validações
    if (!data_reclamacao || !cliente_nome || !descricao) {
      return NextResponse.json(
        { success: false, error: 'Data, cliente e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Gerar número da reclamação (REC-ANO-SEQUENCIA)
    const year = new Date().getFullYear();
    const seqResult = await client.query("SELECT nextval('seq_reclamacao_cliente') as seq");
    const seq = seqResult.rows[0].seq.toString().padStart(4, '0');
    const numero = `REC-${year}-${seq}`;

    const result = await client.query(`
      INSERT INTO reclamacoes_clientes (
        numero, data_reclamacao, cliente_nome, cliente_contato, cliente_email,
        cliente_telefone, numero_opd, numero_serie, tipo_reclamacao, descricao,
        evidencias, impacto, status, created_by, created, updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      numero,
      data_reclamacao,
      cliente_nome,
      cliente_contato || null,
      cliente_email || null,
      cliente_telefone || null,
      numero_opd || null,
      numero_serie || null,
      tipo_reclamacao || null,
      descricao,
      evidencias ? JSON.stringify(evidencias) : null,
      impacto || null,
      'ABERTA',
      created_by || null,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Reclamação registrada com sucesso'
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar reclamação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar reclamação' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
