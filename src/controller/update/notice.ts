import { nmConfig } from '../../services/ConfigService'
import { Notice } from '../../type/controller/update'
import { logger } from '../../services/LoggerService'

async function checkNotice() {
  try {
    const notice: Notice = await (
      await fetch(nmConfig.api.url + '/GetNotice/?lang=' + nmConfig.settings.language)
    ).json()
    if (notice.state === 'success') {
      if (
        nmConfig.notice === undefined ||
        (nmConfig.notice && notice.data.content !== nmConfig.notice.data.content)
      ) {
        nmConfig.notice = notice
      }
    }
  } catch (e) {
    logger.error('Failed to check notice', e as Error, 'Notice')
  }
}

export { checkNotice }
