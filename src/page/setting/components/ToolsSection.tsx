/**
 * Tools Section Component
 * 工具组件
 */

import { Button } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { set_devtools_state } from '../../../utils'

export function ToolsSection(): JSX.Element {
  const { t } = useTranslation()

  return (
    <Button onClick={async () => await set_devtools_state(true)}>{t('devtools')}</Button>
  )
}
