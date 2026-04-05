import { invoke } from '@tauri-apps/api/core'
import { nmConfig, saveNmConfig } from '../../../services/ConfigService'
import { hooks } from '../../../services/hook'
import { rcloneInfo } from '../../../services/rclone'
import { MountListItem } from '../../../type/config'
import { rclone_api_post } from '../../../utils/rclone/request'
import { fs_exist_dir, fs_make_dir } from '../../../utils'
import { convertStoragePath } from '../../../services/storage/StorageManager'
import {
  MountOptions,
  VfsOptions,
} from '../../../type/rclone/storage/mount/parameters'
import { isMountListResponse } from '../../../type/rclone/api'
import { logger } from '../../../services/LoggerService'
import { useMountStore } from '../../../stores/mountStore'
import type { MountList } from '../../../type/rclone/rcloneInfo'

async function reupMount(noRefreshUI?: boolean) {
  const response = await rclone_api_post('/mount/listmounts')
  
  if (!response || !isMountListResponse(response)) {
    logger.warn('Invalid mount list response format', 'Mount', { response })
    rcloneInfo.mountList = []
    useMountStore.getState().setMountList([])
    !noRefreshUI && hooks.upMount()
    return
  }
  
  const mountPoints = response.mountPoints

  rcloneInfo.mountList = []
  const newMountList: MountList[] = []

  mountPoints.forEach((item) => {
    const name = item.fs
    const mountItem: MountList = {
      storageName: name,
      mountPath: item.mountPoint,
      mountedTime: new Date(item.mountedOn),
    }
    rcloneInfo.mountList.push(mountItem)
    newMountList.push(mountItem)
  })
  
  useMountStore.getState().setMountList(newMountList)
  !noRefreshUI && hooks.upMount()
}

function normalizeMountPath(path: string): string {
  if (!path) return path
  let normalized = path.replace(/\\/g, '/')
  if (normalized.length > 2 && normalized.endsWith('/') && !normalized.endsWith(':/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

function getMountStorage(mountPath: string): MountListItem | undefined {
  const normalizedSearch = normalizeMountPath(mountPath)
  return nmConfig.mount.lists.find(item => normalizeMountPath(item.mountPath) === normalizedSearch)
}

function isMounted(mountPath: string): boolean {
  return rcloneInfo.mountList.findIndex(item => item.mountPath === mountPath) !== -1
}

async function addMountStorage(
  storageName: string,
  mountPath: string,
  parameters: { vfsOpt: VfsOptions; mountOpt: MountOptions },
  autoMount?: boolean
): Promise<boolean> {
  if (getMountStorage(mountPath)) {
    return false
  }

  const mountInfo: MountListItem = {
    storageName: storageName,
    mountPath: mountPath,
    parameters: parameters,
    autoMount: autoMount || false,
  }
  nmConfig.mount.lists.push(mountInfo)

  await saveNmConfig()
  await reupMount()
  return true
}

async function delMountStorage(mountPath: string) {
  if (isMounted(mountPath)) {
    await unmountStorage(mountPath)
  }

  nmConfig.mount.lists.forEach((item, index) => {
    if (item.mountPath === mountPath) {
      nmConfig.mount.lists.splice(index, 1)
    }
  })

  await saveNmConfig()
  await reupMount()
}

async function editMountStorage(mountInfo: MountListItem, oldMountPath?: string) {
  const searchPath = oldMountPath || mountInfo.mountPath

  let found = false
  const normalizedSearch = normalizeMountPath(searchPath)
  for (let i = 0; i < nmConfig.mount.lists.length; i++) {
    if (normalizeMountPath(nmConfig.mount.lists[i]!.mountPath) === normalizedSearch) {
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

async function mountStorage(mountInfo: MountListItem) {
  if (
    !rcloneInfo.version.os.toLowerCase().includes('windows') &&
    !(await fs_exist_dir(mountInfo.mountPath))
  ) {
    await fs_make_dir(mountInfo.mountPath)
  }

  const back = await rclone_api_post('/mount/mount', {
    fs: convertStoragePath(mountInfo.storageName) || mountInfo.storageName,
    mountPoint: mountInfo.mountPath,
    ...mountInfo.parameters,
  })

  await reupMount()
  return back
}

async function unmountStorage(mountPath: string) {
  await rclone_api_post('/mount/unmount', {
    mountPoint: mountPath,
  })

  await reupMount()
}

async function getAvailableDriveLetter(): Promise<string> {
  return await invoke('get_available_drive_letter')
}

export {
  reupMount,
  mountStorage,
  unmountStorage,
  addMountStorage,
  delMountStorage,
  editMountStorage,
  getMountStorage,
  isMounted,
  getAvailableDriveLetter,
}
