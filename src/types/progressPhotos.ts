/**
 * Progress Photos Types
 * Types for privacy-first progress photo tracking
 */

export interface ProgressPhoto {
  id: string;
  localUri: string;
  thumbnailUri?: string;
  date: string;
  timestamp: number;
  category: PhotoCategory;
  notes?: string;
  weight?: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PhotoCategory =
  | 'front'
  | 'side'
  | 'back'
  | 'other';

export interface PhotoComparison {
  id: string;
  photo1Id: string;
  photo2Id: string;
  comparisonType: ComparisonType;
  createdAt: string;
}

export type ComparisonType =
  | 'side_by_side'
  | 'slider_overlay';

export interface PhotoTimelineEntry {
  date: string;
  photos: ProgressPhoto[];
  weight?: number;
  daysSinceFirst: number;
}

export interface PhotoTimelineFilter {
  category: PhotoCategory | 'all';
  startDate?: string;
  endDate?: string;
}

export interface PhotoStats {
  totalPhotos: number;
  photosByCategory: Record<PhotoCategory, number>;
  firstPhotoDate?: string;
  lastPhotoDate?: string;
  daysCovered: number;
}
