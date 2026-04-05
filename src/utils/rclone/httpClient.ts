import { nmConfig } from '../../services/ConfigService'
import { HTTP_HEADERS } from '../../constants'

export function getRcloneApiHeaders() {
  return {
    Authorization: `Basic ${btoa(`${nmConfig.framework.rclone.user}:${nmConfig.framework.rclone.password}`)}`,
    'Content-Type': HTTP_HEADERS.CONTENT_TYPE_JSON,
  }
}

export function buildApiUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`
}

export async function handleApiResponse(
  res: Response
): Promise<Record<string, unknown>> {
  if (!res.ok) {
    let bodyText = ''
    try {
      bodyText = await res.text()
    } catch {
      bodyText = ''
    }

    let extraMessage = ''
    if (bodyText) {
      try {
        const json = JSON.parse(bodyText) as { error?: unknown }
        if (typeof json?.error === 'string' && json.error.trim()) {
          extraMessage = json.error
        } else {
          extraMessage = JSON.stringify(json)
        }
      } catch {
        extraMessage = bodyText
      }
    }

    const message = [`HTTP ${res.status}: `, extraMessage ? `Rclone: ${extraMessage}` : '']
      .filter(Boolean)
      .join('\n')

    throw new Error(message)
  }

  try {
    const data = await res.json()
    return data as Record<string, unknown>
  } catch {
    return {}
  }
}
