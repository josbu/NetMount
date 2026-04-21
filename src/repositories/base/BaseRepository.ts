/**
 * BaseRepository - Repository层基类
 * 
 * 提供：
 * 1. 统一的 Tauri invoke 调用封装
 * 2. 错误处理和重试机制
 * 3. 日志记录
 * 4. 缓存支持（可选）
 * 5. 数据变更监听
 */

import { invoke } from '@tauri-apps/api/core'
import { logger, LogLevel } from '../../services/LoggerService'
import {
  IRepository,
  RepositoryConfig,
  RepositoryError,
  ErrorCode,
  DataChangeEvent,
  DataChangeListener,
} from '../interfaces/IRepository'

// ============================================
// 默认配置
// ============================================
const DEFAULT_CONFIG: RepositoryConfig = {
  enableCache: false,
  cacheTimeout: 60000,
  logLevel: LogLevel.INFO,
  retryCount: 3,
  retryDelay: 1000,
}

// ============================================
// 敏感字段过滤
// ============================================
const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'apiKey', 'api_key', 'accessKey', 'access_key',
  'secretKey', 'secret_key', 'credential', 'auth', 'authorization',
  'privateKey', 'private_key', 'pass', 'passwd', 'pwd',
]

/**
 * 过滤敏感字段，返回安全的日志参数
 */
function sanitizeArgs(args?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!args) return undefined
  
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(args)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeArgs(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

// ============================================
// BaseRepository 抽象类
// ============================================
export abstract class BaseRepository<T> implements IRepository<T> {
  protected config: RepositoryConfig
  protected contextLogger = logger.withContext(this.constructor.name)
  protected listeners: Set<DataChangeListener<T>> = new Set()
  protected cache: Map<string, { data: T; timestamp: number }> = new Map()

  constructor(config: Partial<RepositoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ==========================================
  // 核心抽象方法（子类必须实现）
  // ==========================================

  abstract getById(id: string): Promise<T | null>
  abstract getAll(): Promise<T[]>
  abstract create(entity: Partial<T>): Promise<T>
  abstract update(id: string, entity: Partial<T>): Promise<T>
  abstract delete(id: string): Promise<boolean>
  abstract exists(id: string): Promise<boolean>

  // ==========================================
  // Tauri invoke 调用封装
  // ==========================================

  /**
   * 调用 Tauri 命令（带重试和日志）
   */
  protected async invokeCommand<R>(
    command: string,
    args?: Record<string, unknown>,
    options?: { skipCache?: boolean; skipRetry?: boolean }
  ): Promise<R> {
    const startTime = Date.now()
    const argsStr = JSON.stringify(args)

    this.contextLogger.debug(`Invoking command: ${command}`, sanitizeArgs(args))

    try {
      // 检查缓存
      if (this.config.enableCache && !options?.skipCache) {
        const cached = this.getFromCache(command, argsStr)
        if (cached) {
          this.contextLogger.debug(`Cache hit for ${command}`)
          return cached as R
        }
      }

      // 执行调用
      const result = await this.invokeWithRetry<R>(command, args, options?.skipRetry)

      // 更新缓存
      if (this.config.enableCache) {
        this.setCache(command, argsStr, result)
      }

      const duration = Date.now() - startTime
      this.contextLogger.info(`Command ${command} completed`, { duration: `${duration}ms` })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.contextLogger.error(
        `Command ${command} failed after ${duration}ms`,
        error as Error,
        sanitizeArgs(args)
      )

      throw this.handleError(error, command)
    }
  }

  /**
   * 带重试的 invoke 调用
   */
  private async invokeWithRetry<R>(
    command: string,
    args?: Record<string, unknown>,
    skipRetry?: boolean
  ): Promise<R> {
    const maxRetries = skipRetry ? 1 : this.config.retryCount!
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await invoke<R>(command, args)
      } catch (error) {
        lastError = error

        if (attempt < maxRetries) {
          this.contextLogger.warn(`Attempt ${attempt} failed, retrying...`, {
            command,
            attempt,
            maxRetries,
          })
          await this.sleep(this.config.retryDelay!)
        }
      }
    }

    throw lastError
  }

  // ==========================================
  // 缓存管理
  // ==========================================

  private getFromCache(command: string, args: string): T | null {
    const key = `${command}:${args}`
    const cached = this.cache.get(key)

    if (!cached) return null

    // 检查过期
    if (Date.now() - cached.timestamp > this.config.cacheTimeout!) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(command: string, args: string, data: unknown): void {
    const key = `${command}:${args}`
    this.cache.set(key, {
      data: data as T,
      timestamp: Date.now(),
    })
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.contextLogger.info('Cache cleared')
  }

  // ==========================================
  // 错误处理
  // ==========================================

  private handleError(error: unknown, context: string): RepositoryError {
    if (error instanceof RepositoryError) {
      return error
    }

    const message = error instanceof Error ? error.message : String(error)

    // 根据错误类型映射错误代码
    let code = ErrorCode.UNKNOWN
    if (message.includes('not found')) {
      code = ErrorCode.NOT_FOUND
    } else if (message.includes('already exists')) {
      code = ErrorCode.ALREADY_EXISTS
    } else if (message.includes('permission')) {
      code = ErrorCode.PERMISSION_DENIED
    } else if (message.includes('timeout')) {
      code = ErrorCode.TIMEOUT
    } else if (message.includes('network') || message.includes('fetch')) {
      code = ErrorCode.NETWORK_ERROR
    }

    return new RepositoryError(message, code, context, error)
  }

  // ==========================================
  // 数据变更监听
  // ==========================================

  /**
   * 添加数据变更监听器
   */
  addChangeListener(listener: DataChangeListener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 触发数据变更事件
   */
  protected notifyChange(event: DataChangeEvent<T>): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        this.contextLogger.error('Listener error', error as Error, { event })
      }
    })
  }

  // ==========================================
  // 工具方法
  // ==========================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 验证实体数据
   */
  protected validate(entity: Partial<T>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!(field in entity) || entity[field as keyof T] === undefined) {
        throw new RepositoryError(
          `Missing required field: ${field}`,
          ErrorCode.INVALID_DATA,
          this.constructor.name
        )
      }
    }
  }
}