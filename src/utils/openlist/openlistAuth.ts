import { openlistInfo } from '../../services/openlist'
import { nmConfig } from '../../services/ConfigService'
import { openlistDataDir } from './paths'
import { runSidecarOnce } from '../sidecar'
import { logger } from '../../services/LoggerService'

type OpenlistLoginResponse = {
  code?: number
  message?: string
  data?:
    | {
        token?: string
      }
    | string
}

async function openlist_login(username: string, password: string): Promise<string> {
  const url = openlistInfo.endpoint.url + '/api/auth/login'
  const controller = new AbortController()
  const timeoutMs = 15_000
  const timeoutId = setTimeout(
    () =>
      controller.abort(
        new DOMException(`OpenList login timeout after ${timeoutMs}ms`, 'TimeoutError')
      ),
    timeoutMs
  )
  try {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      })
    } catch (e) {
      if (controller.signal.aborted) {
        const reason = controller.signal.reason
        const reasonMessage =
          reason instanceof Error
            ? reason.message
            : typeof reason === 'string'
              ? reason
              : 'request aborted'
        throw new Error(`OpenList login timed out: ${reasonMessage}`)
      }
      throw e
    }

    const text = await res.text().catch(() => '')
    let json: OpenlistLoginResponse | undefined
    if (text) {
      try {
        json = JSON.parse(text) as OpenlistLoginResponse
      } catch {
        /* ignore */
      }
    }

    if (!res.ok) {
      const msg = json ? JSON.stringify(json) : text
      throw new Error(
        `OpenList login failed: HTTP ${res.status} ${res.statusText}${msg ? `\n${msg}` : ''}`
      )
    }

    const token =
      typeof json?.data === 'string'
        ? json.data
        : json?.data && typeof json.data === 'object'
          ? json.data.token
          : undefined

    if (!token) {
      throw new Error(`OpenList login failed: missing token in response${text ? `\n${text}` : ''}`)
    }

    return token
  } finally {
    clearTimeout(timeoutId)
  }
}

async function getOpenlistToken(): Promise<string> {
  if (openlistInfo.endpoint.auth.token) {
    return openlistInfo.endpoint.auth.token
  }
  const username = nmConfig.framework.openlist.user
  const password = nmConfig.framework.openlist.password

  const maxAttempts = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const token = await openlist_login(username, password)
      openlistInfo.endpoint.auth.token = token
      return token
    } catch (e) {
      lastError = e
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  throw new Error(`OpenList login failed after ${maxAttempts} attempts: ${String(lastError)}`)
}

async function setOpenlistPass(pass: string) {
  // v1.1.2 行为：每次启动都无条件写入 admin 密码，避免升级/迁移导致的"密码不一致"卡死。
  // OpenList 提供 CLI：openlist --data <dir> admin set <pass>
  // 预启动阶段可能失败（数据库不存在），服务启动后再调用此函数会成功
  const dataDir = openlistDataDir()
  try {
    await runSidecarOnce('binaries/openlist', ['--data', dataDir, 'admin', 'set', pass], {
      timeoutMs: 15_000,
      cwd: dataDir,
    })
    return
  } catch (e) {
    logger.warn('OpenList CLI password reset failed', 'OpenlistUtils', { error: e })
    throw new Error('OpenList CLI password reset failed')
  }
}

export type { OpenlistLoginResponse }
export { openlist_login, getOpenlistToken, setOpenlistPass }
