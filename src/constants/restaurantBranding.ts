/**
 * Restaurant Branding Constants
 * Styled initials and brand colors for restaurant cards
 * Uses brand-inspired colors (not logos) for visual identification
 */

export interface RestaurantBranding {
  initials: string;
  backgroundColor: string;
  textColor: string;
}

/**
 * Brand styling by restaurant ID
 * Colors are inspired by brand identity but are generic enough to avoid trademark issues
 */
export const RESTAURANT_BRANDING: Record<string, RestaurantBranding> = {
  mcdonalds: {
    initials: 'McD',
    backgroundColor: '#FFC72C', // Golden yellow
    textColor: '#DA291C',       // Red
  },
  chipotle: {
    initials: 'CMG',
    backgroundColor: '#441500', // Dark brown
    textColor: '#FFFFFF',
  },
  starbucks: {
    initials: 'SB',
    backgroundColor: '#00704A', // Forest green
    textColor: '#FFFFFF',
  },
  chickfila: {
    initials: 'CFA',
    backgroundColor: '#E51636', // Red
    textColor: '#FFFFFF',
  },
  subway: {
    initials: 'SUB',
    backgroundColor: '#008C15', // Green
    textColor: '#FFC600',       // Yellow
  },
  tacobell: {
    initials: 'TB',
    backgroundColor: '#702082', // Purple
    textColor: '#FFFFFF',
  },
  wendys: {
    initials: 'W',
    backgroundColor: '#E2203A', // Red
    textColor: '#FFFFFF',
  },
  panera: {
    initials: 'PB',
    backgroundColor: '#4A7729', // Olive green
    textColor: '#FFFFFF',
  },
  fiveguys: {
    initials: '5G',
    backgroundColor: '#DA291C', // Red
    textColor: '#FFFFFF',
  },
  pandaexpress: {
    initials: 'PE',
    backgroundColor: '#D62728', // Red-orange
    textColor: '#FFFFFF',
  },
};

/**
 * Get branding for a restaurant, with fallback for unknown restaurants
 */
export function getRestaurantBranding(restaurantId: string, restaurantName: string): RestaurantBranding {
  const branding = RESTAURANT_BRANDING[restaurantId];

  if (branding) {
    return branding;
  }

  // Fallback: Generate initials from name and use neutral colors
  const words = restaurantName.split(/\s+/);
  const initials = words.length >= 2
    ? words.slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : restaurantName.slice(0, 2).toUpperCase();

  return {
    initials,
    backgroundColor: '#6B7280', // Neutral gray
    textColor: '#FFFFFF',
  };
}
