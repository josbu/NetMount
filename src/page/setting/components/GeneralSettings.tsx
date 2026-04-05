/**
 * General Settings Component
 * 通用设置组件
 */

import { useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Switch,
} from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import * as dialog from '@tauri-apps/plugin-dialog'
import {
  getAutostartState,
  setAutostartState,
  setThemeMode,
} from '../../../controller/setting/setting'
import { setLocalized } from '../../../controller/language/localized'
import { nmConfig, roConfig, saveNmConfig, osInfo } from '../../../services/ConfigService'
import { formatPath } from '../../../utils'
import { exit } from '../../../controller/main'
import { useSettingsStore } from '../../../stores/useSettingsStore'

const FormItem = Form.Item

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation()
  const [autostart, setAutostart] = useState<boolean>()
  const { increment: incrementSettings } = useSettingsStore()

  useEffect(() => {
    getAutostartState().then(setAutostart)
  }, [])

  return (
    <Form autoComplete="off" style={{ paddingRight: '0.8rem' }}>
      <FormItem label={t('language')}>
        <Select
          defaultValue={nmConfig.settings.language || ''}
          onChange={async value => {
            nmConfig.settings.language = value
            await saveNmConfig()
            await setLocalized(nmConfig.settings.language!)
          }}
          style={{ width: '8rem' }}
        >
          {roConfig.options.setting.language.select.map((item, index) => {
            return (
              <Select.Option key={index} value={item.value}>
                {item.name}
              </Select.Option>
            )
          })}
        </Select>
      </FormItem>
      <FormItem label={t('theme_mode')}>
        <Select
          defaultValue={nmConfig.settings.themeMode || 'auto'}
          onChange={value => {
            nmConfig.settings.themeMode = value
            setThemeMode(value)
          }}
          style={{ width: '8rem' }}
        >
          {roConfig.options.setting.themeMode.select.map((item, index) => {
            return (
              <Select.Option key={index} value={item}>
                {t(`${item}_themeMode`)}
              </Select.Option>
            )
          })}
        </Select>
      </FormItem>
      <FormItem label={t('autostart')}>
        <Switch
          checked={autostart || false}
          onChange={async value => {
            await setAutostartState(value)
            setAutostart(value)
          }}
        />
      </FormItem>
      <FormItem label={t('start_hide')}>
        <Switch
          checked={nmConfig.settings.startHide}
          onChange={async value => {
            nmConfig.settings.startHide = value
            incrementSettings()
          }}
        />
      </FormItem>
      <FormItem label={t('auto_recover_components')}>
        <Switch
          checked={nmConfig.settings.autoRecoverComponents}
          onChange={value => {
            nmConfig.settings.autoRecoverComponents = value
            incrementSettings()
          }}
        />
      </FormItem>
      <FormItem label={t('cache_path')}>
        <Input.Group compact>
          <Input
            style={{ width: 'calc(100% - 4rem)' }}
            value={nmConfig.settings.path.cacheDir || ''}
          />
          <Button
            style={{ width: '4rem' }}
            onClick={async () => {
              let dirPath = await dialog.open({
                title: t('please_select_cache_dir'),
                multiple: false,
                directory: true,
                defaultPath: nmConfig.settings.path.cacheDir || '',
              })
              dirPath = dirPath ? formatPath(dirPath, osInfo.platform === 'windows') : dirPath
              if (dirPath && dirPath !== nmConfig.settings.path.cacheDir) {
                nmConfig.settings.path.cacheDir = dirPath
                incrementSettings()

                Modal.confirm({
                  title: t('ask_restartself'),
                  content: t('after_changing_the_cache_directory_tips'),
                  onOk: () => {
                    exit(true)
                  },
                })
              }
            }}
          >
            {t('select')}
          </Button>
        </Input.Group>
      </FormItem>

      <div style={{ width: '100%', textAlign: 'right' }}>
        <Button
          type="primary"
          onClick={async () => {
            await saveNmConfig()
            Message.success(t('saved'))
          }}
        >
          {t('save')}
        </Button>
      </div>
    </Form>
  )
}
