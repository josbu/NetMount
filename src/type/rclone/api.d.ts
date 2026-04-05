// Rclone API Response Types

import { RcloneVersion } from './rcloneInfo'

/**
 * Async job response from rclone API
 * Returned when starting an async operation with _async: true
 */
interface AsyncJobResponse {
  jobid: number
}

/**
 * Job status response from rclone API
 * Returned when querying job status via /job/status
 */
interface JobStatusResponse {
  jobid: number
  finished: boolean
  success: boolean
  error?: string
  output?: unknown
}

/**
 * Rclone version response from rclone API
 * Returned when querying version via /core/version
 */
interface RcloneVersionResponse extends RcloneVersion {}

/**
 * Mount list response from rclone API
 * Returned when querying mount points via /mount/listmounts
 */
interface MountListResponse {
  mountPoints: Array<{
    mountPoint: string
    mountedOn: string
    fs: string
  }>
}

/**
 * Runtime type guard for AsyncJobResponse
 */
function isAsyncJobResponse(data: unknown): data is AsyncJobResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'jobid' in data &&
    typeof (data as Record<string, unknown>).jobid === 'number'
  )
}

/**
 * Runtime type guard for JobStatusResponse
 */
function isJobStatusResponse(data: unknown): data is JobStatusResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'jobid' in data &&
    typeof (data as Record<string, unknown>).jobid === 'number' &&
    'finished' in data &&
    typeof (data as Record<string, unknown>).finished === 'boolean' &&
    'success' in data &&
    typeof (data as Record<string, unknown>).success === 'boolean'
  )
}

/**
 * Runtime type guard for RcloneVersionResponse
 */
function isRcloneVersionResponse(data: unknown): data is RcloneVersionResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    typeof (data as Record<string, unknown>).version === 'string' &&
    'os' in data &&
    typeof (data as Record<string, unknown>).os === 'string' &&
    'arch' in data &&
    typeof (data as Record<string, unknown>).arch === 'string'
  )
}

/**
 * Runtime type guard for MountListResponse
 */
function isMountListResponse(data: unknown): data is MountListResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'mountPoints' in data &&
    Array.isArray((data as Record<string, unknown>).mountPoints) &&
    (data as Record<string, unknown>).mountPoints.every(
      item =>
        typeof item === 'object' &&
        item !== null &&
        'mountPoint' in item &&
        typeof (item as Record<string, unknown>).mountPoint === 'string' &&
        'mountedOn' in item &&
        typeof (item as Record<string, unknown>).mountedOn === 'string' &&
        'fs' in item &&
        typeof (item as Record<string, unknown>).fs === 'string'
    )
  )
}

export {
  AsyncJobResponse,
  JobStatusResponse,
  RcloneVersionResponse,
  MountListResponse,
  isAsyncJobResponse,
  isJobStatusResponse,
  isRcloneVersionResponse,
  isMountListResponse,
}
