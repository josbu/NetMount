import { logger } from '../../services/LoggerService'
import { nmConfig } from '../../services/ConfigService'
import { rcloneInfo } from '../../services/rclone'
import { useMountStore } from '../../stores/mountStore'
import { hooks } from '../../services/hook'
import { rclone_api_post } from '../../utils/rclone/request'
import { fs_exist_dir, fs_make_dir } from '../../utils'
import { convertStoragePath } from '../../services/storage/StorageManager'
import type { MountListItem } from '../../type/config'
import type { MountList } from '../../type/rclone/rcloneInfo'
import { isMountListResponse } from '../../type/rclone/api'

const mountLogger = logger.withContext('MountRepository')

/**
 * 生成URL-safe的挂载点ID
 */
export function generateMountId(storageName: string, mountPath: string): string {
  const encodedName = encodeURIComponent(storageName)
  const encodedPath = encodeURIComponent(mountPath)
  return `${encodedName}_${encodedPath}`
}

/**
 * 从ID解析storageName和mountPath
 */
export function parseMountId(id: string): { storageName: string; mountPath: string } | null {
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
export function normalizeMountPath(path: string): string {
  if (!path) return path
  let normalized = path.replace(/\\/g, '/')
  if (normalized.length > 2 && normalized.endsWith('/') && !normalized.endsWith(':/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

/**
 * 刷新挂载列表（从 rclone 获取）
 */
export async function refreshMountList(noRefreshUI?: boolean): Promise<void> {
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
export async function isMounted(mountPath: string): Promise<boolean> {
  await refreshMountList(true)
  return rcloneInfo.mountList.findIndex(item => item.mountPath === mountPath) !== -1
}

/**
 * 获取挂载配置
 */
export function getMountConfig(mountPath: string): MountListItem | undefined {
  const normalized = normalizeMountPath(mountPath)
  return nmConfig.mount.lists.find(item => normalizeMountPath(item.mountPath) === normalized)
}

/**
 * 执行挂载操作
 */
export async function performMount(mountInfo: MountListItem): Promise<void> {
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

  await refreshMountList()
}

/**
 * 执行卸载操作
 */
export async function performUnmount(mountPath: string): Promise<void> {
  await rclone_api_post('/mount/unmount', { mountPoint: mountPath })
  await refreshMountList()
}
