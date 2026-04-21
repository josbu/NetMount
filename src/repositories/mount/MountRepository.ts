/**
 * MountRepository - 挂载数据访问层
 * 
 * 封装挂载相关的数据访问操作
 * 重构：直接操作 nmConfig，不再依赖 Controller 层
 */

import { BaseRepository } from '../base/BaseRepository'
import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'
import { nmConfig, saveNmConfig } from '../../services/ConfigService'
import { rcloneInfo } from '../../services/rclone'
import { useMountStore } from '../../stores/mountStore'
import { hooks } from '../../services/hook'
import { rclone_api_post } from '../../utils/rclone/request'
import { fs_exist_dir, fs_make_dir } from '../../utils'
import { convertStoragePath } from '../../services/storage/StorageManager'
import type { MountEntity, MountStatus, VfsOptions, MountOptions } from '../../type/mount/mount'
import type { MountListItem } from '../../type/config'
import type { MountList } from '../../type/rclone/rcloneInfo'
import { isMountListResponse } from '../../type/rclone/api'

const mountLogger = logger.withContext('MountRepository')

/**
 * MountRepository 类
 */
export class MountRepository extends BaseRepository<MountEntity> {
  constructor() {
    super({ enableCache: false })
  }

  /**
   * 生成URL-safe的挂载点ID
   */
  private generateMountId(storageName: string, mountPath: string): string {
    const encodedName = encodeURIComponent(storageName)
    const encodedPath = encodeURIComponent(mountPath)
    return `${encodedName}_${encodedPath}`
  }

  /**
   * 从ID解析storageName和mountPath
   */
  private parseMountId(id: string): { storageName: string; mountPath: string } | null {
    const separatorIndex = id.indexOf('_')
    if (separatorIndex === -1) return null
    try {
      const storageName = decodeURIComponent(id.substring(0, separatorIndex))
      const mountPath = decodeURIComponent(id.substring(separatorIndex + 1))
      return { storageName, mountPath }
    } catch {
      return null
    }
  }

  /**
   * 路径标准化
   */
  private normalizeMountPath(path: string): string {
    if (!path) return path
    let normalized = path.replace(/\\/g, '/')
    if (normalized.length > 2 && normalized.endsWith('/') && !normalized.endsWith(':/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  // ==========================================
  // CRUD 方法
  // ==========================================

  async getAll(): Promise<MountEntity[]> {
    // 刷新挂载列表
    await this.refreshMountList(true)
    
    return rcloneInfo.mountList.map(mount => ({
      id: this.generateMountId(mount.storageName, mount.mountPath),
      storageName: mount.storageName,
      mountPath: mount.mountPath,
      status: 'mounted' as MountStatus,
      createdAt: mount.mountedTime || new Date(),
    }))
  }

  async getById(id: string): Promise<MountEntity | null> {
    const parsed = this.parseMountId(id)
    if (parsed) {
      const mounts = await this.getAll()
      return mounts.find(m => 
        m.storageName === parsed.storageName && m.mountPath === parsed.mountPath
      ) || null
    }
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

    // 检查是否已存在配置
    const normalizedPath = this.normalizeMountPath(entity.mountPath)
    const existing = nmConfig.mount.lists.find(
      item => this.normalizeMountPath(item.mountPath) === normalizedPath
    )
    if (existing) {
      throw new RepositoryError(
        'Mount configuration already exists',
        ErrorCode.ALREADY_EXISTS,
        'MountRepository'
      )
    }

    // 添加挂载配置
    const mountInfo: MountListItem = {
      storageName: entity.storageName,
      mountPath: entity.mountPath,
      parameters: entity.parameters?.vfsOpt && entity.parameters?.mountOpt
        ? { vfsOpt: entity.parameters.vfsOpt, mountOpt: entity.parameters.mountOpt }
        : { vfsOpt: {}, mountOpt: {} },
      autoMount: entity.autoMount ?? false,
    }
    nmConfig.mount.lists.push(mountInfo)
    await saveNmConfig()

    // 执行挂载
    await this.performMount(mountInfo)

    const mount: MountEntity = {
      id: this.generateMountId(entity.storageName, entity.mountPath),
      storageName: entity.storageName,
      mountPath: entity.mountPath,
      parameters: mountInfo.parameters,
      autoMount: mountInfo.autoMount,
      status: 'mounted',
      createdAt: new Date(),
    }

    this.notifyChange({ type: 'create', id: mount.id, newData: mount, timestamp: new Date() })
    mountLogger.info('Mount created', { id: mount.id })
    return mount
  }

  async update(id: string, entity: Partial<MountEntity>): Promise<MountEntity> {
    const oldMount = await this.getById(id)
    if (!oldMount) {
      throw new RepositoryError(`Mount ${id} not found`, ErrorCode.NOT_FOUND, 'MountRepository')
    }

    // 找到配置索引
    const normalizedPath = this.normalizeMountPath(oldMount.mountPath)
    const configIndex = nmConfig.mount.lists.findIndex(
      item => this.normalizeMountPath(item.mountPath) === normalizedPath
    )
    if (configIndex === -1) {
      throw new RepositoryError('Mount configuration not found', ErrorCode.NOT_FOUND, 'MountRepository')
    }

    // 更新配置
    const oldConfig = nmConfig.mount.lists[configIndex]!
    const oldParameters = oldConfig.parameters
    const newParameters = entity.parameters?.vfsOpt && entity.parameters?.mountOpt
      ? { vfsOpt: entity.parameters.vfsOpt, mountOpt: entity.parameters.mountOpt }
      : oldParameters
    const newConfig: MountListItem = {
      storageName: entity.storageName ?? oldConfig.storageName,
      mountPath: entity.mountPath ?? oldConfig.mountPath,
      parameters: newParameters,
      autoMount: entity.autoMount ?? oldConfig.autoMount,
    }
    nmConfig.mount.lists[configIndex] = newConfig
    await saveNmConfig()

    // 如果关键路径变化，需要重新挂载
    if (newConfig.mountPath !== oldMount.mountPath || newConfig.storageName !== oldMount.storageName) {
      await this.performUnmount(oldMount.mountPath)
      await this.performMount(newConfig)
    }

    const newMount: MountEntity = {
      id: this.generateMountId(newConfig.storageName, newConfig.mountPath),
      storageName: newConfig.storageName,
      mountPath: newConfig.mountPath,
      parameters: newConfig.parameters,
      autoMount: newConfig.autoMount,
      status: 'mounted',
      createdAt: oldMount.createdAt,
    }

    this.notifyChange({ type: 'update', id: newMount.id, oldData: oldMount, newData: newMount, timestamp: new Date() })
    mountLogger.info('Mount updated', { id: newMount.id })
    return newMount
  }

  async delete(id: string): Promise<boolean> {
    const oldMount = await this.getById(id)
    if (!oldMount) return false

    // 先卸载
    await this.performUnmount(oldMount.mountPath)

    // 删除配置
    const normalizedPath = this.normalizeMountPath(oldMount.mountPath)
    nmConfig.mount.lists = nmConfig.mount.lists.filter(
      item => this.normalizeMountPath(item.mountPath) !== normalizedPath
    )
    await saveNmConfig()

    this.notifyChange({ type: 'delete', id, oldData: oldMount, timestamp: new Date() })
    mountLogger.info('Mount deleted', { id })
    return true
  }

  async exists(id: string): Promise<boolean> {
    const mount = await this.getById(id)
    return mount !== null
  }

  // ==========================================
  // 业务方法
  // ==========================================

  /**
   * 刷新挂载列表（从 rclone 获取）
   */
  async refreshMountList(noRefreshUI?: boolean): Promise<void> {
    const response = await rclone_api_post('/mount/listmounts')
    
    if (!response || !isMountListResponse(response)) {
      mountLogger.warn('Invalid mount list response format', { response })
      rcloneInfo.mountList = []
      useMountStore.getState().setMountList([])
      !noRefreshUI && hooks.upMount()
      return
    }
    
    const mountPoints = response.mountPoints
    rcloneInfo.mountList = []
    const newMountList: MountList[] = []

    mountPoints.forEach((item) => {
      const mountItem: MountList = {
        storageName: item.fs,
        mountPath: item.mountPoint,
        mountedTime: new Date(item.mountedOn),
      }
      rcloneInfo.mountList.push(mountItem)
      newMountList.push(mountItem)
    })
    
    useMountStore.getState().setMountList(newMountList)
    !noRefreshUI && hooks.upMount()
  }

  /**
   * 检查挂载点是否已挂载
   */
  async isMounted(mountPath: string): Promise<boolean> {
    await this.refreshMountList(true)
    return rcloneInfo.mountList.findIndex(item => item.mountPath === mountPath) !== -1
  }

  /**
   * 获取挂载配置
   */
  getMountConfig(mountPath: string): MountListItem | undefined {
    const normalized = this.normalizeMountPath(mountPath)
    return nmConfig.mount.lists.find(item => this.normalizeMountPath(item.mountPath) === normalized)
  }

  /**
   * 执行挂载操作
   */
  private async performMount(mountInfo: MountListItem): Promise<void> {
    // 非 Windows 系统需要创建目录
    if (!rcloneInfo.version.os.toLowerCase().includes('windows')) {
      if (!(await fs_exist_dir(mountInfo.mountPath))) {
        await fs_make_dir(mountInfo.mountPath)
      }
    }

    await rclone_api_post('/mount/mount', {
      fs: convertStoragePath(mountInfo.storageName) || mountInfo.storageName,
      mountPoint: mountInfo.mountPath,
      ...mountInfo.parameters,
    })

    await this.refreshMountList()
  }

  /**
   * 执行卸载操作
   */
  private async performUnmount(mountPath: string): Promise<void> {
    await rclone_api_post('/mount/unmount', { mountPoint: mountPath })
    await this.refreshMountList()
  }

  // ==========================================
  // 公开 API（供 Controller 使用）
  // ==========================================

  /**
   * 添加挂载配置（不立即挂载）
   */
  async addMountConfig(
    storageName: string,
    mountPath: string,
    parameters: { vfsOpt: VfsOptions; mountOpt: MountOptions },
    autoMount?: boolean
  ): Promise<boolean> {
    const normalizedPath = this.normalizeMountPath(mountPath)
    if (nmConfig.mount.lists.some(item => this.normalizeMountPath(item.mountPath) === normalizedPath)) {
      return false
    }

    const mountInfo: MountListItem = {
      storageName,
      mountPath,
      parameters,
      autoMount: autoMount ?? false,
    }
    nmConfig.mount.lists.push(mountInfo)
    await saveNmConfig()
    await this.refreshMountList()
    return true
  }

  /**
   * 删除挂载配置（会先卸载）
   */
  async deleteMountConfig(mountPath: string): Promise<void> {
    if (await this.isMounted(mountPath)) {
      await this.performUnmount(mountPath)
    }

    const normalizedPath = this.normalizeMountPath(mountPath)
    nmConfig.mount.lists = nmConfig.mount.lists.filter(
      item => this.normalizeMountPath(item.mountPath) !== normalizedPath
    )
    await saveNmConfig()
    await this.refreshMountList()
  }

  /**
   * 挂载存储
   */
  async mountStorage(mountInfo: MountListItem): Promise<void> {
    await this.performMount(mountInfo)
  }

  /**
   * 卸载存储
   */
  async unmountStorage(mountPath: string): Promise<void> {
    await this.performUnmount(mountPath)
  }

  /**
   * 编辑挂载配置
   */
  async editMountConfig(mountInfo: MountListItem, oldMountPath?: string): Promise<void> {
    const searchPath = oldMountPath || mountInfo.mountPath
    const normalizedSearch = this.normalizeMountPath(searchPath)
    
    let found = false
    for (let i = 0; i < nmConfig.mount.lists.length; i++) {
      if (this.normalizeMountPath(nmConfig.mount.lists[i]!.mountPath) === normalizedSearch) {
        nmConfig.mount.lists[i] = mountInfo
        found = true
        break
      }
    }

    if (!found) {
      nmConfig.mount.lists.push(mountInfo)
    }

    await saveNmConfig()
  }
}

export const mountRepository = new MountRepository()