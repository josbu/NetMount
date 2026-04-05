/**
 * Repository Layer 统一导出
 * 
 * 提供数据访问层的统一入口
 */

// 基类和接口
export { BaseRepository } from './base/BaseRepository'
export * from './interfaces/IRepository'

// 具体 Repository 实现
export { ConfigRepository, configRepository } from './config/ConfigRepository'
export { StorageRepository, storageRepository } from './storage/StorageRepository'

// ============================================
// 使用示例
// ============================================

/**
 * // 获取配置
 * import { configRepository } from '@/repositories'
 * const config = await configRepository.getConfig()
 * 
 * // 更新配置
 * await configRepository.updatePartialConfig({
 *   settings: { themeMode: 'dark' }
 * })
 * 
 * // 获取存储列表
 * import { storageRepository } from '@/repositories'
 * const storages = await storageRepository.getAll()
 * 
 * // 创建存储
 * await storageRepository.create({
 *   name: 'my-storage',
 *   type: 's3',
 *   framework: 'rclone'
 * })
 * 
 * // 监听数据变更
 * const unsubscribe = storageRepository.addChangeListener((event) => {
 *   console.log(`Storage ${event.id} changed:`, event.type)
 * })
 */