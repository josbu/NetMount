/**
 * Cache persistence utilities - localStorage persistence logic
 */

import { logger } from '../../services/LoggerService'
import type { CacheEntry } from './CacheManager'

/**
 * 序列化后的缓存条目（用于localStorage）
 */
export interface SerializedCacheEntry {
  value: string // JSON字符串
  expiresAt: number
  createdAt: number
  lastAccessedAt: number
  hitCount: number
}

const cacheLogger = logger.withContext('CachePersistence')

/**
 * 从localStorage加载缓存数据
 */
export function loadFromStorage(
  cache: Map<string, CacheEntry<unknown>>,
  persistenceKey: string
): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(persistenceKey)) {
        const cacheKey = key.substring(persistenceKey.length)
        try {
          const serialized = localStorage.getItem(key)
          if (serialized) {
            const entry: SerializedCacheEntry = JSON.parse(serialized)

            // 只加载未过期的缓存
            if (Date.now() < entry.expiresAt) {
              cache.set(cacheKey, {
                value: JSON.parse(entry.value),
                expiresAt: entry.expiresAt,
                createdAt: entry.createdAt,
                lastAccessedAt: entry.lastAccessedAt,
                hitCount: entry.hitCount,
              })
            } else {
              // 标记过期缓存以便删除
              keysToRemove.push(key)
            }
          }
        } catch (parseError) {
          cacheLogger.warn('Failed to parse cached entry', { key: cacheKey, error: parseError })
          keysToRemove.push(key)
        }
      }
    }

    // 删除过期或损坏的缓存
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // 忽略删除错误
      }
    })

    if (cache.size > 0) {
      cacheLogger.info('Loaded cache from localStorage', { count: cache.size })
    }
  } catch (error) {
    cacheLogger.error('Failed to load cache from localStorage', error as Error)
  }
}

/**
 * 保存缓存条目到localStorage
 */
export function saveToStorage(
  key: string,
  entry: CacheEntry<unknown>,
  persistenceKey: string
): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    const serialized: SerializedCacheEntry = {
      value: JSON.stringify(entry.value),
      expiresAt: entry.expiresAt,
      createdAt: entry.createdAt,
      lastAccessedAt: entry.lastAccessedAt,
      hitCount: entry.hitCount,
    }
    localStorage.setItem(persistenceKey + key, JSON.stringify(serialized))
  } catch (error) {
    // localStorage可能已满或不支持，记录但不阻断
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      cacheLogger.warn('localStorage quota exceeded, disabling persistence for this entry', { key })
    } else {
      cacheLogger.debug('Failed to save cache to localStorage', { key, error })
    }
  }
}

/**
 * 从localStorage删除缓存条目
 */
export function removeFromStorage(key: string, persistenceKey: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(persistenceKey + key)
  } catch {
    // 忽略删除错误
  }
}

/**
 * 清空localStorage中的缓存
 */
export function clearStorage(persistenceKey: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(persistenceKey)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch {
      // 忽略删除错误
    }
  })
}
