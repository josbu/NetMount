/**
 * Task Controller - 任务操作控制器
 * 
 * 重构：调用 taskRepository，而不是直接操作 nmConfig
 * 保持向后兼容的导出接口
 */

import { taskRepository } from '../../repositories/task/TaskRepository'
import { TaskListItem } from '../../type/config'

// ==========================================
// 向后兼容的导出接口
// ==========================================

/**
 * 保存任务配置
 */
async function saveTask(taskInfo: TaskListItem): Promise<boolean> {
  return taskRepository.saveTaskConfig(taskInfo)
}

/**
 * 删除任务
 */
async function delTask(taskName: string): Promise<boolean> {
  return taskRepository.deleteTaskConfig(taskName)
}

/**
 * 启动任务调度器
 */
async function startTaskScheduler(): Promise<void> {
  await taskRepository.startScheduler()
}

/**
 * TaskScheduler 兼容对象
 * 用于需要 cancelTask 等方法的场景
 */
const taskScheduler = {
  cancelTask: (taskName: string) => {
    // 同步版本，直接从 Repository 获取 scheduler
    taskRepository.getScheduler().then(s => s.cancelTask(taskName))
  },
  addTask: async (task: TaskListItem) => {
    const scheduler = await taskRepository.getScheduler()
    await scheduler.addTask(task)
  },
  executeTask: async (taskId: string) => {
    return taskRepository.executeTask(taskId)
  },
}

// ==========================================
// 导出（向后兼容）
// ==========================================

export { saveTask, delTask, taskScheduler, startTaskScheduler }