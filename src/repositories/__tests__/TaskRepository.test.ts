/**
 * TaskRepository 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TaskRepository } from '../task/TaskRepository'

// Mock 依赖模块
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../../controller/task/task', () => ({
  saveTask: vi.fn(),
  delTask: vi.fn(),
  taskScheduler: {
    cancelTask: vi.fn(),
  },
  startTaskScheduler: vi.fn(),
}))

vi.mock('../../services/ConfigService', () => ({
  nmConfig: {
    task: [],
  },
}))

describe('TaskRepository', () => {
  let repository: TaskRepository

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
    repository = new TaskRepository()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getAll', () => {
    it('should return all tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 'storage1', path: '/path1' },
          target: { storageName: 'storage2', path: '/path2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
        {
          name: 'task2',
          taskType: 'move',
          source: { storageName: 'storage2', path: '/path2' },
          target: { storageName: 'storage3', path: '/path3' },
          enable: true,
          run: { mode: 'interval', time: { intervalDays: 1, h: 0, m: 0, s: 0 }, interval: 3600 },
          runInfo: {},
        },
      ]

      const result = await repository.getAll()

      expect(result.length).toBe(2)
      expect(result[0]).toMatchObject({
        id: 'task1',
        name: 'task1',
        taskType: 'copy',
      })
    })

    it('should return empty array when no tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      const result = await repository.getAll()

      expect(result).toHaveLength(0)
    })
  })

  describe('create', () => {
    it('should create task successfully', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const { saveTask } = await import('../../controller/task/task')

      nmConfig.task = []
      vi.mocked(saveTask).mockImplementation((task) => {
        nmConfig.task.push(task)
        return true
      })

      const result = await repository.create({
        name: 'new-task',
        taskType: 'copy',
        source: { storageName: 's1', path: '/p1' },
        target: { storageName: 's2', path: '/p2' },
      })

      expect(result.name).toBe('new-task')
      expect(result.status).toBe('pending')
      expect(saveTask).toHaveBeenCalled()
    })

    it('should throw error for missing required fields', async () => {
      await expect(repository.create({ name: 'test' } as any)).rejects.toThrow(
        'Missing required fields'
      )
    })
  })

  describe('getById', () => {
    it('should return task by id', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.getById('task1')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('task1')
    })

    it('should return null for non-existent task', async () => {
      const result = await repository.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const mockTask = {
        name: 'test-task',
        taskType: 'copy',
        source: { storageName: 's1', path: '/p1' },
        target: { storageName: 's2', path: '/p2' },
        enable: true,
        run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
        runInfo: {},
      }

      nmConfig.task = [mockTask]

      const result = await repository.executeTask('test-task')

      expect(result.success).toBe(true)
      expect(result.transferredFiles).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should throw error if task not found', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      await expect(repository.executeTask('non-existent')).rejects.toThrow('Task not found')
    })
  })

  describe('cancelTask', () => {
    it('should cancel task successfully', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const { taskScheduler } = await import('../../controller/task/task')

      nmConfig.task = [
        {
          name: 'running-task',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
      ]

      const result = await repository.cancelTask('running-task')

      expect(result).toBe(true)
      expect(taskScheduler.cancelTask).toHaveBeenCalledWith('running-task')
    })
  })

  describe('getTaskStats', () => {
    it('should return correct statistics', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
        {
          name: 'task2',
          taskType: 'move',
          source: { storageName: 's2', path: '/p2' },
          target: { storageName: 's3', path: '/p3' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
        {
          name: 'task3',
          taskType: 'sync',
          source: { storageName: 's3', path: '/p3' },
          target: { storageName: 's4', path: '/p4' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: { error: false },
        },
      ]

      const stats = await repository.getTaskStats()

      expect(stats.totalTasks).toBe(3)
      expect(stats.runningTasks).toBe(1)
    })

    it('should handle empty task list', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      const stats = await repository.getTaskStats()

      expect(stats.totalTasks).toBe(0)
      expect(stats.pendingTasks).toBe(0)
    })
  })

  describe('update', () => {
    it('should update task in place', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const { saveTask } = await import('../../controller/task/task')

      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: { error: false, msg: 'Previous run' },
        },
      ]

      vi.mocked(saveTask).mockImplementation((task) => {
        const index = nmConfig.task.findIndex(t => t.name === task.name)
        if (index !== -1) {
          nmConfig.task[index] = task
        }
        return true
      })

      const result = await repository.update('task1', {
        taskType: 'sync',
        source: { storageName: 's3', path: '/p3' },
      })

      expect(result.taskType).toBe('sync')
      expect(result.source.storageName).toBe('s3')
      expect(result.source.path).toBe('/p3')
      // runInfo should be preserved
      expect(result.runInfo).toEqual({ error: false, msg: 'Previous run' })
      expect(saveTask).toHaveBeenCalled()
    })

    it('should throw error when trying to change task name', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      await expect(repository.update('task1', { name: 'new-name' })).rejects.toThrow(
        'Cannot change task name'
      )
    })

    it('should throw error for non-existent task', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      await expect(repository.update('non-existent', { taskType: 'sync' })).rejects.toThrow('not found')
    })

    it('should merge run configuration', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const { saveTask } = await import('../../controller/task/task')

      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      vi.mocked(saveTask).mockImplementation((task) => {
        const index = nmConfig.task.findIndex(t => t.name === task.name)
        if (index !== -1) {
          nmConfig.task[index] = task
        }
        return true
      })

      const result = await repository.update('task1', {
        run: { mode: 'interval', time: { intervalDays: 1, h: 0, m: 0, s: 0 } },
      })

      expect(result.run.mode).toBe('interval')
      // time should be merged
      expect(result.run.time.intervalDays).toBe(1)
    })
  })

  describe('getRunningTasks', () => {
    it('should return only running tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
        {
          name: 'task2',
          taskType: 'move',
          source: { storageName: 's2', path: '/p2' },
          target: { storageName: 's3', path: '/p3' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
        {
          name: 'task3',
          taskType: 'sync',
          source: { storageName: 's3', path: '/p3' },
          target: { storageName: 's4', path: '/p4' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 456 },
          runInfo: {},
        },
      ]

      const result = await repository.getRunningTasks()

      expect(result).toHaveLength(2)
      expect(result[0]!.name).toBe('task1')
      expect(result[1]!.name).toBe('task3')
    })

    it('should return empty array when no running tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.getRunningTasks()

      expect(result).toHaveLength(0)
    })
  })

  describe('startScheduler', () => {
    it('should start task scheduler', async () => {
      const { startTaskScheduler } = await import('../../controller/task/task')

      await repository.startScheduler()

      expect(startTaskScheduler).toHaveBeenCalled()
    })
  })
})
