/**
 * Dashboard Types
 * Type definitions for the customizable dashboard feature
 */

export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetType =
  | 'calorie_ring'
  | 'macro_bars'
  | 'water_tracker'
  | 'weight_trend'
  | 'todays_meals'
  | 'streak_badge'
  | 'weekly_average'
  | 'protein_focus'
  | 'quick_add'
  | 'goals_summary'
  | 'meal_ideas';

/**
 * Widget-specific configuration options
 */
export interface WidgetConfig {
  // For water_tracker
  dailyGoal?: number;

  // For weight_trend
  chartRange?: '7d' | '30d' | '90d';

  // For macro_bars
  showFiber?: boolean;

  // For quick_add
  pinnedFoodIds?: string[];
  showRecent?: boolean;
}

/**
 * Widget configuration stored in AsyncStorage
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: number;
  isVisible: boolean;
  config?: WidgetConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Props passed to all widget components
 */
export interface WidgetProps {
  config?: WidgetConfig;
  isEditMode: boolean;
  onPress?: () => void;
}

/**
 * Widget definition registry entry
 */
export interface WidgetDefinition {
  id: WidgetType;
  name: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  component: React.ComponentType<WidgetProps>;
  defaultConfig?: WidgetConfig;
}

/**
 * Widget heights by size
 */
export const WIDGET_HEIGHTS: Record<WidgetSize, number> = {
  small: 80,
  medium: 160,
  large: 280,
};
