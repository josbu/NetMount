/**
 * 自定义测试工具
 * 
 * 提供带有必要 Provider 的自定义 render 函数
 * 用于组件测试
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { ConfigProvider } from '@arco-design/web-react'
import enUS from '@arco-design/web-react/es/locale/en-US'

/**
 * 应用 Provider 包装器
 * 在测试中提供必要的上下文
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={enUS}>
      {children}
    </ConfigProvider>
  )
}

/**
 * 自定义 render 函数
 * 自动包含所有必要的 Provider
 * 
 * @param ui - 要渲染的组件
 * @param options - render 选项
 * @returns RenderResult
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  })
}

// 重新导出所有 @testing-library/react 的内容
export * from '@testing-library/react'

// 覆盖默认的 render 函数
export { customRender as render }

/**
 * 测试辅助函数
 */

/**
 * 等待异步操作完成
 * @param fn - 要等待的异步函数
 * @param timeout - 超时时间 (ms)
 */
export async function waitForAsync<T>(
  fn: () => Promise<T>,
  timeout: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Async operation timed out'))
    }, timeout)

    fn()
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * 创建一个模拟的 React 组件用于测试
 */
export function createMockComponent(
  displayName: string = 'MockComponent'
): React.FC<{ children?: React.ReactNode }> {
  const MockComponent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <div data-testid={`mock-${displayName}`}>{children}</div>
  )
  MockComponent.displayName = displayName
  return MockComponent
}
