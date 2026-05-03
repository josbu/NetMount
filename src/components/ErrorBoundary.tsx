/**
 * Error Boundary - 错误边界组件
 *
 * 特性：
 * 1. 捕获子组件树中的 JavaScript 错误
 * 2. 防止错误导致整个应用崩溃
 * 3. 提供友好的错误提示界面
 * 4. 支持错误上报
 * 5. 支持错误恢复
 *
 * 使用方式：
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import { Component, ErrorInfo, ReactNode, JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Result, Space, Typography } from '@arco-design/web-react'
import { IconRefresh, IconBug } from '@arco-design/web-react/icon'
import { logger } from '../services/LoggerService'

const { Text } = Typography

// ============================================
// 类型定义
// ============================================

export interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode
  /** 自定义错误回退 UI */
  fallback?: ReactNode
  /** 错误回调（用于上报） */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** 重置回调 */
  onReset?: () => void
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

// ============================================
// 默认错误回退组件
// ============================================

interface DefaultErrorFallbackProps {
  error: Error
  onReset: () => void
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps): JSX.Element {
  const { t } = useTranslation()
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        backgroundColor: 'var(--color-bg-1)',
      }}
    >
      <Card style={{ maxWidth: '500px', width: '100%' }}>
        <Result
          status="error"
          icon={<IconBug style={{ fontSize: '3rem', color: 'var(--color-danger)' }} />}
          title={t('error_boundary_title')}
          subTitle={t('error_boundary_subtitle')}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div
              style={{
                backgroundColor: 'var(--color-fill-2)',
                padding: '1rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              <Text type="error">{error.message}</Text>
              {error.stack && (
                <pre style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
                  {error.stack}
                </pre>
              )}
            </div>
            <Space style={{ justifyContent: 'center', width: '100%', marginTop: '1rem' }}>
              <Button type="primary" icon={<IconRefresh />} onClick={onReset}>
                {t('reload')}
              </Button>
            </Space>
          </Space>
        </Result>
      </Card>
    </div>
  )
}

// ============================================
// Error Boundary 组件
// ============================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新 state 使下一次渲染显示回退 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误日志
    logger.error(
      'React component error caught by ErrorBoundary',
      error,
      'ErrorBoundary',
      {
        componentStack: errorInfo.componentStack,
      }
    )

    // 更新 state 保存错误信息
    this.setState({ errorInfo })

    // 调用 onError 回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })

    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 显示自定义回退 UI 或默认回退 UI
      if (this.props.fallback) {
        return this.props.fallback
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}
