import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verificarNaoConformidade } from '@/lib/naoConformidade';

// POST - Reprocessar todas as NCs dos formulários existentes
export async function POST() {
  try {
    const results: string[] = [];
    let totalProcessados = 0;
    let totalNCs = 0;

    // Buscar todos os formulários preenchidos
    const formularios = await pool.query(`
      SELECT id, atividade_id, tipo_formulario, dados_formulario
      FROM formularios_preenchidos
      WHERE atividade_id IS NOT NULL
      ORDER BY created DESC
    `);

    results.push(`📋 Encontrados ${formularios.rowCount} formulários com atividade_id`);

    for (const form of formularios.rows) {
      try {
        let dadosFormulario = form.dados_formulario;

        // Se for string, fazer parse
        if (typeof dadosFormulario === 'string') {
          dadosFormulario = JSON.parse(dadosFormulario);
        }

        if (dadosFormulario && typeof dadosFormulario === 'object') {
          const temNC = await verificarNaoConformidade(form.atividade_id, dadosFormulario);
          totalProcessados++;

          if (temNC) {
            totalNCs++;
            results.push(`🚨 NC em atividade ${form.atividade_id} (${form.tipo_formulario})`);
          }
        }
      } catch (e: any) {
        results.push(`❌ Erro no formulário ${form.id}: ${e.message}`);
      }
    }

    // Também verificar diretamente nos campos dos formulários
    const atividadesComNC = await pool.query(`
      SELECT DISTINCT ra.id, ra.atividade, ra.numero_opd
      FROM registros_atividades ra
      JOIN formularios_preenchidos fp ON fp.atividade_id = ra.id
      WHERE fp.dados_formulario::text ILIKE '%não conforme%'
         OR fp.dados_formulario::text ILIKE '%nao conforme%'
         OR fp.dados_formulario::text ILIKE '%Não conforme%'
         OR fp.dados_formulario::text ILIKE '%Nao conforme%'
    `);

    // Marcar essas atividades como tendo NC
    for (const ativ of atividadesComNC.rows) {
      await pool.query(
        'UPDATE registros_atividades SET tem_nao_conformidade = true WHERE id = $1',
        [ativ.id]
      );
      results.push(`✅ Marcada NC direta em atividade ${ativ.id}: ${ativ.atividade}`);
    }

    // Contar total de atividades com NC
    const totalAtividadesNC = await pool.query(`
      SELECT COUNT(*) as total FROM registros_atividades WHERE tem_nao_conformidade = true
    `);

    return NextResponse.json({
      success: true,
      message: 'Reprocessamento de NCs concluído',
      stats: {
        formularios_processados: totalProcessados,
        ncs_detectadas_formulario: totalNCs,
        ncs_detectadas_texto: atividadesComNC.rowCount,
        total_atividades_com_nc: totalAtividadesNC.rows[0]?.total || 0
      },
      results
    });
  } catch (error: any) {
    console.error('Erro ao reprocessar NCs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Ver estatísticas de NCs
export async function GET() {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_atividades,
        SUM(CASE WHEN tem_nao_conformidade = true THEN 1 ELSE 0 END) as com_nc,
        SUM(CASE WHEN tem_nao_conformidade = false OR tem_nao_conformidade IS NULL THEN 1 ELSE 0 END) as sem_nc
      FROM registros_atividades
    `);

    const atividadesComNC = await pool.query(`
      SELECT id, numero_opd, atividade, status
      FROM registros_atividades
      WHERE tem_nao_conformidade = true
      ORDER BY numero_opd, id
    `);

    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      atividades_com_nc: atividadesComNC.rows
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de NCs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
