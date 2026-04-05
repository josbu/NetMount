/**
 * 检查对象是否为空
 * @param obj - 要检查的对象
 * @returns 如果对象为空则返回 true
 */
export function isEmptyObject(obj: Record<string, unknown>): boolean {
  if (!obj || typeof obj !== 'object') {
    return true
  }
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

/**
 * 获取 URL 搜索参数
 * @param name - 参数名
 * @returns 参数值
 */
export function getURLSearchParam(name: string): string {
  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get(name) || ''
}

/**
 * 获取对象属性数组
 * @param obj - 输入对象
 * @returns 包含键值对的对象数组
 */
export function getProperties<T extends Record<string, unknown>>(
  obj: T
): Array<{ key: string; value: unknown }> {
  const result: Array<{ key: string; value: unknown }> = []

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result.push({ key: key, value: obj[key] })
    }
  }

  return result
}

/**
 * 合并对象
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 合并后的对象
 */
export function mergeObjects<T>(target: T, source: Partial<T>): T {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (typeof sourceValue === 'object' && !Array.isArray(sourceValue) && sourceValue !== null) {
        if (
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue) &&
          targetValue !== null
        ) {
          target[key] = mergeObjects(targetValue, sourceValue)
        } else {
          target[key] = sourceValue as T[Extract<keyof T, string>]
        }
      } else {
        // 如果不是对象，则直接覆盖
        target[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }
  }
  return target
}
