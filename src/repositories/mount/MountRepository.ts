/**
 * MountRepository - 挂载数据访问层
 * 
 * 封装挂载相关的数据访问操作
 * 当前实现：调用现有Service层
 */

import { BaseRepository } from '../base/BaseRepository'
import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'
import {
  mountStorage as mountStorageService,
  unmountStorage as unmountStorageService,
  reupMount,
  isMounted,
  addMountStorage,
  delMountStorage,
} from '../../controller/storage/mount/mount'
import type { MountEntity, MountStatus, VfsOptions, MountOptions } from '../../type/mount/mount'
import type { MountListItem } from '../../type/config'
import { rcloneInfo } from '../../services/rclone'

/**
 * MountRepository 类
 */
export class MountRepository extends BaseRepository<MountEntity> {
  private mountLogger = logger.withContext('MountRepository')

  constructor() {
    super({ enableCache: false })
  }

  /**
   * 生成URL-safe的挂载点ID
   * 使用encodeURIComponent确保特殊字符不会导致ID冲突
   */
  private generateMountId(storageName: string, mountPath: string): string {
    // 使用_作为分隔符，因为:可能在storageName或mountPath中出现
    // encodeURIComponent处理特殊字符
    const encodedName = encodeURIComponent(storageName)
    const encodedPath = encodeURIComponent(mountPath)
    return `${encodedName}_${encodedPath}`
  }

  /**
   * 从ID解析storageName和mountPath
   */
  private parseMountId(id: string): { storageName: string; mountPath: string } | null {
    const separatorIndex = id.indexOf('_')
    if (separatorIndex === -1) {
      return null
    }
    try {
      const storageName = decodeURIComponent(id.substring(0, separatorIndex))
      const mountPath = decodeURIComponent(id.substring(separatorIndex + 1))
      return { storageName, mountPath }
    } catch {
      // 解码失败，可能是旧格式的ID
      return null
    }
  }

  async getAll(): Promise<MountEntity[]> {
    await reupMount(true)
    
    return rcloneInfo.mountList.map(mount => ({
      id: this.generateMountId(mount.storageName, mount.mountPath),
      storageName: mount.storageName,
      mountPath: mount.mountPath,
      status: 'mounted' as const,
      createdAt: mount.mountedTime || new Date(),
    }))
  }

  async getById(id: string): Promise<MountEntity | null> {
    // 尝试解析ID
    const parsed = this.parseMountId(id)
    if (parsed) {
      // 如果ID格式正确，直接查找匹配的storageName和mountPath
      const mounts = await this.getAll()
      return mounts.find(m => 
        m.storageName === parsed.storageName && m.mountPath === parsed.mountPath
      ) || null
    }
    
    // 如果ID格式解析失败，退回到直接比较ID
    const mounts = await this.getAll()
    return mounts.find(m => m.id === id) || null
  }

  async create(entity: Partial<MountEntity>): Promise<MountEntity> {
    if (!entity.storageName || !entity.mountPath) {
      throw new RepositoryError(
        'Missing required fields: storageName or mountPath',
        ErrorCode.INVALID_DATA,
        'MountRepository'
      )
    }

    const mountInfo: MountListItem = {
      storageName: entity.storageName,
      mountPath: entity.mountPath,
      parameters: entity.parameters?.vfsOpt && entity.parameters?.mountOpt
        ? {
            vfsOpt: entity.parameters.vfsOpt,
            mountOpt: entity.parameters.mountOpt,
          }
        : { vfsOpt: {}, mountOpt: {} },
      autoMount: entity.autoMount ?? false,
    }

    await mountStorageService(mountInfo)

    const mount: MountEntity = {
      id: this.generateMountId(entity.storageName, entity.mountPath),
      storageName: entity.storageName,
      mountPath: entity.mountPath,
      parameters: mountInfo.parameters,
      autoMount: mountInfo.autoMount,
      status: 'mounted',
      createdAt: new Date(),
    }

    this.notifyChange({
      type: 'create',
      id: mount.id,
      newData: mount,
      timestamp: new Date(),
    })

    this.mountLogger.info('Mount created', { id: mount.id })
    return mount
  }

  async update(id: string, entity: Partial<MountEntity>): Promise<MountEntity> {
    const oldMount = await this.getById(id)
    if (!oldMount) {
      throw new RepositoryError(`Mount ${id} not found`, ErrorCode.NOT_FOUND, 'MountRepository')
    }

    // 构建新的挂载配置
    const newStorageName = entity.storageName || oldMount.storageName
    const newMountPath = entity.mountPath || oldMount.mountPath
    const newParameters = entity.parameters || oldMount.parameters
    const newAutoMount = entity.autoMount ?? oldMount.autoMount

    // 如果关键配置没有变化，直接返回旧的（无需重新挂载）
    if (
      newStorageName === oldMount.storageName &&
      newMountPath === oldMount.mountPath &&
      this.deepEqual(newParameters, oldMount.parameters) &&
      newAutoMount === oldMount.autoMount
    ) {
      this.mountLogger.info('Mount configuration unchanged, skipping update', { id })
      return oldMount
    }

    // 原子性更新：先创建新挂载，成功后再删除旧挂载
    this.mountLogger.info('Starting atomic mount update', { id, oldMountPath: oldMount.mountPath, newMountPath })

    let newMount: MountEntity | null = null
    let createSuccess = false

    try {
      // 1. 先尝试创建新挂载
      newMount = await this.create({
        storageName: newStorageName,
        mountPath: newMountPath,
        parameters: newParameters,
        autoMount: newAutoMount,
      })
      createSuccess = true

      // 2. 新挂载成功后，删除旧挂载
      try {
        await this.delete(id)
      } catch (deleteError) {
        // 旧挂载删除失败，记录警告但不影响整体成功状态
        this.mountLogger.warn('Failed to delete old mount after update', {
          id,
          error: deleteError instanceof Error ? deleteError.message : String(deleteError),
        })
      }

      this.notifyChange({
        type: 'update',
        id: newMount.id,
        oldData: oldMount,
        newData: newMount,
        timestamp: new Date(),
      })

      this.mountLogger.info('Mount updated successfully', { id: newMount.id })
      return newMount
    } catch (error) {
      // 如果创建新挂载失败，尝试回滚
      if (createSuccess && newMount) {
        try {
          await unmountStorageService(newMount.mountPath)
          this.mountLogger.info('Rolled back new mount after update failure', { mountPath: newMount.mountPath })
        } catch (rollbackError) {
          this.mountLogger.error('Failed to rollback new mount', rollbackError as Error, { mountPath: newMount.mountPath })
        }
      }

      throw new RepositoryError(
        `Failed to update mount: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.UNKNOWN,
        'MountRepository'
      )
    }
  }

  async delete(id: string): Promise<boolean> {
    const oldMount = await this.getById(id)
    if (!oldMount) {
      return false
    }

    await unmountStorageService(oldMount.mountPath)

    this.notifyChange({
      type: 'delete',
      id,
      oldData: oldMount,
      timestamp: new Date(),
    })

    this.mountLogger.info('Mount deleted', { id })
    return true
  }

  async exists(id: string): Promise<boolean> {
    const mount = await this.getById(id)
    return mount !== null
  }

  async mountStorage(
    storageName: string,
    mountPath: string,
    parameters?: { vfsOpt?: VfsOptions; mountOpt?: MountOptions }
  ): Promise<MountEntity> {
    return this.create({
      storageName,
      mountPath,
      parameters,
    })
  }

  async unmountStorage(mountId: string): Promise<boolean> {
    return this.delete(mountId)
  }

  async getMountStatus(mountId: string): Promise<MountStatus> {
    const mount = await this.getById(mountId)
    return mount?.status || 'unmounted'
  }

  async getActiveMounts(): Promise<MountEntity[]> {
    const mounts = await this.getAll()
    return mounts.filter(m => m.status === 'mounted')
  }

  async getMountsByStorage(storageName: string): Promise<MountEntity[]> {
    const mounts = await this.getAll()
    return mounts.filter(m => m.storageName === storageName)
  }

  async isMountPointMounted(mountPath: string): Promise<boolean> {
    return isMounted(mountPath)
  }

  async addMountConfig(
    storageName: string,
    mountPath: string,
    parameters: { vfsOpt: VfsOptions; mountOpt: MountOptions },
    autoMount?: boolean
  ): Promise<boolean> {
    return addMountStorage(storageName, mountPath, parameters, autoMount)
  }

  async deleteMountConfig(mountPath: string): Promise<void> {
    await delMountStorage(mountPath)
  }

  /**
   * 深度比较两个值是否相等
   * 支持对象、数组、基本类型的比较
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    // 处理null和undefined
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== typeof b) return false

    // 处理基本类型
    if (typeof a !== 'object') return a === b

    // 处理数组
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false
      }
      return true
    }

    // 处理对象
    if (Array.isArray(a) || Array.isArray(b)) return false

    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!this.deepEqual(objA[key], objB[key])) return false
    }

    return true
  }
}

export const mountRepository = new MountRepository()