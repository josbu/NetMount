/**
 * Rclone 状态管理 - 兼容层
 * 
 * 将全局可变状态 rcloneInfo 重定向到 useRcloneStore
 * 保持向后兼容：原有代码无需修改导入路径
 * 
 * 注意：这是过渡方案，最终应直接使用 useRcloneStore
 */

import { useRcloneStore } from '../stores/useRcloneStore'
import { RcloneInfo } from '../type/rclone/rcloneInfo'
import { RcloneStats } from '../type/rclone/stats'
import { logger } from './LoggerService'

// 创建只读 Proxy，将所有访问重定向到 store
const rcloneInfo = new Proxy({} as RcloneInfo, {
  get(_, prop: keyof RcloneInfo) {
    const state = useRcloneStore.getState()
    return state[prop]
  },
  set(_, prop: keyof RcloneInfo, value) {
    // 允许设置属性，重定向到 store 的 set 方法
    const state = useRcloneStore.getState()
    const setterName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`
    if (setterName in state && typeof state[setterName as keyof typeof state] === 'function') {
      const setter = state[setterName as keyof typeof state] as (v: unknown) => void
      setter(value)
    } else {
      // 对于不支持直接设置的属性，使用 update 方法
      logger.warn(`Cannot set rcloneInfo.${String(prop)} directly, use store actions instead`, 'rclone-compat')
    }
    return true
  },
})

// 保持 stats history 作为独立模块状态（不放入 store）
const rcloneStatsHistory: RcloneStats[] = []

export { rcloneInfo, rcloneStatsHistory }
