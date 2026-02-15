import { useRouteStore } from '@/stores/routeStore';

describe('Route Store', () => {
  beforeEach(() => {
    useRouteStore.setState({
      currentPath: '/',
    });
  });

  describe('initial state', () => {
    it('should default currentPath to "/"', () => {
      const state = useRouteStore.getState();

      expect(state.currentPath).toBe('/');
    });

    it('should expose setCurrentPath as a function', () => {
      const state = useRouteStore.getState();

      expect(typeof state.setCurrentPath).toBe('function');
    });
  });

  describe('setCurrentPath', () => {
    it('should update currentPath to a new value', () => {
      useRouteStore.getState().setCurrentPath('/home');

      expect(useRouteStore.getState().currentPath).toBe('/home');
    });

    it('should update currentPath to a nested path', () => {
      useRouteStore.getState().setCurrentPath('/settings/profile');

      expect(useRouteStore.getState().currentPath).toBe('/settings/profile');
    });

    it('should update currentPath to a deeply nested path', () => {
      useRouteStore.getState().setCurrentPath('/settings/profile/edit/name');

      expect(useRouteStore.getState().currentPath).toBe('/settings/profile/edit/name');
    });

    it('should handle setting path to empty string', () => {
      useRouteStore.getState().setCurrentPath('');

      expect(useRouteStore.getState().currentPath).toBe('');
    });

    it('should handle setting path to the same value', () => {
      expect(useRouteStore.getState().currentPath).toBe('/');

      useRouteStore.getState().setCurrentPath('/');

      expect(useRouteStore.getState().currentPath).toBe('/');
    });

    it('should handle setting path back to root after navigating away', () => {
      useRouteStore.getState().setCurrentPath('/dashboard');
      expect(useRouteStore.getState().currentPath).toBe('/dashboard');

      useRouteStore.getState().setCurrentPath('/');
      expect(useRouteStore.getState().currentPath).toBe('/');
    });

    it('should handle paths with query-like segments', () => {
      useRouteStore.getState().setCurrentPath('/food/123');

      expect(useRouteStore.getState().currentPath).toBe('/food/123');
    });

    it('should handle paths with special characters', () => {
      useRouteStore.getState().setCurrentPath('/search?q=chicken+breast');

      expect(useRouteStore.getState().currentPath).toBe('/search?q=chicken+breast');
    });
  });

  describe('multiple sequential path changes', () => {
    it('should correctly reflect the last path after multiple changes', () => {
      const paths = ['/home', '/settings', '/profile', '/log', '/dashboard'];

      for (const path of paths) {
        useRouteStore.getState().setCurrentPath(path);
      }

      expect(useRouteStore.getState().currentPath).toBe('/dashboard');
    });

    it('should update state independently on each call', () => {
      useRouteStore.getState().setCurrentPath('/first');
      expect(useRouteStore.getState().currentPath).toBe('/first');

      useRouteStore.getState().setCurrentPath('/second');
      expect(useRouteStore.getState().currentPath).toBe('/second');

      useRouteStore.getState().setCurrentPath('/third');
      expect(useRouteStore.getState().currentPath).toBe('/third');
    });
  });

  describe('state isolation', () => {
    it('should reset to default state between tests (test A)', () => {
      useRouteStore.getState().setCurrentPath('/test-a-path');

      expect(useRouteStore.getState().currentPath).toBe('/test-a-path');
    });

    it('should reset to default state between tests (test B)', () => {
      // This verifies that beforeEach reset the state from test A
      expect(useRouteStore.getState().currentPath).toBe('/');
    });

    it('should allow setState to reset the store', () => {
      useRouteStore.getState().setCurrentPath('/some/deep/path');
      expect(useRouteStore.getState().currentPath).toBe('/some/deep/path');

      useRouteStore.setState({ currentPath: '/' });
      expect(useRouteStore.getState().currentPath).toBe('/');
    });
  });
});
