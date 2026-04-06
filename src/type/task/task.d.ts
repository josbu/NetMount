/**
 * 任务相关类型定义
 */
import { ParametersType } from '../defaults'

/**
 * 任务实体
 * 表示一个文件传输/同步任务的完整配置
 */
export interface TaskEntity {
  /** 任务唯一标识符（与name相同） */
  id: string
  /** 任务名称（唯一标识） */
  name: string
  /** 任务类型（copy/move/sync等） */
  taskType: TaskType
  /** 源存储配置 */
  source: {
    /** 源存储名称 */
    storageName: string
    /** 源路径 */
    path: string
  }
  /** 目标存储配置 */
  target: {
    /** 目标存储名称 */
    storageName: string
    /** 目标路径 */
    path: string
  }
  /** rclone传输参数 */
  parameters?: ParametersType
  /** 是否启用该任务 */
  enable: boolean
  /** 调度配置 */
  run: {
    /** 运行ID（任务正在运行时） */
    runId?: number
    /** 调度模式 */
    mode: 'time' | 'interval' | 'start' | 'disposable'
    /** 时间配置 */
    time: {
      /** 间隔天数 */
      intervalDays: number
      /** 小时 */
      h: number
      /** 分钟 */
      m: number
      /** 秒 */
      s: number
    }
    /** 间隔秒数（用于interval模式） */
    interval?: number
  }
  /** 运行时信息 */
  runInfo?: {
    /** 是否出错 */
    error?: boolean
    /** 消息/错误信息 */
    msg?: string
  }
  /** 当前状态 */
  status?: TaskStatus
  /** 创建时间 */
  createdAt?: Date
}

/**
 * 任务类型
 * - copy: 复制文件（保留源文件）
 * - move: 移动文件（删除源文件）
 * - sync: 同步（使目标与源一致）
 * - delete: 删除文件
 * - bisync: 双向同步
 */
export type TaskType = 'copy' | 'move' | 'sync' | 'delete' | 'bisync' | (string & {})

/**
 * 任务状态
 * - pending: 等待执行
 * - scheduled: 已调度等待执行时间
 * - running: 正在执行
 * - paused: 已暂停
 * - completed: 已完成（成功）
 * - failed: 执行失败
 * - cancelled: 已取消
 * - success: 执行成功（同completed）
 */
export type TaskStatus =
  | 'pending'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'success'

/**
 * 任务配置
 * 创建任务时的配置对象
 */
export interface TaskConfig {
  /** 源存储名称 */
  sourceStorage: string
  /** 源路径 */
  sourcePath: string
  /** 目标存储名称（可选，某些任务类型不需要） */
  destStorage?: string
  /** 目标路径（可选） */
  destPath?: string
  /** 任务选项 */
  options?: TaskOptions
}

/**
 * 任务选项
 * 控制任务执行行为的详细选项
 */
export interface TaskOptions {
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean
  /** 是否删除空的源目录 */
  deleteEmptySrcDirs?: boolean
  /** 是否忽略错误继续执行 */
  ignoreErrors?: boolean
  /** 是否只模拟执行（不实际传输） */
  dryRun?: boolean
  /** 最大递归深度 */
  maxDepth?: number
  /** 过滤规则 */
  filterRules?: string[]
}

/**
 * 调度配置
 * 控制任务的调度方式
 */
export interface ScheduleConfig {
  /** 调度模式 */
  mode: 'time' | 'interval' | 'start' | 'disposable'
  /** 时间配置 */
  time: {
    /** 间隔天数 */
    intervalDays: number
    /** 小时 */
    h: number
    /** 分钟 */
    m: number
    /** 秒 */
    s: number
  }
  /** 间隔秒数 */
  interval?: number
}

/**
 * 任务进度
 * 任务执行时的实时进度信息
 */
export interface TaskProgress {
  /** 完成百分比 */
  percent: number
  /** 已传输字节数 */
  transferredBytes: number
  /** 总字节数 */
  totalBytes: number
  /** 传输速度（字节/秒） */
  speed: number
  /** 预计剩余时间（秒） */
  eta: number
  /** 当前处理的文件 */
  currentFile?: string
  /** 已完成文件数 */
  completedFiles: number
  /** 总文件数 */
  totalFiles: number
}

/**
 * 任务结果
 * 任务执行完成后的结果
 */
export interface TaskResult {
  /** 是否成功 */
  success: boolean
  /** 传输的文件数 */
  transferredFiles: number
  /** 传输的字节数 */
  transferredBytes: number
  /** 错误数 */
  errors: number
  /** 执行耗时（毫秒） */
  duration: number
  /** 错误消息列表 */
  errorMessages?: string[]
}

/**
 * 任务历史记录
 * 已执行任务的记录
 */
export interface TaskHistory {
  /** 历史记录ID */
  id: string
  /** 关联的任务ID */
  taskId: string
  /** 任务名称 */
  taskName: string
  /** 任务类型 */
  type: TaskType
  /** 执行状态 */
  status: TaskStatus
  /** 开始时间 */
  startedAt: Date
  /** 完成时间 */
  completedAt: Date
  /** 执行结果 */
  result?: TaskResult
}

/**
 * 任务统计信息
 * 任务执行的整体统计
 */
export interface TaskStats {
  /** 总任务数 */
  totalTasks: number
  /** 等待中的任务数 */
  pendingTasks: number
  /** 运行中的任务数 */
  runningTasks: number
  /** 已完成的任务数 */
  completedTasks: number
  /** 失败的任务数 */
  failedTasks: number
  /** 已调度的任务数 */
  scheduledTasks: number
}