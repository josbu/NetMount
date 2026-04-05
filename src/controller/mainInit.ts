import { listenWindow, window as appWindow } from './window'
import { nmConfig, readNmConfig, roConfig, runtimeEnv } from '../services/ConfigService'
import { setThemeMode } from './setting/setting'
import { setLocalized } from './language/localized'
import { startRclone } from '../utils/rclone/process'
import { startOpenlist } from '../utils/openlist/process'
import { startUpdateCont } from './stats/continue'
import { startComponentWatchdog } from './componentWatchdog'
import { runStartupTasksInBackground } from './startupTasks'
import { getOsInfo } from '../utils/tauri/osInfo'
import { defaultCacheDir } from '../utils/netmountPaths'
import { homeDir } from '@tauri-apps/api/path'
import { t } from 'i18next'
import { logger } from '../services/LoggerService'

type SetStartStrFn = (str: string) => void

export async function init(setStartStr: SetStartStrFn) {
  setStartStr(t('init'))
  runtimeEnv.path.homeDir = await homeDir()
  listenWindow()

  await getOsInfo()

  setStartStr(t('read_config'))
  await readNmConfig()

  if (nmConfig.settings.language) {
    await setLocalized(nmConfig.settings.language)
  } else {
    const matchingLang = roConfig.options.setting.language.select.find(
      lang => lang.langCode === navigator.language.toLowerCase()
    )
    const defaultLang =
      roConfig.options.setting.language.select[roConfig.options.setting.language.defIndex]
    nmConfig.settings.language = matchingLang?.value || defaultLang?.value || 'en'
    await setLocalized(nmConfig.settings.language)
  }

  if (!nmConfig.settings.path.cacheDir) {
    nmConfig.settings.path.cacheDir = defaultCacheDir()
  }

  setThemeMode(nmConfig.settings.themeMode)

  setStartStr(t('start_framework'))

  await startRclone()
  await startOpenlist()

  startUpdateCont()

  startComponentWatchdog()
  runStartupTasksInBackground()

  if (!nmConfig.settings.startHide) {
    await appWindow.show()
    await appWindow.setFocus()
  }

  logger.info('Application initialization complete', 'MainInit')
}
