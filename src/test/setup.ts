/**
 * Vitest 测试设置文件
 * 
 * 此文件在每个测试文件之前运行，用于：
 * - 设置全局测试环境
 * - 导入全局匹配器
 * - 配置测试行为
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 在每个测试后清理 React Testing Library
afterEach(() => {
  cleanup()
})

// 模拟 Tauri API - 避免在测试中调用实际的 Tauri 功能
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
  writeBinaryFile: vi.fn(),
  writeTextFile: vi.fn(),
  readBinaryFile: vi.fn(),
  readTextFile: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  Command: class MockCommand {
    constructor(cmd: string, args?: string[]) {
      this.cmd = cmd
      this.args = args
    }
    cmd: string
    args?: string[]
    async execute() {
      return {
        code: 0,
        stdout: '',
        stderr: '',
      }
    }
    spawn() {
      return {
        on: vi.fn(),
        write: vi.fn(),
        kill: vi.fn(),
      }
    }
  },
}))

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => 'windows'),
  arch: vi.fn(() => 'x86_64'),
  version: vi.fn(() => '10.0.0'),
  hostname: vi.fn(() => 'localhost'),
  freeMem: vi.fn(() => 8589934592),
  totalMem: vi.fn(() => 17179869184),
}))
