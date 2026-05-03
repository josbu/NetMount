import { RepositoryError, ErrorCode } from '../interfaces/IRepository'
import { logger } from '../../services/LoggerService'
import { nmConfig } from '../../services/ConfigService'
import { runTask } from '../../controller/task/runner'
import type { TaskEntity, TaskStatus, TaskResult, TaskStats } from '../../type/task/task'
import type { TaskListItem } from '../../type/config'

const taskLogger = logger.withContext('TaskRepository')

export interface TaskSchedulerLike {
  addTask(task: TaskListItem): Promise<void>
  cancelTask(taskName: string): void
}

let _taskScheduler: TaskSchedulerLike | null = null
export async function getTaskScheduler(): Promise<TaskSchedulerLike> {
  if (!_taskScheduler) {
    const { TaskScheduler } = await import('../../controller/task/scheduler')
    _taskScheduler = new TaskScheduler()
  }
  return _taskScheduler
}

export function taskListItemToEntity(task: TaskListItem): TaskEntity {
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

export async function executeTask(taskId: string): Promise<TaskResult> {
  const task = nmConfig.task.find(t => t.name === taskId)
  if (!task) {
    throw new RepositoryError('Task not found', ErrorCode.NOT_FOUND, 'TaskRepository')
  }

  taskLogger.info('Executing task', { taskId })
  const startTime = Date.now()

  try {
    const result = await runTask(task)
    const duration = Date.now() - startTime

    const taskResult: TaskResult = {
      success: !result.runInfo?.error,
      transferredFiles: 0,
      transferredBytes: 0,
      errors: result.runInfo?.error ? 1 : 0,
      duration,
      errorMessages: result.runInfo?.msg ? [result.runInfo.msg] : undefined,
    }

    taskLogger.info('Task execution completed', { taskId, success: taskResult.success, duration })
    return taskResult
  } catch (error) {
    const duration = Date.now() - startTime
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

export async function cancelTask(taskId: string): Promise<boolean> {
  const scheduler = await getTaskScheduler()
  scheduler.cancelTask(taskId)
  taskLogger.info('Task cancelled', { taskId })
  return true
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const task = nmConfig.task.find(t => t.name === taskId)
  return task ? (task.run.runId ? 'running' : 'pending') : 'pending'
}

export async function getPendingTasks(): Promise<TaskEntity[]> {
  return nmConfig.task
    .filter(t => !t.run.runId)
    .map(taskListItemToEntity)
}

export async function getRunningTasks(): Promise<TaskEntity[]> {
  return nmConfig.task
    .filter(t => t.run.runId)
    .map(taskListItemToEntity)
}

export async function getTaskStats(): Promise<TaskStats> {
  const tasks = nmConfig.task.map(taskListItemToEntity)
  return {
    totalTasks: tasks.length,
    pendingTasks: tasks.filter(t => !t.status || t.status === 'pending').length,
    runningTasks: tasks.filter(t => t.status === 'running').length,
    completedTasks: tasks.filter(t => t.status === 'completed' || t.status === 'success').length,
    failedTasks: tasks.filter(t => t.status === 'failed').length,
    scheduledTasks: tasks.filter(t => t.status === 'scheduled').length,
  }
}

export async function startScheduler(): Promise<void> {
  const scheduler = await getTaskScheduler()
  for (const task of nmConfig.task) {
    await scheduler.addTask(task)
  }
  taskLogger.info('Task scheduler started')
}
