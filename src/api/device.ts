import request from './index'
import type {
  ApiResponse,
  DeviceLatestData,
  DeviceListItem,
  HistoryDataPoint,
  DeviceCommand,
  LogEntry,
} from './types/device'

/** 获取设备最新状态（Redis快照） */
export function getDeviceLatest(deviceId: string) {
  return request.get<ApiResponse<DeviceLatestData>>(`/device/${deviceId}/status`)
}

/** 获取设备列表 */
export function getDeviceList() {
  return request.get<ApiResponse<DeviceListItem[]>>('/device/list')
}

/** 获取历史数据（InfluxDB查询） */
export function getDeviceHistory(deviceId: string, startTime: number, endTime: number) {
  return request.get<ApiResponse<HistoryDataPoint[]>>(`/device/${deviceId}/history`, {
    params: { startTime, endTime },
  })
}

/** 下发设备指令 */
export function sendDeviceCommand(deviceId: string, cmd: DeviceCommand) {
  return request.post<ApiResponse<null>>(`/device/${deviceId}/command`, cmd)
}

/** 获取在线设备数 */
export function getOnlineCount() {
  return request.get<ApiResponse<number>>('/device/iotDeviceOnlineCount')
}

/** 查询日志列表 */
export function getLogList(params: { level?: string; page?: number; size?: number }) {
  return request.get<ApiResponse<LogEntry[]>>('/log/list', { params })
}
