import { invoke } from '@tauri-apps/api/core'

/**
 * 切换开发者工具状态
 * @param state - true 打开，false 关闭
 */
export async function set_devtools_state(state: boolean): Promise<void> {
  await invoke('toggle_devtools', {
    preferred_open: state,
  })
}

/**
 * 重启应用程序
 */
export async function restartSelf(): Promise<void> {
  await invoke('restart_self')
}

/**
 * 异步休眠
 * @param ms - 休眠毫秒数
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 获取可用端口
 * @param count - 需要的端口数量
 * @returns 可用端口数组
 */
export async function getAvailablePorts(count: number = 1): Promise<number[]> {
  return (await invoke('get_available_ports', { count: count })) as number[]
}
