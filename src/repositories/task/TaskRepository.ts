/**
 * TaskRepository - 任务数据访问层
 * 
 * 封装任务相关的数据访问操作
 * 重构：直接操作 nmConfig.task，不再依赖 Controller 层
 */

import { BaseRepository } from '../base/BaseRepository'
import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'
import { nmConfig, saveNmConfig } from '../../services/ConfigService'
import { runTask } from '../../controller/task/runner'
import type { TaskEntity, TaskStatus, TaskResult, TaskStats } from '../../type/task/task'
import type { TaskListItem } from '../../type/config'

const taskLogger = logger.withContext('TaskRepository')

// TaskScheduler 类型定义（从 scheduler.ts）
interface TaskSchedulerLike {
  addTask(task: TaskListItem): Promise<void>
  cancelTask(taskName: string): void
}

// 动态导入 TaskScheduler 避免循环依赖
let _taskScheduler: TaskSchedulerLike | null = null
async function getTaskScheduler(): Promise<TaskSchedulerLike> {
  if (!_taskScheduler) {
    const { TaskScheduler } = await import('../../controller/task/scheduler')
    _taskScheduler = new TaskScheduler()
  }
  return _taskScheduler
}

/**
 * TaskRepository 类
 */
export class TaskRepository extends BaseRepository<TaskEntity> {
  constructor() {
    super({ enableCache: false })
  }

  /**
   * 将 TaskListItem 转换为 TaskEntity
   */
  private taskListItemToEntity(task: TaskListItem): TaskEntity {
    return {
      id: task.name,
      name: task.name,
      taskType: task.taskType,
      source: task.source,
      target: task.target,
      parameters: task.parameters,
      enable: task.enable,
      run: {
        ...task.run,
        mode: task.run.mode as 'time' | 'interval' | 'start' | 'disposable',
      },
      runInfo: task.runInfo,
      status: task.run.runId ? 'running' : 'pending',
    }
  }

  // ==========================================
  // CRUD 方法
  // ==========================================

  async getAll(): Promise<TaskEntity[]> {
    return nmConfig.task.map(task => this.taskListItemToEntity(task))
  }

  async getById(id: string): Promise<TaskEntity | null> {
    const task = nmConfig.task.find(t => t.name === id)
    return task ? this.taskListItemToEntity(task) : null
  }

  async create(entity: Partial<TaskEntity>): Promise<TaskEntity> {
    if (!entity.name || !entity.taskType || !entity.source || !entity.target) {
      throw new RepositoryError(
        'Missing required fields: name, taskType, source, or target',
        ErrorCode.INVALID_DATA,
        'TaskRepository'
      )
    }

    // 检查是否已存在同名任务
    if (nmConfig.task.some(t => t.name === entity.name)) {
      throw new RepositoryError(
        'Task with this name already exists',
        ErrorCode.ALREADY_EXISTS,
        'TaskRepository'
      )
    }

    const taskListItem: TaskListItem = {
      name: entity.name,
      taskType: entity.taskType,
      source: entity.source,
      target: entity.target,
      parameters: entity.parameters,
      enable: entity.enable ?? true,
      run: entity.run ?? {
        mode: 'start',
        time: { intervalDays: 0, h: 0, m: 0, s: 0 },
      },
      runInfo: entity.runInfo ?? {},
    }

    nmConfig.task.push(taskListItem)
    await saveNmConfig()

    // 如果不是立即执行模式，添加到调度器
    if (taskListItem.run.mode !== 'start') {
      const scheduler = await getTaskScheduler()
      await scheduler.addTask(taskListItem)
    }

    const task = this.taskListItemToEntity(taskListItem)
    this.notifyChange({ type: 'create', id: task.id, newData: task, timestamp: new Date() })
    taskLogger.info('Task created', { id: task.id })
    return task
  }

  async update(id: string, entity: Partial<TaskEntity>): Promise<TaskEntity> {
    const oldTask = await this.getById(id)
    if (!oldTask) {
      throw new RepositoryError(`Task ${id} not found`, ErrorCode.NOT_FOUND, 'TaskRepository')
    }

    // 不允许更改任务名称
    if (entity.name && entity.name !== id) {
      throw new RepositoryError(
        'Cannot change task name, please delete and recreate',
        ErrorCode.INVALID_DATA,
        'TaskRepository'
      )
    }

    const taskIndex = nmConfig.task.findIndex(t => t.name === id)
    if (taskIndex === -1) {
      throw new RepositoryError('Task configuration not found', ErrorCode.NOT_FOUND, 'TaskRepository')
    }

    const oldTaskListItem = nmConfig.task[taskIndex]!

    // 构建更新后的配置
    const updatedTaskListItem: TaskListItem = {
      name: id,
      taskType: entity.taskType ?? oldTaskListItem.taskType,
      source: entity.source ?? oldTaskListItem.source,
      target: entity.target ?? oldTaskListItem.target,
      parameters: entity.parameters ?? oldTaskListItem.parameters,
      enable: entity.enable ?? oldTaskListItem.enable,
      run: entity.run ? { ...oldTaskListItem.run, ...entity.run } : oldTaskListItem.run,
      runInfo: entity.runInfo ?? oldTaskListItem.runInfo,
    }

    // 如果有运行ID，取消旧任务
    if (updatedTaskListItem.run.runId) {
      const scheduler = await getTaskScheduler()
      scheduler.cancelTask(id)
    }

    nmConfig.task[taskIndex] = updatedTaskListItem
    await saveNmConfig()

    // 如果调度模式变更，更新调度器
    if (updatedTaskListItem.run.mode !== 'start') {
      const scheduler = await getTaskScheduler()
      await scheduler.addTask(updatedTaskListItem)
    }

    const newTask = this.taskListItemToEntity(updatedTaskListItem)
    if (entity.status) newTask.status = entity.status

    this.notifyChange({ type: 'update', id, oldData: oldTask, newData: newTask, timestamp: new Date() })
    taskLogger.info('Task updated', { id })
    return newTask
  }

  async delete(id: string): Promise<boolean> {
    const oldTask = await this.getById(id)
    if (!oldTask) return false

    // 取消调度
    const scheduler = await getTaskScheduler()
    scheduler.cancelTask(id)

    // 从配置中删除
    nmConfig.task = nmConfig.task.filter(t => t.name !== id)
    await saveNmConfig()

    this.notifyChange({ type: 'delete', id, oldData: oldTask, timestamp: new Date() })
    taskLogger.info('Task deleted', { id })
    return true
  }

  async exists(id: string): Promise<boolean> {
    return nmConfig.task.some(t => t.name === id)
  }

  // ==========================================
  // 业务方法
  // ==========================================

  /**
   * 执行任务
   */
  async executeTask(taskId: string): Promise<TaskResult> {
    const task = await this.getById(taskId)
    if (!task) {
      throw new RepositoryError('Task not found', ErrorCode.NOT_FOUND, 'TaskRepository')
    }

    taskLogger.info('Executing task', { taskId })
    const startTime = Date.now()

    // 更新状态为 running
    await this.update(taskId, { status: 'running' })

    try {
      const taskListItem = nmConfig.task.find(t => t.name === taskId)
      if (!taskListItem) {
        throw new RepositoryError('Task configuration not found', ErrorCode.NOT_FOUND, 'TaskRepository')
      }

      const result = await runTask(taskListItem)
      const duration = Date.now() - startTime

      const taskResult: TaskResult = {
        success: !result.runInfo?.error,
        transferredFiles: 0,
        transferredBytes: 0,
        errors: result.runInfo?.error ? 1 : 0,
        duration,
        errorMessages: result.runInfo?.msg ? [result.runInfo.msg] : undefined,
      }

      await this.update(taskId, { status: taskResult.success ? 'completed' : 'failed' })
      taskLogger.info('Task execution completed', { taskId, success: taskResult.success, duration })

      return taskResult
    } catch (error) {
      const duration = Date.now() - startTime
      await this.update(taskId, { status: 'failed' })
      taskLogger.error('Task execution failed', error as Error, { taskId, duration })

      return {
        success: false,
        transferredFiles: 0,
        transferredBytes: 0,
        errors: 1,
        duration,
        errorMessages: [error instanceof Error ? error.message : String(error)],
      }
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const scheduler = await getTaskScheduler()
    scheduler.cancelTask(taskId)
    await this.update(taskId, { status: 'cancelled' })
    taskLogger.info('Task cancelled', { taskId })
    return true
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const task = await this.getById(taskId)
    return task?.status || 'pending'
  }

  /**
   * 获取待执行任务
   */
  async getPendingTasks(): Promise<TaskEntity[]> {
    const tasks = await this.getAll()
    return tasks.filter(t => !t.status || t.status === 'pending')
  }

  /**
   * 获取运行中的任务
   */
  async getRunningTasks(): Promise<TaskEntity[]> {
    const tasks = await this.getAll()
    return tasks.filter(t => t.status === 'running')
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(): Promise<TaskStats> {
    const tasks = await this.getAll()
    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => !t.status || t.status === 'pending').length,
      runningTasks: tasks.filter(t => t.status === 'running').length,
      completedTasks: tasks.filter(t => t.status === 'completed' || t.status === 'success').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      scheduledTasks: tasks.filter(t => t.status === 'scheduled').length,
    }
  }

  /**
   * 启动任务调度器
   */
  async startScheduler(): Promise<void> {
    for (const task of nmConfig.task) {
      const scheduler = await getTaskScheduler()
      await scheduler.addTask(task)
    }
    taskLogger.info('Task scheduler started')
  }

  // ==========================================
  // 公开 API（供 Controller 使用）
  // ==========================================

  /**
   * 保存任务配置（兼容旧接口）
   */
  async saveTaskConfig(taskInfo: TaskListItem): Promise<boolean> {
    const existingIndex = nmConfig.task.findIndex(task => task.name === taskInfo.name)

    if (existingIndex !== -1) {
      // 存在同名任务，更新
      if (taskInfo.run.runId) {
        const scheduler = await getTaskScheduler()
        scheduler.cancelTask(taskInfo.name)
      }
      nmConfig.task[existingIndex] = taskInfo
    } else {
      // 新任务，添加
      nmConfig.task.push(taskInfo)
    }

    if (taskInfo.run.mode !== 'start') {
      const scheduler = await getTaskScheduler()
      await scheduler.addTask(taskInfo)
    }

    await saveNmConfig()
    return true
  }

  /**
   * 删除任务配置（兼容旧接口）
   */
  async deleteTaskConfig(taskName: string): Promise<boolean> {
    const scheduler = await getTaskScheduler()
    scheduler.cancelTask(taskName)
    nmConfig.task = nmConfig.task.filter(task => task.name !== taskName)
    await saveNmConfig()
    return true
  }

  /**
   * 获取 TaskScheduler 实例（兼容旧接口）
   */
  async getScheduler(): Promise<TaskSchedulerLike> {
    return getTaskScheduler()
  }
}

export const taskRepository = new TaskRepository()