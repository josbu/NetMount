import { Message } from '@arco-design/web-react'

/**
 * Options for the withNotification async wrapper
 */
export interface WithNotificationOptions {
  /** Loading message shown while promise is pending */
  loading?: string
  /** Success message shown when promise resolves */
  success?: string
  /** Error message shown when promise rejects */
  error?: string
}

/**
 * Return type for useNotification hook
 */
export interface UseNotificationReturn {
  /** Show success message */
  success(message: string, description?: string): void

  /** Show error message */
  error(message: string, description?: string): void

  /** Show warning message */
  warning(message: string, description?: string): void

  /** Show info message */
  info(message: string, description?: string): void

  /**
   * Wrap a promise with notification feedback
   * Shows loading state while pending, then success or error based on result
   */
  withNotification<T>(
    promise: Promise<T>,
    options: WithNotificationOptions
  ): Promise<T>
}

/**
 * Unified notification hook for consistent UI feedback
 * 
 * @example
 * ```typescript
 * const notify = useNotification()
 * 
 * // Simple notifications
 * notify.success(t('mount_success'))
 * notify.error(t('mount_failed'), error.message)
 * 
 * // Async operation wrapper
 * await notify.withNotification(
 *   mountStorage(params),
 *   {
 *     loading: t('mounting'),
 *     success: t('mount_success'),
 *     error: t('mount_failed')
 *   }
 * )
 * ```
 */
export function useNotification(): UseNotificationReturn {
  const success = (message: string, description?: string) => {
    Message.success({
      content: description ? `${message}: ${description}` : message,
      duration: 3000,
    })
  }

  const error = (message: string, description?: string) => {
    Message.error({
      content: description ? `${message}: ${description}` : message,
      duration: 5000,
    })
  }

  const warning = (message: string, description?: string) => {
    Message.warning({
      content: description ? `${message}: ${description}` : message,
      duration: 4000,
    })
  }

  const info = (message: string, description?: string) => {
    Message.info({
      content: description ? `${message}: ${description}` : message,
      duration: 3000,
    })
  }

  const withNotification = async <T>(
    promise: Promise<T>,
    options: WithNotificationOptions
  ): Promise<T> => {
    let closeLoading: (() => void) | null = null

    // Show loading message if provided
    if (options.loading) {
      closeLoading = Message.loading({
        content: options.loading,
        duration: 0, // Don't auto-close
      })
    }

    try {
      const result = await promise
      return result
    } catch (err) {
      // Show error message if provided
      if (options.error) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(options.error, errorMessage)
      }
      throw err
    } finally {
      // Close loading message
      if (closeLoading) {
        closeLoading()
      }

      // Show success message if provided and no error
      if (options.success) {
        success(options.success)
      }
    }
  }

  return {
    success,
    error,
    warning,
    info,
    withNotification,
  }
}
