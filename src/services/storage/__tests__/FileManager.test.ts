/**
 * FileManager 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getFileList,
  delFile,
  delDir,
  mkDir,
} from '../FileManager'

// Mock 依赖模块
vi.mock('../../utils/rclone/request', () => ({
  rclone_api_post: vi.fn(),
  getRcloneApiHeaders: vi.fn(() => ({ Authorization: 'Bearer test' })),
}))

vi.mock('../../services/rclone', () => ({
  rcloneInfo: {
    endpoint: { url: 'http://localhost:5572' },
  },
}))

vi.mock('../StorageManager', () => ({
  searchStorage: vi.fn(),
  convertStoragePath: vi.fn((name, path) => `${name}:${path || ''}`),
  formatPathRclone: vi.fn((path) => path?.replace(/^\//, '') || ''),
}))

describe('FileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('delFile', () => {
    it('should delete file successfully', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)

      await delFile('storage1', '/folder/file.txt')

      expect(rclone_api_post).toHaveBeenCalledWith(
        '/operations/deletefile',
        expect.any(Object)
      )
    })

    it('should remove leading slash from path', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)

      await delFile('storage1', 'folder/file.txt')

      expect(rclone_api_post).toHaveBeenCalled()
    })

    it('should call refresh callback after deletion', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)
      const refreshCallback = vi.fn()

      await delFile('storage1', '/file.txt', refreshCallback)

      expect(refreshCallback).toHaveBeenCalled()
    })
  })

  describe('delDir', () => {
    it('should delete directory successfully', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)

      await delDir('storage1', '/folder')

      expect(rclone_api_post).toHaveBeenCalledWith(
        '/operations/purge',
        expect.any(Object)
      )
    })

    it('should call refresh callback after deletion', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)
      const refreshCallback = vi.fn()

      await delDir('storage1', '/folder', refreshCallback)

      expect(refreshCallback).toHaveBeenCalled()
    })
  })

  describe('mkDir', () => {
    it('should create directory successfully', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)

      await mkDir('storage1', '/new-folder')

      expect(rclone_api_post).toHaveBeenCalledWith(
        '/operations/mkdir',
        expect.any(Object)
      )
    })

    it('should call refresh callback after creation', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)
      const refreshCallback = vi.fn()

      await mkDir('storage1', '/new-folder', refreshCallback)

      expect(refreshCallback).toHaveBeenCalled()
    })
  })
})
