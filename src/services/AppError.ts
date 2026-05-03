/**
 * AppError - 应用错误类和错误类型定义
 */

import { t } from 'i18next'
import { logger } from './LoggerService'

// ============================================
// 错误类型枚举
// ============================================
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTH',
  AUTHORIZATION = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  FILE_SYSTEM = 'FILE_SYSTEM',
  CONFIGURATION = 'CONFIG',
  UNKNOWN = 'UNKNOWN',
}

// ============================================
// 错误严重级别
// ============================================
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ============================================
// 错误分类到 i18n key 的映射
// ============================================
export const ERROR_CATEGORY_I18N_KEYS: Record<ErrorCategory, string> = {
  [ErrorCategory.NETWORK]: 'error_network',
  [ErrorCategory.API]: 'error_api',
  [ErrorCategory.VALIDATION]: 'error_validation',
  [ErrorCategory.AUTHENTICATION]: 'error_auth',
  [ErrorCategory.AUTHORIZATION]: 'error_forbidden',
  [ErrorCategory.NOT_FOUND]: 'error_not_found',
  [ErrorCategory.TIMEOUT]: 'error_timeout',
  [ErrorCategory.FILE_SYSTEM]: 'error_file_system',
  [ErrorCategory.CONFIGURATION]: 'error_config',
  [ErrorCategory.UNKNOWN]: 'error_unknown',
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

    if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, AppError)
    }
  }

  getUserMessage(): string {
    const i18nKey = `errors.${this.code}`
    const i18nMessage = t(i18nKey, { defaultValue: '' })
    if (i18nMessage) {
      return i18nMessage
    }

    if (import.meta.env.DEV && !i18nMessage) {
      logger.warn(`Missing i18n key: ${i18nKey}`, 'ErrorService', { code: this.code, category: this.category })
    }

    const i18nKey2 = ERROR_CATEGORY_I18N_KEYS[this.category]
    return i18nKey2 ? t(i18nKey2, { defaultValue: this.message }) : this.message
  }

  shouldShowToUser(): boolean {
    return this.severity !== ErrorSeverity.LOW
  }

  shouldReport(): boolean {
    return this.severity === ErrorSeverity.HIGH || this.severity === ErrorSeverity.CRITICAL
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      context: import.meta.env.DEV ? this.context : undefined,
      timestamp: this.timestamp.toISOString(),
      stack: import.meta.env.DEV ? this.stack : undefined,
    }
  }

  // ==========================================
  // 工厂方法
  // ==========================================

  static network(message: string, original?: Error, context?: Record<string, unknown>): AppError {
    return new AppError(message, ErrorCategory.NETWORK, ErrorSeverity.HIGH, 'NETWORK_ERROR', context, original)
  }

  static api(message: string, code: string = 'API_ERROR', context?: Record<string, unknown>, original?: Error): AppError {
    return new AppError(message, ErrorCategory.API, ErrorSeverity.HIGH, code, context, original)
  }

  static validation(message: string, field?: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, 'VALIDATION_ERROR', { ...context, field })
  }

  static auth(message: string = t('error_auth_failed')): AppError {
    return new AppError(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, 'AUTH_ERROR')
  }

  static forbidden(message: string = t('error_no_permission')): AppError {
    return new AppError(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, 'FORBIDDEN_ERROR')
  }

  static notFound(resource: string, context?: Record<string, unknown>): AppError {
    return new AppError(
      t('error_resource_not_found', { resource }),
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.MEDIUM,
      'NOT_FOUND_ERROR',
      context
    )
  }

  static timeout(operation: string, timeoutMs: number): AppError {
    return new AppError(
      t('error_operation_timeout', { operation }),
      ErrorCategory.TIMEOUT,
      ErrorSeverity.HIGH,
      'TIMEOUT_ERROR',
      { timeout: timeoutMs }
    )
  }

  static fileSystem(message: string, original?: Error): AppError {
    return new AppError(message, ErrorCategory.FILE_SYSTEM, ErrorSeverity.HIGH, 'FILE_SYSTEM_ERROR', undefined, original)
  }

  static config(message: string): AppError {
    return new AppError(message, ErrorCategory.CONFIGURATION, ErrorSeverity.CRITICAL, 'CONFIG_ERROR')
  }
}