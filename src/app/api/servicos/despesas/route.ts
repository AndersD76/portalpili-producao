import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/servicos/despesas
 * Lista despesas com filtros e paginação
 */
export async function GET(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Filters
    const technician = searchParams.get('technician');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const osv = searchParams.get('osv');
    const client = searchParams.get('client');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (technician) {
      conditions.push(`fe.technician_name = $${paramIndex++}`);
      params.push(technician);
    }
    if (category) {
      conditions.push(`fe.category = $${paramIndex++}`);
      params.push(category);
    }
    if (status) {
      conditions.push(`fe.status = $${paramIndex++}`);
      params.push(status);
    }
    if (dateFrom) {
      conditions.push(`fe.expense_date >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`fe.expense_date <= $${paramIndex++}`);
      params.push(dateTo);
    }
    if (osv) {
      conditions.push(`fe.osv_number ILIKE $${paramIndex++}`);
      params.push(`%${osv}%`);
    }
    if (client) {
      conditions.push(`(fe.client_name ILIKE $${paramIndex} OR fe.client_name_normalized ILIKE $${paramIndex})`);
      params.push(`%${client}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM field_expenses fe ${where}`,
      params
    );
    const total = parseInt(countResult?.rows[0]?.total || '0');

    // Data
    const dataResult = await query(
      `SELECT fe.*, fv.description as vehicle_description
       FROM field_expenses fe
       LEFT JOIN fleet_vehicles fv ON fe.vehicle_id = fv.id
       ${where}
       ORDER BY fe.submitted_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: dataResult?.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao listar despesas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar despesas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/servicos/despesas
 * Cria nova despesa
 */
export async function POST(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();

    const {
      receipt_image_url,
      ai_raw_response,
      ai_confidence,
      technician_name,
      client_name,
      location,
      category,
      expense_date,
      vehicle_id,
      vehicle_km,
      fuel_liters,
      fuel_type,
      service_type,
      service_type_custom,
      auth_code,
      item_description,
      amount,
      payment_method,
      osv_number,
      nf_number,
      notes,
    } = body;

    // Validate required fields
    if (!technician_name || !category || !amount) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: técnico, categoria, valor' },
        { status: 400 }
      );
    }

    // Normalize names for search
    const clientNorm = client_name?.toUpperCase().trim() || null;
    const locationNorm = location?.toUpperCase().trim() || null;

    const result = await query(
      `INSERT INTO field_expenses (
        receipt_image_url, ai_raw_response, ai_confidence,
        technician_name, client_name, client_name_normalized,
        location, location_normalized, category, expense_date,
        vehicle_id, vehicle_km, fuel_liters, fuel_type,
        service_type, service_type_custom,
        auth_code, item_description,
        amount, payment_method, osv_number, nf_number, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id`,
      [
        receipt_image_url || null,
        ai_raw_response ? JSON.stringify(ai_raw_response) : null,
        ai_confidence ? JSON.stringify(ai_confidence) : null,
        technician_name,
        client_name || null,
        clientNorm,
        location || null,
        locationNorm,
        category,
        expense_date || null,
        vehicle_id ? parseInt(vehicle_id) : null,
        vehicle_km ? parseInt(vehicle_km) : null,
        fuel_liters ? parseFloat(fuel_liters) : null,
        fuel_type || null,
        service_type || null,
        service_type_custom || null,
        auth_code || null,
        item_description || null,
        parseFloat(amount),
        payment_method || null,
        osv_number || null,
        nf_number || null,
        notes || null,
      ]
    );

    const id = result?.rows[0]?.id;

    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Despesa registrada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao criar despesa:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao registrar despesa' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
