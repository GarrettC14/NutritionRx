jest.mock('@/types/domain', () => ({}));
jest.mock('@/theme/statusColors', () => ({
  statusColorsDark: {},
}));

import { ZONE_COLORS, getProgressZone, getZoneStatusText } from '../progressZones';

// ── ZONE_COLORS mapping ────────────────────────────────────────

describe('ZONE_COLORS', () => {
  it('maps under to belowTarget', () => {
    expect(ZONE_COLORS.under).toBe('belowTarget');
  });

  it('maps approaching to approachingTarget', () => {
    expect(ZONE_COLORS.approaching).toBe('approachingTarget');
  });

  it('maps inRange to onTarget', () => {
    expect(ZONE_COLORS.inRange).toBe('onTarget');
  });

  it('maps overRange to aboveTarget', () => {
    expect(ZONE_COLORS.overRange).toBe('aboveTarget');
  });

  it('maps over to wellAboveTarget', () => {
    expect(ZONE_COLORS.over).toBe('wellAboveTarget');
  });

  it('contains exactly 5 entries', () => {
    expect(Object.keys(ZONE_COLORS)).toHaveLength(5);
  });
});

// ── getProgressZone ────────────────────────────────────────────

describe('getProgressZone', () => {
  describe('edge cases: non-positive target', () => {
    it('returns inRange when target is 0', () => {
      expect(getProgressZone(50, 0)).toBe('inRange');
    });

    it('returns inRange when target is negative', () => {
      expect(getProgressZone(50, -10)).toBe('inRange');
    });
  });

  describe('under zone (ratio < 0.85)', () => {
    it('returns under when ratio is well below 0.85', () => {
      expect(getProgressZone(0, 100)).toBe('under');
    });

    it('returns under at ratio 0.849 (84.9/100)', () => {
      expect(getProgressZone(84.9, 100)).toBe('under');
    });
  });

  describe('approaching zone (0.85 <= ratio < 0.95)', () => {
    it('returns approaching at exact boundary 0.85 (85/100)', () => {
      expect(getProgressZone(85, 100)).toBe('approaching');
    });

    it('returns approaching at ratio 0.949 (94.9/100)', () => {
      expect(getProgressZone(94.9, 100)).toBe('approaching');
    });
  });

  describe('inRange zone (0.95 <= ratio <= 1.05)', () => {
    it('returns inRange at exact boundary 0.95 (95/100)', () => {
      expect(getProgressZone(95, 100)).toBe('inRange');
    });

    it('returns inRange when actual equals target (ratio = 1.0)', () => {
      expect(getProgressZone(100, 100)).toBe('inRange');
    });

    it('returns inRange at upper boundary 1.05 (105/100)', () => {
      expect(getProgressZone(105, 100)).toBe('inRange');
    });
  });

  describe('overRange zone (1.05 < ratio <= 1.15)', () => {
    it('returns overRange just above 1.05 (105.1/100)', () => {
      expect(getProgressZone(105.1, 100)).toBe('overRange');
    });

    it('returns overRange at upper boundary 1.15 (115/100)', () => {
      expect(getProgressZone(115, 100)).toBe('overRange');
    });
  });

  describe('over zone (ratio > 1.15)', () => {
    it('returns over just above 1.15 (115.1/100)', () => {
      expect(getProgressZone(115.1, 100)).toBe('over');
    });

    it('returns over for a very high ratio', () => {
      expect(getProgressZone(300, 100)).toBe('over');
    });
  });

  describe('various target values', () => {
    it('works with small target values', () => {
      // 8/10 = 0.80 → under
      expect(getProgressZone(8, 10)).toBe('under');
    });

    it('works with large target values', () => {
      // 950/1000 = 0.95 → inRange
      expect(getProgressZone(950, 1000)).toBe('inRange');
    });

    it('works with fractional targets', () => {
      // 42.5/50 = 0.85 → approaching
      expect(getProgressZone(42.5, 50)).toBe('approaching');
    });
  });
});

// ── getZoneStatusText ──────────────────────────────────────────

describe('getZoneStatusText', () => {
  it('returns "Below target" for under', () => {
    expect(getZoneStatusText('under')).toBe('Below target');
  });

  it('returns "Getting close" for approaching', () => {
    expect(getZoneStatusText('approaching')).toBe('Getting close');
  });

  it('returns "On target" for inRange', () => {
    expect(getZoneStatusText('inRange')).toBe('On target');
  });

  it('returns "Slightly over" for overRange', () => {
    expect(getZoneStatusText('overRange')).toBe('Slightly over');
  });

  it('returns "Over target" for over', () => {
    expect(getZoneStatusText('over')).toBe('Over target');
  });
});
