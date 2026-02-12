import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const SAGE_GREEN = '#7C9A7C';

interface PlanCardProps {
  label: string;
  priceText: string;
  detail?: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}

export function PlanCard({ label, priceText, detail, badge, selected, onSelect }: PlanCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.bgSecondary, borderColor: colors.border },
        selected && { borderColor: SAGE_GREEN, borderWidth: 2 },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} plan, ${priceText}`}
    >
      <View style={styles.row}>
        <View style={styles.radio}>
          {selected ? (
            <View style={[styles.radioOuter, { borderColor: SAGE_GREEN }]}>
              <View style={[styles.radioInner, { backgroundColor: SAGE_GREEN }]} />
            </View>
          ) : (
            <View style={[styles.radioOuter, { borderColor: colors.border }]} />
          )}
        </View>
        <View style={styles.content}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: SAGE_GREEN }]}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.price, { color: colors.textPrimary }]}>{priceText}</Text>
          {detail && (
            <Text style={[styles.detail, { color: colors.textTertiary }]}>{detail}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    marginRight: 12,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  price: {
    fontSize: 15,
    marginTop: 4,
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
});
