/**
 * StorageRepository 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageRepository, storageRepository } from '../storage/StorageRepository'

// Mock 依赖模块
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('StorageRepository', () => {
  let repository: StorageRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new StorageRepository()
  })

  describe('getById', () => {
    it('should return storage by id', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockStorages = [
        { name: 'storage1', type: 's3', framework: 'rclone' },
        { name: 'storage2', type: 'webdav', framework: 'rclone' },
      ]
      vi.mocked(invoke).mockResolvedValueOnce(mockStorages)

      const result = await repository.getById('storage1')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('storage1')
    })

    it('should return null for non-existent storage', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      vi.mocked(invoke).mockResolvedValueOnce([])

      const result = await repository.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should return all storages', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockStorages = [
        { name: 'storage1', type: 's3', framework: 'rclone' },
        { name: 'storage2', type: 'webdav', framework: 'rclone' },
      ]
      vi.mocked(invoke).mockResolvedValueOnce(mockStorages)

      const result = await repository.getAll()

      expect(result).toHaveLength(2)
      expect(result[0]!.name).toBe('storage1')
      expect(result[1]!.name).toBe('storage2')
    })
  })

  describe('getVisibleStorages', () => {
    it('should filter out hidden storages', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockStorages = [
        { name: 'storage1', type: 's3', framework: 'rclone', hide: false },
        { name: 'storage2', type: 'webdav', framework: 'rclone', hide: true },
        { name: 'storage3', type: 'sftp', framework: 'rclone', hide: false },
      ]
      vi.mocked(invoke).mockResolvedValueOnce(mockStorages)

      const result = await repository.getVisibleStorages()

      expect(result).toHaveLength(2)
      expect(result.some(s => s.name === 'storage2')).toBe(false)
    })
  })

  describe('getStoragesByFramework', () => {
    it('should filter storages by framework', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockStorages = [
        { name: 'storage1', type: 's3', framework: 'rclone' },
        { name: 'storage2', type: 'alist', framework: 'openlist' },
        { name: 'storage3', type: 'webdav', framework: 'rclone' },
      ]
      vi.mocked(invoke).mockResolvedValueOnce(mockStorages)

      const rcloneStorages = await repository.getStoragesByFramework('rclone')
      const openlistStorages = await repository.getStoragesByFramework('openlist')

      expect(rcloneStorages).toHaveLength(2)
      expect(openlistStorages).toHaveLength(1)
      expect(openlistStorages[0]!.name).toBe('storage2')
    })
  })

  describe('exists', () => {
    it('should return true for existing storage', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      vi.mocked(invoke).mockResolvedValueOnce([{ name: 'storage1', type: 's3', framework: 'rclone' }])

      const result = await repository.exists('storage1')

      expect(result).toBe(true)
    })

    it('should return false for non-existent storage', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      vi.mocked(invoke).mockResolvedValueOnce([])

      const result = await repository.exists('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('addChangeListener', () => {
    it('should add and remove listener', () => {
      const listener = vi.fn()
      const unsubscribe = repository.addChangeListener(listener)

      expect(unsubscribe).toBeInstanceOf(Function)
      
      // Unsubscribe should work without error
      unsubscribe()
    })
  })

  describe('clearCache', () => {
    it('should clear cache without error', () => {
      expect(() => repository.clearCache()).not.toThrow()
    })
  })
})

describe('storageRepository singleton', () => {
  it('should be instance of StorageRepository', () => {
    expect(storageRepository).toBeInstanceOf(StorageRepository)
  })
})
