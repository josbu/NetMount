/**
 * ChunkTransferService - 分块传输服务
 * 
 * 用于大文件分块传输，支持断点续传
 * 当前实现：集成到TransferService中使用
 */

import { logger } from '../../services/LoggerService'
import { rclone_api_post } from '../../utils/rclone/request'

/**
 * 传输配置
 */
export interface ChunkTransferConfig {
  chunkSize: number
  maxParallelChunks: number
  enableProgress: boolean
}

/**
 * 传输进度
 */
export interface TransferProgress {
  percent: number
  transferredBytes: number
  totalBytes: number
  speed: number
  currentChunk: number
  totalChunks: number
}

interface JobStatus {
  finished: boolean
  success: boolean
  error?: string
  progress?: {
    percentage?: number
    bytes?: number
    total?: number
    speed?: number
  }
}

/**
 * ChunkTransferService 类
 */
export class ChunkTransferService {
  private transferLogger = logger.withContext('ChunkTransfer')

  private readonly DEFAULT_CONFIG: ChunkTransferConfig = {
    chunkSize: 5 * 1024 * 1024,
    maxParallelChunks: 3,
    enableProgress: true,
  }

  shouldUseChunkTransfer(fileSize: number, threshold: number = 50 * 1024 * 1024): boolean {
    return fileSize > threshold
  }

  calculateChunks(fileSize: number, chunkSize?: number): {
    totalChunks: number
    actualChunkSize: number
  } {
    const actualChunkSize = chunkSize || this.DEFAULT_CONFIG.chunkSize
    const totalChunks = Math.ceil(fileSize / actualChunkSize)

    return { totalChunks, actualChunkSize }
  }

  async transferWithAsync(
    srcFs: string,
    srcRemote: string,
    dstFs: string,
    dstRemote: string,
    options?: {
      onProgress?: (progress: TransferProgress) => void
      timeout?: number
    }
  ): Promise<{ success: boolean; jobId?: string }> {
    this.transferLogger.info('Starting async transfer', {
      src: `${srcFs}:${srcRemote}`,
      dst: `${dstFs}:${dstRemote}`,
    })

    try {
      const response = await rclone_api_post('/operations/copyfile', {
        srcFs,
        srcRemote,
        dstFs,
        dstRemote,
        _async: true,
      })

      if (!response) {
        throw new Error('No response from rclone API')
      }

      const jobId = response.jobid as number | undefined

      if (jobId !== undefined) {
        await this.pollJobStatus(jobId, options?.onProgress)
        return { success: true, jobId: String(jobId) }
      }

      return { success: true }
    } catch (error) {
      this.transferLogger.error('Async transfer failed', error as Error)
      throw error
    }
  }

  private async pollJobStatus(
    jobId: number,
    onProgress?: (progress: TransferProgress) => void,
    pollInterval: number = 1000,
    maxWaitTime: number = 300000
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await rclone_api_post('/job/status', { jobid: jobId })

        if (!response) {
          throw new Error('Failed to get job status')
        }

        const status: JobStatus = {
          finished: Boolean(response.finished),
          success: Boolean(response.success),
          error: response.error as string | undefined,
          progress: response.progress as JobStatus['progress'] | undefined,
        }

        if (status.finished) {
          if (status.success) {
            this.transferLogger.info('Async job completed', { jobId })
            return
          } else {
            throw new Error(status.error || 'Job failed')
          }
        }

        if (onProgress && status.progress) {
          onProgress({
            percent: status.progress.percentage || 0,
            transferredBytes: status.progress.bytes || 0,
            totalBytes: status.progress.total || 0,
            speed: status.progress.speed || 0,
            currentChunk: 0,
            totalChunks: 0,
          })
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval))
      } catch (error) {
        this.transferLogger.error('Failed to poll job status', error as Error, { jobId })
        throw error
      }
    }

    throw new Error('Job timeout')
  }

  async transferBatch(
    files: Array<{
      srcFs: string
      srcRemote: string
      dstFs: string
      dstRemote: string
      size: number
    }>,
    options?: {
      onProgress?: (fileIndex: number, progress: TransferProgress) => void
      concurrency?: number
    }
  ): Promise<{ success: number; failed: number }> {
    const concurrency = options?.concurrency || this.DEFAULT_CONFIG.maxParallelChunks
    let success = 0
    let failed = 0

    const semaphore = new Semaphore(concurrency)

    const tasks = files.map(async (file, index) => {
      await semaphore.acquire()
      try {
        if (this.shouldUseChunkTransfer(file.size)) {
          await this.transferWithAsync(
            file.srcFs,
            file.srcRemote,
            file.dstFs,
            file.dstRemote,
            {
              onProgress: progress => options?.onProgress?.(index, progress),
            }
          )
        } else {
          await rclone_api_post('/operations/copyfile', {
            srcFs: file.srcFs,
            srcRemote: file.srcRemote,
            dstFs: file.dstFs,
            dstRemote: file.dstRemote,
          })
        }
        success++
      } catch (error) {
        this.transferLogger.error(`Failed to transfer file ${index}`, error as Error)
        failed++
      } finally {
        semaphore.release()
      }
    })

    await Promise.all(tasks)

    this.transferLogger.info('Batch transfer completed', { success, failed })
    return { success, failed }
  }

  getRecommendedChunkSize(fileSize: number): number {
    if (fileSize < 100 * 1024 * 1024) {
      return 5 * 1024 * 1024
    } else if (fileSize < 1024 * 1024 * 1024) {
      return 10 * 1024 * 1024
    } else {
      return 20 * 1024 * 1024
    }
  }
}

class Semaphore {
  private permits: number
  private acquireQueue: Array<(value: void | PromiseLike<void>) => void> = []
  private lock: boolean = false

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    // 使用锁确保 permits 操作的原子性
    while (this.lock) {
      // 使用微任务队列而不是setTimeout，更高效
      await new Promise<void>(resolve => queueMicrotask(() => resolve()))
    }
    this.lock = true

    try {
      if (this.permits > 0) {
        this.permits--
        this.lock = false
        return
      }
    } catch (error) {
      this.lock = false
      throw error
    }

    this.lock = false
    return new Promise<void>(resolve => {
      this.acquireQueue.push(resolve)
    })
  }

  release(): void {
    // 使用微任务队列进行自旋等待，避免阻塞主线程
    const tryRelease = () => {
      if (this.lock) {
        queueMicrotask(tryRelease)
        return
      }
      this.lock = true

      try {
        if (this.acquireQueue.length > 0) {
          const next = this.acquireQueue.shift()!
          this.lock = false
          next()
        } else {
          this.permits++
          this.lock = false
        }
      } catch (error) {
        this.lock = false
        throw error
      }
    }
    
    tryRelease()
  }
}

export const chunkTransferService = new ChunkTransferService()