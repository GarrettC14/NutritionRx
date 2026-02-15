/**
 * Progress zone classification for macro tracking.
 *
 * Maps an actual value against a target into one of five zones,
 * and provides color/status-text lookups for UI display.
 */

import { ProgressZone } from '@/types/domain';
import { StatusColorKey } from '@/theme/statusColors';

// ── Zone thresholds (fraction of target) ───────────────────────

const ZONE_LOWER = 0.85; // <85% → under
const ZONE_APPROACH = 0.95; // 85–95% → approaching
// 95–105% → inRange
const ZONE_OVER_RANGE = 1.05; // 105–115% → overRange
const ZONE_OVER = 1.15; // >115% → over

// ── Zone → StatusColorKey mapping ──────────────────────────────

export const ZONE_COLORS: Record<ProgressZone, StatusColorKey> = {
  under: 'belowTarget',
  approaching: 'approachingTarget',
  inRange: 'onTarget',
  overRange: 'aboveTarget',
  over: 'wellAboveTarget',
};

// ── Classification ─────────────────────────────────────────────

export function getProgressZone(actual: number, target: number): ProgressZone {
  if (target <= 0) return 'inRange'; // no target set — treat as fine

  const ratio = actual / target;

  if (ratio < ZONE_LOWER) return 'under';
  if (ratio < ZONE_APPROACH) return 'approaching';
  if (ratio <= ZONE_OVER_RANGE) return 'inRange';
  if (ratio <= ZONE_OVER) return 'overRange';
  return 'over';
}

// ── Status text ────────────────────────────────────────────────

const ZONE_STATUS_TEXT: Record<ProgressZone, string> = {
  under: 'Below target',
  approaching: 'Getting close',
  inRange: 'On target',
  overRange: 'Slightly over',
  over: 'Over target',
};

export function getZoneStatusText(zone: ProgressZone): string {
  return ZONE_STATUS_TEXT[zone];
}
