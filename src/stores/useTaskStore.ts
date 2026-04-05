import { create } from 'zustand'

interface TaskStore {
  version: number
  increment: () => void
}

/**
 * Task store for triggering re-renders when task state changes
 * Used by task.tsx to refresh task list after enable/disable/delete/trigger operations
 */
export const useTaskStore = create<TaskStore>((set) => ({
  version: 0,
  increment: () => set((state) => ({ version: state.version + 1 })),
}))
