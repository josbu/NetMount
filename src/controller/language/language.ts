import zhCN from '@arco-design/web-react/es/locale/zh-CN'
import enUS from '@arco-design/web-react/es/locale/en-US'
import jaJP from '@arco-design/web-react/es/locale/ja-JP'
import koKR from '@arco-design/web-react/es/locale/ko-KR'
import idID from '@arco-design/web-react/es/locale/id-ID'
import thTH from '@arco-design/web-react/es/locale/th-TH'
import zhHK from '@arco-design/web-react/es/locale/zh-HK'
import frFR from '@arco-design/web-react/es/locale/fr-FR'
import esES from '@arco-design/web-react/es/locale/es-ES'
import deDE from '@arco-design/web-react/es/locale/de-DE'
import itIT from '@arco-design/web-react/es/locale/it-IT'
import viVN from '@arco-design/web-react/es/locale/vi-VN'
import zhTW from '@arco-design/web-react/es/locale/zh-TW' // 引入台灣繁體中文語言包
import { Locale } from '@arco-design/web-react/es/locale/interface'

// Type-safe locale mapping using Partial to accommodate locale variations
const localeMap: Record<string, Partial<Locale>> = {
  'zh-cn': zhCN,
  'en-us': enUS,
  'ja-jp': jaJP,
  'ko-kr': koKR,
  'id-id': idID,
  'th-th': thTH,
  'zh-hk': zhHK,
  'fr-fr': frFR,
  'es-es': esES,
  'de-de': deDE,
  'it-it': itIT,
  'vi-vn': viVN,
  'zh-tw': zhTW,
}

function getLocale(locale: string): Locale {
  return (localeMap[locale.toLowerCase()] ?? zhCN) as Locale
}

export { getLocale }
