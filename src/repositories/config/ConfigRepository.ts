/**
 * ConfigRepository - 配置数据访问层
 * 
 * 封装所有配置相关的 Tauri invoke 调用
 * 提供类型安全的配置读写操作
 */

import { BaseRepository } from '../base/BaseRepository'
import { NMConfig, OSInfo } from '../../type/config'
import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'

// ============================================
// 配置实体类型
// ============================================
type ConfigEntity = NMConfig

// ============================================
// ConfigRepository 类
// ============================================
export class ConfigRepository extends BaseRepository<ConfigEntity> {
  private configLogger = logger.withContext('ConfigRepository')

  constructor() {
    super({ enableCache: true, cacheTimeout: 30000 })
  }

  // ==========================================
  // IRepository 接口实现
  // ==========================================

  async getById(id: string): Promise<ConfigEntity | null> {
    // 配置文件只有一个，ID固定为 'main'
    if (id !== 'main') return null
    return this.getConfig()
  }

  async getAll(): Promise<ConfigEntity[]> {
    const config = await this.getConfig()
    return [config]
  }

  async create(entity: Partial<ConfigEntity>): Promise<ConfigEntity> {
    void entity // Mark as intentionally unused
    throw new RepositoryError(
      'Config already exists, use update instead',
      ErrorCode.ALREADY_EXISTS,
      'ConfigRepository'
    )
  }

  async update(id: string, entity: Partial<ConfigEntity>): Promise<ConfigEntity> {
    if (id !== 'main') {
      throw new RepositoryError(
        'Config ID must be "main"',
        ErrorCode.INVALID_DATA,
        'ConfigRepository'
      )
    }

    const currentConfig = await this.getConfig()
    const updatedConfig = this.mergeConfig(currentConfig, entity)
    await this.saveConfig(updatedConfig)

    this.notifyChange({
      type: 'update',
      id: 'main',
      oldData: currentConfig,
      newData: updatedConfig,
      timestamp: new Date(),
    })

    return updatedConfig
  }

  async delete(id: string): Promise<boolean> {
    void id // Mark as intentionally unused
    throw new RepositoryError(
      'Cannot delete config',
      ErrorCode.PERMISSION_DENIED,
      'ConfigRepository'
    )
  }

  async exists(id: string): Promise<boolean> {
    return id === 'main'
  }

  // ==========================================
  // 配置特定方法
  // ==========================================

  /**
   * 获取完整配置
   */
  async getConfig(): Promise<NMConfig> {
    return this.invokeCommand<NMConfig>('get_config')
  }

  /**
   * 保存完整配置
   */
  async saveConfig(config: NMConfig): Promise<void> {
    await this.invokeCommand<void>('update_config', { data: config }, { skipCache: true })
    this.clearCache()
    this.configLogger.info('Config saved successfully')
  }

  /**
   * 更新部分配置（合并）
   */
  async updatePartialConfig(partial: Partial<NMConfig>): Promise<NMConfig> {
    return this.update('main', partial)
  }

  /**
   * 获取特定配置路径的值
   */
  async getConfigPath(path: string): Promise<unknown> {
    const config = await this.getConfig()
    return this.getPathValue(config, path)
  }

  /**
   * 设置特定配置路径的值
   */
  async setConfigPath(path: string, value: unknown): Promise<NMConfig> {
    const config = await this.getConfig()
    const updatedConfig = this.setPathValue(config, path, value)
    await this.saveConfig(updatedConfig)
    return updatedConfig
  }

  /**
   * 获取操作系统信息
   */
  async getOsInfo(): Promise<OSInfo> {
    return this.invokeCommand<OSInfo>('get_os_info')
  }

  // ==========================================
  // 私有辅助方法
  // ==========================================

  /**
   * 深度合并辅助函数
   */
  private deepMerge(target: unknown, source: unknown): unknown {
    if (typeof source !== 'object' || source === null || Array.isArray(source)) {
      return source
    }

    if (typeof target !== 'object' || target === null || Array.isArray(target)) {
      return source
    }

    const merged = { ...(target as Record<string, unknown>) }
    const sourceObj = source as Record<string, unknown>
    const sourceKeys = Object.keys(sourceObj)
    
    for (const key of sourceKeys) {
      if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
        merged[key] = this.deepMerge(merged[key], sourceObj[key])
      }
    }
    return merged
  }

  /**
   * 合并配置对象（深度合并）
   */
  private mergeConfig(base: NMConfig, partial: Partial<NMConfig>): NMConfig {
    const merged = this.deepMerge(base, partial)
    return merged as NMConfig
  }

  /**
   * 获取路径值（如 'settings.themeMode'）
   */
  private getPathValue(obj: unknown, path: string): unknown {
    const keys = path.split('.')
    let current: unknown = obj

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * 设置路径值（简化版本）
   */
  private setPathValue(obj: NMConfig, path: string, value: unknown): NMConfig {
    const keys = path.split('.')
    const result = JSON.parse(JSON.stringify(obj)) as NMConfig // Deep clone
    let current: Record<string, unknown> = result as unknown as Record<string, unknown>

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }

    current[keys[keys.length - 1]!] = value
    return result
  }
}

// ============================================
// 单例实例
// ============================================
export const configRepository = new ConfigRepository()