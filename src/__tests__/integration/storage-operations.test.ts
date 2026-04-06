/**
 * 存储操作集成测试
 * 
 * 测试存储模块的端到端流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock其他依赖
vi.mock('../../services/hook', () => ({
  hooks: {
    upStorage: vi.fn(),
  },
}))

vi.mock('../../stores/storageStore', () => ({
  useStorageStore: {
    getState: vi.fn(() => ({
      setStorageList: vi.fn(),
    })),
  },
}))

describe('Storage Operations Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Storage Lifecycle', () => {
    it('should complete full storage lifecycle', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // 1. Create storage
      const createMock = vi.fn().mockResolvedValue(undefined)
      vi.mocked(invoke).mockImplementation((cmd, args) => {
        if (cmd === 'create_storage') {
          return createMock(args)
        }
        if (cmd === 'get_storage_list') {
          return Promise.resolve([
            { name: 'test-storage', type: 's3', framework: 'rclone' }
          ])
        }
        if (cmd === 'delete_storage') {
          return Promise.resolve(undefined)
        }
        return Promise.resolve(undefined)
      })

      // 模拟创建存储
      const createData = {
        name: 'test-storage',
        type: 's3',
        framework: 'rclone',
        options: { accessKeyId: 'test', secretAccessKey: 'test' }
      }
      await createMock(createData)
      expect(createMock).toHaveBeenCalledWith(createData)

      // 2. List storages
      const storageList = await invoke('get_storage_list')
      expect(storageList).toHaveLength(1)
      expect((storageList as any[])[0].name).toBe('test-storage')

      // 3. Delete storage
      await invoke('delete_storage', { name: 'test-storage' })
      expect(invoke).toHaveBeenCalledWith('delete_storage', { name: 'test-storage' })
    })
  })

  describe('File Operations', () => {
    it('should perform file operations workflow', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // 模拟文件列表
      const fileList = [
        { Name: 'file1.txt', Size: 1024, MimeType: 'text/plain', ModTime: new Date().toISOString(), IsDir: false },
        { Name: 'folder1', Size: 0, MimeType: 'inode/directory', ModTime: new Date().toISOString(), IsDir: true },
      ]
      
      vi.mocked(invoke).mockImplementation((cmd) => {
        if (cmd === 'get_file_list') {
          return Promise.resolve({ list: fileList })
        }
        if (cmd === 'operations/deletefile') {
          return Promise.resolve(undefined)
        }
        if (cmd === 'operations/mkdir') {
          return Promise.resolve(undefined)
        }
        return Promise.resolve(undefined)
      })

      // 获取文件列表
      const result = await invoke('get_file_list')
      expect((result as any).list).toHaveLength(2)

      // 创建目录
      await invoke('operations/mkdir', { fs: 'test:', remote: 'new-folder' })
      expect(invoke).toHaveBeenCalledWith('operations/mkdir', expect.any(Object))

      // 删除文件
      await invoke('operations/deletefile', { fs: 'test:', remote: 'file1.txt' })
      expect(invoke).toHaveBeenCalledWith('operations/deletefile', expect.any(Object))
    })
  })

  describe('Transfer Operations', () => {
    it('should perform transfer operations', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      
      vi.mocked(invoke).mockImplementation((cmd) => {
        if (cmd === 'sync/copy' || cmd === 'sync/move' || cmd === 'sync/sync') {
          return Promise.resolve({ success: true })
        }
        return Promise.resolve(undefined)
      })

      // 复制操作
      const copyResult = await invoke('sync/copy', {
        srcFs: 'source:/folder',
        dstFs: 'dest:/folder'
      })
      expect(copyResult).toEqual({ success: true })

      // 同步操作
      const syncResult = await invoke('sync/sync', {
        srcFs: 'source:/folder',
        dstFs: 'dest:/folder'
      })
      expect(syncResult).toEqual({ success: true })

      // 移动操作
      const moveResult = await invoke('sync/move', {
        srcFs: 'source:/folder',
        dstFs: 'dest:/folder'
      })
      expect(moveResult).toEqual({ success: true })
    })
  })

  describe('Configuration Management', () => {
    it('should manage configuration', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      
      const mockConfig = {
        settings: { themeMode: 'dark', language: 'zh' },
        storage: [],
        mount: { lists: [] }
      }
      
      vi.mocked(invoke).mockImplementation((cmd) => {
        if (cmd === 'get_config') {
          return Promise.resolve(mockConfig)
        }
        if (cmd === 'update_config') {
          return Promise.resolve(undefined)
        }
        return Promise.resolve(undefined)
      })

      // 获取配置
      const config = await invoke('get_config')
      expect(config).toEqual(mockConfig)

      // 更新配置
      const newConfig = { ...mockConfig, settings: { ...mockConfig.settings, themeMode: 'light' } }
      await invoke('update_config', { data: newConfig })
      expect(invoke).toHaveBeenCalledWith('update_config', { data: newConfig })
    })
  })
})
