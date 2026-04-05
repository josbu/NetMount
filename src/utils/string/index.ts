/**
 * 生成随机字符串
 * @param length - 字符串长度
 * @returns 随机字符串
 */
export function randomString(length: number): string {
  const alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const getRandomChar = (chars: string): string => chars[Math.floor(Math.random() * chars.length)]!
  return Array.from({ length }, () => getRandomChar(alphanumericChars)).join('')
}

/**
 * 比较版本号
 * @param v1 - 版本号 1
 * @param v2 - 版本号 2
 * @returns 1 (v1 > v2), -1 (v1 < v2), 0 (v1 === v2)
 */
export function compareVersions(v1: string, v2: string): number {
  v1 = v1.replace(/[^0-9.]/g, '')
  v2 = v2.replace(/[^0-9.]/g, '')
  const splitV1 = v1.split('.').map(Number)
  const splitV2 = v2.split('.').map(Number)

  // 确保两部分都有相同的元素数量，用 0 填充较短的版本
  const maxParts = Math.max(splitV1.length, splitV2.length)
  while (splitV1.length < maxParts) {
    splitV1.push(0)
  }
  while (splitV2.length < maxParts) {
    splitV2.push(0)
  }

  for (let i = 0; i < maxParts; i++) {
    const v1Part = splitV1[i]!
    const v2Part = splitV2[i]!
    if (v1Part > v2Part) {
      return 1
    } else if (v1Part < v2Part) {
      return -1
    }
  }

  return 0
}
