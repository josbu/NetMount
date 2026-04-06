/**
 * TaskRepository - 任务数据访问层
 * 
 * 封装任务相关的数据访问操作
 * 当前实现：调用现有Service层
 */

import { BaseRepository } from '../base/BaseRepository'
import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'
import {
  saveTask as saveTaskService,
  delTask as delTaskService,
  taskScheduler,
  startTaskScheduler,
} from '../../controller/task/task'
import { runTask } from '../../controller/task/runner'
import { nmConfig } from '../../services/ConfigService'
import type {
  TaskEntity,
  TaskStatus,
  TaskResult,
  TaskStats,
} from '../../type/task/task'
import type { TaskListItem } from '../../type/config'

/**
 * TaskRepository 类
 */
export class TaskRepository extends BaseRepository<TaskEntity> {
  private taskLogger = logger.withContext('TaskRepository')

  constructor() {
    super({ enableCache: false })
  }

  /**
   * 获取所有任务
   */
  async getAll(): Promise<TaskEntity[]> {
    return nmConfig.task.map(task => this.taskListItemToEntity(task))
  }

  /**
   * 根据ID获取任务
   */
  async getById(id: string): Promise<TaskEntity | null> {
    const task = nmConfig.task.find(t => t.name === id)
    return task ? this.taskListItemToEntity(task) : null
  }

  /**
   * 创建任务
   */
  async create(entity: Partial<TaskEntity>): Promise<TaskEntity> {
    if (!entity.name || !entity.taskType || !entity.source || !entity.target) {
      throw new RepositoryError(
        'Missing required fields: name, taskType, source, or target',
        ErrorCode.INVALID_DATA,
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

    await saveTaskService(taskListItem)

    const task = await this.getById(entity.name)
    if (!task) {
      throw new RepositoryError(
        'Task created but not found',
        ErrorCode.UNKNOWN,
        'TaskRepository'
      )
    }

    this.notifyChange({
      type: 'create',
      id: task.id,
      newData: task,
      timestamp: new Date(),
    })

    this.taskLogger.info('Task created', { id: task.id })
    return task
  }

  /**
   * 更新任务
   *
   * 就地更新任务配置，保留运行时数据(runInfo)和调度状态
   */
  async update(id: string, entity: Partial<TaskEntity>): Promise<TaskEntity> {
    const oldTask = await this.getById(id)
    if (!oldTask) {
      throw new RepositoryError(`Task ${id} not found`, ErrorCode.NOT_FOUND, 'TaskRepository')
    }

    // 如果ID改变，需要特殊处理
    if (entity.name && entity.name !== id) {
      throw new RepositoryError(
        'Cannot change task name, please delete and recreate',
        ErrorCode.INVALID_DATA,
        'TaskRepository'
      )
    }

    // 找到原始配置
    const taskIndex = nmConfig.task.findIndex(t => t.name === id)
    if (taskIndex === -1) {
      throw new RepositoryError(
        'Task configuration not found',
        ErrorCode.NOT_FOUND,
        'TaskRepository'
      )
    }

    const oldTaskListItem = nmConfig.task[taskIndex]!

    // 构建更新的任务配置（保留未改变的字段）
    const updatedTaskListItem: TaskListItem = {
      name: id, // name 不变
      taskType: entity.taskType ?? oldTaskListItem.taskType,
      source: entity.source ?? oldTaskListItem.source,
      target: entity.target ?? oldTaskListItem.target,
      parameters: entity.parameters ?? oldTaskListItem.parameters,
      enable: entity.enable ?? oldTaskListItem.enable,
      // run配置：如果提供了新的run配置则合并
      run: entity.run
        ? { ...oldTaskListItem.run, ...entity.run }
        : oldTaskListItem.run,
      // 保留运行时信息（除非明确提供）
      runInfo: entity.runInfo ?? oldTaskListItem.runInfo,
    }

    // 保存更新后的配置
    nmConfig.task[taskIndex] = updatedTaskListItem
    await saveTaskService(updatedTaskListItem)

    // 转换回实体
    const newTask = this.taskListItemToEntity(updatedTaskListItem)

    // 如果状态被显式更新，使用更新后的状态
    if (entity.status) {
      newTask.status = entity.status
    }

    this.notifyChange({
      type: 'update',
      id,
      oldData: oldTask,
      newData: newTask,
      timestamp: new Date(),
    })

    this.taskLogger.info('Task updated', { id })
    return newTask
  }

  /**
   * 删除任务
   */
  async delete(id: string): Promise<boolean> {
    const oldTask = await this.getById(id)
    if (!oldTask) {
      return false
    }

    await delTaskService(id)

    this.notifyChange({
      type: 'delete',
      id,
      oldData: oldTask,
      timestamp: new Date(),
    })

    this.taskLogger.info('Task deleted', { id })
    return true
  }

  /**
   * 检查任务是否存在
   */
  async exists(id: string): Promise<boolean> {
    const task = await this.getById(id)
    return task !== null
  }

  // ==========================================
  // 任务操作方法
  // ==========================================

  /**
   * 执行任务
   */
  async executeTask(taskId: string): Promise<TaskResult> {
    const task = await this.getById(taskId)
    if (!task) {
      throw new RepositoryError('Task not found', ErrorCode.NOT_FOUND, 'TaskRepository')
    }

    this.taskLogger.info('Executing task', { taskId })

    const startTime = Date.now()
    await this.update(taskId, { status: 'running' })

    try {
      // 获取原始任务配置
      const taskListItem = nmConfig.task.find(t => t.name === taskId)
      if (!taskListItem) {
        throw new RepositoryError('Task configuration not found', ErrorCode.NOT_FOUND, 'TaskRepository')
      }

      // 执行实际任务
      const result = await runTask(taskListItem)

      const duration = Date.now() - startTime
      const taskResult: TaskResult = {
        success: !result.runInfo?.error,
        transferredFiles: 0, // 需要从实际执行结果获取
        transferredBytes: 0,
        errors: result.runInfo?.error ? 1 : 0,
        duration,
        errorMessages: result.runInfo?.msg ? [result.runInfo.msg] : undefined,
      }

      await this.update(taskId, {
        status: taskResult.success ? 'completed' : 'failed',
      })

      this.taskLogger.info('Task execution completed', { 
        taskId, 
        success: taskResult.success,
        duration: `${duration}ms`,
      })
      
      return taskResult
    } catch (error) {
      const duration = Date.now() - startTime
      await this.update(taskId, {
        status: 'failed',
      })

      this.taskLogger.error('Task execution failed', error as Error, { taskId, duration })
      
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
    await taskScheduler.cancelTask(taskId)
    await this.update(taskId, { status: 'cancelled' })
    this.taskLogger.info('Task cancelled', { taskId })
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
    await startTaskScheduler()
    this.taskLogger.info('Task scheduler started')
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    // 清理资源
    this.taskLogger.info('TaskRepository destroyed')
  }

  // ==========================================
  // 私有辅助方法
  // ==========================================

  /**
   * 将TaskListItem转换为TaskEntity
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
}

export const taskRepository = new TaskRepository()