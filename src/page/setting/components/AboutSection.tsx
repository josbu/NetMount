/**
 * About Section Component
 * 关于页面组件
 */

import { useEffect, useState } from 'react'
import { Grid, Link } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { getVersion } from '@tauri-apps/api/app'
import { roConfig } from '../../../services/ConfigService'
import { openUrlInBrowser } from '../../../utils'

const { Row, Col } = Grid

export function AboutSection(): JSX.Element {
  const { t } = useTranslation()
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    getVersion().then(setVersion)
  }, [])

  return (
    <Row>
      <Col flex={'auto'}>
        {t('version')}: v{version}
        <br />
        {t('about_text')}
        <br />
        Copyright © 2024-Present
        <Link onClick={() => openUrlInBrowser(roConfig.url.vhbBlog)}>VirtualHotBar </Link>
      </Col>
      <Col flex={'10rem'} style={{ textAlign: 'right' }}>
        <Link onClick={() => openUrlInBrowser(roConfig.url.website)}> NetMount </Link>
        <br />
        <Link onClick={() => openUrlInBrowser(roConfig.url.docs)}> {t('docs')} </Link>
        <br />
        <Link onClick={() => openUrlInBrowser(roConfig.url.docs + '/license')}>
          {' '}
          {t('licence')}{' '}
        </Link>
        <br />
      </Col>
    </Row>
  )
}
