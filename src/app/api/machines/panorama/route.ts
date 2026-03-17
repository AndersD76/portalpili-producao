import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/machines/panorama — Full production process panorama
export async function GET(request: Request) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { searchParams } = new URL(request.url);
  const tipoProduto = searchParams.get('tipo'); // TOMBADOR | COLETOR
  const filterOpd = searchParams.get('opd');

  try {
    // 1. Get all OPDs with progress summary
    let opdFilter = '';
    const opdParams: unknown[] = [];
    let paramIdx = 1;

    if (tipoProduto) {
      opdFilter += ` AND o.tipo_produto = $${paramIdx}`;
      opdParams.push(tipoProduto);
      paramIdx++;
    }
    if (filterOpd) {
      opdFilter += ` AND o.numero = $${paramIdx}`;
      opdParams.push(filterOpd);
      paramIdx++;
    }

    const opdsResult = await query(`
      SELECT
        o.numero,
        o.tipo_produto,
        o.cliente,
        o.responsavel_opd,
        o.previsao_inicio,
        o.previsao_termino,
        o.inicio_producao,
        o.data_entrega,
        o.data_pedido,
        COUNT(ra.id) FILTER (WHERE ra.parent_id IS NULL) as total_atividades,
        COUNT(ra.id) FILTER (WHERE ra.status = 'CONCLUÍDA' AND ra.parent_id IS NULL) as concluidas,
        COUNT(ra.id) FILTER (WHERE ra.status = 'EM ANDAMENTO' AND ra.parent_id IS NULL) as em_andamento,
        COUNT(ra.id) FILTER (WHERE ra.status = 'A REALIZAR' AND ra.parent_id IS NULL) as a_realizar,
        COUNT(ra.id) FILTER (WHERE ra.status = 'PAUSADA' AND ra.parent_id IS NULL) as pausadas
      FROM opds o
      LEFT JOIN registros_atividades ra ON ra.numero_opd = o.numero
      WHERE 1=1 ${opdFilter}
      GROUP BY o.numero, o.tipo_produto, o.cliente, o.responsavel_opd,
               o.previsao_inicio, o.previsao_termino, o.inicio_producao, o.data_entrega, o.data_pedido
      ORDER BY
        CASE WHEN COUNT(ra.id) FILTER (WHERE ra.status = 'EM ANDAMENTO' AND ra.parent_id IS NULL) > 0 THEN 0 ELSE 1 END,
        o.previsao_termino ASC NULLS LAST,
        o.numero DESC
    `, opdParams);

    // 2. Get all stages (atividades) with status per OPD
    const stagesResult = await query(`
      SELECT
        ra.numero_opd,
        ra.atividade,
        ra.status,
        ra.responsavel,
        ra.data_inicio,
        ra.data_termino,
        ra.tempo_acumulado_segundos,
        ra.previsao_inicio,
        ra.tem_nao_conformidade,
        o.tipo_produto
      FROM registros_atividades ra
      JOIN opds o ON o.numero = ra.numero_opd
      WHERE ra.parent_id IS NULL ${opdFilter.replace(/o\./g, 'o.')}
      ORDER BY ra.numero_opd, ra.id ASC
    `, opdParams);

    // 3. Get machines with their linked stages
    const machinesResult = await query(`
      SELECT id, name, machine_code, location, cam_ip, status, last_seen,
             linked_stages, product_type, operator_name, operator_shift
      FROM machines
      ORDER BY machine_code
    `);

    // 4. Aggregate: cross-OPD stage summary (how many OPDs at each stage)
    const stageSummary = await query(`
      SELECT
        ra.atividade as stage_name,
        o.tipo_produto,
        COUNT(DISTINCT ra.numero_opd) FILTER (WHERE ra.status = 'CONCLUÍDA') as opds_done,
        COUNT(DISTINCT ra.numero_opd) FILTER (WHERE ra.status = 'EM ANDAMENTO') as opds_active,
        COUNT(DISTINCT ra.numero_opd) FILTER (WHERE ra.status = 'A REALIZAR') as opds_pending,
        COUNT(DISTINCT ra.numero_opd) FILTER (WHERE ra.status = 'PAUSADA') as opds_paused,
        COUNT(DISTINCT ra.numero_opd) as opds_total
      FROM registros_atividades ra
      JOIN opds o ON o.numero = ra.numero_opd
      WHERE ra.parent_id IS NULL
      GROUP BY ra.atividade, o.tipo_produto
      ORDER BY ra.atividade
    `);

    // 5. Overall stats
    const totalOpds = opdsResult.rows.length;
    const totalAtividades = opdsResult.rows.reduce((sum, r) => sum + parseInt(r.total_atividades), 0);
    const totalConcluidas = opdsResult.rows.reduce((sum, r) => sum + parseInt(r.concluidas), 0);
    const totalEmAndamento = opdsResult.rows.reduce((sum, r) => sum + parseInt(r.em_andamento), 0);
    const avgProgress = totalAtividades > 0 ? Math.round((totalConcluidas / totalAtividades) * 100) : 0;

    // Group stages by OPD for response
    const stagesByOpd: Record<string, unknown[]> = {};
    for (const s of stagesResult.rows) {
      if (!stagesByOpd[s.numero_opd]) stagesByOpd[s.numero_opd] = [];
      stagesByOpd[s.numero_opd].push(s);
    }

    // Build machine map by stage
    const machinesByStage: Record<string, unknown> = {};
    for (const m of machinesResult.rows) {
      if (m.linked_stages) {
        for (const stage of m.linked_stages) {
          machinesByStage[stage] = m;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total_opds: totalOpds,
          total_atividades: totalAtividades,
          concluidas: totalConcluidas,
          em_andamento: totalEmAndamento,
          avg_progress: avgProgress,
          tombadores: opdsResult.rows.filter(r => r.tipo_produto === 'TOMBADOR').length,
          coletores: opdsResult.rows.filter(r => r.tipo_produto === 'COLETOR').length,
        },
        opds: opdsResult.rows.map(opd => ({
          ...opd,
          progress_pct: parseInt(opd.total_atividades) > 0
            ? Math.round((parseInt(opd.concluidas) / parseInt(opd.total_atividades)) * 100)
            : 0,
          stages: stagesByOpd[opd.numero] || [],
        })),
        stage_summary: stageSummary.rows,
        machines: machinesResult.rows,
        machines_by_stage: machinesByStage,
      }
    });
  } catch (error) {
    console.error('[PANORAMA] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar panorama' },
      { status: 500 }
    );
  }
}
