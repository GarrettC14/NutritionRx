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
import {
  DEFAULT_WEIGHT_TREND_PALETTE,
  WeightTrendChartPalette,
  WeightTrendEntry,
  WeightUnit,
} from '@/types/weightTrend';

const MIN_DAYS = 3;
const MIN_POINTS_FOR_TREND = 3;
const CHART_PADDING = { left: 36, right: 12, top: 8, bottom: 20 };
const DEFAULT_CHART_HEIGHT = 180;
const LBS_PER_KG = 2.20462;

const PRESETS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
] as const;

interface WeightPoint {
  weight: number;
  date: Date;
  dateMs: number;
  trendWeight?: number;
}

export interface WeightTrendChartMinimalProps {
  entries: WeightTrendEntry[];
  unit?: WeightUnit;
  chartHeight?: number;
  initialWindowDays?: number;
  onWindowDaysChange?: (days: number) => void;
  targetWeightKg?: number | null;
  gesturesEnabled?: boolean;
  palette?: Partial<WeightTrendChartPalette>;
  showLegend?: boolean;
  showPresets?: boolean;
}

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

function lowerBound(arr: number[], target: number): number {
  'worklet';
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr: number[], target: number): number {
  'worklet';
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

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
  if (!bestLabel) return null;
  const nearest = PRESETS.find((p) => p.label === bestLabel);
  if (!nearest) return null;
  if (bestDist / nearest.days > 0.15) return null;
  return bestLabel;
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

function getAxisConfig(windowDays: number) {
  const roundedWindow = Math.max(1, Math.round(windowDays));
  if (roundedWindow <= 14) {
    return { tickCount: Math.min(roundedWindow, 5), formatFn: formatShortDate };
  }
  if (roundedWindow <= 60) {
    return { tickCount: 5, formatFn: formatMedDate };
  }
  if (roundedWindow <= 180) {
    return { tickCount: Math.ceil(roundedWindow / 30), formatFn: formatMonthOnly };
  }
  return { tickCount: Math.ceil(roundedWindow / 60), formatFn: formatMonthYear };
}

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
  return data.reduce((acc, point, index) => {
    const x = chartPaddingLeft + ((point.dateMs - startMs) / msRange) * plotWidth;
    const y = chartPaddingTop + plotHeight - ((accessor(point) - yMin) / yRange) * plotHeight;
    return index === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');
}

export function WeightTrendChartMinimal({
  entries,
  unit = 'kg',
  chartHeight = DEFAULT_CHART_HEIGHT,
  initialWindowDays = 30,
  onWindowDaysChange,
  targetWeightKg,
  gesturesEnabled = true,
  palette,
  showLegend = true,
  showPresets = true,
}: WeightTrendChartMinimalProps) {
  const colors: WeightTrendChartPalette = { ...DEFAULT_WEIGHT_TREND_PALETTE, ...palette };
  const unitMultiplier = unit === 'lbs' ? LBS_PER_KG : 1;
  const unitLabel = unit;

  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 80);
  const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = chartHeight - CHART_PADDING.top - CHART_PADDING.bottom;

  const chartWidthRef = useRef(chartWidth);
  chartWidthRef.current = chartWidth;

  const onChartLayout = useCallback((event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  }, []);

  const allWeightData = useMemo<WeightPoint[]>(() => {
    return [...entries]
      .filter((entry) => typeof entry.weightKg === 'number')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((entry) => {
        const date = new Date(entry.date + 'T12:00:00');
        const storedTrend = entry.trendWeightKg != null ? entry.trendWeightKg : entry.weightKg;
        return {
          weight: entry.weightKg * unitMultiplier,
          date,
          dateMs: date.getTime(),
          trendWeight: storedTrend * unitMultiplier,
        };
      });
  }, [entries, unitMultiplier]);

  const timestamps = useMemo(() => allWeightData.map((p) => p.dateMs), [allWeightData]);
  const timestampsRef = useRef(timestamps);
  timestampsRef.current = timestamps;

  const dataSpanDays = useMemo(() => {
    if (allWeightData.length < 2) return 0;
    return calendarDaysBetween(allWeightData[0].date, allWeightData[allWeightData.length - 1].date) + 1;
  }, [allWeightData]);

  const maxHistoryDays = useMemo(() => Math.max(dataSpanDays, 30), [dataSpanDays]);

  const windowDays = useSharedValue(initialWindowDays);
  const savedWindowDays = useSharedValue(initialWindowDays);
  const anchorDayOffset = useSharedValue(0);
  const savedAnchorDayOffset = useSharedValue(0);
  const windowStartMs = useSharedValue(daysBefore(new Date(), initialWindowDays).getTime());
  const windowEndMs = useSharedValue(endOfDay(new Date()).getTime());

  const activeGestureCount = useSharedValue(0);
  const lockedYMin = useSharedValue<number | null>(null);
  const lockedYMax = useSharedValue<number | null>(null);
  const currentYMin = useSharedValue(0);
  const currentYMax = useSharedValue(0);

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

  const persistWindowDays = useCallback(
    (days: number) => {
      const rounded = Math.round(days);
      setJsWindowDays(rounded);
      onWindowDaysChange?.(rounded);
    },
    [onWindowDaysChange]
  );

  const getYScale = useCallback(
    (slice: WeightPoint[]): { min: number; max: number } => {
      if (lockedYMin.value != null && lockedYMax.value != null) {
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
      const trendWeights = slice
        .filter((p) => p.trendWeight != null)
        .map((p) => p.trendWeight as number);

      const all = [...weights, ...trendWeights];
      const rawMin = Math.min(...all);
      const rawMax = Math.max(...all);
      const pad = (rawMax - rawMin) * 0.1 || 1;

      return {
        min: Math.floor((rawMin - pad) * 2) / 2,
        max: Math.ceil((rawMax + pad) * 2) / 2,
      };
    },
    [currentYMin, currentYMax, lockedYMin, lockedYMax]
  );

  const updateWindowBounds = useCallback(
    (offsetDays: number, spanDays: number) => {
      const today = new Date();
      const anchor = daysBefore(today, Math.round(offsetDays));
      const start = daysBefore(anchor, Math.floor(spanDays));
      windowStartMs.value = start.getTime();
      windowEndMs.value = endOfDay(anchor).getTime();
    },
    [windowStartMs, windowEndMs]
  );

  const updateVisibleDataAndPath = useCallback(
    (startIdx: number, endIdx: number, startMs: number, endMs: number) => {
      const slice = allWeightData.slice(startIdx, endIdx);
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

      setRawPathD(
        generatePathD(
          slice,
          startMs,
          endMs,
          pw,
          ph,
          scale.min,
          scale.max,
          CHART_PADDING.left,
          CHART_PADDING.top,
          (point) => point.weight
        )
      );

      const trendSlice = slice.filter((point) => point.trendWeight != null);
      if (trendSlice.length >= MIN_POINTS_FOR_TREND) {
        setTrendPathD(
          generatePathD(
            trendSlice,
            startMs,
            endMs,
            pw,
            ph,
            scale.min,
            scale.max,
            CHART_PADDING.left,
            CHART_PADDING.top,
            (point) => point.trendWeight as number
          )
        );
      } else {
        setTrendPathD('');
      }

      const rawWeights = slice.map((point) => point.weight);
      currentYMin.value = Math.min(...rawWeights);
      currentYMax.value = Math.max(...rawWeights);
    },
    [allWeightData, chartHeight, currentYMax, currentYMin, getYScale]
  );

  useAnimatedReaction(
    () => ({ offset: anchorDayOffset.value, span: windowDays.value }),
    (curr, prev) => {
      if (!prev || curr.offset !== prev.offset || curr.span !== prev.span) {
        runOnJS(updateWindowBounds)(curr.offset, curr.span);
      }
    }
  );

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

  useEffect(() => {
    if (allWeightData.length === 0) return;
    const today = new Date();
    const start = daysBefore(today, initialWindowDays);
    const end = endOfDay(today);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const startIdx = timestamps.findIndex((timestamp) => timestamp >= startMs);
    updateVisibleDataAndPath(startIdx >= 0 ? startIdx : 0, timestamps.length, startMs, endMs);
  }, [allWeightData, initialWindowDays, timestamps, updateVisibleDataAndPath]);

  const onGestureActivate = useCallback(() => {
    'worklet';
    const previous = activeGestureCount.value;
    activeGestureCount.value = previous + 1;
    if (previous === 0) {
      const pad = (currentYMax.value - currentYMin.value) * 0.1 || 1;
      lockedYMin.value = currentYMin.value - pad;
      lockedYMax.value = currentYMax.value + pad;
    }
  }, [activeGestureCount, currentYMax, currentYMin, lockedYMax, lockedYMin]);

  const onGestureDeactivate = useCallback(() => {
    'worklet';
    activeGestureCount.value = Math.max(0, activeGestureCount.value - 1);
    if (activeGestureCount.value === 0) {
      lockedYMin.value = null;
      lockedYMax.value = null;
    }
  }, [activeGestureCount, lockedYMax, lockedYMin]);

  const pinchGesture = Gesture.Pinch()
    .enabled(gesturesEnabled)
    .onStart(() => {
      'worklet';
      savedWindowDays.value = windowDays.value;
      onGestureActivate();
    })
    .onUpdate((event) => {
      'worklet';
      const newDays = savedWindowDays.value / event.scale;
      windowDays.value = clamp(newDays, MIN_DAYS, maxHistoryDays);
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
    .enabled(gesturesEnabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      'worklet';
      savedAnchorDayOffset.value = anchorDayOffset.value;
      onGestureActivate();
    })
    .onUpdate((event) => {
      'worklet';
      const daysPerPixel = windowDays.value / chartWidth;
      const daysDelta = -event.translationX * daysPerPixel;
      const newOffset = savedAnchorDayOffset.value + daysDelta;
      anchorDayOffset.value = clamp(newOffset, 0, maxHistoryDays);
    })
    .onEnd(() => {
      'worklet';
      anchorDayOffset.value = Math.round(anchorDayOffset.value);
    })
    .onFinalize(() => {
      'worklet';
      onGestureDeactivate();
    });

  const showTooltipAtPosition = useCallback(
    (x: number) => {
      if (visibleData.length === 0) return;
      const msRange = jsEndMs - jsStartMs || 1;
      const touchMs = jsStartMs + ((x - CHART_PADDING.left) / Math.max(plotWidth, 1)) * msRange;

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
    [jsEndMs, jsStartMs, plotHeight, plotWidth, visibleData, yMax, yMin]
  );

  const hideTooltip = useCallback(() => setTooltipPoint(null), []);

  const longPressGesture = Gesture.LongPress()
    .enabled(gesturesEnabled)
    .minDuration(300)
    .numberOfPointers(1)
    .maxDistance(10)
    .onStart((event) => {
      'worklet';
      if (activeGestureCount.value > 0) return;
      runOnJS(showTooltipAtPosition)(event.x);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(hideTooltip)();
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, longPressGesture);

  const handlePresetPress = useCallback(
    (days: number) => {
      windowDays.value = withTiming(days, { duration: 250 });
      anchorDayOffset.value = withTiming(0, { duration: 250 });
      setJsWindowDays(days);
      onWindowDaysChange?.(days);
    },
    [anchorDayOffset, onWindowDaysChange, windowDays]
  );

  const activePreset = closestPreset(jsWindowDays);

  const latestWeight = visibleData.length > 0 ? visibleData[visibleData.length - 1].weight : null;
  const latestTrend =
    visibleData.length >= MIN_POINTS_FOR_TREND
      ? (visibleData[visibleData.length - 1].trendWeight ?? null)
      : null;
  const firstWeight = visibleData.length > 0 ? visibleData[0].weight : null;
  const weightChange =
    latestWeight != null && firstWeight != null ? latestWeight - firstWeight : null;
  const showTrendLine = trendPathD.length > 0;

  const xAxisLabels = useMemo(() => {
    if (jsStartMs === 0 || jsEndMs === 0) return [];
    const { tickCount, formatFn } = getAxisConfig(jsWindowDays);
    const labels: Array<{ label: string; x: number }> = [];
    const msRange = jsEndMs - jsStartMs || 1;
    for (let i = 0; i <= tickCount; i++) {
      const ms = jsStartMs + (i / tickCount) * msRange;
      const x = CHART_PADDING.left + (i / tickCount) * plotWidth;
      labels.push({ label: formatFn(new Date(ms)), x });
    }
    return labels;
  }, [jsEndMs, jsStartMs, jsWindowDays, plotWidth]);

  const yAxisLabels = useMemo(() => {
    if (yMin === yMax) return [];
    const mid = (yMin + yMax) / 2;
    return [
      { value: yMax, y: CHART_PADDING.top },
      { value: mid, y: CHART_PADDING.top + plotHeight / 2 },
      { value: yMin, y: CHART_PADDING.top + plotHeight },
    ];
  }, [plotHeight, yMax, yMin]);

  const styles = useMemo(() => createStyles(colors, chartHeight), [colors, chartHeight]);

  if (allWeightData.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>Log your first weigh-in to see your trend</Text>
      </View>
    );
  }

  if (allWeightData.length === 1) {
    return (
      <View style={styles.singlePointContainer}>
        <Text style={styles.singlePointValue}>
          {allWeightData[0].weight.toFixed(1)} {unitLabel}
        </Text>
        <Text style={styles.singlePointHint}>Log a few more weigh-ins to see your trend</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statLabel}>Raw</Text>
          <Text style={styles.statValue}>
            {latestWeight != null ? `${latestWeight.toFixed(1)} ${unitLabel}` : '--'}
          </Text>
        </View>

        {showTrendLine && latestTrend != null ? (
          <View>
            <Text style={styles.statLabel}>Trend</Text>
            <Text style={styles.statValue}>
              {latestTrend.toFixed(1)} {unitLabel}
            </Text>
          </View>
        ) : null}

        {typeof targetWeightKg === 'number' ? (
          <View>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>
              {(targetWeightKg * unitMultiplier).toFixed(1)} {unitLabel}
            </Text>
          </View>
        ) : null}

        {typeof weightChange === 'number' ? (
          <View>
            <Text style={styles.statLabel}>Change</Text>
            <Text
              style={[
                styles.statValue,
                weightChange < 0 ? styles.positiveChange : styles.neutralChange,
              ]}
            >
              {weightChange > 0 ? '+' : ''}
              {weightChange.toFixed(1)} {unitLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.chartContainer} onLayout={onChartLayout}>
          <Svg width={chartWidth} height={chartHeight}>
            {yAxisLabels.map((label, i) => (
              <Line
                key={`grid-${i}`}
                x1={CHART_PADDING.left}
                y1={label.y}
                x2={CHART_PADDING.left + plotWidth}
                y2={label.y}
                stroke={colors.grid}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            ))}

            {yAxisLabels.map((label, i) => (
              <SvgText
                key={`y-${i}`}
                x={CHART_PADDING.left - 6}
                y={label.y + 4}
                fontSize={9}
                fill={colors.mutedText}
                textAnchor="end"
              >
                {(label.value ?? 0).toFixed(0)}
              </SvgText>
            ))}

            {xAxisLabels.map((label, i) => (
              <SvgText
                key={`x-${i}`}
                x={label.x}
                y={chartHeight - 4}
                fontSize={9}
                fill={colors.mutedText}
                textAnchor="middle"
              >
                {label.label}
              </SvgText>
            ))}

            {rawPathD ? (
              <Path
                d={rawPathD}
                stroke={colors.rawWeight}
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {trendPathD ? (
              <Path
                d={trendPathD}
                stroke={colors.trendLine}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {visibleData.length <= 30
              ? visibleData.map((point, i) => {
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
                      fill={isLast ? colors.trendLine : colors.pointFill}
                      stroke={colors.pointStroke}
                      strokeWidth={isLast ? 0 : 1}
                    />
                  );
                })
              : null}

            {tooltipPoint ? (
              <>
                <Circle cx={tooltipX} cy={tooltipY} r={6} fill={colors.trendLine} stroke={colors.background} strokeWidth={2} />
                <Rect
                  x={Math.min(Math.max(tooltipX - 45, 0), chartWidth - 90)}
                  y={Math.max(tooltipY - 52, 0)}
                  width={90}
                  height={40}
                  rx={6}
                  fill={colors.tooltipBg}
                  stroke={colors.tooltipBorder}
                  strokeWidth={1}
                />
                <SvgText
                  x={Math.min(Math.max(tooltipX, 45), chartWidth - 45)}
                  y={Math.max(tooltipY - 36, 14)}
                  fontSize={10}
                  fill={colors.mutedText}
                  textAnchor="middle"
                >
                  {formatMedDate(tooltipPoint.date)}
                </SvgText>
                <SvgText
                  x={Math.min(Math.max(tooltipX, 45), chartWidth - 45)}
                  y={Math.max(tooltipY - 22, 28)}
                  fontSize={12}
                  fontWeight="600"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  {tooltipPoint.weight.toFixed(1)} {unitLabel}
                </SvgText>
              </>
            ) : null}

            {windowEmpty ? (
              <SvgText
                x={CHART_PADDING.left + plotWidth / 2}
                y={CHART_PADDING.top + plotHeight / 2}
                fontSize={12}
                fill={colors.mutedText}
                textAnchor="middle"
              >
                No data in this range
              </SvgText>
            ) : null}
          </Svg>
        </Animated.View>
      </GestureDetector>

      {showLegend && showTrendLine ? (
        <>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: colors.rawWeight }]} />
              <Text style={styles.legendTextMuted}>Raw</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLineBold, { backgroundColor: colors.trendLine }]} />
              <Text style={styles.legendText}>Trend</Text>
            </View>
          </View>
          <Text style={styles.legendHelperText}>
            Raw = scale entry, Trend = smoothed (7-day EWMA)
          </Text>
        </>
      ) : null}

      {showPresets ? (
        <View style={styles.presetRow}>
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.label;
            const isDisabled = preset.days > dataSpanDays && dataSpanDays > 0;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetPill,
                  isActive ? { backgroundColor: colors.presetActiveBg } : null,
                  isDisabled ? styles.presetDisabled : null,
                ]}
                onPress={() => (!isDisabled ? handlePresetPress(preset.days) : undefined)}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled || !gesturesEnabled}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color: isDisabled
                        ? colors.presetDisabledText
                        : isActive
                          ? colors.presetActiveText
                          : colors.presetInactiveText,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: WeightTrendChartPalette, chartHeight: number) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: 'row',
      gap: 24,
      marginBottom: 12,
    },
    statLabel: {
      fontSize: 12,
      color: colors.mutedText,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    positiveChange: {
      color: colors.positiveChange,
    },
    neutralChange: {
      color: colors.neutralChange,
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
      color: colors.mutedText,
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
      color: colors.text,
    },
    singlePointHint: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: 'center',
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
      marginTop: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendLine: {
      width: 16,
      height: 1.5,
      borderRadius: 1,
      opacity: 0.8,
    },
    legendLineBold: {
      width: 16,
      height: 2.5,
      borderRadius: 1,
    },
    legendText: {
      fontSize: 11,
      color: colors.text,
    },
    legendTextMuted: {
      fontSize: 11,
      color: colors.mutedText,
    },
    legendHelperText: {
      marginTop: 6,
      textAlign: 'center',
      fontSize: 10,
      color: colors.mutedText,
    },
    presetRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
    },
    presetPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    presetDisabled: {
      opacity: 0.6,
    },
    presetText: {
      fontSize: 12,
      fontWeight: '500',
    },
  });
