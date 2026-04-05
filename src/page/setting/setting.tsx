/**
 * Settings Page
 * 设置页面 - 模块化重构版本
 */

import { Card, Message, Modal, Space } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { readTextFileTail } from '../../utils/logs'
import { showLog } from '../other/modal'
import {
  GeneralSettings,
  DataManagement,
  AdvancedSettings,
  ComponentsInfo,
  AboutSection,
  ToolsSection,
} from './components'

export default function Setting_page() {
  const { t } = useTranslation()
  const [modal, contextHolder] = Modal.useModal()

  const showLogFromFileTail = async (path: string) => {
    try {
      const content = await readTextFileTail(path, { maxBytes: 256 * 1024, allowMissing: true })
      showLog(modal, (content || '').trim() ? content : '暂无日志')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  return (
    <div>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title={t('setting')} size="small">
          <GeneralSettings />
        </Card>
        <Card title={t('data_management')} size="small">
          <DataManagement />
        </Card>
        <Card title={t('advanced_settings')} size="small">
          <AdvancedSettings />
        </Card>
        <Card title={t('components')} size="small">
          <ComponentsInfo
            showLog={(content: string) => showLog(modal, content)}
            showLogFromFileTail={showLogFromFileTail}
          />
        </Card>
        <Card title={t('about')} size="small">
          <AboutSection />
        </Card>
        <Card title={t('tools')} size="small">
          <ToolsSection />
        </Card>
      </Space>
    </div>
  )
}
