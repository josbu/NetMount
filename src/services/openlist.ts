/**
 * OpenList 状态管理 - 兼容层
 * 
 * 将全局可变状态 openlistInfo 重定向到 useOpenlistStore
 * 保持向后兼容：原有代码无需修改导入路径
 * 
 * 注意：这是过渡方案，最终应直接使用 useOpenlistStore
 */

import { useOpenlistStore } from '../stores/useOpenlistStore'
import { OpenlistInfo } from '../type/openlist/openlistInfo'
import { logger } from './LoggerService'

// 创建只读 Proxy，将所有访问重定向到 store
const openlistInfo = new Proxy({} as OpenlistInfo, {
  get(_, prop: keyof OpenlistInfo) {
    const state = useOpenlistStore.getState()
    return state[prop]
  },
  set(_, prop: keyof OpenlistInfo, value) {
    // 允许设置属性，重定向到 store 的 set 方法
    const state = useOpenlistStore.getState()
    const setterName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`
    if (setterName in state && typeof state[setterName as keyof typeof state] === 'function') {
      const setter = state[setterName as keyof typeof state] as (v: unknown) => void
      setter(value)
    } else {
      logger.warn(`Cannot set openlistInfo.${String(prop)} directly, use store actions instead`, 'OpenList')
    }
    return true
  },
})

export { openlistInfo }
