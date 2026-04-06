/**
 * 挂载相关类型定义
 */

import type { VfsOptions, MountOptions } from '../rclone/storage/mount/parameters'

/**
 * 挂载实体
 * 表示一个存储挂载点的完整信息
 */
export interface MountEntity {
  /** 挂载点唯一标识符（URL-safe编码的storageName和mountPath组合） */
  id: string
  /** 存储名称（对应rclone配置中的存储名） */
  storageName: string
  /** 本地挂载路径 */
  mountPath: string
  /** VFS和挂载参数配置 */
  parameters?: { vfsOpt?: VfsOptions; mountOpt?: MountOptions }
  /** 是否自动挂载（在应用启动时自动重新挂载） */
  autoMount?: boolean
  /** 当前挂载状态 */
  status: MountStatus
  /** 创建时间 */
  createdAt?: Date
  /** 错误信息（当状态为error时） */
  error?: string
}

/**
 * 挂载状态
 * - mounting: 正在挂载中
 * - mounted: 已成功挂载
 * - error: 挂载出错
 * - unmounted: 已卸载
 * - unmounting: 正在卸载中
 */
export type MountStatus = 'mounting' | 'mounted' | 'error' | 'unmounted' | 'unmounting'

export { VfsOptions, MountOptions }

/**
 * 挂载统计信息
 * 用于展示挂载点的整体统计
 */
export interface MountStats {
  /** 总挂载点数量 */
  totalMounts: number
  /** 活跃挂载点数量（状态为mounted） */
  activeMounts: number
  /** 失败挂载点数量（状态为error） */
  failedMounts: number
  /** 按存储类型分类的挂载点数量统计 */
  storageTypes: Record<string, number>
}

/**
 * 挂载点验证结果
 * 用于在挂载前验证路径是否可用
 */
export interface MountPointValidation {
  /** 验证是否通过 */
  isValid: boolean
  /** 错误信息（验证失败时） */
  error?: string
  /** 改进建议（如有） */
  suggestion?: string
}

/**
 * 自动挂载配置
 * 控制挂载点在应用启动时的行为
 */
export interface AutoMountConfig {
  /** 是否启用自动挂载 */
  enabled: boolean
  /** 失败重试次数 */
  retryCount: number
  /** 重试间隔（毫秒） */
  retryDelay: number
  /** 是否在应用启动时自动挂载 */
  mountOnStartup: boolean
}