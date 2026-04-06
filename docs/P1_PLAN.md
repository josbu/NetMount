# P1 中优先级实施计划

**计划周期**：2周（10个工作日）  
**开始时间**：2026-03-27  
**目标**：完善Repository层、性能优化  
**预期成果**：架构更完善、性能显著提升

---

## 一、总体目标

### 核心目标
1. **完善Repository层**：新增MountRepository和TaskRepository
2. **性能优化**：大文件传输优化、缓存策略优化
3. **测试补充**：Repository层测试覆盖率达到30%+

### 成功标准
- ✅ 2个新Repository实现并通过测试
- ✅ 大文件传输速度提升50%+
- ✅ 缓存命中率提升至80%+
- ✅ Repository层测试覆盖率≥30%
- ✅ Lint零错误零警告

---

## 二、任务分解与时间估算

### 第一周：Repository层扩展（5天）

#### Day 1-2：MountRepository实现（2天）

**Day 1：设计与基础实现**
- **上午（4h）**
  - [ ] 设计MountRepository接口（0.5h）
  - [ ] 定义MountEntity类型（0.5h）
  - [ ] 实现BaseRepository继承（1h）
  - [ ] 实现基础CRUD方法（2h）

- **下午（4h）**
  - [ ] 实现挂载相关方法（2h）
    - `mountStorage()` - 挂载存储
    - `unmountStorage()` - 卸载挂载
    - `getMountStatus()` - 获取挂载状态
  - [ ] 实现挂载列表管理（1h）
    - `getActiveMounts()` - 获取活跃挂载
    - `getMountsByStorage()` - 按存储过滤
  - [ ] 编写单元测试（1h）

**Day 2：高级功能与集成**
- **上午（4h）**
  - [ ] 实现自动挂载逻辑（2h）
    - 启动时自动挂载
    - 挂载失败重试
    - 挂载状态监控
  - [ ] 实现挂载点管理（1h）
    - `validateMountPoint()` - 验证挂载点
    - `cleanupStaleMounts()` - 清理失效挂载
  - [ ] 集成到Service层（1h）

- **下午（4h）**
  - [ ] 编写集成测试（2h）
  - [ ] 更新ARCHITECTURE.md文档（1h）
  - [ ] Code Review与重构（1h）

**交付物**：
- `src/repositories/mount/MountRepository.ts` (~250行)
- `src/repositories/__tests__/MountRepository.test.ts` (~150行)
- 文档更新

---

#### Day 3-4：TaskRepository实现（2天）

**Day 3：设计与基础实现**
- **上午（4h）**
  - [ ] 设计TaskRepository接口（0.5h）
  - [ ] 定义TaskEntity类型（0.5h）
  - [ ] 实现BaseRepository继承（1h）
  - [ ] 实现基础CRUD方法（2h）

- **下午（4h）**
  - [ ] 实现任务执行方法（2h）
    - `executeTask()` - 执行任务
    - `cancelTask()` - 取消任务
    - `getTaskStatus()` - 获取任务状态
  - [ ] 实现任务调度（1h）
    - `scheduleTask()` - 调度任务
    - `getScheduledTasks()` - 获取调度任务
  - [ ] 编写单元测试（1h）

**Day 4：高级功能与集成**
- **上午（4h）**
  - [ ] 实现任务队列管理（2h）
    - 任务优先级
    - 任务依赖
    - 并发控制
  - [ ] 实现任务历史记录（1h）
    - `getTaskHistory()` - 获取历史
    - `cleanOldHistory()` - 清理旧历史
  - [ ] 集成到Controller层（1h）

- **下午（4h）**
  - [ ] 编写集成测试（2h）
  - [ ] 更新架构文档（1h）
  - [ ] Code Review与重构（1h）

**交付物**：
- `src/repositories/task/TaskRepository.ts` (~280行)
- `src/repositories/__tests__/TaskRepository.test.ts` (~180行)
- 文档更新

---

#### Day 5：Repository层测试与文档（1天）

- **上午（4h）**
  - [ ] 补充Repository层单元测试（2h）
    - ConfigRepository测试补充
    - StorageRepository测试补充
  - [ ] 编写Repository层集成测试（2h）
    - 端到端测试流程
    - Mock Tauri invoke

- **下午（4h）**
  - [ ] 完善Repository层文档（2h）
    - API文档（JSDoc）
    - 使用示例
  - [ ] 性能基准测试（2h）
    - 响应时间测试
    - 缓存命中率测试

**交付物**：
- Repository层测试覆盖率≥30%
- 完整API文档
- 性能基准报告

---

### 第二周：性能优化（5天）

#### Day 6-7：大文件传输优化（2天）

**Day 6：传输机制优化**
- **上午（4h）**
  - [ ] 分析当前传输瓶颈（1h）
    - Profile现有代码
    - 识别性能热点
  - [ ] 实现分块传输（3h）
    ```typescript
    // src/services/storage/TransferService.ts
    interface ChunkTransfer {
      chunkSize: number // 5MB
      parallelChunks: number // 3
      progressCallback: (progress: number) => void
    }
    ```

- **下午（4h）**
  - [ ] 实现断点续传（2h）
    - 文件分片记录
    - 传输进度持久化
    - 断点恢复逻辑
  - [ ] 实现传输队列（2h）
    - 并发控制
    - 优先级队列
    - 失败重试

**Day 7：传输性能测试**
- **上午（4h）**
  - [ ] 实现传输监控（2h）
    - 实时速度统计
    - ETA计算
    - 资源占用监控
  - [ ] 编写传输测试（2h）
    - 小文件测试（<10MB）
    - 中文件测试（10-100MB）
    - 大文件测试（>100MB）

- **下午（4h）**
  - [ ] 性能对比测试（2h）
    - 优化前后对比
    - 不同大小文件测试
    - 并发传输测试
  - [ ] 优化调整（2h）
    - 调整chunk大小
    - 调整并发数
    - 内存占用优化

**预期优化效果**：
- 小文件传输速度提升：20-30%
- 大文件传输速度提升：50-80%
- 支持断点续传
- 内存占用减少40%

**交付物**：
- `src/services/storage/ChunkTransferService.ts` (~300行)
- `src/utils/transfer/chunkManager.ts` (~150行)
- 性能测试报告

---

#### Day 8-9：缓存策略优化（2天）

**Day 8：缓存架构设计**
- **上午（4h）**
  - [ ] 设计多级缓存架构（2h）
    ```
    L1: 内存缓存（热点数据）- 1分钟
    L2: 本地缓存（常用数据）- 10分钟
    L3: 持久化缓存（配置数据）- 1小时
    ```
  - [ ] 实现CacheManager（2h）
    ```typescript
    class CacheManager {
      private l1Cache: Map<string, CacheEntry>
      private l2Cache: LocalStorageCache
      private l3Cache: FileCache
      
      get<T>(key: string, level: CacheLevel): T | null
      set<T>(key: string, value: T, ttl: number, level: CacheLevel): void
      invalidate(pattern: string): void
    }
    ```

- **下午（4h）**
  - [ ] 实现智能缓存策略（2h）
    - LRU淘汰算法
    - 缓存预热
    - 缓存降级
  - [ ] 实现缓存监控（2h）
    - 命中率统计
    - 缓存大小监控
    - 过期清理

**Day 9：缓存应用与优化**
- **上午（4h）**
  - [ ] 应用到Repository层（2h）
    - ConfigRepository缓存优化
    - StorageRepository缓存优化
    - MountRepository缓存优化
  - [ ] 应用到Service层（2h）
    - StorageManager缓存
    - FileManager缓存
    - TransferService缓存

- **下午（4h）**
  - [ ] 缓存性能测试（2h）
    - 命中率测试
    - 响应时间测试
    - 内存占用测试
  - [ ] 缓存优化调整（2h）
    - TTL调整
    - 缓存大小限制
    - 淘汰策略优化

**预期优化效果**：
- 缓存命中率：60% → 85%
- 平均响应时间：降低50%
- 内存占用：控制在100MB以内

**交付物**：
- `src/utils/cache/CacheManager.ts` (~250行)
- `src/utils/cache/CacheLevel.ts` (~100行)
- 缓存性能报告

---

#### Day 10：集成测试与文档（1天）

- **上午（4h）**
  - [ ] 端到端性能测试（2h）
    - 完整业务流程测试
    - 性能回归测试
    - 压力测试
  - [ ] 编写性能基准文档（2h）
    - 性能指标定义
    - 测试方法说明
    - 优化前后对比

- **下午（4h）**
  - [ ] 更新架构文档（2h）
    - Repository层完整说明
    - 性能优化方案
    - 最佳实践
  - [ ] 编写迁移指南（2h）
    - 如何使用新Repository
    - 如何使用缓存API
    - 性能优化建议

**交付物**：
- 完整性能测试报告
- 更新的架构文档
- 最佳实践指南

---

## 三、技术方案详细设计

### 3.1 MountRepository 设计

#### 接口定义
```typescript
// src/repositories/interfaces/IMountRepository.ts
export interface IMountRepository extends IRepository<MountEntity> {
  // 挂载操作
  mountStorage(storageName: string, mountPoint: string, options?: MountOptions): Promise<MountEntity>
  unmountStorage(mountId: string): Promise<boolean>
  getMountStatus(mountId: string): Promise<MountStatus>
  
  // 挂载列表
  getActiveMounts(): Promise<MountEntity[]>
  getMountsByStorage(storageName: string): Promise<MountEntity[]>
  
  // 挂载点管理
  validateMountPoint(mountPoint: string): Promise<boolean>
  cleanupStaleMounts(): Promise<number>
  
  // 自动挂载
  enableAutoMount(storageName: string): Promise<void>
  disableAutoMount(storageName: string): Promise<void>
}

export interface MountEntity {
  id: string
  storageName: string
  mountPoint: string
  status: 'mounting' | 'mounted' | 'error' | 'unmounted'
  createdAt: Date
  options?: MountOptions
}

export interface MountOptions {
  readonly?: boolean
  allowOther?: boolean
  vfsCacheMode?: 'off' | 'full' | 'writes'
  bufferSize?: string // '16M'
}
```

#### 实现要点
```typescript
// src/repositories/mount/MountRepository.ts
export class MountRepository extends BaseRepository<MountEntity> {
  // 重写基类方法
  async getAll(): Promise<MountEntity[]> {
    return this.invokeCommand<MountEntity[]>('get_mount_list')
  }
  
  // 挂载存储
  async mountStorage(
    storageName: string,
    mountPoint: string,
    options?: MountOptions
  ): Promise<MountEntity> {
    // 1. 验证挂载点
    const isValid = await this.validateMountPoint(mountPoint)
    if (!isValid) {
      throw new RepositoryError('Invalid mount point', ErrorCode.INVALID_DATA)
    }
    
    // 2. 执行挂载
    await this.invokeCommand('mount_storage', {
      storageName,
      mountPoint,
      options
    })
    
    // 3. 获取挂载状态
    const mount = await this.getByMountPoint(mountPoint)
    
    // 4. 触发变更事件
    this.notifyChange({
      type: 'create',
      id: mount.id,
      newData: mount,
      timestamp: new Date()
    })
    
    return mount
  }
  
  // 清理失效挂载
  async cleanupStaleMounts(): Promise<number> {
    const mounts = await this.getAll()
    let cleaned = 0
    
    for (const mount of mounts) {
      if (mount.status === 'error' || mount.status === 'unmounted') {
        await this.delete(mount.id)
        cleaned++
      }
    }
    
    return cleaned
  }
}
```

---

### 3.2 TaskRepository 设计

#### 接口定义
```typescript
// src/repositories/interfaces/ITaskRepository.ts
export interface ITaskRepository extends IRepository<TaskEntity> {
  // 任务执行
  executeTask(taskId: string): Promise<TaskResult>
  cancelTask(taskId: string): Promise<boolean>
  getTaskStatus(taskId: string): Promise<TaskStatus>
  
  // 任务调度
  scheduleTask(task: Partial<TaskEntity>, schedule: ScheduleConfig): Promise<TaskEntity>
  getScheduledTasks(): Promise<TaskEntity[]>
  
  // 任务历史
  getTaskHistory(limit?: number): Promise<TaskHistory[]>
  cleanOldHistory(beforeDays: number): Promise<number>
  
  // 任务队列
  getPendingTasks(): Promise<TaskEntity[]>
  getNextTask(): Promise<TaskEntity | null>
  updateTaskPriority(taskId: string, priority: number): Promise<void>
}

export interface TaskEntity {
  id: string
  name: string
  type: 'copy' | 'move' | 'sync' | 'delete'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: number // 1-10, 10最高
  config: TaskConfig
  schedule?: ScheduleConfig
  progress?: TaskProgress
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface ScheduleConfig {
  mode: 'once' | 'interval' | 'cron'
  time?: Date
  interval?: number // 秒
  cron?: string
}
```

#### 实现要点
```typescript
// src/repositories/task/TaskRepository.ts
export class TaskRepository extends BaseRepository<TaskEntity> {
  // 执行任务
  async executeTask(taskId: string): Promise<TaskResult> {
    const task = await this.getById(taskId)
    if (!task) {
      throw new RepositoryError('Task not found', ErrorCode.NOT_FOUND)
    }
    
    // 更新状态
    await this.update(taskId, {
      status: 'running',
      startedAt: new Date()
    })
    
    try {
      // 调用任务执行器
      const result = await this.invokeCommand<TaskResult>('execute_task', {
        taskId,
        config: task.config
      })
      
      // 更新完成状态
      await this.update(taskId, {
        status: 'completed',
        completedAt: new Date(),
        progress: { percent: 100 }
      })
      
      return result
    } catch (error) {
      // 更新失败状态
      await this.update(taskId, {
        status: 'failed',
        completedAt: new Date()
      })
      throw error
    }
  }
  
  // 获取下一个待执行任务
  async getNextTask(): Promise<TaskEntity | null> {
    const pending = await this.getPendingTasks()
    
    // 按优先级排序
    pending.sort((a, b) => b.priority - a.priority)
    
    return pending[0] || null
  }
}
```

---

### 3.3 大文件传输优化

#### 分块传输设计
```typescript
// src/services/storage/ChunkTransferService.ts
export class ChunkTransferService {
  private readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly MAX_PARALLEL_CHUNKS = 3
  
  async transferLargeFile(
    source: string,
    destination: string,
    fileSize: number,
    options?: TransferOptions
  ): Promise<TransferResult> {
    const chunkSize = options?.chunkSize || this.DEFAULT_CHUNK_SIZE
    const totalChunks = Math.ceil(fileSize / chunkSize)
    
    // 创建传输任务
    const transferId = await this.createTransferTask({
      source,
      destination,
      fileSize,
      chunkSize,
      totalChunks
    })
    
    try {
      // 分块传输
      for (let i = 0; i < totalChunks; i++) {
        await this.transferChunk(transferId, i, {
          onProgress: (progress) => {
            options?.onProgress?.({
              chunk: i,
              total: totalChunks,
              percent: (i / totalChunks) * 100
            })
          }
        })
      }
      
      // 合并文件块
      await this.mergeChunks(transferId)
      
      return { success: true, transferId }
    } catch (error) {
      // 记录失败位置，支持断点续传
      await this.recordFailure(transferId, error)
      throw error
    }
  }
  
  // 断点续传
  async resumeTransfer(transferId: string): Promise<TransferResult> {
    const task = await this.getTransferTask(transferId)
    const completedChunks = await this.getCompletedChunks(transferId)
    
    // 从断点继续
    for (let i = completedChunks; i < task.totalChunks; i++) {
      await this.transferChunk(transferId, i)
    }
    
    await this.mergeChunks(transferId)
    return { success: true, transferId }
  }
}
```

---

### 3.4 缓存策略设计

#### 多级缓存架构
```typescript
// src/utils/cache/CacheManager.ts
export class CacheManager {
  private l1Cache: Map<string, CacheEntry> = new Map()
  private l2Cache: LocalStorageCache
  private l3Cache: FileCache
  
  private readonly MAX_L1_SIZE = 100 // 最多100个条目
  private readonly MAX_L2_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly MAX_L3_SIZE = 100 * 1024 * 1024 // 100MB
  
  async get<T>(key: string): Promise<T | null> {
    // L1缓存
    const l1Entry = this.l1Cache.get(key)
    if (l1Entry && !this.isExpired(l1Entry)) {
      l1Entry.lastAccess = Date.now()
      return l1Entry.value as T
    }
    
    // L2缓存
    const l2Entry = await this.l2Cache.get(key)
    if (l2Entry && !this.isExpired(l2Entry)) {
      // 提升到L1
      this.setL1(key, l2Entry.value, l2Entry.ttl)
      return l2Entry.value as T
    }
    
    // L3缓存
    const l3Entry = await this.l3Cache.get(key)
    if (l3Entry && !this.isExpired(l3Entry)) {
      // 提升到L1和L2
      this.setL1(key, l3Entry.value, l3Entry.ttl)
      await this.l2Cache.set(key, l3Entry.value, l3Entry.ttl)
      return l3Entry.value as T
    }
    
    return null
  }
  
  async set<T>(
    key: string,
    value: T,
    ttl: number,
    level: CacheLevel = 'L1'
  ): Promise<void> {
    const entry: CacheEntry = {
      value,
      ttl,
      createdAt: Date.now(),
      lastAccess: Date.now()
    }
    
    switch (level) {
      case 'L1':
        this.setL1(key, value, ttl)
        break
      case 'L2':
        await this.l2Cache.set(key, value, ttl)
        break
      case 'L3':
        await this.l3Cache.set(key, value, ttl)
        break
      case 'ALL':
        this.setL1(key, value, ttl)
        await this.l2Cache.set(key, value, ttl)
        await this.l3Cache.set(key, value, ttl)
        break
    }
  }
  
  // LRU淘汰
  private evictL1(): void {
    if (this.l1Cache.size < this.MAX_L1_SIZE) return
    
    // 找到最久未访问的条目
    let oldest: { key: string; lastAccess: number } | null = null
    for (const [key, entry] of this.l1Cache.entries()) {
      if (!oldest || entry.lastAccess < oldest.lastAccess) {
        oldest = { key, lastAccess: entry.lastAccess }
      }
    }
    
    if (oldest) {
      this.l1Cache.delete(oldest.key)
    }
  }
}
```

---

## 四、验收标准

### 4.1 功能验收

| 功能模块 | 验收标准 | 测试方法 |
|---------|---------|---------|
| **MountRepository** | ✅ 所有CRUD方法正常工作<br>✅ 挂载/卸载功能正常<br>✅ 自动挂载生效 | 单元测试 + 集成测试 |
| **TaskRepository** | ✅ 任务执行正常<br>✅ 任务调度生效<br>✅ 历史记录可查询单元测试 + 集成测试 |
| **大文件传输** | ✅ 支持>1GB文件传输<br>✅ 断点续传功能正常<br>✅ 速度提升≥50% | 性能测试 |
| **缓存优化** | ✅ 命中率≥85%<br>✅ 响应时间降低50%<br>✅ 内存占用<100MB | 性能测试 |

### 4.2 性能指标

| 性能指标 | 优化前 | 目标 | 测试方法 |
|---------|--------|------|---------|
| **小文件传输速度** | 基准值 | +20-30% | 对比测试 |
| **大文件传输速度** | 基准值 | +50-80% | 对比测试 |
| **缓存命中率** | 60% | 85% | 监控统计 |
| **平均响应时间** | 基准值 | -50% | 压测 |
| **内存占用** | 基准值 | <100MB | 监控 |

### 4.3 代码质量

| 质量指标 | 目标 | 验证方法 |
|---------|------|---------|
| **ESLint** | 0 errors, 0 warnings | `npm run lint` |
| **TypeScript** | 0 errors | `npm run typecheck` |
| **测试覆盖率** | Repository层≥30% | `npm run test:coverage` |
| **文档完整性** | 所有公共API有JSDoc | Code Review |

---

## 五、风险评估与应对

### 5.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| **Tauri API限制** | 高 | 中 | 提前验证API可用性，准备降级方案 |
| **缓存一致性问题** | 高 | 中 | 实现缓存失效机制，添加版本控制 |
| **并发冲突** | 中 | 低 | 使用乐观锁，添加重试机制 |
| **内存泄漏** | 高 | 低 | 严格测试，添加内存监控 |

### 5.2 进度风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| **任务预估不足** | 中 | 中 | 预留20%缓冲时间 |
| **依赖问题** | 中 | 低 | 提前准备依赖项 |
| **测试发现重大问题** | 高 | 中 | 及时调整优先级 |

---

## 六、资源需求

### 6.1 人力资源
- **开发**：1人 × 10天 = 10人天
- **测试**：0.5人 × 3天 = 1.5人天
- **文档**：0.3人 × 2天 = 0.6人天
- **Code Review**：0.2人 × 2天 = 0.4人天

### 6.2 测试环境
- ✅ 开发环境：本地Tauri环境
- ✅ 测试数据：测试用云存储账号
- ✅ 性能测试：大文件测试数据（>1GB）

### 6.3 工具需求
- ✅ 性能分析工具：Chrome DevTools
- ✅ 内存分析：Memory Profiler
- ✅ 测试框架：Vitest
- ✅ 文档工具：JSDoc

---

## 七、交付清单

### 7.1 代码交付物

**Repository层扩展**
- [ ] `src/repositories/mount/MountRepository.ts`
- [ ] `src/repositories/task/TaskRepository.ts`
- [ ] `src/repositories/__tests__/MountRepository.test.ts`
- [ ] `src/repositories/__tests__/TaskRepository.test.ts`

**性能优化**
- [ ] `src/services/storage/ChunkTransferService.ts`
- [ ] `src/utils/transfer/chunkManager.ts`
- [ ] `src/utils/cache/CacheManager.ts`
- [ ] `src/utils/cache/CacheLevel.ts`

**测试代码**
- [ ] `src/services/storage/__tests__/ChunkTransferService.test.ts`
- [ ] `src/utils/cache/__tests__/CacheManager.test.ts`

### 7.2 文档交付物

- [ ] 更新的架构文档（ARCHITECTURE.md）
- [ ] Repository层API文档（JSDoc）
- [ ] 性能测试报告
- [ ] 最佳实践指南

### 7.3 测试报告

- [ ] 单元测试报告
- [ ] 集成测试报告
- [ ] 性能测试报告
- [ ] 内存泄漏检测报告

---

## 八、后续维护计划

### 8.1 监控指标
- Repository层调用频率
- 缓存命中率
- 传输速度统计
- 内存占用监控

### 8.2 优化方向
- 引入Redis缓存（可选）
- 实现分布式任务调度
- 添加性能仪表盘
- 自动化性能回归测试

---

## 九、总结

### 核心价值
- ✅ 架构更完善：Repository层扩展为3个，数据访问更规范
- ✅ 性能更优秀：大文件传输速度提升50-80%，缓存命中率提升至85%
- ✅ 质量更可靠：测试覆盖率提升，文档更完善

### 预期成果
- 新增代码：~1500行（Repository + 性能优化）
- 测试代码：~600行
- 文档：~500行
- 性能提升：50%+
- 测试覆盖率：30%+

### 时间估算
- **开发时间**：8天
- **测试时间**：1天
- **文档时间**：1天
- **总计**：10个工作日

---

**计划制定人**：AI Assistant  
**计划日期**：2026-03-26  
**计划版本**：v1.0  
**下次审查**：2026-03-28（Day 2结束）