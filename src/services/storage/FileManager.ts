import { rclone_api_post } from '../../utils/rclone/request'
import { FileInfo } from '../../type/rclone/rcloneInfo'
import { RequestOptions } from '@arco-design/web-react/es/Upload'
import { getRcloneApiHeaders } from '../../utils/rclone/request'
import { rcloneInfo } from '../../services/rclone'
import { searchStorage, convertStoragePath, formatPathRclone } from './StorageManager'
import { isRcloneFileItem } from '../../utils/validators/rcloneValidators'
import { logger } from '../../services/LoggerService'

/**
 * Get file list from a storage
 * @param storageName - Storage name
 * @param path - Directory path to list
 * @returns Array of file info or undefined
 */
async function getFileList(storageName: string, path: string): Promise<FileInfo[] | undefined> {
  const storage = searchStorage(storageName)
  let fileList: FileInfo[] | undefined = undefined

  // 移除路径末尾的斜杠，根目录直接传空字符串
  const backData = await rclone_api_post('/operations/list', {
    fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
    remote: convertStoragePath(storageName, path, false, true),
  })
  
  // Validate response structure
  if (typeof backData !== 'object' || backData === null) {
    logger.warn('Invalid response from rclone list operation', 'FileManager', { 
      backData,
      storageName,
      path,
      apiEndpoint: '/operations/list'
    })
    return undefined
  }
  
  const backDataTyped = backData as { list?: unknown[] }
  
  if (backDataTyped.list && Array.isArray(backDataTyped.list)) {
    fileList = []
    for (const file of backDataTyped.list) {
      let filePath: string

      if (storage?.framework === 'rclone') {
        // Use type guard to safely access Path property
        const fileRecord = file as Record<string, unknown>
        const rawPath = typeof fileRecord.Path === 'string' ? fileRecord.Path : ''
        filePath = formatPathRclone(rawPath)
      } else {
        // OpenList 存储：从 file.Path 中提取相对路径
        // file.Path 格式可能是：百度网盘/视频/test.mp4 或 /百度网盘/视频/test.mp4
        // 需要去掉存储名前缀，得到：视频/test.mp4
        const fileRecord = file as Record<string, unknown>
        const rawPath = typeof fileRecord.Path === 'string' ? fileRecord.Path : ''
        const prefix = storageName + '/'

        if (rawPath.startsWith('/' + prefix)) {
          // 格式：/百度网盘/视频/test.mp4
          filePath = rawPath.substring(prefix.length + 1)
        } else if (rawPath.startsWith(prefix)) {
          // 格式：百度网盘/视频/test.mp4
          filePath = rawPath.substring(prefix.length)
        } else {
          // 兜底：直接使用原路径
          filePath = rawPath
        }
      }

      // Use type guard to validate file item structure
      if (!isRcloneFileItem(file)) {
        logger.warn('Skipping invalid file item in rclone response', 'FileManager', { file })
        continue
      }
      
      fileList.push({
        path: filePath,
        name: file.Name,
        size: file.Size,
        mimeType: file.MimeType,
        modTime: new Date(file.ModTime),
        isDir: file.IsDir,
      })
    }
  }

  return fileList
}

/**
 * Refresh callback type for file operations
 */
type RefreshCallback = () => void

/**
 * Delete a file from storage
 * @param storageName - Storage name
 * @param path - File path to delete
 * @param refreshCallback - Optional callback to refresh UI after deletion
 */
async function delFile(storageName: string, path: string, refreshCallback?: RefreshCallback) {
  if (path.substring(0, 1) == '/') {
    path = path.substring(1, path.length)
  }
  await rclone_api_post('/operations/deletefile', {
    fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
    remote: convertStoragePath(storageName, path, false, true),
  })

  if (refreshCallback) {
    refreshCallback()
  }
}

/**
 * Delete a directory from storage
 * @param storageName - Storage name
 * @param path - Directory path to delete
 * @param refreshCallback - Optional callback to refresh UI after deletion
 */
async function delDir(storageName: string, path: string, refreshCallback?: RefreshCallback) {
  await rclone_api_post('/operations/purge', {
    fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
    remote: convertStoragePath(storageName, path, true, true),
  })

  if (refreshCallback) {
    refreshCallback()
  }
}

/**
 * Create a directory in storage
 * @param storageName - Storage name
 * @param path - Directory path to create
 * @param refreshCallback - Optional callback to refresh UI after creation
 */
async function mkDir(storageName: string, path: string, refreshCallback?: RefreshCallback) {
  await rclone_api_post('/operations/mkdir', {
    fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
    remote: convertStoragePath(storageName, path, true, true),
  })

  if (refreshCallback) {
    refreshCallback()
  }
}

/**
 * Upload a file to storage
 * @param option - Upload options including file, progress, error, and success callbacks
 * @param storageName - Storage name
 * @param path - Destination path
 */
const uploadFileRequest = (option: RequestOptions, storageName: string, path: string) => {
  const { onProgress, onError, onSuccess, file } = option

  const formData = new FormData()
  formData.append('file', file)

  const xhr = new XMLHttpRequest()

  xhr.upload.onprogress = ({ lengthComputable, loaded, total }) => {
    if (lengthComputable) {
      const progress = Math.round((loaded / total) * 100)
      logger.debug(`Upload progress: ${progress}%`, 'FileManager', { loaded, total, progress })
      onProgress(progress)
    }
  }

  xhr.onload = () => {
    xhr.status === 200 ? onSuccess() : onError(xhr)
  }

  xhr.onerror = () => onError(xhr)

  xhr.open(
    'POST',
    `${rcloneInfo.endpoint.url}/operations/uploadfile?fs=${convertStoragePath(storageName, undefined, undefined, undefined, true)}&remote=${convertStoragePath(storageName, path, true, true, undefined)}`,
    true
  )
  xhr.setRequestHeader('Authorization', getRcloneApiHeaders().Authorization)
  xhr.send(formData)
}

export {
  getFileList,
  delFile,
  delDir,
  mkDir,
  uploadFileRequest,
  type RefreshCallback,
}
