/**
 * Type guards and validators for rclone API responses
 * Provides runtime type safety for external data
 */

import type { RcloneFileItem, RcloneConfigDump, RcloneAboutResponse, FileInfo } from '../../type/rclone/rcloneInfo'

/**
 * Type guard to check if a value is a valid RcloneFileItem
 * @param item - Unknown value to validate
 * @returns True if item is a valid RcloneFileItem
 */
export function isRcloneFileItem(item: unknown): item is RcloneFileItem {
  if (typeof item !== 'object' || item === null) {
    return false
  }

  const obj = item as Record<string, unknown>
  
  // Required fields
  if (typeof obj.Name !== 'string') {
    return false
  }
  
  if (typeof obj.Size !== 'number') {
    return false
  }
  
  if (typeof obj.ModTime !== 'string') {
    return false
  }
  
  if (typeof obj.IsDir !== 'boolean') {
    return false
  }
  
  // Optional field
  if (obj.MimeType !== undefined && typeof obj.MimeType !== 'string') {
    return false
  }
  
  return true
}

/**
 * Type guard to check if a value is a valid RcloneConfigDump
 * @param data - Unknown value to validate
 * @returns True if data is a valid RcloneConfigDump
 */
export function isRcloneConfigDump(data: unknown): data is RcloneConfigDump {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>
  
  // Check that all values are objects (or undefined)
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      if (value !== undefined && (typeof value !== 'object' || value === null)) {
        return false
      }
    }
  }
  
  return true
}

/**
 * Type guard to check if a value is a valid RcloneAboutResponse
 * @param data - Unknown value to validate
 * @returns True if data is a valid RcloneAboutResponse
 */
export function isRcloneAboutResponse(data: unknown): data is RcloneAboutResponse {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>
  
  // Check optional numeric fields
  if (obj.free !== undefined && typeof obj.free !== 'number') {
    return false
  }
  
  if (obj.total !== undefined && typeof obj.total !== 'number') {
    return false
  }
  
  if (obj.used !== undefined && typeof obj.used !== 'number') {
    return false
  }
  
  if (obj.trashed !== undefined && typeof obj.trashed !== 'number') {
    return false
  }
  
  return true
}

/**
 * Maps a raw RcloneFileItem to a FileInfo object
 * @param item - Raw rclone file item
 * @returns Mapped FileInfo object
 * @throws Error if item is invalid
 */
export function mapRcloneFileItem(item: unknown, basePath: string = ''): FileInfo {
  if (!isRcloneFileItem(item)) {
    throw new Error('Invalid rclone file item structure')
  }
  
  return {
    path: basePath,
    name: item.Name,
    size: item.Size,
    mimeType: item.MimeType,
    modTime: new Date(item.ModTime),
    isDir: item.IsDir,
  }
}

/**
 * Validates and parses storage data from API response
 * @param data - Unknown data from API
 * @returns Parsed storage data or throws error
 */
export function validateAndParseStorageData(data: unknown): RcloneConfigDump {
  if (!isRcloneConfigDump(data)) {
    throw new Error('Invalid storage config dump structure')
  }
  return data
}

/**
 * Validates and parses about response from API
 * @param data - Unknown data from API
 * @returns Parsed about response or throws error
 */
export function validateAndParseAboutResponse(data: unknown): RcloneAboutResponse {
  if (!isRcloneAboutResponse(data)) {
    throw new Error('Invalid rclone about response structure')
  }
  return data
}
