import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PaywallCategory } from './analyticsEnums';
import { FEATURE_CHIPS, FeatureChip } from './upgradeContent';

const SAGE_GREEN = '#7C9A7C';

interface PremiumFeatureChipsProps {
  activeCategory: PaywallCategory;
  onCategoryChange: (category: PaywallCategory) => void;
}

export function PremiumFeatureChips({ activeCategory, onCategoryChange }: PremiumFeatureChipsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const chipRefs = useRef<Record<number, number>>({});

  useEffect(() => {
    // Auto-scroll to keep active chip visible
    const activeIndex = FEATURE_CHIPS.findIndex((c) => c.category === activeCategory);
    const offset = chipRefs.current[activeIndex];
    if (offset !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, offset - 16), animated: true });
    }
  }, [activeCategory]);

  return (
    <View accessibilityRole="list">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {FEATURE_CHIPS.map((chip: FeatureChip, index: number) => {
          const isActive = chip.category === activeCategory;
          return (
            <TouchableOpacity
              key={index}
              onLayout={(e) => {
                chipRefs.current[index] = e.nativeEvent.layout.x;
              }}
              style={[
                styles.chip,
                isActive
                  ? { backgroundColor: SAGE_GREEN }
                  : { borderColor: SAGE_GREEN, borderWidth: 1 },
              ]}
              onPress={() => onCategoryChange(chip.category)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${chip.label}: tap to see details`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={styles.chipIcon}>{chip.icon}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? '#FFFFFF' : SAGE_GREEN },
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
