import request from './index'
import type {
  ApiResponse,
  DeviceLatestData,
  DeviceListItem,
  HistoryDataPoint,
  LogEntry,
  DashboardRequestParams,
  DashboardDataResponse,
  DeviceCommandRequest,
} from './types/device'

/** 获取设备最新状态（Redis快照） */
export function getDeviceLatest(deviceId: string) {
  return request.post<ApiResponse<DeviceLatestData>>('/api/v1/device/status', { deviceId })
}

/** 获取设备列表 */
export function getDeviceList() {
  return request.post<ApiResponse<DeviceListItem[]>>('/api/v1/device/list')
}

/** 获取历史数据（InfluxDB查询） */
export function getDeviceHistory(deviceId: string, startTime: number, endTime: number) {
  return request.post<ApiResponse<HistoryDataPoint[]>>('/api/v1/device/history', {
    deviceId, startTime, endTime,
  })
}

/** 下发设备指令 */
export function sendDeviceCommand(deviceId: string, cmd: Pick<DeviceCommandRequest, 'cmdCode' | 'params'>) {
  return request.post<ApiResponse<null>>('/api/v1/device/command', {
    deviceId, cmdCode: cmd.cmdCode, params: cmd.params,
  })
}

/** 获取在线设备数 */
export function getOnlineCount() {
  return request.post<ApiResponse<number>>('/api/v1/device/iotDeviceOnlineCount')
}

/** 查询日志列表 */
export function getLogList(params: { level?: string; page?: number; size?: number }) {
  return request.post<ApiResponse<LogEntry[]>>('/api/v1/log/list', params)
}

/** 生成通用请求入参（requestId + timestamp + sign） */
function buildCommonParams(userId: string): DashboardRequestParams {
  const now = Date.now()
  const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '')
  return {
    requestId: `req-${dateStr}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: now,
    sign: '',
    userId,
  }
}

/** 获取Dashboard顶部实时数据（data字段直接是对象结构） */
export async function getTopDashboardData(userId: string = 'admin') {
  const params = buildCommonParams(userId)
  const res = await request.post<ApiResponse<DashboardDataResponse>>('/api/dashboard/getTopDashboardData', params)
  return {
    data: res.data.data,
    responseTimestamp: Number(res.data.data.timestamp) ?? res.data.timestamp ?? Date.now(),
  }
}
