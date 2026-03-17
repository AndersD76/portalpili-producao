// ============================================
// PILI_MAQ — KPI Calculation Service
// ============================================

import { query } from '../db';
import type { ShiftKpis } from '@/types/machines';

/**
 * Calculate KPIs for a machine's current shift
 */
export async function calculateShiftKpis(
  machineId: string,
  shiftDate: string,
  shift: string
): Promise<ShiftKpis> {
  // Get machine target
  const machineResult = await query(
    'SELECT daily_target, shift_start, shift_end FROM machines WHERE id = $1',
    [machineId]
  );
  const machine = machineResult.rows[0];
  const piecesTarget = machine?.daily_target ?? 400;
  const shiftStart = machine?.shift_start ?? '07:00';
  const shiftEnd = machine?.shift_end ?? '15:20';

  // Calculate shift duration in hours
  const [sh, sm] = shiftStart.split(':').map(Number);
  const [eh, em] = shiftEnd.split(':').map(Number);
  const shiftHours = (eh * 60 + em - sh * 60 - sm) / 60;

  // Count events by type for this shift
  const eventsResult = await query(`
    SELECT
      event_type,
      COUNT(*) as count,
      zone,
      AVG(CASE WHEN cycle_time_seconds > 0 THEN cycle_time_seconds END) as avg_cycle,
      SUM(COALESCE(pieces_count, 0)) as total_pieces
    FROM machine_events
    WHERE machine_id = $1
      AND created_at::date = $2::date
      AND event_type != 'heartbeat'
    GROUP BY event_type, zone
  `, [machineId, shiftDate]);

  let totalMotion = 0;
  let totalIdle = 0;
  let totalPieces = 0;
  let avgCycle: number | null = null;
  const motionByZone = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  for (const row of eventsResult.rows) {
    const count = parseInt(row.count, 10);
    if (row.event_type === 'motion') {
      totalMotion += count;
      const z = row.zone as keyof typeof motionByZone;
      if (z && z in motionByZone) {
        motionByZone[z] += count;
      }
    } else if (row.event_type === 'idle') {
      totalIdle += count;
    } else if (row.event_type === 'production') {
      totalPieces += parseInt(row.total_pieces, 10) || 0;
      if (row.avg_cycle) avgCycle = parseFloat(row.avg_cycle);
    }
  }

  // If no production events, estimate from motion
  if (totalPieces === 0 && totalMotion > 0) {
    // Rough estimate: each sustained motion burst ≈ 1 piece
    const productionEventsResult = await query(`
      SELECT SUM(COALESCE(pieces_count, 0)) as total
      FROM machine_events
      WHERE machine_id = $1 AND created_at::date = $2::date AND event_type = 'production'
    `, [machineId, shiftDate]);
    totalPieces = parseInt(productionEventsResult.rows[0]?.total, 10) || 0;
  }

  const totalEvents = totalMotion + totalIdle;
  const operatorPresence = totalEvents > 0 ? (totalMotion / totalEvents) * 100 : 0;
  const piecesPerHour = shiftHours > 0 ? totalPieces / shiftHours : 0;
  const atingimento = piecesTarget > 0 ? (totalPieces / piecesTarget) * 100 : 0;

  // Efficiency: productive time / total shift time
  const efficiency = totalEvents > 0 ? (totalMotion / totalEvents) * 100 : 0;

  // OEE = Availability × Performance × Quality
  // Availability: machine was "on" vs shift time (use motion+idle vs expected intervals)
  const availability = Math.min(operatorPresence / 100, 1);
  // Performance: actual rate vs target rate
  const targetPerHour = shiftHours > 0 ? piecesTarget / shiftHours : 1;
  const performance = targetPerHour > 0 ? Math.min(piecesPerHour / targetPerHour, 1) : 0;
  // Quality: assume 100% for now (no reject data)
  const quality = 1.0;
  const oee = availability * performance * quality * 100;

  return {
    pieces_produced: totalPieces,
    pieces_target: piecesTarget,
    atingimento_pct: Math.round(atingimento * 10) / 10,
    efficiency_pct: Math.round(efficiency * 10) / 10,
    oee_pct: Math.round(oee * 10) / 10,
    avg_cycle_time_seconds: avgCycle ? Math.round(avgCycle * 10) / 10 : null,
    pieces_per_hour: Math.round(piecesPerHour * 10) / 10,
    total_motion_events: totalMotion,
    idle_events: totalIdle,
    motion_by_zone: motionByZone,
    operator_presence_pct: Math.round(operatorPresence * 10) / 10,
  };
}

/**
 * Upsert production record for the shift
 */
export async function upsertProductionRecord(
  machineId: string,
  shiftDate: string,
  shift: string,
  kpis: ShiftKpis,
  operatorName: string | null
): Promise<void> {
  await query(`
    INSERT INTO production_records (
      machine_id, shift_date, shift, pieces_produced, pieces_target,
      total_motion_events, total_idle_events, avg_cycle_time,
      efficiency_pct, oee_pct, operator_name, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (machine_id, shift_date, shift) DO UPDATE SET
      pieces_produced = $4,
      pieces_target = $5,
      total_motion_events = $6,
      total_idle_events = $7,
      avg_cycle_time = $8,
      efficiency_pct = $9,
      oee_pct = $10,
      operator_name = $11,
      updated_at = NOW()
  `, [
    machineId, shiftDate, shift,
    kpis.pieces_produced, kpis.pieces_target,
    kpis.total_motion_events, kpis.idle_events,
    kpis.avg_cycle_time_seconds,
    kpis.efficiency_pct, kpis.oee_pct,
    operatorName
  ]);
}

/**
 * Get dashboard summary for all machines
 */
export async function getMachineDashboardSummary(): Promise<Array<Record<string, unknown>>> {
  const today = new Date().toISOString().split('T')[0];

  const result = await query(`
    SELECT
      m.*,
      pr.pieces_produced,
      pr.pieces_target,
      pr.efficiency_pct,
      pr.oee_pct,
      pr.avg_cycle_time,
      pr.total_motion_events,
      pr.total_idle_events
    FROM machines m
    LEFT JOIN production_records pr
      ON pr.machine_id = m.id
      AND pr.shift_date = $1
      AND pr.shift = m.operator_shift
    ORDER BY m.machine_code ASC
  `, [today]);

  return result.rows;
}
