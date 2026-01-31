/**
 * Progress Photo Store Tests
 * Tests for progress photo tracking state management
 */

const mockDb = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  runAsync: jest.fn(),
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

import { useProgressPhotoStore } from '@/stores/progressPhotoStore';
import { ProgressPhoto } from '@/types/progressPhotos';

const makePhoto = (overrides: Partial<ProgressPhoto> = {}): ProgressPhoto => ({
  id: 'photo-1',
  localUri: 'file:///photos/photo-1.jpg',
  date: '2024-06-10',
  timestamp: 1718000000000,
  category: 'front',
  isPrivate: false,
  createdAt: '2024-06-10T08:00:00.000Z',
  updatedAt: '2024-06-10T08:00:00.000Z',
  ...overrides,
});

describe('progressPhotoStore', () => {
  beforeEach(() => {
    useProgressPhotoStore.setState({
      photos: [],
      timeline: [],
      selectedPhotoId: null,
      comparisonPhoto1Id: null,
      comparisonPhoto2Id: null,
      comparisonMode: 'side_by_side',
      filter: { category: 'all' },
      isLoading: false,
      isLoaded: false,
      error: null,
      stats: {
        totalPhotos: 0,
        photosByCategory: { front: 0, side: 0, back: 0, other: 0 },
        daysCovered: 0,
      },
    });
    jest.clearAllMocks();
  });

  // ============================================================
  // Initial State
  // ============================================================

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useProgressPhotoStore.getState();

      expect(state.photos).toEqual([]);
      expect(state.timeline).toEqual([]);
      expect(state.selectedPhotoId).toBeNull();
      expect(state.comparisonPhoto1Id).toBeNull();
      expect(state.comparisonPhoto2Id).toBeNull();
      expect(state.comparisonMode).toBe('side_by_side');
      expect(state.filter).toEqual({ category: 'all' });
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
    });
  });

  // ============================================================
  // Selection Actions
  // ============================================================

  describe('selectPhoto', () => {
    it('sets selectedPhotoId', () => {
      useProgressPhotoStore.getState().selectPhoto('photo-1');
      expect(useProgressPhotoStore.getState().selectedPhotoId).toBe('photo-1');
    });

    it('clears selection with null', () => {
      useProgressPhotoStore.setState({ selectedPhotoId: 'photo-1' });
      useProgressPhotoStore.getState().selectPhoto(null);
      expect(useProgressPhotoStore.getState().selectedPhotoId).toBeNull();
    });
  });

  describe('setComparisonPhoto1 / setComparisonPhoto2', () => {
    it('sets comparison photo 1', () => {
      useProgressPhotoStore.getState().setComparisonPhoto1('photo-a');
      expect(useProgressPhotoStore.getState().comparisonPhoto1Id).toBe('photo-a');
    });

    it('sets comparison photo 2', () => {
      useProgressPhotoStore.getState().setComparisonPhoto2('photo-b');
      expect(useProgressPhotoStore.getState().comparisonPhoto2Id).toBe('photo-b');
    });
  });

  describe('setComparisonMode', () => {
    it('changes comparison mode', () => {
      useProgressPhotoStore.getState().setComparisonMode('slider_overlay');
      expect(useProgressPhotoStore.getState().comparisonMode).toBe('slider_overlay');
    });
  });

  describe('clearComparison', () => {
    it('clears both comparison photo ids', () => {
      useProgressPhotoStore.setState({
        comparisonPhoto1Id: 'photo-a',
        comparisonPhoto2Id: 'photo-b',
      });

      useProgressPhotoStore.getState().clearComparison();

      const state = useProgressPhotoStore.getState();
      expect(state.comparisonPhoto1Id).toBeNull();
      expect(state.comparisonPhoto2Id).toBeNull();
    });
  });

  // ============================================================
  // Filter Actions
  // ============================================================

  describe('setFilter', () => {
    it('updates filter category and rebuilds timeline', () => {
      const photos = [
        makePhoto({ id: 'p1', category: 'front', date: '2024-06-10' }),
        makePhoto({ id: 'p2', category: 'side', date: '2024-06-10' }),
        makePhoto({ id: 'p3', category: 'front', date: '2024-06-11' }),
      ];
      useProgressPhotoStore.setState({ photos });

      useProgressPhotoStore.getState().setFilter({ category: 'front' });

      const state = useProgressPhotoStore.getState();
      expect(state.filter.category).toBe('front');
      // Timeline should only have front photos
      const allTimelinePhotos = state.timeline.flatMap(entry => entry.photos);
      expect(allTimelinePhotos.every(p => p.category === 'front')).toBe(true);
    });

    it('filters by date range', () => {
      const photos = [
        makePhoto({ id: 'p1', date: '2024-06-01', timestamp: 1717200000000 }),
        makePhoto({ id: 'p2', date: '2024-06-15', timestamp: 1718400000000 }),
        makePhoto({ id: 'p3', date: '2024-06-30', timestamp: 1719700000000 }),
      ];
      useProgressPhotoStore.setState({ photos });

      useProgressPhotoStore.getState().setFilter({
        startDate: '2024-06-10',
        endDate: '2024-06-20',
      });

      const allTimelinePhotos = useProgressPhotoStore
        .getState()
        .timeline.flatMap(e => e.photos);
      expect(allTimelinePhotos).toHaveLength(1);
      expect(allTimelinePhotos[0].id).toBe('p2');
    });
  });

  describe('clearFilter', () => {
    it('resets filter to category:all and rebuilds timeline with all photos', () => {
      const photos = [
        makePhoto({ id: 'p1', category: 'front' }),
        makePhoto({ id: 'p2', category: 'side' }),
      ];
      useProgressPhotoStore.setState({
        photos,
        filter: { category: 'front' },
      });

      useProgressPhotoStore.getState().clearFilter();

      const state = useProgressPhotoStore.getState();
      expect(state.filter).toEqual({ category: 'all' });
      const allTimelinePhotos = state.timeline.flatMap(e => e.photos);
      expect(allTimelinePhotos).toHaveLength(2);
    });
  });

  // ============================================================
  // Getters
  // ============================================================

  describe('getPhotoById', () => {
    it('returns the photo with matching id', () => {
      const photos = [makePhoto({ id: 'p1' }), makePhoto({ id: 'p2' })];
      useProgressPhotoStore.setState({ photos });

      const result = useProgressPhotoStore.getState().getPhotoById('p2');
      expect(result?.id).toBe('p2');
    });

    it('returns undefined for non-existent id', () => {
      useProgressPhotoStore.setState({ photos: [makePhoto()] });

      const result = useProgressPhotoStore.getState().getPhotoById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getPhotosByDate', () => {
    it('returns all photos for a given date', () => {
      const photos = [
        makePhoto({ id: 'p1', date: '2024-06-10' }),
        makePhoto({ id: 'p2', date: '2024-06-10' }),
        makePhoto({ id: 'p3', date: '2024-06-11' }),
      ];
      useProgressPhotoStore.setState({ photos });

      const result = useProgressPhotoStore.getState().getPhotosByDate('2024-06-10');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no photos match', () => {
      useProgressPhotoStore.setState({ photos: [makePhoto({ date: '2024-06-10' })] });

      const result = useProgressPhotoStore.getState().getPhotosByDate('2024-01-01');
      expect(result).toEqual([]);
    });
  });

  describe('getPhotosByCategory', () => {
    it('returns all photos for a given category', () => {
      const photos = [
        makePhoto({ id: 'p1', category: 'front' }),
        makePhoto({ id: 'p2', category: 'side' }),
        makePhoto({ id: 'p3', category: 'front' }),
      ];
      useProgressPhotoStore.setState({ photos });

      const result = useProgressPhotoStore.getState().getPhotosByCategory('front');
      expect(result).toHaveLength(2);
    });
  });

  describe('getFirstPhoto', () => {
    it('returns the photo with the smallest timestamp', () => {
      const photos = [
        makePhoto({ id: 'p1', timestamp: 1718000000000 }),
        makePhoto({ id: 'p2', timestamp: 1717000000000 }),
        makePhoto({ id: 'p3', timestamp: 1719000000000 }),
      ];
      useProgressPhotoStore.setState({ photos });

      const result = useProgressPhotoStore.getState().getFirstPhoto();
      expect(result?.id).toBe('p2');
    });

    it('returns undefined when no photos exist', () => {
      const result = useProgressPhotoStore.getState().getFirstPhoto();
      expect(result).toBeUndefined();
    });
  });

  describe('getLatestPhoto', () => {
    it('returns the photo with the largest timestamp', () => {
      const photos = [
        makePhoto({ id: 'p1', timestamp: 1718000000000 }),
        makePhoto({ id: 'p2', timestamp: 1717000000000 }),
        makePhoto({ id: 'p3', timestamp: 1719000000000 }),
      ];
      useProgressPhotoStore.setState({ photos });

      const result = useProgressPhotoStore.getState().getLatestPhoto();
      expect(result?.id).toBe('p3');
    });

    it('returns undefined when no photos exist', () => {
      const result = useProgressPhotoStore.getState().getLatestPhoto();
      expect(result).toBeUndefined();
    });
  });

  // ============================================================
  // Timeline Building (tested through setState + getters)
  // ============================================================

  describe('buildTimeline (via setFilter/clearFilter)', () => {
    it('groups photos by date in descending order', () => {
      const photos = [
        makePhoto({ id: 'p1', date: '2024-06-10', timestamp: 1718000000000 }),
        makePhoto({ id: 'p2', date: '2024-06-12', timestamp: 1718200000000 }),
        makePhoto({ id: 'p3', date: '2024-06-10', timestamp: 1718000001000 }),
      ];
      useProgressPhotoStore.setState({ photos });

      // Trigger timeline rebuild
      useProgressPhotoStore.getState().clearFilter();

      const { timeline } = useProgressPhotoStore.getState();
      expect(timeline).toHaveLength(2);
      // Descending date order: 2024-06-12 first
      expect(timeline[0].date).toBe('2024-06-12');
      expect(timeline[1].date).toBe('2024-06-10');
      // The June 10 group should have 2 photos
      expect(timeline[1].photos).toHaveLength(2);
    });

    it('calculates daysSinceFirst correctly', () => {
      const photos = [
        makePhoto({ id: 'p1', date: '2024-06-01', timestamp: 1717200000000 }),
        makePhoto({ id: 'p2', date: '2024-06-11', timestamp: 1718100000000 }),
      ];
      useProgressPhotoStore.setState({ photos });

      useProgressPhotoStore.getState().clearFilter();

      const { timeline } = useProgressPhotoStore.getState();
      // First entry is later date (descending), second entry is earlier date
      expect(timeline[0].date).toBe('2024-06-11');
      expect(timeline[0].daysSinceFirst).toBe(10);
      expect(timeline[1].date).toBe('2024-06-01');
      expect(timeline[1].daysSinceFirst).toBe(0);
    });
  });

  // ============================================================
  // calculateStats (tested through setState + clearFilter)
  // ============================================================

  describe('calculateStats (via loadPhotos / addPhoto)', () => {
    it('calculates correct stats for empty photo list', () => {
      const state = useProgressPhotoStore.getState();
      expect(state.stats.totalPhotos).toBe(0);
      expect(state.stats.daysCovered).toBe(0);
      expect(state.stats.photosByCategory).toEqual({
        front: 0,
        side: 0,
        back: 0,
        other: 0,
      });
    });

    it('computes stats when photos are loaded from DB', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        {
          id: 'p1',
          local_uri: 'file:///p1.jpg',
          thumbnail_uri: null,
          date: '2024-06-10',
          timestamp: 1718000000000,
          category: 'front',
          notes: null,
          weight_kg: null,
          is_private: 0,
          created_at: '2024-06-10T08:00:00Z',
          updated_at: '2024-06-10T08:00:00Z',
        },
        {
          id: 'p2',
          local_uri: 'file:///p2.jpg',
          thumbnail_uri: null,
          date: '2024-06-11',
          timestamp: 1718100000000,
          category: 'side',
          notes: null,
          weight_kg: 80.0,
          is_private: 1,
          created_at: '2024-06-11T08:00:00Z',
          updated_at: '2024-06-11T08:00:00Z',
        },
      ]);

      // Reset isLoaded to allow loading
      useProgressPhotoStore.setState({ isLoaded: false });
      await useProgressPhotoStore.getState().loadPhotos();

      const { stats } = useProgressPhotoStore.getState();
      expect(stats.totalPhotos).toBe(2);
      expect(stats.photosByCategory.front).toBe(1);
      expect(stats.photosByCategory.side).toBe(1);
      expect(stats.daysCovered).toBe(2);
      expect(stats.firstPhotoDate).toBe('2024-06-10');
      expect(stats.lastPhotoDate).toBe('2024-06-11');
    });
  });

  // ============================================================
  // loadPhotos
  // ============================================================

  describe('loadPhotos', () => {
    it('short-circuits if already loaded', async () => {
      useProgressPhotoStore.setState({ isLoaded: true });

      await useProgressPhotoStore.getState().loadPhotos();

      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('maps DB rows to ProgressPhoto objects correctly', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        {
          id: 'p1',
          local_uri: 'file:///p1.jpg',
          thumbnail_uri: 'file:///p1_thumb.jpg',
          date: '2024-06-10',
          timestamp: 1718000000000,
          category: 'back',
          notes: 'Back progress',
          weight_kg: 75.5,
          is_private: 1,
          created_at: '2024-06-10T08:00:00Z',
          updated_at: '2024-06-10T09:00:00Z',
        },
      ]);

      await useProgressPhotoStore.getState().loadPhotos();

      const { photos } = useProgressPhotoStore.getState();
      expect(photos).toHaveLength(1);
      expect(photos[0].localUri).toBe('file:///p1.jpg');
      expect(photos[0].thumbnailUri).toBe('file:///p1_thumb.jpg');
      expect(photos[0].category).toBe('back');
      expect(photos[0].notes).toBe('Back progress');
      expect(photos[0].weight).toBe(75.5);
      expect(photos[0].isPrivate).toBe(true);
    });

    it('sets error on failure', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('SQL error'));

      await useProgressPhotoStore.getState().loadPhotos();

      const state = useProgressPhotoStore.getState();
      expect(state.error).toBe('SQL error');
      expect(state.isLoaded).toBe(true);
    });
  });

  // ============================================================
  // deletePhoto
  // ============================================================

  describe('deletePhoto', () => {
    it('clears selection if deleted photo was selected', async () => {
      const photos = [makePhoto({ id: 'p1' }), makePhoto({ id: 'p2' })];
      useProgressPhotoStore.setState({
        photos,
        selectedPhotoId: 'p1',
        comparisonPhoto1Id: 'p1',
        comparisonPhoto2Id: 'p2',
      });

      await useProgressPhotoStore.getState().deletePhoto('p1');

      const state = useProgressPhotoStore.getState();
      expect(state.selectedPhotoId).toBeNull();
      expect(state.comparisonPhoto1Id).toBeNull();
      // p2 should remain
      expect(state.comparisonPhoto2Id).toBe('p2');
    });
  });
});
