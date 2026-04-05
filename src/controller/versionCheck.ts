import { rclone_api_post } from '../utils/rclone/request'
import { openlist_api_get } from '../utils/openlist/request'
import { rcloneInfo } from '../services/rclone'
import { openlistInfo } from '../services/openlist'
import { isRcloneVersionResponse } from '../type/rclone/api'
import { RETRY_CONFIG } from '../constants'
import { logger } from '../services/LoggerService'

export async function reupRcloneVersion() {
  const version = await rclone_api_post('/core/version')
  if (version && isRcloneVersionResponse(version)) {
    rcloneInfo.version = version
  }
}

export async function reupOpenlistVersion() {
  const MAX_RETRIES = RETRY_CONFIG.MAX_ATTEMPTS
  const RETRY_DELAY_MS = RETRY_CONFIG.INITIAL_DELAY
  let attempts = 0

  while (attempts < MAX_RETRIES) {
    attempts++

    try {
      const version = await openlist_api_get('/api/admin/setting/get', { key: 'version' })
      const versionData = (version.data ?? {}) as Record<string, unknown>

      if (version.code === 200 && versionData.value) {
        openlistInfo.version.version = String(versionData.value)
        logger.info('OpenList version retrieved via /api/admin/setting/get', 'VersionCheck', { version: versionData.value })
        return true
      }
    } catch (primaryError) {
      logger.warn(`Primary version endpoint attempt ${attempts} failed`, 'VersionCheck', { error: primaryError })
    }

    if (attempts < MAX_RETRIES) {
      logger.info(`Primary version endpoint failed, trying fallback... (attempt ${attempts}/${MAX_RETRIES})`, 'VersionCheck')

      try {
        const publicSettings = await openlist_api_get('/api/public/settings')
        const settingsData = (publicSettings.data ?? {}) as Record<string, unknown>
        if (settingsData.version) {
          openlistInfo.version.version = String(settingsData.version)
          logger.info('OpenList version retrieved via /api/public/settings', 'VersionCheck', { version: settingsData.version })
          return true
        }
      } catch (fallbackError) {
        logger.warn(`Fallback version endpoint attempt ${attempts} failed`, 'VersionCheck', { error: fallbackError })
      }

      if (attempts < MAX_RETRIES) {
        logger.info(`All version endpoints failed, retrying in ${RETRY_DELAY_MS}ms... (attempt ${attempts + 1}/${MAX_RETRIES})`, 'VersionCheck')
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }

  logger.error('All version endpoints failed after max attempts', undefined, 'VersionCheck', { maxRetries: MAX_RETRIES, attempts })
  openlistInfo.version.version = 'unknown'
  return false
}
