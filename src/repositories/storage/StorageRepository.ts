/**
 * StorageRepository - 存储数据访问层
 * 
 * 封装所有存储相关的数据访问操作
 * 包括 Rclone 和 OpenList 存储管理
 */

import { BaseRepository } from '../base/BaseRepository'
import { StorageList } from '../../type/rclone/rcloneInfo'
import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'

// ============================================
// StorageRepository 类
// ============================================
export class StorageRepository extends BaseRepository<StorageList> {
  private storageLogger = logger.withContext('StorageRepository')

  constructor() {
    super({ enableCache: true, cacheTimeout: 10000 })
  }

  // ==========================================
  // IRepository 接口实现
  // ==========================================

  async getById(id: string): Promise<StorageList | null> {
    const storages = await this.getAll()
    return storages.find(s => s.name === id) || null
  }

  async getAll(): Promise<StorageList[]> {
    // 通过 Service 层获取存储列表
    // Repository 层不直接调用 Rclone/OpenList API
    // 而是委托给专门的 Service
    return this.invokeCommand<StorageList[]>('get_storage_list')
  }

  async create(entity: Partial<StorageList>): Promise<StorageList> {
    this.validate(entity, ['name', 'type', 'framework'])

    await this.invokeCommand<void>('create_storage', {
      name: entity.name,
      type: entity.type,
      framework: entity.framework,
      options: entity.other,
    })

    const newStorage = await this.getById(entity.name!)
    if (!newStorage) {
      throw new RepositoryError(
        'Storage created but not found in list',
        ErrorCode.UNKNOWN,
        'StorageRepository'
      )
    }

    this.notifyChange({
      type: 'create',
      id: entity.name!,
      newData: newStorage,
      timestamp: new Date(),
    })

    this.clearCache()
    return newStorage
  }

  async update(id: string, entity: Partial<StorageList>): Promise<StorageList> {
    const oldStorage = await this.getById(id)
    if (!oldStorage) {
      throw new RepositoryError(`Storage ${id} not found`, ErrorCode.NOT_FOUND, 'StorageRepository')
    }

    await this.invokeCommand<void>('update_storage', {
      name: id,
      options: entity.other,
    })

    const updatedStorage = await this.getById(id)
    if (!updatedStorage) {
      throw new RepositoryError(
        'Storage updated but not found',
        ErrorCode.UNKNOWN,
        'StorageRepository'
      )
    }

    this.notifyChange({
      type: 'update',
      id,
      oldData: oldStorage,
      newData: updatedStorage,
      timestamp: new Date(),
    })

    this.clearCache()
    return updatedStorage
  }

  async delete(id: string): Promise<boolean> {
    const oldStorage = await this.getById(id)
    if (!oldStorage) {
      return false
    }

    await this.invokeCommand<void>('delete_storage', { name: id })

    this.notifyChange({
      type: 'delete',
      id,
      oldData: oldStorage,
      timestamp: new Date(),
    })

    this.clearCache()
    this.storageLogger.info(`Storage ${id} deleted successfully`)
    return true
  }

  async exists(id: string): Promise<boolean> {
    const storage = await this.getById(id)
    return storage !== null
  }

  // ==========================================
  // 存储特定方法
  // ==========================================

  /**
   * 获取存储空间信息
   */
  async getStorageSpace(name: string): Promise<{
    total: number
    free: number
    used: number
  }> {
    return this.invokeCommand<{ total: number; free: number; used: number }>(
      'get_storage_space',
      { name }
    )
  }

  /**
   * 获取存储配置参数
   */
  async getStorageParams(name: string): Promise<Record<string, unknown>> {
    return this.invokeCommand<Record<string, unknown>>('get_storage_params', { name })
  }

  /**
   * 过滤隐藏的存储
   */
  async getVisibleStorages(): Promise<StorageList[]> {
    const storages = await this.getAll()
    return storages.filter(s => !s.hide)
  }

  /**
   * 按类型过滤存储
   */
  async getStoragesByFramework(framework: 'rclone' | 'openlist'): Promise<StorageList[]> {
    const storages = await this.getAll()
    return storages.filter(s => s.framework === framework)
  }

  /**
   * 刷新存储列表（从 Rclone/OpenList 重新获取）
   */
  async refreshStorageList(): Promise<StorageList[]> {
    this.clearCache()
    return this.invokeCommand<StorageList[]>('refresh_storage_list', undefined, {
      skipCache: true,
    })
  }
}

// ============================================
// 单例实例
// ============================================
export const storageRepository = new StorageRepository()