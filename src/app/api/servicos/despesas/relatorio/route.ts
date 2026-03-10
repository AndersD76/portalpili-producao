import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/servicos/despesas/relatorio
 * Dados agregados para relatório imprimível
 */
export async function GET(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const technician = searchParams.get('technician');
    const osv = searchParams.get('osv');
    const client = searchParams.get('client');
    const category = searchParams.get('category');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dateFrom) { conditions.push(`fe.expense_date >= $${idx++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`fe.expense_date <= $${idx++}`); params.push(dateTo); }
    if (technician) { conditions.push(`fe.technician_name = $${idx++}`); params.push(technician); }
    if (osv) { conditions.push(`fe.osv_number ILIKE $${idx++}`); params.push(`%${osv}%`); }
    if (client) { conditions.push(`(fe.client_name ILIKE $${idx} OR fe.client_name_normalized ILIKE $${idx})`); params.push(`%${client}%`); idx++; }
    if (category) { conditions.push(`fe.category = $${idx++}`); params.push(category); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // All matching expenses
    const expensesRes = await query(
      `SELECT fe.*, fv.description as vehicle_description
       FROM field_expenses fe
       LEFT JOIN fleet_vehicles fv ON fe.vehicle_id = fv.id
       ${where}
       ORDER BY fe.expense_date ASC, fe.technician_name`,
      params
    );
    const expenses = expensesRes?.rows || [];

    // Summary by category
    const byCategoryRes = await query(
      `SELECT category, COUNT(*) as qty, SUM(amount) as total
       FROM field_expenses fe ${where}
       GROUP BY category ORDER BY total DESC`,
      params
    );

    // Summary by technician
    const byTechRes = await query(
      `SELECT technician_name, category, COUNT(*) as qty, SUM(amount) as total
       FROM field_expenses fe ${where}
       GROUP BY technician_name, category
       ORDER BY technician_name, category`,
      params
    );

    // Summary by location
    const byLocationRes = await query(
      `SELECT COALESCE(location, 'Não informado') as location, COUNT(*) as qty, SUM(amount) as total
       FROM field_expenses fe ${where}
       GROUP BY location ORDER BY total DESC`,
      params
    );

    // Fuel / logistics
    const fuelRes = await query(
      `SELECT fe.technician_name, fv.description as vehicle_description,
              MIN(fe.vehicle_km) as km_min, MAX(fe.vehicle_km) as km_max,
              SUM(fe.fuel_liters) as total_liters, SUM(fe.amount) as total_fuel
       FROM field_expenses fe
       LEFT JOIN fleet_vehicles fv ON fe.vehicle_id = fv.id
       ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} fe.category = 'Combustível' AND fe.vehicle_km IS NOT NULL
       GROUP BY fe.technician_name, fv.description`,
      params
    );

    // Meals average
    const mealsRes = await query(
      `SELECT technician_name, COUNT(*) as qty, AVG(amount) as avg_amount, SUM(amount) as total
       FROM field_expenses fe
       ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} fe.category IN ('Almoço', 'Janta', 'Café', 'Lanche')
       GROUP BY technician_name ORDER BY technician_name`,
      params
    );

    const grandTotal = expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        grandTotal,
        totalCount: expenses.length,
        byCategory: byCategoryRes?.rows || [],
        byTechnician: byTechRes?.rows || [],
        byLocation: byLocationRes?.rows || [],
        fuel: fuelRes?.rows || [],
        meals: mealsRes?.rows || [],
        filters: { dateFrom, dateTo, technician, osv, client, category },
      },
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ success: false, error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
