import { rclone_api_post } from '../../utils/rclone/request'
import { isMountListResponse } from '../../type/rclone/api'
import { logger } from '../LoggerService'
import { useMountStore } from '../../stores/mountStore'
import type { MountList } from '../../type/rclone/rcloneInfo'
import { hooks } from '../hook'
import { rcloneInfo } from '../rclone'

export async function reupMountService(noRefreshUI?: boolean) {
  const response = await rclone_api_post('/mount/listmounts')
  
  if (!response || !isMountListResponse(response)) {
    logger.warn('Invalid mount list response format', 'MountService', { response })
    rcloneInfo.mountList = []
    useMountStore.getState().setMountList([])
    !noRefreshUI && hooks.upMount()
    return
  }
  
  const mountPoints = response.mountPoints

  rcloneInfo.mountList = []
  const newMountList: MountList[] = []

  mountPoints.forEach((item) => {
    const name = item.fs
    const mountItem: MountList = {
      storageName: name,
      mountPath: item.mountPoint,
      mountedTime: new Date(item.mountedOn),
    }
    rcloneInfo.mountList.push(mountItem)
    newMountList.push(mountItem)
  })
  
  useMountStore.getState().setMountList(newMountList)
  !noRefreshUI && hooks.upMount()
}
