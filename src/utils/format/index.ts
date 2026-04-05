/** 文件大小单位 */
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'ZB'] as const

/** 大小计算进制 (1024) */
const SIZE_BASE = 1024

/** 小数精度 (2 位) */
const DECIMAL_PRECISION = 100

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串 (如 "1.5 GB")
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return `0 ${SIZE_UNITS[0]}`
  if (!bytes || bytes < 0 || !isFinite(bytes)) return `0 ${SIZE_UNITS[0]}`

  let prev = bytes
  let index = 0

  while (Math.floor(bytes) > 0 && index < SIZE_UNITS.length - 1) {
    prev = bytes
    bytes /= SIZE_BASE
    index++
  }

  // 如果已经超出最大单位，使用最后一个单位
  if (index >= SIZE_UNITS.length) {
    index = SIZE_UNITS.length - 1
  }

  // 还原到最后一个有效的单位
  if (index > 0) {
    bytes = prev
    index--
  }

  return `${Math.round(bytes * DECIMAL_PRECISION) / DECIMAL_PRECISION} ${SIZE_UNITS[index]}`
}

/** 时间格式化常量 */
const TIME_CONSTANTS = {
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_MINUTE: 60,
  PAD_LENGTH: 2,
  PAD_CHAR: '0',
} as const

/**
 * 格式化剩余时间
 * @param etaInSeconds - 剩余秒数
 * @returns 格式化后的时间字符串 (如 "01h 30m 45s")
 */
export function formatETA(etaInSeconds: number): string {
  if (!isFinite(etaInSeconds) || etaInSeconds <= 0) {
    return '未知'
  }

  const hours = Math.floor(etaInSeconds / TIME_CONSTANTS.SECONDS_PER_HOUR)
  const minutes = Math.floor(
    (etaInSeconds % TIME_CONSTANTS.SECONDS_PER_HOUR) / TIME_CONSTANTS.SECONDS_PER_MINUTE
  )
  const seconds = Math.floor(etaInSeconds % TIME_CONSTANTS.SECONDS_PER_MINUTE)

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours.toString().padStart(TIME_CONSTANTS.PAD_LENGTH, TIME_CONSTANTS.PAD_CHAR)}h`)
  }
  if (minutes > 0 || hours > 0) {
    parts.push(
      `${minutes.toString().padStart(TIME_CONSTANTS.PAD_LENGTH, TIME_CONSTANTS.PAD_CHAR)}m`
    )
  }
  parts.push(`${seconds.toString().padStart(TIME_CONSTANTS.PAD_LENGTH, TIME_CONSTANTS.PAD_CHAR)}s`)

  return parts.join(' ')
}

/**
 * 格式化路径
 * @param path - 原始路径
 * @param isWindows - 是否为 Windows 路径
 * @returns 格式化后的路径
 */
export function formatPath(path: string, isWindows: boolean = false): string {
  if (!path || typeof path !== 'string') {
    return ''
  }

  // 统一替换反斜杠为正斜杠，并合并多个连续的斜杠
  let formattedPath = path.replace(/\\/g, '/').replace(/\/+/g, '/')

  if (isWindows) {
    // Windows 路径处理
    if (/^[A-Za-z]/.test(formattedPath)) {
      // 以字母开头，需要添加驱动器冒号
      if (formattedPath.substring(1, 2) !== ':') {
        formattedPath =
          formattedPath.substring(0, 1).toUpperCase() + ':' + formattedPath.substring(1)
      }
    } else if (formattedPath.startsWith('/')) {
      // 以斜杠开头，移除开头的斜杠
      formattedPath = formattedPath.substring(1)
      // 递归处理，确保正确处理所有情况
      return formatPath(formattedPath, isWindows)
    }
  } else {
    // Unix/Linux 路径处理：确保以斜杠开头
    if (!formattedPath.startsWith('/')) {
      formattedPath = '/' + formattedPath
    }
  }

  return formattedPath
}
