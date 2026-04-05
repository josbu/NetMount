import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { MountList } from '../type/rclone/rcloneInfo'
import { reupMountService } from '../services/storage/MountService'

/**
 * Mount store state interface
 */
interface MountState {
  /** List of mounted storage points */
  mountList: MountList[]
  /** Loading state indicator */
  isLoading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Mount store actions interface
 */
interface MountActions {
  /** Set the entire mount list */
  setMountList: (list: MountList[]) => void
  /** Add a single mount to the list */
  addMount: (mount: MountList) => void
  /** Remove a mount by its path */
  removeMount: (mountPath: string) => void
  /** Update a mount's properties by its path */
  updateMount: (mountPath: string, updates: Partial<MountList>) => void
  /** Set loading state */
  setLoading: (loading: boolean) => void
  /** Set error message */
  setError: (error: string | null) => void
  /** Refresh mounts from the backend */
  refreshMounts: () => Promise<void>
}

/**
 * Mount store type combining state and actions
 */
type MountStore = MountState & MountActions

/**
 * Zustand store for managing mount state
 * Uses immer middleware for immutable state updates
 */
export const useMountStore = create<MountStore>()(
  immer((set, get) => ({
    // Initial state
    mountList: [],
    isLoading: false,
    error: null,

    // Actions
    setMountList: (list: MountList[]) => {
      set((state) => {
        state.mountList = list
      })
    },

    addMount: (mount: MountList) => {
      set((state) => {
        state.mountList.push(mount)
      })
    },

    removeMount: (mountPath: string) => {
      set((state) => {
        state.mountList = state.mountList.filter(
          (m: MountList) => m.mountPath !== mountPath
        )
      })
    },

    updateMount: (mountPath: string, updates: Partial<MountList>) => {
      set((state) => {
        const index = state.mountList.findIndex((m: MountList) => m.mountPath === mountPath)
        if (index !== -1) {
          state.mountList[index] = {
            ...state.mountList[index]!,
            ...updates,
          }
        }
      })
    },

    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading
      })
    },

    setError: (error: string | null) => {
      set((state) => {
        state.error = error
      })
    },

    refreshMounts: async () => {
      try {
        get().setLoading(true)
        get().setError(null)
        await reupMountService(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh mounts'
        get().setError(errorMessage)
      } finally {
        get().setLoading(false)
      }
    },
  }))
)

/**
 * Selector hook to get the mount list
 * @returns Array of mount list items
 */
export function useMountList(): MountList[] {
  return useMountStore((state) => state.mountList)
}

/**
 * Selector hook to get a specific mount by path
 * @param mountPath - The mount path to search for
 * @returns The mount item if found, undefined otherwise
 */
export function useMount(mountPath: string): MountList | undefined {
  return useMountStore((state) =>
    state.mountList.find((m) => m.mountPath === mountPath)
  )
}

/**
 * Selector hook to get the loading state
 * @returns Boolean indicating if mounts are loading
 */
export function useMountLoading(): boolean {
  return useMountStore((state) => state.isLoading)
}
