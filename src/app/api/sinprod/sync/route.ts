import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { buscarOPDsSinprod, SinprodOPD } from '@/lib/firebird';

// POST - Sincronizar OPDs do SINPROD
export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { mode = 'update' } = body; // 'update' = apenas atualizar existentes, 'full' = criar novas

    // Buscar OPDs do SINPROD
    let sinprodOPDs: SinprodOPD[];
    try {
      sinprodOPDs = await buscarOPDsSinprod();
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: `Erro ao conectar com SINPROD: ${error.message}`
      }, { status: 500 });
    }

    await client.query('BEGIN');

    let created = 0;
    let updated = 0;
    let errors: string[] = [];

    for (const sinprodOPD of sinprodOPDs) {
      try {
        // Verificar se OPD já existe
        const existingResult = await client.query(
          'SELECT id, numero FROM opds WHERE numero = $1',
          [sinprodOPD.NUMERO]
        );

        if (existingResult.rows.length > 0) {
          // Atualizar OPD existente com dados do SINPROD
          await client.query(`
            UPDATE opds SET
              cliente = COALESCE($1, cliente),
              data_termino = COALESCE($2, data_termino),
              sinprod_status = $3,
              sinprod_sync = NOW(),
              updated = NOW()
            WHERE numero = $4
          `, [
            sinprodOPD.CLIENTE,
            sinprodOPD.DATA_ENTREGA,
            sinprodOPD.STATUS,
            sinprodOPD.NUMERO
          ]);
          updated++;
        } else if (mode === 'full') {
          // Criar nova OPD (modo completo)
          await client.query(`
            INSERT INTO opds (
              numero, cliente, data_inicio, data_termino, status,
              sinprod_status, sinprod_sync, created, updated
            ) VALUES ($1, $2, $3, $4, 'PENDENTE', $5, NOW(), NOW(), NOW())
          `, [
            sinprodOPD.NUMERO,
            sinprodOPD.CLIENTE,
            sinprodOPD.DATA_EMISSAO,
            sinprodOPD.DATA_ENTREGA,
            sinprodOPD.STATUS
          ]);
          created++;
        }
      } catch (opdError: any) {
        errors.push(`OPD ${sinprodOPD.NUMERO}: ${opdError.message}`);
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída',
      stats: {
        total: sinprodOPDs.length,
        created,
        updated,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro na sincronização:', error);
    return NextResponse.json({
      success: false,
      error: `Erro na sincronização: ${error.message}`
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// GET - Status da última sincronização
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        MAX(sinprod_sync) as ultima_sync,
        COUNT(CASE WHEN sinprod_sync IS NOT NULL THEN 1 END) as sincronizadas
      FROM opds
    `);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
