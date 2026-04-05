import { create } from 'zustand'

interface SettingsStore {
  version: number
  increment: () => void
}

/**
 * Settings store for triggering re-renders when settings change
 * Used by setting.tsx to refresh settings display after config updates
 */
export const useSettingsStore = create<SettingsStore>((set) => ({
  version: 0,
  increment: () => set((state) => ({ version: state.version + 1 })),
}))
