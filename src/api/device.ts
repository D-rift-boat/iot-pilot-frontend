import request from './index'
import type { ApiResponse, DeviceInfo, DevicePayload } from './types/device'

export function getDeviceStatus(deviceId: string) {
  return request.get<ApiResponse<DevicePayload>>(`/device/${deviceId}/status`)
}

export function getDeviceList() {
  return request.get<ApiResponse<DeviceInfo[]>>('/device/list')
}

export function getDeviceHistory(deviceId: string, range = '1h') {
  return request.get<ApiResponse<DevicePayload[]>>(`/device/${deviceId}/history`, {
    params: { range },
  })
}
