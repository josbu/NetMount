import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { StorageList } from '../type/rclone/rcloneInfo'
import { reupStorage } from '../services/storage/StorageManager'
import { rcloneInfo } from '../services/rclone'

/**
 * Storage store state interface
 */
interface StorageState {
  /** List of all available storages */
  storageList: StorageList[]
  /** Loading state indicator */
  isLoading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Storage store actions interface
 */
interface StorageActions {
  /**
   * Set the entire storage list
   * @param list - New storage list to set
   */
  setStorageList: (list: StorageList[]) => void
  
  /**
   * Update a specific storage by name
   * @param name - Storage name to update
   * @param updates - Partial updates to apply
   */
  updateStorage: (name: string, updates: Partial<StorageList>) => void
  
  /**
   * Add a new storage to the list
   * @param storage - Storage to add
   */
  addStorage: (storage: StorageList) => void
  
  /**
   * Remove a storage by name
   * @param name - Storage name to remove
   */
  removeStorage: (name: string) => void
  
  /**
   * Set loading state
   * @param loading - Loading state
   */
  setLoading: (loading: boolean) => void
  
  /**
   * Set error state
   * @param error - Error message or null
   */
  setError: (error: string | null) => void
  
  /**
   * Refresh storage list by calling reupStorage
   * This will update the global rcloneInfo and trigger hooks
   */
  refreshStorage: () => Promise<void>
}

/**
 * Storage store type combining state and actions
 */
type StorageStore = StorageState & StorageActions

/**
 * Zustand store for managing storage state
 * Uses immer middleware for immutable updates
 */
export const useStorageStore = create<StorageStore>()(
  immer((set, get) => ({
    // Initial state - sync with global rcloneInfo
    storageList: rcloneInfo.storageList,
    isLoading: false,
    error: null,

    // Actions
    setStorageList: (list) => {
      set((state) => {
        state.storageList = list
      })
    },

    updateStorage: (name, updates) => {
      set((state) => {
        const storage = state.storageList.find((s: StorageList) => s.name === name)
        if (storage) {
          Object.assign(storage, updates)
        }
      })
    },

    addStorage: (storage) => {
      set((state) => {
        state.storageList.push(storage)
      })
    },

    removeStorage: (name) => {
      set((state) => {
        state.storageList = state.storageList.filter((s: StorageList) => s.name !== name)
      })
    },

    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading
      })
    },

    setError: (error) => {
      set((state) => {
        state.error = error
      })
    },

    refreshStorage: async () => {
      const { setLoading, setError } = get()
      setLoading(true)
      setError(null)
      
      try {
        await reupStorage()
        // reupStorage already syncs to the store via useStorageStore.getState().setStorageList()
        // No need to sync again here
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh storage'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    },
  }))
)

/**
 * Selector hook to get storage list
 * @returns Array of all storages
 */
export function useStorageList(): StorageList[] {
  return useStorageStore((state) => state.storageList)
}

/**
 * Selector hook to get a specific storage by name
 * @param name - Storage name to find
 * @returns Storage object or undefined if not found
 */
export function useStorage(name: string): StorageList | undefined {
  return useStorageStore((state) => 
    state.storageList.find((s) => s.name === name)
  )
}

/**
 * Selector hook to get loading state
 * @returns Loading state boolean
 */
export function useStorageLoading(): boolean {
  return useStorageStore((state) => state.isLoading)
}

/**
 * Selector hook to get error state
 * @returns Error message or null
 */
export function useStorageError(): string | null {
  return useStorageStore((state) => state.error)
}
