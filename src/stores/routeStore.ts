import { create } from 'zustand';

interface RouteState {
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  currentPath: '/',
  setCurrentPath: (path: string) => set({ currentPath: path }),
}));
