/**
 * WeightTrendChart — Reusable Pinch-to-Zoom Weight Chart
 *
 * MacroFactor-style continuous pinch/pan chart with:
 * - Continuous windowDays (3–365) + anchorDayOffset shared values
 * - Gesture.Simultaneous(pinch, pan, longPress) via RNGH v2
 * - Time-proportional X-axis with adaptive labels
 * - Time-delta-adjusted EMA trend line (half-life = 7 days)
 * - Y-axis hysteresis during gestures via activeGestureCount
 * - useAnimatedReaction bridge: UI-thread → JS-thread path regen
 * - Preset pills with distance-based highlighting
 * - Long-press tooltip with nearest-point snapping
 * - DST-safe date math (daysBefore / endOfDay)
 * - ScrollView-safe pan gesture config
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores';
import { chartColors as allChartColors } from '@/constants/colors';
import { spacing, borderRadius } from '@/constants/spacing';
import { WeightEntry } from '@/types/domain';

// ─── Constants ────────────────────────────────────────────────────
const MIN_DAYS = 3;
const MAX_DAYS = 365;
const HALF_LIFE_DAYS = 7;
const MIN_POINTS_FOR_TREND = 3;
const CHART_PADDING = { left: 36, right: 12, top: 8, bottom: 20 };
const DEFAULT_CHART_HEIGHT = 120;

const PRESETS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
] as const;

// ─── DST-safe date utilities ──────────────────────────────────────
function daysBefore(date: Date, days: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - 1);
}

function calendarDaysBetween(a: Date, b: Date): number {
  const aNorm = new Date(a);
  aNorm.setHours(0, 0, 0, 0);
  const bNorm = new Date(b);
  bNorm.setHours(0, 0, 0, 0);
  return Math.round((bNorm.getTime() - aNorm.getTime()) / 86400000);
}

// ─── Binary search worklets ───────────────────────────────────────
function lowerBound(arr: number[], target: number): number {
  'worklet';
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr: number[], target: number): number {
  'worklet';
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ─── Clamp worklet ────────────────────────────────────────────────
function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

// ─── Weight point type ────────────────────────────────────────────
interface WeightPoint {
  weight: number;
  date: Date;
  dateMs: number;
  trendWeight?: number;
}

// ─── Trend line (time-delta-adjusted EMA) ─────────────────────────
function calculateTrendWeights(data: WeightPoint[]): WeightPoint[] {
  if (data.length === 0) return [];
  const trend: WeightPoint[] = [{ ...data[0], trendWeight: data[0].weight }];
  for (let i = 1; i < data.length; i++) {
    const dtDays = Math.max(1, calendarDaysBetween(data[i - 1].date, data[i].date));
    const alpha = 1 - Math.pow(2, -dtDays / HALF_LIFE_DAYS);
    const tw = alpha * data[i].weight + (1 - alpha) * trend[i - 1].trendWeight!;
    trend.push({ ...data[i], trendWeight: tw });
  }
  return trend;
}

// ─── Preset pill highlight ────────────────────────────────────────
function closestPreset(windowDays: number): string | null {
  let bestLabel: string | null = null;
  let bestDist = Infinity;
  for (const p of PRESETS) {
    const dist = Math.abs(p.days - windowDays);
    if (dist < bestDist) {
      bestDist = dist;
      bestLabel = p.label;
    }
  }
  const nearest = PRESETS.find((p) => p.label === bestLabel)!;
  if (bestDist / nearest.days > 0.15) return null;
  return bestLabel;
}

// ─── Adaptive axis labels ─────────────────────────────────────────
function getAxisConfig(windowDays: number) {
  if (windowDays <= 14)
    return { tickCount: Math.min(windowDays, 5), formatFn: formatShortDate };
  if (windowDays <= 60)
    return { tickCount: 5, formatFn: formatMedDate };
  if (windowDays <= 180)
    return { tickCount: Math.ceil(windowDays / 30), formatFn: formatMonthOnly };
  return { tickCount: Math.ceil(windowDays / 60), formatFn: formatMonthYear };
}

function formatShortDate(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}
function formatMedDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
function formatMonthOnly(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()];
}
function formatMonthYear(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

// ─── Path generation ──────────────────────────────────────────────
function generatePathD(
  data: WeightPoint[],
  startMs: number,
  endMs: number,
  plotWidth: number,
  plotHeight: number,
  yMin: number,
  yMax: number,
  chartPaddingLeft: number,
  chartPaddingTop: number,
  accessor: (p: WeightPoint) => number
): string {
  if (data.length === 0) return '';
  const yRange = yMax - yMin || 1;
  const msRange = endMs - startMs || 1;
  return data.reduce((acc, point, i) => {
    const x = chartPaddingLeft + ((point.dateMs - startMs) / msRange) * plotWidth;
    const y = chartPaddingTop + plotHeight - ((accessor(point) - yMin) / yRange) * plotHeight;
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');
}

// ─── Props ────────────────────────────────────────────────────────
export interface WeightTrendChartProps {
  entries: WeightEntry[];
  chartHeight?: number;
  initialWindowDays?: number;
  onWindowDaysChange?: (days: number) => void;
  targetWeightKg?: number | null;
  gesturesDisabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════

export function WeightTrendChart({
  entries,
  chartHeight = DEFAULT_CHART_HEIGHT,
  initialWindowDays = 30,
  onWindowDaysChange,
  targetWeightKg,
  gesturesDisabled = false,
}: WeightTrendChartProps) {
  const { colors, colorScheme } = useTheme();
  const chartThemeColors = allChartColors[colorScheme];
  const { settings } = useSettingsStore();
  const isLbs = settings?.weightUnit === 'lbs';
  const weightMultiplier = isLbs ? 2.20462 : 1;
  const unit = isLbs ? 'lbs' : 'kg';

  // Layout
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 80);
  const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = chartHeight - CHART_PADDING.top - CHART_PADDING.bottom;
  const chartWidthRef = useRef(chartWidth);
  chartWidthRef.current = chartWidth;

  const onChartLayout = useCallback((e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  }, []);

  // ─── Prepare all weight data (sorted ASC) ───────────────────────
  const allWeightData = useMemo<WeightPoint[]>(() => {
    return [...entries]
      .filter((e) => typeof e.weightKg === 'number')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => {
        const d = new Date(e.date + 'T12:00:00');
        return {
          weight: e.weightKg * weightMultiplier,
          date: d,
          dateMs: d.getTime(),
        };
      });
  }, [entries, weightMultiplier]);

  // Pre-compute trend for all data
  const allDataWithTrend = useMemo(() => calculateTrendWeights(allWeightData), [allWeightData]);

  // Sorted timestamp array for binary search
  const timestamps = useMemo(() => allWeightData.map((p) => p.dateMs), [allWeightData]);
  const timestampsRef = useRef(timestamps);
  timestampsRef.current = timestamps;

  // Data span
  const dataSpanDays = useMemo(() => {
    if (allWeightData.length < 2) return 0;
    return calendarDaysBetween(allWeightData[0].date, allWeightData[allWeightData.length - 1].date) + 1;
  }, [allWeightData]);

  const maxHistoryDays = useMemo(() => Math.max(dataSpanDays, 30), [dataSpanDays]);

  // ─── Shared values (UI thread) ──────────────────────────────────
  const windowDays = useSharedValue(initialWindowDays);
  const savedWindowDays = useSharedValue(initialWindowDays);
  const anchorDayOffset = useSharedValue(0);
  const savedAnchorDayOffset = useSharedValue(0);
  const windowStartMs = useSharedValue(daysBefore(new Date(), initialWindowDays).getTime());
  const windowEndMs = useSharedValue(endOfDay(new Date()).getTime());
  const activeGestureCount = useSharedValue(0);
  const lockedYMin = useSharedValue<number | null>(null);
  const lockedYMax = useSharedValue<number | null>(null);

  // Y-range tracking (written by JS thread, read by worklets)
  const currentYMin = useSharedValue(0);
  const currentYMax = useSharedValue(0);

  // ─── JS-thread state ───────────────────────────────────────────
  const [visibleData, setVisibleData] = useState<WeightPoint[]>([]);
  const [rawPathD, setRawPathD] = useState('');
  const [trendPathD, setTrendPathD] = useState('');
  const [windowEmpty, setWindowEmpty] = useState(false);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(100);
  const [jsWindowDays, setJsWindowDays] = useState(initialWindowDays);
  const [jsStartMs, setJsStartMs] = useState(0);
  const [jsEndMs, setJsEndMs] = useState(0);
  const [tooltipPoint, setTooltipPoint] = useState<WeightPoint | null>(null);
  const [tooltipX, setTooltipX] = useState(0);
  const [tooltipY, setTooltipY] = useState(0);

  // ─── Persist helper ───────────────────────────────────────────
  const persistWindowDays = useCallback(
    (days: number) => {
      const rounded = Math.round(days);
      setJsWindowDays(rounded);
      onWindowDaysChange?.(rounded);
    },
    [onWindowDaysChange]
  );

  // ─── Y-scale logic ─────────────────────────────────────────────
  const getYScale = useCallback(
    (slice: WeightPoint[]): { min: number; max: number } => {
      if (lockedYMin.value !== null && lockedYMax.value !== null) {
        return { min: lockedYMin.value, max: lockedYMax.value };
      }
      if (slice.length === 0) {
        const pad = (currentYMax.value - currentYMin.value) * 0.05 || 0.5;
        return {
          min: Math.floor((currentYMin.value - pad) * 2) / 2,
          max: Math.ceil((currentYMax.value + pad) * 2) / 2,
        };
      }
      const weights = slice.map((p) => p.weight);
      const trendWeights = slice.filter((p) => p.trendWeight != null).map((p) => p.trendWeight!);
      const allW = [...weights, ...trendWeights];
      const rawMin = Math.min(...allW);
      const rawMax = Math.max(...allW);
      const padding = (rawMax - rawMin) * 0.1 || 1;
      return {
        min: Math.floor((rawMin - padding) * 2) / 2,
        max: Math.ceil((rawMax + padding) * 2) / 2,
      };
    },
    [lockedYMin, lockedYMax, currentYMin, currentYMax]
  );

  // ─── Bridge: update window ms bounds from day values ────────────
  const updateWindowBounds = useCallback(
    (offsetDays: number, spanDays: number) => {
      const today = new Date();
      const anchor = daysBefore(today, Math.round(offsetDays));
      const start = daysBefore(anchor, Math.floor(spanDays));
      const startMs = start.getTime();
      const endMs = endOfDay(anchor).getTime();
      windowStartMs.value = startMs;
      windowEndMs.value = endMs;
    },
    [windowStartMs, windowEndMs]
  );

  // ─── Bridge: slice data + regenerate paths ──────────────────────
  const updateVisibleDataAndPath = useCallback(
    (startIdx: number, endIdx: number, startMs: number, endMs: number) => {
      const slice = allDataWithTrend.slice(startIdx, endIdx);

      setJsStartMs(startMs);
      setJsEndMs(endMs);

      if (slice.length === 0) {
        setRawPathD('');
        setTrendPathD('');
        setWindowEmpty(true);
        setVisibleData([]);
        return;
      }

      setWindowEmpty(false);
      setVisibleData(slice);

      const scale = getYScale(slice);
      setYMin(scale.min);
      setYMax(scale.max);

      const pw = chartWidthRef.current - CHART_PADDING.left - CHART_PADDING.right;
      const ph = chartHeight - CHART_PADDING.top - CHART_PADDING.bottom;

      setRawPathD(generatePathD(slice, startMs, endMs, pw, ph, scale.min, scale.max, CHART_PADDING.left, CHART_PADDING.top, (p) => p.weight));

      const trendSlice = slice.filter((p) => p.trendWeight != null);
      if (trendSlice.length >= MIN_POINTS_FOR_TREND) {
        setTrendPathD(
          generatePathD(trendSlice, startMs, endMs, pw, ph, scale.min, scale.max, CHART_PADDING.left, CHART_PADDING.top, (p) => p.trendWeight!)
        );
      } else {
        setTrendPathD('');
      }

      // Update currentY bounds for hysteresis snapshot
      const weights = slice.map((p) => p.weight);
      currentYMin.value = Math.min(...weights);
      currentYMax.value = Math.max(...weights);
    },
    [allDataWithTrend, getYScale, currentYMin, currentYMax, chartHeight]
  );

  // ─── useAnimatedReaction: day values → ms boundaries ────────────
  useAnimatedReaction(
    () => ({ offset: anchorDayOffset.value, span: windowDays.value }),
    (curr, prev) => {
      if (!prev || curr.offset !== prev.offset || curr.span !== prev.span) {
        runOnJS(updateWindowBounds)(curr.offset, curr.span);
      }
    }
  );

  // ─── useAnimatedReaction: ms boundaries → data slice + paths ────
  useAnimatedReaction(
    () => {
      const ts = timestampsRef.current;
      return {
        startIdx: lowerBound(ts, windowStartMs.value),
        endIdx: upperBound(ts, windowEndMs.value),
        startMs: windowStartMs.value,
        endMs: windowEndMs.value,
      };
    },
    (curr, prev) => {
      if (
        !prev ||
        curr.startIdx !== prev.startIdx ||
        curr.endIdx !== prev.endIdx ||
        curr.startMs !== prev.startMs ||
        curr.endMs !== prev.endMs
      ) {
        runOnJS(updateVisibleDataAndPath)(curr.startIdx, curr.endIdx, curr.startMs, curr.endMs);
      }
    }
  );

  // ─── Initial data render ────────────────────────────────────────
  useEffect(() => {
    if (allDataWithTrend.length === 0) return;
    const today = new Date();
    const start = daysBefore(today, initialWindowDays);
    const end = endOfDay(today);
    const sMs = start.getTime();
    const eMs = end.getTime();
    const sIdx = timestamps.findIndex((t) => t >= sMs);
    const eIdx = timestamps.length;
    updateVisibleDataAndPath(
      sIdx >= 0 ? sIdx : 0,
      eIdx,
      sMs,
      eMs
    );
  }, [allDataWithTrend, timestamps, initialWindowDays, updateVisibleDataAndPath]);

  // ─── Gesture activation / deactivation (Y-axis hysteresis) ──────
  const onGestureActivate = useCallback(() => {
    'worklet';
    const prev = activeGestureCount.value;
    activeGestureCount.value = prev + 1;
    if (prev === 0) {
      const padding = (currentYMax.value - currentYMin.value) * 0.1 || 1;
      lockedYMin.value = currentYMin.value - padding;
      lockedYMax.value = currentYMax.value + padding;
    }
  }, [activeGestureCount, currentYMin, currentYMax, lockedYMin, lockedYMax]);

  const onGestureDeactivate = useCallback(() => {
    'worklet';
    activeGestureCount.value = Math.max(0, activeGestureCount.value - 1);
    if (activeGestureCount.value === 0) {
      lockedYMin.value = null;
      lockedYMax.value = null;
    }
  }, [activeGestureCount, lockedYMin, lockedYMax]);

  // ─── Gesture definitions ────────────────────────────────────────
  const maxHistDays = maxHistoryDays;
  const cw = chartWidth;

  const pinchGesture = Gesture.Pinch()
    .enabled(!gesturesDisabled)
    .onStart(() => {
      'worklet';
      savedWindowDays.value = windowDays.value;
      onGestureActivate();
    })
    .onUpdate((e) => {
      'worklet';
      const newDays = savedWindowDays.value / e.scale;
      windowDays.value = clamp(newDays, MIN_DAYS, MAX_DAYS);
    })
    .onEnd(() => {
      'worklet';
      windowDays.value = Math.round(windowDays.value);
      runOnJS(persistWindowDays)(windowDays.value);
    })
    .onFinalize(() => {
      'worklet';
      onGestureDeactivate();
    });

  const panGesture = Gesture.Pan()
    .enabled(!gesturesDisabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      'worklet';
      savedAnchorDayOffset.value = anchorDayOffset.value;
      onGestureActivate();
    })
    .onUpdate((e) => {
      'worklet';
      const daysPerPixel = windowDays.value / cw;
      const daysDelta = -e.translationX * daysPerPixel;
      const newOffset = savedAnchorDayOffset.value + daysDelta;
      anchorDayOffset.value = clamp(newOffset, 0, maxHistDays);
    })
    .onEnd(() => {
      'worklet';
      anchorDayOffset.value = Math.round(anchorDayOffset.value);
    })
    .onFinalize(() => {
      'worklet';
      onGestureDeactivate();
    });

  // ─── Long press tooltip ─────────────────────────────────────────
  const showTooltipAtPosition = useCallback(
    (x: number, _y: number) => {
      if (visibleData.length === 0) return;
      const msRange = jsEndMs - jsStartMs || 1;
      const touchMs = jsStartMs + ((x - CHART_PADDING.left) / plotWidth) * msRange;
      let nearest = visibleData[0];
      let minDist = Infinity;
      for (const point of visibleData) {
        const dist = Math.abs(point.dateMs - touchMs);
        if (dist < minDist) {
          minDist = dist;
          nearest = point;
        }
      }
      const px = CHART_PADDING.left + ((nearest.dateMs - jsStartMs) / msRange) * plotWidth;
      const yRange = yMax - yMin || 1;
      const py = CHART_PADDING.top + plotHeight - ((nearest.weight - yMin) / yRange) * plotHeight;
      setTooltipPoint(nearest);
      setTooltipX(px);
      setTooltipY(py);
    },
    [visibleData, jsStartMs, jsEndMs, plotWidth, plotHeight, yMin, yMax]
  );

  const hideTooltip = useCallback(() => {
    setTooltipPoint(null);
  }, []);

  const longPressGesture = Gesture.LongPress()
    .enabled(!gesturesDisabled)
    .minDuration(300)
    .numberOfPointers(1)
    .maxDistance(10)
    .onStart((e) => {
      'worklet';
      if (activeGestureCount.value > 0) return;
      runOnJS(showTooltipAtPosition)(e.x, e.y);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(hideTooltip)();
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, longPressGesture);

  // ─── Preset pill tap ───────────────────────────────────────────
  const handlePresetPress = useCallback(
    (days: number) => {
      windowDays.value = withTiming(days, { duration: 250 });
      anchorDayOffset.value = withTiming(0, { duration: 250 });
      setJsWindowDays(days);
      onWindowDaysChange?.(days);
    },
    [windowDays, anchorDayOffset, onWindowDaysChange]
  );

  // ─── Derived display values ─────────────────────────────────────
  const activePreset = closestPreset(jsWindowDays);
  const latestWeight = visibleData.length > 0 ? visibleData[visibleData.length - 1].weight : null;
  const latestTrend =
    visibleData.length >= MIN_POINTS_FOR_TREND
      ? visibleData[visibleData.length - 1].trendWeight ?? null
      : null;
  const firstWeight = visibleData.length > 0 ? visibleData[0].weight : null;
  const weightChange = latestWeight != null && firstWeight != null ? latestWeight - firstWeight : null;
  const showTrendLine = trendPathD.length > 0;

  // ─── X-axis labels ─────────────────────────────────────────────
  const xAxisLabels = useMemo(() => {
    if (jsStartMs === 0 || jsEndMs === 0) return [];
    const { tickCount, formatFn } = getAxisConfig(jsWindowDays);
    const labels: { label: string; x: number }[] = [];
    const msRange = jsEndMs - jsStartMs || 1;
    for (let i = 0; i <= tickCount; i++) {
      const ms = jsStartMs + (i / tickCount) * msRange;
      const d = new Date(ms);
      const x = CHART_PADDING.left + (i / tickCount) * plotWidth;
      labels.push({ label: formatFn(d), x });
    }
    return labels;
  }, [jsStartMs, jsEndMs, jsWindowDays, plotWidth]);

  // ─── Y-axis labels ─────────────────────────────────────────────
  const yAxisLabels = useMemo(() => {
    if (yMin === yMax) return [];
    const mid = (yMin + yMax) / 2;
    return [
      { value: yMax, y: CHART_PADDING.top },
      { value: mid, y: CHART_PADDING.top + plotHeight / 2 },
      { value: yMin, y: CHART_PADDING.top + plotHeight },
    ];
  }, [yMin, yMax, plotHeight]);

  const styles = createStyles(colors, chartHeight);

  // === Edge case: 0 entries ===
  if (allWeightData.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>Log your first weigh-in to see your trend</Text>
      </View>
    );
  }

  // === Edge case: 1 entry ===
  if (allWeightData.length === 1) {
    return (
      <View style={styles.singlePointContainer}>
        <Text style={styles.singlePointValue}>
          {allWeightData[0].weight.toFixed(1)} {unit}
        </Text>
        <Text style={styles.singlePointHint}>
          Log a few more weigh-ins to see your trend
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>
            {latestWeight != null ? `${latestWeight.toFixed(1)} ${unit}` : '--'}
          </Text>
        </View>
        {showTrendLine && latestTrend != null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Trend</Text>
            <Text style={styles.statValue}>
              {latestTrend.toFixed(1)} {unit}
            </Text>
          </View>
        )}
        {typeof targetWeightKg === 'number' && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>
              {(targetWeightKg * weightMultiplier).toFixed(1)} {unit}
            </Text>
          </View>
        )}
        {typeof weightChange === 'number' && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Change</Text>
            <Text
              style={[
                styles.statValue,
                weightChange < 0 ? styles.changePositive : styles.changeNeutral,
              ]}
            >
              {weightChange > 0 ? '+' : ''}
              {weightChange.toFixed(1)} {unit}
            </Text>
          </View>
        )}
      </View>

      {/* Chart area — gesture detector */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.chartContainer} onLayout={onChartLayout}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Horizontal grid lines */}
            {yAxisLabels.map((label, i) => (
              <Line
                key={`grid-${i}`}
                x1={CHART_PADDING.left}
                y1={label.y}
                x2={CHART_PADDING.left + plotWidth}
                y2={label.y}
                stroke={colors.borderDefault}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            ))}

            {/* Y-axis labels */}
            {yAxisLabels.map((label, i) => (
              <SvgText
                key={`y-${i}`}
                x={CHART_PADDING.left - 6}
                y={label.y + 4}
                fontSize={9}
                fill={colors.textTertiary}
                textAnchor="end"
              >
                {label.value.toFixed(0)}
              </SvgText>
            ))}

            {/* X-axis labels */}
            {xAxisLabels.map((label, i) => (
              <SvgText
                key={`x-${i}`}
                x={label.x}
                y={chartHeight - 4}
                fontSize={9}
                fill={colors.textTertiary}
                textAnchor="middle"
              >
                {label.label}
              </SvgText>
            ))}

            {/* Raw data line */}
            {rawPathD ? (
              <Path
                d={rawPathD}
                stroke={chartThemeColors.rawWeight}
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Trend line */}
            {trendPathD ? (
              <Path
                d={trendPathD}
                stroke={chartThemeColors.trendLine}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Data points (show only if ≤ 30 visible to avoid clutter) */}
            {visibleData.length <= 30 &&
              visibleData.map((point, i) => {
                const msRange = jsEndMs - jsStartMs || 1;
                const yRange = yMax - yMin || 1;
                const cx = CHART_PADDING.left + ((point.dateMs - jsStartMs) / msRange) * plotWidth;
                const cy =
                  CHART_PADDING.top + plotHeight - ((point.weight - yMin) / yRange) * plotHeight;
                const isLast = i === visibleData.length - 1;
                return (
                  <Circle
                    key={`pt-${i}`}
                    cx={cx}
                    cy={cy}
                    r={isLast ? 4 : 2.5}
                    fill={isLast ? chartThemeColors.trendLine : colors.bgElevated}
                    stroke={chartThemeColors.trendLine}
                    strokeWidth={isLast ? 0 : 1}
                  />
                );
              })}

            {/* Tooltip */}
            {tooltipPoint && (
              <>
                <Circle
                  cx={tooltipX}
                  cy={tooltipY}
                  r={6}
                  fill={chartThemeColors.trendLine}
                  stroke={colors.bgElevated}
                  strokeWidth={2}
                />
                <Rect
                  x={Math.min(Math.max(tooltipX - 45, 0), chartWidth - 90)}
                  y={Math.max(tooltipY - 52, 0)}
                  width={90}
                  height={40}
                  rx={6}
                  fill={colors.bgElevated}
                  stroke={colors.borderDefault}
                  strokeWidth={1}
                />
                <SvgText
                  x={Math.min(Math.max(tooltipX, 45), chartWidth - 45)}
                  y={Math.max(tooltipY - 36, 14)}
                  fontSize={10}
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {formatMedDate(tooltipPoint.date)}
                </SvgText>
                <SvgText
                  x={Math.min(Math.max(tooltipX, 45), chartWidth - 45)}
                  y={Math.max(tooltipY - 22, 28)}
                  fontSize={12}
                  fontWeight="600"
                  fill={colors.textPrimary}
                  textAnchor="middle"
                >
                  {tooltipPoint.weight.toFixed(1)} {unit}
                </SvgText>
              </>
            )}

            {/* Empty window message */}
            {windowEmpty && (
              <SvgText
                x={CHART_PADDING.left + plotWidth / 2}
                y={CHART_PADDING.top + plotHeight / 2}
                fontSize={12}
                fill={colors.textTertiary}
                textAnchor="middle"
              >
                No data in this range
              </SvgText>
            )}
          </Svg>
        </Animated.View>
      </GestureDetector>

      {/* Legend */}
      {showTrendLine && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: chartThemeColors.rawWeight }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>Raw</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLineBold, { backgroundColor: chartThemeColors.trendLine }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Trend</Text>
          </View>
        </View>
      )}

      {/* Preset pills */}
      <View style={styles.presetRow}>
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset.label;
          const isDisabled = preset.days > dataSpanDays && dataSpanDays > 0;
          return (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetPill,
                isActive && { backgroundColor: colors.bgInteractive },
                isDisabled && styles.presetDisabled,
              ]}
              onPress={() => !isDisabled && handlePresetPress(preset.days)}
              activeOpacity={isDisabled ? 1 : 0.7}
              disabled={isDisabled || gesturesDisabled}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: isDisabled
                      ? colors.textDisabled
                      : isActive
                        ? colors.textPrimary
                        : colors.textTertiary,
                  },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const createStyles = (colors: any, chartHeight: number) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: 'row',
      gap: 24,
      marginBottom: 12,
    },
    stat: {},
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    changePositive: {
      color: colors.success,
    },
    changeNeutral: {
      color: colors.textSecondary,
    },
    chartContainer: {
      height: chartHeight,
      marginTop: 4,
    },
    emptyChart: {
      height: chartHeight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    singlePointContainer: {
      height: chartHeight,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    singlePointValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    singlePointHint: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing[4],
      marginTop: spacing[2],
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
    },
    legendLine: {
      width: 16,
      height: 1.5,
      borderRadius: 1,
      opacity: 0.6,
    },
    legendLineBold: {
      width: 16,
      height: 2.5,
      borderRadius: 1,
    },
    legendText: {
      fontSize: 11,
    },
    presetRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing[1],
      marginTop: spacing[3],
    },
    presetPill: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: borderRadius.sm,
    },
    presetDisabled: {
      opacity: 0.4,
    },
    presetText: {
      fontSize: 12,
      fontWeight: '500',
    },
  });
