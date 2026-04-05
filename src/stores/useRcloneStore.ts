import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { RcloneStats } from '../type/rclone/stats'
import type { StorageList, MountList, RcloneVersion } from '../type/rclone/rcloneInfo'

interface RcloneProcess {
  command?: unknown
  child?: unknown
  log?: string
  logFile?: string
}

interface RcloneEndpoint {
  url: string
  isLocal: boolean
  auth: Record<string, unknown>
  localhost: {
    port: number
  }
}

interface RcloneLocalArgs {
  path: {
    tempDir?: string
  }
}

interface RcloneState {
  process: RcloneProcess
  endpoint: RcloneEndpoint
  localArgs: RcloneLocalArgs
  version: RcloneVersion
  stats: RcloneStats
  storageList: StorageList[]
  mountList: MountList[]
}

interface RcloneActions {
  setProcess: (process: RcloneProcess) => void
  updateProcess: (partial: Partial<RcloneProcess>) => void
  setEndpoint: (endpoint: RcloneEndpoint) => void
  updateEndpoint: (partial: Partial<RcloneEndpoint>) => void
  setLocalArgs: (args: RcloneLocalArgs) => void
  setVersion: (version: RcloneVersion) => void
  setStats: (stats: RcloneStats) => void
  updateStats: (partial: Partial<RcloneStats>) => void
  setStorageList: (list: StorageList[]) => void
  updateStorage: (name: string, updates: Partial<StorageList>) => void
  addStorage: (storage: StorageList) => void
  removeStorage: (name: string) => void
  setMountList: (list: MountList[]) => void
  addMount: (mount: MountList) => void
  removeMount: (mountPath: string) => void
  updateMount: (mountPath: string, updates: Partial<MountList>) => void
  reset: () => void
}

export type RcloneStore = RcloneState & RcloneActions

const createDefaultVersion = (): RcloneVersion => ({
  arch: '',
  decomposed: [],
  goTags: '',
  goVersion: '',
  isBeta: false,
  isGit: false,
  linking: '',
  os: '',
  version: '',
})

const createDefaultStats = (): RcloneStats => ({
  bytes: 0,
  checks: 0,
  deletedDirs: 0,
  deletes: 0,
  elapsedTime: 0,
  errors: 0,
  eta: null,
  fatalError: false,
  renames: 0,
  retryError: false,
  serverSideCopies: 0,
  serverSideCopyBytes: 0,
  serverSideMoveBytes: 0,
  serverSideMoves: 0,
  speed: 0,
  totalBytes: 0,
  totalChecks: 0,
  totalTransfers: 0,
  transferTime: 0,
  lastError: '',
  transferring: [],
})

const createDefaultState = (): RcloneState => ({
  process: {},
  endpoint: {
    url: '',
    isLocal: true,
    auth: {},
    localhost: {
      port: 6434,
    },
  },
  localArgs: {
    path: {
      tempDir: 'rclone-temp',
    },
  },
  version: createDefaultVersion(),
  stats: createDefaultStats(),
  storageList: [],
  mountList: [],
})

export const useRcloneStore = create<RcloneStore>()(
  immer((set) => ({
    ...createDefaultState(),

    setProcess: (process) => {
      set((state) => {
        state.process = process
      })
    },

    updateProcess: (partial) => {
      set((state) => {
        Object.assign(state.process, partial)
      })
    },

    setEndpoint: (endpoint) => {
      set((state) => {
        state.endpoint = endpoint
      })
    },

    updateEndpoint: (partial) => {
      set((state) => {
        Object.assign(state.endpoint, partial)
      })
    },

    setLocalArgs: (args) => {
      set((state) => {
        state.localArgs = args
      })
    },

    setVersion: (version) => {
      set((state) => {
        state.version = version
      })
    },

    setStats: (stats) => {
      set((state) => {
        state.stats = stats
      })
    },

    updateStats: (partial) => {
      set((state) => {
        Object.assign(state.stats, partial)
      })
    },

    setStorageList: (list) => {
      set((state) => {
        state.storageList = list
      })
    },

    updateStorage: (name, updates) => {
      set((state) => {
        const storage = state.storageList.find((s) => s.name === name)
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
        state.storageList = state.storageList.filter((s) => s.name !== name)
      })
    },

    setMountList: (list) => {
      set((state) => {
        state.mountList = list
      })
    },

    addMount: (mount) => {
      set((state) => {
        state.mountList.push(mount)
      })
    },

    removeMount: (mountPath) => {
      set((state) => {
        state.mountList = state.mountList.filter((m) => m.mountPath !== mountPath)
      })
    },

    updateMount: (mountPath, updates) => {
      set((state) => {
        const index = state.mountList.findIndex((m) => m.mountPath === mountPath)
        if (index !== -1) {
          state.mountList[index] = {
            ...state.mountList[index]!,
            ...updates,
          }
        }
      })
    },

    reset: () => {
      set(createDefaultState())
    },
  }))
)
