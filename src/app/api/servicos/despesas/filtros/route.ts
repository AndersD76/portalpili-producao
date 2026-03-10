import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/servicos/despesas/filtros
 * Retorna valores únicos para filtros em cascata + técnicos e veículos
 */
export async function GET() {
  const auth = await verificarPermissao('SERVICOS', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const [techniciansRes, vehiclesRes, categoriesRes, statusesRes] = await Promise.all([
      query(`SELECT id, name FROM technicians WHERE active = true ORDER BY name`),
      query(`SELECT id, plate, model, description FROM fleet_vehicles WHERE active = true ORDER BY description`),
      query(`SELECT DISTINCT category FROM field_expenses ORDER BY category`),
      query(`SELECT DISTINCT status FROM field_expenses ORDER BY status`),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        technicians: techniciansRes?.rows || [],
        vehicles: vehiclesRes?.rows || [],
        categories: (categoriesRes?.rows || []).map((r: { category: string }) => r.category),
        statuses: (statusesRes?.rows || []).map((r: { status: string }) => r.status),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar filtros:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar filtros' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
