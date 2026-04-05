/**
 * Error Service - 统一的错误处理服务
 * 
 * 特性：
 * 1. 统一的错误类型和分类
 * 2. 错误转换和包装
 * 3. 用户友好的错误消息（支持i18n）
 * 4. 自动UI提示（Message/Notification）
 * 5. 内存错误日志
 * 6. 与 LoggerService 集成
 */

import { Message, Notification } from '@arco-design/web-react'
import { t } from 'i18next'
import { logger } from './LoggerService'

// ============================================
// 错误类型枚举
// ============================================
export enum ErrorCategory {
  NETWORK = 'NETWORK',           // 网络错误
  API = 'API',                   // API 错误
  VALIDATION = 'VALIDATION',     // 验证错误
  AUTHENTICATION = 'AUTH',       // 认证错误
  AUTHORIZATION = 'FORBIDDEN',   // 权限错误
  NOT_FOUND = 'NOT_FOUND',       // 资源不存在
  TIMEOUT = 'TIMEOUT',           // 超时错误
  FILE_SYSTEM = 'FILE_SYSTEM',   // 文件系统错误
  CONFIGURATION = 'CONFIG',      // 配置错误
  UNKNOWN = 'UNKNOWN',           // 未知错误
}

// ============================================
// 错误严重级别
// ============================================
export enum ErrorSeverity {
  LOW = 'low',           // 轻微问题，可忽略
  MEDIUM = 'medium',     // 一般问题，需要关注
  HIGH = 'high',         // 严重问题，需要处理
  CRITICAL = 'critical', // 关键问题，影响核心功能
}

// ============================================
// 应用错误类
// ============================================
export class AppError extends Error {
  readonly category: ErrorCategory
  readonly severity: ErrorSeverity
  readonly code: string
  readonly context?: Record<string, unknown>
  readonly timestamp: Date
  readonly originalError?: Error

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code: string = 'UNKNOWN_ERROR',
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message)
    this.name = 'AppError'
    this.category = category
    this.severity = severity
    this.code = code
    this.context = context
    this.timestamp = new Date()
    this.originalError = originalError

    // 保持堆栈跟踪
    if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * 获取用户友好的错误消息（支持 i18n）
   */
  getUserMessage(): string {
    // 尝试使用国际化消息
    const i18nKey = `errors.${this.code}`
    const i18nMessage = t(i18nKey, { defaultValue: '' })
    if (i18nMessage) {
      return i18nMessage
    }

    // 开发环境：记录缺失的 i18n key
    if (import.meta.env.DEV && !i18nMessage) {
      logger.warn(`Missing i18n key: ${i18nKey}`, 'ErrorService', { code: this.code, category: this.category })
    }

    // 回退到默认分类消息
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]: '网络连接失败，请检查网络设置',
      [ErrorCategory.API]: '服务器请求失败，请稍后重试',
      [ErrorCategory.VALIDATION]: '输入数据有误，请检查后重试',
      [ErrorCategory.AUTHENTICATION]: '登录已过期，请重新登录',
      [ErrorCategory.AUTHORIZATION]: '没有权限执行此操作',
      [ErrorCategory.NOT_FOUND]: '请求的资源不存在',
      [ErrorCategory.TIMEOUT]: '请求超时，请稍后重试',
      [ErrorCategory.FILE_SYSTEM]: '文件操作失败',
      [ErrorCategory.CONFIGURATION]: '配置错误',
      [ErrorCategory.UNKNOWN]: '发生未知错误，请稍后重试',
    }

    return messages[this.category] || this.message
  }

  /**
   * 是否应该显示给用户
   */
  shouldShowToUser(): boolean {
    return this.severity !== ErrorSeverity.LOW
  }

  /**
   * 是否应该上报
   */
  shouldReport(): boolean {
    return this.severity === ErrorSeverity.HIGH || this.severity === ErrorSeverity.CRITICAL
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }

  // ==========================================
  // 工厂方法
  // ==========================================

  static network(message: string, original?: Error, context?: Record<string, unknown>): AppError {
    return new AppError(
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      'NETWORK_ERROR',
      context,
      original
    )
  }

  static api(
    message: string,
    code: string = 'API_ERROR',
    context?: Record<string, unknown>,
    original?: Error
  ): AppError {
    return new AppError(message, ErrorCategory.API, ErrorSeverity.HIGH, code, context, original)
  }

  static validation(
    message: string,
    field?: string,
    context?: Record<string, unknown>
  ): AppError {
    return new AppError(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      'VALIDATION_ERROR',
      { ...context, field }
    )
  }

  static auth(message: string = '认证失败'): AppError {
    return new AppError(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, 'AUTH_ERROR')
  }

  static forbidden(message: string = '没有权限'): AppError {
    return new AppError(
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      'FORBIDDEN_ERROR'
    )
  }

  static notFound(resource: string, context?: Record<string, unknown>): AppError {
    return new AppError(
      `${resource} 不存在`,
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.MEDIUM,
      'NOT_FOUND_ERROR',
      context
    )
  }

  static timeout(operation: string, timeoutMs: number): AppError {
    return new AppError(
      `${operation} 操作超时`,
      ErrorCategory.TIMEOUT,
      ErrorSeverity.HIGH,
      'TIMEOUT_ERROR',
      { timeout: timeoutMs }
    )
  }

  static fileSystem(message: string, original?: Error): AppError {
    return new AppError(
      message,
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.HIGH,
      'FILE_SYSTEM_ERROR',
      undefined,
      original
    )
  }

  static config(message: string): AppError {
    return new AppError(
      message,
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.CRITICAL,
      'CONFIG_ERROR'
    )
  }
}

// ============================================
// 错误处理器类型
// ============================================
type ErrorHandler = (error: AppError) => void | Promise<void>

// ============================================
// 错误处理配置
// ============================================
interface ErrorHandlerConfig {
  showNotification: boolean
  showMessage: boolean
  logToMemory: boolean
  rethrow: boolean
}

const DEFAULT_HANDLER_CONFIG: ErrorHandlerConfig = {
  showNotification: false,
  showMessage: true,
  logToMemory: true,
  rethrow: false,
}

// ============================================
// Error Service
// ============================================
class ErrorService {
  private handlers: ErrorHandler[] = []
  private globalHandler?: (error: AppError) => void
  private errorLog: AppError[] = []
  private maxLogSize = 100

  /**
   * 注册错误处理器
   */
  onError(handler: ErrorHandler): () => void {
    this.handlers.push(handler)
    return () => {
      const index = this.handlers.indexOf(handler)
      if (index !== -1) {
        this.handlers.splice(index, 1)
      }
    }
  }

  /**
   * 设置全局错误处理器
   */
  setGlobalHandler(handler: (error: AppError) => void): void {
    this.globalHandler = handler
  }

  /**
   * 处理错误
   */
  async handle(
    error: unknown,
    context?: string,
    config?: Partial<ErrorHandlerConfig>
  ): Promise<AppError> {
    const mergedConfig = { ...DEFAULT_HANDLER_CONFIG, ...config }
    const appError = this.normalize(error)

    // 记录错误到日志服务
    logger.error(
      appError.message,
      appError.originalError,
      context || 'ErrorService',
      {
        category: appError.category,
        severity: appError.severity,
        code: appError.code,
        ...appError.context,
      }
    )

    // 记录到内存日志
    if (mergedConfig.logToMemory) {
      this.logToMemory(appError)
    }

    // 显示UI提示
    if (mergedConfig.showMessage) {
      this.showMessage(appError)
    }

    // 显示通知（仅严重错误）
    if (mergedConfig.showNotification && appError.severity === ErrorSeverity.CRITICAL) {
      this.showNotification(appError)
    }

    // 调用注册的处理器
    for (const handler of this.handlers) {
      try {
        await handler(appError)
      } catch (e) {
        logger.error('Error handler failed', e as Error, 'ErrorService')
      }
    }

    // 调用全局处理器
    if (this.globalHandler) {
      this.globalHandler(appError)
    }

    // 是否重新抛出
    if (mergedConfig.rethrow) {
      throw appError
    }

    return appError
  }

  /**
   * 记录到内存日志
   */
  private logToMemory(error: AppError): void {
    this.errorLog.unshift(error)
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop()
    }
  }

  /**
   * 显示消息提示
   */
  private showMessage(error: AppError): void {
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      Message.error(error.getUserMessage())
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      Message.warning(error.getUserMessage())
    }
  }

  /**
   * 显示通知
   */
  private showNotification(error: AppError): void {
    Notification.error({
      title: t('error'),
      content: error.getUserMessage(),
      duration: 5000,
    })
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  /**
   * 清除错误日志
   */
  clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * 标准化错误为 AppError
   */
  normalize(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        'UNKNOWN_ERROR',
        { name: error.name },
        error
      )
    }

    return new AppError(
      String(error),
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      'UNKNOWN_ERROR'
    )
  }

  /**
   * 包装异步函数，自动处理错误
   */
  wrap<T>(
    fn: () => Promise<T>,
    errorHandler?: (error: AppError) => void
  ): Promise<T | undefined> {
    return fn().catch((error: unknown) => {
      const appError = this.normalize(error)
      this.handle(appError)
      if (errorHandler) {
        errorHandler(appError)
      }
      return undefined
    })
  }

  /**
   * 创建安全的异步函数包装器
   */
  safe<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: string
  ): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
    return async (...args: Parameters<T>) => {
      try {
        return (await fn(...args)) as ReturnType<T>
      } catch (error) {
        await this.handle(error, context)
        return undefined
      }
    }
  }

  /**
   * 验证条件，失败时抛出错误
   */
  assert(condition: boolean, message: string, category?: ErrorCategory): void {
    if (!condition) {
      throw new AppError(
        message,
        category || ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        'ASSERTION_ERROR'
      )
    }
  }

  /**
   * 验证值是否存在，不存在时抛出错误
   */
  assertExists<T>(value: T | null | undefined, name: string): T {
    if (value === null || value === undefined) {
      throw AppError.notFound(name)
    }
    return value
  }
}

// ============================================
// 单例实例
// ============================================
export const errorService = new ErrorService()

// ============================================
// 便捷导出
// ============================================
export const handleError = (error: unknown, context?: string): Promise<AppError> =>
  errorService.handle(error, context)

export const safe = <T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
) => errorService.safe(fn, context)

export const assert = (condition: boolean, message: string, category?: ErrorCategory): void =>
  errorService.assert(condition, message, category)

export const assertExists = <T>(value: T | null | undefined, name: string): T =>
  errorService.assertExists(value, name)
