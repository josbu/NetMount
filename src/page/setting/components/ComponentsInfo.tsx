/**
 * Components Info Component
 * 组件信息组件（Rclone/OpenList 版本和日志）
 */

import { Button, Link, Message, Space } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import * as shell from '@tauri-apps/plugin-shell'
import { rcloneInfo } from '../../../services/rclone'
import { openlistInfo } from '../../../services/openlist'
import { roConfig } from '../../../services/ConfigService'
import { netmountLogDir, openlistLogFile, rcloneLogFile } from '../../../utils/netmountPaths'
import { showPathInExplorer } from '../../../utils'
import { osInfo } from '../../../services/ConfigService'
import { invoke } from '@tauri-apps/api/core'
import * as dialog from '@tauri-apps/plugin-dialog'

interface ComponentsInfoProps {
  showLog: (content: string) => void
  showLogFromFileTail: (path: string) => void
}

export function ComponentsInfo({ showLog, showLogFromFileTail }: ComponentsInfoProps): JSX.Element {
  const { t } = useTranslation()

  const handleOpenLogDir = async () => {
    const dir = netmountLogDir()
    if (osInfo.platform === 'windows') {
      const ok = await showPathInExplorer(dir, true)
      if (!ok) {
        Message.error(dir)
      }
    } else {
      Message.info(dir)
    }
  }

  const handleExportDiagnostics = async () => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const path = await dialog.save({
        title: t('export_diagnostics'),
        defaultPath: `netmount-diagnostics-${ts}.zip`,
        filters: [{ name: 'Zip', extensions: ['zip'] }],
      })
      if (!path) return
      const out = await invoke<string>('export_diagnostics', { outPath: path })
      Message.success(`${t('diagnostics_exported')}: ${out}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  return (
    <div>
      <Link onClick={() => shell.open(roConfig.url.rclone)}>Rclone</Link>
      (
      <Link
        onClick={() => {
          if ((rcloneInfo.process.log || '').trim()) {
            showLog(rcloneInfo.process.log!)
            return
          }
          showLogFromFileTail(rcloneInfo.process.logFile || rcloneLogFile())
        }}
      >
        {t('log')}
      </Link>
      ): {rcloneInfo.version.version}
      <br />
      <Link onClick={() => shell.open(roConfig.url.openlist)}>Openlist</Link>
      (
      <Link
        onClick={() => {
          if ((openlistInfo.process.log || '').trim()) {
            showLog(openlistInfo.process.log!)
            return
          }
          showLogFromFileTail(openlistInfo.process.logFile || openlistLogFile())
        }}
      >
        {t('log')}
      </Link>
      ): {openlistInfo.version.version}
      <br />
      <Space style={{ marginTop: '0.5rem' }}>
        <Button onClick={handleOpenLogDir}>{t('open_log_dir')}</Button>
        <Button onClick={handleExportDiagnostics}>{t('export_diagnostics')}</Button>
      </Space>
    </div>
  )
}
