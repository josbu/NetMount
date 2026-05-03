/**
 * Error Service - 统一的错误处理服务
 * 
 * 特性：
 * 1. 统一的错误处理
 * 2. 自动UI提示（Message/Notification）
 * 3. 内存错误日志
 * 4. 与 LoggerService 集成
 */

import { Message, Notification } from '@arco-design/web-react'
import { t } from 'i18next'
import { logger } from './LoggerService'
import { AppError, ErrorCategory, ErrorSeverity } from './AppError'

export { AppError, ErrorCategory, ErrorSeverity }

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
  private handlers: Array<(error: AppError) => void | Promise<void>> = []
  private globalHandler?: (error: AppError) => void
  private errorLog: AppError[] = []
  private maxLogSize = 100

  onError(handler: (error: AppError) => void | Promise<void>): () => void {
    this.handlers.push(handler)
    return () => {
      const index = this.handlers.indexOf(handler)
      if (index !== -1) {
        this.handlers.splice(index, 1)
      }
    }
  }

  setGlobalHandler(handler: (error: AppError) => void): void {
    this.globalHandler = handler
  }

  async handle(
    error: unknown,
    context?: string,
    config?: Partial<ErrorHandlerConfig>
  ): Promise<AppError> {
    const mergedConfig = { ...DEFAULT_HANDLER_CONFIG, ...config }
    const appError = this.normalize(error)

    logger.error(appError.message, appError.originalError, context || 'ErrorService', {
      category: appError.category,
      severity: appError.severity,
      code: appError.code,
      ...appError.context,
    })

    if (mergedConfig.logToMemory) {
      this.logToMemory(appError)
    }

    if (mergedConfig.showMessage) {
      this.showMessage(appError)
    }

    if (mergedConfig.showNotification && appError.severity === ErrorSeverity.CRITICAL) {
      this.showNotification(appError)
    }

    for (const handler of this.handlers) {
      try {
        await handler(appError)
      } catch (e) {
        logger.error('Error handler failed', e as Error, 'ErrorService')
      }
    }

    if (this.globalHandler) {
      this.globalHandler(appError)
    }

    if (mergedConfig.rethrow) {
      throw appError
    }

    return appError
  }

  private logToMemory(error: AppError): void {
    this.errorLog.unshift(error)
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop()
    }
  }

  private showMessage(error: AppError): void {
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      Message.error(error.getUserMessage())
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      Message.warning(error.getUserMessage())
    }
  }

  private showNotification(error: AppError): void {
    Notification.error({
      title: t('error'),
      content: error.getUserMessage(),
      duration: 5000,
    })
  }

  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  clearErrorLog(): void {
    this.errorLog = []
  }

  normalize(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return new AppError(error.message, ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM, 'UNKNOWN_ERROR', {
        name: error.name,
      }, error)
    }

    return new AppError(String(error), ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM, 'UNKNOWN_ERROR')
  }

  wrap<T>(fn: () => Promise<T>, errorHandler?: (error: AppError) => void): Promise<T | undefined> {
    return fn().catch((error: unknown) => {
      const appError = this.normalize(error)
      this.handle(appError)
      if (errorHandler) {
        errorHandler(appError)
      }
      return undefined
    })
  }

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

  assert(condition: boolean, message: string, category?: ErrorCategory): void {
    if (!condition) {
      throw new AppError(message, category || ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, 'ASSERTION_ERROR')
    }
  }

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

export const safe = <T extends (...args: unknown[]) => Promise<unknown>>(fn: T, context?: string) =>
  errorService.safe(fn, context)

export const assert = (condition: boolean, message: string, category?: ErrorCategory): void =>
  errorService.assert(condition, message, category)

export const assertExists = <T>(value: T | null | undefined, name: string): T =>
  errorService.assertExists(value, name)
