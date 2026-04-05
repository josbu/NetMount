/**
 * 全局错误处理
 * 
 * 设置全局错误监听器，捕获未处理的错误和Promise拒绝
 */

import { Modal } from '@arco-design/web-react'
import { t } from 'i18next'
import { ReactNode } from 'react'
import { set_devtools_state } from '../utils'
import { errorService, ErrorCategory, ErrorSeverity, AppError } from '../services/ErrorService'

/**
 * 显示错误对话框
 */
function errorDialog(title: string, content: ReactNode): Promise<boolean> {
  return new Promise(resolve => {
    Modal.error({
      title: title,
      content: content,
      onOk: () => {
        resolve(true)
      },
      onCancel: () => {
        resolve(false)
      },
      maskClosable: false,
      closable: false,
    })
  })
}

/**
 * 向用户显示错误并记录
 */
async function errorThrowToUser(message: string, originalError?: Error): Promise<void> {
  // 排除已知的非错误（如 ResizeObserver 警告）
  if (message.toString().includes('ResizeObserver')) {
    return
  }

  // 创建 AppError
  const appError = new AppError(
    message,
    ErrorCategory.UNKNOWN,
    ErrorSeverity.CRITICAL,
    'GLOBAL_ERROR',
    { originalMessage: message },
    originalError
  )

  // 通过 ErrorService 处理（记录日志）
  await errorService.handle(appError, 'GlobalErrorHandler', {
    showMessage: false, // 我们自己显示对话框
    showNotification: false,
  })

  // 启用开发者工具以便调试
  await set_devtools_state(true)

  // 显示用户友好的错误对话框
  const content = t('error_tips') + ', Error: ' + message
  await errorDialog(t('error'), content)
}

// ============================================
// 全局错误监听设置
// ============================================

// 全局 JS 错误
window.onerror = async function (msg, url, lineNo, columnNo, error) {
  const message = [
    'Message: ' + msg,
    'URL: ' + url,
    'Line: ' + lineNo,
    'Column: ' + columnNo,
  ].join(' - ')

  await errorThrowToUser(message, error || undefined)
  return false
}

// 未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', async function (event) {
  event.preventDefault()
  
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason))
    
  await errorThrowToUser(String(event.reason), error)
})

// 全局错误事件（捕获阶段）
window.addEventListener(
  'error',
  async event => {
    event.preventDefault()
    await errorThrowToUser(event.message, event.error)
  },
  true
)

// 导出错误处理函数供其他模块使用
export { errorThrowToUser, errorDialog }
