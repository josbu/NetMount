import { create } from 'zustand'

interface StatsStore {
  version: number
  increment: () => void
}

/**
 * Stats store for triggering re-renders when stats update
 * Used by home.tsx to refresh transmission statistics display
 */
export const useStatsStore = create<StatsStore>((set) => ({
  version: 0,
  increment: () => set((state) => ({ version: state.version + 1 })),
}))
