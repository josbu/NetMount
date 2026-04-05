/**
 * Data Management Component
 * 数据管理组件（导入/导出配置）
 */

import { Button, Message, Modal, Space, Tooltip } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import * as dialog from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

export function DataManagement(): JSX.Element {
  const { t } = useTranslation()

  const handleExport = async () => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const path = await dialog.save({
        title: t('export_config'),
        defaultPath: `netmount-config-${ts}.zip`,
        filters: [{ name: 'Zip', extensions: ['zip'] }],
      })
      if (!path) return
      const out = await invoke<string>('export_config', { outPath: path })
      Message.success(`${t('config_exported')}: ${out}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  const handleImport = async () => {
    try {
      const path = await dialog.open({
        title: t('import_config'),
        multiple: false,
        filters: [{ name: 'Zip', extensions: ['zip'] }],
      })
      if (!path) return

      Modal.confirm({
        title: t('confirm_import'),
        content: t('confirm_import_description'),
        okButtonProps: { status: 'warning' },
        onOk: async () => {
          try {
            await invoke('stop_components')
            await new Promise(resolve => setTimeout(resolve, 500))
            const result = await invoke<string>('import_config', { zipPath: path })
            Message.success(result)
            setTimeout(() => {
              invoke('restart_self')
            }, 1000)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            Message.error(msg)
          }
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  return (
    <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>{t('export_import_config_description')}</span>
      </div>
      <Space>
        <Tooltip content={t('export_config_description')}>
          <Button type="text" status="success" onClick={handleExport}>
            {t('export')}
          </Button>
        </Tooltip>
        <Tooltip content={t('import_config_description')}>
          <Button type="text" status="warning" onClick={handleImport}>
            {t('import')}
          </Button>
        </Tooltip>
      </Space>
    </Space>
  )
}
