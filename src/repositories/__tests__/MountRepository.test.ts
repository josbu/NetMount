/**
 * MountRepository 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MountRepository } from '../mount/MountRepository'

// Mock 依赖模块
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../../controller/storage/mount/mount', () => ({
  mountStorage: vi.fn(),
  unmountStorage: vi.fn(),
  reupMount: vi.fn(),
  isMounted: vi.fn(),
  addMountStorage: vi.fn(),
  delMountStorage: vi.fn(),
}))

vi.mock('../../services/rclone', () => ({
  rcloneInfo: {
    mountList: [],
  },
}))

describe('MountRepository', () => {
  let repository: MountRepository

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
    repository = new MountRepository()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getAll', () => {
    it('should return all mounts', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
        {
          storageName: 'storage2',
          mountPath: '/mnt/storage2',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.getAll()

      expect(result).toHaveLength(2)
      expect(result[0]!).toMatchObject({
        storageName: 'storage1',
        mountPath: '/mnt/storage1',
        status: 'mounted',
      })
      // ID should be URL-safe encoded
      expect(result[0]!.id).toContain('_')
    })
  })

  describe('mountStorage', () => {
    it('should mount storage successfully', async () => {
      const { mountStorage } = await import('../../controller/storage/mount/mount')
      const { rcloneInfo } = await import('../../services/rclone')

      vi.mocked(mountStorage).mockResolvedValueOnce(undefined)
      rcloneInfo.mountList = [
        {
          storageName: 'test-storage',
          mountPath: '/mnt/test',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.mountStorage('test-storage', '/mnt/test')

      expect(result.storageName).toBe('test-storage')
      expect(result.mountPath).toBe('/mnt/test')
      expect(result.status).toBe('mounted')
      // ID should be URL-safe
      expect(result.id).toBe(`${encodeURIComponent('test-storage')}_${encodeURIComponent('/mnt/test')}`)
      expect(mountStorage).toHaveBeenCalledWith({
        storageName: 'test-storage',
        mountPath: '/mnt/test',
        parameters: { vfsOpt: {}, mountOpt: {} },
        autoMount: false,
      })
    })

    it('should throw error for invalid mount point', async () => {
      await expect(repository.mountStorage('test-storage', '')).rejects.toThrow()
    })

    it('should throw error for missing storage name', async () => {
      await expect(repository.mountStorage('', '/mnt/test')).rejects.toThrow()
    })

    it('should handle special characters in storage name and path', async () => {
      const { mountStorage } = await import('../../controller/storage/mount/mount')
      const { rcloneInfo } = await import('../../services/rclone')

      vi.mocked(mountStorage).mockResolvedValueOnce(undefined)
      rcloneInfo.mountList = [
        {
          storageName: 'storage:with:colons',
          mountPath: '/mnt/path with spaces',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.mountStorage('storage:with:colons', '/mnt/path with spaces')

      // ID should be properly encoded
      expect(result.id).toBe(`${encodeURIComponent('storage:with:colons')}_${encodeURIComponent('/mnt/path with spaces')}`)
      expect(result.storageName).toBe('storage:with:colons')
      expect(result.mountPath).toBe('/mnt/path with spaces')
    })
  })

  describe('getActiveMounts', () => {
    it('should return only active mounts', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
        {
          storageName: 'storage2',
          mountPath: '/mnt/storage2',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.getActiveMounts()

      expect(result).toHaveLength(2)
      expect(result[0]!.storageName).toBe('storage1')
      expect(result[1]!.storageName).toBe('storage2')
    })

    it('should return empty array when no mounts', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = []

      const result = await repository.getActiveMounts()

      expect(result).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('should return mount by id', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const expectedId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/storage1')}`
      const result = await repository.getById(expectedId)

      expect(result).not.toBeNull()
      expect(result!.storageName).toBe('storage1')
      expect(result!.id).toBe(expectedId)
    })

    it('should return null for non-existent mount', async () => {
      const result = await repository.getById('non-existent')

      expect(result).toBeNull()
    })

    it('should handle legacy ID format gracefully', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      // Try with legacy format (storage:path)
      const result = await repository.getById('storage1:/mnt/storage1')

      // Should still find the mount by fallback
      expect(result).not.toBeNull()
      expect(result!.storageName).toBe('storage1')
    })
  })

  describe('delete', () => {
    it('should unmount and delete successfully', async () => {
      const { unmountStorage } = await import('../../controller/storage/mount/mount')
      const { rcloneInfo } = await import('../../services/rclone')

      vi.mocked(unmountStorage).mockResolvedValueOnce(undefined)
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const mountId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/storage1')}`
      const result = await repository.delete(mountId)

      expect(result).toBe(true)
      expect(unmountStorage).toHaveBeenCalledWith('/mnt/storage1')
    })

    it('should return false for non-existent mount', async () => {
      const result = await repository.delete('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('update', () => {
    it('should update mount configuration', async () => {
      const { mountStorage, unmountStorage } = await import('../../controller/storage/mount/mount')
      const { rcloneInfo } = await import('../../services/rclone')

      vi.mocked(unmountStorage).mockResolvedValueOnce(undefined)
      vi.mocked(mountStorage).mockResolvedValueOnce(undefined)
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/old-path',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const oldId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/old-path')}`
      
      // Mock new mount after update
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/new-path',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.update(oldId, { mountPath: '/mnt/new-path' })

      expect(result.mountPath).toBe('/mnt/new-path')
      expect(unmountStorage).toHaveBeenCalledWith('/mnt/old-path')
      expect(mountStorage).toHaveBeenCalled()
    })

    it('should skip update when configuration unchanged', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const mountId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/storage1')}`
      const result = await repository.update(mountId, { autoMount: true })

      // Should return the same mount without re-mounting
      expect(result.storageName).toBe('storage1')
      expect(result.mountPath).toBe('/mnt/storage1')
    })

    it('should throw error for non-existent mount', async () => {
      await expect(repository.update('non-existent', { mountPath: '/new/path' })).rejects.toThrow('not found')
    })
  })

  describe('exists', () => {
    it('should return true for existing mount', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/storage1',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const mountId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/storage1')}`
      const result = await repository.exists(mountId)

      expect(result).toBe(true)
    })

    it('should return false for non-existent mount', async () => {
      const result = await repository.exists('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('getMountsByStorage', () => {
    it('should return mounts for specific storage', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/path1',
          mountedTime: new Date('2024-01-01'),
        },
        {
          storageName: 'storage1',
          mountPath: '/mnt/path2',
          mountedTime: new Date('2024-01-01'),
        },
        {
          storageName: 'storage2',
          mountPath: '/mnt/path3',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.getMountsByStorage('storage1')

      expect(result).toHaveLength(2)
      expect(result[0]!.mountPath).toBe('/mnt/path1')
      expect(result[1]!.mountPath).toBe('/mnt/path2')
    })

    it('should return empty array when storage has no mounts', async () => {
      const { rcloneInfo } = await import('../../services/rclone')
      rcloneInfo.mountList = [
        {
          storageName: 'storage1',
          mountPath: '/mnt/path1',
          mountedTime: new Date('2024-01-01'),
        },
      ]

      const result = await repository.getMountsByStorage('storage2')

      expect(result).toHaveLength(0)
    })
  })
})
