import { saveNmConfig } from '../services/ConfigService'
import { stopRclone } from '../utils/rclone/process'
import { stopOpenlist } from '../utils/openlist/process'
import { stopComponentWatchdog } from './componentWatchdog'
import { exit as tauriExit } from '@tauri-apps/plugin-process'
import { logger } from '../services/LoggerService'

export async function exit(isRestartSelf: boolean = false) {
  stopComponentWatchdog()
  
  try {
    await saveNmConfig()
    await stopRclone()
    await stopOpenlist()
    await saveNmConfig()
  } finally {
    if (isRestartSelf) {
      location.reload()
    } else {
      await tauriExit(0)
    }
  }
}

export async function saveStateAndExit(isRestartSelf: boolean = false) {
  try {
    await saveNmConfig()
  } catch (e) {
    logger.error('Failed to save config before exit', e as Error, 'Lifecycle')
  }
  
  if (isRestartSelf) {
    location.reload()
  }
}
