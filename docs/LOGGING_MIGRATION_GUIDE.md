/**
 * 日志迁移指南（示例文件，不参与编译）
 * 
 * 展示如何将 console.log/warn/error 替换为统一的 LoggerService
 */

// ============================================
// 旧方式（不推荐）
// ============================================

/*
// ❌ console.log - 无上下文、无级别、难以过滤
console.log('Storage loaded successfully')
console.log('Loading storage:', storageName)

// ❌ console.warn - 缺少结构化信息
console.warn('Driver missing config field')
console.warn('Invalid storage data:', storage)

// ❌ console.error - 缺少错误追踪信息
console.error('Failed to fetch storage list:', error)
console.error('Command failed:', command, error)
*/

// ============================================
// 新方式（推荐）
// ============================================

/*
import { logger, storageLogger, configLogger, apiLogger } from '@/services/LoggerService'

// ✅ logger.info - 有上下文、可过滤
logger.info('Storage loaded successfully', 'Storage')
logger.info('Loading storage', 'Storage', { storageName })

// ✅ storageLogger - 专用上下文日志器
storageLogger.info('Storage loaded successfully')
storageLogger.info('Loading storage', { storageName })

// ✅ logger.warn - 结构化警告
logger.warn('Driver missing config field', 'Storage', { driver: driverName })
logger.warn('Invalid storage data', 'Storage', { storage })

// ✅ logger.error - 完整错误追踪
logger.error('Failed to fetch storage list', error as Error, 'Storage')
logger.error('Command failed', error as Error, 'API', { command })
*/

// ============================================
// 迁移示例
// ============================================

/*
示例1: src/controller/storage/framework/openlist/providers.ts

旧代码:
  console.error('Unknown driver list structure:', data)
  console.warn(`Driver ${key} missing config field, using fallback`)

新代码:
  storageLogger.error('Unknown driver list structure', new Error('Invalid structure'), { data })
  storageLogger.warn('Driver missing config field, using fallback', { driverKey: key })

示例2: src/controller/task/runner.ts

旧代码:
  console.error(`Error executing task ${task.name}:`, error)

新代码:
  logger.error(
    'Error executing task',
    error as Error,
    'TaskRunner',
    { taskName: task.name, taskType: task.type }
  )

示例3: src/controller/task/scheduler.ts

旧代码:
  console.error('Invalid task mode:', task.run.mode)

新代码:
  logger.error(
    'Invalid task mode',
    new Error(`Invalid mode: ${task.run.mode}`),
    'TaskScheduler',
    { taskId: task.id, mode: task.run.mode }
  )
*/

// ============================================
// 日志级别选择指南
// ============================================

/**
 * DEBUG: 详细的调试信息（仅开发环境）
 * - 函数参数和返回值
 * - 中间状态变量
 * - 性能计时信息
 * 
 * 示例:
 * logger.debug('Processing driver list', 'Storage', { driverCount: list.length })
 * logger.debug('API request started', 'API', { endpoint, params })
 */

/**
 * INFO: 正常的业务流程信息
 * - 操作成功通知
 * - 用户操作记录
 * - 重要状态变更
 * 
 * 示例:
 * logger.info('Storage created successfully', 'Storage', { storageName })
 * logger.info('User logged in', 'Auth', { userId })
 */

/**
 * WARN: 潜在问题，不影响主要流程
 * - 数据格式不规范
 * - 配置缺失但有fallback
 * - 性能警告
 * 
 * 示例:
 * logger.warn('Driver config incomplete, using defaults', 'Storage', { driver })
 * logger.warn('Cache expired, refreshing', 'Config')
 */

/**
 * ERROR: 错误，影响当前操作但可恢复
 * - API请求失败
 * - 数据处理错误
 * - 外部依赖故障
 * 
 * 示例:
 * logger.error('Failed to load storage list', error, 'Storage')
 * logger.error('API request timeout', error, 'API', { endpoint })
 */

/**
 * FATAL: 致命错误，应用无法继续运行
 * - 关键初始化失败
 * - 配置文件损坏
 * - 核心服务不可用
 * 
 * 示例:
 * logger.fatal('Database initialization failed', error, 'Core')
 * logger.fatal('Config file corrupted', error, 'Config')
 */

// ============================================
// 最佳实践
// ============================================

/**
 * 1. 使用专用上下文日志器（推荐）
 * 
 * import { storageLogger } from '@/services/LoggerService'
 * storageLogger.info('Storage loaded')  // 自动带 'Storage' 上下文
 */

/**
 * 2. 添加结构化数据（便于调试和分析）
 * 
 * logger.error('Task failed', error, 'Task', {
 *   taskId: task.id,
 *   taskName: task.name,
 *   retryCount: 3
 * })
 */

/**
 * 3. 错误对象必须传递（便于追踪）
 * 
 * // ❌ 错误: 只传消息
 * logger.error('Something went wrong')
 * 
 * // ✅ 正确: 传递Error对象
 * logger.error('Something went wrong', new Error('Details'))
 */

/**
 * 4. 避免敏感信息泄露
 * 
 * // ❌ 错误: 可能泄露密码
 * logger.debug('User login', { password: userPassword })
 * 
 * // ✅ 正确: 过滤敏感信息
 * logger.debug('User login', { username, password: '***' })
 */

// ============================================
// 批量迁移建议
// ============================================

/**
 * 使用以下命令查找需要迁移的 console 调用:
 * 
 * grep -r "console\.(log|warn|error)" src/ --include="*.ts" --include="*.tsx"
 * 
 * 迁移优先级:
 * 1. ERROR: console.error -> logger.error（最高优先级，影响错误追踪）
 * 2. WARN: console.warn -> logger.warn（次优先级，潜在问题）
 * 3. LOG: console.log -> logger.info/debug（最低优先级）
 * 
 * 迁移策略:
 * - 先迁移关键模块（controller/storage、controller/task）
 * - 再迁移工具模块（utils/rclone、utils/openlist）
 * - 最后迁移UI模块（page/*）
 * 
 * 迁移步骤（每个文件）:
 * 1. 在文件顶部添加导入:
 *    import { logger } from '@/services/LoggerService'
 *    或专用日志器:
 *    import { storageLogger } from '@/services/LoggerService'
 * 
 * 2. 替换 console.error -> logger.error
 *    console.error('Error:', err) 
 *    => logger.error('Error description', err as Error, 'Context')
 * 
 * 3. 替换 console.warn -> logger.warn
 *    console.warn('Warning:', data)
 *    => logger.warn('Warning description', 'Context', { data })
 * 
 * 4. 替换 console.log -> logger.info 或 logger.debug
 *    console.log('Info:', data)
 *    => logger.info('Info description', 'Context', { data })  // 重要信息
 *    => logger.debug('Debug info', 'Context', { data })       // 调试信息
 */