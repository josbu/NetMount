/**
 * Services Index - 统一的服务层导出
 * 
 * 这个文件集中导出所有服务，方便统一导入
 */

// 配置服务
export {
  ConfigService,
  configService,
  roConfig,
  setNmConfig,
  setOsInfo,
  readNmConfig,
  saveNmConfig,
} from './ConfigService'

// 日志服务
export {
  Logger,
  ContextLogger,
  LogLevel,
  logger,
  storageLogger,
  fileLogger,
  transferLogger,
  configLogger,
  apiLogger,
  uiLogger,
} from './LoggerService'

// 错误服务
export {
  errorService,
  AppError,
  ErrorCategory,
  ErrorSeverity,
} from './ErrorService'

// 存储服务
export {
  reupStorage,
  delStorage,
  getStorageParams,
  searchStorage,
  filterHideStorage,
  convertStoragePath,
  getStorageSpace,
  formatPathRclone,
  getFileName,
} from './storage/StorageManager'
export {
  getFileList,
  delFile,
  delDir,
  mkDir,
  uploadFileRequest,
} from './storage/FileManager'
export {
  copyFile,
  copyDir,
  moveFile,
  moveDir,
  sync,
} from './storage/TransferService'
export {
  registerDeleteStorage,
  deleteStorage,
} from './storage/StorageService'
export type { RefreshCallback } from './storage/FileManager'

// 钩子服务
export { hooks } from './hook'

// Rclone 服务
export { rcloneInfo } from './rclone'

// OpenList 服务
export { openlistInfo } from './openlist'

// 文件路径工具
export {
  getParentPath,
  getFileExtension,
  joinPath,
  normalizePath,
  isRootPath,
  getPathDepth,
} from '../utils/file/index'
