import { Message } from '@arco-design/web-react'
import { ParametersType } from '../../type/defaults'
import { openlist_api_post } from '../../utils/openlist/request'
import { rclone_api_post } from '../../utils/rclone/request'
import { isEmptyObject } from '../../utils'
import { logger } from '../LoggerService'
import { searchStorageInfo } from '../../controller/storage/allList'
import { searchStorage, reupStorage } from './StorageManager'

export async function createStorage(
  name: string,
  type: string,
  parameters: ParametersType,
  exAdditional: ParametersType = {},
  opt?: { obscure?: boolean; noObscure?: boolean }
): Promise<boolean> {
  const validation = validateStorageInput(name, type, parameters)
  if (!validation.valid) {
    Message.error(validation.error || '输入参数无效')
    logger.error('Storage validation failed', undefined, 'StorageCreationService', { error: validation.error })
    return false
  }

  const storageInfo = searchStorageInfo(type)
  if (!storageInfo) {
    Message.error('不支持的存储类型: ' + type)
    logger.error('Storage type not found', undefined, 'StorageCreationService', { type })
    return false
  }

  const storage = searchStorage(name)
  let backData: unknown

  try {
    switch (storageInfo.framework) {
      case 'rclone': {
        const requestBody: ParametersType = {
          name: name,
          type: storageInfo.type,
          parameters: parameters,
          ...exAdditional,
        }
        if (opt) {
          requestBody['opt'] = opt
        }
        backData = await rclone_api_post('/config/create', requestBody)
        await reupStorage()
        return backData ? isEmptyObject(backData as Record<string, unknown>) : false
      }

      case 'openlist': {
        let serializedAddition: string
        try {
          serializedAddition = JSON.stringify(parameters.addition)
        } catch (e) {
          logger.error('Failed to serialize addition', e as Error, 'StorageCreationService')
          Message.error('存储参数序列化失败')
          return false
        }

        const openlistParams = {
          ...parameters,
          addition: serializedAddition,
          driver: storageInfo.type,
          ...exAdditional,
        }

        if (!storage) {
          backData = await openlist_api_post('/api/admin/storage/create', openlistParams)
        } else {
          const storageId = storage.other?.openlist?.id
          if (!storageId) {
            Message.error('无法获取存储 ID')
            return false
          }
          backData = await openlist_api_post('/api/admin/storage/update', {
            ...openlistParams,
            id: storageId,
          })
        }

        if ((backData as { code?: number })?.code !== 200) {
          Message.error((backData as { message?: string })?.message || '操作失败')
          return false
        }

        await reupStorage()
        return true
      }

      default:
        Message.error('不支持的存储框架: ' + storageInfo.framework)
        return false
    }
  } catch (error) {
    logger.error('Storage operation failed', error as Error, 'StorageCreationService')
    Message.error('存储操作失败，请检查网络连接')
    return false
  }
}

function validateStorageName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return '存储名称不能为空'
  }
  if (name.trim().length === 0) {
    return '存储名称不能为空'
  }
  if (name.length > 128) {
    return '存储名称长度不能超过128字符'
  }
  if (/[<>:"|?*/\\]/.test(name)) {
    return '存储名称包含非法字符'
  }
  return null
}

function validateStorageType(type: string): string | null {
  if (!type || typeof type !== 'string') {
    return '存储类型不能为空'
  }
  return null
}

function validateParameters(parameters: ParametersType): string | null {
  if (!parameters || typeof parameters !== 'object') {
    return '存储参数不能为空'
  }
  return null
}

function validateStorageInput(
  name: string,
  type: string,
  parameters: ParametersType
): { valid: boolean; error?: string } {
  const nameError = validateStorageName(name)
  if (nameError) return { valid: false, error: nameError }

  const typeError = validateStorageType(type)
  if (typeError) return { valid: false, error: typeError }

  const paramError = validateParameters(parameters)
  if (paramError) return { valid: false, error: paramError }

  return { valid: true }
}
