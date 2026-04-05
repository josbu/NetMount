/**
 * Repository 接口定义
 * 
 * 定义数据访问层的统一接口规范
 */

import { LogLevel } from '../../services/LoggerService'

// ============================================
// 基础 Repository 接口
// ============================================
export interface IRepository<T> {
  /**
   * 获取单个实体
   */
  getById(id: string): Promise<T | null>

  /**
   * 获取所有实体
   */
  getAll(): Promise<T[]>

  /**
   * 创建实体
   */
  create(entity: Partial<T>): Promise<T>

  /**
   * 更新实体
   */
  update(id: string, entity: Partial<T>): Promise<T>

  /**
   * 删除实体
   */
  delete(id: string): Promise<boolean>

  /**
   * 检查实体是否存在
   */
  exists(id: string): Promise<boolean>
}

// ============================================
// 查询选项接口
// ============================================
export interface QueryOptions {
  /**
   * 过滤条件
   */
  filter?: Record<string, unknown>

  /**
   * 排序字段
   */
  sortBy?: string

  /**
   * 排序方向
   */
  sortOrder?: 'asc' | 'desc'

  /**
   * 分页偏移
   */
  offset?: number

  /**
   * 分页限制
   */
  limit?: number
}

// ============================================
// Repository 配置接口
// ============================================
export interface RepositoryConfig {
  /**
   * 是否启用缓存
   */
  enableCache?: boolean

  /**
   * 缓存过期时间（毫秒）
   */
  cacheTimeout?: number

  /**
   * 日志级别
   */
  logLevel?: LogLevel

  /**
   * 重试次数
   */
  retryCount?: number

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number
}

// ============================================
// Repository 错误类型
// ============================================
export class RepositoryError extends Error {
  public readonly code: ErrorCodeType
  public readonly context?: string
  public readonly originalError?: unknown

  constructor(message: string, code: ErrorCodeType, context?: string, originalError?: unknown) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.context = context
    this.originalError = originalError
  }
}

// 错误代码类型
export type ErrorCodeType =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INVALID_DATA'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

// 错误代码常量
export const ErrorCode: Record<ErrorCodeType, ErrorCodeType> = {
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_DATA: 'INVALID_DATA',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
}

// ============================================
// 数据变更事件接口
// ============================================
export interface DataChangeEvent<T> {
  /**
   * 变更类型
   */
  type: 'create' | 'update' | 'delete'

  /**
   * 实体ID
   */
  id: string

  /**
   * 变更前的数据
   */
  oldData?: T

  /**
   * 变更后的数据
   */
  newData?: T

  /**
   * 变更时间
   */
  timestamp: Date
}

// 数据变更监听器
export type DataChangeListener<T> = (event: DataChangeEvent<T>) => void