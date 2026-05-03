import { Grid, Select, Input, Tooltip, Button } from '@arco-design/web-react'
import { t } from 'i18next'
import { IconQuestionCircle } from '@arco-design/web-react/icon'
import { rcloneInfo } from '../../services/rclone'
import { openlistInfo } from '../../services/openlist'
import {
  convertStoragePath,
  filterHideStorage,
  formatPathRclone,
} from '../../services/storage/StorageManager'

const Row = Grid.Row
const Col = Grid.Col

function StorageAndPathInputer({
  value,
  onChange,
}: {
  value?: string
  onChange?(value: string): void
}) {
  if (value == undefined) value = ''
  if (value.includes(openlistInfo.markInRclone)) {
    const tempPath = formatPathRclone(value.substring(value.indexOf(':') + 1))
    if (tempPath.includes('/')) {
      value = tempPath.replace('/', ':')
    } else {
      value = tempPath + ':'
    }
  }

  const separatorIndex = value.indexOf(':')
  let storageName = value.substring(0, separatorIndex)
  let path = formatPathRclone(value.substring(separatorIndex + 1))

  const change = () => {
    storageName && onChange && onChange(convertStoragePath(storageName, path)!)
  }
  return (
    <>
      <Row>
        <Col flex={'7rem'}>
          <Select
            value={storageName}
            placeholder={t('please_select')}
            onChange={value => {
              storageName = value
              change()
            }}
          >
            {filterHideStorage(rcloneInfo.storageList).map(item => (
              <Select.Option key={item.name} value={item.name}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col flex={'auto'}>
          <Input
            value={'/' + path}
            onChange={value => {
              path = formatPathRclone(value)
              change()
            }}
            disabled={!storageName}
          />
        </Col>
        <Col flex={'2rem'}>
          <Tooltip content={t('explain_for_task_path_format')}>
            <Button icon={<IconQuestionCircle />} />
          </Tooltip>
        </Col>
      </Row>
    </>
  )
}

export { StorageAndPathInputer }
