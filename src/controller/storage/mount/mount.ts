/**
 * Mount Controller - 挂载操作控制器
 * 
 * 重构：调用 mountRepository，而不是直接操作 nmConfig
 * 保持向后兼容的导出接口
 */

import { invoke } from '@tauri-apps/api/core'
import { mountRepository } from '../../../repositories/mount/MountRepository'
import { MountListItem } from '../../../type/config'

import type {
  MountOptions,
  VfsOptions,
} from '../../../type/rclone/storage/mount/parameters'

// ==========================================
// 向后兼容的导出接口
// ==========================================

/**
 * 刷新挂载列表
 */
async function reupMount(noRefreshUI?: boolean) {
  await mountRepository.refreshMountList(noRefreshUI)
}

/**
 * 获取挂载配置
 */
function getMountStorage(mountPath: string): MountListItem | undefined {
  return mountRepository.getMountConfig(mountPath)
}

/**
 * 检查是否已挂载
 */
function isMounted(mountPath: string): boolean {
  // 同步版本，用于 UI 判断
  const mountList = mountRepository.getMountConfig(mountPath)
  return mountList !== undefined
}

/**
 * 添加挂载配置
 */
async function addMountStorage(
  storageName: string,
  mountPath: string,
  parameters: { vfsOpt: VfsOptions; mountOpt: MountOptions },
  autoMount?: boolean
): Promise<boolean> {
  return mountRepository.addMountConfig(storageName, mountPath, parameters, autoMount)
}

/**
 * 删除挂载配置
 */
async function delMountStorage(mountPath: string) {
  await mountRepository.deleteMountConfig(mountPath)
}

/**
 * 编辑挂载配置
 */
async function editMountStorage(mountInfo: MountListItem, oldMountPath?: string) {
  await mountRepository.editMountConfig(mountInfo, oldMountPath)
}

/**
 * 挂载存储
 */
async function mountStorage(mountInfo: MountListItem) {
  await mountRepository.mountStorage(mountInfo)
}

/**
 * 卸载存储
 */
async function unmountStorage(mountPath: string) {
  await mountRepository.unmountStorage(mountPath)
}

/**
 * 获取可用驱动器字母（Windows）
 */
async function getAvailableDriveLetter(): Promise<string> {
  return await invoke('get_available_drive_letter')
}

// ==========================================
// 导出（向后兼容）
// ==========================================

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