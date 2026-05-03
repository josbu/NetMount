/**
 * CacheManager - 缓存管理器
 * 
 * 提供统一的缓存管理，支持TTL和LRU淘汰
 * 当前实现：内存缓存 + localStorage 持久化
 */

import { logger } from '../../services/LoggerService'
import {
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
  clearStorage,
} from './cachePersistence'

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
  lastAccessedAt: number
  hitCount: number
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxSize: number
  defaultTTL: number
  enableStats: boolean
  enablePersistence: boolean // 是否启用localStorage持久化
  persistenceKey: string // localStorage键名前缀
}

/**
 * CacheManager 类
 */
export class CacheManager {
  private cacheLogger = logger.withContext('CacheManager')
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  }
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  private readonly config: CacheConfig = {
    maxSize: 100,
    defaultTTL: 60000, // 1分钟
    enableStats: true,
    enablePersistence: true,
    persistenceKey: 'netmount_cache_',
  }

  constructor() {
    // 从localStorage加载缓存
    if (this.config.enablePersistence) {
      loadFromStorage(this.cache, this.config.persistenceKey)
    }
    
    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // 每分钟清理一次
  }

  /**
   * 销毁缓存管理器，清理定时器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
    this.cacheLogger.info('CacheManager destroyed')
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // 更新命中次数和最后访问时间
    entry.hitCount++
    entry.lastAccessedAt = Date.now()
    this.stats.hits++

    return entry.value as T
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl !== undefined ? ttl : this.config.defaultTTL),
      createdAt: Date.now(),
      hitCount: 0,
      lastAccessedAt: Date.now(),
    }

    this.cache.set(key, entry)
    this.stats.sets++
    
    // 持久化到localStorage
    if (this.config.enablePersistence) {
      saveToStorage(key, entry, this.config.persistenceKey)
    }
  }

  /**
   * 删除缓存值
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.stats.deletes++
      // 从localStorage删除
      if (this.config.enablePersistence) {
        removeFromStorage(key, this.config.persistenceKey)
      }
    }
    return result
  }

  /**
   * 清空缓存
   */
  clear(): void {
    // 清除localStorage中的缓存
    if (this.config.enablePersistence) {
      clearStorage(this.config.persistenceKey)
    }
    
    this.cache.clear()
    this.cacheLogger.info('Cache cleared')
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.sets = 0
    this.stats.deletes = 0
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取或设置缓存（如果不存在则创建）
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttl)
    return value
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(2)}%` : '0%',
      hitRateValue: total > 0 ? this.stats.hits / total : 0,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        if (this.config.enablePersistence) {
          removeFromStorage(key, this.config.persistenceKey)
        }
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.cacheLogger.info('Cleaned up expired cache entries', { count: cleaned })
    }

    return cleaned
  }

  /**
   * 淘汰最少使用的缓存（LRU）
   */
  private evict(): void {
    let oldestAccessTime = Infinity
    let oldestKey: string | null = null

    // 找到最久未访问的条目（基于 lastAccessedAt）
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestAccessTime) {
        oldestAccessTime = entry.lastAccessedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      if (this.config.enablePersistence) {
        removeFromStorage(oldestKey, this.config.persistenceKey)
      }
      this.stats.deletes++
      this.cacheLogger.debug('Evicted cache entry (LRU)', { key: oldestKey })
    }
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 获取缓存大小（不包含过期条目）
   */
  size(): number {
    this.cleanup()
    return this.cache.size
  }
}

export const cacheManager = new CacheManager()
