/**
 * ConfigRepository 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConfigRepository, configRepository } from '../config/ConfigRepository'
import { ErrorCode } from '../interfaces/IRepository'

// Mock 依赖模块
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('ConfigRepository', () => {
  let repository: ConfigRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new ConfigRepository()
  })

  describe('getById', () => {
    it('should return config for main id', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockConfig = { settings: { themeMode: 'dark' }, storage: [] }
      vi.mocked(invoke).mockResolvedValueOnce(mockConfig)

      const result = await repository.getById('main')

      expect(result).not.toBeNull()
      expect(result?.settings?.themeMode).toBe('dark')
    })

    it('should return null for invalid id', async () => {
      const result = await repository.getById('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should return config as array', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockConfig = { settings: { themeMode: 'dark' }, storage: [] }
      vi.mocked(invoke).mockResolvedValueOnce(mockConfig)

      const result = await repository.getAll()

      expect(result).toHaveLength(1)
      expect(result[0].settings?.themeMode).toBe('dark')
    })
  })

  describe('create', () => {
    it('should throw error as config already exists', async () => {
      await expect(repository.create({ settings: {} })).rejects.toThrow('Config already exists')
    })
  })

  describe('update', () => {
    it('should update config for main id', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockConfig = { settings: { themeMode: 'light' }, storage: [] }
      vi.mocked(invoke).mockResolvedValueOnce(mockConfig).mockResolvedValueOnce(mockConfig)

      const result = await repository.update('main', { settings: { themeMode: 'dark' } })

      expect(result).not.toBeNull()
    })

    it('should throw error for invalid id', async () => {
      await expect(repository.update('invalid-id', {})).rejects.toThrow('Config ID must be "main"')
    })
  })

  describe('delete', () => {
    it('should throw error as config cannot be deleted', async () => {
      await expect(repository.delete('main')).rejects.toThrow('Cannot delete config')
    })
  })

  describe('exists', () => {
    it('should return true for main id', async () => {
      const result = await repository.exists('main')

      expect(result).toBe(true)
    })

    it('should return false for invalid id', async () => {
      const result = await repository.exists('invalid-id')

      expect(result).toBe(false)
    })
  })

  describe('getConfigPath', () => {
    it('should get value at path', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockConfig = { settings: { themeMode: 'dark', language: 'zh' } }
      vi.mocked(invoke).mockResolvedValueOnce(mockConfig)

      const result = await repository.getConfigPath('settings.themeMode')

      expect(result).toBe('dark')
    })

    it('should return undefined for non-existent path', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockConfig = { settings: {} }
      vi.mocked(invoke).mockResolvedValueOnce(mockConfig)

      const result = await repository.getConfigPath('settings.nonExistent')

      expect(result).toBeUndefined()
    })
  })

  describe('getOsInfo', () => {
    it('should return OS info', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const mockOsInfo = { platform: 'win32', arch: 'x64' }
      vi.mocked(invoke).mockResolvedValueOnce(mockOsInfo)

      const result = await repository.getOsInfo()

      expect(result.platform).toBe('win32')
      expect(result.arch).toBe('x64')
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

describe('configRepository singleton', () => {
  it('should be instance of ConfigRepository', () => {
    expect(configRepository).toBeInstanceOf(ConfigRepository)
  })
})
